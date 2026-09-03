'use strict'

/**
 * 学习路径（P2-14）。
 *
 * 按岗位方向（后端/前端/算法/数据/产品/运营）给一条可执行的准备路线：
 * 每个方向 4 个阶段（打基础 → 补深度 → 攒项目 → 面试冲刺），
 * 每阶段列出该练什么、看什么，可打勾记录进度。
 *
 * 全部为预设静态内容（校招经验帖整理），非 AI 生成。
 *
 * 注意：本文件位于 miniprogram/ 下，**禁止使用 ?. / ?? / for await**。
 */

const store = require('./store')

const COLLECTION = 'learning_path_progress'

/** 方向与学习路径（key 全局唯一） */
const PATHS = [
  {
    key: 'backend',
    label: '后端开发',
    icon: '⚙️',
    stages: [
      {
        key: 'b1', label: '打基础',
        items: ['Java / Go 语言基础与集合', '数据结构与算法（数组/链表/树）', '操作系统：进程/线程/内存'],
      },
      {
        key: 'b2', label: '补深度',
        items: ['MySQL：索引/B+树/事务/锁', 'Redis：数据结构/持久化/缓存', 'Spring Boot / 常用框架', '计算机网络：TCP/HTTP'],
      },
      {
        key: 'b3', label: '攒项目',
        items: ['做一个完整后端项目（含高并发场景）', '用「简历自查」检查项目描述', '梳理项目难点与追问答案'],
      },
      {
        key: 'b4', label: '面试冲刺',
        items: ['刷高频后端面试题（题库）', '用「练习室」模拟 2 轮', '复盘 3 次真实面试'],
      },
    ],
  },
  {
    key: 'frontend',
    label: '前端开发',
    icon: '🎨',
    stages: [
      {
        key: 'f1', label: '打基础',
        items: ['HTML/CSS/JavaScript 基础', 'ES6+ 语法与异步编程', '浏览器渲染原理'],
      },
      {
        key: 'f2', label: '补深度',
        items: ['React / Vue 框架原理', 'HTTP / 性能优化', '工程化：构建/打包/部署'],
      },
      {
        key: 'f3', label: '攒项目',
        items: ['做一个完整前端项目（含交互细节）', '关注首屏性能与兼容性', '整理项目亮点与难点'],
      },
      {
        key: 'f4', label: '面试冲刺',
        items: ['刷前端高频题（题库）', '手写题专项练习', '用「练习室」模拟 2 轮'],
      },
    ],
  },
  {
    key: 'algorithm',
    label: '算法岗',
    icon: '🧮',
    stages: [
      {
        key: 'a1', label: '打基础',
        items: ['数据结构：栈/队列/堆/树/图', '排序与二分查找', '复杂度分析'],
      },
      {
        key: 'a2', label: '补深度',
        items: ['动态规划专题', '贪心 / 回溯 / 双指针', '概率统计与线性代数基础'],
      },
      {
        key: 'a3', label: '攒项目',
        items: ['Kaggle / 竞赛项目一个', '读 1-2 篇经典论文', '整理项目中的模型与指标'],
      },
      {
        key: 'a4', label: '面试冲刺',
        items: ['每天 3 道算法题保持手感', '复盘笔试错题', '用「练习室」模拟 2 轮'],
      },
    ],
  },
  {
    key: 'data',
    label: '数据开发',
    icon: '📊',
    stages: [
      {
        key: 'd1', label: '打基础',
        items: ['SQL 基础与优化', 'Python 数据处理（Pandas）', '数据结构与算法基础'],
      },
      {
        key: 'd2', label: '补深度',
        items: ['Hadoop / Spark / Flink', '数仓分层设计', 'OLAP 与查询优化'],
      },
      {
        key: 'd3', label: '攒项目',
        items: ['做 1 个数仓/实时计算项目', '梳理数据链路与性能优化', '整理指标口径与口径文档'],
      },
      {
        key: 'd4', label: '面试冲刺',
        items: ['刷数据开发高频题', 'SQL 手写题专项', '用「练习室」模拟 2 轮'],
      },
    ],
  },
  {
    key: 'product',
    label: '产品经理',
    icon: '📱',
    stages: [
      {
        key: 'p1', label: '打基础',
        items: ['产品经理方法论（需求/竞品/PRD）', '用户体验与交互设计基础', 'Axure / 墨刀原型工具'],
      },
      {
        key: 'p2', label: '补深度',
        items: ['数据分析（漏斗/留存/AB 测试）', '行业研究（目标行业深度）', '商业化与增长基础'],
      },
      {
        key: 'p3', label: '攒项目',
        items: ['拆解 3 款产品写深度报告', '做一个完整的产品方案文档', '模拟一次需求评审'],
      },
      {
        key: 'p4', label: '面试冲刺',
        items: ['准备「你最喜欢的产品」回答', '用「练习室」练行为面', '复盘 3 次面试'],
      },
    ],
  },
  {
    key: 'operation',
    label: '运营岗',
    icon: '🚀',
    stages: [
      {
        key: 'o1', label: '打基础',
        items: ['运营方法论（内容/用户/活动）', '数据工具：Excel/图表', '文案与社群基础'],
      },
      {
        key: 'o2', label: '补深度',
        items: ['用户增长与留存分析', '活动策划与复盘框架', '竞品运营拆解'],
      },
      {
        key: 'o3', label: '攒项目',
        items: ['运营一个内容账号/社群', '完整策划一次活动并复盘', '整理数据与案例集'],
      },
      {
        key: 'o4', label: '面试冲刺',
        items: ['准备「给 App 做一次活动」方案', '用「练习室」练行为面', '复盘 3 次面试'],
      },
    ],
  },
]

function readProgress() {
  const v = store.get(COLLECTION, {})
  return v && typeof v === 'object' ? v : {}
}

function writeProgress(all) {
  store.set(COLLECTION, all)
}

function stageKeyOf(pathKey, stageKey) {
  return pathKey + ':' + stageKey
}

function isKnownStage(pathKey, stageKey) {
  const p = PATHS.filter(function (x) { return x.key === pathKey })[0]
  if (!p) return false
  return p.stages.some(function (s) { return s.key === stageKey })
}

/** 视图模型：每条路径带阶段完成数与总进度 */
function getPaths() {
  const prog = readProgress()
  return PATHS.map(function (p) {
    const stages = p.stages.map(function (s) {
      const checked = Boolean(prog[stageKeyOf(p.key, s.key)])
      return { key: s.key, label: s.label, items: s.items, checked: checked }
    })
    const done = stages.filter(function (s) { return s.checked }).length
    return {
      key: p.key,
      label: p.label,
      icon: p.icon,
      done: done,
      total: stages.length,
      stages: stages,
    }
  })
}

/** 切换某阶段完成态。返回新状态；非法 key 返回 null。 */
function toggleStage(pathKey, stageKey) {
  if (!isKnownStage(pathKey, stageKey)) return null
  const all = readProgress()
  const k = stageKeyOf(pathKey, stageKey)
  const next = !Boolean(all[k])
  all[k] = next
  writeProgress(all)
  return next
}

/** 重置某方向（或全部）进度。 */
function resetPath(pathKey) {
  const all = readProgress()
  if (pathKey) {
    PATHS.filter(function (p) { return p.key === pathKey }).forEach(function (p) {
      p.stages.forEach(function (s) { delete all[stageKeyOf(p.key, s.key)] })
    })
  } else {
    writeProgress({})
    return
  }
  writeProgress(all)
}

module.exports = {
  COLLECTION: COLLECTION,
  PATHS: PATHS,
  stageKeyOf: stageKeyOf,
  isKnownStage: isKnownStage,
  getPaths: getPaths,
  toggleStage: toggleStage,
  resetPath: resetPath,
}
