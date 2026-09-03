'use strict'

/**
 * 投递记录编辑页（F7）。
 *
 * 三种进入方式：
 *   1. 看板 FAB —— 全新记录；
 *   2. 看板卡片 —— ?id=xxx 编辑已有记录（含删除）；
 *   3. 面试报告页「存为投递记录」—— ?company=&position= 预填，状态默认面试中。
 *
 * 表单校验在 services/kanban.validateApplication，页面只做取值与回显。
 */

const {
  STATUSES,
  EVENT_TYPES,
  SOURCES,
  getApplication,
  addApplication,
  updateApplication,
  removeApplication,
  validateApplication,
  collectResumeVersions,
  listApplications,
} = require('../../../services/kanban')

const STATUS_LABELS = STATUSES.map(function (s) {
  return s.label
})
const EVENT_TYPE_LABELS = EVENT_TYPES.map(function (t) {
  return t.label
})
/** 来源 = 预设 + 「自定义」；选自定义时弹输入 */
const SOURCE_OPTIONS = SOURCES.concat(['自定义'])

function emptyForm() {
  return {
    company: '',
    position: '',
    status: 'applied',
    source: SOURCES[0],
    resumeVersion: '',
    note: '',
    tags: '',
    eventEnabled: false,
    eventType: 'interview',
    eventDate: '',
    eventTime: '10:00',
  }
}

Page({
  data: {
    isEdit: false,
    saving: false,
    deleting: false,
    loadErr: '', // 编辑态拉取记录失败时非空：隐藏表单，给重试入口

    form: emptyForm(),

    statusLabels: STATUS_LABELS,
    statusIndex: 0,
    sourceOptions: SOURCE_OPTIONS,
    sourceIndex: 0,
    eventTypeLabels: EVENT_TYPE_LABELS,
    eventTypeIndex: 0,
    versionHints: [],
  },

  onLoad: function (options) {
    const id = options && options.id
    if (id) {
      this._id = id
      this.setData({ isEdit: true })
      wx.setNavigationBarTitle({ title: '编辑投递' })
      this.loadExisting(id)
      return
    }

    // 报告页预填：岗位带过来，状态直接给「面试中」——刚面完试，语境就是面试
    const prefill = emptyForm()
    if (options && options.company) prefill.company = String(options.company).slice(0, 40)
    if (options && options.position) prefill.position = String(options.position).slice(0, 40)
    if (prefill.company || prefill.position) prefill.status = 'interviewing'

    this.applyForm(prefill)
    this.loadVersionHints()
  },

  loadExisting: function (id) {
    const self = this
    this.setData({ loadErr: '' })
    getApplication(id)
      .then(function (row) {
        if (!row) {
          wx.showToast({ title: '记录不存在', icon: 'none' })
          setTimeout(function () {
            wx.navigateBack()
          }, 800)
          return
        }
        const ev = row.nextEvent || {}
        const form = {
          company: row.company || '',
          position: row.position || '',
          status: row.status || 'applied',
          source: row.source || SOURCES[0],
          resumeVersion: row.resumeVersion || '',
          note: row.note || '',
          tags: (row.tags || []).join('，'),
          eventEnabled: Boolean(row.nextEvent),
          eventType: ev.type || 'interview',
          eventDate: ev.date || '',
          eventTime: ev.time || '10:00',
        }
        // 记住原日程：保存时对比，日程没动就不重复弹订阅授权（F8）
        self._prevEvent = row.nextEvent || null
        self.applyForm(form)
        self.loadVersionHints()
      })
      .catch(function () {
        // 不再只 toast：表单还停在空壳，用户会误以为记录是空的（P2-1）
        self.setData({ loadErr: '记录加载失败，请重试' })
      })
  },

  /** 加载失败后的原地重试 */
  onRetryLoad: function () {
    if (this._id) this.loadExisting(this._id)
  },

  /** 简历版本候选：从已有记录里提取，点一下即填，免得每次手敲 */
  loadVersionHints: function () {
    const self = this
    listApplications()
      .then(function (rows) {
        self.setData({ versionHints: collectResumeVersions(rows).slice(0, 6) })
      })
      .catch(function () {
        // 候选列表拉不到不影响主流程
      })
  },

  applyForm: function (form) {
    const statusIndex = Math.max(
      0,
      STATUSES.findIndex(function (s) {
        return s.key === form.status
      })
    )
    const si = STATUSES[statusIndex] ? statusIndex : 0

    const customSource = SOURCES.indexOf(form.source) < 0
    const sourceIndex = customSource ? SOURCE_OPTIONS.length - 1 : Math.max(0, SOURCE_OPTIONS.indexOf(form.source))
    if (customSource) this._customSource = form.source

    const eventTypeIndex = Math.max(
      0,
      EVENT_TYPES.findIndex(function (t) {
        return t.key === form.eventType
      })
    )

    this.setData({
      form: form,
      statusIndex: si,
      sourceIndex: sourceIndex,
      eventTypeIndex: EVENT_TYPES[eventTypeIndex] ? eventTypeIndex : 0,
    })
  },

  // ---------------------------------------------------------------- 表单事件

  onCompany: function (e) {
    this.setData({ 'form.company': e.detail.value })
  },

  onPosition: function (e) {
    this.setData({ 'form.position': e.detail.value })
  },

  onStatus: function (e) {
    const i = Number(e.detail.value) || 0
    this.setData({ statusIndex: i, 'form.status': STATUSES[i].key })
  },

  onSource: function (e) {
    const i = Number(e.detail.value) || 0
    this.setData({ sourceIndex: i })
    if (SOURCE_OPTIONS[i] === '自定义') {
      const self = this
      wx.showModal({
        title: '自定义来源',
        editable: true,
        placeholderText: '如：Boss 直聘',
        success: function (res) {
          if (res.confirm && res.content) {
            self._customSource = String(res.content).trim().slice(0, 20)
          }
        },
      })
    }
  },

  onResumeVersion: function (e) {
    this.setData({ 'form.resumeVersion': e.detail.value })
  },

  onPickVersion: function (e) {
    this.setData({ 'form.resumeVersion': e.currentTarget.dataset.v || '' })
  },

  onNote: function (e) {
    this.setData({ 'form.note': e.detail.value })
  },

  onTags: function (e) {
    this.setData({ 'form.tags': e.detail.value })
  },

  onEventToggle: function (e) {
    this.setData({ 'form.eventEnabled': Boolean(e.detail.value) })
  },

  onEventType: function (e) {
    const i = Number(e.detail.value) || 0
    this.setData({ eventTypeIndex: i, 'form.eventType': EVENT_TYPES[i].key })
  },

  onEventDate: function (e) {
    this.setData({ 'form.eventDate': e.detail.value })
  },

  onEventTime: function (e) {
    this.setData({ 'form.eventTime': e.detail.value })
  },

  // ---------------------------------------------------------------- 保存 / 删除

  onSave: function () {
    if (this.data.saving) return

    const f = this.data.form
    const source = SOURCE_OPTIONS[this.data.sourceIndex] === '自定义' ? this._customSource || '' : SOURCE_OPTIONS[this.data.sourceIndex]

    const checked = validateApplication({
      company: f.company,
      position: f.position,
      status: f.status,
      source: source,
      resumeVersion: f.resumeVersion,
      note: f.note,
      tags: f.tags,
      eventEnabled: f.eventEnabled,
      eventType: f.eventType,
      eventDate: f.eventDate,
      eventTime: f.eventTime,
    })

    if (!checked.ok) {
      wx.showToast({ title: checked.reason, icon: 'none' })
      return
    }

    const self = this
    this.setData({ saving: true })

    const done = self._id
      ? updateApplication(self._id, checked.value)
      : addApplication(checked.value)

    done
      .then(function () {
        self.setData({ saving: false })
        wx.showToast({ title: self._id ? '已保存' : '已添加', icon: 'success' })
        setTimeout(function () {
          wx.navigateBack()
        }, 600)
      })
      .catch(function () {
        self.setData({ saving: false })
        wx.showToast({ title: '保存失败，请重试', icon: 'none' })
      })
  },

  onDelete: function () {
    if (!this._id || this.data.deleting) return
    const self = this
    wx.showModal({
      title: '删除这条记录？',
      content: '删除后不可恢复',
      confirmText: '删除',
      confirmColor: '#e5484d',
      success: function (res) {
        if (!res.confirm) return
        self.setData({ deleting: true })
        removeApplication(self._id)
          .then(function () {
            self.setData({ deleting: false })
            wx.showToast({ title: '已删除', icon: 'success' })
            setTimeout(function () {
              wx.navigateBack()
            }, 600)
          })
          .catch(function () {
            self.setData({ deleting: false })
            wx.showToast({ title: '删除失败，请重试', icon: 'none' })
          })
      },
    })
  },
})
