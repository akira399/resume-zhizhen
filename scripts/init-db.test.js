import { describe, it, expect } from 'vitest'
import { buildPlan, buildIndexes, consoleUrls, isIndexConflict } from './init-db'
import { COLLECTIONS, CONFIG_KEYS, CONFIG_DEFAULTS } from '../cloud/shared/constants'

/**
 * 建库计划的守卫测试。
 * 云数据库的索引一旦漏建，历史列表就会全表扫描——这类问题在数据量小的时候
 * 完全看不出来，等上线后变慢再排查代价很高，因此在计划层就锁死。
 */
describe('buildPlan', () => {
  const plan = buildPlan()

  it('覆盖全部业务集合', () => {
    const expected = Object.values(COLLECTIONS)
    for (const name of expected) {
      expect(plan.collections).toContain(name)
    }
  })

  it('config 播种项与 CONFIG_DEFAULTS 一一对应', () => {
    expect(plan.configSeeds).toHaveLength(Object.keys(CONFIG_DEFAULTS).length)
    for (const key of Object.keys(CONFIG_DEFAULTS)) {
      const seed = plan.configSeeds.find((s) => s.key === key)
      expect(seed).toBeDefined()
      expect(seed.value).toEqual(CONFIG_DEFAULTS[key])
    }
  })

  it('播种值均为 JSON 可序列化（要存进数据库）', () => {
    for (const seed of plan.configSeeds) {
      expect(() => JSON.parse(JSON.stringify(seed.value))).not.toThrow()
    }
  })
})

describe('buildIndexes', () => {
  const indexes = buildIndexes()

  it('每个历史类集合都有 _openid + createdAt 倒序索引', () => {
    for (const coll of [COLLECTIONS.DIAGNOSES, COLLECTIONS.JD_MATCHES, COLLECTIONS.INTERVIEWS]) {
      const idx = indexes.find((i) => i.collection === coll && i.fields.some((f) => f.name === 'createdAt'))
      expect(idx, `${coll} 缺少分页索引`).toBeDefined()
      const createdAt = idx.fields.find((f) => f.name === 'createdAt')
      expect(createdAt.order).toBe(-1)
    }
  })

  it('users._openid 唯一索引存在（登录与额度每次调用都命中）', () => {
    const idx = indexes.find((i) => i.collection === COLLECTIONS.USERS && i.unique)
    expect(idx).toBeDefined()
    expect(idx.fields[0].name).toBe('_openid')
  })

  it('看板的状态分组与日程扫描索引齐备', () => {
    const byStatus = indexes.find((i) => i.collection === COLLECTIONS.APPLICATIONS && i.name.includes('status'))
    const byEvent = indexes.find((i) => i.collection === COLLECTIONS.APPLICATIONS && i.name.includes('nextEvent'))
    expect(byStatus).toBeDefined()
    expect(byEvent).toBeDefined()
    // 字段名必须与 services/kanban.normalizeEvent 实际写入的一致：
    // 曾按文档草稿写成 scheduledAt，索引建了但查询永远命中不了
    expect(byEvent.fields.map((f) => f.name)).toContain('nextEvent.atMs')
  })

  it('索引引用的集合都在集合清单内（避免给不存在的集合建索引）', () => {
    const names = Object.values(COLLECTIONS)
    for (const idx of indexes) {
      expect(names).toContain(idx.collection)
    }
  })

  it('索引名唯一，且字段非空', () => {
    const seen = new Set()
    for (const idx of indexes) {
      const full = idx.collection + '.' + idx.name
      expect(seen.has(full)).toBe(false)
      seen.add(full)
      expect(idx.fields.length).toBeGreaterThan(0)
    }
  })
})

describe('isIndexConflict', () => {
  /**
   * 平台可能已自动建过同名索引但选项不同（实测 users._openid_1 就是非唯一的），
   * 此时 create 会失败，必须先 drop 再 create。识别错了会导致索引永远建不上。
   */
  it('识别「同名索引已存在但选项不同」', () => {
    expect(
      isIndexConflict({
        ok: false,
        errmsg:
          '索引对应的字段已经存在 ((IndexOptionsConflict) Index with name: _openid_1 already exists with different options)',
      })
    ).toBe(true)
  })

  it('不把其他错误误判为索引冲突（否则会误删索引）', () => {
    expect(isIndexConflict({ ok: false, errmsg: 'collection not found' })).toBe(false)
    expect(isIndexConflict({ ok: false, errmsg: 'invalid credential' })).toBe(false)
    expect(isIndexConflict({ ok: false })).toBe(false)
    expect(isIndexConflict({ ok: true, errmsg: '' })).toBe(false)
  })
})

describe('consoleUrls', () => {
  it('生成带环境 ID 的深链', () => {
    const urls = consoleUrls('env-123')
    expect(urls.database).toContain('envId=env-123')
    expect(urls.collection('diagnoses')).toContain('/db/doc/collection/diagnoses')
  })
})

describe('配置项完整性', () => {
  it('关键运营配置都在默认值里（否则热配置形同虚设）', () => {
    for (const key of [
      CONFIG_KEYS.AI_PROVIDER,
      CONFIG_KEYS.AI_MODEL,
      CONFIG_KEYS.DAILY_LIMIT,
      CONFIG_KEYS.SECURITY_CHUNK_CHARS,
      CONFIG_KEYS.STALE_AFTER_MS,
    ]) {
      expect(CONFIG_DEFAULTS[key]).toBeDefined()
    }
  })
})
