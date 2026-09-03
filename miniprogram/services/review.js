'use strict'

/**
 * 面试复盘（M9）。
 *
 * 面试后记录：公司/岗位/轮次/整体评分（1-5 星）/答得好/没答好/被问问题/下次改进。
 * 纯本地存储（键 reviews），复盘列表按时间倒序；聚合统计输出
 * 复盘次数、平均分、被问最多的问题 Top、最需改进的项 Top。
 *
 * 注意：本文件位于 miniprogram/ 下，**禁止使用 ?. / ?? / for await**。
 */

const store = require('./store')

const COLLECTION = 'reviews'

/** 面试轮次候选 */
const ROUNDS = ['一面', '二面', '三面', 'HR 面', '笔试+面', '其他']

const FIELD_MAX = 50 // 单条问题/优点/不足长度上限
const LIST_MAX = 20 // 每个列表字段最多条目

/**
 * 把多行文本拆成条目数组：按 换行 / 逗号（中英）/ 分号（中英）分隔，去空去重。
 * @returns {Array<string>}
 */
function splitItems(text) {
  const seen = {}
  const out = []
  const src = String(text || '')
    .split(/\n|[,，;；]/)
  for (let i = 0; i < src.length; i++) {
    const t = String(src[i] || '').trim().slice(0, FIELD_MAX)
    if (!t || seen[t]) continue
    seen[t] = true
    out.push(t)
    if (out.length >= LIST_MAX) break
  }
  return out
}

/**
 * 表单校验与归一化。
 * @returns {{ ok:boolean, reason?:string, value?:object }}
 */
function validateReview(form) {
  const src = form && typeof form === 'object' ? form : {}
  const company = String(src.company || '').trim()
  const position = String(src.position || '').trim()

  if (!company) return { ok: false, reason: '请填写公司名称' }
  if (company.length > 40) return { ok: false, reason: '公司名称过长' }
  if (!position) return { ok: false, reason: '请填写岗位名称' }
  if (position.length > 40) return { ok: false, reason: '岗位名称过长' }

  const rating = Number(src.rating)
  if (!isFinite(rating) || rating < 1 || rating > 5) {
    return { ok: false, reason: '请为本次面试打分（1-5 星）' }
  }

  const round = ROUNDS.indexOf(src.round) !== -1 ? src.round : ROUNDS[0]

  const value = {
    company: company,
    position: position,
    round: round,
    rating: Math.round(rating),
    wins: splitItems(src.wins),
    fails: splitItems(src.fails),
    questions: splitItems(src.questions),
    notes: String(src.notes || '').trim().slice(0, 300),
  }
  return { ok: true, value: value }
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function readAll() {
  const rows = store.get(COLLECTION, [])
  return Array.isArray(rows) ? rows : []
}

function writeAll(rows) {
  store.set(COLLECTION, rows)
}

/** 新增复盘。返回 Promise<id> */
function addReview(data) {
  const now = Date.now()
  const row = Object.assign({}, data, { id: genId(), createdAt: now, updatedAt: now })
  const rows = readAll()
  rows.unshift(row)
  writeAll(rows)
  return Promise.resolve(row.id)
}

/** 全部复盘，时间倒序 */
function listReviews() {
  const rows = readAll()
  rows.sort(function (a, b) {
    return (b.createdAt || 0) - (a.createdAt || 0)
  })
  return Promise.resolve(rows)
}

/** 按 id 取单条（编辑回填用） */
function getReview(id) {
  const rows = readAll()
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].id === id) return Promise.resolve(rows[i])
  }
  return Promise.resolve(null)
}

/** 局部更新 */
function updateReview(id, patch) {
  const rows = readAll()
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].id !== id) continue
    rows[i] = Object.assign({}, rows[i], patch, { updatedAt: Date.now() })
    writeAll(rows)
    return Promise.resolve(true)
  }
  return Promise.resolve(false)
}

/** 删除复盘 */
function removeReview(id) {
  const rows = readAll()
  const next = rows.filter(function (r) {
    return r.id !== id
  })
  if (next.length === rows.length) return Promise.resolve(false)
  writeAll(next)
  return Promise.resolve(true)
}

/** 从投递记录提取公司名去重列表（编辑页快速选择） */
function collectCompanies(rows) {
  const seen = {}
  const out = []
  const list = Array.isArray(rows) ? rows : []
  for (let i = 0; i < list.length; i++) {
    const c = String((list[i] && list[i].company) || '').trim()
    if (!c || seen[c]) continue
    seen[c] = true
    out.push(c)
  }
  return out
}

/**
 * 聚合统计。
 * @param reviews {Array} listReviews 输出
 * @returns {{ count:number, avgRating:number|null,
 *             topQuestions:Array<{text:string,count:number}>,
 *             topFails:Array<{text:string,count:number}> }}
 */
function buildReviewStats(reviews) {
  const list = Array.isArray(reviews) ? reviews : []

  let sum = 0
  let rated = 0
  const qCount = {}
  const fCount = {}

  for (let i = 0; i < list.length; i++) {
    const r = list[i]
    const rating = Number(r && r.rating)
    if (isFinite(rating)) {
      sum += rating
      rated += 1
    }
    if (Array.isArray(r && r.questions)) {
      r.questions.forEach(function (q) {
        const t = String(q || '').trim()
        if (t) qCount[t] = (qCount[t] || 0) + 1
      })
    }
    if (Array.isArray(r && r.fails)) {
      r.fails.forEach(function (f) {
        const t = String(f || '').trim()
        if (t) fCount[t] = (fCount[t] || 0) + 1
      })
    }
  }

  function top(counts, limit) {
    const arr = Object.keys(counts).map(function (k) {
      return { text: k, count: counts[k] }
    })
    arr.sort(function (a, b) {
      if (b.count !== a.count) return b.count - a.count
      return a.text < b.text ? -1 : 1
    })
    return arr.slice(0, limit)
  }

  return {
    count: list.length,
    avgRating: rated > 0 ? Math.round((sum / rated) * 10) / 10 : null,
    topQuestions: top(qCount, 5),
    topFails: top(fCount, 5),
  }
}

module.exports = {
  COLLECTION: COLLECTION,
  ROUNDS: ROUNDS,
  splitItems: splitItems,
  validateReview: validateReview,
  addReview: addReview,
  listReviews: listReviews,
  getReview: getReview,
  updateReview: updateReview,
  removeReview: removeReview,
  collectCompanies: collectCompanies,
  buildReviewStats: buildReviewStats,
}
