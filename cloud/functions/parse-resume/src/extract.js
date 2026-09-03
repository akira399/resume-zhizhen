'use strict'

/**
 * 附件 -> 纯文本。
 *
 * 选型说明（踩过的坑）：
 *   - pdf-parse 必须用 **1.x**。2.x 依赖 @napi-rs/canvas（原生二进制），
 *     既无法被 esbuild 打成单文件，Windows 打的包在 Linux 云函数上也无法加载。
 *   - 必须 require 'pdf-parse/lib/pdf-parse.js' 而非 'pdf-parse'：
 *     包入口在加载时会去读自带的测试 PDF，打进 bundle 后路径失效会直接抛错。
 *   - DOCX 用 mammoth 取**纯文本**（extractRawText），不需要 HTML 与样式。
 *   - 旧版 .doc 是二进制格式，纯 JS 无法可靠解析，一律友好拒绝并引导另存为。
 */

const pdfParse = require('pdf-parse/lib/pdf-parse.js')
const mammoth = require('mammoth')

const SUPPORTED_EXT = ['pdf', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'bmp', 'webp']

/** 图片类扩展名（走微信云开发 OCR 通用印刷体识别） */
const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'bmp', 'webp']

/** OCR 接口硬限制：图片 < 2MB（官方文档） */
const IMAGE_MAX_BYTES = 2 * 1024 * 1024

/** 图片扩展名 → MIME 类型（OCR 入参 contentType） */
const IMAGE_MIME = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  bmp: 'image/bmp',
  webp: 'image/webp',
}

function isImageExt(ext) {
  return IMAGE_EXTS.indexOf(ext) !== -1
}

function imageContentType(ext) {
  return IMAGE_MIME[ext] || 'image/jpeg'
}

/**
 * OCR 识别图片中的文字（微信云开发 openapi.ocr.printedText）。
 *
 * openapi 由调用方注入，保持本文件纯函数（不依赖 wx-server-sdk），
 * 单测传 mock 即可。结果按 top-left 的 y 坐标从上到下排序，
 * 避免 OCR 返回顺序乱导致段落错位。
 *
 * @param buffer {Buffer} 图片内容
 * @param ext {string} 小写扩展名
 * @param openapi {object|null} cloud.openapi 或 mock
 * @returns {Promise<string>}
 */
async function extractImage(buffer, ext, openapi) {
  const api = openapi && openapi.ocr ? openapi.ocr : null
  if (!api || !api.printedText) throw new Error('OCR 服务不可用')

  const res = await api.printedText({
    img: { contentType: imageContentType(ext), value: buffer },
  })
  const items = res && res.items
  if (!Array.isArray(items)) return ''

  const rows = items
    .filter(function (i) {
      return i && i.text
    })
    .sort(function (a, b) {
      const ay = a.pos && a.pos.left_top ? a.pos.left_top.y : 0
      const by = b.pos && b.pos.left_top ? b.pos.left_top.y : 0
      return ay - by
    })
    .map(function (i) {
      return i.text
    })
  return rows.join('\n')
}

/** 明确不支持但用户很可能尝试的旧格式，用于给出针对性的引导文案 */
const DEPRECATED_EXT = {
  doc: '旧版 .doc 无法解析，请在 Word 中「另存为 .docx」后重试',
  pages: '暂不支持 .pages，请导出为 PDF 或 .docx',
  wps: '暂不支持 .wps，请另存为 .docx',
  rtf: '暂不支持 .rtf，请另存为 .docx 或 PDF',
}

/**
 * 取小写扩展名（不含点）。取不到返回空串。
 * 扩展名一律由**服务端从 fileID 推断**，不信任客户端传入，避免绕过类型校验。
 */
function extOf(nameOrPath) {
  const m = /\.([a-zA-Z0-9]{1,8})$/.exec(String(nameOrPath || '').toLowerCase())
  return m ? m[1] : ''
}

async function extractPdf(buffer) {
  const data = await pdfParse(buffer)
  return (data && data.text) || ''
}

async function extractDocx(buffer) {
  const res = await mammoth.extractRawText({ buffer: buffer })
  return (res && res.value) || ''
}

function extractTxt(buffer) {
  return buffer.toString('utf8')
}

/**
 * @param buffer {Buffer}
 * @param ext {string} 小写扩展名
 * @param options {{ openapi?: object }} 传 cloud.openapi 供 OCR 使用
 * @returns {Promise<string>}
 */
function extractText(buffer, ext, options) {
  if (ext === 'pdf') return extractPdf(buffer)
  if (ext === 'docx') return extractDocx(buffer)
  if (ext === 'txt') return extractTxt(buffer)
  if (isImageExt(ext)) return extractImage(buffer, ext, options && options.openapi)

  const hint = DEPRECATED_EXT[ext]
  const err = new Error(hint || `暂不支持 .${ext} 格式，请上传 PDF、Word(.docx)、TXT 或图片(jpg/png)`)
  err.unsupported = true
  return Promise.reject(err)
}

/**
 * 加密/损坏 PDF 的识别。pdf-parse 抛出的信息不统一，
 * 统一在这里归一化成用户看得懂的文案。
 */
function describeParseError(err) {
  const msg = String((err && err.message) || '')
  if (/password|encrypt/i.test(msg)) return '这份 PDF 已加密，请先解除密码后重试'
  if (/Invalid PDF|bad XRef|startxref/i.test(msg)) return 'PDF 文件已损坏或不完整，请重新导出后重试'
  return null
}

module.exports = {
  SUPPORTED_EXT,
  DEPRECATED_EXT,
  IMAGE_EXTS,
  IMAGE_MAX_BYTES,
  isImageExt,
  imageContentType,
  extOf,
  extractImage,
  extractText,
  describeParseError,
}
