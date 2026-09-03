'use strict'

/**
 * 求职 Checklist 页（P2-15）。
 *
 * 秋招全流程 5 阶段 24 项打勾清单（简历 → 网申 → 笔试 → 面试 → 签约），
 * 全部预设静态内容；顶部总进度条，逐项点击打勾。
 */

const { STAGES, getStages, toggle, progress, reset } = require('../../../services/career-checklist')

Page({
  data: {
    stages: [],
    pct: 0,
    done: 0,
    total: 0,
  },

  onShow: function () {
    this.refresh()
  },

  refresh: function () {
    const stages = getStages()
    const p = progress()
    this.setData({
      stages: stages,
      done: p.done,
      total: p.total,
      pct: p.total > 0 ? Math.round((p.done / p.total) * 100) : 0,
    })
  },

  onToggle: function (e) {
    toggle(e.currentTarget.dataset.key)
    this.refresh()
    // 完成确认：全部 24 项打勾时给一次明确的「完成」反馈
    const p = progress()
    const total = STAGES.reduce(function (sum, s) { return sum + s.items.length }, 0)
    if (p.total > 0 && p.done === p.total && total > 0) {
      wx.showToast({ title: '🎉 全部 ' + total + ' 项完成，求职不掉链！', icon: 'none', duration: 2500 })
    }
  },

  onReset: function () {
    const self = this
    wx.showModal({
      title: '重置全部勾选？',
      content: '所有检查项将恢复为未完成',
      confirmColor: '#e5484d',
      success: function (res) {
        if (!res.confirm) return
        reset()
        self.refresh()
        wx.showToast({ title: '已重置', icon: 'success' })
      },
    })
  },
})
