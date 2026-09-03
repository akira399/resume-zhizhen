import { describe, it, expect } from 'vitest'
import {
  DIMENSIONS,
  ANSWER_SECONDS,
  QUESTION_COUNTS,
  categoriesWithCount,
  pickQuestions,
  roundAverage,
  buildPracticeResult,
} from '../../miniprogram/services/practice'

describe('常量契约', () => {
  it('三维度：结构清晰 / 有亮点 / 表达流畅', () => {
    expect(DIMENSIONS.map((d) => d.label)).toEqual(['结构清晰', '有亮点', '表达流畅'])
  })

  it('倒计时 90 秒，题量可选项 3/5/8', () => {
    expect(ANSWER_SECONDS).toBe(90)
    expect(QUESTION_COUNTS).toEqual([3, 5, 8])
  })

  it('分类列表带题量', () => {
    const cats = categoriesWithCount()
    expect(cats.length).toBeGreaterThanOrEqual(5)
    for (const c of cats) {
      expect(c.total).toBeGreaterThan(0)
    }
  })
})

describe('pickQuestions 抽题', () => {
  const fixedRng = (() => {
    let seq = [0, 0, 0, 0, 0] // 全部取第 0 个，稳定可复现
    return function () {
      return seq.length ? seq.shift() : 0
    }
  })()

  it('抽题数量正确且来自题库', () => {
    const qs = pickQuestions(null, 5, fixedRng)
    expect(qs).toHaveLength(5)
    for (const q of qs) {
      expect(typeof q.q).toBe('string')
      expect(q.q.length).toBeGreaterThan(0)
      expect(typeof q.a).toBe('string')
    }
  })

  it('只从选中分类抽题', () => {
    const qs = pickQuestions(['behavior'], 20, fixedRng)
    expect(qs.length).toBeGreaterThan(0)
    for (const q of qs) expect(q.category).toBe('行为面')
  })

  it('题量超过题池时返回全部（不报错）', () => {
    const qs = pickQuestions(['behavior'], 999, fixedRng)
    // 行为面分类当前 20 题（M5 扩充）：返回全部而非按请求量补空
    expect(qs.length).toBe(20)
  })

  it('数量下限为 1', () => {
    expect(pickQuestions(null, 0, fixedRng)).toHaveLength(1)
  })

  it('不传 rng 也能跑（默认 Math.random）', () => {
    const qs = pickQuestions(null, 3)
    expect(qs).toHaveLength(3)
  })
})

describe('roundAverage 单轮均分', () => {
  it('三维度 (3,4,5) → 4', () => {
    expect(roundAverage({ scores: { structure: 3, highlight: 4, fluency: 5 } })).toBe(4)
  })

  it('未评（全 0）→ 0', () => {
    expect(roundAverage({ scores: {} })).toBe(0)
  })

  it('部分维度未评按已评维度平均', () => {
    expect(roundAverage({ scores: { structure: 4, fluency: 5 } })).toBe(4.5)
  })
})

describe('buildPracticeResult 汇总', () => {
  it('空练习 → overall 0，notes 有建议', () => {
    const r = buildPracticeResult([])
    expect(r.overall).toBe(0)
    expect(r.notes.length).toBeGreaterThan(0)
    expect(r.summary).toContain('0 轮')
  })

  it('单轮 5 星 → overall 5，维度全 5', () => {
    const r = buildPracticeResult([
      { q: '自我介绍', a: '答案', scores: { structure: 5, highlight: 5, fluency: 5 } },
    ])
    expect(r.overall).toBe(5)
    for (const d of r.dimensions) expect(d.score).toBe(5)
  })

  it('多轮平均与维度汇总', () => {
    const r = buildPracticeResult([
      { q: 'A', a: 'a', scores: { structure: 3, highlight: 3, fluency: 3 } },
      { q: 'B', a: 'b', scores: { structure: 5, highlight: 4, fluency: 5 } },
    ])
    // 综合 (3+4.67)/2 约 3.8
    expect(r.overall).toBeGreaterThan(3)
    expect(r.overall).toBeLessThan(4)
    // 结构维度 (3+5)/2 = 4
    const structure = r.dimensions.filter((d) => d.key === 'structure')[0]
    expect(structure.score).toBe(4)
  })

  it('低分轮（<3 星）触发「建议再练」提示', () => {
    const r = buildPracticeResult([
      { q: 'A', a: 'a', scores: { structure: 2, highlight: 2, fluency: 2 } },
    ])
    expect(r.notes.some((n) => n.indexOf('再练一遍') !== -1)).toBe(true)
  })

  it('rounds 输出含 avg 与 note', () => {
    const r = buildPracticeResult([
      { q: 'A', a: 'a', scores: { structure: 4, highlight: 4, fluency: 4 }, note: '有点紧张' },
    ])
    expect(r.rounds[0].avg).toBe(4)
    expect(r.rounds[0].note).toBe('有点紧张')
  })
})
