'use strict'

/**
 * 全局配置读取（config 集合）——让「改配置不发版」真正成立（docs/10 B5）。
 *
 * 两个设计点：
 *   1. **工厂注入 db**：与 security.js 的 makeSecurityChecker 同一套路，便于单测造假。
 *   2. **进程内缓存**：云函数实例会被复用，5 分钟内不重复读库；
 *      配置是低频变更的运营项，短暂不一致可接受，换来的是每次调用少一次数据库读。
 *
 * 集合缺失或读取失败时静默回落到 CONFIG_DEFAULTS，
 * 保证「没配过 config」不会让线上功能挂掉。
 */

const { CONFIG_DEFAULTS, COLLECTIONS } = require('./constants')

const CACHE_TTL_MS = 5 * 60 * 1000

/** djb2 字符串哈希：用于生成配置版本，供前端判断配置是否变化 */
function hashString(str) {
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) | 0
  }
  return (h >>> 0).toString(36)
}

/**
 * @param db cloud.database() 的返回值
 * @returns {{ all():Promise<object>, get(key, fallback):Promise<any>,
 *             number(key):Promise<number>, string(key):Promise<string>,
 *             version():Promise<string>, invalidate():void }}
 */
function makeConfigStore(db) {
  let cache = null

  function isFresh() {
    return Boolean(cache) && Date.now() - cache.loadedAt < CACHE_TTL_MS
  }

  async function load() {
    if (isFresh()) return cache.values

    const values = Object.assign({}, CONFIG_DEFAULTS)
    const res = await db
      .collection(COLLECTIONS.CONFIG)
      .limit(200)
      .get()
      .catch(function () {
        return null
      })

    const rows = (res && res.data) || []
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (row && typeof row.key === 'string') {
        values[row.key] = row.value
      }
    }

    cache = { values: values, loadedAt: Date.now(), version: hashString(JSON.stringify(values)) }
    return cache.values
  }

  return {
    all: function () {
      return load()
    },

    get: async function (key, fallback) {
      const values = await load()
      return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : fallback
    },

    number: async function (key) {
      const v = Number(await this.get(key, NaN))
      return isFinite(v) ? v : Number(CONFIG_DEFAULTS[key])
    },

    string: async function (key) {
      const v = await this.get(key, '')
      return typeof v === 'string' ? v : String(CONFIG_DEFAULTS[key] || '')
    },

    version: async function () {
      await load()
      return cache.version
    },

    invalidate: function () {
      cache = null
    },
  }
}

module.exports = { makeConfigStore, hashString, CACHE_TTL_MS }
