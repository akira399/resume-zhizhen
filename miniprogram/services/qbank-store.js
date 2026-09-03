'use strict'

/**
 * 题库收藏 / 已练标记（M5）。
 *
 * 收藏与已练状态存本地 storage（services/store.js），
 * 按题面文本（q）作唯一键——题库数据更新时题面不变即可保留状态。
 *
 * 注意：本文件位于 miniprogram/ 下，**禁止使用 ?. / ?? / for await**。
 */

const store = require('./store')

const FAVS_KEY = 'qbank_favs'
const DONE_KEY = 'qbank_done'

function readList(key) {
  const rows = store.get(key, [])
  return Array.isArray(rows) ? rows : []
}

function writeList(key, list) {
  store.set(key, list)
}

/** 收藏列表 */
function getFavs() {
  return readList(FAVS_KEY)
}

function isFav(q) {
  return readList(FAVS_KEY).indexOf(q) !== -1
}

/** 切换收藏，返回新状态（true = 已收藏） */
function toggleFav(q) {
  const list = readList(FAVS_KEY)
  const i = list.indexOf(q)
  if (i === -1) {
    list.push(q)
    writeList(FAVS_KEY, list)
    return true
  }
  list.splice(i, 1)
  writeList(FAVS_KEY, list)
  return false
}

/** 已练题列表 */
function getDone() {
  return readList(DONE_KEY)
}

function isDone(q) {
  return readList(DONE_KEY).indexOf(q) !== -1
}

/** 切换已练标记，返回新状态（true = 已练） */
function toggleDone(q) {
  const list = readList(DONE_KEY)
  const i = list.indexOf(q)
  if (i === -1) {
    list.push(q)
    writeList(DONE_KEY, list)
    return true
  }
  list.splice(i, 1)
  writeList(DONE_KEY, list)
  return false
}

/** 练习进度（0-100，取整） */
function progress(list) {
  const total = Array.isArray(list) ? list.length : 0
  if (total === 0) return 0
  return Math.round((getDone().length / total) * 100)
}

module.exports = {
  FAVS_KEY: FAVS_KEY,
  DONE_KEY: DONE_KEY,
  getFavs: getFavs,
  isFav: isFav,
  toggleFav: toggleFav,
  getDone: getDone,
  isDone: isDone,
  toggleDone: toggleDone,
  progress: progress,
}
