'use strict'

/**
 * Offer 对比（M8）。
 *
 * 从投递记录里取出状态为「Offer」的条目组成对比池，
 * 对 5 个维度（薪酬/平台/成长/通勤/氛围）按权重打分，实时计算加权总分。
 *
 * 打分存本地（键 offer_scores，形如 { [appId]: { salary: 8, ... } }），
 * 与投递记录解耦——删掉某条记录不影响其它打分（残留分数无害）。
 *
 * 注意：本文件位于 miniprogram/ 下，**禁止使用 ?. / ?? / for await**。
 */

const store = require('./store')

/** Offer 状态对应的投递状态 key（与 kanban.STATUSES 保持一致） */
const OFFER_STATUS = 'offer'

/** 打分维度与权重（权重之和 = 1） */
const DIMENSIONS = [
  { key: 'salary', label: '薪酬待遇', weight: 0.3 },
  { key: 'platform', label: '平台背书', weight: 0.25 },
  { key: 'growth', label: '成长空间', weight: 0.2 },
  { key: 'commute', label: '通勤生活', weight: 0.15 },
  { key: 'vibe', label: '团队氛围', weight: 0.1 },
]

const SCORE_MIN = 0
const SCORE_MAX = 10

function readScores() {
  const v = store.get('offer_scores', {})
  return v && typeof v === 'object' ? v : {}
}

function writeScores(all) {
  store.set('offer_scores', all)
}

/** 分数钳制到 [0,10] 整数 */
function clampScore(n) {
  const v = Number(n)
  if (!isFinite(v)) return null
  return Math.max(SCORE_MIN, Math.min(SCORE_MAX, Math.round(v)))
}

/**
 * 从投递记录中筛选 Offer 并合并打分、计算总分。
 * @param rows {Array} 投递原始记录（kanban.listApplications 输出）
 * @returns {Array<object>} 视图模型（含 dims / rated / total / rank 占位）
 */
function listOffers(rows) {
  const list = Array.isArray(rows) ? rows : []
  const all = readScores()
  const offers = []

  for (let i = 0; i < list.length; i++) {
    const r = list[i]
    if (!r || r.status !== OFFER_STATUS) continue

    const scores = all[r.id] && typeof all[r.id] === 'object' ? all[r.id] : {}
    const dims = DIMENSIONS.map(function (d) {
      return {
        key: d.key,
        label: d.label,
        weight: d.weight,
        score: clampScore(scores[d.key]),
      }
    })

    // 全部维度已打分才算「可计总分」
    let rated = true
    for (let j = 0; j < dims.length; j++) {
      if (dims[j].score === null) {
        rated = false
        break
      }
    }

    let total = null
    if (rated) {
      let sum = 0
      for (let j = 0; j < dims.length; j++) {
        sum += dims[j].score * dims[j].weight
      }
      total = Math.round(sum * 10) / 10 // 保留 1 位小数
    }

    offers.push({
      id: r.id,
      company: r.company,
      position: r.position,
      note: r.note,
      source: r.source,
      isDemo: Boolean(r.isDemo),
      scores: scores,
      dims: dims,
      rated: rated,
      total: total,
      rank: 0,
    })
  }

  return offers
}

/**
 * 按总分降序排位；未打分（无总分）的排在最后，内部按 updatedAt 降序。
 * 返回带 rank 的新数组（rank 从 1 起，未打分不占名次）。
 * @param offers {Array} listOffers 输出
 */
function rankOffers(offers) {
  const sorted = offers.slice().sort(function (a, b) {
    if (a.total !== null && b.total !== null) return b.total - a.total
    if (a.total !== null) return -1
    if (b.total !== null) return 1
    return 0
  })
  let rank = 0
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].total !== null) {
      rank += 1
      sorted[i].rank = rank
    } else {
      sorted[i].rank = 0
    }
  }
  return sorted
}

/**
 * 保存某个 Offer 单个维度的打分。
 * @param appId {string} 投递记录 id
 * @param dimKey {string} 维度 key
 * @param score {number} 0-10
 */
function setScore(appId, dimKey, score) {
  const validDim = DIMENSIONS.some(function (d) {
    return d.key === dimKey
  })
  const v = clampScore(score)
  if (!validDim || v === null) return false

  const all = readScores()
  const cur = all[appId] && typeof all[appId] === 'object' ? all[appId] : {}
  cur[dimKey] = v
  all[appId] = cur
  writeScores(all)
  return true
}

module.exports = {
  OFFER_STATUS: OFFER_STATUS,
  DIMENSIONS: DIMENSIONS,
  SCORE_MIN: SCORE_MIN,
  SCORE_MAX: SCORE_MAX,
  clampScore: clampScore,
  listOffers: listOffers,
  rankOffers: rankOffers,
  setScore: setScore,
}
