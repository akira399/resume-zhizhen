import { describe, it, expect, beforeEach } from 'vitest'

/**
 * 看板本地数据层测试（M4，v1.1）。
 *
 * 新版看板数据存本地 storage（services/store.js），测试需 mock wx。
 * 覆盖：标签归一、增删改查、归档、搜索过滤、演示数据。
 */

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
  normalizeTags,
  addApplication,
  updateApplication,
  removeApplication,
  getApplication,
  listApplications,
  toggleArchive,
  filterApplications,
  seedDemoApplications,
  clearDemoApplications,
  buildDemoApplications,
} from '../../miniprogram/services/kanban'

beforeEach(() => {
  Object.keys(memory).forEach((k) => delete memory[k])
})

describe('normalizeTags 标签归一', () => {
  it('字符串逗号分隔 → 数组', () => {
    expect(normalizeTags('秋招，内推，秋招')).toEqual(['秋招', '内推'])
  })

  it('数组输入 → 去空去重', () => {
    expect(normalizeTags(['秋招', '', '秋招', ' 梦厂 '])).toEqual(['秋招', '梦厂'])
  })

  it('空输入 → 空数组', () => {
    expect(normalizeTags('')).toEqual([])
    expect(normalizeTags([])).toEqual([])
  })

  it('超长标签截断到 12 字', () => {
    expect(normalizeTags(['这个标签特别特别特别特别长'])[0].length).toBeLessThanOrEqual(12)
  })
})

describe('本地增删改查', () => {
  it('add → list 能取回（含 id 与 tags 归一）', async () => {
    const id = await addApplication({
      company: '字节', position: '后端', status: 'applied', tags: '秋招，内推',
    })
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)

    const rows = await listApplications()
    expect(rows).toHaveLength(1)
    expect(rows[0].company).toBe('字节')
    expect(rows[0].tags).toEqual(['秋招', '内推'])
    expect(rows[0].archived).toBe(false)
  })

  it('getApplication 按 id 取回，不存在返回 null', async () => {
    const id = await addApplication({ company: 'A', position: 'B', status: 'applied' })
    const got = await getApplication(id)
    expect(got.company).toBe('A')
    expect(await getApplication('nope')).toBeNull()
  })

  it('updateApplication 局部更新（含 tags 归一）', async () => {
    const id = await addApplication({ company: 'A', position: 'B', status: 'applied' })
    const ok = await updateApplication(id, { status: 'interviewing', tags: '笔试，面试' })
    expect(ok).toBe(true)
    const got = await getApplication(id)
    expect(got.status).toBe('interviewing')
    expect(got.tags).toEqual(['笔试', '面试'])
  })

  it('removeApplication 删除后取不到', async () => {
    const id = await addApplication({ company: 'A', position: 'B', status: 'applied' })
    expect(await removeApplication(id)).toBe(true)
    expect(await getApplication(id)).toBeNull()
    expect(await removeApplication(id)).toBe(false)
  })

  it('listApplications 按 updatedAt 降序', async () => {
    await addApplication({ company: 'A', position: 'B', status: 'applied' })
    await addApplication({ company: 'C', position: 'D', status: 'applied' })
    const rows = await listApplications()
    expect(rows[0].company).toBe('C')
    expect(rows[1].company).toBe('A')
  })
})

describe('toggleArchive 归档', () => {
  it('归档/恢复切换，返回新状态', async () => {
    const id = await addApplication({ company: 'A', position: 'B', status: 'applied' })
    expect(await toggleArchive(id)).toBe(true)
    expect(await toggleArchive(id)).toBe(false)
    const got = await getApplication(id)
    expect(got.archived).toBe(false)
  })
})

describe('filterApplications 搜索 + 归档过滤', () => {
  // 3 条记录，归档「腾讯」（客户端岗），默认视图只显示未归档 2 条
  async function seed() {
    await addApplication({ company: '字节跳动', position: '后端开发', status: 'applied' })
    const t = await addApplication({ company: '腾讯', position: '客户端开发', status: 'applied' })
    await addApplication({ company: '美团', position: '后端开发', status: 'applied' })
    await toggleArchive(t)
  }

  it('按公司名 / 岗位名搜索（默认视图）', async () => {
    await seed()
    const rows = await listApplications()
    expect(filterApplications(rows, { keyword: '字节' })).toHaveLength(1)
    expect(filterApplications(rows, { keyword: '后端' })).toHaveLength(2)
    expect(filterApplications(rows, { keyword: '不存在的词' })).toHaveLength(0)
    // 默认视图 = 未归档 2 条
    expect(filterApplications(rows, { keyword: '' })).toHaveLength(2)
  })

  it('归档视图切换', async () => {
    await seed()
    const rows = await listApplications()
    expect(filterApplications(rows, { archivedOnly: false })).toHaveLength(2)
    expect(filterApplications(rows, { archivedOnly: true })).toHaveLength(1)
  })

  it('搜索 + 归档组合过滤', async () => {
    await seed()
    const rows = await listApplications()
    expect(filterApplications(rows, { keyword: '腾讯', archivedOnly: true })).toHaveLength(1)
    expect(filterApplications(rows, { keyword: '腾讯', archivedOnly: false })).toHaveLength(0)
    expect(filterApplications(rows, { keyword: '美团', archivedOnly: true })).toHaveLength(0)
    expect(filterApplications(rows, { keyword: '美团', archivedOnly: false })).toHaveLength(1)
  })
})

describe('演示数据（本地）', () => {
  it('seedDemoApplications 写入演示数据并带标记', async () => {
    const n = await seedDemoApplications()
    expect(n).toBeGreaterThan(0)
    const rows = await listApplications()
    expect(rows).toHaveLength(n)
    expect(rows.every((r) => r.isDemo === true)).toBe(true)
  })

  it('clearDemoApplications 只清演示记录', async () => {
    await addApplication({ company: '我的记录', position: 'B', status: 'applied' })
    await seedDemoApplications()
    const cleared = await clearDemoApplications()
    expect(cleared).toBeGreaterThan(0)
    const rows = await listApplications()
    expect(rows).toHaveLength(1)
    expect(rows[0].company).toBe('我的记录')
  })

  it('buildDemoApplications 覆盖全部状态且带 isDemo', () => {
    const rows = buildDemoApplications(new Date(2026, 7, 31, 12, 0, 0).getTime())
    const statuses = new Set(rows.map((r) => r.status))
    for (const s of ['applied', 'written', 'interviewing', 'offer', 'rejected']) {
      expect(statuses.has(s)).toBe(true)
    }
    expect(rows.every((r) => r.isDemo === true)).toBe(true)
  })
})
