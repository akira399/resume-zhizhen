'use strict'

/**
 * Offer 对比页（M8）。
 *
 * 数据源：看板中状态为「Offer」的投递记录（自动聚合，无需手动添加）。
 * 每个 Offer 对 5 个维度拖动滑块打分（0-10），实时计算加权总分并自动排名。
 */

const kanban = require('../../../services/kanban')
const { DIMENSIONS, listOffers, rankOffers, setScore } = require('../../../services/offer')

Page({
  data: {
    dims: DIMENSIONS,
    offers: [],
    empty: false,
    loading: true,
    errMsg: '',
  },

  onShow: function () {
    this.refresh()
  },

  refresh: function () {
    const self = this
    kanban.listApplications().then(function (rows) {
      const offers = rankOffers(listOffers(rows))
      self.setData({
        offers: offers,
        empty: offers.length === 0,
        loading: false,
        errMsg: '',
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

  /** 拖动中：只更新预览（不落盘、不重排，避免卡片跳动） */
  onScoreChanging: function (e) {
    const ds = e.currentTarget.dataset
    const index = Number(ds.index)
    const key = ds.key
    const value = Number(e.detail.value)
    const card = this.data.offers[index]
    if (!card) return

    const dims = card.dims.map(function (d) {
      return d.key === key ? Object.assign({}, d, { score: value }) : d
    })
    const rated = dims.every(function (d) {
      return d.score !== null
    })
    let total = null
    if (rated) {
      let sum = 0
      dims.forEach(function (d) {
        sum += d.score * d.weight
      })
      total = Math.round(sum * 10) / 10
    }

    const patch = {}
    patch['offers[' + index + '].dims'] = dims
    patch['offers[' + index + '].rated'] = rated
    patch['offers[' + index + '].total'] = total
    this.setData(patch)
  },

  /** 松手：落盘并全量重排 */
  onScoreChange: function (e) {
    const ds = e.currentTarget.dataset
    setScore(ds.id, ds.key, e.detail.value)
    this.refresh()
  },

  /** 去投递页把拿到的 Offer 标成 Offer 状态 */
  goKanban: function () {
    wx.switchTab({ url: '/pages/kanban/index' })
  },

  /** 完成动作：复制对比结果（给打分完成一个出口 + 确认感） */
  onCopyResult: function () {
    const offers = this.data.offers
    const rated = offers.filter(function (o) { return o.total !== null })
    if (!rated.length) {
      wx.showToast({ title: '先给 Offer 打分，再复制结果', icon: 'none' })
      return
    }
    const lines = ['【Offer 对比结果】']
    rated.forEach(function (o, i) {
      lines.push(o.rank + '. ' + o.company + ' · ' + o.position + '：' + o.total + ' 分')
    })
    const pending = offers.length - rated.length
    if (pending > 0) lines.push('（另有 ' + pending + ' 个 Offer 未打分）')

    wx.setClipboardData({
      data: lines.join('\n'),
      success: function () {
        wx.showToast({ title: '已复制，可发给家人朋友参考', icon: 'success' })
      },
    })
  },
})
