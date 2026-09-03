import { describe, it, expect, beforeEach } from 'vitest'

/**
 * 刷题模式（P2-13）测试。mock wx storage。
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
  MODES,
  COUNTS,
  shuffle,
  flatten,
  readRecords,
  pickQuestions,
  recordAnswer,
  wrongQuestions,
  buildStats,
} from '../../miniprogram/services/practice-mode'

const QS = [
  { key: 'behavior', name: '行为面', questions: [
    { q: '自我介绍', a: '三段式' },
    { q: '最大缺点', a: '公式' },
  ]},
  { key: 'backend', name: '后端', questions: [
    { q: 'TCP 三次握手', a: 'SYN...' },
    { q: 'MySQL 索引', a: 'B+树' },
    { q: 'Redis 持久化', a: 'RDB/AOF' },
  ]},
]

beforeEach(() => {
  Object.keys(memory).forEach((k) => delete memory[k])
})

describe('常量与基础函数', () => {
  it('MODES 三种模式 / COUNTS 三种题量', () => {
    expect(MODES.map((m) => m.key)).toEqual(['sequence', 'random', 'wrong'])
    expect(COUNTS).toEqual([5, 10, 15])
  })

  it('shuffle 返回等长新数组', () => {
    const arr = [1, 2, 3, 4, 5]
    const s = shuffle(arr)
    expect(s.length).toBe(5)
    expect(s.sort()).toEqual(arr.sort())
  })

  it('flatten 拍平分类题库', () => {
    const flat = flatten(QS)
    expect(flat.length).toBe(5)
    expect(flat[0].q).toBe('自我介绍')
    expect(flat[0].category).toBe('行为面')
  })
})

describe('pickQuestions 抽题', () => {
  const flat = flatten(QS)

  it('顺序模式取前 N 个', () => {
    const r = pickQuestions(flat, 'sequence', {}, 3)
    expect(r.items.map((i) => i.q)).toEqual(['自我介绍', '最大缺点', 'TCP 三次握手'])
  })

  it('随机模式不改变题池', () => {
    const r = pickQuestions(flat, 'random', {}, 4)
    expect(r.items.length).toBe(4)
    expect(r.poolSize).toBe(5)
  })

  it('错题模式只取答错过的题', () => {
    const records = {
      '自我介绍': { correct: 1, wrong: 0 },
      '最大缺点': { correct: 0, wrong: 2 },
      'TCP 三次握手': { correct: 0, wrong: 1 },
    }
    const r = pickQuestions(flat, 'wrong', records, 10)
    expect(r.items.length).toBe(2)
    expect(r.items[0].q).toBe('最大缺点') // wrong 次数多排前
  })

  it('错题池为空时返回空', () => {
    const r = pickQuestions(flat, 'wrong', {}, 5)
    expect(r.items).toEqual([])
  })
})

describe('答题记录与统计', () => {
  it('recordAnswer 累计正确/错误次数', () => {
    recordAnswer({}, '自我介绍', true)
    recordAnswer({}, '自我介绍', true)
    recordAnswer({}, '自我介绍', false)
    const recs = readRecords()
    expect(recs['自我介绍']).toMatchObject({ correct: 2, wrong: 1 })
  })

  it('wrongQuestions 返回错题池', () => {
    recordAnswer({}, 'A', true)
    recordAnswer({}, 'B', false)
    recordAnswer({}, 'C', false)
    const wrong = wrongQuestions(readRecords())
    expect(wrong.map((w) => w.q).sort()).toEqual(['B', 'C'])
  })

  it('buildStats 统计答题数与正确率', () => {
    recordAnswer({}, 'A', true)
    recordAnswer({}, 'A', true)
    recordAnswer({}, 'B', false)
    const s = buildStats(readRecords())
    expect(s.answered).toBe(3)
    expect(s.correct).toBe(2)
    expect(s.rate).toBe(67)
    expect(s.wrongCount).toBe(1)
  })
})
