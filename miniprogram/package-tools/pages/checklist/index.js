'use strict'

/**
 * 简历自查清单页（M1）。
 *
 * 替代原「AI 简历诊断」：5 个维度 24 项预设检查项，
 * 用户逐项勾选（三态循环：已做到 → 待改进 → 不适用），
 * 实时计算加权得分，完成后保存到本地历史记录。
 *
 * 全部输出为预设规则计算结果，不调用任何生成式 AI。
 */

const {
  dimensionsWithItems,
  defaultAnswers,
  buildChecklistResult,
  STATUS,
  STATUS_LABEL,
  autoDetect,
} = require('../../../services/checklist')
const { saveRecord } = require('../../../services/history')
const { SAMPLE_RESUMES } = require('../../../data/samples')
const { pickResumeFile, parseResumeFile } = require('../../../services/resume-file')

Page({
  data: {
    dimensions: [],
    answers: {},
    resumeText: '',
    samples: SAMPLE_RESUMES,
    // 实时结果
    score: 0,
    hasResult: false,
    summary: '',
    resultItems: [],
    notes: [],
    doneCount: 0,
    todoCount: 0,
    importing: false,
    started: false,   // 是否已开始自查（引导第一步）
    submitted: false, // 是否已生成结果（确认感）
    auto: {},         // key → done/todo：自动预检的判定结果（页面打标签用）
    autoDetected: 0,
    autoConfirm: 0,
    pendingCount: 0,
    statusLabel: STATUS_LABEL, // 页面状态文案（含「待确认」中性态）
  },

  onLoad: function () {
    this.setData({
      dimensions: dimensionsWithItems(),
      answers: defaultAnswers(),
    })
  },

  onInput: function (e) {
    this.setData({ resumeText: e.detail.value })
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
        self.setData({
          resumeText: data.text,
          importing: false,
          started: false,
          submitted: false,
          auto: {},
        })
        // 明确下一步：导入不是终点，要引导用户点「开始自查」
        wx.showToast({ title: '已导入，点「开始自查」自动预检', icon: 'none' })
      })
      .catch(function (err) {
        self.setData({ importing: false })
        if (!err || err.message === 'CANCEL') return // 用户取消选择
        wx.showModal({ title: '导入失败', content: err.message || '请重试', showCancel: false })
      })
  },

  /** 一键填充示例简历（评审 / 演示路径） */
  onUseSample: function (e) {
    const key = e.currentTarget.dataset.key
    const sample = this.data.samples.filter(function (s) { return s.key === key })[0]
    if (!sample) return
    // 换简历 = 重新开始，避免沿用上一份的自查结论
    this.setData({ resumeText: sample.text, started: false, submitted: false, auto: {} })
    wx.showToast({ title: '已填入，点「开始自查」自动预检', icon: 'none' })
  },

  /** 引导第一步：自动预检 + 进入逐项确认 */
  onStart: function () {
    if (!this.data.resumeText.trim()) {
      wx.showToast({ title: '请先粘贴或导入简历', icon: 'none' })
      return
    }

    // 自动预检：系统先判掉能判的，用户只需确认剩下的（产品价值核心）
    const res = autoDetect(this.data.resumeText)
    const answers = Object.assign(defaultAnswers(), res.answers)
    this.setData({
      started: true,
      answers: answers,
      auto: res.auto,
      autoDetected: res.detected,
      autoConfirm: res.needConfirm,
    })

    const self = this
    if (res.tooShort || res.detected === 0) {
      wx.showModal({
        title: '自动预检',
        content: '内容太短，系统无法自动判断。请粘贴完整简历正文；也可以直接逐项手动勾选。',
        showCancel: false,
      })
    } else {
      wx.showModal({
        title: '自动预检完成',
        content:
          '系统自动判定了 ' + res.detected + ' 项（绿色 ✓ 为已做到，红色 ✗ 为检测到问题），' +
          '其余 ' + res.needConfirm + ' 项请对照简历确认。',
        showCancel: false,
        confirmText: '好的，去确认',
      })
    }
    wx.pageScrollTo({ selector: '#checkArea', duration: 300 })
  },

  /**
   * 状态循环：待确认(pending) → 已做到(done) → 待改进(todo) → 不适用(na) → 待确认
   * 默认是中性「待确认」，用户明确判断后才标「待改进」，避免误会。
   */
  onToggle: function (e) {
    if (!this.data.started) {
      wx.showToast({ title: '请先点「开始自查」', icon: 'none' })
      return
    }
    const key = e.currentTarget.dataset.key
    const answers = this.data.answers
    const cur = answers[key] || STATUS.PENDING
    const next =
      cur === STATUS.PENDING ? STATUS.DONE :
      cur === STATUS.DONE ? STATUS.TODO :
      cur === STATUS.TODO ? STATUS.NA :
      STATUS.PENDING
    answers[key] = next
    this.setData({ answers: answers })
    this.refreshResult()
  },

  /** 引导第二步：生成结果 + 完成确认弹窗（用户要的"完成确认感"） */
  onSubmit: function () {
    if (this._submitting) return
    this._submitting = true
    const self = this

    const result = buildChecklistResult(this.data.answers)
    this.setData({
      submitted: true,
      score: result.score,
      hasResult: true,
      summary: result.summary,
      resultItems: result.items,
      notes: result.notes,
      doneCount: result.doneCount,
      todoCount: result.todoCount,
      pendingCount: result.pendingCount,
    })

    // 打分确认弹窗：满分恒 100；有未确认项时说明分数为「已确认部分的预览」
    const scoreLine =
      result.score === null
        ? '还有 ' + result.pendingCount + ' 项待确认，出分前请逐项过一遍'
        : '得分 ' + result.score + ' / 100'
    wx.showModal({
      title: '自查完成',
      content:
        scoreLine + '\n已做到 ' + result.doneCount + ' 项' +
        (result.todoCount > 0 ? ' · 待改进 ' + result.todoCount + ' 项' : ''),
      showCancel: false,
      confirmText: '查看结果',
      success: function () {
        wx.pageScrollTo({ selector: '#resultArea', duration: 300 })
      },
    })
    setTimeout(function () { self._submitting = false }, 300)
  },

  /** 根据勾选状态实时计算得分 */
  refreshResult: function () {
    const result = buildChecklistResult(this.data.answers)
    this.setData({
      score: result.score,
      hasResult: true,
      summary: result.summary,
      resultItems: result.items,
      notes: result.notes,
      doneCount: result.doneCount,
      todoCount: result.todoCount,
      pendingCount: result.pendingCount,
    })
  },

  /** 完成并保存到历史记录 */
  onSave: function () {
    if (this._saving) return
    this._saving = true
    const self = this

    const result = buildChecklistResult(this.data.answers)

    // 还有「待确认」项就保存，结果会被打上"未完成"标签——引导补完再存
    const doSave = function () {
      saveRecord({
        biz: 'checklist',
        summary: result.summary,
        score: result.score,
        preview: result.score === null
          ? '未完成 · 剩 ' + result.pendingCount + ' 项待确认'
          : '总分 ' + result.score + ' · 待改进 ' + result.todoCount + ' 项',
        result: {
          dimensions: result.dimensions,
          items: result.items,
          notes: result.notes,
        },
        meta: { sourceText: self.data.resumeText },
      })
      wx.showToast({ title: '已保存', icon: 'success' })
      setTimeout(function () {
        wx.navigateTo({ url: '/package-tools/pages/history/index?biz=checklist' })
      }, 600)
    }

    if (result.pendingCount > 0) {
      wx.showModal({
        title: '还有 ' + result.pendingCount + ' 项待确认',
        content: '建议先把标「待确认」的项过一遍再保存，分数才完整。仍要保存当前结果吗？',
        confirmText: '继续保存',
        confirmColor: '#e5484d',
        success: function (res) {
          self._saving = false
          if (res.confirm) doSave()
        },
      })
      return
    }
    this._saving = false
    doSave()
  },

  /** 重新勾选：重置所有状态为「待改进」 */
  onReset: function () {
    this.setData({
      answers: defaultAnswers(),
      resumeText: '',
      score: 0,
      hasResult: false,
      summary: '',
      resultItems: [],
      notes: [],
      doneCount: 0,
      todoCount: 0,
      started: false,
      submitted: false,
      auto: {},
      autoDetected: 0,
      autoConfirm: 0,
      pendingCount: 0,
    })
  },
})
