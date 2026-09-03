#!/usr/bin/env node
/**
 * 云函数产物体积门禁（CI 用）。
 *
 * 背景：云函数走 esbuild 单文件打包（规避 Windows IDE 的 zip 反斜杠路径 bug），
 * 因此 wx-server-sdk 会被内联进产物，基线体积本就约 2.6 MB —— 这是已知且可接受的代价。
 * 本脚本不是为了压体积，而是拦截「失控增长」：
 *   - 误把测试数据 / 大 JSON / 整个 node_modules 打进包
 *   - 引入体积巨大的新依赖而未察觉
 *
 * 若确有正当理由增大，调高 LIMITS 并在 PR 说明中写明原因。
 */
'use strict'

const fs = require('node:fs')
const path = require('node:path')

const { CLOUD_FUNCTIONS } = require('./functions')

/** 统一的产物体积上限（字节）；个别函数需要不同阈值时在此覆盖 */
const DEFAULT_LIMIT = 8 * 1024 * 1024
const LIMIT_OVERRIDES = {
  /**
   * parse-resume 内联了 pdfjs（PDF 解析没有轻量的纯 JS 替代方案），
   * 压缩后仍显著大于其他函数。这是「支持上传附件换来的固定成本」，
   * 仅在用户主动上传时冷启动，接受这个代价；超过 16 MB 才认为失控。
   */
  'parse-resume': 16 * 1024 * 1024,
}

const root = path.resolve(__dirname, '..')

function main() {
  const rows = []
  let failed = false

  for (const name of CLOUD_FUNCTIONS) {
    const limit = LIMIT_OVERRIDES[name] || DEFAULT_LIMIT
    const file = path.join(root, 'cloud', 'functions', name, 'index.js')
    if (!fs.existsSync(file)) {
      console.error(`check-bundle-size: 缺少产物 cloud/functions/${name}/index.js（请先 npm run build:functions）`)
      failed = true
      continue
    }
    const size = fs.statSync(file).size
    const kb = (size / 1024).toFixed(1)
    const over = size > limit
    if (over) failed = true
    rows.push(`${over ? '✗' : '✓'} ${name.padEnd(10)} ${kb.padStart(8)} KB  (limit ${(limit / 1024 / 1024).toFixed(0)} MB)`)
  }

  console.log(rows.join('\n'))
  if (failed) {
    console.error('\ncheck-bundle-size: FAILED — 产物超出上限')
    process.exitCode = 1
  } else {
    console.log('\ncheck-bundle-size: OK')
  }
}

main()
