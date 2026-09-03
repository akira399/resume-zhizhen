'use strict'

/**
 * 校招时间线（F10）：首页 hero 的节点倒计时。
 *
 * ## 为什么是本地纯函数
 *
 * 校招节点（提前批/正式批/补录/春招）是每年循环的固定日历知识，
 * 不需要云端配置、不需要网络请求——0 额度、0 延迟。
 * 节点日期若未来要做成可配置，再迁到 config 集合不迟。
 *
 * 注意：本文件位于 miniprogram/ 下，禁止使用 ?. / ?? / for await。
 */

const DAY_MS = 24 * 60 * 60 * 1000

/** 校招年度节点（month/day 每年循环，升序） */
const STAGES = [
  { month: 6, day: 1, name: '秋招提前批', desc: '大厂提前批陆续开启' },
  { month: 8, day: 1, name: '秋招正式批', desc: '网申高峰，投递黄金期' },
  { month: 11, day: 1, name: '秋招补录', desc: '补录与捡漏窗口' },
  { month: 3, day: 1, name: '春招', desc: '岗位少于秋招，出手要快' },
  { month: 5, day: 1, name: '春招尾声', desc: '最后的补录机会' },
]

/** 节点开始后多少天内显示阶段描述（之后切换为倒计时） */
const FRESH_DAYS = 45

/**
 * 计算当前校招阶段与下一节点倒计时（纯函数，可单测）。
 *
 * @param nowMs {number} 可注入的当前时间（测试用）
 * @returns {{ name:string, desc:string, nextName:string, days:number, text:string } | null}
 *   text 为可直接展示的一行文案；无节点时返回 null（不会发生，防御性）
 */
function recruitStage(nowMs) {
  const now = nowMs || Date.now()
  const year = new Date(now).getFullYear()

  // 生成去年/今年/明年的节点实例：跨年（如 12 月看 3 月春招）也能正确取到下一节点
  const timeline = []
  for (let y = year - 1; y <= year + 1; y++) {
    for (let i = 0; i < STAGES.length; i++) {
      const s = STAGES[i]
      timeline.push({
        name: s.name,
        desc: s.desc,
        at: new Date(y, s.month - 1, s.day).getTime(),
      })
    }
  }
  timeline.sort(function (a, b) {
    return a.at - b.at
  })

  let current = null
  let next = null
  for (let i = 0; i < timeline.length; i++) {
    if (timeline[i].at <= now) {
      current = timeline[i]
    } else {
      next = timeline[i]
      break
    }
  }
  if (!current) return null

  const days = next ? Math.ceil((next.at - now) / DAY_MS) : 0
  const fresh = now - current.at < FRESH_DAYS * DAY_MS
  const text = fresh
    ? current.name + '进行中 · ' + current.desc
    : current.name + '进行中 · 距' + (next ? next.name : '') + '还有 ' + days + ' 天'

  return {
    name: current.name,
    desc: current.desc,
    nextName: next ? next.name : '',
    days: days,
    text: text,
  }
}

module.exports = {
  STAGES: STAGES,
  recruitStage: recruitStage,
}
