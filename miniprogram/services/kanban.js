'use strict'

/**
 * 求职看板（M4，v1.1 去 AI 化改造）的数据层。
 *
 * ## 数据存储：本地优先
 *
 * 旧版走云数据库直读写；新版按 Local-first 原则改为**本地 storage**
 * （services/store.js）——投递记录默认不出手机，0 云调用、0 网络依赖。
 * 接口保持 Promise 形态，调用方无需区分本地/云端。
 *
 * ## 定位：记录工具，不是数据分析
 *
 * 简历版本管理刻意做成「从记录里提取的版本名集合」而不是独立的版本库；
 * M4 新增：标签（tags）、归档（archived）、搜索（公司/岗位关键词）。
 *
 * 注意：本文件位于 miniprogram/ 下，**禁止使用 ?. / ?? / for await**。
 */

const store = require('./store')

/** 本地存储键（沿用语义名） */
const COLLECTION = 'applications'

/** 投递状态：与 docs/03 §1.5 一致，顺序即看板列顺序 */
const STATUSES = [
  { key: 'applied', label: '投递中' },
  { key: 'written', label: '笔试' },
  { key: 'interviewing', label: '面试中' },
  { key: 'offer', label: 'Offer' },
  { key: 'rejected', label: '挂了' },
]

/** 日程类型 */
const EVENT_TYPES = [
  { key: 'interview', label: '面试' },
  { key: 'written', label: '笔试' },
]

/** 来源渠道：预设 + 允许自定义 */
const SOURCES = ['内推', '官网', '招聘平台', '其他']

/** 日程区展示未来多少天内的日程 */
const EVENT_WINDOW_DAYS = 14

/** 单次拉取上限：记录工具的个人数据量远够用 */
const PAGE_LIMIT = 100

function findLabel(list, key) {
  for (let i = 0; i < list.length; i++) {
    if (list[i].key === key) return list[i].label
  }
  return ''
}

function statusLabel(key) {
  return findLabel(STATUSES, key) || '未知'
}

// ---------------------------------------------------------------- 数据访问（本地）

function readAll() {
  const rows = store.get(COLLECTION, [])
  return Array.isArray(rows) ? rows : []
}

function writeAll(rows) {
  store.set(COLLECTION, rows)
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

/** 标签归一：接受字符串（逗号分隔）或数组，去空、去重 */
function normalizeTags(input) {
  const src = Array.isArray(input) ? input : String(input || '').split(/[,，]/)
  const seen = {}
  const out = []
  for (let i = 0; i < src.length; i++) {
    const t = String(src[i] || '').trim().slice(0, 12)
    if (!t || seen[t]) continue
    seen[t] = true
    out.push(t)
  }
  return out
}

/** 拉取全部投递记录（updatedAt 降序） */
function listApplications() {
  const rows = readAll()
  rows.sort(function (a, b) {
    return (b.updatedAt || 0) - (a.updatedAt || 0)
  })
  return Promise.resolve(rows)
}

/** 按 id 取单条（编辑页用） */
function getApplication(id) {
  const rows = readAll()
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].id === id) return Promise.resolve(rows[i])
  }
  return Promise.resolve(null)
}

/** 新增。id 本地生成，createdAt/updatedAt 统一维护 */
function addApplication(data) {
  const now = Date.now()
  const row = Object.assign({}, data, {
    id: genId(),
    tags: normalizeTags(data && data.tags),
    archived: Boolean(data && data.archived),
    createdAt: now,
    updatedAt: now,
  })
  const rows = readAll()
  rows.unshift(row)
  writeAll(rows)
  return Promise.resolve(row.id)
}

/** 局部更新。updatedAt 由这里统一维护，调用方不用管 */
function updateApplication(id, patch) {
  const rows = readAll()
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].id !== id) continue
    const next = Object.assign({}, rows[i], patch, { updatedAt: Date.now() })
    if (patch && patch.tags !== undefined) next.tags = normalizeTags(patch.tags)
    rows[i] = next
    writeAll(rows)
    return Promise.resolve(true)
  }
  return Promise.resolve(false)
}

function removeApplication(id) {
  const rows = readAll()
  const next = rows.filter(function (r) { return r.id !== id })
  if (next.length === rows.length) return Promise.resolve(false)
  writeAll(next)
  return Promise.resolve(true)
}

/** 归档 / 取消归档。返回新的归档态 */
function toggleArchive(id) {
  const rows = readAll()
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].id !== id) continue
    const next = Object.assign({}, rows[i], {
      archived: !Boolean(rows[i].archived),
      updatedAt: Date.now(),
    })
    rows[i] = next
    writeAll(rows)
    return Promise.resolve(next.archived)
  }
  return Promise.resolve(false)
}

/**
 * 按 搜索词 + 归档态 过滤记录（页面筛选用）。
 * 搜索词匹配公司名 / 岗位名（小写、包含即可）。
 */
function filterApplications(rows, opts) {
  const o = opts || {}
  const keyword = String(o.keyword || '').trim().toLowerCase()
  const archivedOnly = Boolean(o.archivedOnly)
  const list = Array.isArray(rows) ? rows : []
  return list.filter(function (r) {
    if (Boolean(r.archived) !== archivedOnly) return false
    if (!keyword) return true
    const c = String(r.company || '').toLowerCase()
    const p = String(r.position || '').toLowerCase()
    return c.indexOf(keyword) !== -1 || p.indexOf(keyword) !== -1
  })
}

// ---------------------------------------------------------------- 校验与归一化

const COMPANY_MAX = 40
const POSITION_MAX = 40
const NOTE_MAX = 200

/**
 * 编辑页表单校验。公司必填，岗位必填——两者缺一的记录没有检索价值。
 * @param form {{ company:string, position:string, status:string, source:string,
 *                resumeVersion:string, note:string, eventEnabled:boolean,
 *                eventType:string, eventDate:string, eventTime:string }}
 * @returns {{ ok:boolean, reason?:string, value?:object }}
 */
function validateApplication(form) {
  const src = form && typeof form === 'object' ? form : {}
  const company = String(src.company || '').trim()
  const position = String(src.position || '').trim()

  if (!company) return { ok: false, reason: '请填写公司名称' }
  if (company.length > COMPANY_MAX) return { ok: false, reason: '公司名称过长（上限 ' + COMPANY_MAX + ' 字）' }
  if (!position) return { ok: false, reason: '请填写岗位名称' }
  if (position.length > POSITION_MAX) return { ok: false, reason: '岗位名称过长（上限 ' + POSITION_MAX + ' 字）' }

  const statusOk = STATUSES.some(function (s) {
    return s.key === src.status
  })
  if (!statusOk) return { ok: false, reason: '请选择投递状态' }

  const value = {
    company: company,
    position: position,
    status: src.status,
    source: String(src.source || '').trim().slice(0, 20),
    resumeVersion: String(src.resumeVersion || '').trim().slice(0, 30),
    note: String(src.note || '').trim().slice(0, NOTE_MAX),
    tags: normalizeTags(src.tags),
    nextEvent: null,
  }

  if (src.eventEnabled) {
    const event = normalizeEvent(src.eventType, src.eventDate, src.eventTime)
    if (!event.ok) return event
    value.nextEvent = event.value
  }

  return { ok: true, value: value }
}

/**
 * 归一化日程：date 必填（YYYY-MM-DD），time 可空（默认 10:00）。
 * 同时算出 atMs 供排序——字符串比较日期可行，但混入 time 后容易错，数值最稳。
 */
function normalizeEvent(type, date, time) {
  const t = findLabel(EVENT_TYPES, type) ? type : 'interview'
  const d = String(date || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return { ok: false, reason: '请选择日程日期' }

  const tm = /^\d{2}:\d{2}$/.test(String(time || '')) ? time : '10:00'
  const atMs = new Date(d + 'T' + tm + ':00').getTime()
  if (!isFinite(atMs)) return { ok: false, reason: '日程日期无效' }

  return { ok: true, value: { type: t, date: d, time: tm, atMs: atMs } }
}

// ---------------------------------------------------------------- 视图模型

/**
 * 按状态分组。组内排序规则：
 *   有日程的在前（按日程时间升序——最近的在最上），无日程的按 updatedAt 降序。
 * 「下一件事是什么」是看板第一问，日程必须浮上来。
 *
 * @param rows {Array} 数据库原始记录
 * @returns {Array<{ key:string, label:string, items:Array }>} 与 STATUSES 同序，空组也返回
 */
function groupByStatus(rows) {
  const list = Array.isArray(rows) ? rows : []
  const groups = STATUSES.map(function (s) {
    return { key: s.key, label: s.label, items: [] }
  })
  const indexOf = {}
  groups.forEach(function (g, i) {
    indexOf[g.key] = i
  })

  for (let i = 0; i < list.length; i++) {
    const row = list[i]
    const gi = indexOf[row && row.status]
    if (gi === undefined) continue // 未知状态不渲染，等枚举扩展
    groups[gi].items.push(row)
  }

  groups.forEach(function (g) {
    g.items.sort(function (a, b) {
      const ea = a && a.nextEvent ? a.nextEvent.atMs : 0
      const eb = b && b.nextEvent ? b.nextEvent.atMs : 0
      if (ea && eb) return ea - eb
      if (ea) return -1
      if (eb) return 1
      return (b.updatedAt || 0) - (a.updatedAt || 0)
    })
  })

  return groups
}

/**
 * 日程区：未来 EVENT_WINDOW_DAYS 天内（含今天）的日程，按时间升序。
 * 过去的日程不进日程区（它已经体现在记录的状态里了）。
 */
function upcomingEvents(rows, nowMs) {
  const now = nowMs || Date.now()
  const end = now + EVENT_WINDOW_DAYS * 24 * 60 * 60 * 1000

  const out = []
  const list = Array.isArray(rows) ? rows : []
  for (let i = 0; i < list.length; i++) {
    const ev = list[i] && list[i].nextEvent
    if (!ev || !ev.atMs) continue
    // 当天日程（哪怕时间已过）仍然展示——用户需要「今天有个面试」的提醒感
    const dayEnd = new Date(ev.date + 'T23:59:59').getTime()
    if (dayEnd < now || ev.atMs > end) continue
    out.push({
      id: list[i].id || list[i]._id,
      company: list[i].company,
      position: list[i].position,
      type: ev.type,
      typeLabel: findLabel(EVENT_TYPES, ev.type) || '日程',
      date: ev.date,
      time: ev.time,
      atMs: ev.atMs,
      isToday: new Date(ev.date + 'T00:00:00').getTime() === new Date(now).setHours(0, 0, 0, 0),
      // 已订阅提醒（F8）：发送后云端会清掉标记，铃铛随之消失，状态与库一致
      remindOn: Boolean(list[i].remindSubscribed),
    })
  }

  out.sort(function (a, b) {
    return a.atMs - b.atMs
  })
  return out
}

/** 看板顶部统计：总数 + 各状态计数 */
function boardSummary(groups) {
  let total = 0
  const counts = {}
  const list = Array.isArray(groups) ? groups : []
  for (let i = 0; i < list.length; i++) {
    const n = list[i].items.length
    counts[list[i].key] = n
    total += n
  }
  return { total: total, counts: counts }
}

/**
 * 投递漏斗（F10）：投递 → 笔试 → 面试 → Offer 的转化比例。
 *
 * rejected 无法归位到具体挂掉的阶段（记录只有单一状态字段），
 * 因此各阶段按「当前处于或已通过该阶段」累计——语义是
 * 「每投 100 家，多少家给了笔试/面试/Offer」，与主流求职工具口径一致。
 *
 * @param groups {Array} groupByStatus 的输出
 * @returns {Array<{key:string, label:string, count:number, pct:number, barPct:number}>}
 */
function buildFunnel(groups) {
  const counts = {}
  let total = 0
  const list = Array.isArray(groups) ? groups : []
  for (let i = 0; i < list.length; i++) {
    const n = list[i].items.length
    counts[list[i].key] = n
    total += n
  }

  const writtenPlus = (counts.written || 0) + (counts.interviewing || 0) + (counts.offer || 0)
  const interviewPlus = (counts.interviewing || 0) + (counts.offer || 0)
  const stages = [
    { key: 'applied', label: '投递', count: total },
    { key: 'written', label: '笔试', count: writtenPlus },
    { key: 'interviewing', label: '面试', count: interviewPlus },
    { key: 'offer', label: 'Offer', count: counts.offer || 0 },
  ]

  return stages.map(function (s) {
    const pct = total > 0 ? Math.round((s.count / total) * 100) : 0
    // barPct 最小 2%：count 为 0 时也留一条可见的底线，视觉上才是「漏斗」
    return { key: s.key, label: s.label, count: s.count, pct: pct, barPct: Math.max(pct, 2) }
  })
}

/** 从记录里提取去重后的简历版本名（编辑页的候选列表） */
function collectResumeVersions(rows) {
  const seen = {}
  const out = []
  const list = Array.isArray(rows) ? rows : []
  for (let i = 0; i < list.length; i++) {
    const v = String((list[i] && list[i].resumeVersion) || '').trim()
    if (!v || seen[v]) continue
    seen[v] = true
    out.push(v)
  }
  return out
}

// ---------------------------------------------------------------- 演示数据（P1-7）

/**
 * 生成演示投递记录（纯函数，不碰数据库，可单测）。
 *
 * 覆盖全部 5 个状态 + 2 条未来日程，让评审一眼看到看板的完整形态：
 * 分组、统计、日程置顶提醒。日程日期相对 now 计算（+1/+2 天），
 * 保证任何时间填充都落在「未来 14 天」日程窗口内。
 *
 * 所有记录带 isDemo: true 标记——清除时只删带标记的，绝不碰真实记录。
 *
 * @param nowMs {number} 当前时间（测试可注入固定值）
 * @returns {Array} 可直接入库的记录列表（不含 createdAt/updatedAt）
 */
function buildDemoApplications(nowMs) {
  const now = nowMs || Date.now()
  const DAY = 24 * 60 * 60 * 1000

  function dateAfter(days) {
    const d = new Date(now + days * DAY)
    const m = d.getMonth() + 1
    const day = d.getDate()
    return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day)
  }

  function event(type, days, time) {
    const date = dateAfter(days)
    return {
      type: type,
      date: date,
      time: time,
      atMs: new Date(date + 'T' + time + ':00').getTime(),
    }
  }

  return [
    {
      company: '字节跳动', position: '后端开发工程师', status: 'applied',
      source: '内推', resumeVersion: 'V3-量化版', note: '', nextEvent: null, isDemo: true,
    },
    {
      company: '腾讯', position: '客户端开发工程师', status: 'applied',
      source: '官网', resumeVersion: 'V2-精简版', note: '', nextEvent: null, isDemo: true,
    },
    {
      company: '小红书', position: '服务端开发', status: 'applied',
      source: '招聘平台', resumeVersion: 'V3-量化版', note: '', nextEvent: null, isDemo: true,
    },
    {
      company: '美团', position: '后端开发工程师', status: 'written',
      source: '招聘平台', resumeVersion: 'V3-量化版', note: '',
      nextEvent: event('written', 2, '14:00'), isDemo: true,
    },
    {
      company: '阿里巴巴', position: 'Java 开发工程师', status: 'interviewing',
      source: '内推', resumeVersion: 'V3-量化版', note: '一面已过，重点准备项目深挖',
      nextEvent: event('interview', 1, '10:00'), isDemo: true,
    },
    {
      company: '网易', position: '游戏服务端开发', status: 'interviewing',
      source: '招聘平台', resumeVersion: 'V1-通用版', note: '', nextEvent: null, isDemo: true,
    },
    {
      company: '拼多多', position: '服务端开发工程师', status: 'offer',
      source: '内推', resumeVersion: 'V3-量化版', note: '已谈薪，本周内答复', nextEvent: null, isDemo: true,
    },
    {
      company: '快手', position: '数据开发工程师', status: 'rejected',
      source: '官网', resumeVersion: 'V1-通用版', note: '简历没突出数据规模，已按建议改出 V3', nextEvent: null, isDemo: true,
    },
    {
      company: '百度', position: 'NLP 应用研发', status: 'rejected',
      source: '招聘平台', resumeVersion: 'V2-精简版', note: '', nextEvent: null, isDemo: true,
    },
  ]
}

/**
 * 一键填充演示数据（本地版）。
 * 0 云调用、0 网络依赖。重复点击会重复插入——由调用方用 demoBusy 防抖。
 * @returns {Promise<number>} 写入条数
 */
function seedDemoApplications() {
  const rows = buildDemoApplications(Date.now()).map(function (row) {
    return Object.assign({}, row, {
      id: genId(),
      tags: [],
      archived: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  })
  const all = readAll()
  writeAll(all.concat(rows))
  return Promise.resolve(rows.length)
}

/**
 * 清除全部演示数据（只删 isDemo: true 的记录）。
 * @returns {Promise<number>} 删除条数
 */
function clearDemoApplications() {
  const rows = readAll()
  const keep = rows.filter(function (r) { return !r.isDemo })
  writeAll(keep)
  return Promise.resolve(rows.length - keep.length)
}

module.exports = {
  COLLECTION: COLLECTION,
  STATUSES: STATUSES,
  EVENT_TYPES: EVENT_TYPES,
  SOURCES: SOURCES,
  EVENT_WINDOW_DAYS: EVENT_WINDOW_DAYS,
  statusLabel: statusLabel,
  findLabel: findLabel,
  normalizeTags: normalizeTags,
  listApplications: listApplications,
  getApplication: getApplication,
  addApplication: addApplication,
  updateApplication: updateApplication,
  removeApplication: removeApplication,
  toggleArchive: toggleArchive,
  filterApplications: filterApplications,
  validateApplication: validateApplication,
  normalizeEvent: normalizeEvent,
  groupByStatus: groupByStatus,
  upcomingEvents: upcomingEvents,
  boardSummary: boardSummary,
  buildFunnel: buildFunnel,
  collectResumeVersions: collectResumeVersions,
  buildDemoApplications: buildDemoApplications,
  seedDemoApplications: seedDemoApplications,
  clearDemoApplications: clearDemoApplications,
}
