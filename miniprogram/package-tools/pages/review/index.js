'use strict'

/**
 * 面试复盘列表页（M9）。
 *
 * 顶部：聚合统计（复盘次数 / 平均分 / 被问最多的问题 Top / 最需改进 Top）。
 * 列表：每次复盘的卡片（公司/岗位/轮次/星级/条目数/时间），可删除。
 */

const { listReviews, removeReview, buildReviewStats } = require('../../../services/review')

function fmtTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const m = d.getMonth() + 1
  const day = d.getDate()
  return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day)
}

Page({
  data: {
    loading: true,
    errMsg: '',
    empty: false,
    stats: null,
    reviews: [],
  },

  onShow: function () {
    this.refresh()
  },

  refresh: function () {
    const self = this
    listReviews().then(function (rows) {
      const stats = buildReviewStats(rows)
      const reviews = rows.map(function (r) {
        return Object.assign({}, r, {
          dateText: fmtTime(r.createdAt),
          stars: [1, 2, 3, 4, 5].map(function (i) {
            return { on: i <= r.rating }
          }),
        })
      })
      self.setData({
        loading: false,
        errMsg: '',
        empty: reviews.length === 0,
        stats: stats,
        reviews: reviews,
      })
    })
    .catch(function () {
      // 没有 catch 时，读取异常会让页面永远停在「加载中…」
      self.setData({ loading: false, errMsg: '数据读取失败，请重试' })
    })
  },

  onRetry: function () {
    this.setData({ loading: true })
    this.refresh()
  },

  goAdd: function () {
    wx.navigateTo({ url: '/package-tools/pages/review/edit/index' })
  },

  goEdit: function (e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/package-tools/pages/review/edit/index?id=' + id })
  },

  onRemove: function (e) {
    const id = e.currentTarget.dataset.id
    const self = this
    wx.showModal({
      title: '删除这条复盘？',
      content: '删除后不可恢复',
      confirmColor: '#e5484d',
      success: function (res) {
        if (!res.confirm) return
        removeReview(id).then(function () {
          wx.showToast({ title: '已删除', icon: 'success' })
          self.refresh()
        })
      },
    })
  },
})
