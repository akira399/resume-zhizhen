'use strict'

/**
 * 投递时间线（M10）。
 *
 * 按 周 / 月 粒度展示投递节奏：每个周期投递量、面试/Offer 转化、
 * 相对每周目标的完成度进度条。目标本地设置（1-100 家/周）。
 */

const { listApplications } = require('../../../services/kanban')
const {
  buildTimeline,
  getGoal,
  setGoal,
  goalCompletion,
} = require('../../../services/timeline')

Page({
  data: {
    gran: 'week',
    goal: null,
    goalText: '',
    hitWeeks: 0,
    avgPct: null,
    current: null, // 最近周期
    items: [],
    empty: false,
    loading: true,
    errMsg: '',
  },

  onShow: function () {
    this.refresh()
  },

  refresh: function () {
    const self = this
    const goal = getGoal()
    this.setData({ goal: goal, goalText: goal ? String(goal.weeklyTarget) : '', errMsg: '' })

    listApplications().then(function (rows) {
      const tl = buildTimeline(rows, { gran: self.data.gran, nowMs: Date.now() })
      const done = goalCompletion(tl, goal)

      // 倒序展示（最近在上），并计算进度条宽度
      const items = done.items.slice().reverse().map(function (t) {
        const pct = t.pct
        return Object.assign({}, t, {
          barPct: pct === null ? 0 : Math.min(pct, 100),
          pctText: pct === null ? '' : pct + '%',
          hit: pct !== null && pct >= 100,
        })
      })

      self.setData({
        loading: false,
        empty: items.length === 0,
        items: items,
        current: items.length ? items[0] : null,
        hitWeeks: done.hitWeeks,
        avgPct: done.avgPct,
      })
    })
    .catch(function () {
      // 本地读取理论上不失败，但没有 catch 时页面会永远停在「加载中…」
      self.setData({ loading: false, errMsg: '数据读取失败，请重试' })
    })
  },

  onRetry: function () {
    this.setData({ loading: true })
    this.refresh()
  },

  onGranChange: function (e) {
    this.setData({ gran: e.currentTarget.dataset.gran, loading: true })
    this.refresh()
  },

  onGoalInput: function (e) {
    this.setData({ goalText: e.detail.value })
  },

  onGoalSave: function () {
    const n = Number(this.data.goalText)
    if (!isFinite(n) || n < 1) {
      wx.showToast({ title: '每周目标至少 1 家', icon: 'none' })
      return
    }
    const goal = setGoal(n)
    this.setData({ goal: goal, goalText: String(goal.weeklyTarget) })
    wx.showToast({ title: '目标已保存', icon: 'success' })
    this.refresh()
  },

  goKanban: function () {
    wx.switchTab({ url: '/pages/kanban/index' })
  },
})
