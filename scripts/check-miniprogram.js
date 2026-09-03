/**
 * 原生小程序静态守卫（无构建步骤，所以「检查」就是唯一的构建期防线）。
 *
 * 检查项：
 * 1. 预览/上传管线不支持的语法（?. / ?? / for await）—— 模拟器能跑，上传报
 *    "invalid file: SyntaxError"，是历史上真机白屏的经典诱因之一；
 * 2. app.json 声明的每个页面都具备 .js / .json / .wxml（含分包页面）；
 * 3. usingComponents 与 WXML import 的目标文件确实存在；
 * 4. tabBar 页面位于主包、图标路径真实存在；
 * 5. 不应残留 Taro / React 依赖（本项目已改为原生）。
 *
 * 用法：npm run check:mp
 */
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const mp = path.join(root, 'miniprogram')

const errors = []
const warnings = []

if (!fs.existsSync(mp)) {
  console.error('找不到 miniprogram/ 目录')
  process.exit(1)
}

/** 递归收集目录下的指定后缀文件 */
function walk(dir, exts, out) {
  out = out || []
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    const st = fs.statSync(p)
    if (st.isDirectory()) {
      if (name === 'node_modules' || name.startsWith('.')) continue
      walk(p, exts, out)
    } else if (exts.some(e => name.endsWith(e))) {
      out.push(p)
    }
  }
  return out
}

const jsFiles = walk(mp, ['.js'])
const wxmlFiles = walk(mp, ['.wxml'])

/**
 * 去掉注释后再扫描，否则文档里解释「不要用 for await」本身就会误报。
 * 只做注释级别的处理，不解析 AST：够用且不会漏报真实代码。
 */
function stripComments(src) {
  let out = ''
  let i = 0
  let state = 'code' // code | line | block | single | double | template
  while (i < src.length) {
    const c = src[i]
    const n = src[i + 1]

    if (state === 'code') {
      if (c === '/' && n === '/') { state = 'line'; i += 2; continue }
      if (c === '/' && n === '*') { state = 'block'; i += 2; continue }
      if (c === "'") { state = 'single' } else if (c === '"') { state = 'double' } else if (c === '`') { state = 'template' }
      out += c
      i++
      continue
    }
    if (state === 'line') {
      if (c === '\n') { state = 'code'; out += c }
      i++
      continue
    }
    if (state === 'block') {
      if (c === '*' && n === '/') { state = 'code'; i += 2; continue }
      if (c === '\n') out += c
      i++
      continue
    }
    // 字符串内部：处理转义，避免引号提前结束状态
    if (c === '\\') { out += c + (n || ''); i += 2; continue }
    if ((state === 'single' && c === "'") || (state === 'double' && c === '"') || (state === 'template' && c === '`')) {
      state = 'code'
    }
    out += c
    i++
  }
  return out
}

// ---- 1. 上传管线语法兼容 ----
// ESM 一条是 vendor 化时踩出来的（2026-08-31）：TDesign 的 dist 是 import/export，
// preview 报 `SyntaxError: Unexpected token {`。注意 import 后面可以没有空格
// （import{...}from"..."），所以不能用 \s+。
const UNSUPPORTED = [
  { re: /\?\.[\w[(]/, label: '可选链 ?.' },
  { re: /\?\?/, label: '空值合并 ??' },
  { re: /for\s+await\b/, label: 'for await' },
  { re: /(^|\n)\s*import\s*[{"'*]/, label: 'ESM import' },
  { re: /(^|\n)\s*export\s/, label: 'ESM export' },
  // Unicode 属性正则：模拟器桌面 V8 支持，真机逻辑层正则引擎构造时直接
  // SyntaxError → 整个 JS 文件求值失败 → Page 不注册 → 白屏
  // （2026-08-31 真机白屏根因，vendor 补丁见 build-vendor.js COMPAT_PATCHES）
  { re: /\\p\{[A-Za-z]/, label: 'Unicode 属性正则 \\p{...}' },
]
for (const f of jsFiles) {
  const src = stripComments(fs.readFileSync(f, 'utf8'))
  const hits = UNSUPPORTED.filter(r => r.re.test(src)).map(r => r.label)
  if (hits.length) {
    errors.push(`${path.relative(root, f)} 含上传管线不支持的语法：${hits.join('、')}`)
  }
}

// ---- 2. 页面文件齐全 ----
const appJsonPath = path.join(mp, 'app.json')
if (!fs.existsSync(appJsonPath)) {
  errors.push('缺少 miniprogram/app.json')
} else {
  let appJson
  try {
    appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'))
  } catch (e) {
    errors.push(`app.json 解析失败：${e.message}`)
    appJson = null
  }

  if (appJson) {
    // 主包与分包页面都要检查。分包页面此前未被覆盖——声明了却缺文件
    // 只会在真机跳转到该页时才炸，是最晚才暴露的一类错误。
    const allPages = (appJson.pages || []).slice()
    for (const sub of appJson.subpackages || []) {
      const root = String(sub.root || '').replace(/\/+$/, '')
      for (const p of sub.pages || []) {
        allPages.push(root + '/' + p)
      }
    }

    for (const p of allPages) {
      for (const ext of ['.js', '.json', '.wxml']) {
        if (!fs.existsSync(path.join(mp, p + ext))) {
          errors.push(`页面 ${p} 缺少 ${ext}`)
        }
      }
    }

    // tabBar：微信要求 tab 页面必须在主包内，放到分包只会在真机表现为点不动。
    // 图标路径写错同理，且不会有任何编译期提示。
    const tabBar = appJson.tabBar
    if (tabBar && Array.isArray(tabBar.list)) {
      const mainPages = appJson.pages || []
      for (const item of tabBar.list || []) {
        if (mainPages.indexOf(item.pagePath) === -1) {
          errors.push(`tabBar 页面 ${item.pagePath} 不在主包 pages 中（微信要求 tabBar 页面必须在主包）`)
        }
        for (const key of ['iconPath', 'selectedIconPath']) {
          if (item[key] && !fs.existsSync(path.join(mp, item[key]))) {
            errors.push(`tabBar 的 ${item.pagePath} 引用了不存在的 ${key}：${item[key]}`)
          }
        }
      }
    }

    // ---- 3. usingComponents 目标存在 ----
    for (const f of walk(mp, ['.json'])) {
      let cfg
      try {
        cfg = JSON.parse(fs.readFileSync(f, 'utf8'))
      } catch (e) {
        errors.push(`${path.relative(root, f)} 解析失败：${e.message}`)
        continue
      }
      const using = cfg.usingComponents || {}
      for (const key of Object.keys(using)) {
        const target = using[key]
        if (typeof target !== 'string') continue
        const abs = target.startsWith('/') ? path.join(mp, target) : path.resolve(path.dirname(f), target)
        if (!fs.existsSync(abs + '.js') && !fs.existsSync(abs)) {
          errors.push(`${path.relative(root, f)} 的 usingComponents.${key} 指向不存在的 ${target}`)
        }
      }
    }
  }
}

// ---- 3b. WXML import / include 目标存在 ----
for (const f of wxmlFiles) {
  const src = fs.readFileSync(f, 'utf8')
  const re = /<(import|include)\s+src\s*=\s*"([^"]+)"/g
  let m
  while ((m = re.exec(src))) {
    const target = m[2]
    const abs = target.startsWith('/') ? path.join(mp, target) : path.resolve(path.dirname(f), target)
    if (!fs.existsSync(abs)) {
      errors.push(`${path.relative(root, f)} 引用了不存在的 ${target}`)
    }
  }
}

// ---- 3c. JS require 目标存在 ----
// 相对路径层级写错（如三层深页面误写 ../../）只会在运行时炸——
// kanban/edit 页就这样漏过测试与旧版守卫，冷启动才暴露。
// 裸说明符（npm 包）在前端包里同样无法解析：vendor 已内联全部外部
// 依赖，业务代码不允许出现裸 require。
for (const f of jsFiles) {
  const src = stripComments(fs.readFileSync(f, 'utf8'))
  const re = /require\(\s*['"]([^'"]+)['"]\s*\)/g
  let m
  while ((m = re.exec(src))) {
    const target = m[1]
    if (target.startsWith('.')) {
      const base = path.resolve(path.dirname(f), target)
      const ok =
        fs.existsSync(base) ||
        fs.existsSync(base + '.js') ||
        fs.existsSync(path.join(base, 'index.js'))
      if (!ok) {
        errors.push(`${path.relative(root, f)} require 了不存在的 ${target}`)
      }
    } else if (!target.startsWith('/')) {
      errors.push(`${path.relative(root, f)} require 了裸模块 ${target}（前端包不允许 npm 依赖）`)
    }
  }
}

// ---- 4. 不应残留框架依赖 ----
for (const f of jsFiles) {
  const src = fs.readFileSync(f, 'utf8')
  if (/require\(['"][^'"]*@tarojs|from\s+['"][^'"]*@tarojs/.test(src)) {
    errors.push(`${path.relative(root, f)} 仍依赖 @tarojs（本项目已改为原生）`)
  }
  if (/require\(['"]react['"]\)|from\s+['"]react['"]/.test(src)) {
    errors.push(`${path.relative(root, f)} 仍依赖 react（本项目已改为原生）`)
  }
}

// ---- 输出 ----
const sizes = jsFiles
  .map(f => ({ f: path.relative(root, f), n: fs.statSync(f).size }))
  .concat(wxmlFiles.map(f => ({ f: path.relative(root, f), n: fs.statSync(f).size })))
  .concat(walk(mp, ['.wxss']).map(f => ({ f: path.relative(root, f), n: fs.statSync(f).size })))
const total = sizes.reduce((s, x) => s + x.n, 0)

if (warnings.length) warnings.forEach(w => console.log('[warn] ' + w))

if (errors.length) {
  console.error('小程序静态检查未通过：')
  errors.forEach(e => console.error('  - ' + e))
  process.exit(1)
}

console.log(
  `miniprogram check passed：${jsFiles.length} 个 JS、${wxmlFiles.length} 个 WXML，` +
  `源码合计 ${(total / 1024).toFixed(1)} KB`
)
