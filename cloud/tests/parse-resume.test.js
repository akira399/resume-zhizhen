import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { cleanResumeText, isEffectivelyEmpty } from '../functions/parse-resume/src/clean'
import { extOf, extractText, describeParseError } from '../functions/parse-resume/src/extract'

const here = path.dirname(fileURLToPath(import.meta.url))
const fixture = (name) => fs.readFileSync(path.join(here, 'fixtures', name))

describe('cleanResumeText', () => {
  it('统一换行符并去掉行尾空格', () => {
    const r = cleanResumeText('第一行   \r\n第二行\t\n')
    expect(r.text).toBe('第一行\n第二行')
  })

  it('去掉 PDF 常见的软连字符与零宽字符', () => {
    // 软连字符 ­ 与零宽空格 ​ 在抽取结果里很常见，会污染文本
    const r = cleanResumeText('用户增­长​相关')
    expect(r.text).toBe('用户增长相关')
  })

  it('合并连续空行，但保留段落分隔', () => {
    const r = cleanResumeText('第一段\n\n\n\n第二段')
    expect(r.text).toBe('第一段\n\n第二段')
  })

  it('行内连续空格收敛为一个', () => {
    expect(cleanResumeText('熟悉  数据分析').text).toBe('熟悉 数据分析')
  })

  it('按上限截断，并记录截断前的长度', () => {
    const r = cleanResumeText('a'.repeat(500) + 'b'.repeat(500), 300)
    expect(r.text).toHaveLength(300)
    expect(r.truncated).toBe(true)
    // originalChars 必须是清洗后、截断前的长度，用于提示用户"原文有多长"
    expect(r.originalChars).toBe(1000)
  })

  it('未超长时不标记截断', () => {
    const r = cleanResumeText('短文本', 5000)
    expect(r.truncated).toBe(false)
    expect(r.originalChars).toBe(3)
  })

  it('maxChars 为 0 或空时不截断', () => {
    expect(cleanResumeText('a'.repeat(100), 0).text).toHaveLength(100)
  })

  it('null / undefined 输入不抛错', () => {
    expect(cleanResumeText(null).text).toBe('')
    expect(cleanResumeText(undefined).text).toBe('')
  })
})

describe('isEffectivelyEmpty', () => {
  it('空串与纯空白视为空', () => {
    expect(isEffectivelyEmpty('')).toBe(true)
    expect(isEffectivelyEmpty('   \n\n  ')).toBe(true)
  })

  it('只有孤立符号视为空（扫描件 PDF 的典型输出）', () => {
    expect(isEffectivelyEmpty('· - —  ')).toBe(true)
    expect(isEffectivelyEmpty('1')).toBe(true)
  })

  it('中文简历内容不视为空', () => {
    // 中文字属于正则里的 \W：若用 \W 过滤，整篇中文都会被判为"没有内容"。
    // 这条是当初那个 bug 的守门测试，不要删。
    const text = '张三 软件工程师，负责用户增长相关工作，3 个月内 DAU 从 50 万增至 120 万'
    expect(isEffectivelyEmpty(text)).toBe(false)
  })

  it('英文简历内容不视为空', () => {
    expect(isEffectivelyEmpty('Zhang San, Software Engineer. Led user growth initiatives.')).toBe(false)
  })

  it('有效字符不足 20 个视为空（碎片不足以构成简历）', () => {
    // 阈值定在 20：扫描件常抽出几个页码或零星符号，
    // 而真实简历哪怕很短也远超这个量级。
    expect(isEffectivelyEmpty('张三')).toBe(true)
    expect(isEffectivelyEmpty('Zhang San')).toBe(true)
  })
})

describe('extOf', () => {
  it('取小写扩展名', () => {
    expect(extOf('resume.PDF')).toBe('pdf')
    expect(extOf('张三的简历.DOCX')).toBe('docx')
  })

  it('完整路径也能正确取到', () => {
    expect(extOf('cloud://env.abc/resume-uploads/openid-1/1.pdf')).toBe('pdf')
  })

  it('无扩展名返回空串', () => {
    expect(extOf('resume')).toBe('')
    expect(extOf('')).toBe('')
    expect(extOf(null)).toBe('')
  })

  it('文件名含多个点时取最后一个', () => {
    expect(extOf('my.resume.v2.pdf')).toBe('pdf')
  })
})

/**
 * 在**独立的原生 Node 进程**里解析夹具。
 *
 * 为什么不在 vitest 进程内直接跑：pdf-parse 内嵌一份 webpack 打好的 pdf.js UMD 包，
 * Vite 对它做 ESM 转换后，pdf.js 会走到与原生 Node 不同的代码分支——
 * 解析同一个合法 PDF 会抛 "bad XRef entry"，而原生 Node 下完全正常。
 * 云函数运行时就是原生 Node，所以在子进程里测反而更贴近生产。
 */
function extractInRealNode(fixtureName, ext) {
  const extractPath = path.resolve(here, '../functions/parse-resume/src/extract.js')
  const fixturePath = path.join(here, 'fixtures', fixtureName)

  const script =
    "const fs = require('node:fs');" +
    `require(${JSON.stringify(extractPath)})` +
    `.extractText(fs.readFileSync(${JSON.stringify(fixturePath)}), ${JSON.stringify(ext)})` +
    '.then(function (t) { process.stdout.write(t) })' +
    '.catch(function (e) { console.error(e && e.message); process.exit(1) })'

  return execFileSync(process.execPath, ['-e', script], { encoding: 'utf8' })
}

describe('extractText', () => {
  it('解析 PDF 夹具（原生 Node 进程，等同云函数运行时）', () => {
    const text = extractInRealNode('resume.pdf', 'pdf')
    expect(text).toContain('Software Engineer')
  }, 30000)

  it('解析 DOCX 夹具（含中文）', async () => {
    const text = await extractText(fixture('resume.docx'), 'docx')
    expect(text).toContain('张三')
    expect(text).toContain('用户增长')
  }, 30000)

  it('解析 TXT', async () => {
    const text = await extractText(Buffer.from('张三 软件工程师', 'utf8'), 'txt')
    expect(text).toBe('张三 软件工程师')
  })

  it('旧版 .doc 给出「另存为」的针对性引导', async () => {
    // .doc 是二进制格式，纯 JS 解析不了；必须给出可执行的下一步，而不是笼统报错
    await expect(extractText(Buffer.from('x'), 'doc')).rejects.toThrow(/另存为/)
  })

  it('其他不支持的格式给出明确文案', async () => {
    await expect(extractText(Buffer.from('x'), 'pages')).rejects.toThrow(/不支持/)
  })
})

describe('describeParseError', () => {
  it('加密 PDF', () => {
    expect(describeParseError({ message: 'Password required' })).toMatch(/加密/)
  })

  it('损坏 PDF', () => {
    expect(describeParseError(new Error('Invalid PDF structure'))).toMatch(/损坏/)
  })

  it('无法识别的错误返回 null，由调用方给兜底文案', () => {
    expect(describeParseError(new Error('something weird'))).toBeNull()
    expect(describeParseError(null)).toBeNull()
  })
})
