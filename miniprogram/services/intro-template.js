'use strict'

/**
 * 自我介绍模板（P2-16）。
 *
 * 用户填空 → 套用预设模板生成 1 分钟 / 3 分钟两个版本的自我介绍。
 * 产物 = 预设结构 + 用户自己填的内容，不是 AI 生成，合规。
 *
 * 注意：本文件位于 miniprogram/ 下，**禁止使用 ?. / ?? / for await**。
 */

/** 可填写的字段说明（页面表单用） */
const FIELDS = [
  { key: 'name', label: '姓名' },
  { key: 'school', label: '学校' },
  { key: 'major', label: '专业' },
  { key: 'grade', label: '年级（如：本科 2027 届）' },
  { key: 'direction', label: '求职方向（如：后端开发）' },
  { key: 'skills', label: '核心技能（如：Java、Spring Boot、MySQL）' },
  { key: 'project', label: '代表性项目 / 经历' },
  { key: 'highlight', label: '项目亮点（量化结果）' },
  { key: 'trait', label: '性格特质（2-3 个词）' },
]

const DURATIONS = [
  { key: 'min1', label: '1 分钟' },
  { key: 'min3', label: '3 分钟' },
]

/** 校验表单：必填字段给明确提示 */
function validateIntro(form) {
  const src = form && typeof form === 'object' ? form : {}
  const required = ['name', 'school', 'direction', 'skills', 'project']
  for (let i = 0; i < required.length; i++) {
    const k = required[i]
    if (!String(src[k] || '').trim()) {
      const label = (FIELDS.find(function (f) { return f.key === k }) || {}).label || k
      return { ok: false, reason: '请填写「' + label + '」' }
    }
  }
  return { ok: true, value: normalizeIntro(src) }
}

/** 各字段裁剪到合理长度 */
function normalizeIntro(src) {
  const out = {}
  FIELDS.forEach(function (f) {
    out[f.key] = String(src[f.key] || '').trim().slice(0, 50)
  })
  return out
}

/** 组装 1 分钟版 */
function buildMin1(v) {
  return (
    '面试官你好，我是' + v.school + v.major + '的' + v.name + '，' + v.grade + '。' +
    '我求职的方向是' + v.direction + '。' +
    '在校期间我主要掌握' + v.skills + '，并在「' + v.project + '」中' + v.highlight + '。' +
    '我做事' + v.trait + '，希望有机会加入贵公司，谢谢。'
  )
}

/** 组装 3 分钟版（三段式：身份 → 经历 → 意向） */
function buildMin3(v) {
  return (
    '【第一段 · 基本身份】\n' +
    '面试官你好，我是' + v.school + v.major + '的' + v.name + '，' + v.grade + '，' +
    '求职方向是' + v.direction + '。\n\n' +
    '【第二段 · 项目与亮点】\n' +
    '我重点掌握的技能包括' + v.skills + '。在「' + v.project + '」这个项目中，' + v.highlight + '。' +
    '这段经历让我把课堂知识真正用到了实际问题上。\n\n' +
    '【第三段 · 求职意向】\n' +
    '我做事' + v.trait + '，学习和抗压能力都比较强。' +
    '贵公司在' + v.direction + '方向上的业务与我长期的兴趣高度契合，' +
    '希望有机会加入团队，边学边做、尽快产出价值，谢谢！'
  )
}

/**
 * 生成自我介绍文本。
 * @param form {object} 用户填写的字段
 * @param duration {string} 'min1' | 'min3'
 * @returns {{ ok:boolean, reason?:string, text?:string, durationLabel?:string }}
 */
function buildIntro(form, duration) {
  const checked = validateIntro(form)
  if (!checked.ok) return checked

  const label = (DURATIONS.find(function (d) { return d.key === duration }) || DURATIONS[0]).label
  const text = duration === 'min3' ? buildMin3(checked.value) : buildMin1(checked.value)
  return { ok: true, text: text, durationLabel: label }
}

module.exports = {
  FIELDS: FIELDS,
  DURATIONS: DURATIONS,
  validateIntro: validateIntro,
  normalizeIntro: normalizeIntro,
  buildMin1: buildMin1,
  buildMin3: buildMin3,
  buildIntro: buildIntro,
}
