import { describe, it, expect, beforeEach } from 'vitest'

/**
 * 学习路径（P2-14）测试。mock wx storage。
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
  PATHS,
  isKnownStage,
  getPaths,
  toggleStage,
  resetPath,
} from '../../miniprogram/services/learning-path'

beforeEach(() => {
  Object.keys(memory).forEach((k) => delete memory[k])
})

describe('预设路径完整性', () => {
  it('6 个方向，每方向 4 阶段，阶段 key 全局唯一', () => {
    expect(PATHS.length).toBe(6)
    const keys = new Set()
    for (const p of PATHS) {
      expect(p.stages.length).toBe(4)
      for (const s of p.stages) {
        const full = p.key + ':' + s.key
        expect(keys.has(full)).toBe(false)
        keys.add(full)
        expect(s.items.length).toBeGreaterThan(0)
      }
    }
    expect(isKnownStage('backend', 'b1')).toBe(true)
    expect(isKnownStage('backend', 'x9')).toBe(false)
  })
})

describe('进度与切换', () => {
  it('toggleStage 切换阶段完成态', () => {
    expect(getPaths()[0].stages[0].checked).toBe(false)
    expect(toggleStage('backend', 'b1')).toBe(true)
    const paths = getPaths()
    expect(paths[0].stages[0].checked).toBe(true)
    expect(paths[0].done).toBe(1)
    expect(paths[0].total).toBe(4)
  })

  it('非法 key 拒绝', () => {
    expect(toggleStage('backend', 'x')).toBe(null)
  })

  it('resetPath 重置某方向进度', () => {
    toggleStage('backend', 'b1')
    toggleStage('frontend', 'f1')
    resetPath('backend')
    const paths = getPaths()
    expect(paths[0].done).toBe(0)
    expect(paths[1].done).toBe(1)
  })

  it('resetPath 无参清空全部', () => {
    toggleStage('backend', 'b1')
    resetPath()
    expect(getPaths().every((p) => p.done === 0)).toBe(true)
  })
})
