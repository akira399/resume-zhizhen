import { describe, it, expect } from 'vitest'

/**
 * 简历结构化解析（P2-11）测试。
 */

import {
  extractContacts,
  extractEducation,
  extractSkills,
  extractExperience,
  parseResume,
} from '../../miniprogram/services/resume-parse'

const SAMPLE = [
  '张三',
  '电话：13800138000',
  '邮箱：zhangsan@example.com',
  'GitHub: github.com/zhangsan-dev',
  '',
  '教育背景',
  '华中科技大学 · 软件工程 · 本科 2027 届',
  '',
  '专业技能',
  'Java、Spring Boot、MySQL、Redis、Linux',
  '',
  '实习经历',
  '字节跳动 · 后端开发实习生',
  '负责订单接口开发，QPS 从 800 提升到 3000',
].join('\n')

describe('联系方式提取', () => {
  it('手机号 / 邮箱 / GitHub 各自命中', () => {
    const c = extractContacts(SAMPLE)
    expect(c.phone).toContain('13800138000')
    expect(c.email).toContain('zhangsan@example.com')
    expect(c.github[0]).toBe('github.com/zhangsan-dev')
  })

  it('无联系方式时返回空数组', () => {
    const c = extractContacts('只有一段文字')
    expect(c.phone).toEqual([])
    expect(c.email).toEqual([])
  })
})

describe('教育背景提取', () => {
  it('含大学/学院等关键词的行被提取', () => {
    const edu = extractEducation(SAMPLE.split('\n').map((l) => l.trim()).filter(Boolean))
    expect(edu.some((e) => e.indexOf('华中科技大学') !== -1)).toBe(true)
  })
})

describe('技能提取', () => {
  it('从技能标签行拆词', () => {
    const skills = extractSkills(SAMPLE.split('\n').map((l) => l.trim()).filter(Boolean))
    expect(skills).toContain('Java')
    expect(skills).toContain('MySQL')
    expect(skills).toContain('Redis')
  })
})

describe('经历分段', () => {
  it('按段落标题切出经历片段', () => {
    const exp = extractExperience(SAMPLE.split('\n').map((l) => l.trim()).filter(Boolean))
    expect(exp.some((e) => e.title.indexOf('实习经历') !== -1)).toBe(true)
    expect(exp.some((e) => e.body.some((l) => l.indexOf('字节跳动') !== -1))).toBe(true)
  })
})

describe('parseResume 整体', () => {
  it('完整解析样例简历', () => {
    const r = parseResume(SAMPLE)
    expect(r.hit).toBe(true)
    expect(r.contacts.phone[0]).toBe('13800138000')
    expect(r.education.length).toBeGreaterThan(0)
    expect(r.skills.length).toBeGreaterThan(3)
    expect(r.experience.length).toBeGreaterThan(0)
  })

  it('空文本 hit=false 且各字段为空', () => {
    const r = parseResume('   ')
    expect(r.hit).toBe(false)
    expect(r.education).toEqual([])
    expect(r.skills).toEqual([])
    expect(r.experience).toEqual([])
  })
})
