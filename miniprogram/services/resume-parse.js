'use strict'

/**
 * 简历结构化解析（P2-11）。
 *
 * 粘贴简历文本 → 用**预设正则与关键词**提取结构化信息：
 *   联系方式（手机 / 邮箱 / GitHub）
 *   教育背景（大学 / 学院 / 学历行）
 *   专业技能（技能标签行）
 *   经历片段（实习 / 项目 / 工作经历段落）
 *
 * 纯规则引擎，输出的是「文本里是否存在这些信息」的事实判断，
 * 与 ATS 解析器同类，不是 AI 生成。所有提取逻辑为纯函数，可单测。
 *
 * 注意：本文件位于 miniprogram/ 下，**禁止使用 ?. / ?? / for await**。
 */

const PHONE_RE = /(?:^|[^\d])(1[3-9]\d{9})(?=[^\d]|$)/g
const EMAIL_RE = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g
const GITHUB_RE = /(github\.com\/[\w.-]+)/gi

/** 教育背景命中关键词（行级） */
const EDU_KEYWORDS = ['大学', '学院', '学校', '本科', '硕士', '博士', '研究生', '大专']

/** 经历段落标题关键词（分段用） */
const SECTION_KEYWORDS = [
  '实习经历', '项目经历', '工作经历', '在校经历', '校园经历',
  '教育背景', '专业技能', '个人技能', '自我介绍',
]

/** 技能标签行关键词（该行视为技能列表） */
const SKILL_KEYWORDS = ['专业技能', '个人技能', '技能清单', '技术栈', '熟练掌握', '熟悉']

function cleanLines(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map(function (l) { return l.trim() })
    .filter(function (l) { return l })
}

function unique(arr) {
  const seen = {}
  const out = []
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i]
    if (v && !seen[v]) {
      seen[v] = true
      out.push(v)
    }
  }
  return out
}

function extractContacts(text) {
  // PHONE_RE 带前后边界 + 捕获组：用 exec 循环取 group1，避免取到边界字符
  const src = String(text)
  const phones = []
  PHONE_RE.lastIndex = 0
  let m
  while ((m = PHONE_RE.exec(src)) !== null && phones.length < 3) {
    phones.push(m[1])
  }
  const phone = unique(phones)
  const email = unique((src.match(EMAIL_RE) || []).slice(0, 3))
  const github = unique((src.match(GITHUB_RE) || []).slice(0, 3))
  return { phone: phone, email: email, github: github }
}

/** 教育：含关键词的行（如「华中科技大学 软件工程 本科」） */
function extractEducation(lines) {
  const out = []
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    if (EDU_KEYWORDS.some(function (k) { return l.indexOf(k) !== -1 })) {
      out.push(l.slice(0, 60))
    }
    if (out.length >= 5) break
  }
  return out
}

/** 技能：技能标签行 → 按逗号/空格/顿号拆词 */
function extractSkills(lines) {
  const words = []
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    if (!SKILL_KEYWORDS.some(function (k) { return l.indexOf(k) !== -1 })) continue
    // 只取这一行（及紧跟其后的最多 2 行）拆词
    const block = [l]
    for (let j = 1; j <= 2 && i + j < lines.length; j++) {
      const next = lines[i + j]
      if (SECTION_KEYWORDS.some(function (k) { return next.indexOf(k) !== -1 })) break
      block.push(next)
    }
    block.join(' ').split(/[,，、;；\s/|]+/).forEach(function (w) {
      const t = w.trim()
      if (t.length >= 2 && t.length <= 20) words.push(t)
    })
  }
  return unique(words).slice(0, 20)
}

/**
 * 经历：按段落标题切分，输出「标题 + 前 3 行正文」片段。
 * 无标题时退化为「实习/项目」关键词启发式分块。
 */
function extractExperience(lines) {
  const out = []
  let cur = null
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    const isHead = SECTION_KEYWORDS.some(function (k) { return l.indexOf(k) !== -1 })
    if (isHead) {
      if (cur && cur.body.length) out.push(cur)
      cur = { title: l.slice(0, 20), body: [] }
      continue
    }
    // 无标题段：遇到明显的「公司-岗位」行也开新段（启发式）
    if (!cur && /[-|·|—]/.test(l)) {
      cur = { title: l.slice(0, 20), body: [] }
    }
    if (cur) {
      cur.body.push(l)
      if (cur.body.length >= 4) {
        out.push(cur)
        cur = null
      }
    }
  }
  if (cur && cur.body.length) out.push(cur)
  return out.slice(0, 6)
}

/**
 * 解析简历文本为结构化对象。
 * @param text {string}
 * @returns {{ contacts:object, education:Array, skills:Array, experience:Array, hit:boolean }}
 */
function parseResume(text) {
  const lines = cleanLines(text)
  const contacts = extractContacts(text)
  const education = extractEducation(lines)
  const skills = extractSkills(lines)
  const experience = extractExperience(lines)
  const hit = !!(contacts.phone.length || contacts.email.length || education.length || skills.length)
  return {
    contacts: contacts,
    education: education,
    skills: skills,
    experience: experience,
    hit: hit,
  }
}

module.exports = {
  PHONE_RE: PHONE_RE,
  EMAIL_RE: EMAIL_RE,
  GITHUB_RE: GITHUB_RE,
  cleanLines: cleanLines,
  extractContacts: extractContacts,
  extractEducation: extractEducation,
  extractSkills: extractSkills,
  extractExperience: extractExperience,
  parseResume: parseResume,
}
