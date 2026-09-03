'use strict'

/**
 * 面试题库速查页（M5）。
 *
 * 数据来自本地 data/questions.js（0 云调用、0 额度），
 * 定位是面试前 30 分钟的速查卡：分类 tab + 关键词搜索 + 手风琴展开。
 * M5 新增：收藏（星标）、已练标记、练习进度条。
 */

const { CATEGORIES } = require('../../data/questions')
const qbank = require('../../../services/qbank-store')

function allQuestions() {
  const out = []
  for (let i = 0; i < CATEGORIES.length; i++) {
    for (let j = 0; j < CATEGORIES[i].questions.length; j++) {
      out.push(CATEGORIES[i].questions[j].q)
    }
  }
  return out
}

Page({
  data: {
    categories: CATEGORIES.map(function (c) {
      return { key: c.key, name: c.name, icon: c.icon, count: c.questions.length }
    }),
    activeKey: CATEGORIES.length ? CATEGORIES[0].key : '',
    keyword: '',
    favOnly: false,
    progressPct: 0,
    favCount: 0,
    // 当前分类（或搜索命中）的题目列表；expanded 在点击时写入
    list: [],
    expandedKey: '',
  },

  onLoad: function () {
    this.syncMeta()
    this.applyFilter()
  },

  /** 同步收藏数 / 练习进度 */
  syncMeta: function () {
    const total = allQuestions().length
    this.setData({
      progressPct: qbank.progress(allQuestions()),
      favCount: qbank.getFavs().length,
      totalCount: total,
    })
  },

  /** 当前分类 + 关键词 → list。搜索时跨全部分类，方便「记得题面忘了分类」 */
  applyFilter: function () {
    const kw = this.data.keyword.trim().toLowerCase()
    let pool = []
    if (kw) {
      for (let i = 0; i < CATEGORIES.length; i++) {
        const cat = CATEGORIES[i]
        for (let j = 0; j < cat.questions.length; j++) {
          const item = cat.questions[j]
          if (item.q.toLowerCase().indexOf(kw) >= 0 || item.a.toLowerCase().indexOf(kw) >= 0) {
            pool.push({ q: item.q, a: item.a, catName: cat.name })
          }
        }
      }
    } else {
      for (let i = 0; i < CATEGORIES.length; i++) {
        if (CATEGORIES[i].key === this.data.activeKey) {
          pool = CATEGORIES[i].questions.map(function (item) {
            return { q: item.q, a: item.a, catName: '' }
          })
          break
        }
      }
    }

    // 标注收藏 / 已练状态
    pool = pool.map(function (item) {
      return Object.assign({}, item, {
        isFav: qbank.isFav(item.q),
        isDone: qbank.isDone(item.q),
      })
    })

    // 只收藏视图
    if (this.data.favOnly) {
      pool = pool.filter(function (item) { return item.isFav })
    }

    this.setData({ list: pool, expandedKey: '' })
  },

  onSwitchCategory: function (e) {
    const key = e.currentTarget.dataset.key
    if (!key || key === this.data.activeKey) return
    this.setData({ activeKey: key, keyword: '' })
    this.applyFilter()
  },

  onKeywordInput: function (e) {
    this.setData({ keyword: e.detail.value })
    this.applyFilter()
  },

  onClearKeyword: function () {
    this.setData({ keyword: '' })
    this.applyFilter()
  },

  /** 只看收藏切换 */
  onSwitchFav: function () {
    this.setData({ favOnly: !this.data.favOnly })
    this.applyFilter()
  },

  /** 手风琴展开：一次只展开一题，再点收起 */
  onToggle: function (e) {
    const q = e.currentTarget.dataset.q
    this.setData({ expandedKey: this.data.expandedKey === q ? '' : q })
  },

  /** 收藏 / 取消收藏 */
  onToggleFav: function (e) {
    const q = e.currentTarget.dataset.q
    qbank.toggleFav(q)
    this.syncMeta()
    this.applyFilter()
  },

  /** 标记已练 / 取消 */
  onToggleDone: function (e) {
    const q = e.currentTarget.dataset.q
    qbank.toggleDone(q)
    this.syncMeta()
    this.applyFilter()
  },
})
