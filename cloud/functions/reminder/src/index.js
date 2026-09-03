'use strict'

/**
 * 面试日程提醒（F8）——定时云函数。
 *
 * 每小时整点扫描 applications 里 remindSubscribed === true 且日程在未来
 * 24h 内的记录，逐条发送订阅消息。业务逻辑在 ./reminder.js（可单测），
 * 本文件只做初始化与装配，与 janitor 同构。
 *
 * 触发器：每小时（config.json）。选整点而非每 10 分钟：
 * 提醒不需要分钟级精度（消息里带具体时间），每小时一次把云调用次数
 * 压到 24 次/天，在免费环境预算内（docs/10 §0.4）。
 */

const cloud = require('wx-server-sdk')

const { COLLECTIONS, CONFIG_KEYS } = require('../../../shared/constants')
const { makeConfigStore } = require('../../../shared/config-store')

const { makeReminder } = require('./reminder')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const configStore = makeConfigStore(db)

exports.main = async () => {
  const templateId = await configStore.string(CONFIG_KEYS.SUBSCRIBE_TEMPLATE_ID)

  const reminder = makeReminder({
    applicationsCol: db.collection(COLLECTIONS.APPLICATIONS),
    sender: function (msg) {
      return cloud.openapi.subscribeMessage.send(msg)
    },
    templateId: templateId,
  })

  const report = await reminder.run(Date.now())
  return { code: 0, message: 'ok', data: report }
}
