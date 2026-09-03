'use strict'

const { getStoredError, clearStoredError } = require('../../services/error-report')
const { getSetting, openContract, setAgreed } = require('../../services/privacy')
const { recruitStage } = require('../../services/recruit')

Page({
  data: {
    bootError: '',
    privacyBlocked: false,
    privacyContractName: '《用户隐私保护指引》',
    recruitText: '',
  },

  onLoad: function () {
    // 崩溃记录只作为顶部横幅展示，不阻断页面
    this.setData({ bootError: getStoredError() || '' })

    // 校招节点倒计时：本地纯函数
    const stage = recruitStage(Date.now())
    if (stage) this.setData({ recruitText: stage.text })

    this.checkPrivacy()
  },

  /**
   * 隐私协议：未同意前不进入功能页。
   * 查询结果由微信给出，本地只记一个标记避免重复打扰已同意的用户。
   */
  checkPrivacy: function () {
    const self = this
    getSetting().then(function (setting) {
      if (!setting.needAuthorization) return
      self.setData({
        privacyBlocked: true,
        privacyContractName: setting.privacyContractName || '《用户隐私保护指引》',
      })
    })
  },

  /** 由 <button open-type="agreePrivacyAuthorization"> 的同意事件触发 */
  onAgreePrivacy: function () {
    setAgreed(true)
    this.setData({ privacyBlocked: false })
  },

  /** 用户拒绝：保持拦截态，功能入口不可达 */
  onRejectPrivacy: function () {
    setAgreed(false)
    wx.showToast({ title: '需要同意隐私指引后才能使用', icon: 'none' })
  },

  onViewPrivacy: function () {
    openContract()
  },

  /** 简历自查（M1）：分包页，本地规则 */
  goChecklist: function () {
    wx.navigateTo({ url: '/package-tools/pages/checklist/index' })
  },

  /** 岗位比对（M2）：分包页，本地词库 */
  goKeyword: function () {
    wx.navigateTo({ url: '/package-tools/pages/keyword/index' })
  },

  /** 面试题库：分包页，本地数据 */
  goQuestions: function () {
    wx.navigateTo({ url: '/package-tools/pages/questions/index' })
  },

  /** 数据统计（M6）：分包页 */
  goStats: function () {
    wx.navigateTo({ url: '/package-tools/pages/stats/index' })
  },

  /** Offer 对比（M8）：分包页 */
  goOfferCompare: function () {
    wx.navigateTo({ url: '/package-tools/pages/offer-compare/index' })
  },

  /** 待办清单（M10 补充）：分包页 */
  goTodo: function () {
    wx.navigateTo({ url: '/package-tools/pages/todo/index' })
  },

  /** 投递时间线（M10）：分包页 */
  goTimeline: function () {
    wx.navigateTo({ url: '/package-tools/pages/timeline/index' })
  },

  /** 求职 Checklist（P2-15）：分包页 */
  goCareer: function () {
    wx.navigateTo({ url: '/package-tools/pages/career/index' })
  },

  /** 自我介绍模板（P2-16）：分包页 */
  goIntro: function () {
    wx.navigateTo({ url: '/package-tools/pages/intro/index' })
  },

  /** 简历结构化解析（P2-11）：分包页 */
  goParse: function () {
    wx.navigateTo({ url: '/package-tools/pages/parse/index' })
  },

  /** 学习路径（P2-14）：分包页 */
  goLearning: function () {
    wx.navigateTo({ url: '/package-tools/pages/learning/index' })
  },

  /** Tab 页用 switchTab 直达（navigateTo 打不开 tab 页） */
  goInterview: function () {
    wx.switchTab({ url: '/pages/interview/index' })
  },

  goKanban: function () {
    wx.switchTab({ url: '/pages/kanban/index' })
  },

  /** 主 CTA：管理投递进度 */
  goKanbanCta: function () {
    wx.switchTab({ url: '/pages/kanban/index' })
  },

  copyError: function () {
    wx.setClipboardData({ data: this.data.bootError })
  },

  dismissError: function () {
    clearStoredError()
    this.setData({ bootError: '' })
  },

  /** 阻止弹窗背后的页面滚动 */
  noop: function () {},

  /** 转发分享：落地页就是首页本身 */
  onShareAppMessage: function () {
    return {
      title: '简历智诊 · 管好每一次投递，不错过每一次机会',
      path: '/pages/home/index',
    }
  },
})
