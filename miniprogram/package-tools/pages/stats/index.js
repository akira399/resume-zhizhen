'use strict'

/**
 * 求职数据统计页（M6）。
 *
 * 从本地看板数据计算统计指标（services/stats.js 纯函数），
 * 展示：校招倒计时、总览、状态占比、投递趋势（CSS 柱状图）、渠道效果、漏斗。
 * 全部本地计算，无网络依赖。
 */

const { listApplications } = require('../../../services/kanban')
const { buildStats } = require('../../../services/stats')
const { recruitStage } = require('../../../services/recruit')

Page({
  data: {
    loading: true,
    errMsg: '',
    recruitText: '',
    total: 0,
    offerCount: 0,
    conversion: 0,
    statusCounts: [],
    channels: [],
    weekly: [],
    weeklyMax: 1,
    funnel: [],
  },

  onShow: function () {
    this.load()
  },

  load: function () {
    const self = this
    this.setData({ loading: true, errMsg: '' })

    listApplications()
      .then(function (rows) {
        const stats = buildStats(rows, { nowMs: Date.now() })
        // 柱状图高度（相对最大值百分比），最小留一条可见底线
        const weeklyMax = stats.weekly.reduce(function (m, w) {
          return Math.max(m, w.count)
        }, 1)
        const weekly = stats.weekly.map(function (w) {
          const h = weeklyMax > 0 ? Math.round((w.count / weeklyMax) * 100) : 0
          return { label: w.label, count: w.count, h: Math.max(h, w.count > 0 ? 8 : 2) }
        })

        const stage = recruitStage(Date.now())

        self.setData({
          loading: false,
          errMsg: '',
          recruitText: stage ? stage.text : '',
          total: stats.total,
          offerCount: stats.offerCount,
          conversion: stats.conversion,
          statusCounts: stats.statusCounts,
          channels: stats.channels,
          weekly: weekly,
          weeklyMax: weeklyMax,
          funnel: stats.funnel,
        })
      })
      .catch(function () {
        self.setData({ loading: false, errMsg: '数据读取失败，请重试' })
      })
  },

  onRetry: function () {
    this.load()
  },

  /** 空态引导：去看板填充演示数据 */
  goKanban: function () {
    wx.switchTab({ url: '/pages/kanban/index' })
  },

  /** M10：投递时间线 */
  goTimeline: function () {
    wx.navigateTo({ url: '/package-tools/pages/timeline/index' })
  },
})
