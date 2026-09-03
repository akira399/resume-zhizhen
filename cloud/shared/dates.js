'use strict'

/**
 * 时区工具。
 * 项目统一以「上海时区日期键」（YYYY-MM-DD）划分额度日，避免 UTC 与用户感知差 8 小时。
 */

const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000

/** @param now {Date} @returns {string} 如 2026-08-30 */
function shanghaiDateKey(now) {
  const base = now instanceof Date ? now : new Date()
  const local = new Date(base.getTime() + SHANGHAI_OFFSET_MS)
  return local.toISOString().slice(0, 10)
}

module.exports = { SHANGHAI_OFFSET_MS, shanghaiDateKey }
