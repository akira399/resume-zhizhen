'use strict'

const { CLOUD_ENV_ID } = require('./config')
const { cloud } = require('./services/cloud')
const { initLogin } = require('./services/auth')
const { installErrorHooks } = require('./services/error-report')

// 错误捕获必须最先安装：真机白屏时错误会落到本地存储，供首页显示
installErrorHooks()

App({
  onLaunch: function () {
    const c = cloud()
    if (c) {
      try {
        c.init({ env: CLOUD_ENV_ID, traceUser: true })
      } catch (e) {
        console.error('cloud init failed:', e)
      }
    }
    // 静默登录：所有鉴权请求经 services/auth 的登录门闩等待其完成
    initLogin()
  },

  onError: function (msg) {
    console.error('app onError:', msg)
  },
})
