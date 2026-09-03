'use strict'

const cloud = require('wx-server-sdk')

const { shanghaiDateKey } = require('../../../shared/dates')
const { normalizeUserDoc, quotaStatus } = require('../../../shared/quota')
const { makeConfigStore } = require('../../../shared/config-store')
const { COLLECTIONS, CONFIG_KEYS } = require('../../../shared/constants')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const users = db.collection(COLLECTIONS.USERS)
const configStore = makeConfigStore(db)

/** 集合不存在时自动创建（幂等：已存在会抛错，忽略即可） */
async function ensureCollection(name) {
  try {
    await db.createCollection(name)
  } catch (e) {
    // -501001 / already exists 等情况一律视为已就绪
  }
}

/** 文档是否需要回写额度字段（跨天重置、补齐缺失字段、配置变更） */
function needsQuotaWrite(existing, norm) {
  return (
    existing.quotaDate !== norm.quotaDate ||
    Number(existing.quotaUsedToday) !== norm.quotaUsedToday ||
    Number(existing.quotaReserved) !== norm.quotaReserved ||
    Number(existing.dailyLimit) !== norm.dailyLimit
  )
}

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) {
    return { code: 401, message: '无用户身份', data: null }
  }

  await ensureCollection(COLLECTIONS.USERS)

  const todayKey = shanghaiDateKey(new Date())
  const dailyLimit = await configStore.number(CONFIG_KEYS.DAILY_LIMIT)

  const found = await users.where({ _openid: OPENID }).limit(1).get()
  const existing = found.data[0] || null
  const norm = normalizeUserDoc(existing, todayKey, { dailyLimit: dailyLimit })

  const quotaFields = {
    quotaDate: norm.quotaDate,
    quotaUsedToday: norm.quotaUsedToday,
    quotaReserved: norm.quotaReserved,
    preflightWindowStart: norm.preflightWindowStart,
    preflightWindowCount: norm.preflightWindowCount,
    dailyLimit: norm.dailyLimit,
  }

  if (!existing) {
    await users.add({
      data: Object.assign({ _openid: OPENID, createdAt: db.serverDate(), lastActiveAt: db.serverDate() }, quotaFields),
    })
  } else if (needsQuotaWrite(existing, norm)) {
    await users.doc(existing._id).update({
      data: Object.assign({ lastActiveAt: db.serverDate() }, quotaFields),
    })
  } else {
    await users.doc(existing._id).update({ data: { lastActiveAt: db.serverDate() } })
  }

  return {
    code: 0,
    message: 'ok',
    data: Object.assign({ openid: OPENID, isNew: norm.isNew }, quotaStatus(existing, todayKey, { dailyLimit: dailyLimit })),
  }
}
