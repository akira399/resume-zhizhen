'use strict'

/**
 * 面试日程提醒（F8）核心逻辑。
 *
 * ## 一次性订阅的机制约束
 *
 * 微信一次性订阅消息：用户每点一次「允许」只授予**一次**发送权。
 * 因此数据模型是「前端保存带日程的记录时弹授权 → 写 remindSubscribed: true →
 * 本函数发送一次后立即清标记」。下次日程需要用户再次授权，这是平台限制，
 * 不是实现缺陷（docs/10 §D2 已评估过触达率，仍值得做——面试是强提醒场景）。
 *
 * ## 扫描与容错
 *
 * - 查询条件只带 `remindSubscribed: true`（等值，可命中索引），
 *   24h 窗口在内存过滤——个人量级下全量拉取代价可忽略，换来查询构造简单；
 * - 发送成功 → 清标记 + 写 remindedAt（幂等：下轮不会再扫到）；
 * - 43101（用户未订阅/已取消）→ 清标记。授权已不存在，保留只会每轮空扫；
 * - 其他错误 → 保留标记 + 写 remindError，下轮重试；
 *   日程过后窗口条件自然失效，不会无限重试。
 *
 * 本文件不 require wx-server-sdk，sender 由装配层注入——单测用假 sender，
 * 与 janitor/sweeper 同一套路。
 */

const DAY_MS = 24 * 60 * 60 * 1000

/** 用户未订阅或已取消订阅（一次性授权不存在/已消耗） */
const ERR_NOT_SUBSCRIBED = 43101

/** 订阅消息 thing 类型字段上限 20 字符（超长会被 openapi 拒绝） */
const THING_MAX = 20

function truncateThing(value) {
  return String(value || '').slice(0, THING_MAX)
}

/**
 * 构造订阅消息 payload。
 *
 * 字段 key 必须与 mp 后台已选用模板（tid 809「面试预约通知」）的字段一一对应：
 *   thing4=应聘公司  thing6=面试职位  time2=面试时间  thing8=温馨提示
 * 序号由模板关键词的 kid 决定（kid 4/6/2/8），不是选用顺序，改模板时以
 * gettemplate 返回的 content 为准。
 */
function buildMessage(row, templateId) {
  const ev = row.nextEvent || {}
  return {
    touser: row._openid,
    templateId: templateId,
    page: 'pages/kanban/index',
    data: {
      thing4: { value: truncateThing(row.company) },
      thing6: { value: truncateThing(row.position) },
      time2: { value: String(ev.date || '') + ' ' + String(ev.time || '') },
      thing8: { value: truncateThing(row.note || '无备注') },
    },
  }
}

/**
 * @param {object} deps
 * @param {object} deps.applicationsCol db.collection('applications')
 * @param {(msg: object) => Promise} deps.sender cloud.openapi.subscribeMessage.send 的注入点
 * @param {string} deps.templateId 订阅消息模板 ID（空 = 功能未启用）
 * @returns {{ run: (nowMs: number) => Promise<object> }}
 */
function makeReminder(deps) {
  const applicationsCol = deps.applicationsCol
  const sender = deps.sender
  const templateId = String(deps.templateId || '')

  async function run(nowMs) {
    const now = Number(nowMs) || Date.now()

    if (!templateId) {
      // 模板未申请/未配置：静默跳过，定时任务不报错（docs/03 §4 的降级约定）
      return { enabled: false, scanned: 0, due: 0, sent: 0, cleared: 0, failed: 0 }
    }

    const res = await applicationsCol.where({ remindSubscribed: true }).get()
    const rows = (res && res.data) || []

    const windowEnd = now + DAY_MS
    const due = []
    for (let i = 0; i < rows.length; i++) {
      const atMs = rows[i] && rows[i].nextEvent && rows[i].nextEvent.atMs
      // 只提醒「未来 24h 内」的日程；已过期的不再补发（过了就是过了，补发只会打扰）
      if (typeof atMs === 'number' && atMs >= now && atMs <= windowEnd) {
        due.push(rows[i])
      }
    }

    let sent = 0
    let cleared = 0
    let failed = 0

    for (let i = 0; i < due.length; i++) {
      const row = due[i]
      try {
        await sender(buildMessage(row, templateId))
        await applicationsCol.doc(row._id).update({
          data: { remindSubscribed: false, remindedAt: now, remindError: '' },
        })
        sent++
      } catch (e) {
        const code = e && (e.errCode !== undefined ? e.errCode : e.errcode)
        if (code === ERR_NOT_SUBSCRIBED) {
          // 授权已失效：清标记止损，避免每轮重复扫描同一条
          await applicationsCol.doc(row._id).update({
            data: { remindSubscribed: false, remindError: 'not_subscribed' },
          })
          cleared++
        } else {
          // 临时故障（网络/openapi 抖动）：保留标记，下轮重试；
          // remindError 只做排查线索，截断防脏数据撑大文档
          await applicationsCol.doc(row._id).update({
            data: { remindError: String((e && e.message) || code || 'unknown').slice(0, 100) },
          })
          failed++
        }
      }
    }

    return { enabled: true, scanned: rows.length, due: due.length, sent: sent, cleared: cleared, failed: failed }
  }

  return { run: run }
}

module.exports = { makeReminder, buildMessage, ERR_NOT_SUBSCRIBED, DAY_MS }
