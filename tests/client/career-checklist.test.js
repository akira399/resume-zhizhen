import { describe, it, expect, beforeEach } from 'vitest'

/**
 * 求职 Checklist（P2-15）测试。mock wx storage。
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
  STAGES,
  isKnownKey,
  getStages,
  toggle,
  progress,
  reset,
} from '../../miniprogram/services/career-checklist'

beforeEach(() => {
  Object.keys(memory).forEach((k) => delete memory[k])
})

describe('预设清单完整性', () => {
  it('5 个阶段，共 24 项，key 全局唯一', () => {
    expect(STAGES.length).toBe(5)
    const keys = new Set()
    let total = 0
    for (const s of STAGES) {
      expect(s.items.length).toBeGreaterThan(0)
      total += s.items.length
      for (const it of s.items) {
        expect(keys.has(it.key)).toBe(false)
        keys.add(it.key)
      }
    }
    expect(total).toBe(24)
    expect(isKnownKey('r1')).toBe(true)
    expect(isKnownKey('nope')).toBe(false)
  })
})

describe('勾选与进度', () => {
  it('toggle 切换勾选态并持久化', () => {
    expect(getStages()[0].items[0].checked).toBe(false)
    expect(toggle('r1')).toBe(true)
    expect(getStages()[0].items[0].checked).toBe(true)
    expect(toggle('r1')).toBe(false)
  })

  it('非法 key 拒绝', () => {
    expect(toggle('not-a-key')).toBe(null)
  })

  it('progress 计算总进度', () => {
    toggle('r1')
    toggle('r2')
    const p = progress()
    expect(p.total).toBe(24)
    expect(p.done).toBe(2)
  })

  it('阶段内进度统计', () => {
    toggle('r1')
    toggle('r2')
    toggle('r3')
    const stages = getStages()
    expect(stages[0].done).toBe(3)
    expect(stages[0].total).toBe(5)
    expect(stages[1].done).toBe(0)
  })

  it('reset 清空全部勾选', () => {
    toggle('r1')
    reset()
    expect(progress().done).toBe(0)
  })
})
