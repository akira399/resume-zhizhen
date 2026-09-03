import { describe, it, expect } from 'vitest'
import {
  DICTIONARY,
  SYNONYM_MAP,
  canonicalize,
  directions,
  directionWords,
} from '../../miniprogram/services/keyword-data'
import {
  DEFAULT_DIRECTION,
  normalize,
  extractKeywordCounts,
  buildCompareResult,
} from '../../miniprogram/services/keyword'

describe('词库数据契约', () => {
  it('提供 6 个岗位方向，label 非空', () => {
    const dirs = directions()
    expect(dirs).toHaveLength(6)
    for (const d of dirs) {
      expect(typeof d.label).toBe('string')
      expect(d.label.length).toBeGreaterThan(0)
    }
  })

  it('每个方向词条 40+，保证覆盖率有意义', () => {
    for (const key in DICTIONARY) {
      expect(DICTIONARY[key].words.length).toBeGreaterThanOrEqual(40)
    }
  })

  it('directionWords 去重并归一化', () => {
    const words = directionWords('backend')
    const set = new Set(words)
    expect(words.length).toBe(set.size)
    // k8s 归一为 kubernetes
    expect(words.indexOf('kubernetes')).toBeGreaterThan(-1)
  })

  it('同义词映射：别名 → 主词', () => {
    expect(canonicalize('k8s')).toBe('kubernetes')
    expect(canonicalize('JS')).toBe('javascript')
    expect(canonicalize('Go')).toBe('golang')
    expect(canonicalize('springboot')).toBe('spring boot')
    expect(canonicalize('ES')).toBe('elasticsearch')
    expect(canonicalize('mq')).toBe('消息队列')
    expect(canonicalize('未知词')).toBe('未知词')
  })
})

describe('extractKeywordCounts 命中提取', () => {
  it('大小写不敏感：JD 大写也能命中词库小写词', () => {
    const counts = extractKeywordCounts('We use JAVA and MYSQL', 'backend')
    expect(counts['java']).toBeGreaterThan(0)
    expect(counts['mysql']).toBeGreaterThan(0)
  })

  it('命中中文词', () => {
    const counts = extractKeywordCounts('负责微服务架构设计', 'backend')
    expect(counts['微服务']).toBeGreaterThan(0)
  })

  it('未命中的方向词不出现', () => {
    const counts = extractKeywordCounts('只聊 React 和 Vue', 'backend')
    expect(counts['react']).toBeUndefined()
  })

  it('同义词归一后按主词统计', () => {
    const counts = extractKeywordCounts('精通 K8s 运维', 'backend')
    expect(counts['kubernetes']).toBeGreaterThan(0)
    expect(counts['k8s']).toBeUndefined()
  })

  it('空文本 → 空计数', () => {
    expect(extractKeywordCounts('', 'backend')).toEqual({})
  })
})

describe('buildCompareResult 覆盖率', () => {
  const JD_BACKEND =
    '任职要求：熟悉 Java、Spring Boot、MySQL、Redis，了解微服务与 Kafka，有高并发经验优先。'

  it('简历全命中 → 覆盖率 100', () => {
    const resume = '使用 Java 与 Spring Boot 开发，MySQL 存数据，Redis 做缓存，熟悉微服务，用过 Kafka，处理过高并发。'
    const r = buildCompareResult(JD_BACKEND, resume, 'backend')
    expect(r.coverage).toBe(100)
    expect(r.missingKeywords).toHaveLength(0)
    expect(r.coveredKeywords.length).toBeGreaterThan(0)
  })

  it('简历全不命中 → 覆盖率 0，缺失含全部要求词', () => {
    const resume = '我是行政助理，负责考勤与报销。'
    const r = buildCompareResult(JD_BACKEND, resume, 'backend')
    expect(r.coverage).toBe(0)
    expect(r.missingKeywords.length).toBe(r.total)
  })

  it('部分命中 → 覆盖率按已覆盖/总数计算', () => {
    const resume = '熟悉 Java，用过 MySQL。'
    const r = buildCompareResult(JD_BACKEND, resume, 'backend')
    expect(r.coveredKeywords).toContain('java')
    expect(r.coveredKeywords).toContain('mysql')
    expect(r.missingKeywords).toContain('redis')
    expect(r.coverage).toBe(Math.round((r.coveredKeywords.length / r.total) * 100))
    expect(r.coverage).toBeGreaterThan(0)
    expect(r.coverage).toBeLessThan(100)
  })

  it('缺失词按 JD 出现频次降序', () => {
    // JD 中 Redis 出现 2 次、微服务 1 次 → Redis 应排前面
    const jd = '要求懂 Redis，对 Redis 有深入理解，了解微服务。'
    const resume = 'Java 开发。'
    const r = buildCompareResult(jd, resume, 'backend')
    const idxRedis = r.missingKeywords.indexOf('redis')
    const idxMicro = r.missingKeywords.indexOf('微服务')
    // 可能两个都在；若都在则 Redis 在前
    if (idxRedis !== -1 && idxMicro !== -1) {
      expect(idxRedis).toBeLessThan(idxMicro)
    }
  })

  it('notes 给出预设补充建议', () => {
    const resume = 'Java 开发。'
    const r = buildCompareResult(JD_BACKEND, resume, 'backend')
    expect(r.notes.length).toBeGreaterThan(0)
    for (const n of r.notes) {
      expect(n.indexOf('建议在简历中明确写出')).toBeGreaterThan(-1)
    }
  })

  it('空 JD → coverage 0，summary 提示检查方向', () => {
    const r = buildCompareResult('', 'Java 简历', 'backend')
    expect(r.coverage).toBe(0)
    expect(r.summary.indexOf('岗位方向')).toBeGreaterThan(-1)
  })

  it('输出含 directionLabel 与 total', () => {
    const r = buildCompareResult(JD_BACKEND, 'Java', 'backend')
    expect(r.directionLabel).toBe('后端开发')
    expect(r.total).toBeGreaterThan(0)
  })

  it('默认方向为 backend', () => {
    expect(DEFAULT_DIRECTION).toBe('backend')
  })

  it('normalize 转小写', () => {
    expect(normalize('JavaSpring')).toBe('javaspring')
  })
})
