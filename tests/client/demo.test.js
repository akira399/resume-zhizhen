import { describe, it, expect } from 'vitest'
import { SAMPLE_RESUMES } from '../../miniprogram/data/samples'
import {
  STATUSES,
  buildDemoApplications,
  validateApplication,
  upcomingEvents,
} from '../../miniprogram/services/kanban'

/**
 * 演示路径的数据契约测试（去 AI 化版本）。
 *
 * 演示数据是用户/评审看到的第一屏，坏了等于产品坏了。这里锁定三条规则：
 * 1. 示例简历：3 份（应届/社招/转岗）、key/label 唯一、长度在输入框可接受范围内；
 * 2. 演示投递记录：覆盖全部 5 个状态、每条都能通过 validateApplication、
 *    全部带 isDemo 标记（清除时只删带标记的，绝不碰真实记录）；
 * 3. 演示日程：相对 now 计算，永远落在「未来 14 天」日程窗口内。
 */

// 固定「现在」，与 kanban.test.js 同一套基准，避免测试随真实日期漂移
const NOW = new Date(2026, 7, 31, 12, 0, 0).getTime()

describe('SAMPLE_RESUMES 示例简历', () => {
  it('提供 3 份，覆盖应届/社招/转岗', () => {
    expect(SAMPLE_RESUMES).toHaveLength(3)
    expect(SAMPLE_RESUMES.map((s) => s.key)).toEqual(['fresh', 'experienced', 'switcher'])
  })

  it('key 与 label 唯一（chips 用它们做 wx:key 与展示）', () => {
    const keys = SAMPLE_RESUMES.map((s) => s.key)
    const labels = SAMPLE_RESUMES.map((s) => s.label)
    expect(new Set(keys).size).toBe(keys.length)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('文本非空且在输入框上限内（MAX_LEN=5000），可直接提交', () => {
    for (const s of SAMPLE_RESUMES) {
      expect(typeof s.text).toBe('string')
      expect(s.text.trim().length).toBeGreaterThan(100)
      expect(s.text.length).toBeLessThanOrEqual(5000)
    }
  })
})

describe('buildDemoApplications 演示投递记录', () => {
  const rows = buildDemoApplications(NOW)

  it('覆盖全部 5 个状态，共 8-10 条', () => {
    expect(rows.length).toBeGreaterThanOrEqual(8)
    expect(rows.length).toBeLessThanOrEqual(10)
    const statuses = new Set(rows.map((r) => r.status))
    for (const s of STATUSES) {
      expect(statuses.has(s.key)).toBe(true)
    }
  })

  it('每条都能通过 validateApplication（拆回表单字段校验）', () => {
    for (const r of rows) {
      const form = {
        company: r.company,
        position: r.position,
        status: r.status,
        source: r.source,
        resumeVersion: r.resumeVersion,
        note: r.note,
        eventEnabled: !!r.nextEvent,
        eventType: r.nextEvent ? r.nextEvent.type : '',
        eventDate: r.nextEvent ? r.nextEvent.date : '',
        eventTime: r.nextEvent ? r.nextEvent.time : '',
      }
      const res = validateApplication(form)
      expect(res.ok).toBe(true)
    }
  })

  it('全部带 isDemo: true 标记（清除时只删带标记的）', () => {
    expect(rows.every((r) => r.isDemo === true)).toBe(true)
  })

  it('日程相对 now 计算，落在「未来 14 天」日程窗口内', () => {
    const withEvent = rows.filter((r) => r.nextEvent)
    expect(withEvent.length).toBeGreaterThanOrEqual(2)

    const events = upcomingEvents(rows, NOW)
    expect(events.length).toBe(withEvent.length)
    for (const ev of events) {
      expect(ev.atMs).toBeGreaterThan(NOW)
      expect(ev.atMs).toBeLessThanOrEqual(NOW + 14 * 86400000)
    }
  })

  it('不传 nowMs 时默认取当前时间，依然可用', () => {
    const nowRows = buildDemoApplications()
    expect(nowRows.length).toBe(rows.length)
    expect(nowRows.every((r) => r.isDemo === true)).toBe(true)
  })
})
