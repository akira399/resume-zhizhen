'use strict'

/**
 * 面试练习室（M3）服务层。
 *
 * 替代原「AI 模拟面试」的合规方案：
 * - 从预设题库抽题（本地静态数据），非 AI 生成；
 * - 用户文字作答（先写「我的回答」）+ 对照参考答案自评；
 * - 三维度星级自评（结构清晰 / 有亮点 / 表达流畅）汇总。
 *
 * 注意：本文件位于 miniprogram/ 下，**禁止使用 ?. / ?? / for await**。
 */

const { CATEGORIES } = require('../package-tools/data/questions')

/** 三维度自评 */
const DIMENSIONS = [
  { key: 'structure', label: '结构清晰' },
  { key: 'highlight', label: '有亮点' },
  { key: 'fluency', label: '表达流畅' },
]

/** 每题作答倒计时（秒） */
const ANSWER_SECONDS = 90

/** 可选题量 */
const QUESTION_COUNTS = [3, 5, 8]

/** 分类 key 列表（与题库一致） */
function categoryKeys() {
  return CATEGORIES.map(function (c) { return c.key })
}

/** 分类列表（带题量） */
function categoriesWithCount() {
  return CATEGORIES.map(function (c) {
    return { key: c.key, name: c.name, icon: c.icon, total: c.questions.length }
  })
}

/**
 * 从选中分类的题池随机抽题。
 * @param selectedCategories {Array} 分类 key 数组；空/缺省 = 全部分类
 * @param count {number} 抽取数量（超出题池则全部返回）
 * @param rng {function=} 随机源，测试注入；默认 Math.random
 * @returns {Array<{category:string, q:string, a:string}>}
 */
function pickQuestions(selectedCategories, count, rng) {
  const pool = []
  const selected = selectedCategories && selectedCategories.length
    ? selectedCategories
    : categoryKeys()

  for (let i = 0; i < CATEGORIES.length; i++) {
    const cat = CATEGORIES[i]
    if (selected.indexOf(cat.key) === -1) continue
    for (let j = 0; j < cat.questions.length; j++) {
      pool.push({
        category: cat.name,
        q: cat.questions[j].q,
        a: cat.questions[j].a,
      })
    }
  }

  const rand = typeof rng === 'function' ? rng : Math.random
  const shuffled = pool.slice()
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = shuffled[i]
    shuffled[i] = shuffled[j]
    shuffled[j] = tmp
  }

  const n = Math.max(1, Math.min(Number(count) || 1, shuffled.length))
  return shuffled.slice(0, n)
}

function average(nums) {
  if (!nums || !nums.length) return 0
  let sum = 0
  for (let i = 0; i < nums.length; i++) sum += nums[i]
  return Math.round((sum / nums.length) * 10) / 10
}

/** 单轮三维度平均分（0 分 = 未评） */
function roundAverage(r) {
  const s = r && r.scores ? r.scores : {}
  const vals = []
  for (let i = 0; i < DIMENSIONS.length; i++) {
    const v = Number(s[DIMENSIONS[i].key]) || 0
    if (v > 0) vals.push(v)
  }
  if (!vals.length) return 0
  let sum = 0
  for (let i = 0; i < vals.length; i++) sum += vals[i]
  return Math.round((sum / vals.length) * 10) / 10
}

/**
 * 汇总练习结果。
 * @param rounds {Array<{q:string, a:string, scores:Object, note?:string}>}
 * @returns {{
 *   rounds: Array,        各轮（含综合分 avg）
 *   dimensions: Array,    三维度平均分 [{key,label,score}]
 *   overall: number,      综合平均分
 *   summary: string,
 *   notes: Array,         改进建议
 * }}
 */
function buildPracticeResult(rounds) {
  const list = Array.isArray(rounds) ? rounds : []

  const dimStats = DIMENSIONS.map(function (d) {
    const scores = list
      .map(function (r) { return (r.scores && r.scores[d.key]) || 0 })
      .filter(function (v) { return v > 0 })
    return { key: d.key, label: d.label, score: average(scores) }
  })

  const allAvgs = list.map(roundAverage).filter(function (v) { return v > 0 })
  const overall = average(allAvgs)

  const weakRounds = list.filter(function (r) {
    const avg = roundAverage(r)
    return avg > 0 && avg < 3
  })

  const notes = []
  if (weakRounds.length > 0) {
    notes.push('有 ' + weakRounds.length + ' 题自评偏低（<3 星），建议对照参考答案再练一遍')
  }
  const lowest = dimStats.slice().sort(function (a, b) { return a.score - b.score })[0]
  if (lowest && lowest.score > 0) {
    notes.push('最薄弱的维度：' + lowest.label + '（' + lowest.score + ' 分）')
  }
  if (notes.length === 0) notes.push('整体自评不错，继续保持练习节奏')

  const roundsOut = list.map(function (r) {
    return { q: r.q, a: r.a, scores: r.scores || {}, note: r.note || '', avg: roundAverage(r) }
  })

  return {
    rounds: roundsOut,
    dimensions: dimStats,
    overall: overall,
    summary: '完成 ' + list.length + ' 轮 · 综合 ' + overall + ' 分',
    notes: notes,
  }
}

module.exports = {
  DIMENSIONS: DIMENSIONS,
  ANSWER_SECONDS: ANSWER_SECONDS,
  QUESTION_COUNTS: QUESTION_COUNTS,
  categoryKeys: categoryKeys,
  categoriesWithCount: categoriesWithCount,
  pickQuestions: pickQuestions,
  roundAverage: roundAverage,
  buildPracticeResult: buildPracticeResult,
}
