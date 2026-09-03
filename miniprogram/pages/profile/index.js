'use strict'

/**
 * 我的 Tab：历史记录入口 + 数据说明 + 隐私与关于（v1.1 去 AI 化）。
 *
 * 旧版有每日额度展示（依赖 store/user 登录态）；新版为纯本地工具，
 * 无额度、无登录依赖，页面更轻。
 */

const { openContract } = require('../../services/privacy')

Page({
  goHistory: function () {
    wx.navigateTo({ url: '/package-tools/pages/history/index' })
  },

  /** M7：数据备份与恢复 */
  goBackup: function () {
    wx.navigateTo({ url: '/package-tools/pages/backup/index' })
  },

  onViewPrivacy: function () {
    openContract()
  },

  onAbout: function () {
    wx.showModal({
      title: '关于 简历智诊',
      content:
        '一款面向校招生与求职者的求职进度管理工具：' +
        '记录投递、自查简历、比对岗位要求、练习面试、速查高频题库。\n\n' +
        '所有记录默认保存在本机，仅你本人可见，可随时删除。',
      showCancel: false,
      confirmText: '知道了',
    })
  },
})
