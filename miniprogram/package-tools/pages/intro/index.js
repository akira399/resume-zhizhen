'use strict'

/**
 * 自我介绍模板页（P2-16）。
 *
 * 填空 9 个字段 → 套预设模板生成 1 分钟 / 3 分钟自我介绍 → 一键复制。
 * 产物是「预设结构 + 用户自己的内容」，非 AI 生成。
 */

const { FIELDS, DURATIONS, buildIntro } = require('../../../services/intro-template')

/** 演示示例（一键填入方便评审） */
const SAMPLE = {
  name: '张同学',
  school: '华中科技大学',
  major: '软件工程',
  grade: '本科 2027 届',
  direction: '后端开发',
  skills: 'Java、Spring Boot、MySQL、Redis',
  project: '校园二手交易平台',
  highlight: '将核心下单接口耗时从 2s 优化到 200ms',
  trait: '踏实、靠谱、抗压',
}

Page({
  data: {
    fields: FIELDS,
    durations: DURATIONS,
    duration: 'min1',
    form: {
      name: '',
      school: '',
      major: '',
      grade: '',
      direction: '',
      skills: '',
      project: '',
      highlight: '',
      trait: '',
    },
    result: '',
    durationLabel: '1 分钟',
  },

  onInput: function (e) {
    const key = e.currentTarget.dataset.key
    this.setData({ ['form.' + key]: e.detail.value, result: '' })
  },

  onDuration: function (e) {
    this.setData({ duration: e.currentTarget.dataset.key, result: '' })
  },

  onFillSample: function () {
    this.setData({ form: Object.assign({}, SAMPLE), result: '' })
  },

  onGenerate: function () {
    const res = buildIntro(this.data.form, this.data.duration)
    if (!res.ok) {
      wx.showToast({ title: res.reason, icon: 'none' })
      return
    }
    this.setData({ result: res.text, durationLabel: res.durationLabel })
    // 完成确认：明确告诉用户「生成了什么、下一步做什么」
    wx.showToast({ title: res.durationLabel + '版本已生成，可复制', icon: 'success' })
    wx.pageScrollTo({ selector: '#introResult', duration: 300 })
  },

  onCopy: function () {
    if (!this.data.result) return
    wx.setClipboardData({
      data: this.data.result,
      success: function () {
        wx.showToast({ title: '已复制，去面试前背熟', icon: 'none' })
      },
    })
  },
})
