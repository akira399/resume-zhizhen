'use strict'

/**
 * 本地存储层（Local-first 核心，v1.1 去 AI 化）。
 *
 * 统一封装 wx 本地存储：前缀隔离、JSON 序列化、异常兜底。
 * 新产品默认「数据不出手机」——简历、记录、配置全部走这里，
 * 从根上消除「数据上传云端」的隐私与合规负担。
 *
 * 注意：本文件位于 miniprogram/ 下，**禁止使用 ?. / ?? / for await**
 * ——微信预览与上传管线的 JS 解析器不认（见 HANDOFF.md 第四节）。
 */

/** 全局前缀，避免与未来可能出现的其他本地数据冲突 */
const PREFIX = 'jlz_'

/**
 * 读取。key 省略前缀；不存在或解析失败时返回 fallback。
 */
function get(key, fallback) {
  try {
    const v = wx.getStorageSync(PREFIX + key)
    return v === '' || v === undefined || v === null ? fallback : v
  } catch (e) {
    return fallback
  }
}

/**
 * 写入。返回是否成功（storage 满 / 隐私未授权等场景会失败）。
 */
function set(key, value) {
  try {
    wx.setStorageSync(PREFIX + key, value)
    return true
  } catch (e) {
    return false
  }
}

/** 删除。返回是否真的删了。 */
function remove(key) {
  try {
    wx.removeStorageSync(PREFIX + key)
    return true
  } catch (e) {
    return false
  }
}

module.exports = {
  PREFIX: PREFIX,
  get: get,
  set: set,
  remove: remove,
}
