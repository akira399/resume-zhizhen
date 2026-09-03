'use strict'

/**
 * AI 残留专项扫描（P3 合规自查）。
 *
 * 背景：产品因「深度合成（AI 生成内容）」被驳回，v1.1 做去 AI 化改造。
 * 改造后新增了大量模块（M7-M10 / P2），必须重新确认：
 *   小程序用户可见文案 + 客户端代码里，不出现任何 AI / 生成式 / 大模型字样。
 *
 * 扫描范围：miniprogram/ 下 .js / .wxml / .wxss / .json，排除 vendor（第三方组件）。
 * 命中即打印「文件:行号 → 命中词 → 原文」，并统计总数；有命中时退出码 1。
 *
 * 用法：node scripts/scan-ai-residual.js
 */

const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '..')
const MP = path.join(ROOT, 'miniprogram')

const EXTS = ['.js', '.wxml', '.wxss', '.json']
const SKIP_DIRS = ['vendor', 'node_modules']

/**
 * 白名单文件：岗位技能词库。
 * 这里的「机器学习 / 大模型 / transformer / 深度学习」是**JD 里真实出现的
 * 技术名词**，作为关键词匹配的素材，不是本产品的功能宣称——
 * 算法岗 JD 就是这么写的，删掉反而会让比对失真。
 * 该文件内不再出现用户可见的「AI」字样（原 label「算法 / AI」已改）。
 */
const WHITELIST_FILES = ['services/keyword-data.js']

/**
 * 命中词表。
 * 分「硬命中」（一定违规）与「软命中」（需人工确认，如智能/智能规则）。
 */
const HARD_PATTERNS = [
  { re: /\bAI\b/g, name: 'AI' },
  { re: /\ba\.i\./gi, name: 'a.i.' },
  { re: /人工智能/g, name: '人工智能' },
  { re: /大模型/g, name: '大模型' },
  { re: /生成式/g, name: '生成式' },
  { re: /机器学习/g, name: '机器学习' },
  { re: /深度合成/g, name: '深度合成' },
  { re: /\bLLM\b/g, name: 'LLM' },
  { re: /\bGPT\b/gi, name: 'GPT' },
  { re: /ChatGPT/gi, name: 'ChatGPT' },
  { re: /DeepSeek/gi, name: 'DeepSeek' },
  { re: /混元|Hunyuan|hunyuan/g, name: '混元' },
  { re: /通义千问/g, name: '通义千问' },
  { re: /文心一言/g, name: '文心一言' },
  { re: /ai-proxy/gi, name: 'ai-proxy' },
  { re: /wx\.cloud\.extend\.AI/g, name: 'cloud.extend.AI' },
]

/** 软命中：中文「智能」——需人工确认是否为合规诠释（如"智能规则诊断"） */
const SOFT_PATTERNS = [{ re: /智能/g, name: '智能' }]

function walk(dir, out) {
  out = out || []
  for (const name of fs.readdirSync(dir)) {
    const fp = path.join(dir, name)
    const st = fs.statSync(fp)
    if (st.isDirectory()) {
      if (SKIP_DIRS.indexOf(name) !== -1) continue
      walk(fp, out)
    } else if (EXTS.indexOf(path.extname(name)) !== -1) {
      out.push(fp)
    }
  }
  return out
}

/** 判断该行是否为注释（区分「代码里真有」与「注释里提到」） */
function isCommentLine(line, ext) {
  const t = line.trim()
  if (ext === '.wxml') return t.startsWith('<!--')
  if (ext === '.js' || ext === '.wxss' || ext === '.json') {
    return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')
  }
  return false
}

function scan() {
  const hard = []
  const soft = []
  for (const file of walk(MP)) {
    const ext = path.extname(file)
    // 白名单：岗位技能词库（技术名词，非产品功能宣称）
    if (WHITELIST_FILES.indexOf(path.relative(MP, file).replace(/\\/g, '/')) !== -1) continue
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      for (const p of HARD_PATTERNS) {
        p.re.lastIndex = 0
        if (p.re.test(line)) {
          hard.push({
            file: path.relative(ROOT, file),
            line: i + 1,
            word: p.name,
            text: line.trim().slice(0, 100),
            inComment: isCommentLine(line, ext),
          })
        }
      }
      for (const p of SOFT_PATTERNS) {
        p.re.lastIndex = 0
        if (p.re.test(line)) {
          soft.push({
            file: path.relative(ROOT, file),
            line: i + 1,
            word: p.name,
            text: line.trim().slice(0, 100),
            inComment: isCommentLine(line, ext),
          })
        }
      }
    }
  }
  return { hard, soft }
}

function report(res) {
  const codeHits = res.hard.filter((h) => !h.inComment)
  const commentHits = res.hard.filter((h) => h.inComment)

  console.log('=== AI 残留扫描 ===')
  console.log('硬命中（代码/文案）: ' + codeHits.length)
  console.log('硬命中（注释中提及，可接受）: ' + commentHits.length)
  console.log('软命中（"智能"，需人工确认）: ' + res.soft.length)

  if (codeHits.length) {
    console.log('\n--- 代码/文案命中（必须处理） ---')
    codeHits.forEach((h) => console.log(h.file + ':' + h.line + ' [' + h.word + '] ' + h.text))
  }
  if (res.soft.length) {
    console.log('\n--- 软命中（"智能"） ---')
    res.soft.forEach((h) => console.log(h.file + ':' + h.line + ' [' + h.word + '] ' + h.text))
  }
  return codeHits.length
}

const res = scan()
const bad = report(res)
process.exit(bad > 0 ? 1 : 0)
