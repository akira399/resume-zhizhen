import { describe, it, expect } from 'vitest'
import { CATEGORIES } from '../../miniprogram/package-tools/data/questions'

describe('questions 题库数据完整性', () => {
  it('五个分类齐全，key 唯一', () => {
    const keys = CATEGORIES.map((c) => c.key)
    expect(keys).toEqual(['behavior', 'backend', 'frontend', 'algo', 'hr'])
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('每题都有题目与答案，答案非空', () => {
    for (const cat of CATEGORIES) {
      expect(cat.questions.length, `${cat.key} 分类不应为空`).toBeGreaterThan(0)
      for (const item of cat.questions) {
        expect(item.q.trim().length, `${cat.key} 存在空题目`).toBeGreaterThan(0)
        expect(item.a.trim().length, `「${item.q}」答案为空`).toBeGreaterThan(0)
      }
    }
  })

  it('题面全局不重复（手风琴用 q 作 key，重复会导致展开错乱）', () => {
    const all = CATEGORIES.flatMap((c) => c.questions.map((q) => q.q))
    expect(new Set(all).size).toBe(all.length)
  })

  it('题库规模达到速查卡的可用下限（每类 ≥10 题，总量 ≥100，M5）', () => {
    for (const cat of CATEGORIES) {
      expect(cat.questions.length, `${cat.key} 题量不足`).toBeGreaterThanOrEqual(10)
    }
    const total = CATEGORIES.reduce((n, c) => n + c.questions.length, 0)
    expect(total).toBeGreaterThanOrEqual(100)
  })

  it('答案中的换行符规范（页面按行渲染，不允许 \r）', () => {
    for (const cat of CATEGORIES) {
      for (const item of cat.questions) {
        expect(item.a).not.toMatch(/\r/)
      }
    }
  })
})
