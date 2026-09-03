'use strict'

/**
 * 数据备份与恢复（M7）。
 *
 * 把本地全部用户数据（投递记录 / 历史记录 / 收藏 / 已练标记）
 * 打包成一个带校验头的 JSON 对象，导出可复制到任何地方保存；
 * 导入时校验结构后覆盖写入本地。
 *
 * 注意：本文件位于 miniprogram/ 下，**禁止使用 ?. / ?? / for await**。
 */

const store = require('./store')

/** 备份文件标识与格式版本 */
const BACKUP_KIND = 'jlz-backup'
const BACKUP_VERSION = 1

/** 参与备份的本地数据键 */
const SECTIONS = [
  { key: 'applications', label: '投递记录' },
  { key: 'records', label: '历史记录' },
  { key: 'qbank_favs', label: '题库收藏' },
  { key: 'qbank_done', label: '已练标记' },
  { key: 'todos', label: '待办清单' },
]

/** 收集全部数据为可序列化对象 */
function collectData() {
  const data = {}
  for (let i = 0; i < SECTIONS.length; i++) {
    const key = SECTIONS[i].key
    const rows = store.get(key, [])
    data[key] = Array.isArray(rows) ? rows : []
  }
  return data
}

/** 生成备份对象 */
function buildBackup() {
  return {
    kind: BACKUP_KIND,
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    data: collectData(),
  }
}

/** 校验备份对象结构是否合法。返回 {ok, reason?} */
function validateBackup(obj) {
  const src = obj && typeof obj === 'object' ? obj : null
  if (!src) return { ok: false, reason: '不是有效的备份数据' }
  if (src.kind !== BACKUP_KIND) return { ok: false, reason: '不是「简历智诊」的备份数据' }
  if (Number(src.version) !== BACKUP_VERSION) {
    return { ok: false, reason: '备份版本不兼容（当前支持 v' + BACKUP_VERSION + '）' }
  }
  const data = src.data
  if (!data || typeof data !== 'object') return { ok: false, reason: '备份内容为空' }

  for (let i = 0; i < SECTIONS.length; i++) {
    const rows = data[SECTIONS[i].key]
    if (rows !== undefined && !Array.isArray(rows)) {
      return { ok: false, reason: '备份内容结构异常（' + SECTIONS[i].label + '）' }
    }
  }
  return { ok: true }
}

/**
 * 导入备份（校验通过后覆盖写入本地）。
 * @param obj {object} 解析后的备份对象
 * @returns {{ok:boolean, reason?:string, counts?:object}}
 */
function importBackup(obj) {
  const checked = validateBackup(obj)
  if (!checked.ok) return checked

  const data = obj.data
  const counts = {}
  for (let i = 0; i < SECTIONS.length; i++) {
    const key = SECTIONS[i].key
    const rows = Array.isArray(data[key]) ? data[key] : []
    store.set(key, rows)
    counts[key] = rows.length
  }
  return { ok: true, counts: counts }
}

module.exports = {
  BACKUP_KIND: BACKUP_KIND,
  BACKUP_VERSION: BACKUP_VERSION,
  SECTIONS: SECTIONS,
  buildBackup: buildBackup,
  validateBackup: validateBackup,
  importBackup: importBackup,
}
