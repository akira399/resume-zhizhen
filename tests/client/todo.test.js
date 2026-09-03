import { describe, it, expect, beforeEach } from 'vitest'

/**
 * 待办清单（M10 补充）测试。mock wx storage。
 */

const memory = {}
global.wx = {
  getStorageSync: function (k) {
    return k in memory ? memory[k] : ''
  },
  setStorageSync: function (k, v) {
    memory[k] = v
  },
  removeStorageSync: function (k) {
    delete memory[k]
  },
}

import {
  validateTodo,
  addTodo,
  listTodos,
  toggleTodo,
  removeTodo,
  clearDone,
  buildTodoStats,
} from '../../miniprogram/services/todo'

beforeEach(() => {
  Object.keys(memory).forEach((k) => delete memory[k])
})

describe('validateTodo 校验', () => {
  it('text 必填', () => {
    expect(validateTodo({}).ok).toBe(false)
    expect(validateTodo({ text: '   ' }).ok).toBe(false)
  })

  it('截止日期格式校验', () => {
    expect(validateTodo({ text: 'x', dueDate: '2026-13-01' }).ok).toBe(false)
    expect(validateTodo({ text: 'x', dueDate: '2026-09-30' }).ok).toBe(true)
  })

  it('非法优先级回退为中', () => {
    expect(validateTodo({ text: 'x', priority: 9 }).value.priority).toBe(2)
    expect(validateTodo({ text: 'x', priority: 1 }).value.priority).toBe(1)
  })
})

describe('增删查改', () => {
  it('新增后按排序规则返回：有截止日的在前且按日期升序', async () => {
    addTodo({ text: '低优无日期', priority: 3 })
    addTodo({ text: '今天截止', dueDate: '2026-09-02', priority: 1 })
    addTodo({ text: '明天截止', dueDate: '2026-09-03', priority: 2 })

    const items = listTodos(new Date(2026, 8, 2, 10).getTime())
    expect(items.map((i) => i.text)).toEqual(['今天截止', '明天截止', '低优无日期'])
  })

  it('完成态沉底、切换 done 与 doneAt', async () => {
    const id = addTodo({ text: '任务A' }).id
    toggleTodo(id)
    const items = listTodos()
    expect(items[0].done).toBe(true)
    expect(items[0].doneAt).toBeGreaterThan(0)
  })

  it('删除与清空已完成', async () => {
    addTodo({ text: 'a' })
    const idB = addTodo({ text: 'b' }).id
    toggleTodo(idB)
    expect(removeTodo(idB)).toBe(true)
    expect(clearDone()).toBe(0) // b 已删，无已完成
    addTodo({ text: 'c' })
    const idC = addTodo({ text: 'd' }).id
    toggleTodo(idC)
    expect(clearDone()).toBe(1)
  })
})

describe('统计与过期', () => {
  it('过期判断：截止日在今天之前且未完成', () => {
    addTodo({ text: '已过期', dueDate: '2026-09-01' })
    addTodo({ text: '今天截止', dueDate: '2026-09-02' })
    addTodo({ text: '已完成过期', dueDate: '2026-09-01' })
    const now = new Date(2026, 8, 2, 10).getTime()
    const target = listTodos(now).find((i) => i.text === '已完成过期')
    toggleTodo(target.id) // 完成"已完成过期"

    const stats = buildTodoStats(listTodos(now))
    expect(stats.overdue).toBe(1) // 只有"已过期"未完成
    expect(stats.pending).toBe(2)
    expect(stats.done).toBe(1)
    expect(stats.doneRate).toBe(33)
  })

  it('空数据统计为 0', () => {
    const stats = buildTodoStats([])
    expect(stats.total).toBe(0)
    expect(stats.doneRate).toBe(0)
  })
})
