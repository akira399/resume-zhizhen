'use strict'

const { cloud } = require('./cloud')

/** 业务错误：code 与云函数返回的 code 一致（400/401/403/422/429/500…） */
class BizError extends Error {
  /**
   * @param code {number} 业务错误码
   * @param message {string} 可直接展示给用户的文案
   * @param blocked {boolean} 是否为内容安全拦截
   * @param extra {object=} 服务端返回的结构化附加信息（如 { retryable: true }）
   */
  constructor(code, message, blocked, extra) {
    super(message)
    this.name = 'BizError'
    this.code = code
    this.blocked = Boolean(blocked)
    this.extra = extra || null
  }
}

/**
 * 云函数统一调用层。
 * 调用方只需处理 BizError；登录就绪由 services/auth 的门闩保证。
 *
 * @param opts {{timeout?:number}=} 透传给 wx.cloud.callFunction 的可选配置，
 *   timeout 单位为**秒**（如 parse-resume 的 PDF/docx 解析传 20）
 */
async function callFunction(name, data, opts) {
  const c = cloud()
  if (!c) throw new BizError(500, '云环境未初始化，请退出小程序后重进')

  const callOpts = { name: name, data: data || {} }
  if (opts && typeof opts.timeout === 'number') {
    // wx.cloud.callFunction 的 timeout 在不同基础库/文档里出现过顶层与 config 两种写法；
    // 同时传两份保险，秒级单位。
    callOpts.timeout = opts.timeout
    callOpts.config = Object.assign({}, callOpts.config || {}, { timeout: opts.timeout })
  }

  const res = await c.callFunction(callOpts)
  const body = res && res.result

  if (!body || typeof body.code !== 'number') {
    throw new BizError(500, '服务返回异常，请稍后再试')
  }
  if (body.code !== 0) {
    const d = body.data
    throw new BizError(body.code, body.message || '请求失败', Boolean(d && d.blocked), d)
  }
  return body.data
}

module.exports = { BizError, callFunction }
