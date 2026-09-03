import { describe, it, expect } from 'vitest'
import { makeConfigStore, hashString } from '../shared/config-store'
import { CONFIG_DEFAULTS, CONFIG_KEYS } from '../shared/constants'

/** 造一个最小可用的 db 假实现：只关心 collection().limit().get() */
function fakeDb(rows) {
  const state = { reads: 0 }
  return {
    state,
    collection(name) {
      expect(name).toBe('config')
      return {
        limit() {
          return {
            async get() {
              state.reads++
              if (state.fail) throw new Error('collection not exist')
              return { data: rows }
            },
          }
        },
      }
    },
  }
}

const rows = [
  { key: CONFIG_KEYS.AI_MODEL, value: 'hy3-preview' },
  { key: CONFIG_KEYS.DAILY_LIMIT, value: 8 },
]

describe('makeConfigStore', () => {
  it('集合读取正常时覆盖默认值', async () => {
    const store = makeConfigStore(fakeDb(rows))
    const all = await store.all()
    expect(all[CONFIG_KEYS.AI_MODEL]).toBe('hy3-preview')
    expect(all[CONFIG_KEYS.DAILY_LIMIT]).toBe(8)
    // 未在集合中配置的键仍取默认值
    expect(all[CONFIG_KEYS.AI_PROVIDER]).toBe(CONFIG_DEFAULTS[CONFIG_KEYS.AI_PROVIDER])
  })

  it('集合缺失时静默回落默认值，不让线上功能挂掉', async () => {
    const db = fakeDb([])
    db.state.fail = true
    const store = makeConfigStore(db)
    expect(await store.number(CONFIG_KEYS.DAILY_LIMIT)).toBe(CONFIG_DEFAULTS[CONFIG_KEYS.DAILY_LIMIT])
  })

  it('number() 处理非法值：回落到默认值而不是 NaN', async () => {
    const store = makeConfigStore(fakeDb([{ key: CONFIG_KEYS.DAILY_LIMIT, value: 'not-a-number' }]))
    const v = await store.number(CONFIG_KEYS.DAILY_LIMIT)
    expect(Number.isFinite(v)).toBe(true)
    expect(v).toBe(CONFIG_DEFAULTS[CONFIG_KEYS.DAILY_LIMIT])
  })

  it('未知 key 返回传入的 fallback', async () => {
    const store = makeConfigStore(fakeDb(rows))
    expect(await store.get('some.unknown.key', 'fallback')).toBe('fallback')
  })

  it('进程内缓存：TTL 内重复读取只查库一次', async () => {
    const db = fakeDb(rows)
    const store = makeConfigStore(db)
    await store.all()
    await store.all()
    await store.number(CONFIG_KEYS.DAILY_LIMIT)
    expect(db.state.reads).toBe(1)
  })

  it('invalidate 后重新读库（配置热更新的逃生通道）', async () => {
    const db = fakeDb(rows)
    const store = makeConfigStore(db)
    await store.all()
    store.invalidate()
    await store.all()
    expect(db.state.reads).toBe(2)
  })

  it('version 在同一份配置下稳定，配置变化时改变', async () => {
    expect(hashString('a')).toBe(hashString('a'))
    expect(hashString('a')).not.toBe(hashString('b'))

    const a = makeConfigStore(fakeDb(rows))
    const b = makeConfigStore(fakeDb(rows))
    expect(await a.version()).toBe(await b.version())

    const c = makeConfigStore(fakeDb([{ key: CONFIG_KEYS.DAILY_LIMIT, value: 99 }]))
    expect(await c.version()).not.toBe(await a.version())
  })
})
