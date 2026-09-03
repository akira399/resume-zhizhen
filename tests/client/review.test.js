import { describe, it, expect, beforeEach } from 'vitest'

/**
 * 面试复盘（M9）测试。mock wx storage。
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
  ROUNDS,
  splitItems,
  validateReview,
  addReview,
  listReviews,
  removeReview,
  collectCompanies,
  buildReviewStats,
} from '../../miniprogram/services/review'

beforeEach(() => {
  Object.keys(memory).forEach((k) => delete memory[k])
})

describe('splitItems 条目拆分', () => {
  it('按换行/逗号/分号分隔，去空去重', () => {
    expect(splitItems('项目深挖\n八股;算法,项目深挖\n, 手撕代码'))
      .toEqual(['项目深挖', '八股', '算法', '手撕代码'])
  })

  it('空输入返回空数组', () => {
    expect(splitItems('')).toEqual([])
  })
})

describe('validateReview 校验', () => {
  const base = { company: '腾讯', position: '后端', round: '一面', rating: 4, wins: '沟通顺畅', fails: '', questions: '介绍项目', notes: '' }

  it('合法表单通过并归一化', () => {
    const res = validateReview(base)
    expect(res.ok).toBe(true)
    expect(res.value.rating).toBe(4)
    expect(res.value.wins).toEqual(['沟通顺畅'])
    expect(res.value.round).toBe('一面')
  })

  it('公司/岗位必填', () => {
    expect(validateReview(Object.assign({}, base, { company: '' })).ok).toBe(false)
    expect(validateReview(Object.assign({}, base, { position: '' })).ok).toBe(false)
  })

  it('评分必须在 1-5', () => {
    expect(validateReview(Object.assign({}, base, { rating: 0 })).ok).toBe(false)
    expect(validateReview(Object.assign({}, base, { rating: 6 })).ok).toBe(false)
    expect(validateReview(Object.assign({}, base, { rating: 3.4 })).ok).toBe(true)
  })

  it('非法轮次回退到第一项', () => {
    const res = validateReview(Object.assign({}, base, { round: '终面' }))
    expect(res.value.round).toBe(ROUNDS[0])
  })
})

describe('增删查', () => {
  it('新增后倒序返回', async () => {
    await addReview({ company: 'A', position: 'P', rating: 3 })
    await new Promise((r) => setTimeout(r, 5))
    await addReview({ company: 'B', position: 'P', rating: 5 })
    const list = await listReviews()
    expect(list.map((r) => r.company)).toEqual(['B', 'A'])
  })

  it('删除指定复盘', async () => {
    const id = await addReview({ company: 'A', position: 'P', rating: 3 })
    await addReview({ company: 'B', position: 'P', rating: 5 })
    await removeReview(id)
    const list = await listReviews()
    expect(list.length).toBe(1)
    expect(list[0].company).toBe('B')
  })
})

describe('collectCompanies 公司提取', () => {
  it('从投递记录去重提取公司名', () => {
    const rows = [
      { company: '腾讯' },
      { company: '腾讯' },
      { company: '字节' },
      { company: '' },
    ]
    expect(collectCompanies(rows)).toEqual(['腾讯', '字节'])
  })
})

describe('buildReviewStats 统计', () => {
  it('计数/平均分/Top 问题/Top 待改进', async () => {
    await addReview({
      company: 'A', position: 'P', rating: 4,
      questions: ['项目深挖', '算法'],
      fails: ['手撕代码'],
    })
    await addReview({
      company: 'B', position: 'P', rating: 2,
      questions: ['项目深挖', '八股'],
      fails: ['项目深挖', '手撕代码'],
    })

    const stats = buildReviewStats(await listReviews())
    expect(stats.count).toBe(2)
    expect(stats.avgRating).toBe(3)
    expect(stats.topQuestions[0]).toEqual({ text: '项目深挖', count: 2 })
    expect(stats.topFails[0]).toEqual({ text: '手撕代码', count: 2 })
  })

  it('空数据：count=0、avgRating=null、top 为空', () => {
    const stats = buildReviewStats([])
    expect(stats.count).toBe(0)
    expect(stats.avgRating).toBe(null)
    expect(stats.topQuestions).toEqual([])
    expect(stats.topFails).toEqual([])
  })
})
