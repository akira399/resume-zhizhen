#!/usr/bin/env node
/**
 * 重置用户每日 AI 额度（测试辅助，docs/03 §1.1）。
 *
 * ## 为什么需要
 *
 * 额度模型是「预授权 + 结算」，每日上限默认 5 次。开发/演示时额度用完，
 * 等自然跨天太慢——本脚本把 users 里的额度字段清零，立即恢复可用。
 *
 * ## 重置内容
 *
 *   quotaUsedToday = 0      今日已结算次数
 *   quotaReserved = 0       在途预授权（僵死任务占用的也一并释放）
 *   quotaDate = ''          额度所属日期（置空，下次调用按新的一天处理）
 *   preflightWindowCount = 0  频率限制窗口计数（测试时不受 60s/3 次限制困扰）
 *
 * ## 认证
 *
 * 与 init-db.js 同源：config/secrets.local.json 的 appid + appSecret 换
 * access_token，走 tcb/databasequery / tcb/databaseupdate 管理端接口。
 *
 * 用法：
 *   node scripts/reset-quota.js                     重置全部用户
 *   node scripts/reset-quota.js --openid=oXXXX      只重置指定用户
 *   node scripts/reset-quota.js --dry-run           只列出用户与当前用量，不改动
 */

'use strict'

const path = require('node:path')
const { requestJSON, fetchAccessToken } = require('./init-db')

const root = path.resolve(__dirname, '..')

function loadSecrets() {
  try {
    return require(path.join(root, 'config', 'secrets.local.json'))
  } catch (e) {
    return null
  }
}

function canExecute(secrets) {
  return Boolean(
    secrets &&
      typeof secrets.appid === 'string' &&
      secrets.appid.length > 5 &&
      typeof secrets.appSecret === 'string' &&
      secrets.appSecret.length > 10 &&
      typeof secrets.cloudEnvId === 'string' &&
      secrets.cloudEnvId.length > 5
  )
}

/** openid 脱敏：只留前 6 位，日志/截图不泄露完整标识 */
function maskOpenid(openid) {
  const s = String(openid || '')
  return s.length <= 6 ? s : s.slice(0, 6) + '…'
}

/** 管理端查询 users 集合。databasequery 返回的行可能是 JSON 字符串 */
async function queryUsers(token, env, openid) {
  const query = openid
    ? `db.collection("users").where({_openid:"${openid}"}).limit(20).get()`
    : 'db.collection("users").limit(1000).get()'
  const res = await requestJSON(`https://api.weixin.qq.com/tcb/databasequery?access_token=${token}`, {
    env: env,
    query: query,
  })
  if (!res || res.errcode !== 0) {
    throw new Error('查询 users 失败：errcode=' + (res && res.errcode) + ' ' + (res && res.errmsg))
  }
  return (res.data || []).map(function (raw) {
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw)
      } catch (e) {
        return null
      }
    }
    return raw
  }).filter(Boolean)
}

/** 条件更新：按 openid 更新（管理端 where().update() 支持批量字段写入） */
async function resetOne(token, env, openid) {
  const query =
    `db.collection("users").where({_openid:"${openid}"}).update(` +
    `{data:{quotaUsedToday:0,quotaReserved:0,quotaDate:"",preflightWindowCount:0}}` +
    `)`
  const res = await requestJSON(`https://api.weixin.qq.com/tcb/databaseupdate?access_token=${token}`, {
    env: env,
    query: query,
  })
  if (!res || res.errcode !== 0) {
    return { ok: false, errmsg: 'errcode=' + (res && res.errcode) + ' ' + (res && res.errmsg) }
  }
  const updated = res.modified || (res.stats && res.stats.updated) || 0
  return { ok: true, updated: updated }
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const openidArg = args.find(function (a) {
    return a.startsWith('--openid=')
  })
  const openid = openidArg ? openidArg.slice('--openid='.length) : ''

  const secrets = loadSecrets()
  if (!canExecute(secrets)) {
    console.error('未找到可用的 appid / appSecret / cloudEnvId（config/secrets.local.json）。')
    process.exitCode = 1
    return
  }

  console.log('连接云环境：' + secrets.cloudEnvId + (dryRun ? '（dry-run，不改动）' : ''))
  const auth = await fetchAccessToken(secrets.appid, secrets.appSecret)
  if (!auth.ok) {
    console.error('获取 access_token 失败：errcode=' + auth.errcode + ' ' + auth.errmsg)
    process.exitCode = 1
    return
  }

  const users = await queryUsers(auth.token, secrets.cloudEnvId, openid)
  if (users.length === 0) {
    console.log(openid ? '未找到该 openid 的用户记录。' : 'users 集合为空（还没有用户登录过）。')
    return
  }

  console.log('共 ' + users.length + ' 个用户：')
  let failed = 0
  for (const u of users) {
    const used = Number(u.quotaUsedToday) || 0
    const reserved = Number(u.quotaReserved) || 0
    const line = '  ' + maskOpenid(u._openid) + '  已用 ' + used + ' / 在途 ' + reserved + '（' + (u.quotaDate || '无日期') + '）'

    if (dryRun) {
      console.log(line)
      continue
    }

    const r = await resetOne(auth.token, secrets.cloudEnvId, u._openid)
    if (r.ok) {
      console.log(line + '  → 已重置')
    } else {
      failed++
      console.log(line + '  → 失败（' + r.errmsg + '）')
    }
  }

  if (!dryRun) {
    if (failed > 0) {
      console.error('\n有 ' + failed + ' 个用户重置失败。')
      process.exitCode = 1
      return
    }
    console.log('\n全部重置完成。额度立即恢复：每日上限不变，已用/在途清零。')
  }
}

if (require.main === module) {
  main().catch(function (e) {
    console.error(e && e.message ? e.message : e)
    process.exitCode = 1
  })
}

module.exports = { maskOpenid, queryUsers, resetOne }
