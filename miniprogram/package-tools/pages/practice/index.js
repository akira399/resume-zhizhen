'use strict'

/**
 * 面试练习室（M3）。
 *
 * 替代原「AI 模拟面试」：
 * 题库抽题 → 90 秒计时作答（先写「我的回答」再对照）→ 对照参考答案
 * → 三维度自评（结构清晰/有亮点/表达流畅）→ 小结 + 保存到本地历史。
 * 全程无 AI 生成、无录音（v1.2 移除，录音对刷题价值低且引入权限成本）。
 */

const {
  categoriesWithCount,
  DIMENSIONS,
  QUESTION_COUNTS,
  ANSWER_SECONDS,
  pickQuestions,
  buildPracticeResult,
} = require('../../../services/practice')
const { saveRecord } = require('../../../services/history')

Page({
  data: {
    phase: 'setup', // setup | play | done
    categories: [],
    selected: [],
    counts: QUESTION_COUNTS,
    count: 5,
    dims: DIMENSIONS,

    // 答题态
    rounds: [],
    index: 0,
    current: null,
    answerOpen: false,
    timerRunning: false,
    remaining: ANSWER_SECONDS,
    scores: {},
    note: '',
    answer: '', // 当前题的文字作答（先写底稿，再对照参考答案）
    hasAnswer: false,

    // 小结态
    result: null,
  },

  onLoad: function () {
    this.setData({ categories: categoriesWithCount(), selected: [] }) // 空 = 全部
  },

  onUnload: function () {
    this.clearTimer()
  },

  // ---------- 配置态 ----------

  toggleCategory: function (e) {
    const key = e.currentTarget.dataset.key
    const selected = this.data.selected.slice()
    const i = selected.indexOf(key)
    if (i === -1) selected.push(key)
    else selected.splice(i, 1)
    this.setData({ selected: selected })
  },

  selectCount: function (e) {
    this.setData({ count: Number(e.currentTarget.dataset.n) })
  },

  start: function () {
    const rounds = pickQuestions(this.data.selected, this.data.count).map(function (r) {
      return { category: r.category, q: r.q, a: r.a, scores: {}, note: '', answer: '' }
    })
    this.setData({ phase: 'play', rounds: rounds, index: 0 }, function () {
      this.setCurrent()
    })
  },

  // ---------- 答题态 ----------

  setCurrent: function () {
    const current = this.data.rounds[this.data.index]
    const answer = (current && current.answer) || ''
    this.setData({
      current: current,
      answerOpen: false,
      scores: (current && current.scores) || {},
      note: (current && current.note) || '',
      answer: answer,
      hasAnswer: answer.trim().length > 0,
      remaining: ANSWER_SECONDS,
      timerRunning: false,
    })
    this.clearTimer()
  },

  /** 文字作答（先写底稿，看答案前组织好语言） */
  onAnswerInput: function (e) {
    this.setData({ answer: e.detail.value, hasAnswer: e.detail.value.trim().length > 0 })
  },

  startAnswer: function () {
    if (this.data.timerRunning) return
    const self = this
    this.setData({ timerRunning: true, remaining: ANSWER_SECONDS })
    this.clearTimer()
    this._timer = setInterval(function () {
      const next = self.data.remaining - 1
      if (next <= 0) {
        self.clearTimer()
        self.setData({ timerRunning: false, remaining: 0, answerOpen: true })
        wx.showToast({ title: '时间到，看看参考答案', icon: 'none' })
        return
      }
      self.setData({ remaining: next })
    }, 1000)
  },

  seeAnswer: function () {
    this.clearTimer()
    this.setData({ timerRunning: false, answerOpen: true })
  },

  clearTimer: function () {
    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }
  },

  rate: function (e) {
    const dim = e.currentTarget.dataset.dim
    const star = Number(e.currentTarget.dataset.star)
    const scores = Object.assign({}, this.data.scores)
    scores[dim] = star
    this.setData({ scores: scores })
  },

  onNote: function (e) {
    this.setData({ note: e.detail.value })
  },

  next: function () {
    const index = this.data.index
    const rounds = this.data.rounds.slice()
    rounds[index] = Object.assign({}, rounds[index], {
      scores: this.data.scores,
      note: this.data.note,
      answer: this.data.answer,
    })
    const isLast = index >= rounds.length - 1
    this.setData({ rounds: rounds })
    this.clearTimer()

    if (isLast) {
      const result = buildPracticeResult(rounds)
      this.setData({ phase: 'done', result: result })
    } else {
      this.setData({ index: index + 1 }, function () {
        this.setCurrent()
      })
    }
  },

  // ---------- 小结态 ----------

  onSave: function () {
    if (this._saving) return
    this._saving = true
    const result = this.data.result
    if (!result) return

    saveRecord({
      biz: 'practice',
      summary: result.summary,
      score: Math.round(result.overall * 20), // 5 分制 → 百分制（详情页按 /100 展示）
      preview: result.summary,
      result: {
        dimensions: result.dimensions,
        rounds: result.rounds.map(function (r) {
          return { title: r.q, score: r.avg, note: r.note }
        }),
        notes: result.notes,
      },
    })

    wx.showToast({ title: '已保存', icon: 'success' })
    setTimeout(function () {
      wx.navigateTo({ url: '/package-tools/pages/history/index?biz=practice' })
    }, 600)
  },

  restart: function () {
    this.clearTimer()
    this.setData({ phase: 'setup', result: null })
  },
})
