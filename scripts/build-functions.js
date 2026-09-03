/**
 * 将云函数打包为单文件 index.js。
 * 背景：Windows 版微信开发者工具打包上传时，zip 内 node_modules 使用反斜杠路径，
 * Linux 运行时解包为字面文件名导致 require 失败。单文件 bundle 不含 node_modules，规避此问题。
 */
const { execFileSync } = require('node:child_process')
const path = require('node:path')

const { CLOUD_FUNCTIONS, MINIFY_FUNCTIONS } = require('./functions')
const root = path.resolve(__dirname, '..')

for (const fn of CLOUD_FUNCTIONS) {
  const entry = path.join(root, 'cloud', 'functions', fn, 'main.js')
  const outfile = path.join(root, 'cloud', 'functions', fn, 'index.js')
  const minify = MINIFY_FUNCTIONS.indexOf(fn) >= 0

  const args = [
    path.join(root, 'node_modules', 'esbuild', 'bin', 'esbuild'),
    entry,
    '--bundle', '--allow-overwrite',
    '--platform=node',
    `--outfile=${outfile}`,
    '--log-level=warning',
  ]
  if (minify) args.push('--minify')

  execFileSync(process.execPath, args, { stdio: 'inherit' })
  console.log(`built cloud/functions/${fn}/index.js${minify ? ' (minified)' : ''}`)
}
