'use strict'

/**
 * 数据备份与恢复页（M7）。
 *
 * 导出：把本地全部数据打包成 JSON 复制到剪贴板，可存到备忘录/网盘/邮箱。
 * 导入：粘贴备份 JSON，校验通过后覆盖写入本地。
 */

const { buildBackup, importBackup } = require('../../../services/backup')

Page({
  data: {
    backupText: '',
    importText: '',
    busy: false,
  },

  onExport: function () {
    const text = JSON.stringify(buildBackup())
    this.setData({ backupText: text })
    wx.setClipboardData({
      data: text,
      success: function () {
        wx.showToast({ title: '已生成并复制，请妥善保存', icon: 'none' })
      },
    })
  },

  onImportInput: function (e) {
    this.setData({ importText: e.detail.value })
  },

  onImport: function () {
    if (this.data.busy) return
    const text = (this.data.importText || '').trim()
    if (!text) {
      wx.showToast({ title: '请先粘贴备份内容', icon: 'none' })
      return
    }

    let obj
    try {
      obj = JSON.parse(text)
    } catch (e) {
      wx.showToast({ title: '备份内容不是有效 JSON', icon: 'none' })
      return
    }

    const self = this
    wx.showModal({
      title: '导入将覆盖当前数据',
      content: '导入后，当前本机的投递记录、历史记录、收藏等会被备份内容整体替换，确认继续？',
      confirmText: '覆盖导入',
      confirmColor: '#e5484d',
      success: function (res) {
        if (!res.confirm) return
        self.doImport(obj)
      },
    })
  },

  doImport: function (obj) {
    const res = importBackup(obj)
    if (!res.ok) {
      wx.showToast({ title: res.reason || '导入失败', icon: 'none' })
      return
    }
    const c = res.counts
    this.setData({ importText: '', busy: false })
    wx.showModal({
      title: '导入成功',
      content: '投递 ' + c.applications + ' 条 · 历史 ' + c.records + ' 条 · 收藏 ' + c.qbank_favs + ' 个',
      showCancel: false,
      confirmText: '知道了',
    })
  },

  /** 清空备份预览 */
  onClearBackup: function () {
    this.setData({ backupText: '' })
  },
})
