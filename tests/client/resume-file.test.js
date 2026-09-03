import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * 简历附件导入（resume-file.js）测试。
 *
 * uploadResumeAndParse 是纯逻辑（openid 注入），mock wx.cloud 即可测全路径；
 * parseResumeFile 走真实 auth（本机未登录时 getUser 为 null）验证引导提示。
 */

import {
  MAX_BYTES,
  extOf,
  extSupported,
  unsupportedHint,
  pickResumeFile,
  uploadResumeAndParse,
  parseResumeFile,
} from '../../miniprogram/services/resume-file'

const uploadFile = vi.fn()
const cloudCall = vi.fn()
const unlinkSync = vi.fn()

function setupWx() {
  global.wx = {
    cloud: {
      uploadFile,
      callFunction: cloudCall,
    },
    getFileSystemManager: () => ({ unlinkSync }),
    chooseMessageFile: null,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  setupWx()
  unlinkSync.mockImplementation(() => undefined)
  uploadFile.mockResolvedValue({ fileID: 'cloud://env/resume-uploads/openid-test/a.pdf' })
  cloudCall.mockResolvedValue({
    result: { code: 0, data: { text: '简历正文', ext: 'pdf', ocr: false, chars: 4 } },
  })
})

describe('扩展名工具', () => {
  it('文件上限 5MB', () => {
    expect(MAX_BYTES).toBe(5 * 1024 * 1024)
  })

  it('extOf / extSupported', () => {
    expect(extOf('简历.PDF')).toBe('pdf')
    expect(extOf('no-ext')).toBe('')
    expect(extSupported('docx')).toBe(true)
    expect(extSupported('png')).toBe(false)
  })

  it('unsupportedHint 给出针对性建议', () => {
    expect(unsupportedHint('doc')).toContain('另存为')
    expect(unsupportedHint('exe')).toContain('暂不支持')
  })
})

describe('pickResumeFile 选文件', () => {
  it('合法 PDF 通过', async () => {
    global.wx.chooseMessageFile = ({ success }) =>
      success({ tempFiles: [{ path: '/tmp/a.pdf', name: '简历.pdf', size: 500 * 1024 }] })
    const f = await pickResumeFile()
    expect(f.ext).toBe('pdf')
  })

  it('不支持的格式被拒绝', async () => {
    global.wx.chooseMessageFile = ({ success }) =>
      success({ tempFiles: [{ path: '/tmp/a.doc', name: 'a.doc', size: 10 }] })
    await expect(pickResumeFile()).rejects.toThrow('另存为')
  })

  it('超过 5MB 被拒绝', async () => {
    global.wx.chooseMessageFile = ({ success }) =>
      success({ tempFiles: [{ path: '/tmp/a.pdf', name: 'a.pdf', size: MAX_BYTES + 1 }] })
    await expect(pickResumeFile()).rejects.toThrow('文件过大')
  })

  it('用户取消抛 CANCEL 标记', async () => {
    global.wx.chooseMessageFile = ({ fail }) =>
      fail({ errMsg: 'chooseMessageFile:fail cancel' })
    await expect(pickResumeFile()).rejects.toThrow('CANCEL')
  })
})

describe('uploadResumeAndParse 上传解析', () => {
  it('成功：上传 → 云函数解析 → 返回文本并删除本地临时文件', async () => {
    const data = await uploadResumeAndParse({ path: '/tmp/a.pdf', ext: 'pdf' }, 'openid-test')
    expect(data.text).toBe('简历正文')
    expect(uploadFile).toHaveBeenCalledTimes(1)
    expect(cloudCall).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'parse-resume',
        data: expect.objectContaining({ fileID: expect.stringContaining('resume-uploads/openid-test/') }),
      })
    )
    expect(unlinkSync).toHaveBeenCalledWith('/tmp/a.pdf')
  })

  it('上传失败抛错', async () => {
    uploadFile.mockRejectedValue(new Error('upload fail'))
    await expect(uploadResumeAndParse({ path: '/tmp/a.pdf', ext: 'pdf' }, 'oid')).rejects.toThrow()
  })

  it('云函数业务错误（扫描 PDF 无文字层）透传给调用方', async () => {
    cloudCall.mockResolvedValue({ result: { code: 422, message: '没能从这份 PDF 里读到文字', data: null } })
    await expect(uploadResumeAndParse({ path: '/tmp/a.pdf', ext: 'pdf' }, 'oid')).rejects.toThrow('PDF')
  })

  it('云函数返回空 fileID 视为上传失败', async () => {
    uploadFile.mockResolvedValue({})
    await expect(uploadResumeAndParse({ path: '/tmp/a.txt', ext: 'txt' }, 'oid')).rejects.toThrow('上传失败')
  })

  it('无论成败都清理本地临时文件', async () => {
    uploadFile.mockRejectedValue(new Error('boom'))
    await expect(uploadResumeAndParse({ path: '/tmp/a.txt', ext: 'txt' }, 'oid')).rejects.toThrow()
    expect(unlinkSync).toHaveBeenCalledWith('/tmp/a.txt')
  })
})

describe('parseResumeFile 登录门禁', () => {
  it('本机未登录时给出明确引导且不上传', async () => {
    // 真实 auth.getUser() 在测试环境 state.user 为 null（未登录）
    await expect(parseResumeFile({ path: '/tmp/a.txt', ext: 'txt' })).rejects.toThrow('登录状态未就绪')
    expect(uploadFile).not.toHaveBeenCalled()
  })
})
