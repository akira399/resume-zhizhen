import { describe, it, expect } from 'vitest'
import { buildFunnel } from '../../miniprogram/services/kanban'

function group(key, n) {
  return { key: key, label: key, items: Array.from({ length: n }, () => ({})) }
}

describe('buildFunnel', () => {
  it('漏斗四阶段按「处于或已通过该阶段」累计', () => {
    // 9 条：3 applied / 1 written / 2 interviewing / 1 offer / 2 rejected
    const groups = [group('applied', 3), group('written', 1), group('interviewing', 2), group('offer', 1), group('rejected', 2)]
    const funnel = buildFunnel(groups)

    expect(funnel.map((s) => s.key)).toEqual(['applied', 'written', 'interviewing', 'offer'])
    expect(funnel.map((s) => s.count)).toEqual([9, 4, 3, 1]) // 笔试+ = 1+2+1；面试+ = 2+1
  })

  it('百分比四舍五入到整数，条宽最小 2%', () => {
    const groups = [group('applied', 2), group('offer', 1)]
    const funnel = buildFunnel(groups)

    expect(funnel[0].pct).toBe(100)
    expect(funnel[3].pct).toBe(33) // 1/3 → 33
    expect(funnel[1].pct).toBe(33)
    // offer 计入「处于或已通过面试」：count 为 1 而非 0
    expect(funnel[2].count).toBe(1)
    // 2% 底线只对真正为 0 的阶段生效（见「全部挂掉」用例）
    expect(funnel[2].barPct).toBe(33)
  })

  it('空看板：全 0 且不产生 NaN', () => {
    const funnel = buildFunnel([])
    expect(funnel.every((s) => s.count === 0 && s.pct === 0 && s.barPct === 2)).toBe(true)
  })

  it('全部挂掉：漏斗只剩投递一层', () => {
    const groups = [group('applied', 5), group('rejected', 5)]
    const funnel = buildFunnel(groups)
    expect(funnel.map((s) => s.count)).toEqual([10, 0, 0, 0])
    expect(funnel[0].pct).toBe(100)
  })
})
