import { describe, it, expect } from 'vitest'

/**
 * 自我介绍模板（P2-16）测试。
 */

import {
  FIELDS,
  DURATIONS,
  validateIntro,
  buildIntro,
  buildMin1,
  buildMin3,
} from '../../miniprogram/services/intro-template'

const form = {
  name: '张三',
  school: '华中科技大学',
  major: '软件工程',
  grade: '本科 2027 届',
  direction: '后端开发',
  skills: 'Java、Spring Boot、MySQL',
  project: '校园二手交易平台',
  highlight: '将下单耗时从 2s 优化到 200ms',
  trait: '踏实、靠谱',
}

describe('字段与模板常量', () => {
  it('FIELDS 覆盖 9 个必填关键字段', () => {
    expect(FIELDS.length).toBe(9)
    expect(FIELDS[0].key).toBe('name')
  })

  it('DURATIONS 提供 1 分钟与 3 分钟', () => {
    expect(DURATIONS.map((d) => d.key)).toEqual(['min1', 'min3'])
  })
})

describe('validateIntro 校验', () => {
  it('必填字段缺失时给明确提示', () => {
    const res = validateIntro({ name: '张三' })
    expect(res.ok).toBe(false)
    expect(res.reason).toContain('学校')
  })

  it('完整表单通过并归一化', () => {
    const res = validateIntro(form)
    expect(res.ok).toBe(true)
    expect(res.value.name).toBe('张三')
  })
})

describe('buildIntro 生成', () => {
  it('1 分钟版：身份 → 技能 → 亮点 → 特质', () => {
    const res = buildIntro(form, 'min1')
    expect(res.ok).toBe(true)
    expect(res.text).toContain('华中科技大学')
    expect(res.text).toContain('后端开发')
    expect(res.text).toContain('200ms')
    expect(res.text.length).toBeLessThan(200)
  })

  it('3 分钟版：三段式结构', () => {
    const res = buildIntro(form, 'min3')
    expect(res.ok).toBe(true)
    expect(res.text).toContain('【第一段')
    expect(res.text).toContain('【第二段')
    expect(res.text).toContain('【第三段')
    expect(res.text.length).toBeGreaterThan(buildMin1(form).length)
  })

  it('默认时长回退为 1 分钟', () => {
    const res = buildIntro(form, 'bad-key')
    expect(res.durationLabel).toBe('1 分钟')
  })

  it('表单不完整时不生成', () => {
    const res = buildIntro({ name: '李四' }, 'min1')
    expect(res.ok).toBe(false)
    expect(res.text).toBeUndefined()
  })
})
