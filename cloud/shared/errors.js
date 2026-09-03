'use strict'

/**
 * 业务错误统一构造。
 * 云函数入口只认 err.code，把它转成 { code, message } 响应体；
 * 未带 code 的异常一律归为 500，避免内部细节外泄。
 */

/**
 * @param code {number} ERR 中的错误码
 * @param message {string} 可直接展示给用户的文案
 * @param extra {object=} 附加到响应 data 的字段（如 { blocked: true }）
 */
function bizError(code, message, extra) {
  const err = new Error(message)
  err.code = code
  err.extra = extra || null
  return err
}

module.exports = { bizError }
