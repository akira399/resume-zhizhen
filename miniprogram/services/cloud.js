'use strict'

/**
 * 云能力统一访问层。
 * 原生 wx.cloud：Taro 4.x 的 cloud 封装在基础库 ≥3.15 下 init 不生效，
 * 原生对象经 wx.cloud.init 后全部可用。
 * 访问以 try/catch 包裹：部分基础库在 init 前深访问 wx.cloud.* 会抛错。
 */
function cloud() {
  try {
    if (typeof wx !== 'undefined' && wx.cloud) return wx.cloud
  } catch (e) {
    // 部分基础库在 init 前访问云命名空间会抛错，走兜底
  }
  return null
}

module.exports = { cloud }
