import { describe, it, expect, beforeEach } from 'vitest'

/**
 * 投递时间线（M10）测试。mock wx storage。
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
  weekStart,
  buildTimeline,
  getGoal,
  setGoal,
  goalCompletion,
} from '../../miniprogram/services/timeline'

/** 2026-09-01 是周二（周一为 2026-08-31） */
const TUE = new Date(2026, 8, 1).getTime()
const PREV_MON = new Date(2026, 7, 31).getTime()

beforeEach(() => {
  Object.keys(memory).forEach((k) => delete memory[k])
})

describe('weekStart 周一归桶', () => {
  it('周二归入当周周一', () => {
    expect(weekStart(TUE)).toBe(PREV_MON)
  })

  it('周一本身归入自己', () => {
    expect(weekStart(PREV_MON)).toBe(PREV_MON)
  })
})

describe('buildTimeline 周聚合', () => {
  it('按周一分桶并统计各状态', () => {
    const rows = [
      { company: 'A', status: 'applied', createdAt: TUE },
      { company: 'B', status: 'interviewing', createdAt: TUE + 1 },
      { company: 'C', status: 'offer', createdAt: TUE + 2 },
      { company: 'D', status: 'applied', createdAt: PREV_MON - 1 }, // 上周日 → 上上周
    ]
    const tl = buildTimeline(rows, { gran: 'week', nowMs: TUE })
    // 两周：上上周（D） + 本周（A/B/C）
    expect(tl.length).toBe(2)
    expect(tl[1].total).toBe(3)
    expect(tl[1].applied).toBe(1)
    expect(tl[1].interviewing).toBe(1)
    expect(tl[1].offer).toBe(1)
    expect(tl[1].interview).toBe(2)
    expect(tl[0].total).toBe(1)
  })

  it('时间正序 + 周标签格式', () => {
    const rows = [
      { company: 'A', status: 'applied', createdAt: TUE },
      { company: 'B', status: 'applied', createdAt: PREV_MON - 7 * 24 * 3600 * 1000 },
    ]
    const tl = buildTimeline(rows, { gran: 'week', nowMs: TUE })
    expect(tl[0].startMs < tl[1].startMs).toBe(true)
    expect(tl[1].label).toBe('8/31')
  })

  it('最多展示 max 个周期', () => {
    const rows = []
    for (let i = 0; i < 20; i++) {
      rows.push({ company: 'C' + i, status: 'applied', createdAt: TUE - i * 24 * 3600 * 1000 })
    }
    const tl = buildTimeline(rows, { gran: 'week', nowMs: TUE, max: 12 })
    expect(tl.length).toBeLessThanOrEqual(12)
  })

  it('月聚合', () => {
    const rows = [
      { company: 'A', status: 'applied', createdAt: new Date(2026, 7, 15).getTime() },
      { company: 'B', status: 'offer', createdAt: new Date(2026, 8, 1).getTime() },
    ]
    const tl = buildTimeline(rows, { gran: 'month', nowMs: new Date(2026, 8, 2).getTime() })
    expect(tl.length).toBe(2)
    expect(tl[0].label).toBe('8月')
    expect(tl[1].label).toBe('9月')
    expect(tl[1].offer).toBe(1)
  })
})

describe('目标与完成度', () => {
  it('setGoal 钳制 1-100，getGoal 可读', () => {
    setGoal(5)
    expect(getGoal().weeklyTarget).toBe(5)
    setGoal(999)
    expect(getGoal().weeklyTarget).toBe(100)
    setGoal(-3)
    expect(getGoal().weeklyTarget).toBe(1)
  })

  it('goalCompletion 计算每周完成度与达标周', () => {
    setGoal(5)
    const tl = buildTimeline(
      [
        { company: 'A', status: 'applied', createdAt: TUE },
        { company: 'B', status: 'applied', createdAt: TUE + 1 },
        { company: 'C', status: 'applied', createdAt: TUE + 2 },
        { company: 'D', status: 'applied', createdAt: TUE + 3 },
        { company: 'E', status: 'applied', createdAt: TUE + 4 },
        { company: 'F', status: 'applied', createdAt: TUE + 5 }, // 6 家，超目标
      ],
      { gran: 'week', nowMs: TUE }
    )
    const res = goalCompletion(tl, getGoal())
    expect(res.items.length).toBe(1)
    expect(res.items[0].pct).toBe(120)
    expect(res.hitWeeks).toBe(1)
    expect(res.avgPct).toBe(120)
  })

  it('无目标时 pct 全为 null', () => {
    const tl = buildTimeline([{ company: 'A', status: 'applied', createdAt: TUE }], { gran: 'week' })
    const res = goalCompletion(tl, null)
    expect(res.items[0].pct).toBe(null)
    expect(res.avgPct).toBe(null)
  })
})
