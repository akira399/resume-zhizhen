'use strict'

/**
 * 求职 Checklist（P2-15）。
 *
 * 预设的秋招准备清单：简历 → 网申 → 笔试 → 面试 → 签约 五个阶段，
 * 每项可打勾（本地存储），给出总进度。本质是「校招经验帖整理出的
 * 结构化待办」，全部为预设静态内容，无生成。
 *
 * 注意：本文件位于 miniprogram/ 下，**禁止使用 ?. / ?? / for await**。
 */

const store = require('./store')

const COLLECTION = 'career_checklist'

/** 预设阶段与检查项（key 全局唯一，用于存储勾选态） */
const STAGES = [
  {
    key: 'resume',
    label: '简历准备',
    icon: '📄',
    items: [
      { key: 'r1', text: '完成一份主简历定稿（1 页内）' },
      { key: 'r2', text: '针对 2-3 个目标方向微调重点' },
      { key: 'r3', text: '导出 PDF 版并检查排版' },
      { key: 'r4', text: '准备好作品集 / GitHub / 项目链接' },
      { key: 'r5', text: '用「简历自查」过一遍清单' },
    ],
  },
  {
    key: 'apply',
    label: '网申投递',
    icon: '📨',
    items: [
      { key: 'a1', text: '整理目标公司 + 岗位清单' },
      { key: 'a2', text: '找内推渠道（学长 / 内推平台）' },
      { key: 'a3', text: '统一网申账号与密码（建表记录）' },
      { key: 'a4', text: '每条投递都记进「求职看板」' },
      { key: 'a5', text: '每周核对投递数量是否达标' },
    ],
  },
  {
    key: 'written',
    label: '笔试准备',
    icon: '✍️',
    items: [
      { key: 'w1', text: '制定刷题计划并每天执行' },
      { key: 'w2', text: '用「面试题库」过高频算法题' },
      { key: 'w3', text: '模拟一次限时笔试' },
      { key: 'w4', text: '熟悉机考环境（编辑器/输入输出）' },
    ],
  },
  {
    key: 'interview',
    label: '面试准备',
    icon: '💬',
    items: [
      { key: 'i1', text: '准备好 1 分钟自我介绍' },
      { key: 'i2', text: '准备 3 分钟项目深挖讲法（STAR）' },
      { key: 'i3', text: '过一遍「面试题库」高频行为题' },
      { key: 'i4', text: '用「练习室」开口练 3 次' },
      { key: 'i5', text: '面试后当天做「面试复盘」' },
    ],
  },
  {
    key: 'offer',
    label: '签约入职',
    icon: '🤝',
    items: [
      { key: 'o1', text: '收集多家 Offer 信息做对比' },
      { key: 'o2', text: '用「Offer 对比」打分选 offer' },
      { key: 'o3', text: '确认薪资 / 五险一金 / 户口政策' },
      { key: 'o4', text: '走三方协议流程并留档' },
      { key: 'o5', text: '准备入职材料（证件照/体检等）' },
    ],
  },
]

function readChecked() {
  const v = store.get(COLLECTION, {})
  return v && typeof v === 'object' ? v : {}
}

function writeChecked(all) {
  store.set(COLLECTION, all)
}

/** 校验勾选 key 是否合法（只接受预设检查项） */
function isKnownKey(key) {
  for (let i = 0; i < STAGES.length; i++) {
    for (let j = 0; j < STAGES[i].items.length; j++) {
      if (STAGES[i].items[j].key === key) return true
    }
  }
  return false
}

/**
 * 视图模型：每个阶段带 checked 状态与阶段进度。
 * @returns {Array<{key,label,icon,done,total,items:Array<{key,text,checked}>}>}
 */
function getStages() {
  const checked = readChecked()
  return STAGES.map(function (s) {
    const items = s.items.map(function (it) {
      return { key: it.key, text: it.text, checked: Boolean(checked[it.key]) }
    })
    const done = items.filter(function (it) { return it.checked }).length
    return {
      key: s.key,
      label: s.label,
      icon: s.icon,
      done: done,
      total: items.length,
      items: items,
    }
  })
}

/** 切换某检查项。返回新的勾选态；非法 key 返回 null。 */
function toggle(key) {
  if (!isKnownKey(key)) return null
  const all = readChecked()
  const next = !Boolean(all[key])
  all[key] = next
  writeChecked(all)
  return next
}

/** 总进度（返回 done/total）。 */
function progress() {
  const stages = getStages()
  let done = 0
  let total = 0
  for (let i = 0; i < stages.length; i++) {
    done += stages[i].done
    total += stages[i].total
  }
  return { done: done, total: total }
}

/** 重置全部勾选。 */
function reset() {
  writeChecked({})
}

module.exports = {
  COLLECTION: COLLECTION,
  STAGES: STAGES,
  isKnownKey: isKnownKey,
  getStages: getStages,
  toggle: toggle,
  progress: progress,
  reset: reset,
}
