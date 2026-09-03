'use strict'

/**
 * 投递时间线（M10）。
 *
 * 把投递记录按 周 / 月 粒度聚合成节奏时间线，每个周期给出：
 * 投递总量、各状态计数、转化摘要（面试 / Offer）、相对每周目标的完成度。
 *
 * 目标存本地（键 timeline_goal，形如 { weeklyTarget, updatedAt }）。
 * 完成度 = 该周期投递总数 / 每周目标，超 100% 记达标。
 *
 * 注意：本文件位于 miniprogram/ 下，**禁止使用 ?. / ?? / for await**。
 */

const store = require('./store')

const GOAL_KEY = 'timeline_goal'

/** 时间线最多展示多少个周期 */
const MAX_PERIODS = 12

const MS_DAY = 24 * 60 * 60 * 1000

/**
 * 时间戳所属周的周一 0 点（毫秒）。周一起始：周日归到上一周。
 * @param ms {number}
 * @returns {number}
 */
function weekStart(ms) {
  const d = new Date(ms)
  const day = (d.getDay() + 6) % 7 // getDay(): 0=周日 → 转为 0=周一
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day)
  m.setHours(0, 0, 0, 0)
  return m.getTime()
}

function pad2(n) {
  return n < 10 ? '0' + n : '' + n
}

function monthLabel(ms) {
  const d = new Date(ms)
  return d.getFullYear() + '-' + (d.getMonth() + 1 < 10 ? '0' + (d.getMonth() + 1) : d.getMonth() + 1)
}

/**
 * 按周期聚合投递记录。
 * @param rows {Array} 投递原始记录
 * @param opts {{ gran?:'week'|'month', nowMs?:number, max?:number }}
 * @returns {Array<{
 *   key:string, label:string, range:string,
 *   total:number, applied:number, written:number, interviewing:number,
 *   offer:number, rejected:number, interview:number,
 *   startMs:number, pct:number|null
 * }>} 时间正序（最早在前）
 */
function buildTimeline(rows, opts) {
  const o = opts || {}
  const gran = o.gran === 'month' ? 'month' : 'week'
  const now = o.nowMs || Date.now()
  const max = Number(o.max) > 0 ? Number(o.max) : MAX_PERIODS
  const list = Array.isArray(rows) ? rows : []

  const buckets = {}
  let minStart = Infinity

  for (let i = 0; i < list.length; i++) {
    const r = list[i]
    if (!r || !r.createdAt) continue
    const key = gran === 'month'
      ? monthLabel(r.createdAt)
      : String(weekStart(r.createdAt))
    if (!buckets[key]) {
      buckets[key] = {
        startMs: gran === 'month' ? new Date(r.createdAt).getTime() : weekStart(r.createdAt),
        applied: 0, written: 0, interviewing: 0, offer: 0, rejected: 0,
      }
    }
    if (buckets[key].startMs < minStart) minStart = buckets[key].startMs

    const b = buckets[key]
    const status = r.status
    if (status === 'applied') b.applied += 1
    else if (status === 'written') b.written += 1
    else if (status === 'interviewing') b.interviewing += 1
    else if (status === 'offer') b.offer += 1
    else if (status === 'rejected') b.rejected += 1
  }

  const keys = Object.keys(buckets)
  keys.sort(function (a, b) {
    return buckets[a].startMs - buckets[b].startMs
  })

  // 只取最近的 max 个周期
  const recent = keys.slice(-max)

  return recent.map(function (k) {
    const b = buckets[k]
    const start = new Date(b.startMs)
    let label = ''
    let range = ''
    if (gran === 'month') {
      label = (start.getMonth() + 1) + '月'
      range = start.getFullYear() + '-' + pad2(start.getMonth() + 1)
    } else {
      label = (start.getMonth() + 1) + '/' + start.getDate()
      const end = new Date(b.startMs + 6 * MS_DAY)
      range = (start.getMonth() + 1) + '/' + start.getDate() + ' - ' + (end.getMonth() + 1) + '/' + end.getDate()
    }
    const total = b.applied + b.written + b.interviewing + b.offer + b.rejected
    return {
      key: k,
      label: label,
      range: range,
      startMs: b.startMs,
      total: total,
      applied: b.applied,
      written: b.written,
      interviewing: b.interviewing,
      offer: b.offer,
      rejected: b.rejected,
      interview: b.interviewing + b.offer,
      pct: null,
    }
  })
}

// ---------------------------------------------------------------- 目标

/** 读取每周投递目标（未设置返回 null） */
function getGoal() {
  const v = store.get(GOAL_KEY, null)
  return v && typeof v === 'object' && Number(v.weeklyTarget) > 0
    ? { weeklyTarget: Number(v.weeklyTarget), updatedAt: v.updatedAt }
    : null
}

/** 设置每周投递目标（1-100）。返回新目标对象 */
function setGoal(n) {
  const v = Math.max(1, Math.min(100, Math.round(Number(n))))
  if (!isFinite(v) || v < 1) return null
  const goal = { weeklyTarget: v, updatedAt: Date.now() }
  store.set(GOAL_KEY, goal)
  return goal
}

/**
 * 给时间线各周期填完成度（相对每周目标）。
 * @param timeline {Array} buildTimeline('week') 输出
 * @param goal {object|null} getGoal() 输出
 * @returns {{ items:Array, hitWeeks:number, avgPct:number|null }}
 */
function goalCompletion(timeline, goal) {
  const target = goal && goal.weeklyTarget > 0 ? goal.weeklyTarget : null
  let hit = 0
  let sumPct = 0
  let rated = 0
  const items = (Array.isArray(timeline) ? timeline : []).map(function (t) {
    if (!target) return Object.assign({}, t, { pct: null })
    const pct = Math.min(Math.round((t.total / target) * 100), 999)
    if (pct >= 100) hit += 1
    sumPct += pct
    rated += 1
    return Object.assign({}, t, { pct: pct })
  })
  return {
    items: items,
    hitWeeks: hit,
    avgPct: rated > 0 ? Math.round(sumPct / rated) : null,
  }
}

module.exports = {
  GOAL_KEY: GOAL_KEY,
  MAX_PERIODS: MAX_PERIODS,
  weekStart: weekStart,
  buildTimeline: buildTimeline,
  getGoal: getGoal,
  setGoal: setGoal,
  goalCompletion: goalCompletion,
}
