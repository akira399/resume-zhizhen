'use strict'

/**
 * 刷题模式页（P2-13）。
 *
 * 三种刷法（顺序/随机/错题重刷）+ 三种题量，逐题显示答案，
 * 答对/答错记录正确率，错题自动进错题池供下次重刷。
 */

const { CATEGORIES } = require('../../data/questions')
const {
  MODES,
  COUNTS,
  flatten,
  readRecords,
  pickQuestions,
  recordAnswer,
  buildStats,
} = require('../../../services/practice-mode')

const ALL_QUESTIONS = flatten(CATEGORIES)

Page({
  data: {
    phase: 'setup', // setup | quiz | done
    modes: MODES,
    counts: COUNTS,
    mode: 'sequence',
    modeLabel: '顺序刷',
    count: 5,
    stats: null,
    quiz: [],       // 本次抽取的题目
    index: 0,
    shown: false,   // 是否已显示答案
    answerVisible: false,
    wrongPool: 0,   // 错题池大小
    userAnswer: '', // 当前题我的回答（先答再看答案，才是真刷题）
    hasAnswer: false,
    answerWarned: false,
  },

  onShow: function () {
    this.setData({ stats: buildStats(readRecords()) })
  },

  onMode: function (e) {
    const key = e.currentTarget.dataset.key
    const label = MODES.filter(function (m) { return m.key === key })[0]
    this.setData({ mode: key, modeLabel: label ? label.label : '', phase: 'setup' })
  },

  onCount: function (e) {
    this.setData({ count: Number(e.currentTarget.dataset.key), phase: 'setup' })
  },

  onStart: function () {
    const picked = pickQuestions(ALL_QUESTIONS, this.data.mode, readRecords(), this.data.count)
    if (this.data.mode === 'wrong' && picked.items.length === 0) {
      wx.showToast({ title: '还没有错题，先刷几题吧', icon: 'none' })
      return
    }
    if (this.data.mode === 'wrong' && picked.items.length < this.data.count) {
      wx.showToast({ title: '错题池只有 ' + picked.items.length + ' 题，全部重刷', icon: 'none' })
    }
    this.setData({
      phase: 'quiz',
      quiz: picked.items,
      index: 0,
      shown: false,
      answerVisible: false,
      wrongPool: picked.poolSize,
      userAnswer: '',
      hasAnswer: false,
      answerWarned: false,
    })
  },

  onAnswerInput: function (e) {
    this.setData({ userAnswer: e.detail.value, hasAnswer: e.detail.value.trim().length > 0 })
  },

  /** 先写自己的回答 → 再展开参考答案对照 */
  onShowAnswer: function () {
    // 一次提醒就够了：没作答直接看答案，刷题效果打折
    if (!this.data.answerWarned && !this.data.hasAnswer) {
      this.setData({ answerWarned: true })
      wx.showToast({ title: '建议先写下回答要点再对照', icon: 'none', duration: 2000 })
    }
    this.setData({ answerVisible: true, shown: true })
  },

  onMark: function (e) {
    const correct = e.currentTarget.dataset.correct === '1'
    const item = this.data.quiz[this.data.index]
    if (!item) return
    recordAnswer({}, item.q, correct)
    const next = this.data.index + 1
    if (next >= this.data.quiz.length) {
      this.setData({
        phase: 'done',
        stats: buildStats(readRecords()),
      })
    } else {
      // 切题清空作答区，避免上一题的答案串到下一题
      this.setData({
        index: next,
        answerVisible: false,
        shown: false,
        userAnswer: '',
        hasAnswer: false,
        answerWarned: false,
      })
    }
  },

  onRestart: function () {
    this.setData({ phase: 'setup', stats: buildStats(readRecords()) })
  },
})
