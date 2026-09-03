import { describe, it, expect, beforeEach } from 'vitest'

/**
 * 题库收藏 / 已练标记（M5）测试。mock wx storage（本地）。
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
  getFavs,
  isFav,
  toggleFav,
  getDone,
  isDone,
  toggleDone,
  progress,
} from '../../miniprogram/services/qbank-store'

beforeEach(() => {
  Object.keys(memory).forEach((k) => delete memory[k])
})

describe('收藏', () => {
  it('初始无收藏', () => {
    expect(getFavs()).toEqual([])
    expect(isFav('题A')).toBe(false)
  })

  it('toggle 收藏/取消，返回新状态', () => {
    expect(toggleFav('题A')).toBe(true)
    expect(isFav('题A')).toBe(true)
    expect(toggleFav('题A')).toBe(false)
    expect(isFav('题A')).toBe(false)
  })

  it('收藏列表跨调用持久', () => {
    toggleFav('题A')
    toggleFav('题B')
    expect(getFavs()).toEqual(['题A', '题B'])
  })

  it('重复收藏去重', () => {
    toggleFav('题A')
    toggleFav('题A')
    expect(getFavs()).toEqual([])
  })
})

describe('已练标记', () => {
  it('toggle 已练/未练', () => {
    expect(isDone('题A')).toBe(false)
    expect(toggleDone('题A')).toBe(true)
    expect(isDone('题A')).toBe(true)
    expect(toggleDone('题A')).toBe(false)
  })

  it('已练列表独立于收藏', () => {
    toggleFav('题A')
    toggleDone('题B')
    expect(getFavs()).toEqual(['题A'])
    expect(getDone()).toEqual(['题B'])
  })
})

describe('progress 进度', () => {
  it('0 已练 → 0%', () => {
    expect(progress([{ q: 'a' }, { q: 'b' }])).toBe(0)
  })

  it('部分已练按比例取整', () => {
    toggleDone('a')
    expect(progress([{ q: 'a' }, { q: 'b' }])).toBe(50)
  })

  it('全已练 → 100%', () => {
    toggleDone('a')
    toggleDone('b')
    expect(progress([{ q: 'a' }, { q: 'b' }])).toBe(100)
  })

  it('空列表 → 0%', () => {
    expect(progress([])).toBe(0)
  })
})
