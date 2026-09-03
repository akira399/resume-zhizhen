import { describe, it, expect } from 'vitest'
import { recruitStage } from '../../miniprogram/services/recruit'

const DAY = 24 * 60 * 60 * 1000

/** 构造某年某月某日的本地时间戳（与 recruit.js 的 new Date(y, m, d) 同口径） */
function at(y, m, d) {
  return new Date(y, m - 1, d, 12).getTime() // 取正午避免边界抖动
}

describe('recruitStage', () => {
  it('秋招正式批早期（8 月中）显示阶段描述', () => {
    const s = recruitStage(at(2026, 8, 15))
    expect(s.name).toBe('秋招正式批')
    expect(s.text).toContain('进行中')
    expect(s.text).toContain('网申高峰')
    expect(s.nextName).toBe('秋招补录')
  })

  it('阶段开始 45 天后切换为倒计时文案', () => {
    // 8/1 开始，10/1 已 61 天 → 显示距秋招补录的天数
    const s = recruitStage(at(2026, 10, 1))
    expect(s.name).toBe('秋招正式批')
    expect(s.text).toContain('距秋招补录还有')
    expect(s.days).toBe(31) // 10/1 → 11/1
  })

  it('跨年：12 月的下一节点是次年春招', () => {
    const s = recruitStage(at(2026, 12, 20))
    expect(s.name).toBe('秋招补录')
    expect(s.nextName).toBe('春招')
    expect(s.days).toBe(71) // 12/20 → 次年 3/1
  })

  it('1 月处于秋招补录与春招之间，当前阶段仍是秋招补录', () => {
    const s = recruitStage(at(2027, 1, 15))
    expect(s.name).toBe('秋招补录')
    expect(s.nextName).toBe('春招')
  })

  it('5 月底春招尾声之后，下一节点是 6/1 秋招提前批', () => {
    const s = recruitStage(at(2026, 5, 20))
    expect(s.name).toBe('春招尾声')
    expect(s.nextName).toBe('秋招提前批')
    expect(s.days).toBe(12)
  })

  it('节点当天即进入新阶段', () => {
    const s = recruitStage(at(2026, 6, 1))
    expect(s.name).toBe('秋招提前批')
    expect(s.text).toContain('进行中')
  })

  it('文案始终非空且包含阶段名', () => {
    // 全年每月扫一遍，保证任何日期都有合理文案
    for (let m = 1; m <= 12; m++) {
      const s = recruitStage(at(2026, m, 15))
      expect(s).toBeTruthy()
      expect(s.text).toContain(s.name)
    }
  })
})
