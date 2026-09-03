'use strict'

/**
 * 学习路径页（P2-14）。
 *
 * 按岗位方向选一条准备路线，4 个阶段逐项打勾，跟踪准备进度。
 * 全部为预设静态内容（校招经验帖整理）。
 */

const { getPaths, toggleStage, resetPath } = require('../../../services/learning-path')

Page({
  data: {
    paths: [],
    current: 0,
    activePath: null,
  },

  onShow: function () {
    this.refresh()
  },

  refresh: function () {
    const paths = getPaths()
    const idx = Math.min(this.data.current, paths.length - 1)
    this.setData({
      paths: paths,
      current: idx,
      activePath: paths[idx],
    })
  },

  onSwitchPath: function (e) {
    const i = Number(e.currentTarget.dataset.index)
    this.setData({ current: i })
    this.refresh()
  },

  onToggleStage: function (e) {
    const pathKey = e.currentTarget.dataset.path
    const stageKey = e.currentTarget.dataset.stage
    toggleStage(pathKey, stageKey)
    this.refresh()
    // 完成确认：当前方向 4 阶段全打完时提示
    const active = this.data.activePath
    if (active && active.total > 0 && active.done === active.total) {
      wx.showToast({ title: '🎉 「' + active.label + '」路线全部完成！', icon: 'none', duration: 2500 })
    }
  },

  onReset: function () {
    const self = this
    wx.showModal({
      title: '重置当前方向进度？',
      confirmColor: '#e5484d',
      success: function (res) {
        if (!res.confirm) return
        resetPath(self.data.activePath.key)
        self.refresh()
        wx.showToast({ title: '已重置', icon: 'success' })
      },
    })
  },
})
