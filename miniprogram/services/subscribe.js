'use strict'

/**
 * 订阅消息（F8 面试提醒）前端侧。
 *
 * ## 模板 ID 的维护
 *
 * TEMPLATE_ID 在 mp 后台申请「面试提醒」类模板后填入，需与云端 config
 * 集合的 `subscribe.templateId` 保持一致（云端发消息用它，前端弹授权也用它）。
 * 模板 ID 不是密钥，硬编码在前端是官方示例的标准做法；
 * 云端走 config 集合是为了「改配置不发版」，前端改动随版本走即可。
 *
 * ## 静默降级
 *
 * TEMPLATE_ID 为空（模板还没申请）时全部入口静默跳过：
 * 不弹授权、不写 remindSubscribed，看板日程照常展示——
 * 功能未启用不能变成使用障碍。
 *
 * 注意：本文件位于 miniprogram/ 下，禁止使用 ?. / ?? / for await。
 */

/** tid 809「面试预约通知」选用后的私有模板 ID（scripts/setup-subscribe.js 自动申请） */
const TEMPLATE_ID = 'F9VhtR2jBdIu3kuYQ9bZcMLm-5n8pSwC0ZhsOmUoRoc'

/**
 * 是否应引导订阅提醒（纯函数，可单测）。
 *
 * 只在「日程启用且时间在未来」时引导：
 * - 过去的日程提醒无意义；
 * - 日期非法（没选日期就开开关）不引导，交给表单校验报错。
 *
 * @param form {{ eventEnabled:boolean, eventDate:string, eventTime:string }}
 * @param nowMs {number} 可注入的当前时间（测试用）
 */
function shouldAskReminder(form, nowMs) {
  if (!form || !form.eventEnabled) return false
  const d = String(form.eventDate || '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false
  const tm = /^\d{2}:\d{2}$/.test(String(form.eventTime || '')) ? form.eventTime : '10:00'
  const atMs = new Date(d + 'T' + tm + ':00').getTime()
  if (!isFinite(atMs)) return false
  return atMs > (nowMs || Date.now())
}

/**
 * 日程内容是否发生变化（编辑态判断是否重新引导订阅）。
 * 用户没动日程就不重复弹授权——一次性订阅每次弹都会消耗用户的耐心。
 */
function eventChanged(prev, next) {
  const p = prev || null
  const n = next || null
  if (!p && !n) return false
  if (!p || !n) return true
  return p.type !== n.type || p.date !== n.date || p.time !== n.time
}

/**
 * 请求订阅授权。
 *
 * 必须在用户点击（tap）的同步调用链上调用——wx.requestSubscribeMessage
 * 要求由用户行为直接触发，放进 setTimeout 或异步链中间会被平台拒绝。
 *
 * @returns {Promise<'accepted'|'rejected'|'unavailable'>}
 *   unavailable：模板未配置或基础库不支持，调用方按「未订阅」处理但不提示
 */
function requestReminderAuth() {
  return new Promise(function (resolve) {
    if (!TEMPLATE_ID || typeof wx === 'undefined' || !wx.requestSubscribeMessage) {
      resolve('unavailable')
      return
    }
    wx.requestSubscribeMessage({
      tmplIds: [TEMPLATE_ID],
      success: function (res) {
        // res 的 key 是模板 ID，值是 'accept' | 'reject' | 'ban' | 'filter'
        resolve(res && res[TEMPLATE_ID] === 'accept' ? 'accepted' : 'rejected')
      },
      fail: function () {
        // 用户在系统层关了订阅开关等场景；按拒绝处理，不阻塞保存
        resolve('rejected')
      },
    })
  })
}

module.exports = {
  TEMPLATE_ID: TEMPLATE_ID,
  shouldAskReminder: shouldAskReminder,
  eventChanged: eventChanged,
  requestReminderAuth: requestReminderAuth,
}
