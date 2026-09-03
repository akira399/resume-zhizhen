'use strict'

/**
 * 隐私协议授权（docs/10 A5，提审硬门槛）。
 *
 * 自 2024 年起隐私协议为微信强审项：未在 app.json 开启 __usePrivacyCheck__、
 * 且未在使用隐私接口前取得用户同意，会直接被拒审。
 *
 * 采用官方「自定义弹窗 + agreePrivacyAuthorization 按钮」方案：
 * 只用一处弹窗展示我们自己的说明文案，用户点「同意」时由微信完成授权，
 * 比「先弹我们的说明、再弹微信原生弹窗」少一次打断。
 *
 * 兼容性：相关接口需基础库 2.32.3+。项目基线为 3.15.1，
 * 但接口缺失时（如旧版客户端）一律视为无需授权，不能把用户挡在门外。
 */

/** 本地存储键：记录用户是否已同意，仅用于决定是否展示弹窗 */
const STORAGE_KEY = 'privacy_agreed'

function isAvailable() {
  return typeof wx !== 'undefined' && typeof wx.getPrivacySetting === 'function'
}

/** 本地记录的同意状态（仅用于 UI 预判，真正的依据来自微信） */
function getAgreed() {
  try {
    return wx.getStorageSync(STORAGE_KEY) === '1'
  } catch (e) {
    return false
  }
}

function setAgreed(value) {
  try {
    wx.setStorageSync(STORAGE_KEY, value ? '1' : '0')
  } catch (e) {
    // 存储失败不影响授权本身
  }
}

/**
 * 查询当前是否需要弹出隐私授权。
 * @returns {Promise<{ needAuthorization:boolean, privacyContractName:string }>}
 */
function getSetting() {
  return new Promise(function (resolve) {
    if (!isAvailable()) {
      resolve({ needAuthorization: false, privacyContractName: '' })
      return
    }

    wx.getPrivacySetting({
      success: function (res) {
        resolve({
          needAuthorization: Boolean(res && res.needAuthorization),
          privacyContractName: (res && res.privacyContractName) || '《用户隐私保护指引》',
        })
      },
      fail: function () {
        // 查询失败时保守放行：不能因为接口异常让用户无法使用
        resolve({ needAuthorization: false, privacyContractName: '' })
      },
    })
  })
}

/** 打开微信的隐私保护指引页面 */
function openContract() {
  if (typeof wx !== 'undefined' && typeof wx.openPrivacyContract === 'function') {
    wx.openPrivacyContract({})
  }
}

module.exports = { getSetting, openContract, getAgreed, setAgreed, isAvailable, STORAGE_KEY }
