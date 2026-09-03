'use strict'

/**
 * 前端常量。
 * 云环境 ID 原本通过 Taro 的 defineConstants 注入，原生版直接常量化。
 */
module.exports = {
  // TODO: 替换为你自己的微信云开发环境 ID
  CLOUD_ENV_ID: 'your-cloud-env-id',

  /**
   * 前端栈标识。切换技术栈或大改前端后自增该值，
   * 老版本遗留在用户设备上的崩溃记录会自动失效，避免把上一次的崩溃
   * 当成当前的崩溃展示出来（曾导致误判为「原生版仍白屏」）。
   */
  APP_BUILD: 'native-1',
}
