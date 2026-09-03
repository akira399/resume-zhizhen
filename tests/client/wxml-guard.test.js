import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * WXML 结构守卫。
 *
 * 背景：M10 曾把一张卡片插在 <view wx:if> 和 <block wx:else> 中间，
 * 违反「wx:else / wx:elif 必须紧跟对应的 wx:if / wx:elif」规则，导致
 * 整个分包 WXML 编译失败、所有分包页面打不开——而 vitest（只跑 JS）
 * 完全无法发现。本守卫在 CI 阶段扫全部 wxml，避免同类问题复发。
 *
 * 覆盖两条：
 *   1. wx:else / wx:elif 的前一个兄弟节点必须带 wx:if / wx:elif
 *   2. 开闭标签必须正确配对（含自闭合）
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MP = path.join(__dirname, '..', '..', 'miniprogram')

/** 自建 wxml（排除 vendor 构建产物——第三方组件模板不适用本项目约定） */
function ownWxml() {
  const out = []
  walk(MP, out)
  return out.filter((f) => {
    const rel = path.relative(MP, f)
    return !rel.startsWith('vendor' + path.sep)
  })
}

function walk(dir, out) {
  out = out || []
  for (const name of fs.readdirSync(dir)) {
    const fp = path.join(dir, name)
    if (fs.statSync(fp).isDirectory()) walk(fp, out)
    else if (name.endsWith('.wxml')) out.push(fp)
  }
  return out
}

/** 跳过注释后的标签 token 流：{ tag, selfClose, flags:{if,elif,else} } */
function tokenize(src) {
  const tokens = []
  const cleaned = src.replace(/<!--[\s\S]*?-->/g, '')
  const re = /<(\/?)\s*([a-zA-Z-]+)([^>]*?)(\/?)\s*>/g
  let m
  while ((m = re.exec(cleaned))) {
    const close = m[1] === '/'
    const selfClose = m[4] === '/'
    const attrs = m[3]
    tokens.push({
      close: close,
      selfClose: selfClose,
      tag: m[2],
      flags: {
        if: /\bwx:if\s*=/.test(attrs),
        elif: /\bwx:elif\s*=/.test(attrs),
        else: /\bwx:else\b/.test(attrs),
      },
    })
  }
  return tokens
}

/** 结构校验。返回违规列表 */
function inspect(file) {
  const errors = []
  const tokens = tokenize(fs.readFileSync(file, 'utf8'))
  const stack = [] // 节点：{ tag, flags, children }
  let cur = { tag: '__root__', flags: {}, children: [] }

  for (const t of tokens) {
    if (t.close) {
      if (stack.length === 0 || cur.tag !== t.tag) {
        errors.push('标签不配对：多余的 </' + t.tag + '>')
        continue
      }
      cur = stack.pop()
      continue
    }

    const node = { tag: t.tag, flags: t.flags, children: [] }

    // 规则 1：wx:else / wx:elif 的前一个兄弟必须带 wx:if / wx:elif
    if (t.flags.else || t.flags.elif) {
      const prev = cur.children[cur.children.length - 1]
      if (!prev || !(prev.flags.if || prev.flags.elif)) {
        errors.push('wx:else / wx:elif 必须紧跟 wx:if / wx:elif（' + t.tag + '）')
      }
    }

    cur.children.push(node)

    if (!t.selfClose) {
      stack.push(cur)
      cur = node
    }
  }

  if (stack.length > 0) {
    errors.push('标签未闭合：' + stack.map((n) => n.tag).join(' > '))
  }
  return errors
}

describe('WXML 结构守卫', () => {
  it('全部 wxml 的 wx:if/wx:else 配对与标签闭合正确', () => {
    const all = []
    for (const file of ownWxml()) {
      const errs = inspect(file)
      errs.forEach((e) => all.push(path.relative(MP, file) + ' → ' + e))
    }
    expect(all).toEqual([])
  })
})
