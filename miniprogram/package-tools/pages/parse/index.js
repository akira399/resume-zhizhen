'use strict'

/**
 * 简历结构化解析页（P2-11）。
 *
 * 粘贴简历文本 → 正则规则提取联系方式 / 教育背景 / 专业技能 / 经历片段，
 * 结构化卡片展示。纯规则，无生成。
 */

const { parseResume } = require('../../../services/resume-parse')
const { pickResumeFile, parseResumeFile } = require('../../../services/resume-file')

/** 演示示例 */
const SAMPLE = [
  '张三',
  '电话：13800138000',
  '邮箱：zhangsan@example.com',
  'GitHub: github.com/zhangsan-dev',
  '',
  '教育背景',
  '华中科技大学 · 软件工程 · 本科 2027 届',
  '',
  '专业技能',
  'Java、Spring Boot、MySQL、Redis、Linux、Docker',
  '',
  '实习经历',
  '字节跳动 · 后端开发实习生',
  '负责订单接口开发，QPS 从 800 提升到 3000',
  '参与微服务拆分，服务可用性达到 99.9%',
  '',
  '项目经历',
  '校园二手交易平台（个人项目）',
  '独立完成前后端，日活 200+，获学院创新奖',
].join('\n')

Page({
  data: {
    resumeText: '',
    parsed: null,
    hasResult: false,
    importing: false,
  },

  onInput: function (e) {
    this.setData({ resumeText: e.detail.value, hasResult: false })
  },

  /** 从文件导入简历：选文件 → 上传 → 云函数解析 → 填入 */
  onImportResume: function () {
    if (this.data.importing) return
    const self = this
    pickResumeFile()
      .then(function (file) {
        self.setData({ importing: true })
        return parseResumeFile(file)
      })
      .then(function (data) {
        self.setData({ resumeText: data.text, importing: false, hasResult: false })
        wx.showToast({ title: '已导入', icon: 'success' })
      })
      .catch(function (err) {
        self.setData({ importing: false })
        if (!err || err.message === 'CANCEL') return // 用户取消选择
        wx.showModal({ title: '导入失败', content: err.message || '请重试', showCancel: false })
      })
  },

  onFillSample: function () {
    this.setData({ resumeText: SAMPLE, hasResult: false })
  },

  onParse: function () {
    const text = this.data.resumeText.trim()
    if (!text) {
      wx.showToast({ title: '请先粘贴简历文本', icon: 'none' })
      return
    }
    const parsed = parseResume(text)
    this.setData({ parsed: parsed, hasResult: true })
    if (!parsed.hit) {
      wx.showToast({ title: '没识别到结构化信息，请检查文本', icon: 'none' })
    } else {
      // 完成确认：说明识别到了什么，让用户有「解析成功」的感知
      const parts = []
      if (parsed.contacts.phone.length || parsed.contacts.email.length) parts.push('联系方式')
      if (parsed.education.length) parts.push('教育')
      if (parsed.skills.length) parts.push('技能 ' + parsed.skills.length + ' 项')
      if (parsed.experience.length) parts.push('经历')
      wx.showToast({ title: '解析完成：已识别 ' + parts.join('、'), icon: 'none', duration: 2500 })
    }
  },

  onCopy: function () {
    if (!this.data.parsed) return
    const p = this.data.parsed
    const lines = ['【简历结构化】']
    if (p.contacts.phone.length) lines.push('电话：' + p.contacts.phone.join(' / '))
    if (p.contacts.email.length) lines.push('邮箱：' + p.contacts.email.join(' / '))
    if (p.contacts.github.length) lines.push('GitHub：' + p.contacts.github.join(' / '))
    if (p.education.length) lines.push('教育：' + p.education.join('；'))
    if (p.skills.length) lines.push('技能：' + p.skills.join('、'))
    wx.setClipboardData({ data: lines.join('\n') })
  },
})
