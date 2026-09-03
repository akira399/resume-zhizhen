#!/usr/bin/env node
/**
 * TDesign vendor 构建：把 npm 包里的组件转译成上传管线能接受的 CommonJS。
 *
 * ## 为什么需要这个脚本（重要，改动前必读）
 *
 * TDesign 的 miniprogram_dist 是 **ES Module**（`import/export`），
 * 而微信上传管线的 JS 解析器不接受 ESM——preview 直接报
 * `SyntaxError: Unexpected token {`。这正是 HANDOFF.md 第四节约束 1 的
 * 另一面：那个约束只记录了 `?.` / `??` / `for await`，**ESM 同样不行**。
 *
 * TDesign 官方的 npm 方案要求开启 IDE 的「ES6 转 ES5」设置来转译，但本项目
 * 的 HARD OFF 约束（HANDOFF 约束 4）禁止这样做——二次编译曾破坏产物。
 *
 * 因此本项目走 vendor 路线（docs/10 §2.4.2）：开发期用 esbuild 做一次
 * ESM→CommonJS 转译，**产物直接入库**。小程序包内看到的仍是普通 CJS，
 * 「无构建步骤、所见即所运行」的纪律不被破坏——与云函数的
 * build-functions.js（打包后部署）是同一模式。
 *
 * ## 做了什么
 *
 * 1. 从 tdesign-miniprogram 包里**计算组件依赖闭包**（入口在下方 ENTRIES），
 *    拷贝全部依赖目录（排除 .ts 声明文件，它们不进小程序包还占体积）；
 * 2. 内联外部 npm 依赖（EXTERNAL_DEPS：tslib / marked / tinycolor2）——
 *    闭包扫描只认相对路径，裸 require 不会自动带进包，漏了会在运行时
 *    「module is not defined」崩掉整个启动；
 * 3. esbuild 逐文件转译 ESM→CJS，裸 require 改写为包内相对路径；
 * 4. 产物健康检查：不得残留 ESM 语法 / `?.` / `??` / 裸 require，写 VERSION.txt。
 *
 * 什么时候跑：升级 TDesign 版本、或新增组件到 ENTRIES 之后。
 *   node scripts/build-vendor.js
 *
 * 产物提交进 git（miniprogram/vendor/tdesign/），不要 gitignore。
 */

'use strict'

const fs = require('node:fs')
const path = require('node:path')
const esbuild = require('esbuild')

const root = path.resolve(__dirname, '..')
const SRC = path.join(root, 'node_modules', 'tdesign-miniprogram', 'miniprogram_dist')
const DST = path.join(root, 'miniprogram', 'vendor', 'tdesign')

/** 用到的组件入口：闭包会自动把依赖目录带进来 */
const ENTRIES = [
  // 基础（现在与后续页面都会用）
  'button',
  'tag',
  'loading',
  'empty',
  'dialog',
  // F6 对话页
  'chat-list',
  'chat-message',
  'chat-sender',
  'chat-content',
  'chat-loading',
  'chat-thinking',
  // 列表/看板（F7 与通用）
  'cell',
  'tabs',
  'sticky',
  'skeleton',
]

// .wxs 是 WXML 里 <wxs src> 引用的脚本，漏掉会在上传时报
// 「wxml 编译错误 xxx.wxs not found」——只留运行时真正需要的扩展名
const KEEP_EXT = ['.js', '.json', '.wxml', '.wxss', '.wxs']

// ============================================================
// 外部 npm 依赖内联（关键：漏登记 = 运行时崩启动）
// ============================================================
// 上方 closure() 只扫描相对路径引用，组件里的裸 require/import（npm 包）
// 不会带进 vendor；esbuild transform 不做模块解析，也会原样保留。
// 产物里残留 `require("marked")` 曾直接炸掉冷启动（app onError →
// 首页注册失败 → 白屏）。所有外部依赖必须在此显式登记：
//   spec  : 组件源码里的说明符（原样出现在 require('...') 中）
//   entry : 相对包根的入口文件（三个入口均为自包含产物，入口闭包
//           递归兜底拷贝其包内相对引用）
// 新组件带来新依赖时：npm i -D <pkg> 后在此登记，重新构建。
// 健康检查会拦截未登记的裸 require，不会带病入库。
const EXTERNAL_DEPS = [
  { spec: 'tslib', entry: 'tslib.js' }, // 装饰器运行时，几乎所有组件
  { spec: 'marked', entry: 'lib/marked.cjs' }, // chat-markdown 的 Lexer
  { spec: 'tinycolor2/esm/tinycolor', entry: 'esm/tinycolor.js' }, // color-picker
  // pkg: true —— 按子路径引用的外部包（locale/*.js 里 require('dayjs/locale/xx')），
  // 主入口照常内联，产物里出现的 '<spec>/子路径' 引用在转译后按需补拷
  { spec: 'dayjs', entry: 'dayjs.min.js', pkg: true }, // config-provider → locale/*
]

// ============================================================
// 真机兼容补丁（转译后应用，见 main() 步骤 3.95）
// ============================================================
// 真机逻辑层的正则引擎不支持 ES2018 Unicode 属性类（\p{L} 等）：
// RegExp 构造时直接抛 SyntaxError，整个 JS 文件求值失败 →
// Page 不注册 → 渲染层 addView not found → 白屏。
// 模拟器是桌面 V8（支持该特性），所以只在真机暴露（2026-08-31 真机白屏根因）。
// esbuild target es2018 不会降级正则特性，只能做文本级替换。
// 语义等价（markdown 的这两处只影响 em/strong 边界判断，中英文场景足够）：
//   \p{L}\p{N} → 常用字母数字（拉丁/希腊/西里尔/假名/CJK/韩文）
//   \p{P}\p{S} → 常用标点符号（ASCII/拉丁/通用/CJK/全角）
// 用 String.raw 保持与产物文本逐字节对应，改错一个反斜杠就替换不上。
const COMPAT_PATCHES = [
  {
    from: String.raw`/[\p{L}\p{N}]/u`,
    to: String.raw`/[0-9A-Za-z\u00C0-\u024F\u0370-\u04FF\u3040-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]/`,
  },
  {
    from: String.raw`"\\p{P}\\p{S}"`,
    to: String.raw`"\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E\u00A1-\u00BF\u2010-\u2027\u2030-\u205E\u3000-\u301F\uFF01-\uFF0F\uFF1A-\uFF20\uFF3B-\uFF40\uFF5B-\uFF65"`,
  },
]

// ============================================================
// 依赖闭包（与 scripts/check-miniprogram 的检查口径一致）
// ============================================================

/** 相对引用所属的顶层目录名；返回 null 表示不是包内引用 */
function ownerDir(fromFile, rel) {
  const abs = path.resolve(path.dirname(fromFile), rel)
  const relToRoot = path.relative(SRC, abs).split(path.sep)
  if (!relToRoot[0] || relToRoot[0] === '..') return null
  return relToRoot[0]
}

function scanRequires(src) {
  const out = new Set()
  let m
  // 注意 from\s*：TDesign 压缩产物是 from"..." 无空格形式，
  // 写成 from\s+ 会漏扫整个依赖目录（mixins 就这样丢过）
  const re = /(?:require\s*\(|from\s*|import\s*\(\s*)\s*['"](\.[^'"]+)['"]/g
  while ((m = re.exec(src))) out.add(m[1])
  const imp = /@import\s+['"](\.[^'"]+)['"]/g
  while ((m = imp.exec(src))) out.add(m[1])
  return out
}

/** .json 里的 usingComponents 引用 */
function scanUsingComponents(src) {
  const out = new Set()
  let j
  try {
    j = JSON.parse(src)
  } catch (e) {
    return out
  }
  for (const v of Object.values(j.usingComponents || {})) {
    if (typeof v === 'string' && v.startsWith('.')) out.add(v)
  }
  return out
}

function closure(entryDirs) {
  const seen = new Set()
  const missing = []
  const queue = entryDirs.slice()

  while (queue.length) {
    const dir = queue.shift()
    if (seen.has(dir)) continue
    seen.add(dir)

    const abs = path.join(SRC, dir)
    if (!fs.existsSync(abs)) {
      missing.push(dir)
      continue
    }
    for (const name of fs.readdirSync(abs)) {
      const fp = path.join(abs, name)
      if (!fs.statSync(fp).isFile()) continue
      if (!KEEP_EXT.includes(path.extname(name))) continue

      const src = fs.readFileSync(fp, 'utf8')
      const refs = path.extname(name) === '.json' ? scanUsingComponents(src) : scanRequires(src)
      for (const r of refs) {
        const o = ownerDir(fp, r)
        if (o) queue.push(o)
      }
    }
  }
  return { dirs: [...seen].sort(), missing: missing }
}

// ============================================================
// 拷贝与转译
// ============================================================

function listFiles(dir, out) {
  out = out || []
  for (const name of fs.readdirSync(dir)) {
    const fp = path.join(dir, name)
    if (fs.statSync(fp).isDirectory()) listFiles(fp, out)
    else if (KEEP_EXT.includes(path.extname(name))) out.push(fp)
  }
  return out
}

/** 递归拷贝外部包内文件（从入口出发，沿相对引用闭包），返回 vendor 内入口路径 */
function copyPkgFile(abs, pkgRoot, seen) {
  if (seen.has(abs)) return
  seen.add(abs)
  // 小程序模块系统只认 .js 后缀（require 自动补 .js），.cjs 会被解析成
  // xxx.cjs.js 而找不到——拷贝时统一重命名
  const rel = path.relative(pkgRoot, abs).replace(/\.cjs$/, '.js')
  const dst = path.join(DST, path.basename(pkgRoot), rel)
  fs.mkdirSync(path.dirname(dst), { recursive: true })
  fs.copyFileSync(abs, dst)
  const src = fs.readFileSync(abs, 'utf8')
  let m
  const re = /(?:require\s*\(|from\s+|import\s*\(\s*)\s*['"](\.[^'"]+)['"]/g
  while ((m = re.exec(src))) {
    let next = path.resolve(path.dirname(abs), m[1])
    if (!fs.existsSync(next) && fs.existsSync(next + '.js')) next += '.js'
    if (
      next.startsWith(pkgRoot + path.sep) &&
      fs.existsSync(next) &&
      fs.statSync(next).isFile()
    ) {
      copyPkgFile(next, pkgRoot, seen)
    }
  }
}

/** 内联 EXTERNAL_DEPS：拷入口闭包进 vendor，返回改写映射与 pkg 模式依赖 */
function inlineExternals() {
  const rewrites = []
  const pkgDeps = []
  for (const dep of EXTERNAL_DEPS) {
    const pkgName = dep.spec.startsWith('@')
      ? dep.spec.split('/').slice(0, 2).join('/')
      : dep.spec.split('/')[0]
    const pkgRoot = path.join(root, 'node_modules', pkgName)
    const entryAbs = path.join(pkgRoot, dep.entry)
    if (!fs.existsSync(entryAbs)) {
      console.error('外部依赖入口不存在：' + dep.spec + ' → ' + entryAbs)
      console.error('确认已 npm i -D ' + pkgName + '，且 entry 路径与包版本匹配')
      process.exit(1)
    }
    copyPkgFile(entryAbs, pkgRoot, new Set())
    // entryDst 必须与 copyPkgFile 的重命名规则一致（.cjs → .js）
    const entryDst = path.join(
      DST,
      pkgName,
      path.relative(pkgRoot, entryAbs).replace(/\.cjs$/, '.js')
    )
    rewrites.push({ spec: dep.spec, entryDst })
    if (dep.pkg) pkgDeps.push({ spec: dep.spec, pkgRoot })
    console.log(
      '内联 ' + dep.spec + ' → vendor/tdesign/' + path.relative(DST, entryDst).split(path.sep).join('/')
    )
  }
  return { rewrites, pkgDeps }
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 扫描产物里 require('<spec>/子路径') 的全部子路径说明符 */
function collectPkgSubpaths(spec, files) {
  const subs = new Set()
  const re = new RegExp(
    "require\\(\\s*['\"]" + escapeRegExp(spec) + "(\\/[a-zA-Z0-9_@./-]+)['\"]\\s*\\)",
    'g'
  )
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8')
    let m
    while ((m = re.exec(src))) subs.add(m[1].slice(1))
  }
  return [...subs]
}

/** 拷贝外部包内单个子路径文件（.js 解析 + .cjs 重命名），返回 vendor 内目标路径 */
function copyPkgSubpath(pkgRoot, sub) {
  let abs = path.join(pkgRoot, sub)
  if (!fs.existsSync(abs) && fs.existsSync(abs + '.js')) abs += '.js'
  if (!fs.existsSync(abs)) {
    console.error('外部依赖子路径不存在：' + path.basename(pkgRoot) + '/' + sub)
    process.exit(1)
  }
  const dst = path.join(
    DST,
    path.basename(pkgRoot),
    path.relative(pkgRoot, abs).replace(/\.cjs$/, '.js')
  )
  fs.mkdirSync(path.dirname(dst), { recursive: true })
  fs.copyFileSync(abs, dst)
  return dst
}

/** 把产物里的裸 require('<spec>') 改写为指向 vendor 内入口的相对路径 */
function rewriteBareRequires(code, file, rewrites) {
  for (const { spec, entryDst } of rewrites) {
    if (!code.includes(spec)) continue
    let rel = path.relative(path.dirname(file), entryDst).split(path.sep).join('/')
    if (!rel.startsWith('.')) rel = './' + rel
    code = code.replace(
      new RegExp("require\\(\\s*(['\"])" + escapeRegExp(spec) + "\\1\\s*\\)", 'g'),
      'require($1' + rel + '$1)'
    )
  }
  return code
}

async function main() {
  const pkg = require(path.join(root, 'node_modules', 'tdesign-miniprogram', 'package.json'))
  const { dirs, missing } = closure(ENTRIES)

  if (missing.length) {
    console.error('以下依赖目录在 tdesign-miniprogram 包中不存在：' + missing.join(', '))
    process.exit(1)
  }

  console.log('TDesign ' + pkg.version + ' → vendor（' + dirs.length + ' 个目录）')
  console.log('  ' + dirs.join(' '))

  fs.rmSync(DST, { recursive: true, force: true })
  fs.mkdirSync(DST, { recursive: true })

  // ---- 1. 拷贝组件目录（只留运行时需要的扩展名）----
  for (const dir of dirs) {
    fs.cpSync(path.join(SRC, dir), path.join(DST, dir), {
      recursive: true,
      filter: (src) => {
        if (fs.statSync(src).isDirectory()) return true
        return KEEP_EXT.includes(path.extname(src))
      },
    })
  }

  // ---- 2. 外部 npm 依赖内联（tslib / marked / tinycolor2 / dayjs，见 EXTERNAL_DEPS）----
  const { rewrites, pkgDeps } = inlineExternals()

  // ---- 3. esbuild 逐文件转译 ESM → CJS ----
  //
  // 为什么用 transform 而不是 build + bundle：
  //   组件之间通过 ../common/* 相互引用，若逐文件 bundle，common 会被
  //   内联进每个组件，体积放大十几倍。transform 只做语法转换，
  //   require('../common/...') 原样保留，目录结构与源包完全一致。
  //   （esbuild 的 alias 必须搭配 bundle，此处用不了，裸 require 在下面统一改写。）
  async function transpile(file) {
    const src = fs.readFileSync(file, 'utf8')
    const res = await esbuild.transform(src, { format: 'cjs', target: 'es2018' })
    fs.writeFileSync(file, res.code)
  }

  let targets = listFiles(DST).filter((f) => f.endsWith('.js'))
  console.log('转译 ' + targets.length + ' 个 JS …')
  for (const file of targets) await transpile(file)

  // ---- 3.5 pkg 模式外部依赖：按产物里的实际子路径引用补拷（如 dayjs/locale/xx）----
  for (const { spec, pkgRoot } of pkgDeps) {
    const subs = collectPkgSubpaths(spec, targets)
    if (!subs.length) continue
    console.log('补拷 ' + spec + ' 子路径：' + subs.join(' '))
    for (const sub of subs) {
      const dst = copyPkgSubpath(pkgRoot, sub)
      rewrites.push({ spec: spec + '/' + sub, entryDst: dst })
      if (dst.endsWith('.js')) await transpile(dst)
    }
  }

  // ---- 3.9 裸 require 统一改写：说明符 → vendor 内相对路径 ----
  targets = listFiles(DST).filter((f) => f.endsWith('.js'))
  for (const file of targets) {
    const src = fs.readFileSync(file, 'utf8')
    fs.writeFileSync(file, rewriteBareRequires(src, file, rewrites))
  }

  // ---- 3.95 真机兼容补丁：Unicode 属性正则 → 字符类（见 COMPAT_PATCHES 注释）----
  targets = listFiles(DST).filter((f) => f.endsWith('.js'))
  for (const file of targets) {
    let src = fs.readFileSync(file, 'utf8')
    let hit = false
    for (const p of COMPAT_PATCHES) {
      if (src.includes(p.from)) {
        src = src.split(p.from).join(p.to)
        hit = true
      }
    }
    if (hit) {
      fs.writeFileSync(file, src)
      console.log('真机兼容补丁: ' + path.relative(DST, file))
    }
  }

  // ---- 4. 产物健康检查 ----
  let bad = []
  for (const file of listFiles(DST)) {
    if (!file.endsWith('.js')) continue
    const src = fs.readFileSync(file, 'utf8')
    const rel = path.relative(root, file)
    if (/^\s*(import|export)\s/m.test(src)) bad.push(rel + ' 仍有 ESM 语法')
    if (/\?\.[\w[(]/.test(src)) bad.push(rel + ' 含可选链')
    if (/\?\?/.test(src)) bad.push(rel + ' 含空值合并')
    // Unicode 属性正则在真机直接 SyntaxError → 整文件求值失败 → 白屏
    if (src.includes('\\p{')) bad.push(rel + ' 含 Unicode 属性正则 \\p{...}（真机不支持）')
    // 裸 require 残留 = 运行时「module is not defined」崩启动。
    // 出现即说明 TDesign 新组件引入了未登记的外部依赖：
    // 把它加进 EXTERNAL_DEPS 重新构建，不要带病入库。
    let bm
    const bareRe = /require\(\s*['"]([^'".][^'"]*)['"]\s*\)/g
    while ((bm = bareRe.exec(src))) bad.push(rel + ' 残留裸模块 require: ' + bm[1])
  }
  if (bad.length) {
    console.error('\n产物检查未通过：')
    bad.slice(0, 20).forEach((b) => console.error('  - ' + b))
    process.exit(1)
  }

  // ---- 5. 版本说明 ----
  fs.writeFileSync(
    path.join(DST, 'VERSION.txt'),
    [
      'TDesign Mini Program vendor 产物（由 scripts/build-vendor.js 生成，勿手改）',
      '',
      '来源包   : tdesign-miniprogram@' + pkg.version,
      '外部依赖 : ' +
        EXTERNAL_DEPS.map(function (d) {
          return d.spec + '（内联）'
        }).join(', '),
      '生成日期 : ' + new Date().toISOString().slice(0, 10),
      '转译     : esbuild，ESM → CommonJS，target es2018',
      '组件入口 : ' + ENTRIES.join(' '),
      '目录闭包 : ' + dirs.join(' '),
      '',
      '为什么 vendor 化：TDesign 的 dist 是 ESM，上传管线不接受；官方方案要求',
      '开 IDE「ES6 转 ES5」，但本项目 HARD OFF 二次编译（HANDOFF 约束 4）。',
      '故开发期转译、产物入库，包内保持无构建步骤。决策：docs/10 §2.4.2。',
      '',
      '升级 / 加组件：改 ENTRIES 后运行 node scripts/build-vendor.js。',
      '定制样式用 t-class 或 CSS 变量，不要改这里的文件。',
      '',
    ].join('\n'),
    'utf8'
  )

  let total = 0
  for (const f of listFiles(DST)) total += fs.statSync(f).size
  console.log(
    '完成：' + listFiles(DST).length + ' 个文件，' + (total / 1024).toFixed(1) + ' KB，健康检查通过'
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
