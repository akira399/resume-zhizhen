'use strict'

/**
 * 云函数清单（单一事实来源）。
 * scripts/build-functions.js 与 scripts/check-bundle-size.js 共用，
 * 避免新增云函数时只改一处、另一处漏掉。
 */

/** @type {string[]} cloud/functions/ 下的云函数目录名 */
const CLOUD_FUNCTIONS = ['login', 'parse-resume', 'reminder']

/**
 * 需要压缩产物的云函数。
 *
 * parse-resume 内联了 pdfjs（PDF 解析），未压缩产物约 12 MB，压缩后约 5 MB。
 * 它只在用户主动上传附件时调用，冷启动成本可以接受；
 * 其余函数保持不压缩——它们被高频调用，且当前体积远低于上限，
 * 没必要为省一点体积承担压缩可能带来的风险。
 */
const MINIFY_FUNCTIONS = ['parse-resume']

module.exports = { CLOUD_FUNCTIONS, MINIFY_FUNCTIONS }
