import { describe, it, expect } from 'vitest'
import {
  startOfWeek,
  weekLabel,
  weeklyTrend,
  channelStats,
  buildStats,
} from '../../miniprogram/services/stats'

// 固定「现在」：2026-09-01（周二）12:00
const NOW = new Date(2026, 8, 1, 12, 0, 0).getTime()

function row(overrides) {
  return Object.assign(
    { company: '公司', position: '岗位', status: 'applied', source: '官网', createdAt: NOW, updatedAt: NOW },
    overrides
  )
}

describe('startOfWeek / weekLabel', () => {
  it('2026-09-01（周二）所在周起始是 08-31（周一）', () => {
    const s = startOfWeek(NOW)
    expect(weekLabel(s.getTime())).toBe('08/31')
  })

  it('周一当天起始就是它自己', () => {
    const monday = new Date(2026, 7, 31, 10, 0, 0).getTime() // 2026-08-31 周一
    const s = startOfWeek(monday)
    expect(weekLabel(s.getTime())).toBe('08/31')
  })
})

describe('weeklyTrend 近 8 周趋势', () => {
  it('空数据 → 8 个桶全 0', () => {
    const w = weeklyTrend([], NOW)
    expect(w).toHaveLength(8)
    expect(w.every((b) => b.count === 0)).toBe(true)
  })

  it('本周记录计入最新桶', () => {
    const rows = [row({ company: 'A' })] // createdAt = NOW（本周）
    const w = weeklyTrend(rows, NOW)
    expect(w[w.length - 1].count).toBe(1)
    expect(w[w.length - 2].count).toBe(0)
  })

  it('上周记录计入上一桶', () => {
    const lastWeek = NOW - 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000
    const rows = [row({ company: 'A', createdAt: lastWeek })]
    const w = weeklyTrend(rows, NOW)
    expect(w[w.length - 2].count).toBe(1)
  })

  it('超过 8 周外的记录不进任何桶', () => {
    const old = NOW - 60 * 24 * 60 * 60 * 1000
    const w = weeklyTrend([row({ createdAt: old })], NOW)
    expect(w.every((b) => b.count === 0)).toBe(true)
  })
})

describe('channelStats 渠道效果', () => {
  it('按渠道分组统计投递与 Offer', () => {
    const rows = [
      row({ source: '内推', status: 'offer' }),
      row({ source: '内推', status: 'applied' }),
      row({ source: '官网', status: 'applied' }),
      row({ source: '' }),
    ]
    const c = channelStats(rows)
    const neitui = c.filter((x) => x.source === '内推')[0]
    expect(neitui.total).toBe(2)
    expect(neitui.offer).toBe(1)
    expect(neitui.rate).toBe(50)
    // 空来源归「其他」
    expect(c.some((x) => x.source === '其他')).toBe(true)
  })

  it('按投递数降序', () => {
    const rows = [
      row({ source: '官网' }),
      row({ source: '官网' }),
      row({ source: '内推' }),
    ]
    const c = channelStats(rows)
    expect(c[0].source).toBe('官网')
  })
})

describe('buildStats 汇总', () => {
  it('空数据 → 全 0', () => {
    const s = buildStats([], { nowMs: NOW })
    expect(s.total).toBe(0)
    expect(s.offerCount).toBe(0)
    expect(s.conversion).toBe(0)
    expect(s.statusCounts).toHaveLength(5)
    expect(s.funnel).toHaveLength(4)
    expect(s.weekly).toHaveLength(8)
  })

  it('状态占比与转化率', () => {
    const rows = [
      row({ status: 'applied' }),
      row({ status: 'applied' }),
      row({ status: 'interviewing' }),
      row({ status: 'offer' }),
      row({ status: 'offer' }),
    ]
    const s = buildStats(rows, { nowMs: NOW })
    expect(s.total).toBe(5)
    expect(s.offerCount).toBe(2)
    expect(s.conversion).toBe(40)
    const applied = s.statusCounts.filter((x) => x.key === 'applied')[0]
    expect(applied.count).toBe(2)
    expect(applied.pct).toBe(40)
  })

  it('漏斗复用 kanban 口径（投递→笔试→面试→Offer）', () => {
    const rows = [
      row({ status: 'applied' }),
      row({ status: 'written' }),
      row({ status: 'interviewing' }),
      row({ status: 'offer' }),
    ]
    const s = buildStats(rows, { nowMs: NOW })
    const stages = s.funnel.map((f) => f.key)
    expect(stages).toEqual(['applied', 'written', 'interviewing', 'offer'])
  })

  it('未知状态不进占比（保持枚举）', () => {
    const rows = [row({ status: 'ghost' }), row({ status: 'applied' })]
    const s = buildStats(rows, { nowMs: NOW })
    expect(s.total).toBe(2)
    const ghost = s.statusCounts.filter((x) => x.key === 'ghost')
    expect(ghost).toHaveLength(0)
  })
})
