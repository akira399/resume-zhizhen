'use strict'

/**
 * 面试 Tab（v1.1 去 AI 化改造）。
 *
 * 旧版是「AI 模拟面试」入口（依赖 services/interview 的流式大模型）。
 * 新版为「面试准备」入口：
 *   面试题库   → package-tools/pages/questions（100+ 道高频题，本地数据）
 *   面试练习室 → M3 模块（抽题 + 计时 + 自评），上线后在此开放入口
 */

Page({
  data: {
    // M3 面试练习室已上线
    practiceReady: true,
  },

  goQuestions: function () {
    wx.navigateTo({ url: '/package-tools/pages/questions/index' })
  },

  /** M3 面试练习室上线后启用 */
  goPractice: function () {
    wx.navigateTo({ url: '/package-tools/pages/practice/index' })
  },

  /** M9：面试复盘 */
  goReview: function () {
    wx.navigateTo({ url: '/package-tools/pages/review/index' })
  },

  /** P2-13：刷题模式 */
  goPracticeMode: function () {
    wx.navigateTo({ url: '/package-tools/pages/practice-mode/index' })
  },
})
