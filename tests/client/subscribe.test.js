import { describe, it, expect } from 'vitest'
import { shouldAskReminder, eventChanged } from '../../miniprogram/services/subscribe'

const NOW = Date.parse('2026-09-01T10:00:00')

describe('shouldAskReminder', () => {
  it('日程未启用时不引导', () => {
    expect(
      shouldAskReminder({ eventEnabled: false, eventDate: '2026-09-02', eventTime: '10:00' }, NOW)
    ).toBe(false)
  })

  it('未来的日程引导订阅', () => {
    expect(
      shouldAskReminder({ eventEnabled: true, eventDate: '2026-09-02', eventTime: '10:00' }, NOW)
    ).toBe(true)
  })

  it('过去的日程不引导（提醒无意义）', () => {
    expect(
      shouldAskReminder({ eventEnabled: true, eventDate: '2026-08-30', eventTime: '10:00' }, NOW)
    ).toBe(false)
  })

  it('当天已过时间点不引导，未到时间点引导', () => {
    expect(
      shouldAskReminder({ eventEnabled: true, eventDate: '2026-09-01', eventTime: '09:00' }, NOW)
    ).toBe(false)
    expect(
      shouldAskReminder({ eventEnabled: true, eventDate: '2026-09-01', eventTime: '18:00' }, NOW)
    ).toBe(true)
  })

  it('日期非法（没选日期）不引导，交给表单校验报错', () => {
    expect(shouldAskReminder({ eventEnabled: true, eventDate: '', eventTime: '10:00' }, NOW)).toBe(false)
    expect(shouldAskReminder({ eventEnabled: true, eventDate: '09-02', eventTime: '10:00' }, NOW)).toBe(false)
  })

  it('时间缺省按 10:00 处理', () => {
    expect(shouldAskReminder({ eventEnabled: true, eventDate: '2026-09-02', eventTime: '' }, NOW)).toBe(true)
  })
})

describe('eventChanged', () => {
  const ev = { type: 'interview', date: '2026-09-02', time: '10:00' }

  it('前后都无日程 → 未变化', () => {
    expect(eventChanged(null, null)).toBe(false)
  })

  it('从无到有 / 从有到无 → 变化', () => {
    expect(eventChanged(null, ev)).toBe(true)
    expect(eventChanged(ev, null)).toBe(true)
  })

  it('type / date / time 任一变化都算变化', () => {
    expect(eventChanged(ev, { type: 'written', date: '2026-09-02', time: '10:00' })).toBe(true)
    expect(eventChanged(ev, { type: 'interview', date: '2026-09-03', time: '10:00' })).toBe(true)
    expect(eventChanged(ev, { type: 'interview', date: '2026-09-02', time: '14:00' })).toBe(true)
  })

  it('完全相同 → 未变化（不重复弹授权）', () => {
    expect(eventChanged(ev, { type: 'interview', date: '2026-09-02', time: '10:00' })).toBe(false)
  })
})
