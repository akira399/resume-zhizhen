import { describe, it, expect } from 'vitest'
import {
  STATUSES,
  groupByStatus,
  upcomingEvents,
  boardSummary,
  collectResumeVersions,
  validateApplication,
  normalizeEvent,
} from '../../miniprogram/services/kanban'

/**
 * F7 求职看板的视图模型测试（纯函数，不碰数据库）。
 *
 * 锁定三条规则：
 * 1. 分组顺序与 STATUSES 恒定——看板列顺序不能随数据漂移；
 * 2. 日程排序：有日程的记录浮到组内最前（按时间升序），日程区只收
 *    「今天~未来 14 天」，今天的日程哪怕时间已过也保留（提醒感）；
 * 3. 表单校验与日程归一化的兜底——脏数据不能进库。
 */

// 固定「现在」：2026-08-31 12:00 本地时间，避免测试随真实日期漂移
const NOW = new Date(2026, 7, 31, 12, 0, 0).getTime()

function row(overrides) {
  return Object.assign(
    {
      _id: 'r',
      company: '公司',
      position: '岗位',
      status: 'applied',
      updatedAt: 1000,
      nextEvent: null,
    },
    overrides
  )
}

describe('groupByStatus', () => {
  it('分组顺序与 STATUSES 恒定，空组也返回', () => {
    const groups = groupByStatus([])
    expect(groups.map((g) => g.key)).toEqual(STATUSES.map((s) => s.key))
    expect(groups.every((g) => g.items.length === 0)).toBe(true)
  })

  it('未知状态的记录不渲染，不抛错', () => {
    const groups = groupByStatus([row({ status: 'ghost' })])
    expect(groups.every((g) => g.items.length === 0)).toBe(true)
  })

  it('组内：有日程的在前且按日程时间升序，无日程的按 updatedAt 降序', () => {
    const rows = [
      row({ _id: 'a', status: 'interviewing', updatedAt: 300 }),
      row({ _id: 'b', status: 'interviewing', nextEvent: { atMs: NOW + 3 * 86400000 }, updatedAt: 100 }),
      row({ _id: 'c', status: 'interviewing', nextEvent: { atMs: NOW + 1 * 86400000 }, updatedAt: 200 }),
      row({ _id: 'd', status: 'interviewing', updatedAt: 500 }),
    ]
    const g = groupByStatus(rows).filter((x) => x.key === 'interviewing')[0]
    expect(g.items.map((i) => i._id)).toEqual(['c', 'b', 'd', 'a'])
  })
})

describe('upcomingEvents', () => {
  it('只收今天~未来 14 天：过去的不进、太远的不进', () => {
    const rows = [
      row({ _id: 'past', nextEvent: { type: 'interview', date: '2026-08-30', time: '10:00', atMs: NOW - 86400000 } }),
      row({ _id: 'far', nextEvent: { type: 'interview', date: '2026-09-20', time: '10:00', atMs: NOW + 20 * 86400000 } }),
      row({ _id: 'in', nextEvent: { type: 'written', date: '2026-09-05', time: '14:00', atMs: NOW + 5 * 86400000 } }),
    ]
    const events = upcomingEvents(rows, NOW)
    expect(events.map((e) => e.id)).toEqual(['in'])
    expect(events[0].typeLabel).toBe('笔试')
  })

  it('今天的日程哪怕时间已过也保留（isToday 高亮）', () => {
    const rows = [
      row({ _id: 'today9am', nextEvent: { type: 'interview', date: '2026-08-31', time: '09:00', atMs: NOW - 3600000 } }),
    ]
    const events = upcomingEvents(rows, NOW)
    expect(events).toHaveLength(1)
    expect(events[0].isToday).toBe(true)
  })

  it('按时间升序输出', () => {
    const rows = [
      row({ _id: 'late', nextEvent: { type: 'interview', date: '2026-09-02', time: '10:00', atMs: NOW + 2 * 86400000 } }),
      row({ _id: 'soon', nextEvent: { type: 'interview', date: '2026-09-01', time: '10:00', atMs: NOW + 86400000 } }),
    ]
    expect(upcomingEvents(rows, NOW).map((e) => e.id)).toEqual(['soon', 'late'])
  })
})

describe('validateApplication', () => {
  const base = {
    company: '字节跳动',
    position: '后端开发',
    status: 'applied',
    source: '内推',
    resumeVersion: 'V3',
    note: '',
    eventEnabled: false,
  }

  it('合法表单通过并归一化', () => {
    const res = validateApplication(base)
    expect(res.ok).toBe(true)
    expect(res.value.company).toBe('字节跳动')
    expect(res.value.nextEvent).toBe(null)
  })

  it('公司与岗位必填，超长拦截', () => {
    expect(validateApplication(Object.assign({}, base, { company: '  ' })).ok).toBe(false)
    expect(validateApplication(Object.assign({}, base, { position: '' })).ok).toBe(false)
    expect(validateApplication(Object.assign({}, base, { company: '字'.repeat(41) })).ok).toBe(false)
  })

  it('状态必须在枚举内', () => {
    expect(validateApplication(Object.assign({}, base, { status: 'ghost' })).ok).toBe(false)
  })

  it('开启日程但没选日期 → 拦截；合法日期 → 生成 nextEvent', () => {
    const noDate = validateApplication(
      Object.assign({}, base, { eventEnabled: true, eventType: 'interview', eventDate: '' })
    )
    expect(noDate.ok).toBe(false)

    const ok = validateApplication(
      Object.assign({}, base, { eventEnabled: true, eventType: 'written', eventDate: '2026-09-05', eventTime: '14:30' })
    )
    expect(ok.ok).toBe(true)
    expect(ok.value.nextEvent).toEqual({ type: 'written', date: '2026-09-05', time: '14:30', atMs: new Date(2026, 8, 5, 14, 30).getTime() })
  })

  it('备注超长截断而不是报错——备注是辅助信息', () => {
    const res = validateApplication(Object.assign({}, base, { note: 'x'.repeat(500) }))
    expect(res.ok).toBe(true)
    expect(res.value.note.length).toBe(200)
  })
})

describe('normalizeEvent', () => {
  it('类型非法回落 interview，时间缺省 10:00', () => {
    const res = normalizeEvent('ghost', '2026-09-05', '')
    expect(res.ok).toBe(true)
    expect(res.value.type).toBe('interview')
    expect(res.value.time).toBe('10:00')
  })

  it('日期格式不对拒绝', () => {
    expect(normalizeEvent('interview', '2026/09/05', '').ok).toBe(false)
    expect(normalizeEvent('interview', '明天', '').ok).toBe(false)
  })
})

describe('boardSummary / collectResumeVersions', () => {
  it('统计总数与各状态计数', () => {
    const groups = groupByStatus([
      row({ status: 'applied' }),
      row({ status: 'applied' }),
      row({ status: 'offer' }),
    ])
    const s = boardSummary(groups)
    expect(s.total).toBe(3)
    expect(s.counts.applied).toBe(2)
    expect(s.counts.offer).toBe(1)
  })

  it('简历版本去重保序，空值跳过', () => {
    const versions = collectResumeVersions([
      row({ resumeVersion: 'V2' }),
      row({ resumeVersion: 'V1' }),
      row({ resumeVersion: 'V2' }),
      row({ resumeVersion: '' }),
    ])
    expect(versions).toEqual(['V2', 'V1'])
  })
})
