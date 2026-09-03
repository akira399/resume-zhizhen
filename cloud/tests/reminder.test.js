import { describe, it, expect } from 'vitest'
import { makeFakeDb } from './helpers/fake-db'
import { makeReminder, buildMessage, ERR_NOT_SUBSCRIBED, DAY_MS } from '../functions/reminder/src/reminder'
import { COLLECTIONS } from '../shared/constants'

const NOW = Date.parse('2026-09-01T10:00:00')

function appRow(overrides) {
  return Object.assign(
    {
      _openid: 'openid-a',
      company: '字节跳动',
      position: '后端开发工程师',
      status: 'interviewing',
      note: '带好简历',
      remindSubscribed: true,
      nextEvent: { type: 'interview', date: '2026-09-02', time: '10:00', atMs: NOW + 24 * 60 * 60 * 1000 },
    },
    overrides
  )
}

function setup(rows, senderImpl) {
  const db = makeFakeDb()
  db._seed(COLLECTIONS.APPLICATIONS, rows)
  const sent = []
  const sender =
    senderImpl ||
    function (msg) {
      sent.push(msg)
      return Promise.resolve({ errCode: 0 })
    }
  const reminder = makeReminder({
    applicationsCol: db.collection(COLLECTIONS.APPLICATIONS),
    sender: sender,
    templateId: 'TPL_ID_1',
  })
  return {
    db,
    sent,
    reminder,
    row: () => db._all(COLLECTIONS.APPLICATIONS)[0],
    rows: () => db._all(COLLECTIONS.APPLICATIONS),
  }
}

describe('reminder.run', () => {
  it('模板 ID 为空时静默跳过，不查询不发送', async () => {
    const db = makeFakeDb()
    db._seed(COLLECTIONS.APPLICATIONS, [appRow({})])
    const sent = []
    const reminder = makeReminder({
      applicationsCol: db.collection(COLLECTIONS.APPLICATIONS),
      sender: (m) => sent.push(m),
      templateId: '',
    })
    const report = await reminder.run(NOW)

    expect(report.enabled).toBe(false)
    expect(sent).toHaveLength(0)
    expect(db._all(COLLECTIONS.APPLICATIONS)[0].remindSubscribed).toBe(true)
  })

  it('24h 窗口内的日程被发送，发送后清标记并写 remindedAt（幂等）', async () => {
    const ctx = setup([appRow({ nextEvent: { type: 'interview', date: '2026-09-01', time: '18:00', atMs: NOW + 8 * 60 * 60 * 1000 } })])
    const report = await ctx.reminder.run(NOW)

    expect(report.sent).toBe(1)
    expect(ctx.sent).toHaveLength(1)
    expect(ctx.sent[0].touser).toBe('openid-a')
    expect(ctx.sent[0].templateId).toBe('TPL_ID_1')
    const row = ctx.row()
    expect(row.remindSubscribed).toBe(false)
    expect(row.remindedAt).toBe(NOW)

    // 幂等：再跑一轮不会再发（标记已清）
    const second = await ctx.reminder.run(NOW)
    expect(second.sent).toBe(0)
    expect(ctx.sent).toHaveLength(1)
  })

  it('已过期与超过 24h 的日程都不发送', async () => {
    const ctx = setup([
      appRow({ _id: 'past', nextEvent: { type: 'interview', date: '2026-09-01', time: '09:00', atMs: NOW - 60 * 60 * 1000 } }),
      appRow({ _id: 'far', nextEvent: { type: 'written', date: '2026-09-05', time: '10:00', atMs: NOW + 5 * DAY_MS } }),
    ])
    const report = await ctx.reminder.run(NOW)

    expect(report.due).toBe(0)
    expect(ctx.sent).toHaveLength(0)
    // 标记保留：等进入窗口后仍会提醒
    expect(ctx.rows().every((r) => r.remindSubscribed === true)).toBe(true)
  })

  it('43101（用户未订阅）清标记并记 not_subscribed，不再空扫', async () => {
    const ctx = setup([appRow({})], function () {
      const e = new Error('user refused')
      e.errCode = ERR_NOT_SUBSCRIBED
      return Promise.reject(e)
    })
    const report = await ctx.reminder.run(NOW)

    expect(report.cleared).toBe(1)
    expect(report.sent).toBe(0)
    const row = ctx.row()
    expect(row.remindSubscribed).toBe(false)
    expect(row.remindError).toBe('not_subscribed')
  })

  it('其他发送错误保留标记 + 记录 remindError，下轮重试', async () => {
    let calls = 0
    const ctx = setup([appRow({})], function () {
      calls++
      if (calls === 1) return Promise.reject(new Error('internal error'))
      return Promise.resolve({ errCode: 0 })
    })
    const first = await ctx.reminder.run(NOW)
    expect(first.failed).toBe(1)
    expect(ctx.row().remindSubscribed).toBe(true)
    expect(ctx.row().remindError).toBe('internal error')

    // 第二轮重试成功
    const second = await ctx.reminder.run(NOW)
    expect(second.sent).toBe(1)
    expect(ctx.row().remindSubscribed).toBe(false)
  })

  it('多用户混合场景：各自独立结算', async () => {
    const ctx = setup([
      appRow({ _id: 'a1', _openid: 'user-a' }),
      appRow({ _id: 'b1', _openid: 'user-b' }),
      appRow({ _id: 'c1', _openid: 'user-c', remindSubscribed: false }),
    ])
    const report = await ctx.reminder.run(NOW)

    expect(report.due).toBe(2)
    expect(report.sent).toBe(2)
    const byUser = {}
    ctx.rows().forEach((r) => (byUser[r._openid] = r.remindSubscribed))
    expect(byUser['user-a']).toBe(false)
    expect(byUser['user-b']).toBe(false)
    expect(byUser['user-c']).toBe(false) // 本来就没订阅，未被触碰
  })
})

describe('buildMessage', () => {
  it('消息字段完整且 thing 字段截断到 20 字', () => {
    const msg = buildMessage(
      appRow({
        company: '一家名字特别特别特别特别特别特别长的公司名称超出限制',
        note: '',
      }),
      'TPL_ID_1'
    )

    // 字段序号与已选用模板（tid 809）的 content 一致：thing4/thing6/time2/thing8
    expect(msg.page).toBe('pages/kanban/index')
    expect(msg.data.thing4.value.length).toBeLessThanOrEqual(20)
    expect(msg.data.thing6.value).toBe('后端开发工程师')
    expect(msg.data.time2.value).toBe('2026-09-02 10:00')
    expect(msg.data.thing8.value).toBe('无备注') // 空备注兜底
  })
})
