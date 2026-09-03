'use strict'

const { cloud } = require('./cloud')

/**
 * 登录就绪门闩（借鉴 yu-ai-learn waitForLogin 模式）：
 * 静默登录完成前，所有需要鉴权的调用在此等待，避免竞态。
 */

let resolveLogin = null
const loginReady = new Promise(function (resolve) {
  resolveLogin = resolve
})

let started = false
let loginError = ''

// ---------------------------------------------------------------- 登录态容器
/**
 * 极简可订阅状态容器（原 user-store.js 内联，见下）。
 * 为什么内联：该文件此前放在 miniprogram/store/ 与 services/ 下都无法被
 * 小程序运行时识别为可 require 模块（"module is not defined"），导致
 * auth.js 启动即崩。状态只有 auth 自己在用，直接并入本文件最稳。
 * 注意：请勿把本段再拆成独立文件放非约定目录。
 */
let state = { user: null, loginError: '' }
const listeners = []

function setState(patch) {
  state = Object.assign({}, state, patch)
  const snapshot = state
  listeners.slice().forEach(function (fn) {
    try {
      fn(snapshot)
    } catch (e) {
      // 单个订阅者异常不影响其他订阅者
    }
  })
}

/** 返回当前登录用户（未登录为 null） */
function getUser() {
  return state.user
}

function setUser(user) {
  state = Object.assign({}, state, { user: user, loginError: '' })
}

function setLoginError(msg) {
  setState({ loginError: msg || '登录失败' })
}

/** 订阅登录态变化，返回退订函数（页面 onUnload 里调用） */
function subscribe(fn) {
  listeners.push(fn)
  return function unsubscribe() {
    const i = listeners.indexOf(fn)
    if (i >= 0) listeners.splice(i, 1)
  }
}

function waitForLogin() {
  return loginReady
}

function getLoginError() {
  return loginError
}

/** 调用 login 云函数并同步到本地 store（不走 request.js，避免依赖自身的门闩造成死锁） */
async function fetchUser() {
  const c = cloud()
  if (!c) throw new Error('云环境不可用')
  const res = await c.callFunction({ name: 'login', data: {} })
  const body = res && res.result
  if (body && body.code === 0) {
    setUser(body.data)
    return body.data
  }
  throw new Error((body && body.message) || '登录失败')
}

/** app 启动时调用一次 */
async function initLogin() {
  if (started) return loginReady
  started = true

  try {
    await fetchUser()
  } catch (e) {
    // 失败不再静默：原因写入 userStore，订阅页面展示失败态与重试入口
    // （此前只存模块变量且无人消费，页面会永远停在「登录中…」）
    loginError = e && e.message ? e.message : '登录失败'
    setLoginError(loginError)
  } finally {
    resolveLogin()
  }
  return loginReady
}

/**
 * 用户主动重试登录（P2-1 三态覆盖）。
 * 成功 → setUser 推给订阅页面（loginError 一并清空）；
 * 失败 → 更新失败原因，页面保持错误态。返回 promise 供按钮 loading。
 */
async function retryLogin() {
  try {
    return await fetchUser()
  } catch (e) {
    const msg = e && e.message ? e.message : '登录失败'
    loginError = msg
    setLoginError(msg)
    throw e
  }
}

/**
 * 重新拉取额度并同步到本地 store。
 *
 * 存在原因：额度改为「预授权 + 结算」后，流式失败/中止时服务端会把额度还回去，
 * 而本地 store 是乐观扣减的，不回拉就会一直显示偏少的剩余次数。
 * 在一次诊断流程结束后调用一次即可，不必在首页每次 onShow 都拉。
 */
async function refreshUser() {
  try {
    return await fetchUser()
  } catch (e) {
    // 刷新失败不影响主流程：下次进入或重新登录时会自然纠正
    return null
  }
}

module.exports = { waitForLogin, initLogin, retryLogin, refreshUser, getLoginError, getUser, subscribe }
