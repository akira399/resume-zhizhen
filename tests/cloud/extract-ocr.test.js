import { describe, it, expect } from 'vitest'

/**
 * 云函数 parse-resume 的 OCR 分支测试（纯函数部分）。
 *
 * extractImage 接受注入的 openapi（mock），不依赖 wx-server-sdk，
 * 单测可直接覆盖：识别文本拼接、按 y 坐标排序、空结果、缺 openapi。
 */

import {
  IMAGE_EXTS,
  IMAGE_MAX_BYTES,
  isImageExt,
  imageContentType,
  extractImage,
} from '../../cloud/functions/parse-resume/src/extract'

describe('图片扩展名判断', () => {
  it('IMAGE_EXTS 覆盖常见图片格式', () => {
    expect(IMAGE_EXTS).toEqual(['jpg', 'jpeg', 'png', 'bmp', 'webp'])
    expect(IMAGE_MAX_BYTES).toBe(2 * 1024 * 1024)
  })

  it('isImageExt 正确区分图片与非图片', () => {
    expect(isImageExt('png')).toBe(true)
    expect(isImageExt('PDF')).toBe(false) // 大小写敏感（调用方先转小写）
    expect(isImageExt('pdf')).toBe(false)
  })

  it('imageContentType 映射 MIME', () => {
    expect(imageContentType('jpg')).toBe('image/jpeg')
    expect(imageContentType('png')).toBe('image/png')
    expect(imageContentType('webp')).toBe('image/webp')
    expect(imageContentType('unknown')).toBe('image/jpeg')
  })
})

describe('extractImage OCR', () => {
  it('识别结果按 y 坐标从上到下排序拼接', async () => {
    const openapi = {
      ocr: {
        printedText: async (opts) => {
          expect(opts.img.contentType).toBe('image/png')
          expect(opts.img.value).toBeInstanceOf(Buffer)
          return {
            items: [
              { text: '第二行', pos: { left_top: { y: 300 } } },
              { text: '第一行', pos: { left_top: { y: 100 } } },
              { text: '第三行', pos: { left_top: { y: 500 } } },
            ],
          }
        },
      },
    }
    const text = await extractImage(Buffer.from('x'), 'png', openapi)
    expect(text).toBe('第一行\n第二行\n第三行')
  })

  it('无 items 时返回空串', async () => {
    const openapi = { ocr: { printedText: async () => ({ items: null }) } }
    expect(await extractImage(Buffer.from('x'), 'jpg', openapi)).toBe('')
  })

  it('缺 openapi 时拒绝', async () => {
    await expect(extractImage(Buffer.from('x'), 'jpg', null)).rejects.toThrow('OCR 服务不可用')
  })
})
