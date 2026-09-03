'use strict'

/**
 * 待办清单页（M10 补充）。
 *
 * 记录求职的"下一步行动"：跟进 HR、补投、复盘等。支持截止日期与优先级，
 * 未完成按紧急度排序（有截止日的在最前，过期的标红）。
 */

const {
  PRIORITY_LABEL,
  validateTodo,
  addTodo,
  listTodos,
  toggleTodo,
  removeTodo,
  clearDone,
  buildTodoStats,
} = require('../../../services/todo')

Page({
  data: {
    text: '',
    dueDate: '',
    priority: 2,
    priorityLabel: '中',
    priorities: [
      { key: 1, label: '高', active: false },
      { key: 2, label: '中', active: true },
      { key: 3, label: '低', active: false },
    ],
    stats: null,
    pending: [],
    done: [],
    empty: false,
  },

  onShow: function () {
    this.refresh()
  },

  refresh: function () {
    const items = listTodos()
    this.setData({
      stats: buildTodoStats(items),
      pending: items.filter(function (i) { return !i.done }),
      done: items.filter(function (i) { return i.done }),
      empty: items.length === 0,
    })
  },

  onTextInput: function (e) {
    this.setData({ text: e.detail.value })
  },

  onDateChange: function (e) {
    this.setData({ dueDate: e.detail.value })
  },

  onPriority: function (e) {
    const p = Number(e.currentTarget.dataset.key)
    this.setData({
      priority: p,
      priorityLabel: PRIORITY_LABEL[p],
      priorities: this.data.priorities.map(function (it) {
        return { key: it.key, label: it.label, active: it.key === p }
      }),
    })
  },

  onAdd: function () {
    const checked = validateTodo({
      text: this.data.text,
      dueDate: this.data.dueDate,
      priority: this.data.priority,
    })
    if (!checked.ok) {
      wx.showToast({ title: checked.reason, icon: 'none' })
      return
    }
    addTodo(checked.value)
    this.setData({ text: '', dueDate: '' })
    this.refresh()
    wx.showToast({ title: '已添加', icon: 'success' })
  },

  onToggle: function (e) {
    toggleTodo(e.currentTarget.dataset.id)
    this.refresh()
  },

  onRemove: function (e) {
    const self = this
    wx.showModal({
      title: '删除这条待办？',
      confirmColor: '#e5484d',
      success: function (res) {
        if (!res.confirm) return
        removeTodo(e.currentTarget.dataset.id)
        self.refresh()
      },
    })
  },

  onClearDone: function () {
    if (!this.data.done.length) return
    const self = this
    wx.showModal({
      title: '清空已完成？',
      content: '共 ' + this.data.done.length + ' 条已完成记录将被删除',
      confirmColor: '#e5484d',
      success: function (res) {
        if (!res.confirm) return
        clearDone()
        self.refresh()
        wx.showToast({ title: '已清空', icon: 'success' })
      },
    })
  },

  onClearDate: function () {
    this.setData({ dueDate: '' })
  },
})
