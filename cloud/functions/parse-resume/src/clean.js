'use strict'

/**
 * 简历文本清洗（纯函数，不依赖云环境，可单测）。
 *
 * 存在的理由：PDF 抽出来的文本几乎不能直接看——软连字符、零宽字符、
 * 每行尾随空格、成片空行，直接送给模型既浪费 token 又影响诊断质量。
 * 这里统一收敛，让「粘贴」与「上传」两条输入路径得到同样干净的文本。
 */

/** PDF 抽取常见的不可见/干扰字符：软连字符、零宽系列、BOM */
const INVISIBLE = /[­​-‍﻿]/g

/**
 * 清洗并按上限截断。
 * @param raw {string} 解析器抽出的原始文本
 * @param maxChars {number=} 上限（对应 config 的 ai.maxInputChars）；0 表示不截断
 * @returns {{ text:string, truncated:boolean, originalChars:number }}
 */
function cleanResumeText(raw, maxChars) {
  const limit = Number(maxChars) || 0

  let text = String(raw == null ? '' : raw)
    .replace(/\r\n?/g, '\n')
    .replace(INVISIBLE, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  const originalChars = text.length
  let truncated = false

  if (limit > 0 && text.length > limit) {
    text = text.slice(0, limit).trim()
    truncated = true
  }

  return { text: text, truncated: truncated, originalChars: originalChars }
}

/**
 * 判断是否「实质上没有内容」。
 * 扫描件 PDF 没有文字层，pdf-parse 会返回空串或一串孤立符号，
 * 这种情况必须给出明确提示，而不是让用户对着空白结果发呆。
 */
function isEffectivelyEmpty(text) {
  const s = String(text == null ? '' : text)

  // 只保留「任何语言的字母 + 数字」，其余（空白、标点、孤立符号）全部剔除。
  //
  // 注意这里**不能**用 \W：中文字符在正则里属于 \W，
  // 用 [^\W] 之类的写法会把整篇中文简历当成"没有内容"，
  // 于是每份中文简历都会被误判成扫描件——这个坑已经有单测守着。
  const meaningful = s.replace(/[^\p{L}\p{N}]/gu, '')

  return meaningful.length < 20
}

module.exports = { cleanResumeText, isEffectivelyEmpty }
