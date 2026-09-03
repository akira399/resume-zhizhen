import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * WXSS 选择器守卫。
 *
 * 背景：todo 页面 wxss 用了 `.prio-高` / `.prio-低` 中文 class 名，
 * WXSS 不支持中文标识符 → 该页面 wxml 编译失败 → 整个 package-tools
 * 分包加载失败（用户反馈"卡片点不动 + tabBar 变白"）。
 *
 * 这类问题 vitest 的 require-guard / wxml-guard 都不会发现，
 * 需要专门的 WXSS 守卫。
 *
 * 规则（自建样式，排除 vendor）：
 *   - 选择器中（{ 之前的部分）不允许含中文
 *   - 注释里的中文不在检查范围内（不影响 CSS 编译）
 *
 * 触发代价：纯静态扫描，几乎零开销。
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MP = path.join(__dirname, '..', '..', 'miniprogram')

/** 自建样式（排除 vendor 构建产物） */
function ownWxss() {
  const out = []
  walk(MP, out)
  return out.filter((f) => !path.relative(MP, f).startsWith('vendor' + path.sep))
}

function walk(dir, out) {
  out = out || []
  for (const name of fs.readdirSync(dir)) {
    const fp = path.join(dir, name)
    if (fs.statSync(fp).isDirectory()) walk(fp, out)
    else if (name.endsWith('.wxss')) out.push(fp)
  }
  return out
}

/** 去掉 CSS 注释（...）后的非注释部分 */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
}

/** 提取一行中 `{` 之前的选择器文本（保留多选择器逗号分隔） */
function extractSelector(line) {
  const i = line.indexOf('{')
  return i >= 0 ? line.slice(0, i) : ''
}

/** 选择器中是否含中文字符（class/id/伪类等标识符位置） */
function hasChineseInSelector(sel) {
  // 找以 . # [ @ 开头或后跟连字符-位置 的中文字符
  // 简化：选择器内任何中文字符都视为非法
  return /[\u4e00-\u9fff]/.test(sel)
}

describe('WXSS 选择器守卫', () => {
  it('自建 wxss 的选择器（{ 之前的部分）不允许含中文字符', () => {
    const offenders = []
    for (const file of ownWxss()) {
      const lines = stripComments(fs.readFileSync(file, 'utf8')).split('\n')
      for (let i = 0; i < lines.length; i++) {
        const sel = extractSelector(lines[i]).trim()
        if (!sel) continue
        if (hasChineseInSelector(sel)) {
          offenders.push(
            path.relative(MP, file) + ':' + (i + 1) + ' → 含中文选择器: ' + sel.slice(0, 60)
          )
        }
      }
    }
    expect(offenders).toEqual([])
  })
})