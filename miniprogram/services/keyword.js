'use strict'

/**
 * JD 关键词比对引擎（M2）。
 *
 * 替代原「AI JD 匹配」的合规方案：
 * - 用内置词库做纯字符串包含匹配，输出「关键词是否出现」的事实判断；
 * - 不调用任何模型 API，不产生生成内容；
 * - 覆盖率 = JD 要求词中被简历命中的比例。
 *
 * 注意：本文件位于 miniprogram/ 下，**禁止使用 ?. / ?? / for await**。
 */

const { canonicalize, variantsOf, directionWords, DICTIONARY } = require('./keyword-data')

function normalize(text) {
  return String(text || '').toLowerCase()
}

/**
 * 统计一段文本命中某方向词库的词及出现次数。
 * 匹配时同时检查主词与别名（如 kubernetes + k8s），命中即计入主词。
 * @returns {Object} canonicalWord → count（只含命中的词）
 */
function extractKeywordCounts(text, direction) {
  const t = normalize(text)
  const words = directionWords(direction)
  const counts = {}
  for (let i = 0; i < words.length; i++) {
    const w = words[i]
    const variants = variantsOf(w)
    let hit = false
    for (let j = 0; j < variants.length; j++) {
      if (t.indexOf(normalize(variants[j])) !== -1) {
        hit = true
        break
      }
    }
    if (hit) {
      counts[w] = (counts[w] || 0) + 1
    }
  }
  return counts
}

/**
 * JD 与简历关键词比对。
 * @param jdText {string} 岗位描述
 * @param resumeText {string} 简历文本
 * @param direction {string} 岗位方向 key（backend/frontend/...）
 * @returns {{
 *   coverage: number,        覆盖率（0-100）
 *   coveredKeywords: Array,  已覆盖关键词
 *   missingKeywords: Array,  缺失关键词（按 JD 出现频次降序）
 *   total: number,           JD 要求词总数
 *   notes: Array,            预设补充建议（缺失词生成）
 *   summary: string,         按覆盖率分段的预设评语
 *   directionLabel: string,  方向名
 * }}
 */
function buildCompareResult(jdText, resumeText, direction) {
  const jdCounts = extractKeywordCounts(jdText, direction)
  const resumeCounts = extractKeywordCounts(resumeText, direction)

  // 简历命中集合
  const resumeSet = {}
  for (const w in resumeCounts) resumeSet[w] = true

  const jdWords = Object.keys(jdCounts)
  const covered = []
  const missing = []
  for (let i = 0; i < jdWords.length; i++) {
    const w = jdWords[i]
    if (resumeSet[w]) covered.push(w)
    else missing.push(w)
  }

  // 缺失词按 JD 中出现频次降序：高频要求是重点，排前面
  missing.sort(function (a, b) {
    return (jdCounts[b] || 0) - (jdCounts[a] || 0)
  })

  const total = jdWords.length
  const coverage = total > 0 ? Math.round((covered.length / total) * 100) : 0

  const notes = missing.slice(0, 5).map(function (w) {
    return '若你有「' + w + '」相关经历，建议在简历中明确写出该关键词'
  })

  const directionLabel = (DICTIONARY[direction] || DICTIONARY.backend).label

  return {
    coverage: coverage,
    coveredKeywords: covered,
    missingKeywords: missing,
    total: total,
    notes: notes,
    summary: buildSummary(coverage, total, missing.length),
    directionLabel: directionLabel,
  }
}

/** 按覆盖率分段的预设评语 */
function buildSummary(coverage, total, missingCount) {
  if (total === 0) {
    return '没有从岗位描述中识别出常用技能关键词。建议检查岗位方向是否选对，或粘贴完整 JD。'
  }
  if (coverage >= 80) {
    return '简历与岗位要求匹配度很高，' + total + ' 个关键词已覆盖 ' + coverage + '%，直接投递把握很大。'
  }
  if (coverage >= 60) {
    return '整体匹配，但还缺 ' + missingCount + ' 个关键词（共 ' + total + ' 个）。优先补齐高频要求词，匹配度可显著提升。'
  }
  if (coverage >= 40) {
    return '匹配度一般：' + total + ' 个要求词只覆盖 ' + coverage + '%。建议对照缺失清单调整简历，让它更贴合这份 JD。'
  }
  return '匹配度偏低：简历与这份 JD 的技能要求重合少。建议先对照缺失清单补足关键词，或确认岗位方向是否对口。'
}

/** 默认岗位方向（首次进入时用） */
const DEFAULT_DIRECTION = 'backend'

module.exports = {
  DEFAULT_DIRECTION: DEFAULT_DIRECTION,
  normalize: normalize,
  extractKeywordCounts: extractKeywordCounts,
  buildCompareResult: buildCompareResult,
}
