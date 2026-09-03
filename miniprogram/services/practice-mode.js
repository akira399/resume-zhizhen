'use strict'

/**
 * 刷题模式（P2-13）。
 *
 * 面试题库的三种刷法：顺序 / 随机 / 错题重刷。
 * 答题结果（答对/答错）记本地（键 practice_mode_records），
 * 聚合正确率与错题池，驱动「错题重刷」。
 *
 * 纯函数优先：抽取/统计全部可单测，storage 读写集中在最后。
 *
 * 注意：本文件位于 miniprogram/ 下，**禁止使用 ?. / ?? / for await**。
 */

const store = require('./store')

const COLLECTION = 'practice_mode_records'

/** 可选题量 */
const COUNTS = [5, 10, 15]

/** 模式定义 */
const MODES = [
  { key: 'sequence', label: '顺序刷' },
  { key: 'random', label: '随机刷' },
  { key: 'wrong', label: '错题重刷' },
]

/** 打乱数组（Fisher-Yates，就地返回新数组） */
function shuffle(list) {
  const arr = list.slice()
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const t = arr[i]
    arr[i] = arr[j]
    arr[j] = t
  }
  return arr
}

/** 把分类题库拍平为 [{ q, a, category }] */
function flatten(list) {
  const out = []
  const cats = Array.isArray(list) ? list : []
  for (let i = 0; i < cats.length; i++) {
    const c = cats[i]
    const qs = Array.isArray(c && c.questions) ? c.questions : []
    for (let j = 0; j < qs.length; j++) {
      out.push({
        q: qs[j].q,
        a: qs[j].a,
        category: (c && c.name) || '',
      })
    }
  }
  return out
}

/** 读取答题记录：{ q: { correct, wrong, updatedAt } } */
function readRecords() {
  const v = store.get(COLLECTION, {})
  return v && typeof v === 'object' ? v : {}
}

function writeRecords(all) {
  store.set(COLLECTION, all)
}

/** 从记录里取错题池（答错过至少一次），按答错次数降序 */
function wrongQuestions(records) {
  const out = []
  const keys = Object.keys(records || {})
  for (let i = 0; i < keys.length; i++) {
    const r = records[keys[i]]
    if (r && Number(r.wrong) > 0) {
      out.push({ q: keys[i], wrong: Number(r.wrong) || 0 })
    }
  }
  out.sort(function (a, b) { return b.wrong - a.wrong })
  return out
}

/**
 * 按模式抽题。
 * @param items {Array} flatten 输出
 * @param mode {string} 'sequence' | 'random' | 'wrong'
 * @param records {object} readRecords 输出（wrong 模式需要）
 * @param count {number} 题量
 * @returns {{ items:Array, fromPool:number, poolSize:number }}
 */
function pickQuestions(items, mode, records, count) {
  const list = Array.isArray(items) ? items : []
  const n = Number(count) > 0 ? Number(count) : 5

  if (mode === 'wrong') {
    const wrong = wrongQuestions(records)
    const pool = list.filter(function (it) {
      return wrong.some(function (w) { return w.q === it.q })
    })
    return {
      items: pool.slice(0, n),
      fromPool: pool.length,
      poolSize: pool.length,
    }
  }

  const base = mode === 'random' ? shuffle(list) : list
  return { items: base.slice(0, n), fromPool: list.length, poolSize: list.length }
}

/** 记录一次答题结果。返回更新后的该题记录。 */
function recordAnswer(records, q, correct) {
  const all = readRecords()
  const cur = all[q] || { correct: 0, wrong: 0, updatedAt: 0 }
  if (correct) cur.correct += 1
  else cur.wrong += 1
  cur.updatedAt = Date.now()
  all[q] = cur
  writeRecords(all)
  return cur
}

/**
 * 聚合统计。
 * @param records {object} readRecords 输出
 * @returns {{ answered:number, correct:number, wrong:number, rate:number, wrongCount:number }}
 */
function buildStats(records) {
  const recs = records || {}
  let answered = 0
  let correct = 0
  let wrong = 0
  const keys = Object.keys(recs)
  for (let i = 0; i < keys.length; i++) {
    const r = recs[keys[i]]
    const c = Number(r && r.correct) || 0
    const w = Number(r && r.wrong) || 0
    answered += c + w
    correct += c
    wrong += w
  }
  return {
    answered: answered,
    correct: correct,
    wrong: wrong,
    rate: answered > 0 ? Math.round((correct / answered) * 100) : 0,
    wrongCount: wrongQuestions(recs).length,
  }
}

module.exports = {
  COLLECTION: COLLECTION,
  COUNTS: COUNTS,
  MODES: MODES,
  shuffle: shuffle,
  flatten: flatten,
  readRecords: readRecords,
  wrongQuestions: wrongQuestions,
  pickQuestions: pickQuestions,
  recordAnswer: recordAnswer,
  buildStats: buildStats,
}
