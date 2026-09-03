'use strict'

/**
 * 历史记录列表页（F9）。
 *
 * 三种状态都要有明确出口，否则用户会卡在原地：
 *   加载中 → 骨架占位；失败 → 错误文案 + 重试；空 → 说明这是什么 + 去创建的入口。
 * 空态的 CTA 尤其重要：新用户第一次点进「历史记录」看到的是空列表，
 * 不给下一步入口就等于把他丢在死胡同里。
 *
 * 分页用游标（上一页最后一条的 createdAtMs）而不是 skip——
 * 深分页时 skip 要扫过前面所有文档，游标始终走索引。
 */

const { TABS, listRecords, removeRecord } = require('../../../services/history')

Page({
  data: {
    tabs: TABS,
    activeTab: 'all',
    items: [],
    loading: true,
    loadingMore: false,
    hasMore: false,
    errMsg: '',
  },

  onLoad: function () {
    this._cursor = null
    this._busy = false
    this.reload()
  },

  onPullDownRefresh: function () {
    const self = this
    this.reload().then(function () {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom: function () {
    this.loadMore()
  },

  /** 切换筛选：游标与列表都要重置，否则会把上一个 Tab 的游标带过去 */
  onSwitchTab: function (e) {
    const key = e.currentTarget.dataset.key
    if (key === this.data.activeTab) return
    this.setData({ activeTab: key })
    this.reload()
  },

  reload: function () {
    this._cursor = null
    this.setData({ loading: true, errMsg: '', items: [], hasMore: false })
    return this.fetch(true)
  },

  loadMore: function () {
    if (!this.data.hasMore || this._busy) return
    this.fetch(false)
  },

  /**
   * @param isReset {boolean} true = 覆盖列表（首屏/切换筛选/下拉刷新）
   * @returns {Promise} 兼容调用方的 .then（下拉刷新等）
   */
  fetch: function (isReset) {
    if (this._busy) return Promise.resolve()
    this._busy = true

    const self = this
    this.setData({ loadingMore: !isReset })

    // listRecords 为本地同步读取（v1.1 去云化）；这里包一层 Promise 保持接口不变
    return new Promise(function (resolve) {
      try {
        const res = listRecords({ biz: self.data.activeTab, cursorMs: self._cursor })
        self._cursor = res.nextCursor
        self.setData({
          items: isReset ? res.items : self.data.items.concat(res.items),
          hasMore: res.hasMore,
          loading: false,
          loadingMore: false,
          errMsg: '',
        })
      } catch (err) {
        // 失败时保留已有列表：翻页失败不该把用户已经看到的内容清空
        self.setData({
          loading: false,
          loadingMore: false,
          errMsg: (err && err.message) || '加载失败，请重试',
        })
      }
      self._busy = false
      resolve()
    })
  },

  onOpen: function (e) {
    const index = Number(e.currentTarget.dataset.index)
    const item = this.data.items[index]
    if (!item) return

    // 非 done 的记录没有 result，进详情页只会是一张空白卡
    if (!item.clickable) {
      wx.showToast({ title: '这条记录未完成，没有可查看的结果', icon: 'none' })
      return
    }
    wx.navigateTo({
      url: '/package-tools/pages/history-detail/index?biz=' + item.biz + '&id=' + item.id,
    })
  },

  onDelete: function (e) {
    const index = Number(e.currentTarget.dataset.index)
    const item = this.data.items[index]
    if (!item) return

    const self = this
    wx.showModal({
      title: '删除这条记录？',
      content: item.preview || item.bizLabel + ' · ' + item.timeText,
      confirmText: '删除',
      confirmColor: '#e5484d',
      success: function (res) {
        if (res.confirm) self.doDelete(index, item)
      },
    })
  },

  doDelete: function (index, item) {
    const self = this
    return Promise.resolve(removeRecord(item.id))
      .then(function () {
        const items = self.data.items.slice()
        items.splice(index, 1)
        self.setData({ items: items })
        wx.showToast({ title: '已删除', icon: 'success' })

        // 删空但还有下一页时自动补一页：否则用户会看到一个「假空态」，
        // 明明云端还有记录，却提示"还没有任何记录"
        if (!items.length && self.data.hasMore) self.loadMore()
      })
      .catch(function (err) {
        wx.showToast({ title: (err && err.message) || '删除失败', icon: 'none' })
      })
  },

  /** 空态引导：去简历自查（M1 落地后打开；当前先引导到题库/看板） */
  goEmptyGuide: function () {
    wx.switchTab({ url: '/pages/kanban/index' })
  },
})
