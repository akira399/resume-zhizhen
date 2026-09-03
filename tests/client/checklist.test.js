import { describe, it, expect } from 'vitest'
import {
  DIMENSIONS,
  STATUS,
  TOTAL_ITEMS,
  defaultAnswers,
  buildChecklistResult,
  dimensionsWithItems,
  autoDetect,
} from '../../miniprogram/services/checklist'

describe('规则与数据契约', () => {
  it('共 5 个维度、24 个检查项', () => {
    expect(DIMENSIONS).toHaveLength(5)
    expect(TOTAL_ITEMS).toBe(24)
  })

  it('五个维度权重合计 100', () => {
    const total = DIMENSIONS.reduce((sum, d) => sum + d.weight, 0)
    expect(total).toBe(100)
  })

  it('每个检查项都有 text 与 guide（页面渲染与失分指引依赖）', () => {
    for (const d of DIMENSIONS) {
      for (const it of d.items) {
        expect(typeof it.text).toBe('string')
        expect(it.text.length).toBeGreaterThan(0)
        expect(typeof it.guide).toBe('string')
        expect(it.guide.length).toBeGreaterThan(0)
      }
    }
  })

  it('检查项 key 全局唯一', () => {
    const keys = []
    for (const d of DIMENSIONS) {
      for (const it of d.items) keys.push(it.key)
    }
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('dimensionsWithItems 保留结构供页面渲染', () => {
    const list = dimensionsWithItems()
    expect(list).toHaveLength(5)
    expect(list[0].items).toHaveLength(6)
  })
})

describe('评分逻辑', () => {
  it('全部「已做到」→ 100 分', () => {
    const ans = defaultAnswers()
    Object.keys(ans).forEach((k) => { ans[k] = STATUS.DONE })
    const r = buildChecklistResult(ans)
    expect(r.score).toBe(100)
    expect(r.items).toHaveLength(0)
    expect(r.doneCount).toBe(24)
  })

  it('全部「不适用」→ 100 分（na 不计入分母）', () => {
    const ans = defaultAnswers()
    Object.keys(ans).forEach((k) => { ans[k] = STATUS.NA })
    const r = buildChecklistResult(ans)
    expect(r.score).toBe(100)
    expect(r.items).toHaveLength(0)
  })

  it('默认全部「待确认」→ 不出分、不失分（不预判好坏）', () => {
    const r = buildChecklistResult(defaultAnswers())
    expect(r.score).toBe(null)
    expect(r.items).toHaveLength(0)
    expect(r.todoCount).toBe(0)
    expect(r.pendingCount).toBe(24)
  })

  it('维度内还有「待确认」→ 该维度不参与评分', () => {
    const ans = defaultAnswers()
    ans.contact = STATUS.DONE // 结构维度 6 项只确认 1 项
    const r = buildChecklistResult(ans)
    expect(r.score).toBe(null) // 结构维度没看完 → 无维度可评分
    expect(r.pendingCount).toBe(23)
    expect(r.confirmed).toBe(1)
  })

  it('整维确认后：按已确认维度归一，满分恒为 100', () => {
    const ans = defaultAnswers()
    DIMENSIONS[0].items.forEach((it) => { ans[it.key] = STATUS.DONE }) // 结构维度 6 项全 done，其余待确认
    const r = buildChecklistResult(ans)
    expect(r.score).toBe(100) // 已确认维度满分 → 100（归一化）
    expect(r.pendingCount).toBe(18)
    expect(r.confirmed).toBe(6)
  })

  it('待改进项拉低总分（加权归一验证）', () => {
    const ans = defaultAnswers()
    ans.contact = STATUS.TODO // 结构维度缺一项 → 得分率 5/6
    Object.keys(ans).forEach((k) => {
      if (ans[k] === STATUS.PENDING && k !== 'contact') ans[k] = STATUS.DONE
    })
    const r = buildChecklistResult(ans)
    // 结构 83×20 + 其余 4 维 100×(25+25+15+15)=8000 → 9660/100=96.6→97
    expect(r.score).toBe(97)
    expect(r.todoCount).toBe(1)
  })

  it('缺失的 key 按「待确认」处理（防漏传且不虚给分）', () => {
    const r = buildChecklistResult({})
    expect(r.score).toBe(null)
  })

  it('na 不计入分母：维度内 na 后剩余全 done → 该维度仍满分', () => {
    const ans = defaultAnswers()
    const dim = DIMENSIONS[3] // verb 维度 4 项
    dim.items.forEach((it, idx) => {
      ans[it.key] = idx === 0 ? STATUS.NA : STATUS.DONE
    })
    // 其余维度明确不适用（na），避免 pending 干扰
    DIMENSIONS.forEach((d, di) => {
      if (di === 3) return
      d.items.forEach((it) => { ans[it.key] = STATUS.NA })
    })
    const r = buildChecklistResult(ans)
    expect(r.score).toBe(100) // 有效维度全部满分（na 不拖分）
    expect(r.pendingCount).toBe(0)
  })
})

describe('输出结构', () => {
  it('失分项带 所属维度 / 检查项原文 / 改进指引', () => {
    const ans = defaultAnswers()
    ans.contact = STATUS.TODO // 明确标为待改进
    Object.keys(ans).forEach((k) => {
      if (ans[k] === STATUS.PENDING) ans[k] = STATUS.DONE
    })
    const r = buildChecklistResult(ans)
    expect(r.items.length).toBe(1)
    const first = r.items[0]
    expect(typeof first.section).toBe('string')
    expect(typeof first.problem).toBe('string')
    expect(typeof first.suggested).toBe('string')
    expect(first.problem.length).toBeGreaterThan(0)
  })

  it('notes 给出前 4 条改进指引（复制 / 历史记录用）', () => {
    const ans = defaultAnswers()
    ans.contact = STATUS.TODO
    Object.keys(ans).forEach((k) => {
      if (ans[k] === STATUS.PENDING) ans[k] = STATUS.DONE
    })
    const r = buildChecklistResult(ans)
    expect(r.notes.length).toBeGreaterThan(0)
    expect(r.notes.length).toBeLessThanOrEqual(4)
    for (const n of r.notes) expect(n.length).toBeGreaterThan(0)
  })

  it('summary 按分数段返回非空评语', () => {
    const ans = defaultAnswers()
    Object.keys(ans).forEach((k) => { ans[k] = STATUS.DONE })
    const r = buildChecklistResult(ans)
    expect(r.summary.length).toBeGreaterThan(0)
  })

  it('dimensions 输出含 pct（页面进度条用，最小 2%）', () => {
    const ans = defaultAnswers()
    Object.keys(ans).forEach((k) => { ans[k] = STATUS.DONE })
    const r = buildChecklistResult(ans)
    expect(r.dimensions).toHaveLength(5)
    for (const d of r.dimensions) {
      expect(d.pct).toBeGreaterThanOrEqual(2)
      expect(d.pct).toBeLessThanOrEqual(100)
    }
  })

  it('未确认维度 score 为 null 且带 pending 标记（供页面显示「待确认」）', () => {
    const ans = defaultAnswers()
    DIMENSIONS[0].items.forEach((it) => { ans[it.key] = STATUS.DONE })
    const r = buildChecklistResult(ans)
    const pendingDims = r.dimensions.filter((d) => d.pending)
    expect(pendingDims.length).toBe(4)
    pendingDims.forEach((d) => { expect(d.score).toBe(null) })
  })
})

/** 一份「看起来不错」的简历（用于自动检测应判 done 的项） */
const GOOD_RESUME = [
  '张三',
  '电话：13800138000',
  '邮箱：zhangsan@example.com',
  '教育背景：华中科技大学 软件工程 本科 2027 届',
  '专业技能：Java、Spring Boot、MySQL、Redis',
  '',
  '实习经历',
  '字节跳动 · 后端开发实习生',
  '主导订单接口重构，QPS 从 800 提升到 3000，支撑 10 万日活用户',
  '2 周内完成微服务拆分，服务可用性达 99.9%',
  '项目经历',
  '校园二手交易平台（独立开发）',
  '独立完成前后端与部署，上线后 3 个月沉淀 500+ 用户',
].join('\n')

/** 一份问题明显的简历（弱动词 + 模板话术 + 无量化 + 身份证） */
const BAD_RESUME = [
  '张三',
  '教育背景：XX 大学 计算机专业',
  '在校经历',
  '参与学校社团活动，协助组织校园技术分享会',
  '性格开朗，学习能力强，认真负责，具有良好的沟通能力',
  '身份证号 110101199001011234',
  '个人技能',
  '参与过某某系统开发，协助导师完成实验数据处理',
  '参与了开源社区某项目的翻译与测试工作',
  '工作积极，吃苦耐劳，希望为团队做出贡献',
].join('\n')

describe('autoDetect 自动预检（产品价值核心）', () => {
  it('好简历：自动判定联系方式/教育/技能/经历/量化/强动词等', () => {
    const r = autoDetect(GOOD_RESUME)
    expect(r.tooShort).toBe(false)
    expect(r.answers.contact).toBe('done')
    expect(r.answers.education).toBe('done')
    expect(r.answers.experience).toBe('done')
    expect(r.answers.skills).toBe('done')
    expect(r.answers.metric).toBe('done')
    expect(r.answers.scale).toBe('done')
    expect(r.answers.cost).toBe('done')
    expect(r.answers.strong).toBe('done')
    expect(r.answers.weak).toBe('done') // 无弱表述
    expect(r.answers.template).toBe('done') // 无模板话术
    expect(r.detected).toBeGreaterThan(8)
  })

  it('问题简历：自动标出待改进（弱动词/模板话术/敏感信息/无量化）', () => {
    const r = autoDetect(BAD_RESUME)
    expect(r.answers.weak).toBe('todo') // 出现「参与/协助」
    expect(r.answers.template).toBe('todo') // 出现「性格开朗」
    expect(r.answers.privacy).toBe('todo') // 身份证号
    expect(r.answers.metric).toBeUndefined() // 无量化数字（不判 done）
    expect(r.answers.contact).toBeUndefined() // 无联系方式
  })

  it('太短的文本不做任何判定（防误判）', () => {
    const r = autoDetect('几句话')
    expect(r.tooShort).toBe(true)
    expect(r.detected).toBe(0)
    expect(r.needConfirm).toBe(24)
  })
})
