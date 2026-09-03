'use strict'

/**
 * 历史记录详情页（本地优先版，v1.1 去 AI 化）。
 *
 * 与旧版（渲染 AI 结构化结果）的区别：现在记录存在本地 storage，
 * 详情页读本地记录，按业务类型渲染对应的通用区块。
 *
 * 通用渲染字段（各业务共用）：
 *   summary   一句话总结
 *   score     总分（可选）
 *   notes     要点列表（result.notes）
 * 业务扩展字段（各模块在对应版本补充渲染）：
 *   checklist → dimensions（各维度得分）+ items（失分项）
 *   keyword   → covered / missing（关键词）
 *   practice  → rounds（练习轮次）
 *
 * 入参：URL query（biz + id）。
 */

const {
  getRecord,
  removeRecord,
  buildSources,
  buildCopyText,
  formatTime,
  BIZ_LABEL,
  STATUS_LABEL,
} = require('../../../services/history')

Page({
  data: {
    loading: true,
    errMsg: '',
    biz: '',
    bizLabel: '',
    statusLabel: '',
    timeText: '',
    hasScore: false,
    score: 0,
    summary: '',

    // 通用要点列表
    notes: [],

    // 业务扩展区块（M1/M2/M3 按需填充）
    dimensions: [],
    items: [],
    coveredKeywords: [],
    missingKeywords: [],
    rounds: [],

    sources: [],
    hasSource: false,
  },

  onLoad: function (options) {
    const biz = options && options.biz
    const id = options && options.id

    if (!biz || !id) {
      this.setData({ loading: false, errMsg: '缺少记录信息，请从历史列表重新打开' })
      return
    }

    this._biz = biz
    this._id = id
    this.fetch()
  },

  fetch: function () {
    this.setData({ loading: true, errMsg: '' })
    const rec = getRecord(this._id)
    if (!rec) {
      this.setData({ loading: false, errMsg: '记录不存在或已被删除' })
      return
    }
    this._record = rec

    const result = rec.result && typeof rec.result === 'object' ? rec.result : {}
    const sources = buildSources(rec)
    const biz = rec.biz || ''

    const patch = {
      loading: false,
      errMsg: '',
      biz: biz,
      bizLabel: BIZ_LABEL[biz] || '记录',
      statusLabel: STATUS_LABEL[rec.status] || '已完成',
      timeText: rec.timeText || '',
      summary: rec.summary || '',
      hasScore: rec.hasScore === true,
      score: typeof rec.score === 'number' ? rec.score : 0,
      notes: Array.isArray(result.notes) ? result.notes : [],
      dimensions: Array.isArray(result.dimensions) ? result.dimensions : [],
      items: Array.isArray(result.items) ? result.items : [],
      coveredKeywords: Array.isArray(result.coveredKeywords) ? result.coveredKeywords : [],
      missingKeywords: Array.isArray(result.missingKeywords) ? result.missingKeywords : [],
      rounds: Array.isArray(result.rounds) ? result.rounds : [],
      sources: sources,
      hasSource: sources.length > 0,
    }

    this.setData(patch)
  },

  onReload: function () {
    this.fetch()
  },

  /** 展开/收起原文 */
  onToggleSource: function (e) {
    const index = Number(e.currentTarget.dataset.index)
    const sources = this.data.sources
    if (!sources[index]) return

    const next = sources.slice()
    next[index] = {
      label: next[index].label,
      text: next[index].text,
      brief: next[index].brief,
      total: next[index].total,
      open: !next[index].open,
    }
    this.setData({ sources: next })
  },

  onCopy: function () {
    const rec = this._record || {}
    const d = {
      bizLabel: BIZ_LABEL[rec.biz] || '记录',
      timeText: formatTime(rec.createdAtMs),
      summary: rec.summary || '',
      hasScore: rec.hasScore === true,
      score: typeof rec.score === 'number' ? rec.score : 0,
      result: rec.result || null,
    }
    wx.setClipboardData({ data: buildCopyText(d) })
  },

  onDelete: function () {
    const self = this
    wx.showModal({
      title: '删除这条记录？',
      content: '删除后无法恢复',
      confirmText: '删除',
      confirmColor: '#e5484d',
      success: function (res) {
        if (!res.confirm) return
        removeRecord(self._id)
        wx.showToast({ title: '已删除', icon: 'success' })
        setTimeout(function () {
          wx.navigateBack()
        }, 600)
      },
    })
  },
})
