'use strict'

/**
 * 简历附件解析（F1 的输入增强）。
 *
 * 流程：校验归属 → 下载到内存 → 解析 → 清洗 → **删除云端文件** → 返回文本。
 *
 * 两条刻意的设计：
 *
 * 1. **解析后立即删除云端文件，任何分支都不留档**（finally 里执行）。
 *    这正是当初把「文件上传解析」列入「明确不做」的原因——简历是最敏感的个人信息，
 *    一旦留在云存储就是长期风险。既然要做，就把留存时间压到「一次函数调用」这个量级：
 *    文件只在解析期间存在，业务库里也只存解析出的**文本**，不存文件、不存文件名。
 *
 * 2. **扩展名由服务端从 fileID 推断，不信任客户端传入**。
 *    否则客户端可以传任意 ext 绕开类型校验。
 *
 * 云存储目录权限为「仅创建者可读写」，但仅靠权限不够：
 * 若有人拿到他人的 fileID，仍可能借本函数下载。因此额外校验路径里必须含本人 openid。
 */

const cloud = require('wx-server-sdk')

const { ERR, LIMITS } = require('../../../shared/constants')
const { bizError } = require('../../../shared/errors')
const {
  extOf,
  extractText,
  describeParseError,
  isImageExt,
  IMAGE_MAX_BYTES,
} = require('./extract')
const { cleanResumeText, isEffectivelyEmpty } = require('./clean')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

/** 云存储中的上传目录；与客户端约定的 cloudPath 前缀一致 */
const UPLOAD_PREFIX = 'resume-uploads'
/** 非图片单文件上限。PDF 带图片时体积会明显大于文本量，5MB 足够覆盖真实简历 */
const MAX_FILE_BYTES = 5 * 1024 * 1024

/**
 * 校验 fileID 归属：路径中必须包含 /resume-uploads/{openid}/。
 * 挡住传入他人 fileID 借本函数下载他人简历的越权路径。
 */
function assertOwned(fileID, openid) {
  const marker = '/' + UPLOAD_PREFIX + '/' + openid + '/'
  if (String(fileID).indexOf(marker) < 0) {
    throw bizError(ERR.FORBIDDEN, '只能解析自己上传的文件')
  }
}

/**
 * @param openid {string}
 * @param event {{ fileID:string }}
 * @returns {Promise<{ text:string, ext:string, chars:number, truncated:boolean, originalChars:number }>}
 */
async function parse(openid, event) {
  const fileID = event && event.fileID
  if (!fileID || typeof fileID !== 'string') {
    throw bizError(ERR.BAD_REQUEST, '缺少文件标识')
  }

  assertOwned(fileID, openid)

  const ext = extOf(fileID)
  if (!ext) throw bizError(ERR.BAD_REQUEST, '无法识别文件格式')

  let buffer
  try {
    const res = await cloud.downloadFile({ fileID: fileID })
    buffer = res && res.fileContent
  } catch (e) {
    throw bizError(ERR.BAD_REQUEST, '文件读取失败，请重新上传')
  }

  if (!buffer || !buffer.length) {
    throw bizError(ERR.BAD_REQUEST, '文件内容为空，请重新上传')
  }
  const isImage = isImageExt(ext)
  const maxBytes = isImage ? IMAGE_MAX_BYTES : MAX_FILE_BYTES
  if (buffer.length > maxBytes) {
    const mb = Math.ceil(maxBytes / 1024 / 1024)
    throw bizError(ERR.BAD_REQUEST, `文件过大（${isImage ? '图片' : '文件'}上限 ${mb} MB）`)
  }

  let raw
  try {
    // 图片走 OCR，其余走文字层解析；openapi 注入给纯函数 extractText
    raw = await extractText(buffer, ext, { openapi: cloud.openapi })
  } catch (e) {
    if (e && e.unsupported) throw bizError(ERR.BAD_REQUEST, e.message)
    const friendly = describeParseError(e)
    throw bizError(ERR.UNPROCESSABLE, friendly || '文件解析失败，请换一份文件或改用粘贴')
  }

  const cleaned = cleanResumeText(raw, LIMITS.RESUME_MAX_LEN)

  // 扫描件/图片版 PDF 没有文字层：明确提示，而不是让用户对着一片空白发呆。
  // 引导用户改用「导出文字版 PDF」或「把页面截图/拍照成图片再上传」走 OCR。
  if (isEffectivelyEmpty(cleaned.text)) {
    throw bizError(
      ERR.UNPROCESSABLE,
      '没能从这份 PDF 里读到文字，它可能是扫描件或图片版。请：1) 用 Word/WPS 另存为文字版 PDF；2) 或将页面截图/拍照成图片再上传，会自动识别。'
    )
  }

  return {
    text: cleaned.text,
    ext: ext,
    ocr: isImage,
    chars: cleaned.text.length,
    truncated: cleaned.truncated,
    originalChars: cleaned.originalChars,
  }
}

// ---------------------------------------------------------------- 入口

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) {
    return { code: ERR.UNAUTHORIZED, message: '无用户身份', data: null }
  }

  const fileID = event && event.fileID

  try {
    const data = await parse(OPENID, event)
    return { code: 0, message: 'ok', data: data }
  } catch (err) {
    return {
      code: err.code || ERR.INTERNAL,
      message: err.message || '解析失败',
      data: err.extra || null,
    }
  } finally {
    // 无论成败都删除：解析成功不留档，解析失败也不留残留。
    if (fileID && typeof fileID === 'string') {
      cloud.deleteFile({ fileList: [fileID] }).catch(function () {
        // 删除失败不阻塞响应；云存储会按生命周期策略回收，且权限为仅创建者可读写
      })
    }
  }
}
