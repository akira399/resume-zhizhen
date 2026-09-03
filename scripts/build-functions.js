/**
 * 将云函数打包为单文件 index.js。
 * 背景：Windows 版微信开发者工具打包上传时，zip 内 node_modules 使用反斜杠路径，
 * Linux 运行时解包为字面文件名导致 require 失败。单文件 bundle 不含 node_modules，规避此问题。
 *
 * 实现：用 esbuild **JS API**（build），而不是子进程执行 esbuild CLI——
 * CLI 的 bin/esbuild 在 Linux 上是原生 ELF 可执行文件，用 process.execPath(node) 执行会抛
 * "SyntaxError: Invalid or unexpected token"；JS API 跨平台一致，且由 esbuild 自行定位平台二进制。
 */
const esbuild = require('esbuild')
const path = require('node:path')

const { CLOUD_FUNCTIONS, MINIFY_FUNCTIONS } = require('./functions')
const root = path.resolve(__dirname, '..')

async function buildAll() {
  for (const fn of CLOUD_FUNCTIONS) {
    const entry = path.join(root, 'cloud', 'functions', fn, 'main.js')
    const outfile = path.join(root, 'cloud', 'functions', fn, 'index.js')
    const minify = MINIFY_FUNCTIONS.indexOf(fn) >= 0

    await esbuild.build({
      entryPoints: [entry],
      bundle: true,
      platform: 'node',
      outfile,
      minify,
      logLevel: 'warning',
    })
    console.log(`built cloud/functions/${fn}/index.js${minify ? ' (minified)' : ''}`)
  }
}

buildAll().catch((err) => {
  console.error(err)
  process.exit(1)
})
