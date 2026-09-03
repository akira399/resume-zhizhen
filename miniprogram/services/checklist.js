'use strict'

/**
 * 简历自查清单（M1）规则引擎。
 *
 * 替代原「AI 简历诊断」的合规方案：
 * - 检查项、改进指引、评分权重全部为**开发时写死的预设内容**；
 * - 不调用任何模型 API，不产生任何生成内容；
 * - 本质是「体检表 / 成熟度评估」类工具型表单。
 *
 * 输入：24 项勾选状态 answers（done=已做到 / todo=待改进 / na=不适用）
 * 输出：总分（加权）、各维度得分、失分项清单、改进要点、总结评语
 *
 * 注意：本文件位于 miniprogram/ 下，**禁止使用 ?. / ?? / for await**。
 */

/** 五个评估维度及权重（合计 100）。 */
const DIMENSIONS = [
  {
    key: 'structure',
    label: '结构与完整性',
    weight: 20,
    items: [
      { key: 'contact', text: '含清晰的联系方式（姓名 + 电话 + 邮箱）', guide: '联系方式放页首一行，号码与邮箱务必核对无误' },
      { key: 'education', text: '教育背景完整（学校 / 专业 / 起止时间）', guide: '应届生教育背景置顶，含专业与毕业年份' },
      { key: 'experience', text: '有实习或项目经历区块', guide: '没有经历区块的简历面试官无从提问，至少要有一个项目' },
      { key: 'skills', text: '有技能清单区块', guide: '技能分「熟悉 / 了解」两档，与岗位要求呼应' },
      { key: 'length', text: '篇幅合理（应届 1 页，社招不超过 2 页）', guide: '超过 2 页的简历 HR 通常不会看完' },
      { key: 'order', text: '经历按时间倒序排列', guide: '最近的一段经历放最前，这是 HR 的阅读习惯' },
    ],
  },
  {
    key: 'star',
    label: 'STAR 表达',
    weight: 25,
    items: [
      { key: 'situation', text: '关键经历说明背景 / 情境（S）', guide: '用一句话交代「在什么项目 / 什么场景下」' },
      { key: 'task', text: '说明你的目标 / 职责（T）', guide: '明确「你负责哪一块」，而不是整个项目' },
      { key: 'action', text: '行动（A）是描述主体，体现你的具体做法', guide: '写「我做了什么决策 / 如何实现」，篇幅占比最高' },
      { key: 'result', text: '有结果（R）：产出 / 影响 / 验收情况', guide: '结尾落一句「结果如何」，如按时上线、指标变化' },
      { key: 'independent', text: '每条经历独立描述，不是流水账', guide: '删掉「负责日常维护」这类零信息条目，保留有产出的' },
    ],
  },
  {
    key: 'quantify',
    label: '量化成果',
    weight: 25,
    items: [
      { key: 'metric', text: '关键成果带数字（提升 % / 缩短时长 / 降低成本）', guide: '「性能提升 40%」优于「性能显著提升」' },
      { key: 'scale', text: '说明规模（用户数 / 接口数 / 并发量 / 覆盖范围）', guide: '「支撑 10 万用户」「日请求 500 万」体现复杂度' },
      { key: 'cost', text: '有时间 / 成本维度（周期、节省的工时）', guide: '「2 周内完成」「节省团队 30% 重复劳动」' },
      { key: 'coverage', text: '量化覆盖 3 条以上关键经历', guide: '只量化一条不够，面试官会追问其他经历同样的问题' },
    ],
  },
  {
    key: 'verb',
    label: '行动动词',
    weight: 15,
    items: [
      { key: 'strong', text: '使用「主导 / 搭建 / 优化 / 推动」等强动词', guide: '强动词传递「我干了实事」的信号' },
      { key: 'weak', text: '没有「参与 / 负责 / 协助」等弱表述（或已改写）', guide: '「参与 XX」无法体现你的贡献，改为「实现 XX」' },
      { key: 'matched', text: '动词与目标岗位方向匹配', guide: '投研发岗多写实现类动词，投运营岗多写增长类动词' },
      { key: 'template', text: '没有「性格开朗 / 学习能力强」等模板话术', guide: '自我评价用事实替代形容词，与岗位强绑定' },
    ],
  },
  {
    key: 'format',
    label: '格式规范',
    weight: 15,
    items: [
      { key: 'typo', text: '无错别字与语病', guide: '投递前通读一遍，或用输入法校对' },
      { key: 'punctuation', text: '标点符号统一（全角 / 半角一致）', guide: '混用全半角会显得不专业' },
      { key: 'privacy', text: '无敏感信息（身份证号 / 银行卡等）', guide: '简历只留联系方式，不写证件号' },
      { key: 'honest', text: '无夸张虚假表述（如与经历不符的「精通」）', guide: '面试必问简历细节，写「精通」就要能应对深挖' },
      { key: 'export', text: '已导出为 PDF（方便投递）', guide: 'PDF 格式在任何终端排版都不乱' },
    ],
  },
]

/**
 * 每个检查项的答案状态。
 * pending（待确认）= 尚未处理的中性态——默认值不再是「待改进」，
 * 避免用户一进来就看到满屏红字误以为简历一无是处。
 * pending 不计入评分（与 na 同理），但会在结果里提示还有几项未确认。
 */
const STATUS = {
  DONE: 'done',
  TODO: 'todo',
  NA: 'na',
  PENDING: 'pending',
}

const STATUS_LABEL = {
  done: '已做到',
  todo: '待改进',
  na: '不适用',
  pending: '待确认',
}

/** 展平：key → 检查项，供页面索引与答案回填 */
function flattenItems() {
  const out = {}
  for (let i = 0; i < DIMENSIONS.length; i++) {
    const items = DIMENSIONS[i].items
    for (let j = 0; j < items.length; j++) {
      out[items[j].key] = items[j]
    }
  }
  return out
}

const ITEM_BY_KEY = flattenItems()

/** 检查项总数 */
const TOTAL_ITEMS = Object.keys(ITEM_BY_KEY).length

/** 汇总各维度检查项数（页面分区展示用） */
function dimensionsWithItems() {
  return DIMENSIONS.map(function (d) {
    return { key: d.key, label: d.label, weight: d.weight, items: d.items }
  })
}

/** 默认答案：全部「待确认」（中性态，不预判好坏） */
function defaultAnswers() {
  const out = {}
  for (let i = 0; i < DIMENSIONS.length; i++) {
    const items = DIMENSIONS[i].items
    for (let j = 0; j < items.length; j++) {
      out[items[j].key] = STATUS.PENDING
    }
  }
  return out
}

/**
 * 计算单项答案是否为「通过」。
 * done = 通过；na = 不计入；todo = 失分。
 */
function isPassed(answer) {
  return answer === STATUS.DONE
}

function isExcluded(answer) {
  // na（不适用）与 pending（未确认）都不进入评分分母
  return answer === STATUS.NA || answer === STATUS.PENDING
}

/**
 * 计算自查结果。
 * @param answers {object} key → STATUS 值；缺失的按「待改进」处理
 * @returns {{
 *   score: number,            总分（0-100）
 *   dimensions: Array,        各维度得分 [{key,label,weight,score,pct}]
 *   items: Array,             失分项（带指引）[{section,problem,suggested}]
 *   notes: Array,             改进要点（前 4 条失分项的指引）
 *   summary: string,          按分数段的预设评语
 *   doneCount: number,        已做到项数
 *   todoCount: number,        待改进项数
 * }}
 */
function buildChecklistResult(answers) {
  const ans = answers && typeof answers === 'object' ? answers : {}

  let totalWeighted = 0
  let weightSum = 0 // 参与评分的有效权重（含全 na 维度；含 pending 的维度不计入）
  let dimResults = []
  let failedItems = []
  let pendingCount = 0

  for (let i = 0; i < DIMENSIONS.length; i++) {
    const dim = DIMENSIONS[i]
    const items = dim.items

    let done = 0
    let valid = 0
    let hasPending = false
    for (let j = 0; j < items.length; j++) {
      const key = items[j].key
      const answer = ans[key] || STATUS.PENDING
      if (answer === STATUS.PENDING) {
        pendingCount++
        hasPending = true
      }
      if (isExcluded(answer)) continue
      valid++
      if (isPassed(answer)) done++
      else {
        failedItems.push({
          section: dim.label,
          problem: items[j].text,
          suggested: items[j].guide,
        })
      }
    }

    // 维度里还有「待确认」→ 不参与评分（还没看完这一维，不能给它算分）
    if (hasPending) {
      dimResults.push({
        key: dim.key,
        label: dim.label,
        weight: dim.weight,
        score: null,
        pending: true,
        pct: 0,
      })
      continue
    }

    const dimScore = valid > 0 ? Math.round((done / valid) * 100) : 100 // 全 na → 100
    dimResults.push({
      key: dim.key,
      label: dim.label,
      weight: dim.weight,
      score: dimScore,
      pending: false,
      pct: Math.max(dimScore, 2), // 视觉最小 2%，避免全 0 时图表塌陷
    })
    weightSum += dim.weight
    totalWeighted += dimScore * dim.weight
  }

  const confirmed = TOTAL_ITEMS - pendingCount

  // 有任一维度参与了评分才有总分；全部待确认时返回 null（页面提示先逐项确认）
  const score = weightSum > 0 ? Math.round(totalWeighted / weightSum) : null

  const notes = failedItems.slice(0, 4).map(function (it) {
    return it.suggested
  })

  return {
    score: score,
    dimensions: dimResults,
    items: failedItems,
    notes: notes,
    summary: buildSummary(score, failedItems.length, pendingCount),
    doneCount: countStatus(ans, STATUS.DONE),
    todoCount: failedItems.length,
    pendingCount: pendingCount,
    confirmed: confirmed,
  }
}

function countStatus(answers, status) {
  let n = 0
  for (let i = 0; i < DIMENSIONS.length; i++) {
    const items = DIMENSIONS[i].items
    for (let j = 0; j < items.length; j++) {
      const key = items[j].key
      if ((answers[key] || STATUS.PENDING) === status) n++
    }
  }
  return n
}

/** 按分数段生成预设评语（纯模板，非生成内容） */
function buildSummary(score, failedCount, pendingCount) {
  if (score === null) {
    if (pendingCount > 0) {
      return '还有 ' + pendingCount + ' 项标着「待确认」。把每一维都过一遍（已做到 / 待改进 / 不适用），确认完才会出总分。'
    }
    return '还没有确认任何检查项。请逐项把清单过一遍（已做到 / 待改进 / 不适用），确认完再生成评分。'
  }
  if (score >= 85) {
    return '简历整体优秀：结构与表达都很到位，只需微调个别条目即可投递。'
  }
  if (score >= 70) {
    return '简历整体良好，但仍有 ' + failedCount + ' 项可以改进。优先处理量化成果与 STAR 表达，说服力会明显提升。'
  }
  if (score >= 55) {
    return '简历结构基本完整，但说服力不足：建议按 STAR 法则重写关键经历，并补充量化成果。' + failedCount + ' 个待改进项见下方清单。'
  }
  return '简历需要较大改动：建议对照下方 ' + failedCount + ' 个检查项逐项按指引修改，重写后再投递。'
}

// ---------------------------------------------------------------- 自动检测

/**
 * 自动检测器（v1.2 升级）。
 *
 * 为什么要有它：纯手动勾选清单 = 用户自己对着简历也能做，产品没价值。
 * 升级为「规则自动预检」：加载简历后，系统先用正则把**能判的项**自动判掉
 * （联系方式在不在、有没有数字成果、用没用弱动词…），
 * 判不了（时间顺序、错别字、导出 PDF 等）才留给用户人工确认。
 *
 * 这是「简历 ATS 关键词检测」同类规则技术，不是 AI 生成，合规。
 *
 * 约定：每个 detector 输入整段简历文本，返回：
 *   'done' —— 明确做到；'todo' —— 明确缺失/违规；null —— 无法自动判断（人工确认）
 */

const TEXT_MIN = 100 // 低于该长度视为没填实质内容，不做任何判定

function hasAny(text, re) {
  return re.test(text)
}

/** 文本太短时的判定守卫 */
function isTooShort(text) {
  return String(text || '').trim().length < TEXT_MIN
}

/** key → 检测函数（只放能可靠判定的项；其余项自动走人工确认） */
const DETECTORS = {
  // —— 结构 ——
  contact: function (t) {
    // 手机号前后不能是数字：身份证里的 19xxxx 段会被 1[3-9]\d{9} 误匹配
    const phone = /(?:^|[^\d])1[3-9]\d{9}(?=[^\d]|$)/
    const email = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
    return phone.test(t) || email.test(t) ? 'done' : null
  },
  education: function (t) {
    return hasAny(t, /(大学|学院|本科|硕士|博士|研究生)/) ? 'done' : null
  },
  experience: function (t) {
    return hasAny(t, /(实习经历|项目经历|工作经历|在校经历|校园经历|实习\s|项目经验)/) ? 'done' : null
  },
  skills: function (t) {
    return hasAny(t, /(专业技能|个人技能|技术栈|熟练掌握|熟练使用|熟悉\s|掌握)/) ? 'done' : null
  },
  length: function (t) {
    const n = String(t || '').trim().length
    if (n <= 2000) return 'done' // 应届 1 页中文正文量级
    if (n > 4000) return 'todo'  // 明显超过 2 页
    return null
  },
  // —— STAR ——
  action: function (t) {
    return hasAny(t, /(主导|搭建|优化|重构|实现|开发|设计|推动|从 ?0 ?到 ?1)/) ? 'done' : null
  },
  result: function (t) {
    return hasAny(t, /\d/) && hasAny(t, /(提升|提高|降低|减少|缩短|节省|达到|上线|支撑|覆盖|增长|同比下降|耗时)/) ? 'done' : null
  },
  // —— 量化 ——
  metric: function (t) {
    return hasAny(t, /\d+(\.\d+)?%/) || hasAny(t, /(提升|提高|降低|缩短)[^\n，。]*\d+/) ? 'done' : null
  },
  scale: function (t) {
    return hasAny(t, /(万|亿|百万|QPS|TPS|并发|日活|DAU|用户|接口|请求|覆盖|节点|集群)/) ? 'done' : null
  },
  cost: function (t) {
    return hasAny(t, /\d+\s*(天|周|月|小时)/) && hasAny(t, /(完成|上线|交付|节省|缩短|提前)/) ? 'done' : null
  },
  // —— 动词 ——
  strong: function (t) {
    return hasAny(t, /(主导|搭建|优化|推动|重构|落地|独立|从 ?0 ?到 ?1)/) ? 'done' : null
  },
  weak: function (t) {
    // 通篇没有任何弱表述才算「已做到」；出现则提示改写
    return hasAny(t, /(参与|协助|帮忙|配合团队|负责日常)/) ? 'todo' : 'done'
  },
  template: function (t) {
    return hasAny(t, /(性格开朗|学习能力强|吃苦耐劳|认真负责|具有良好的|团队合作精神|工作积极|抗压能力强)/)
      ? 'todo'
      : 'done'
  },
  // —— 格式 ——
  privacy: function (t) {
    return hasAny(t, /\d{17}[\dXx]/) || hasAny(t, /(身份证号|银行卡号)/) ? 'todo' : null
  },
  punctuation: function (t) {
    // 中英文括号混用即提示统一
    const hasFull = /[（）]/.test(t)
    const hasHalf = /[()]/.test(t)
    return hasFull && hasHalf ? 'todo' : null
  },
}

/**
 * 对简历文本做自动预检。
 * @param text {string}
 * @returns {{ answers:object, auto:object, detected:number, needConfirm:number, tooShort:boolean }}
 *   answers：被自动判定的项（key → done/todo），未判定的项不在其中
 *   auto：key → done/todo，标记页面「自动检测」来源
 */
function autoDetect(text) {
  if (isTooShort(text)) {
    return {
      answers: {},
      auto: {},
      detected: 0,
      needConfirm: TOTAL_ITEMS,
      tooShort: true,
    }
  }
  const src = String(text || '')
  const answers = {}
  const auto = {}
  const keys = Object.keys(DETECTORS)
  for (let i = 0; i < keys.length; i++) {
    const verdict = DETECTORS[keys[i]](src)
    if (verdict === null) continue
    answers[keys[i]] = verdict
    auto[keys[i]] = verdict
  }
  return {
    answers: answers,
    auto: auto,
    detected: Object.keys(auto).length,
    needConfirm: TOTAL_ITEMS - Object.keys(auto).length,
    tooShort: false,
  }
}

module.exports = {
  DIMENSIONS: DIMENSIONS,
  STATUS: STATUS,
  STATUS_LABEL: STATUS_LABEL,
  ITEM_BY_KEY: ITEM_BY_KEY,
  TOTAL_ITEMS: TOTAL_ITEMS,
  TEXT_MIN: TEXT_MIN,
  DETECTORS: DETECTORS,
  flattenItems: flattenItems,
  dimensionsWithItems: dimensionsWithItems,
  defaultAnswers: defaultAnswers,
  isPassed: isPassed,
  isExcluded: isExcluded,
  buildChecklistResult: buildChecklistResult,
  autoDetect: autoDetect,
}
