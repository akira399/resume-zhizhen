'use strict'

/**
 * 额度的纯逻辑（不碰数据库，可单测）。
 *
 * 模型：**预授权 + 结算**（docs/10 A3）
 *   - preflight 只增加 quotaReserved（占位，不扣额度）
 *   - 任务进入终态时结算：done → quotaUsedToday +1；failed/blocked/aborted → 不计数
 *   - 两者都要把 quotaReserved -1
 * 这样网络抖动、模型超时、用户中途退出都不会白白消耗用户额度；
 * 防刷改由独立的频率限制承担（RATE_LIMIT），而不是「失败罚没」。
 *
 * 时间一律由调用方注入，保证函数纯净可测。
 */

const { ERR, RATE_LIMIT } = require('./constants')

/** 每日额度默认值（config 集合缺项时的兜底） */
const DAILY_LIMIT_DEFAULT = 5

/**
 * 计算用户文档在当前日期键下应有的规范化值。
 * @param existing {object|null} 数据库中的用户文档
 * @param todayKey {string} 上海时区日期键
 * @param defaults {{ dailyLimit?: number }}
 * @returns {{ dailyLimit:number, quotaDate:string, quotaUsedToday:number,
 *             quotaReserved:number, preflightWindowStart:number, preflightWindowCount:number,
 *             isNew:boolean, rolledOver:boolean }}
 */
function normalizeUserDoc(existing, todayKey, defaults) {
  const opts = defaults || {}
  const dailyLimit = Number(opts.dailyLimit) || Number(existing && existing.dailyLimit) || DAILY_LIMIT_DEFAULT
  const isNew = !existing
  const rolledOver = !isNew && existing.quotaDate !== todayKey

  // 跨天时已用与预授权一并清零：昨日的在途任务必然已超时，不应占用今天的额度
  const fresh = isNew || rolledOver

  return {
    dailyLimit,
    quotaDate: todayKey,
    quotaUsedToday: fresh ? 0 : Number(existing.quotaUsedToday) || 0,
    quotaReserved: fresh ? 0 : Number(existing.quotaReserved) || 0,
    preflightWindowStart: fresh ? 0 : Number(existing.preflightWindowStart) || 0,
    preflightWindowCount: fresh ? 0 : Number(existing.preflightWindowCount) || 0,
    isNew,
    rolledOver,
  }
}

/**
 * 用户可见的额度状态。remaining 已扣除在途的预授权，避免用户看到虚高的剩余次数。
 * @returns {{ remaining:number, dailyLimit:number, used:number, reserved:number }}
 */
function quotaStatus(existing, todayKey, defaults) {
  const norm = normalizeUserDoc(existing, todayKey, defaults)
  return {
    remaining: Math.max(0, norm.dailyLimit - norm.quotaUsedToday - norm.quotaReserved),
    dailyLimit: norm.dailyLimit,
    used: norm.quotaUsedToday,
    reserved: norm.quotaReserved,
  }
}

/**
 * 是否还能发起一次新任务（预授权前的前置判断）。
 * @returns {{ ok:boolean, code?:number, reason?:string }}
 */
function canReserve(existing, todayKey, defaults) {
  const norm = normalizeUserDoc(existing, todayKey, defaults)
  if (norm.quotaUsedToday + norm.quotaReserved >= norm.dailyLimit) {
    return {
      ok: false,
      code: ERR.QUOTA_EXCEEDED,
      reason: `今日免费额度已用完（${norm.dailyLimit} 次），明日恢复`,
    }
  }
  return { ok: true }
}

/**
 * 频率限制：滑动窗口计数（窗口 = RATE_LIMIT.WINDOW_MS）。
 * 与额度正交——额度管每日总量，这里管短时间突发。
 *
 * @param existing {object|null} 数据库中的用户文档
 * @param now {number} Date.now()
 * @returns {{ limited:boolean, count:number, windowStart:number, resetInMs:number }}
 *   count / windowStart 是「本次若放行后」应写入库的值，调用方可直接使用。
 */
function rateLimitState(existing, now) {
  const start = Number(existing && existing.preflightWindowStart) || 0
  const count = Number(existing && existing.preflightWindowCount) || 0

  // 窗口未开启或已过期 → 开启新窗口，从 1 重新计数
  if (!start || now - start >= RATE_LIMIT.WINDOW_MS) {
    return { limited: false, count: 1, windowStart: now, resetInMs: 0 }
  }

  const resetInMs = RATE_LIMIT.WINDOW_MS - (now - start)
  const next = count + 1
  if (next > RATE_LIMIT.MAX_PREFLIGHT) {
    return { limited: true, count: count, windowStart: start, resetInMs: resetInMs }
  }
  return { limited: false, count: next, windowStart: start, resetInMs: resetInMs }
}

module.exports = {
  DAILY_LIMIT_DEFAULT,
  normalizeUserDoc,
  quotaStatus,
  canReserve,
  rateLimitState,
}
