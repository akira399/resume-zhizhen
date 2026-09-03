'use strict'

const { APP_BUILD } = require('../config')

/**
 * 全局错误捕获：真机崩溃时把错误落到本地存储，
 * 首页检测到后以红框显示（真机无法看控制台时的自诊断通道）。
 *
 * 记录带「栈标识 + 时间戳」，读取时会丢弃过期记录：
 * 否则用户升级后看到的仍是上一次崩溃的堆栈，会把已修好的版本误判为仍崩溃。
 */

const KEY = '__boot_error__'
const FORMAT_VERSION = 1
/**
 * 崩溃记录的有效期。
 *
 * 定为 30 分钟而不是 24 小时：这个通道的用途是「真机看不到控制台时，
 * 崩溃后立刻重进就能读到堆栈」。但记录一旦展示会占据首页，
 * 若一次瞬时崩溃（例如首次编译时文件还没写完）被记下来，
 * 24 小时的 TTL 会让用户整整一天打不开应用——哪怕之后每次启动都正常。
 * 30 分钟足够覆盖「崩溃 → 重进查看」的真实路径，又不会长期误伤。
 */
const TTL_MS = 30 * 60 * 1000

function serialize(text) {
  return JSON.stringify({ v: FORMAT_VERSION, tag: APP_BUILD, at: Date.now(), text: text })
}

/**
 * 解析存储值；任何不合法/过期/跨栈的记录都返回 null。
 * 导出以便单测，不依赖 wx。
 */
function deserialize(raw) {
  if (!raw) return null

  let parsed = null
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    // 老格式为纯字符串（无栈标识），一律视为陈旧记录
    return null
  }

  if (!parsed || parsed.v !== FORMAT_VERSION) return null
  if (parsed.tag !== APP_BUILD) return null
  if (typeof parsed.at !== 'number' || Date.now() - parsed.at > TTL_MS) return null
  if (typeof parsed.text !== 'string' || !parsed.text) return null

  return parsed.text
}

function installErrorHooks() {
  try {
    if (typeof wx === 'undefined') return

    const record = function (prefix) {
      return function (msg) {
        let text
        if (typeof msg === 'string') {
          text = msg
        } else {
          try {
            text = JSON.stringify(msg)
          } catch (e) {
            text = String(msg)
          }
        }
        try {
          wx.setStorageSync(KEY, serialize((prefix + ': ' + text).slice(0, 800)))
        } catch (e) {
          // 存储失败则放弃（诊断通道不可用时无能为力）
        }
      }
    }

    if (typeof wx.onError === 'function') wx.onError(record('onError'))
    if (typeof wx.onUnhandledRejection === 'function') {
      wx.onUnhandledRejection(function (res) {
        record('unhandledRejection')(res && res.reason)
      })
    }
    if (typeof wx.onPageNotFound === 'function') {
      wx.onPageNotFound(function (res) {
        record('pageNotFound')(res && res.path)
      })
    }
  } catch (e) {
    // 安装失败不影响主流程
  }
}

function getStoredError() {
  try {
    if (typeof wx === 'undefined') return null
    const text = deserialize(wx.getStorageSync(KEY))
    if (!text) {
      // 陈旧/跨栈/过期记录：顺手清掉，避免一直占着这个通道
      clearStoredError()
      return null
    }
    return text
  } catch (e) {
    return null
  }
}

function clearStoredError() {
  try {
    if (typeof wx === 'undefined') return
    wx.removeStorageSync(KEY)
  } catch (e) {
    // ignore
  }
}

module.exports = {
  installErrorHooks,
  getStoredError,
  clearStoredError,
  serialize,
  deserialize,
}
