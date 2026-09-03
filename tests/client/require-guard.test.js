import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * require 路径守卫。
 *
 * 背景：`store/user.js` 曾因目录名不在小程序 require 识别白名单而
 * 编译后无法加载（"module is not defined"），且它只在运行时暴露——
 * vitest 的 Node 解析器能正常加载它，测不出来。本守卫从源码角度
 * 强制约定：
 *   1. 所有 require('相对路径') 的目标文件必须真实存在
 *   2. 被 require 的模块目录必须位于约定白名单内
 *      （pages / services / utils / lib / vendor / config / package-tools）
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MP = path.join(__dirname, '..', '..', 'miniprogram')

const ALLOWED_TOP_DIRS = ['pages', 'services', 'utils', 'lib', 'vendor', 'config', 'data', 'package-tools']

function walk(dir, out) {
  out = out || []
  for (const name of fs.readdirSync(dir)) {
    const fp = path.join(dir, name)
    if (fs.statSync(fp).isDirectory()) walk(fp, out)
    else if (name.endsWith('.js')) out.push(fp)
  }
  return out
}

function resolveModule(fromFile, reqPath) {
  const base = path.dirname(fromFile)
  const candidates = [
    path.resolve(base, reqPath),
    path.resolve(base, reqPath + '.js'),
  ]
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c
  }
  return null
}

describe('require 路径守卫', () => {
  it('全部相对 require 目标存在且位于约定目录', () => {
    const violations = []
    const re = /require\(\s*['"](\.\.?\/[^'"]+)['"]\s*\)/g

    for (const file of walk(MP)) {
      const src = fs.readFileSync(file, 'utf8')
      let m
      while ((m = re.exec(src))) {
        const reqPath = m[1]
        const rel = path.relative(MP, file)

        // 1. 目标必须存在
        const target = resolveModule(file, reqPath)
        if (!target) {
          violations.push(rel + ' → require(' + reqPath + ') 目标文件不存在')
          continue
        }

        // 2. 首段目录必须在白名单内（miniprogram 根目录直接放的文件，
        //    如 config.js，属于合法可 require 的模块，予以放行）
        const relTarget = path.relative(MP, target)
        const isRootFile = relTarget.indexOf(path.sep) === -1
        const topDir = relTarget.split(path.sep)[0]
        if (!isRootFile && ALLOWED_TOP_DIRS.indexOf(topDir) === -1) {
          violations.push(
            rel + ' → require(' + reqPath + ') 指向非约定目录 ' + topDir +
            '（允许：' + ALLOWED_TOP_DIRS.join('/') + '，避免小程序运行时 module is not defined）'
          )
        }
      }
    }
    expect(violations).toEqual([])
  })
})
