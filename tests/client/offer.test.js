import { describe, it, expect, beforeEach } from 'vitest'

/**
 * Offer 对比（M8）测试。mock wx storage。
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
  DIMENSIONS,
  clampScore,
  listOffers,
  rankOffers,
  setScore,
} from '../../miniprogram/services/offer'

const makeRows = () => [
  { id: 'a', company: '字节', position: '后端', status: 'offer', note: '', updatedAt: 3 },
  { id: 'b', company: '腾讯', position: '客户端', status: 'interviewing', note: '', updatedAt: 2 },
  { id: 'c', company: '美团', position: '后端', status: 'offer', note: '', updatedAt: 1 },
]

beforeEach(() => {
  Object.keys(memory).forEach((k) => delete memory[k])
})

describe('维度与分数', () => {
  it('5 个维度，权重之和为 1', () => {
    expect(DIMENSIONS.length).toBe(5)
    const sum = DIMENSIONS.reduce((acc, d) => acc + d.weight, 0)
    expect(sum).toBeCloseTo(1, 6)
  })

  it('clampScore 钳制到 [0,10] 整数', () => {
    expect(clampScore(-3)).toBe(0)
    expect(clampScore(99)).toBe(10)
    expect(clampScore(8.6)).toBe(9)
    expect(clampScore('abc')).toBe(null)
  })
})

describe('listOffers', () => {
  it('只取 status=offer 的记录', () => {
    const offers = listOffers(makeRows())
    expect(offers.length).toBe(2)
    expect(offers.map((o) => o.id)).toEqual(['a', 'c'])
  })

  it('未打分时 rated=false、total=null', () => {
    const offers = listOffers(makeRows())
    expect(offers[0].rated).toBe(false)
    expect(offers[0].total).toBe(null)
  })

  it('全部打分后按权重计算总分（1 位小数）', () => {
    // 薪酬10(0.3) 平台10(0.25) 成长10(0.2) 通勤10(0.15) 氛围10(0.1) = 10
    ;['salary', 'platform', 'growth', 'commute', 'vibe'].forEach((k) => setScore('a', k, 10))
    // 全部 5 分
    ;['salary', 'platform', 'growth', 'commute', 'vibe'].forEach((k) => setScore('c', k, 5))
    const offers = listOffers(makeRows())
    const a = offers.find((o) => o.id === 'a')
    const c = offers.find((o) => o.id === 'c')
    expect(a.rated).toBe(true)
    expect(a.total).toBe(10)
    expect(c.total).toBe(5)
  })
})

describe('rankOffers', () => {
  it('按总分降序排名，未打分不占名次', () => {
    ;['salary', 'platform', 'growth', 'commute', 'vibe'].forEach((k) => setScore('a', k, 6))
    ;['salary', 'platform', 'growth', 'commute', 'vibe'].forEach((k) => setScore('c', k, 9))
    const ranked = rankOffers(listOffers(makeRows()))
    expect(ranked[0].id).toBe('c') // 9 分 > 6 分
    expect(ranked[0].rank).toBe(1)
    expect(ranked[1].id).toBe('a')
    expect(ranked[1].rank).toBe(2)
  })

  it('setScore 拒绝非法维度/分数', () => {
    expect(setScore('a', 'not-a-dim', 8)).toBe(false)
    expect(setScore('a', 'salary', 'abc')).toBe(false)
    expect(setScore('a', 'salary', 5)).toBe(true)
  })
})
