#!/usr/bin/env node
/**
 * 初始化云数据库：建集合 → 建索引 → 播种 config 默认值（docs/10 B4/B5）。
 *
 * ## 认证：小程序 access_token，不是腾讯云 CAM 密钥
 *
 * 微信云开发提供了一组 `tcb/*` 管理端 HTTP 接口，用**小程序 appid + appSecret**
 * 换取的 access_token 就能调用。这比腾讯云 CAM 子用户密钥的门槛低一个量级：
 * 凭据本来就在 config/secrets.local.json 里，用户不需要再去 CAM 控制台开子用户、
 * 复制密钥、配权限——对非运维角色尤其重要。
 *
 * 实测可用的接口：
 *   GET  /cgi-bin/token?grant_type=client_credential&appid=..&secret=..  → access_token
 *   POST /tcb/databasecollectionadd  {env, collection_name}              → 建集合
 *   POST /tcb/databasecollectionget  {env, limit, offset}                → 列集合
 *   POST /tcb/updateindex            {env, collection_name, create_indexes, drop_indexes}
 *   POST /tcb/databaseadd            {env, query}                        → 插记录
 *   POST /tcb/databasequery          {env, query}                        → 查记录
 *
 * ## 为什么不走 wx-server-sdk
 *
 * wx-server-sdk **没有暴露 createIndex**。用它的话集合和 config 能建，
 * 但 7 个索引会全部失败并报「SDK 不支持」——而索引正是本脚本存在的理由
 * （历史列表 F9 上线前必须建，否则全表扫描）。既然索引必须走 HTTP 接口，
 * 就统一走接口，只维护一套凭据。
 *
 * ## 权限设置
 *
 * 普通代云开发的接口里没有「修改集合权限」，所以权限只能靠默认值
 * （新建集合默认「仅创建者可读写」）。风险可控：前端代码从不直连数据库，
 * 所有读写都经过云函数。docs/11 里保留了人工核对权限的说明。
 *
 * ## 不跑这个脚本会不会挂
 * 不会。ai-proxy 的 ensureCollections() 会自建集合，config 为空时回落 CONFIG_DEFAULTS。
 * 本脚本解决的是**索引**。
 *
 * 用法：
 *   node scripts/init-db.js          执行（凭据齐全时）
 *   node scripts/init-db.js --plan   只打印计划，不改动云端
 *   node scripts/init-db.js --json   以 JSON 输出计划
 */

'use strict'

const fs = require('node:fs')
const https = require('node:https')
const path = require('node:path')
const { COLLECTIONS, CONFIG_DEFAULTS } = require('../cloud/shared/constants')

const root = path.resolve(__dirname, '..')

// ============================================================
// 计划（纯函数，可单测）
// ============================================================

/**
 * 索引规划（对应 docs/03 §3）。
 * 命名规则与云开发控制台一致：字段_排序，1=升序、-1=降序。
 * @returns {Array<{collection:string, name:string, fields:Array<{name:string, order:number}>, unique:boolean, purpose:string}>}
 */
function buildIndexes() {
  return [
    {
      collection: COLLECTIONS.USERS,
      name: '_openid_1',
      fields: [{ name: '_openid', order: 1 }],
      unique: true,
      purpose: '登录与额度查询（每次调用都会命中）',
    },
    {
      collection: COLLECTIONS.DIAGNOSES,
      name: '_openid_-1_createdAt',
      fields: [
        { name: '_openid', order: -1 },
        { name: 'createdAt', order: -1 },
      ],
      unique: false,
      purpose: '历史列表分页（F9）',
    },
    {
      collection: COLLECTIONS.JD_MATCHES,
      name: '_openid_-1_createdAt',
      fields: [
        { name: '_openid', order: -1 },
        { name: 'createdAt', order: -1 },
      ],
      unique: false,
      purpose: '历史列表分页（F9）',
    },
    {
      collection: COLLECTIONS.INTERVIEWS,
      name: '_openid_-1_createdAt',
      fields: [
        { name: '_openid', order: -1 },
        { name: 'createdAt', order: -1 },
      ],
      unique: false,
      purpose: '历史列表分页（F9）',
    },
    {
      collection: COLLECTIONS.APPLICATIONS,
      name: '_openid_1_status',
      fields: [
        { name: '_openid', order: 1 },
        { name: 'status', order: 1 },
      ],
      unique: false,
      purpose: '看板按状态分组（F7）',
    },
    {
      collection: COLLECTIONS.APPLICATIONS,
      // 字段名必须与 services/kanban.normalizeEvent 实际写入的 atMs 一致——
      // 早期按文档草稿写成 scheduledAt，索引建了但范围查询永远命中不了
      name: '_openid_1_nextEvent.atMs',
      fields: [
        { name: '_openid', order: 1 },
        { name: 'nextEvent.atMs', order: 1 },
      ],
      unique: false,
      purpose: '面试日程提醒扫描（F8）',
    },
    {
      collection: COLLECTIONS.METRICS,
      name: '_openid_-1_createdAt',
      fields: [
        { name: '_openid', order: -1 },
        { name: 'createdAt', order: -1 },
      ],
      unique: false,
      purpose: '埋点按时间排查',
    },
  ]
}

/**
 * @returns {{ collections:string[], configSeeds:Array<{key:string,value:any}>,
 *             indexes: ReturnType<typeof buildIndexes> }}
 */
function buildPlan() {
  const collections = Object.keys(COLLECTIONS).map((k) => COLLECTIONS[k])
  const configSeeds = Object.keys(CONFIG_DEFAULTS).map((key) => ({
    key: key,
    value: CONFIG_DEFAULTS[key],
  }))
  return { collections: collections, configSeeds: configSeeds, indexes: buildIndexes() }
}

/** 控制台深链，人工核对时用 */
function consoleUrls(envId) {
  const base = `https://tcb.cloud.tencent.com/dev?envId=${envId}#`
  return {
    database: base + '/db/doc',
    collection: (name) => base + '/db/doc/collection/' + name,
    functions: base + '/scf',
    env: base + '/env',
  }
}

// ============================================================
// HTTP 层
// ============================================================

function requestJSON(url, body) {
  return new Promise(function (resolve, reject) {
    let u
    try {
      u = new URL(url)
    } catch (e) {
      reject(new Error('URL 非法'))
      return
    }

    const method = body === undefined ? 'GET' : 'POST'
    const payload = body === undefined ? null : Buffer.from(JSON.stringify(body), 'utf8')
    const headers = { Accept: 'application/json' }
    if (payload) {
      headers['Content-Type'] = 'application/json'
      headers['Content-Length'] = payload.length
    }

    const req = https.request(
      { hostname: u.hostname, path: u.pathname + u.search, method: method, headers: headers },
      function (res) {
        let text = ''
        res.on('data', function (c) {
          text += c
        })
        res.on('end', function () {
          let parsed
          try {
            parsed = JSON.parse(text)
          } catch (e) {
            reject(new Error('非 JSON 响应：' + String(text).slice(0, 200)))
            return
          }
          resolve(parsed)
        })
      }
    )
    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })
}

/**
 * 用 appid + appSecret 换取 access_token。
 * @returns {Promise<{ ok:boolean, token?:string, errcode?:number, errmsg?:string }>}
 */
async function fetchAccessToken(appid, appSecret) {
  const url =
    'https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=' +
    encodeURIComponent(appid) +
    '&secret=' +
    encodeURIComponent(appSecret)
  const res = await requestJSON(url)
  if (res && res.access_token) return { ok: true, token: res.access_token }
  return { ok: false, errcode: res && res.errcode, errmsg: res && res.errmsg }
}

/** 列出已有集合名 */
async function listCollections(token, env) {
  const res = await requestJSON(
    `https://api.weixin.qq.com/tcb/databasecollectionget?access_token=${token}`,
    { env: env, limit: 100, offset: 0 }
  )
  if (!res || res.errcode !== 0) return []
  return ((res.collections || []).map((c) => c && c.name)).filter(Boolean)
}

/** 建集合（已存在时接口会报错，按幂等处理） */
async function createCollection(token, env, name) {
  const res = await requestJSON(
    `https://api.weixin.qq.com/tcb/databasecollectionadd?access_token=${token}`,
    { env: env, collection_name: name }
  )
  return { ok: Boolean(res && res.errcode === 0), errcode: res && res.errcode, errmsg: res && res.errmsg }
}

/**
 * 为同一集合批量创建索引。
 * @param indexes 同一集合的索引定义数组
 */
async function createIndexes(token, env, collection, indexes) {
  const res = await requestJSON(`https://api.weixin.qq.com/tcb/updateindex?access_token=${token}`, {
    env: env,
    collection_name: collection,
    create_indexes: indexes.map(function (i) {
      return {
        name: i.name,
        unique: Boolean(i.unique),
        keys: i.fields.map(function (f) {
          return { name: f.name, direction: String(f.order) }
        }),
      }
    }),
    drop_indexes: [],
  })
  return { ok: Boolean(res && res.errcode === 0), errcode: res && res.errcode, errmsg: res && res.errmsg }
}

/**
 * 删除索引。
 *
 * 存在的理由：平台可能已经自动建过同名索引（例如 users 上的 _openid_1），
 * 但选项不同（非唯一）。此时直接 create 会报
 * `IndexOptionsConflict: Index with name: _openid_1 already exists with different options`，
 * 必须先删掉再按我们的定义重建。
 */
async function dropIndexes(token, env, collection, names) {
  const res = await requestJSON(`https://api.weixin.qq.com/tcb/updateindex?access_token=${token}`, {
    env: env,
    collection_name: collection,
    create_indexes: [],
    drop_indexes: names.map(function (n) {
      return { name: n }
    }),
  })
  return { ok: Boolean(res && res.errcode === 0), errcode: res && res.errcode, errmsg: res && res.errmsg }
}

/** 是否属于「同名索引已存在但选项不同」 */
function isIndexConflict(result) {
  return /IndexOptionsConflict|already exists/i.test(String((result && result.errmsg) || ''))
}

/** 建索引；遇到同名不同选项的冲突时先删再建一次 */
async function ensureIndexes(token, env, collection, indexes) {
  const first = await createIndexes(token, env, collection, indexes).catch(function (e) {
    return { ok: false, errmsg: e && e.message }
  })
  if (first.ok || !isIndexConflict(first)) return first

  const dropped = await dropIndexes(
    token,
    env,
    collection,
    indexes.map((i) => i.name)
  ).catch(function (e) {
    return { ok: false, errmsg: e && e.message }
  })
  if (!dropped.ok) return { ok: false, errmsg: '删除旧索引失败：' + dropped.errmsg }

  const second = await createIndexes(token, env, collection, indexes).catch(function (e) {
    return { ok: false, errmsg: e && e.message }
  })
  if (second.ok) second.rebuilt = true
  return second
}

/** 查询 config 里已存在的 key */
async function queryConfig(token, env) {
  const res = await requestJSON(`https://api.weixin.qq.com/tcb/databasequery?access_token=${token}`, {
    env: env,
    query: `db.collection("${COLLECTIONS.CONFIG}").limit(200).get()`,
  })
  if (!res || res.errcode !== 0) return null
  const rows = (res.data || []).map(function (raw) {
    // databasequery 返回的可能是 JSON 字符串，也可能是对象
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw)
      } catch (e) {
        return null
      }
    }
    return raw
  })
  return rows.filter(Boolean).map((r) => r && r.key).filter(Boolean)
}

/** 播种一条 config（query 由本脚本构造，不含用户输入） */
async function addConfigDoc(token, env, key, value) {
  const query =
    `db.collection("${COLLECTIONS.CONFIG}").add(` +
    `{data:${JSON.stringify({ key: key, value: value })}}` +
    `)`
  const res = await requestJSON(`https://api.weixin.qq.com/tcb/databaseadd?access_token=${token}`, {
    env: env,
    query: query,
  })
  return { ok: Boolean(res && res.errcode === 0), errcode: res && res.errcode, errmsg: res && res.errmsg }
}

// ============================================================
// 执行编排
// ============================================================

/**
 * 执行建库。全程不打印 token / 密钥。
 * @returns {Promise<{ ok:boolean, report:object, error?:string }>}
 */
async function runInit(secrets) {
  const env = secrets.cloudEnvId
  const plan = buildPlan()
  const report = { collections: [], indexes: [], configSeeds: [], skipped: [] }

  const auth = await fetchAccessToken(secrets.appid, secrets.appSecret)
  if (!auth.ok) {
    return {
      ok: false,
      report: report,
      error: `获取 access_token 失败（errcode=${auth.errcode} errmsg=${auth.errmsg}）`,
    }
  }
  const token = auth.token

  // ---- 集合 ----
  const existing = await listCollections(token, env)
  for (const name of plan.collections) {
    if (existing.indexOf(name) >= 0) {
      report.collections.push({ name: name, created: false, reason: '已存在' })
      continue
    }
    const r = await createCollection(token, env, name).catch(function (e) {
      return { ok: false, errmsg: e && e.message }
    })
    report.collections.push({ name: name, created: r.ok, reason: r.ok ? '' : r.errmsg })
  }

  // ---- 索引（按集合分组，一次请求建完该集合的索引）----
  const byCollection = {}
  for (const idx of plan.indexes) {
    if (!byCollection[idx.collection]) byCollection[idx.collection] = []
    byCollection[idx.collection].push(idx)
  }
  for (const collection of Object.keys(byCollection)) {
    const r = await ensureIndexes(token, env, collection, byCollection[collection])
    for (const idx of byCollection[collection]) {
      report.indexes.push({
        name: collection + '.' + idx.name,
        // 整批一起提交，成功即全部成功
        created: r.ok,
        reason: r.ok ? (r.rebuilt ? '删除同名旧索引后重建' : '') : r.errmsg,
      })
    }
  }

  // ---- config 默认值（只补缺失键，可选步骤，失败不影响整体）----
  const existingKeys = await queryConfig(token, env).catch(() => null)
  if (existingKeys === null) {
    report.skipped.push('config 播种：读取现有配置失败，已跳过（云函数会回落默认值，不影响运行）')
  } else {
    for (const seed of plan.configSeeds) {
      if (existingKeys.indexOf(seed.key) >= 0) {
        report.configSeeds.push({ key: seed.key, created: false, reason: '已存在' })
        continue
      }
      const r = await addConfigDoc(token, env, seed.key, seed.value).catch(function (e) {
        return { ok: false, errmsg: e && e.message }
      })
      report.configSeeds.push({ key: seed.key, created: r.ok, reason: r.ok ? '' : r.errmsg })
    }
  }

  const failedIndexes = report.indexes.filter((i) => !i.created)
  return { ok: failedIndexes.length === 0, report: report }
}

// ============================================================
// CLI
// ============================================================

function printPlan(plan, envId) {
  const urls = consoleUrls(envId || '<envId>')

  console.log('=== 云数据库初始化计划 ===\n')
  console.log(`集合（${plan.collections.length}）：${plan.collections.join(', ')}`)
  console.log(`\nconfig 默认值（${plan.configSeeds.length} 项，只补缺失键）：`)
  for (const s of plan.configSeeds) {
    console.log(`  ${s.key} = ${JSON.stringify(s.value)}`)
  }
  console.log(`\n索引（${plan.indexes.length}）：`)
  for (const i of plan.indexes) {
    const fields = i.fields.map((f) => `${f.name}:${f.order > 0 ? '升序' : '降序'}`).join(', ')
    console.log(`  ${i.collection}.${i.name}  [${fields}]${i.unique ? ' 唯一' : ''}  — ${i.purpose}`)
  }

  console.log('\n=== 控制台入口 ===')
  console.log(`  数据库：${urls.database}`)
  console.log(`  云函数：${urls.functions}`)
}

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

async function main() {
  const plan = buildPlan()

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(plan, null, 2))
    return
  }

  const secrets = loadSecrets()
  const forcePlanOnly = process.argv.includes('--plan')

  if (!forcePlanOnly && canExecute(secrets)) {
    console.log('使用小程序 access_token 初始化云环境：' + secrets.cloudEnvId + '\n')
    const result = await runInit(secrets)

    console.log('--- 集合 ---')
    for (const c of result.report.collections) {
      console.log(`  ${c.name}: ${c.created ? '已创建' : '跳过（' + c.reason + '）'}`)
    }
    console.log('--- 索引 ---')
    for (const i of result.report.indexes) {
      console.log(`  ${i.name}: ${i.created ? '已创建' : '失败（' + i.reason + '）'}`)
    }
    if (result.report.configSeeds.length) {
      console.log('--- config ---')
      for (const c of result.report.configSeeds) {
        console.log(`  ${c.key}: ${c.created ? '已写入' : '跳过（' + c.reason + '）'}`)
      }
    }
    for (const s of result.report.skipped) console.log('[跳过] ' + s)

    if (!result.ok) {
      console.error('\n有索引创建失败。索引在历史列表（F9）上线前必须建好，否则列表查询会全表扫描。')
      process.exitCode = 1
      return
    }
    console.log('\n完成。集合权限沿用默认值（仅创建者可读写）；前端不直连数据库，读写均经云函数。')
    return
  }

  printPlan(plan, secrets && secrets.cloudEnvId)

  if (!canExecute(secrets)) {
    console.log('\n未找到可用的 appid / appSecret / cloudEnvId，仅打印计划。')
    console.log('补齐 config/secrets.local.json 后重新运行本脚本即可执行。')
  } else {
    console.log('\n（--plan 模式：未改动云端）')
  }
  console.log('\n注意：索引在历史列表（F9）上线前必须创建，否则列表查询会全表扫描。')
}

if (require.main === module) {
  main().catch(function (e) {
    console.error(e)
    process.exitCode = 1
  })
}

module.exports = {
  buildPlan,
  buildIndexes,
  consoleUrls,
  runInit,
  requestJSON,
  fetchAccessToken,
  listCollections,
  createCollection,
  createIndexes,
  dropIndexes,
  isIndexConflict,
  ensureIndexes,
  queryConfig,
  addConfigDoc,
}
