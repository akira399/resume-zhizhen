import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * 设计变量守卫（P2-2 模块 A）。
 *
 * 为什么要这个测试：WXSS 里引用未定义的 CSS 变量不会报错，只会静默回退到
 * 初始值——真机上表现为「颜色莫名变黑/变透明」，靠肉眼看截图极难定位。
 * 批量把硬编码色值替换成 var() 时，还会出现「#fff7e8 被当成 #fff + 7e8」
 * 这类截断残留，产物仍是无效 CSS。两者都用脚本兜底最可靠。
 *
 * 覆盖三条：
 *   1. 所有 var(--x) 引用的变量都在 styles/tokens.wxss 中定义
 *   2. 自建 wxss（不含 vendor 构建产物）不得残留硬编码色值
 *   3. 不得出现 var(...) 后紧跟十六进制字符的截断残留
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MP = path.join(__dirname, '..', '..', 'miniprogram')
const TOKENS = path.join(MP, 'styles', 'tokens.wxss')

function walk(dir, out) {
  out = out || []
  for (const name of fs.readdirSync(dir)) {
    const fp = path.join(dir, name)
    if (fs.statSync(fp).isDirectory()) walk(fp, out)
    else if (name.endsWith('.wxss')) out.push(fp)
  }
  return out
}

/** 自建样式文件：排除 vendor（构建产物，自带变量体系）与 tokens 自身 */
function ownWxss() {
  return walk(MP).filter((f) => {
    const rel = path.relative(MP, f)
    if (rel.startsWith('vendor' + path.sep)) return false
    return path.basename(f) !== 'tokens.wxss'
  })
}

function definedVars() {
  const src = fs.readFileSync(TOKENS, 'utf8')
  const set = new Set()
  for (const m of src.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gim)) set.add(m[1])
  return set
}

describe('设计变量 tokens', () => {
  it('所有 var() 引用的变量都已在 tokens.wxss 定义', () => {
    const defined = definedVars()
    const missing = []
    for (const file of ownWxss()) {
      const src = fs.readFileSync(file, 'utf8')
      for (const m of src.matchAll(/var\(\s*(--[a-z0-9-]+)\s*\)/gi)) {
        if (!defined.has(m[1])) missing.push(path.relative(MP, file) + ' → ' + m[1])
      }
    }
    expect(missing).toEqual([])
  })

  it('自建 wxss 无硬编码色值（已全部收敛到 tokens）', () => {
    const offenders = []
    for (const file of ownWxss()) {
      const src = fs.readFileSync(file, 'utf8')
      for (const m of src.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
        offenders.push(path.relative(MP, file) + ' → ' + m[0])
      }
    }
    expect(offenders).toEqual([])
  })

  it('无色值截断残留（var(...) 后紧跟十六进制字符）', () => {
    const bad = []
    for (const file of ownWxss()) {
      const src = fs.readFileSync(file, 'utf8')
      // 负向断言排除两类合法场景：
      //   %  —— linear-gradient(..., var(--x) 0%, ...) 的渐变色标
      //   字母 —— animation: ... var(--ease-out) backwards，关键字前几个
      //           字母恰好都是 hex 字符（bac），不是色值截断
      for (const m of src.matchAll(
        /var\(--[a-z0-9-]+\)[ \t]*[0-9a-fA-F]{1,6}(?![0-9a-fA-Za-z%])/g
      )) {
        bad.push(path.relative(MP, file) + ' → ' + m[0])
      }
    }
    expect(bad).toEqual([])
  })
})
