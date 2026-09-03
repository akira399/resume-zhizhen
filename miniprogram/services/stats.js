'use strict'

/**
 * 求职数据统计（M6）。
 *
 * 纯函数：输入看板记录数组，输出统计指标。本地计算，无网络依赖。
 *
 * 指标：
 *   statusCounts  各状态数量与占比
 *   channels      渠道效果（投递数 / Offer 数 / 转化率）
 *   weekly        近 8 周投递趋势（柱状图数据）
 *   funnel        投递漏斗（复用 kanban.buildFunnel）
 *   conversion    Offer 转化率
 *
 * 注意：本文件位于 miniprogram/ 下，**禁止使用 ?. / ?? / for await**。
 */

const { STATUSES, groupByStatus, buildFunnel } = require('./kanban')

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

/** 某毫秒时间戳所在周的起始（周一 00:00） */
function startOfWeek(t) {
  const d = new Date(t)
  const day = (d.getDay() + 6) % 7 // 周一 = 0
  d.setHours(0, 0, 0, 0)
  return new Date(d.getTime() - day * 24 * 60 * 60 * 1000)
}

function pad2(n) {
  return n < 10 ? '0' + n : String(n)
}

/** 周标签：MM/DD（该周周一日期） */
function weekLabel(startMs) {
  const d = new Date(startMs)
  return pad2(d.getMonth() + 1) + '/' + pad2(d.getDate())
}

/** 近 8 周投递趋势：返回 [{label, start, count}]，最新一周在最后 */
function weeklyTrend(rows, nowMs) {
  const now = nowMs || Date.now()
  const thisWeekStart = startOfWeek(now).getTime()

  const buckets = []
  for (let i = 7; i >= 0; i--) {
    const start = thisWeekStart - i * WEEK_MS
    buckets.push({ label: weekLabel(start), start: start, count: 0 })
  }

  const list = Array.isArray(rows) ? rows : []
  for (let i = 0; i < list.length; i++) {
    const t = Number(list[i].createdAt) || 0
    if (!t) continue
    for (let j = 0; j < buckets.length; j++) {
      const b = buckets[j]
      if (t >= b.start && t < b.start + WEEK_MS) {
        b.count++
        break
      }
    }
  }

  return buckets.map(function (b) {
    return { label: b.label, count: b.count }
  })
}

/** 渠道效果：按 source 分组，统计投递数与 Offer 数 */
function channelStats(rows) {
  const map = {}
  const list = Array.isArray(rows) ? rows : []

  for (let i = 0; i < list.length; i++) {
    const r = list[i]
    const source = String(r.source || '其他').trim() || '其他'
    if (!map[source]) map[source] = { source: source, total: 0, offer: 0 }
    map[source].total++
    if (r.status === 'offer') map[source].offer++
  }

  const out = Object.keys(map).map(function (k) {
    const m = map[k]
    return {
      source: m.source,
      total: m.total,
      offer: m.offer,
      rate: m.total > 0 ? Math.round((m.offer / m.total) * 100) : 0,
    }
  })

  // 按投递数降序，更有信息量
  out.sort(function (a, b) {
    return b.total - a.total
  })
  return out
}

/**
 * 汇总统计。
 * @param rows {Array} 看板记录
 * @param opts {{ nowMs?: number }}
 * @returns {{
 *   total: number,
 *   offerCount: number,
 *   statusCounts: Array<{key,label,count,pct}>,
 *   channels: Array<{source,total,offer,rate}>,
 *   weekly: Array<{label,count}>,
 *   funnel: Array,
 *   conversion: number,    Offer 转化率（0-100）
 * }}
 */
function buildStats(rows, opts) {
  const o = opts || {}
  const nowMs = o.nowMs || Date.now()
  const list = Array.isArray(rows) ? rows : []

  // 状态占比
  const counts = {}
  for (let i = 0; i < STATUSES.length; i++) counts[STATUSES[i].key] = 0
  for (let i = 0; i < list.length; i++) {
    const k = list[i].status
    if (counts[k] !== undefined) counts[k]++
  }
  const total = list.length
  const statusCounts = STATUSES.map(function (s) {
    return {
      key: s.key,
      label: s.label,
      count: counts[s.key],
      pct: total > 0 ? Math.round((counts[s.key] / total) * 100) : 0,
    }
  })

  const offerCount = counts.offer || 0
  const conversion = total > 0 ? Math.round((offerCount / total) * 100) : 0

  return {
    total: total,
    offerCount: offerCount,
    statusCounts: statusCounts,
    channels: channelStats(list),
    weekly: weeklyTrend(list, nowMs),
    funnel: buildFunnel(groupByStatus(list)),
    conversion: conversion,
  }
}

module.exports = {
  WEEK_MS: WEEK_MS,
  startOfWeek: startOfWeek,
  weekLabel: weekLabel,
  weeklyTrend: weeklyTrend,
  channelStats: channelStats,
  buildStats: buildStats,
}
