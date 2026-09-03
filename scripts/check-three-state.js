'use strict'

/**
 * 三态覆盖检查（P3 打磨）。
 *
 * 每个数据页面都应具备三种状态出口，否则用户会卡在原地：
 *   加载中 → 骨架/占位；空 → 说明 + 去创建入口；失败 → 错误文案 + 重试。
 *
 * 本脚本只做**启发式扫描 + 报告**，不判定失败：
 * 有些页面（纯静态/纯表单）天然不需要某一种状态，由人工确认。
 *
 * 用法：node scripts/check-three-state.js
 */

const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '..')
const PAGES_DIRS = [
  path.join(ROOT, 'miniprogram', 'pages'),
  path.join(ROOT, 'miniprogram', 'package-tools', 'pages'),
]

/** 三态关键词（命中即认为有该态的出口） */
const SIGNALS = {
  loading: [/\{\{\s*loading\s*\}\}/, /class="[^"]*(skeleton|loading|placeholder)/, /加载中/],
  empty: [/\{\{\s*empty\s*\}\}/, /class="[^"]*empty/, /还没有|暂无|空空/],
  error: [/errMsg|errorMsg|class="[^"]*error/, /重新加载|重试|加载失败/],
}

function walk(dir, out) {
  out = out || []
  if (!fs.existsSync(dir)) return out
  for (const name of fs.readdirSync(dir)) {
    const fp = path.join(dir, name)
    if (fs.statSync(fp).isDirectory()) walk(fp, out)
    else if (name === 'index.wxml') out.push(fp)
  }
  return out
}

function check(file) {
  const src = fs.readFileSync(file, 'utf8')
  const hits = {}
  for (const key of Object.keys(SIGNALS)) {
    hits[key] = SIGNALS[key].some((re) => re.test(src))
  }
  return hits
}

function main() {
  const files = []
  PAGES_DIRS.forEach((d) => walk(d, files))
  files.sort()

  console.log('=== 三态覆盖检查（启发式，仅供参考）===')
  console.log('页面数：' + files.length + '\n')

  const missing = []
  for (const f of files) {
    const hits = check(f)
    const miss = Object.keys(hits).filter((k) => !hits[k])
    const rel = path.relative(path.join(ROOT, 'miniprogram'), f)
    const flag = miss.length === 0 ? '✅ 三态齐备' : '⚠️ 缺: ' + miss.join(' / ')
    console.log(rel.padEnd(48) + flag)
    if (miss.length) missing.push({ file: rel, miss })
  }

  console.log('\n--- 汇总 ---')
  console.log('三态齐备: ' + (files.length - missing.length) + ' / ' + files.length)
  if (missing.length) {
    console.log('需人工确认（纯静态/表单页面可豁免）:')
    missing.forEach((m) => console.log('  ' + m.file + ' → ' + m.miss.join('/')))
  }
}

main()
