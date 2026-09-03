'use strict'

/**
 * 简历附件：从聊天记录选文件 → 上传云存储 → 云函数解析（PDF/Word/TXT）→ 返回文本。
 *
 * 与云函数 parse-resume 配套（改动前请先读云函数注释）。隐私约定：
 *   文件只作为解析**中转**，云函数在 finally 里一定删除云端文件；
 *   业务侧从头到尾只拿文本，不存文件、不存文件名。
 *
 * 平台限制说明：微信小程序没有「从手机里选文件」的通用入口，
 * wx.chooseMessageFile 只能从**聊天记录**选，所以 UI 上要明确引导
 * 用户先把简历发到「文件传输助手」。
 *
 * 注意：本文件位于 miniprogram/ 下，**禁止使用 ?. / ?? / for await**。
 */

const { cloud } = require('./cloud')
const { callFunction } = require('./request')
const { getUser } = require('./auth')

/** 支持的简历文档格式（图片走不了 chooseMessageFile，不做 OCR 入口） */
const SUPPORTED_EXT = ['pdf', 'docx', 'txt']
/** 单文件上限（与云函数一致，5MB 足够覆盖真实简历） */
const MAX_BYTES = 5 * 1024 * 1024

function extOf(name) {
  const m = /\.([a-zA-Z0-9]{1,8})$/.exec(String(name || '').toLowerCase())
  return m ? m[1] : ''
}

/** 扩展名是否受支持 */
function extSupported(ext) {
  return SUPPORTED_EXT.indexOf(ext) !== -1
}

/** 不支持的格式给可执行建议（和云函数保持一致） */
function unsupportedHint(ext) {
  const map = {
    doc: '旧版 .doc 无法解析，请在 Word 里「另存为 .docx」再试',
    pages: '暂不支持 .pages，请导出为 PDF 或 .docx',
    wps: '暂不支持 .wps，请另存为 .docx',
    rtf: '暂不支持 .rtf，请另存为 .docx 或 PDF',
  }
  return map[ext] || '暂不支持该格式，请上传 PDF、Word(.docx) 或 TXT'
}

/**
 * 从聊天记录选一个简历文件，做格式与大小校验。
 * @returns {Promise<{ path:string, name:string, ext:string, size:number }>}
 */
function pickResumeFile() {
  return new Promise(function (resolve, reject) {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      success: function (res) {
        const f = res.tempFiles && res.tempFiles[0]
        if (!f || !f.path) {
          reject(new Error('没有拿到文件，请重试'))
          return
        }
        const ext = extOf(f.name)
        if (!extSupported(ext)) {
          reject(new Error(unsupportedHint(ext)))
          return
        }
        if (f.size > MAX_BYTES) {
          reject(new Error('文件过大（上限 ' + Math.ceil(MAX_BYTES / 1024 / 1024) + ' MB）'))
          return
        }
        resolve({ path: f.path, name: f.name, ext: ext, size: f.size })
      },
      fail: function (err) {
        // 用户主动取消不算错误
        const msg = err && err.errMsg
        if (msg && msg.indexOf('cancel') !== -1) {
          reject(new Error('CANCEL'))
        } else {
          reject(new Error('选择文件失败，请重试'))
        }
      },
    })
  })
}

/**
 * 上传并解析简历文件（纯逻辑，openid 由调用方注入，便于测试）。
 * @param file {object} pickResumeFile 的输出
 * @param openid {string} 用户 openid（登录态由 auth 提供）
 * @returns {Promise<{ text:string, ext:string, ocr:boolean, chars:number, truncated:boolean }>}
 */
async function uploadResumeAndParse(file, openid) {
  const c = cloud()
  if (!c) throw new Error('云服务不可用')

  const cloudPath =
    'resume-uploads/' + openid + '/' +
    Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + file.ext

  try {
    const up = await c.uploadFile({ cloudPath: cloudPath, filePath: file.path })
    const fileID = up && up.fileID
    if (!fileID) throw new Error('上传失败，请重试')
    // PDF/docx 解析较慢，给足超时；返回 data 即 { text, ext, ocr, chars, truncated }
    return await callFunction('parse-resume', { fileID: fileID }, { timeout: 20 })
  } finally {
    // 删除本地临时文件（云端文件由云函数在解析后 finally 删除）
    try {
      wx.getFileSystemManager().unlinkSync(file.path)
    } catch (e2) {
      // 临时文件删除失败可忽略
    }
  }
}

/** 公开入口：从登录态取 openid 后上传解析 */
async function parseResumeFile(file) {
  // 登录由 app.js 启动时静默完成；这里同步取态，未就绪给出明确引导
  const user = getUser()
  const openid = user && user.openid
  if (!openid) throw new Error('登录状态未就绪，请稍候几秒再试')
  return uploadResumeAndParse(file, openid)
}

module.exports = {
  SUPPORTED_EXT: SUPPORTED_EXT,
  MAX_BYTES: MAX_BYTES,
  extOf: extOf,
  extSupported: extSupported,
  unsupportedHint: unsupportedHint,
  pickResumeFile: pickResumeFile,
  uploadResumeAndParse: uploadResumeAndParse,
  parseResumeFile: parseResumeFile,
}
