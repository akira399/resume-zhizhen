import { describe, it, expect } from 'vitest'
import { shanghaiDateKey } from '../shared/dates'

/**
 * 额度以「上海时区日期键」划日，用户感知的「第二天」必须与我们重置额度的时刻一致。
 * 若改为 UTC，每天 08:00 前会产生「明明过了一天额度却没重置」的错觉。
 */
describe('shanghaiDateKey', () => {
  it('UTC 晚间归入上海次日', () => {
    // 2026-08-30T17:00:00Z = 上海 2026-08-31 01:00
    expect(shanghaiDateKey(new Date('2026-08-30T17:00:00Z'))).toBe('2026-08-31')
  })

  it('UTC 上午仍是上海同一天', () => {
    expect(shanghaiDateKey(new Date('2026-08-30T06:00:00Z'))).toBe('2026-08-30')
  })

  it('东八区午夜边界：上海 00:00 属于新的一天', () => {
    // 2026-08-29T16:00:00Z = 上海 2026-08-30 00:00
    expect(shanghaiDateKey(new Date('2026-08-29T16:00:00Z'))).toBe('2026-08-30')
  })
})
