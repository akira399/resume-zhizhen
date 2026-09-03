import { describe, it, expect, beforeEach } from 'vitest'

/**
 * 数据备份与恢复（M7）测试。mock wx storage。
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

import store from '../../miniprogram/services/store'
import {
  BACKUP_KIND,
  BACKUP_VERSION,
  buildBackup,
  validateBackup,
  importBackup,
} from '../../miniprogram/services/backup'

beforeEach(() => {
  Object.keys(memory).forEach((k) => delete memory[k])
})

describe('buildBackup 导出', () => {
  it('打包全部本地数据，带标识与版本', () => {
    store.set('applications', [{ id: 'a', company: '字节' }])
    store.set('records', [{ id: 'r', biz: 'checklist' }])
    store.set('qbank_favs', ['题A'])
    store.set('qbank_done', ['题B'])
    store.set('todos', [{ id: 't', text: '跟进 HR' }])

    const backup = buildBackup()
    expect(backup.kind).toBe(BACKUP_KIND)
    expect(backup.version).toBe(BACKUP_VERSION)
    expect(typeof backup.exportedAt).toBe('number')
    expect(backup.data.applications).toEqual([{ id: 'a', company: '字节' }])
    expect(backup.data.records).toEqual([{ id: 'r', biz: 'checklist' }])
    expect(backup.data.qbank_favs).toEqual(['题A'])
    expect(backup.data.qbank_done).toEqual(['题B'])
    expect(backup.data.todos).toEqual([{ id: 't', text: '跟进 HR' }])
  })

  it('空数据导出为各空数组', () => {
    const backup = buildBackup()
    expect(backup.data.applications).toEqual([])
    expect(backup.data.records).toEqual([])
  })
})

describe('validateBackup 校验', () => {
  it('合法备份通过', () => {
    const backup = buildBackup()
    expect(validateBackup(backup).ok).toBe(true)
  })

  it('非对象 / kind 不符 / 版本不符 均拒绝', () => {
    expect(validateBackup(null).ok).toBe(false)
    expect(validateBackup({ kind: 'other', version: 1 }).ok).toBe(false)
    expect(validateBackup({ kind: BACKUP_KIND, version: 99, data: {} }).ok).toBe(false)
  })

  it('结构异常（非数组段）拒绝', () => {
    expect(validateBackup({ kind: BACKUP_KIND, version: 1, data: { applications: 'bad' } }).ok).toBe(false)
  })

  it('缺某段不拒绝（兼容未来备份）', () => {
    expect(validateBackup({ kind: BACKUP_KIND, version: 1, data: { applications: [] } }).ok).toBe(true)
  })
})

describe('importBackup 导入', () => {
  it('校验通过后覆盖写入并返回计数', () => {
    // 预置旧数据
    store.set('applications', [{ id: 'old' }])

    const backup = {
      kind: BACKUP_KIND,
      version: BACKUP_VERSION,
      exportedAt: Date.now(),
      data: {
        applications: [{ id: 'new', company: '腾讯' }],
        records: [{ id: 'r' }],
        qbank_favs: ['题A'],
        qbank_done: [],
        todos: [{ id: 't', text: '跟进' }],
      },
    }
    const res = importBackup(backup)
    expect(res.ok).toBe(true)
    expect(res.counts.applications).toBe(1)
    expect(res.counts.qbank_favs).toBe(1)
    expect(store.get('applications', [])).toEqual([{ id: 'new', company: '腾讯' }])
    expect(store.get('records', [])).toEqual([{ id: 'r' }])
    expect(store.get('todos', [])).toEqual([{ id: 't', text: '跟进' }])
  })

  it('非法备份不写入', () => {
    const before = store.get('applications', [])
    const res = importBackup({ kind: 'bad' })
    expect(res.ok).toBe(false)
    expect(store.get('applications', [])).toEqual(before)
  })
})
