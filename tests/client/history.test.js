import { describe, it, expect, beforeEach } from 'vitest'

/**
 * 历史记录服务测试（本地优先版，v1.1）。
 *
 * 与旧版（mock 云函数）的区别：新版走本地 storage，测试需先 mock wx。
 * storage 用内存 Map 实现，与微信真实行为一致（读不到返回 ''）。
 */

// ---- mock wx（必须在 require history 之前定义） ----
const memory = {}
global.wx = {
  getStorageSync: function (k) {
    return k in memory ? memory[k] : ''
  },
  setStorageSync: function (k, v) {
    memory[k] = v
  },
  removeStorageSync: function (k) {
    delete memory[k]
  },
}

import {
  TABS,
  BIZ_LABEL,
  formatTime,
  toItem,
  saveRecord,
  listRecords,
  getRecord,
  removeRecord,
  clearRecords,
  buildSources,
  buildCopyText,
  RECORDS_KEY,
  MAX_RECORDS,
} from '../../miniprogram/services/history'

beforeEach(() => {
  Object.keys(memory).forEach((k) => delete memory[k])
})

// ---- 契约 ----

describe('BIZ_LABEL 业务类型', () => {
  it('覆盖 checklist / keyword / practice 三个业务', () => {
    expect(Object.keys(BIZ_LABEL)).toEqual(
      expect.arrayContaining(['checklist', 'keyword', 'practice'])
    )
    expect(BIZ_LABEL.checklist).toBe('简历自查')
    expect(BIZ_LABEL.keyword).toBe('岗位比对')
    expect(BIZ_LABEL.practice).toBe('面试练习')
  })
})

describe('TABS 筛选 Tab', () => {
  it('value 顺序：all 在最前，其余与业务一致', () => {
    expect(TABS.map((t) => t.key)).toEqual(['all', 'checklist', 'keyword', 'practice'])
  })

  it('label 与 BIZ_LABEL 一致（页面与存储口径统一）', () => {
    for (const t of TABS) {
      if (t.key === 'all') expect(t.label).toBe('全部')
      else expect(t.label).toBe(BIZ_LABEL[t.key])
    }
  })
})

// ---- formatTime ----

describe('formatTime 时间文案', () => {
  // 固定「现在」，避免测试随真实日期漂移（跨午夜 / 跨年都会翻车）
  const NOW = new Date(2026, 8, 1, 14, 30, 0).getTime() // 2026-09-01 14:30

  it('今天 → 「今天 HH:mm」', () => {
    const ms = new Date(2026, 8, 1, 9, 5, 0).getTime()
    expect(formatTime(ms, NOW)).toBe('今天 09:05')
  })

  it('昨天 → 「昨天 HH:mm」', () => {
    const ms = new Date(2026, 7, 31, 20, 0, 0).getTime()
    expect(formatTime(ms, NOW)).toBe('昨天 20:00')
  })

  it('同年其他日期 → 「MM-DD HH:mm」', () => {
    const ms = new Date(2026, 6, 15, 10, 0, 0).getTime()
    expect(formatTime(ms, NOW)).toBe('07-15 10:00')
  })

  it('跨年 → 「YYYY-MM-DD」', () => {
    const ms = new Date(2025, 11, 25, 8, 0, 0).getTime()
    expect(formatTime(ms, NOW)).toBe('2025-12-25')
  })

  it('非法输入 → 空串', () => {
    expect(formatTime(0)).toBe('')
    expect(formatTime(NaN)).toBe('')
  })
})

// ---- saveRecord / listRecords ----

describe('saveRecord 与 listRecords', () => {
  it('保存后可在列表按 biz 筛选出', () => {
    saveRecord({ biz: 'checklist', summary: '总分 72', score: 72 })
    saveRecord({ biz: 'keyword', summary: '覆盖率 60%', score: 60 })
    saveRecord({ biz: 'practice', summary: '均分 3.5', score: 70 })

    const all = listRecords({})
    expect(all.items).toHaveLength(3)

    const checklist = listRecords({ biz: 'checklist' })
    expect(checklist.items).toHaveLength(1)
    expect(checklist.items[0].bizLabel).toBe('简历自查')
  })

  it('新记录排在最前（倒序）', () => {
    const a = saveRecord({ biz: 'checklist', summary: '第一条' })
    const b = saveRecord({ biz: 'checklist', summary: '第二条' })
    expect(a.createdAtMs).toBeLessThanOrEqual(b.createdAtMs)
    const items = listRecords({ biz: 'checklist' }).items
    expect(items[0].id).toBe(b.id)
    expect(items[1].id).toBe(a.id)
  })

  it('游标分页：cursorMs 之后不再返回', () => {
    for (let i = 0; i < 5; i++) {
      saveRecord({ biz: 'keyword', summary: '第' + i + '条' })
    }
    const page1 = listRecords({ biz: 'keyword', limit: 3 })
    expect(page1.items).toHaveLength(3)
    expect(page1.hasMore).toBe(true)

    const page2 = listRecords({ biz: 'keyword', limit: 3, cursorMs: page1.nextCursor })
    expect(page2.items).toHaveLength(2)
    expect(page2.hasMore).toBe(false)
    expect(page2.nextCursor).toBeNull()
  })

  it('超过 MAX_RECORDS 只保留最近 N 条', () => {
    for (let i = 0; i < MAX_RECORDS + 10; i++) {
      saveRecord({ biz: 'checklist', summary: '第' + i + '条' })
    }
    const all = listRecords({ limit: MAX_RECORDS + 1 })
    expect(all.items).toHaveLength(MAX_RECORDS)
  })

  it('result/meta 会被保留（详情页渲染用）', () => {
    const rec = saveRecord({
      biz: 'keyword',
      summary: '覆盖率 60%',
      score: 60,
      result: { coveredKeywords: ['Java'], missingKeywords: ['Redis'] },
      meta: { sourceText: '简历原文', secondaryText: 'JD 原文' },
    })
    expect(rec.result.coveredKeywords).toEqual(['Java'])
    expect(rec.meta.sourceText).toBe('简历原文')
  })
})

// ---- getRecord / removeRecord / clearRecords ----

describe('getRecord / removeRecord / clearRecords', () => {
  it('getRecord 按 id 取完整记录', () => {
    const rec = saveRecord({ biz: 'checklist', summary: '总分 80', score: 80 })
    const got = getRecord(rec.id)
    expect(got).not.toBeNull()
    expect(got.id).toBe(rec.id)
    expect(got.summary).toBe('总分 80')
  })

  it('getRecord 不存在 → null', () => {
    expect(getRecord('nope')).toBeNull()
  })

  it('removeRecord 删除后列表减少，重复删除返回 false', () => {
    const rec = saveRecord({ biz: 'checklist', summary: '待删' })
    expect(removeRecord(rec.id)).toBe(true)
    expect(removeRecord(rec.id)).toBe(false)
    expect(listRecords({ biz: 'checklist' }).items).toHaveLength(0)
  })

  it('clearRecords 按 biz 清空，返回删除条数', () => {
    saveRecord({ biz: 'checklist', summary: 'a' })
    saveRecord({ biz: 'checklist', summary: 'b' })
    saveRecord({ biz: 'practice', summary: 'c' })

    const removed = clearRecords('checklist')
    expect(removed).toBe(2)
    expect(listRecords({ biz: 'checklist' }).items).toHaveLength(0)
    expect(listRecords({ biz: 'practice' }).items).toHaveLength(1)
  })
})

// ---- toItem ----

describe('toItem 视图模型', () => {
  it('字段映射完整（页面渲染依赖）', () => {
    const rec = saveRecord({
      biz: 'keyword',
      summary: '覆盖率 60%',
      score: 60,
      preview: 'Java / Redis',
    })
    const item = toItem(rec)
    expect(item.id).toBe(rec.id)
    expect(item.bizLabel).toBe('岗位比对')
    expect(item.statusLabel).toBe('已完成')
    expect(item.clickable).toBe(true)
    expect(item.hasScore).toBe(true)
    expect(item.score).toBe(60)
    expect(item.preview).toBe('Java / Redis')
  })
})

// ---- buildSources / buildCopyText ----

describe('buildSources 原文区块', () => {
  it('meta.sourceText / secondaryText → 两块原文', () => {
    const rec = {
      meta: { sourceText: '简历内容', secondaryText: 'JD 内容' },
    }
    const sources = buildSources(rec)
    expect(sources).toHaveLength(2)
    expect(sources[0].label).toBe('输入内容')
    expect(sources[1].label).toBe('岗位 JD')
  })

  it('超过 120 字折叠为 brief + 省略号', () => {
    const long = new Array(150).fill('字').join('')
    const rec = { meta: { sourceText: long } }
    const sources = buildSources(rec)
    expect(sources[0].brief.endsWith('…')).toBe(true)
    expect(sources[0].brief.length).toBeLessThan(long.length)
    expect(sources[0].total).toBe(150)
  })
})

describe('buildCopyText 复制文本', () => {
  it('拼接 标题+总结+评分+要点', () => {
    const text = buildCopyText({
      bizLabel: '简历自查',
      timeText: '今天 10:00',
      summary: '总分 72',
      hasScore: true,
      score: 72,
      result: { notes: ['补充量化成果', 'STAR 重写项目经历'] },
    })
    expect(text).toContain('【简历自查】今天 10:00')
    expect(text).toContain('【总结】总分 72')
    expect(text).toContain('【评分】72 / 100')
    expect(text).toContain('1. 补充量化成果')
    expect(text).toContain('2. STAR 重写项目经历')
  })
})
