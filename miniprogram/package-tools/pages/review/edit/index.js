'use strict'

/**
 * 面试复盘编辑页（M9）。
 *
 * 支持：从投递记录快速选公司；轮次选择；1-5 星评分；
 * 答得好/没答好/被问问题按逗号或换行分隔成条目；下次改进备注。
 * 编辑模式（?id=）回填已有数据。
 */

const kanban = require('../../../../services/kanban')
const {
  ROUNDS,
  validateReview,
  addReview,
  getReview,
  updateReview,
  collectCompanies,
} = require('../../../../services/review')

Page({
  data: {
    id: '',
    company: '',
    position: '',
    companyList: [],
    companyIndex: -1,
    rounds: ROUNDS,
    roundIndex: 0,
    rating: 0,
    wins: '',
    fails: '',
    questions: '',
    notes: '',
    busy: false,
  },

  onLoad: function (options) {
    const id = options && options.id ? options.id : ''
    this.setData({ id: id })
    if (id) this.loadReview(id)
    this.loadCompanies()
  },

  loadCompanies: function () {
    const self = this
    kanban.listApplications().then(function (rows) {
      self.setData({ companyList: collectCompanies(rows) })
    })
  },

  loadReview: function (id) {
    const self = this
    getReview(id).then(function (row) {
      if (!row) {
        wx.showToast({ title: '复盘不存在', icon: 'none' })
        return
      }
      self.setData({
        company: row.company,
        position: row.position,
        roundIndex: Math.max(ROUNDS.indexOf(row.round), 0),
        rating: row.rating,
        wins: (row.wins || []).join('\n'),
        fails: (row.fails || []).join('\n'),
        questions: (row.questions || []).join('\n'),
        notes: row.notes || '',
      })
    })
  },

  onCompanyInput: function (e) {
    this.setData({ company: e.detail.value, companyIndex: -1 })
  },

  onPositionInput: function (e) {
    this.setData({ position: e.detail.value })
  },

  /** 从投递记录里选一家公司（快速填充公司+岗位） */
  onCompanyPicker: function (e) {
    const i = Number(e.detail.value)
    const list = this.data.companyList
    if (i < 0 || i >= list.length) return
    this.setData({ company: list[i], companyIndex: i })
  },

  onRoundPicker: function (e) {
    this.setData({ roundIndex: Number(e.detail.value) })
  },

  onRate: function (e) {
    this.setData({ rating: Number(e.currentTarget.dataset.rating) })
  },

  onWinsInput: function (e) {
    this.setData({ wins: e.detail.value })
  },

  onFailsInput: function (e) {
    this.setData({ fails: e.detail.value })
  },

  onQuestionsInput: function (e) {
    this.setData({ questions: e.detail.value })
  },

  onNotesInput: function (e) {
    this.setData({ notes: e.detail.value })
  },

  onSave: function () {
    if (this.data.busy) return
    const form = {
      company: this.data.company,
      position: this.data.position,
      round: this.data.rounds[this.data.roundIndex],
      rating: this.data.rating,
      wins: this.data.wins,
      fails: this.data.fails,
      questions: this.data.questions,
      notes: this.data.notes,
    }

    const checked = validateReview(form)
    if (!checked.ok) {
      wx.showToast({ title: checked.reason, icon: 'none' })
      return
    }

    const self = this
    this.setData({ busy: true })
    const save = this.data.id
      ? updateReview(this.data.id, checked.value)
      : addReview(checked.value)
    save
      .then(function () {
        wx.showToast({ title: '已保存', icon: 'success' })
        setTimeout(function () {
          wx.navigateBack()
        }, 500)
      })
      .catch(function () {
        self.setData({ busy: false })
        wx.showToast({ title: '保存失败，请重试', icon: 'none' })
      })
  },
})
