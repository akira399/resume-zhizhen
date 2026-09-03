#!/usr/bin/env node
/**
 * 订阅消息模板一键配置（F8 面试提醒）。
 *
 * 全程走小程序管理端 HTTP API，不需要登录 mp.weixin.qq.com 手动操作：
 *   1. gettemplate 查「面试预约通知」是否已选用（幂等：已选用直接复用）；
 *   2. 未选用则 addtemplate 从公共模板库（tid 809，类目「办公」）选用，
 *      关键词固定 kid [4,6,2,8] → 应聘公司/面试职位/面试时间/温馨提示，
 *      与 cloud/functions/reminder/src/reminder.js buildMessage 的字段一一对应；
 *   3. 把 priTmplId 写入 config 集合 `subscribe.templateId`（reminder 发送用），
 *      前端常量在 miniprogram/services/subscribe.js TEMPLATE_ID（随版本发布）。
 *
 * 用法：node scripts/setup-subscribe.js [--dry-run]
 */
'use strict'

const path = require('node:path')
const { requestJSON, fetchAccessToken } = require('./init-db')
const { COLLECTIONS, CONFIG_KEYS } = require('../cloud/shared/constants')

const root = path.resolve(__dirname, '..')

/** 模板标题库 tid（类目「办公」下的「面试预约通知」） */
const TEMPLATE_TID = 809
/** 选用关键词：应聘公司(4) / 面试职位(6) / 面试时间(2) / 温馨提示(8) */
const TEMPLATE_KIDS = [4, 6, 2, 8]
const TEMPLATE_TITLE = '面试预约通知'

function loadSecrets() {
  try {
    return require(path.join(root, 'config', 'secrets.local.json'))
  } catch (e) {
    return null
  }
}

/** 查当前账号下已选用的模板；返回目标模板或 null */
async function findExistingTemplate(token) {
  const res = await requestJSON(
    `https://api.weixin.qq.com/wxaapi/newtmpl/gettemplate?access_token=${token}`
  )
  if (!res || res.errcode !== 0) {
    throw new Error('查询模板列表失败：' + JSON.stringify(res))
  }
  const list = res.data || []
  for (let i = 0; i < list.length; i++) {
    if (list[i] && list[i].title === TEMPLATE_TITLE) return list[i]
  }
  return null
}

/** 从公共模板库选用模板，返回 priTmplId */
async function addTemplate(token) {
  const res = await requestJSON(
    `https://api.weixin.qq.com/wxaapi/newtmpl/addtemplate?access_token=${token}`,
    { tid: TEMPLATE_TID, kidList: TEMPLATE_KIDS, sceneDesc: '面试日程提醒' }
  )
  if (!res || res.errcode !== 0 || !res.priTmplId) {
    throw new Error('选用模板失败：' + JSON.stringify(res))
  }
  return res.priTmplId
}

/** 查 config 集合里 subscribe.templateId 的文档（含 _id，供更新） */
async function findConfigDoc(token, env) {
  const res = await requestJSON(`https://api.weixin.qq.com/tcb/databasequery?access_token=${token}`, {
    env: env,
    query: `db.collection("${COLLECTIONS.CONFIG}").where({key:"${CONFIG_KEYS.SUBSCRIBE_TEMPLATE_ID}"}).limit(1).get()`,
  })
  if (!res || res.errcode !== 0) return null
  const rows = (res.data || []).map(function (raw) {
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw)
      } catch (e) {
        return null
      }
    }
    return raw
  })
  return rows.filter(Boolean)[0] || null
}

/** 写 config：有则更新，无则插入 */
async function writeConfig(token, env, templateId) {
  const doc = await findConfigDoc(token, env)
  if (doc && doc._id) {
    const query = `db.collection("${COLLECTIONS.CONFIG}").doc("${doc._id}").update({data:{value:"${templateId}"}})`
    const res = await requestJSON(`https://api.weixin.qq.com/tcb/databaseupdate?access_token=${token}`, {
      env: env,
      query: query,
    })
    return { ok: Boolean(res && res.errcode === 0), mode: 'update', res: res }
  }
  const query = `db.collection("${COLLECTIONS.CONFIG}").add({data:{key:"${CONFIG_KEYS.SUBSCRIBE_TEMPLATE_ID}",value:"${templateId}"}})`
  const res = await requestJSON(`https://api.weixin.qq.com/tcb/databaseadd?access_token=${token}`, {
    env: env,
    query: query,
  })
  return { ok: Boolean(res && res.errcode === 0), mode: 'add', res: res }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const secrets = loadSecrets()
  if (!secrets || !secrets.appid || !secrets.appSecret || !secrets.cloudEnvId) {
    console.error('缺少 config/secrets.local.json（appid/appSecret/cloudEnvId）')
    process.exitCode = 1
    return
  }

  const auth = await fetchAccessToken(secrets.appid, secrets.appSecret)
  if (!auth.ok) {
    console.error(`获取 access_token 失败（errcode=${auth.errcode} errmsg=${auth.errmsg}）`)
    process.exitCode = 1
    return
  }
  const token = auth.token
  const env = secrets.cloudEnvId

  console.log('连接云环境：' + env + (dryRun ? '（dry-run，不改动）' : ''))

  // 1. 模板
  let template = await findExistingTemplate(token)
  if (template) {
    console.log(`模板「${TEMPLATE_TITLE}」已选用：${template.priTmplId}`)
  } else if (dryRun) {
    console.log(`模板「${TEMPLATE_TITLE}」未选用（dry-run 跳过选用）`)
  } else {
    const priTmplId = await addTemplate(token)
    console.log(`已从公共模板库选用「${TEMPLATE_TITLE}」：${priTmplId}`)
  }
  const templateId = (template && template.priTmplId) || ''

  // 2. config
  const configDoc = await findConfigDoc(token, env)
  const currentId = configDoc && configDoc.value
  if (currentId === templateId && templateId) {
    console.log('config 集合 subscribe.templateId 已是最新，跳过写入')
  } else if (dryRun) {
    console.log(`config 集合 subscribe.templateId：${currentId || '（未配置）'} → ${templateId || '（未选用）'}（dry-run 跳过写入）`)
  } else if (templateId) {
    const r = await writeConfig(token, env, templateId)
    if (!r.ok) {
      console.error('写入 config 失败：' + JSON.stringify(r.res))
      process.exitCode = 1
      return
    }
    console.log(`config 集合 subscribe.templateId 已${r.mode === 'update' ? '更新' : '写入'}：${templateId}`)
  } else {
    console.log('模板未选用，跳过 config 写入')
  }

  if (!dryRun && templateId) {
    console.log('\n完成。提醒功能已启用：reminder 定时任务整点扫描，24h 内的日程自动发送。')
    console.log('注意：前端 TEMPLATE_ID 常量已同步（services/subscribe.js），随下次版本发布生效。')
  }
}

main().catch(function (e) {
  console.error(e.message)
  process.exitCode = 1
})
