'use strict'

/**
 * 待办清单（M10 补充）。
 *
 * 「下一步行动」独立于投递记录：如"3 天内跟进 HR""补投 5 家""准备二面复盘"。
 * 字段：text（必填）、dueDate（可选截止日 YYYY-MM-DD）、priority（1 高 / 2 中 / 3 低）、
 * done、createdAt、doneAt。
 *
 * 排序规则（未完成在前）：
 *   1) 有截止日的按截止日升序（最紧急的在最上）
 *   2) 无截止日的按优先级（高→中→低）
 *   3) 再按创建时间降序
 *   已完成统一按 doneAt 降序沉底。
 *
 * 注意：本文件位于 miniprogram/ 下，**禁止使用 ?. / ?? / for await**。
 */

const store = require('./store')

const COLLECTION = 'todos'

const PRIORITY_LABEL = { 1: '高', 2: '中', 3: '低' }
const PRIORITIES = [1, 2, 3]

const TEXT_MAX = 50

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

/** 校验新增/编辑表单。 */
function validateTodo(form) {
  const src = form && typeof form === 'object' ? form : {}
  const text = String(src.text || '').trim()
  if (!text) return { ok: false, reason: '请填写待办内容' }
  if (text.length > TEXT_MAX) return { ok: false, reason: '待办内容过长（上限 ' + TEXT_MAX + ' 字）' }

  const priority = PRIORITIES.indexOf(Number(src.priority)) !== -1 ? Number(src.priority) : 2

  let dueDate = ''
  const d = String(src.dueDate || '').trim()
  if (d) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return { ok: false, reason: '截止日期格式不对' }
    const t = new Date(d + 'T00:00:00').getTime()
    if (!isFinite(t)) return { ok: false, reason: '截止日期无效' }
    dueDate = d
  }

  return { ok: true, value: { text: text, dueDate: dueDate, priority: priority } }
}

/** 新增待办。 */
function addTodo(data) {
  const checked = validateTodo(data)
  if (!checked.ok) return checked
  const row = Object.assign({}, checked.value, {
    id: genId(),
    done: false,
    doneAt: 0,
    createdAt: Date.now(),
  })
  const rows = readAll()
  rows.unshift(row)
  writeAll(rows)
  return { ok: true, id: row.id }
}

/**
 * 排序视图。nowMs 用于算"已过期"。
 * @returns {Array<{id,text,dueDate,dueText,priority,priorityLabel,done,createdAt,overdue}>}
 */
function listTodos(nowMs) {
  const now = nowMs || Date.now()
  const rows = readAll()
  const items = rows.map(function (r) {
    let overdue = false
    if (!r.done && r.dueDate) {
      overdue = new Date(r.dueDate + 'T23:59:59').getTime() < now
    }
    return {
      id: r.id,
      text: r.text,
      dueDate: r.dueDate || '',
      dueText: r.dueDate || '',
      priority: r.priority,
      priorityLabel: PRIORITY_LABEL[r.priority] || '中',
      done: Boolean(r.done),
      doneAt: Number(r.doneAt) || 0,
      createdAt: Number(r.createdAt) || 0,
      overdue: overdue,
    }
  })

  items.sort(function (a, b) {
    if (a.done !== b.done) return a.done ? 1 : -1
    if (!a.done) {
      const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity
      const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity
      if (ad !== bd) return ad - bd
      if (a.priority !== b.priority) return a.priority - b.priority
    }
    return b.createdAt - a.createdAt
  })
  return items
}

/** 完成 / 取消完成。返回新的 done 状态。 */
function toggleTodo(id) {
  const rows = readAll()
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].id !== id) continue
    const next = !Boolean(rows[i].done)
    rows[i] = Object.assign({}, rows[i], { done: next, doneAt: next ? Date.now() : 0 })
    writeAll(rows)
    return next
  }
  return null
}

/** 删除单条。 */
function removeTodo(id) {
  const rows = readAll()
  const next = rows.filter(function (r) { return r.id !== id })
  if (next.length === rows.length) return false
  writeAll(next)
  return true
}

/** 清空已完成。返回删除条数。 */
function clearDone() {
  const rows = readAll()
  const next = rows.filter(function (r) { return !r.done })
  writeAll(next)
  return rows.length - next.length
}

/**
 * 聚合统计（未完成数 / 已过期数 / 完成率）。
 * @param items {Array} listTodos 输出
 */
function buildTodoStats(items) {
  const list = Array.isArray(items) ? items : []
  let pending = 0
  let overdue = 0
  let done = 0
  for (let i = 0; i < list.length; i++) {
    if (list[i].done) done += 1
    else {
      pending += 1
      if (list[i].overdue) overdue += 1
    }
  }
  const total = done + pending
  return {
    total: total,
    pending: pending,
    overdue: overdue,
    done: done,
    doneRate: total > 0 ? Math.round((done / total) * 100) : 0,
  }
}

module.exports = {
  COLLECTION: COLLECTION,
  PRIORITY_LABEL: PRIORITY_LABEL,
  PRIORITIES: PRIORITIES,
  TEXT_MAX: TEXT_MAX,
  validateTodo: validateTodo,
  addTodo: addTodo,
  listTodos: listTodos,
  toggleTodo: toggleTodo,
  removeTodo: removeTodo,
  clearDone: clearDone,
  buildTodoStats: buildTodoStats,
}
