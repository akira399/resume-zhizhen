'use strict'

/**
 * JD 关键词比对页（M2）。
 *
 * 替代原「AI JD 匹配」：内置词库做纯字符串匹配，
 * 输出覆盖率 + 已覆盖 / 缺失关键词，不调用任何生成式 AI。
 */

const { directions } = require('../../../services/keyword-data')
const { buildCompareResult, DEFAULT_DIRECTION } = require('../../../services/keyword')
const { saveRecord } = require('../../../services/history')
const { SAMPLE_RESUMES } = require('../../../data/samples')
const { pickResumeFile, parseResumeFile } = require('../../../services/resume-file')

/** 演示用示例 JD（应届后端岗） */
const SAMPLE_JD = [
  '岗位：后端开发工程师（2027 届校招）',
  '',
  '职责：',
  '- 参与公司核心业务系统的后端开发与维护',
  '- 负责接口设计与实现，保障系统稳定与性能',
  '- 配合团队完成需求评审与技术方案设计',
  '',
  '任职要求：',
  '- 本科及以上学历，计算机相关专业',
  '- 熟悉 Java、Spring Boot、MySQL、Redis',
  '- 了解分布式、微服务、消息队列（Kafka 或 RabbitMQ）',
  '- 有高并发、性能优化经验者优先',
  '- 熟悉 Docker、Linux 优先',
  '- 具备良好的代码习惯与团队协作能力',
].join('\n')

Page({
  data: {
    directions: directions(),
    direction: DEFAULT_DIRECTION,
    resumeText: '',
    jdText: '',
    samples: SAMPLE_RESUMES,
    hasResult: false,
    result: null,
    saved: false,
    importing: false,
  },

  onLoad: function () {
    this.setData({ jdText: SAMPLE_JD })
  },

  onDirection: function (e) {
    this.setData({ direction: e.currentTarget.dataset.key })
  },

  onResumeInput: function (e) {
    this.setData({ resumeText: e.detail.value })
  },

  onJdInput: function (e) {
    this.setData({ jdText: e.detail.value })
  },

  /** 从文件导入简历：选文件 → 上传 → 云函数解析/OCR → 填入 */
  onImportResume: function () {
    if (this.data.importing) return
    const self = this
    pickResumeFile()
      .then(function (file) {
        self.setData({ importing: true })
        return parseResumeFile(file)
      })
      .then(function (data) {
        self.setData({
          resumeText: data.text,
          importing: false,
          hasResult: false,
          result: null,
          saved: false,
        })
        wx.showToast({ title: data.ocr ? '已识别（OCR）' : '已导入', icon: 'success' })
      })
      .catch(function (err) {
        self.setData({ importing: false })
        if (!err || err.message === 'CANCEL') return // 用户取消选择
        wx.showModal({ title: '导入失败', content: err.message || '请重试', showCancel: false })
      })
  },

  /** 一键填充示例简历 */
  onUseSampleResume: function (e) {
    const key = e.currentTarget.dataset.key
    const sample = this.data.samples.filter(function (s) { return s.key === key })[0]
    if (sample) this.setData({ resumeText: sample.text })
  },

  /** 恢复示例 JD */
  onUseSampleJd: function () {
    this.setData({ jdText: SAMPLE_JD })
  },

  onCompare: function () {
    const jd = this.data.jdText.trim()
    const resume = this.data.resumeText.trim()
    if (!jd || !resume) {
      wx.showToast({ title: '请先粘贴简历和岗位描述', icon: 'none' })
      return
    }
    const result = buildCompareResult(jd, resume, this.data.direction)
    this.setData({ result: result, hasResult: true, saved: false })
    // 明确的完成反馈：toast + 滚动到结果卡，避免「点了没反应」的困惑
    wx.showToast({ title: '比对完成', icon: 'success' })
    wx.pageScrollTo({ selector: '#resultArea', duration: 300 })
  },

  onSave: function () {
    if (this._saving) return
    this._saving = true
    const result = this.data.result
    if (!result) {
      this._saving = false
      return
    }
    saveRecord({
      biz: 'keyword',
      summary: result.summary,
      score: result.coverage,
      preview: '覆盖率 ' + result.coverage + '% · 缺失 ' + result.missingKeywords.length + ' 个',
      result: {
        coveredKeywords: result.coveredKeywords,
        missingKeywords: result.missingKeywords,
        notes: result.notes,
      },
      meta: { sourceText: this.data.resumeText, secondaryText: this.data.jdText },
    })
    this.setData({ saved: true })
    wx.showToast({ title: '已保存', icon: 'success' })
    setTimeout(function () {
      wx.navigateTo({ url: '/package-tools/pages/history/index?biz=keyword' })
    }, 600)
  },

  onReset: function () {
    this.setData({
      resumeText: '',
      jdText: SAMPLE_JD,
      hasResult: false,
      result: null,
      saved: false,
    })
  },
})
