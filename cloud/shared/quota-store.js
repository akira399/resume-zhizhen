'use strict'

/**
 * 额度的数据库操作（docs/10 A3）。
 * 纯规则在 cloud/shared/quota.js，这里只负责「读文档 → 算 → 条件写回」。
 *
 * 模型：预授权 + 结算
 *   reserve()  preflight 时占位（quotaReserved +1），不扣额度
 *   settle()   任务进入终态时结算：consumed=true → quotaUsedToday +1
 * 两者都把 quotaReserved -1。失败/中止/超时走 settle(false)，用户额度不受损。
 *
 * 并发安全：reserve 用「条件更新」（带上读到的 quotaUsedToday/quotaReserved 作为 where），
 * 两个并发请求只有一个能把 stats.updated 变成 1，另一个得到 429 重试提示。
 */

const { COLLECTIONS, CONFIG_KEYS, ERR } = require('./constants')
const { shanghaiDateKey } = require('./dates')
const { canReserve, quotaStatus, rateLimitState } = require('./quota')

/** 跨天重置时需要一并清零的字段 */
const FRESH_QUOTA_FIELDS = {
  quotaUsedToday: 0,
  quotaReserved: 0,
  preflightWindowStart: 0,
  preflightWindowCount: 0,
}

function makeQuotaStore(db, configStore) {
  const users = db.collection(COLLECTIONS.USERS)
  const _ = db.command

  async function findUser(openid) {
    const found = await users.where({ _openid: openid }).limit(1).get()
    return found.data[0] || null
  }

  return {
    /**
     * 预授权一次额度占用。
     * @returns {{ ok:boolean, code?:number, reason?:string, remaining?:number }}
     */
    reserve: async function (openid, nowMs) {
      const dailyLimit = await configStore.number(CONFIG_KEYS.DAILY_LIMIT)
      const todayKey = shanghaiDateKey(new Date(nowMs))
      let user = await findUser(openid)

      if (!user) {
        return { ok: false, code: ERR.CONFLICT, reason: '用户未初始化，请重新进入小程序' }
      }

      // 跨天重置 / 补齐历史文档缺失的字段，先落一次写，
      // 再在「与库中完全一致的状态」上做条件更新。
      //
      // 为什么必须显式补齐：存量的 users 文档没有 quotaReserved 等字段，
      // 而在云数据库中「字段不存在」与「值为 0」并不相等——
      // 直接用 quotaReserved: 0 作为 where 条件会匹配不到，
      // 导致所有存量用户的预授权都失败。
      const needsMigration = typeof user.quotaReserved !== 'number'
      const needsRollOver = user.quotaDate !== todayKey

      if (needsMigration || needsRollOver) {
        const patch = needsRollOver
          ? Object.assign({ quotaDate: todayKey }, FRESH_QUOTA_FIELDS)
          : { quotaReserved: 0, preflightWindowStart: 0, preflightWindowCount: 0 }
        await users.doc(user._id).update({ data: patch })
        user = Object.assign({}, user, patch)
      }

      // 突发频率限制（与每日额度正交：额度管总量，这里管短时间连点）
      const rl = rateLimitState(user, nowMs)
      if (rl.limited) {
        return {
          ok: false,
          code: ERR.QUOTA_EXCEEDED,
          reason: `操作过于频繁，请 ${Math.ceil(rl.resetInMs / 1000)} 秒后再试`,
        }
      }

      const check = canReserve(user, todayKey, { dailyLimit: dailyLimit })
      if (!check.ok) return { ok: false, code: check.code, reason: check.reason }

      const used = Number(user.quotaUsedToday) || 0
      const reserved = Number(user.quotaReserved) || 0
      const res = await users
        .where({ _openid: openid, quotaDate: todayKey, quotaUsedToday: used, quotaReserved: reserved })
        .update({
          data: {
            quotaReserved: _.inc(1),
            preflightWindowStart: rl.windowStart,
            preflightWindowCount: rl.count,
          },
        })

      // updated !== 1 表示有并发请求抢先改了额度，本次不发放
      if (!res.stats || res.stats.updated !== 1) {
        return { ok: false, code: ERR.QUOTA_EXCEEDED, reason: '操作过于频繁，请稍后再试' }
      }

      return { ok: true, remaining: dailyLimit - used - reserved - 1 }
    },

    /**
     * 结算一次预授权。
     * @param consumed {boolean} true 计入已用（任务成功）；false 释放（失败/中止/拦截）
     *
     * 用带 `quotaReserved > 0` 条件的单次更新完成，省掉一次读：
     * 既是性能优化，也让结算天然幂等——重复调用时条件不成立，
     * 不会把 quotaReserved / quotaUsedToday 扣成负数。
     */
    settle: async function (openid, consumed) {
      const data = { quotaReserved: _.inc(-1) }
      if (consumed) data.quotaUsedToday = _.inc(1)

      const res = await users.where({ _openid: openid, quotaReserved: _.gt(0) }).update({ data: data })
      return { ok: Boolean(res.stats && res.stats.updated === 1) }
    },

    /** 查询额度状态（供 status 类 action 使用） */
    status: async function (openid, nowMs) {
      const dailyLimit = await configStore.number(CONFIG_KEYS.DAILY_LIMIT)
      const user = await findUser(openid)
      return quotaStatus(user, shanghaiDateKey(new Date(nowMs)), { dailyLimit: dailyLimit })
    },
  }
}

module.exports = { makeQuotaStore }
