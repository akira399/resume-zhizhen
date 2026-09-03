'use strict'

/**
 * 历史记录服务（本地优先版，v1.1 去 AI 化）。
 *
 * 与旧版（AI 版走 ai-proxy 云函数）的区别：记录全部存本地 storage，
 * 不上传云端——简历文本、自查结果、比对结果、练习记录默认不出手机。
 *
 * 业务类型（BIZ_LABEL）：
 *   checklist  简历自查（M1）
 *   keyword    岗位比对（M2）
 *   practice   面试练习（M3）
 *
 * 注意：本文件位于 miniprogram/ 下，**禁止使用 ?. / ?? / for await**。
 */

const store = require('./store')

/** 记录集合的存储键 */
const RECORDS_KEY = 'records'
/** 本地最多保留的记录条数（防止 storage 无限膨胀） */
const MAX_RECORDS = 200

const BIZ_LABEL = {
  checklist: '简历自查',
  keyword: '岗位比对',
  practice: '面试练习',
}

const STATUS_LABEL = {
  done: '已完成',
}

/** 列表页筛选 Tab。value 直接作为 biz 参数 */
const TABS = [
  { key: 'all', label: '全部' },
  { key: 'checklist', label: '简历自查' },
  { key: 'keyword', label: '岗位比对' },
  { key: 'practice', label: '面试练习' },
]

function pad2(n) {
  return n < 10 ? '0' + n : String(n)
}

/**
 * 时间文案：越近的记录越要省掉冗余信息。
 * "2026-08-31 14:20" 对昨天的记录是噪音，"今天 14:20" 才是有用的。
 * @param ms {number} 毫秒时间戳
 */
function formatTime(ms, nowMs) {
  const t = Number(ms) || 0
  if (!t) return ''

  const d = new Date(t)
  const now = new Date(nowMs === undefined ? Date.now() : nowMs)
  const hm = pad2(d.getHours()) + ':' + pad2(d.getMinutes())

  const sameDay = function (a, b) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    )
  }

  if (sameDay(d, now)) return '今天 ' + hm

  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  if (sameDay(d, yesterday)) return '昨天 ' + hm

  if (d.getFullYear() === now.getFullYear()) {
    return pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + ' ' + hm
  }
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
}

/** 生成本地唯一 id */
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

/** 读取全部记录（调用方拿到的是副本，避免误改 storage） */
function readAll() {
  const rows = store.get(RECORDS_KEY, [])
  return Array.isArray(rows) ? rows.slice() : []
}

function writeAll(rows) {
  store.set(RECORDS_KEY, rows)
}

/**
 * 保存一条记录。
 * @param input {{
 *   biz: string,         必填：checklist | keyword | practice
 *   summary?: string,    一句话摘要
 *   score?: number,      可选：总分（0-100）
 *   preview?: string,    列表预览文本
 *   result?: object,     业务结果对象（各模块自定义结构）
 *   meta?: object,       展示元信息（如岗位方向/难度等）
 * }}
 * @returns {object} 完整记录
 */
function saveRecord(input) {
  const src = input && typeof input === 'object' ? input : {}
  let createdAtMs = Date.now()

  // 保证 createdAtMs 严格递减：同一毫秒内连续保存时，新记录 +1。
  // 否则分页游标（createdAtMs < cursor）会漏掉时间戳相同的记录。
  const rows = readAll()
  if (rows.length && rows[0].createdAtMs >= createdAtMs) {
    createdAtMs = rows[0].createdAtMs + 1
  }

  const rec = {
    id: typeof src.id === 'string' && src.id ? src.id : genId(),
    biz: BIZ_LABEL[src.biz] ? src.biz : 'checklist',
    status: 'done',
    createdAtMs: createdAtMs,
    summary: String(src.summary || ''),
    score: typeof src.score === 'number' && isFinite(src.score) ? src.score : null,
    hasScore: typeof src.score === 'number' && isFinite(src.score),
    preview: String(src.preview || ''),
    result: src.result && typeof src.result === 'object' ? src.result : null,
    meta: src.meta && typeof src.meta === 'object' ? src.meta : null,
  }

  rows.unshift(rec)
  writeAll(rows.slice(0, MAX_RECORDS))
  return rec
}

/** 列表项 → 视图模型 */
function toItem(raw) {
  const src = raw && typeof raw === 'object' ? raw : {}
  return {
    id: src.id || '',
    biz: src.biz || '',
    bizLabel: BIZ_LABEL[src.biz] || '记录',
    status: src.status || 'done',
    statusLabel: STATUS_LABEL[src.status] || '已完成',
    clickable: true,
    score: typeof src.score === 'number' ? src.score : 0,
    hasScore: typeof src.score === 'number',
    preview: String(src.preview || ''),
    summary: String(src.summary || ''),
    timeText: formatTime(src.createdAtMs),
    createdAtMs: Number(src.createdAtMs) || 0,
  }
}

/**
 * 分页拉取历史（本地）。
 * @param opts {{ biz?: string, cursorMs?: number, limit?: number }}
 * @returns {{items:Array, hasMore:boolean, nextCursor:number|null}}
 */
function listRecords(opts) {
  const o = opts || {}
  const biz = o.biz || 'all'
  const cursorMs = Number(o.cursorMs) || 0
  const limit = Number(o.limit) > 0 ? Number(o.limit) : 20

  let rows = readAll()
  if (biz !== 'all') rows = rows.filter(function (r) { return r.biz === biz })
  if (cursorMs > 0) rows = rows.filter(function (r) { return r.createdAtMs < cursorMs })

  const page = rows.slice(0, limit)
  const items = page.map(toItem)
  const last = items[items.length - 1]
  // 仅在有更多数据时才给游标：没更多时 nextCursor=null，调用方据此停止翻页
  return {
    items: items,
    hasMore: rows.length > limit,
    nextCursor: rows.length > limit && last ? last.createdAtMs : null,
  }
}

/** 拉取单条完整记录。 */
function getRecord(id) {
  const rows = readAll()
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].id === id) return rows[i]
  }
  return null
}

/** 删除一条记录。返回是否真的删了。 */
function removeRecord(id) {
  const rows = readAll()
  const next = rows.filter(function (r) { return r.id !== id })
  if (next.length === rows.length) return false
  writeAll(next)
  return true
}

/** 清空某业务（或全部）记录。返回删除条数。 */
function clearRecords(biz) {
  const rows = readAll()
  const keep = biz ? rows.filter(function (r) { return r.biz !== biz }) : []
  writeAll(keep)
  return rows.length - keep.length
}

/** 原文区块折叠时展示的字数 */
const SOURCE_BRIEF_CHARS = 120

/** 详情页的原文区块（通用：meta 里可挂 sourceText 等） */
function buildSources(detail) {
  const out = []
  const meta = detail && detail.meta ? detail.meta : {}
  if (meta.sourceText) out.push(makeSource('输入内容', meta.sourceText))
  if (meta.secondaryText) out.push(makeSource('岗位 JD', meta.secondaryText))
  return out
}

function makeSource(label, text) {
  const full = String(text || '')
  return {
    label: label,
    text: full,
    brief: full.length > SOURCE_BRIEF_CHARS ? full.slice(0, SOURCE_BRIEF_CHARS) + '…' : full,
    total: full.length,
    open: false,
  }
}

/** 拼接详情页复制文本 */
function buildCopyText(d) {
  const src = d && typeof d === 'object' ? d : {}
  const lines = ['【' + (src.bizLabel || '记录') + '】' + (src.timeText || '')]

  if (src.summary) {
    lines.push('')
    lines.push('【总结】' + src.summary)
  }
  if (src.hasScore) lines.push('【评分】' + src.score + ' / 100')

  const result = src.result && typeof src.result === 'object' ? src.result : {}
  if (result.notes && result.notes.length) {
    lines.push('')
    lines.push('【要点】')
    for (let i = 0; i < result.notes.length; i++) {
      lines.push(i + 1 + '. ' + result.notes[i])
    }
  }
  return lines.join('\n')
}

module.exports = {
  BIZ_LABEL: BIZ_LABEL,
  STATUS_LABEL: STATUS_LABEL,
  TABS: TABS,
  RECORDS_KEY: RECORDS_KEY,
  MAX_RECORDS: MAX_RECORDS,
  SOURCE_BRIEF_CHARS: SOURCE_BRIEF_CHARS,
  formatTime: formatTime,
  genId: genId,
  toItem: toItem,
  saveRecord: saveRecord,
  listRecords: listRecords,
  getRecord: getRecord,
  removeRecord: removeRecord,
  clearRecords: clearRecords,
  buildSources: buildSources,
  makeSource: makeSource,
  buildCopyText: buildCopyText,
}
