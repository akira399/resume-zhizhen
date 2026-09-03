import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

/**
 * vendor 产物真机兼容守卫。
 *
 * 背景（2026-08-31 真机白屏根因）：marked 库用了 ES2018 Unicode 属性正则
 * （/[\p{L}\p{N}]/u 与 "\\p{P}\\p{S}"），模拟器桌面 V8 支持，真机逻辑层
 * 正则引擎构造时直接 SyntaxError → 整个 JS 文件求值失败 → Page 不注册
 * → 渲染层 addView not found → 白屏。
 * 修复：build-vendor.js 的 COMPAT_PATCHES 文本替换。本测试防回归：
 * 重建 vendor 若补丁失效（如 marked 升级引入新的 \p{ 用法），在这里炸出来。
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const VENDOR = path.join(__dirname, '..', '..', 'miniprogram', 'vendor', 'tdesign')

function listJs(dir, out) {
  out = out || []
  for (const name of fs.readdirSync(dir)) {
    const fp = path.join(dir, name)
    if (fs.statSync(fp).isDirectory()) listJs(fp, out)
    else if (name.endsWith('.js')) out.push(fp)
  }
  return out
}

describe('vendor 真机兼容', () => {
  it('全部产物不含 Unicode 属性正则 \\p{...}', () => {
    const offenders = []
    for (const file of listJs(VENDOR)) {
      const src = fs.readFileSync(file, 'utf8')
      if (src.includes('\\p{')) offenders.push(path.relative(VENDOR, file))
    }
    expect(offenders).toEqual([])
  })

  it('marked 补丁后可加载，中英文 markdown 解析正常', () => {
    const { marked } = require(path.join(VENDOR, 'marked', 'lib', 'marked.js'))
    const out = marked.parse(
      '**加粗** 与 *斜体*，中文标点「测试」；英文 "quotes" — __下划线__ 1*2*3'
    )
    expect(out).toContain('<strong>加粗</strong>')
    expect(out).toContain('<em>斜体</em>')
  })
})
