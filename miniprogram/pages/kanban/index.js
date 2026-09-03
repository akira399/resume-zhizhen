'use strict'

/**
 * 求职看板主页（M4，v1.1 本地版）。
 *
 * 数据全部来自本地 storage（services/kanban.js），onShow 每次全量刷新。
 * M4 新增：搜索（公司/岗位关键词）、归档视图切换、单条归档、标签展示。
 */

const {
  listApplications,
  groupByStatus,
  upcomingEvents,
  boardSummary,
  buildFunnel,
  filterApplications,
  toggleArchive,
  seedDemoApplications,
  clearDemoApplications,
} = require('../../services/kanban')

Page({
  data: {
    loaded: false,
    loading: false,
    errMsg: '',

    total: 0,
    counts: {},
    groups: [],
    events: [],
    funnel: [],

    keyword: '',
    showArchived: false,

    hasDemo: false,
    demoBusy: false,
  },

  onShow: function () {
    this.reload()
  },

  onPullDownRefresh: function () {
    const self = this
    this.reload().then(function () {
      wx.stopPullDownRefresh()
    })
  },

  reload: function () {
    const self = this
    if (this.data.loading) return Promise.resolve()
    this.setData({ loading: true })

    return listApplications()
      .then(function (rows) {
        self._rows = rows
        self.render(rows)
      })
      .catch(function () {
        self.setData({
          loaded: true,
          loading: false,
          errMsg: '数据读取失败，请重试',
        })
      })
  },

  /** 本地同步渲染（搜索 / 归档切换时复用，不走网络） */
  render: function (rows) {
    const filtered = filterApplications(rows, {
      keyword: this.data.keyword,
      archivedOnly: this.data.showArchived,
    })
    const groups = groupByStatus(filtered)
    const summary = boardSummary(groups)

    let hasDemo = false
    for (let i = 0; i < rows.length; i++) {
      if (rows[i] && rows[i].isDemo) {
        hasDemo = true
        break
      }
    }

    this.setData({
      loaded: true,
      loading: false,
      errMsg: '',
      groups: groups,
      total: summary.total,
      counts: summary.counts,
      events: upcomingEvents(rows, Date.now()),
      funnel: buildFunnel(groups),
      hasDemo: hasDemo,
    })
  },

  onRetryLoad: function () {
    this.reload()
  },

  // ---------------------------------------------------------------- 搜索 / 归档

  onSearch: function (e) {
    this.setData({ keyword: e.detail.value })
    if (this._rows) this.render(this._rows)
  },

  onClearSearch: function () {
    this.setData({ keyword: '' })
    if (this._rows) this.render(this._rows)
  },

  onToggleArchivedView: function (e) {
    const show = e.currentTarget.dataset.show === '1'
    if (show === this.data.showArchived) return
    this.setData({ showArchived: show })
    if (this._rows) this.render(this._rows)
  },

  /** M6：求职数据统计页 */
  goStats: function () {
    wx.navigateTo({ url: '/package-tools/pages/stats/index' })
  },

  onArchive: function (e) {
    const id = e.currentTarget.dataset.id
    const self = this
    toggleArchive(id).then(function (archived) {
      wx.showToast({ title: archived ? '已归档' : '已恢复', icon: 'none' })
      self.reload()
    })
  },

  // ---------------------------------------------------------------- 增删改

  onAdd: function () {
    wx.navigateTo({ url: '/pages/kanban/edit/index' })
  },

  onEdit: function (e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: '/pages/kanban/edit/index?id=' + id })
  },

  // ---------------------------------------------------------------- 演示数据

  onSeedDemo: function () {
    const self = this
    if (this.data.demoBusy) return
    this.setData({ demoBusy: true })

    seedDemoApplications()
      .then(function (n) {
        wx.showToast({ title: '已填充 ' + n + ' 条演示数据', icon: 'none' })
        return self.reload()
      })
      .catch(function () {
        wx.showToast({ title: '填充失败，请重试', icon: 'none' })
        return self.reload()
      })
      .then(function () {
        self.setData({ demoBusy: false })
      })
  },

  onClearDemo: function () {
    const self = this
    if (this.data.demoBusy) return
    wx.showModal({
      title: '清除演示数据',
      content: '将删除全部带「演示」标记的投递记录，你自己记录的数据不受影响。',
      confirmText: '清除',
      success: function (res) {
        if (!res.confirm) return
        self.setData({ demoBusy: true })
        clearDemoApplications()
          .then(function (n) {
            wx.showToast({ title: '已清除 ' + n + ' 条', icon: 'none' })
            return self.reload()
          })
          .catch(function () {
            wx.showToast({ title: '清除失败，请重试', icon: 'none' })
            return self.reload()
          })
          .then(function () {
            self.setData({ demoBusy: false })
          })
      },
    })
  },
})
