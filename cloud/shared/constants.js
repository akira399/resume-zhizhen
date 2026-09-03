'use strict'

/**
 * 跨云函数共享的常量（单一事实来源）。
 *
 * 存放位置说明：各云函数按目录独立部署，但构建走 esbuild 单文件打包
 * （见 scripts/build-functions.js），因此可以安全地 require 本目录。
 * 放 cloud/shared/ 而非 cloud/functions/ 下，是为了避免微信开发者工具
 * 把该目录误识别为待部署的云函数。
 */

/** 业务集合名 */
const COLLECTIONS = {
  USERS: 'users',
  DIAGNOSES: 'diagnoses',
  JD_MATCHES: 'jdMatches',
  INTERVIEWS: 'interviews',
  APPLICATIONS: 'applications',
  CONFIG: 'config',
  METRICS: 'metrics',
}

/**
 * 任务状态机。
 *   created ──▶ streaming ──▶ done
 *                   │
 *                   ├──▶ failed   （超时 / 模型错误 / 结构校验失败）
 *                   ├──▶ blocked  （内容安全命中）
 *                   └──▶ aborted  （用户主动中止）
 * 后四者为终态；进入终态时额度必须已结算，详见 docs/10 §2.2.2。
 */
const TASK_STATUS = {
  CREATED: 'created',
  STREAMING: 'streaming',
  DONE: 'done',
  FAILED: 'failed',
  BLOCKED: 'blocked',
  ABORTED: 'aborted',
}

const TERMINAL_STATUS = [
  TASK_STATUS.DONE,
  TASK_STATUS.FAILED,
  TASK_STATUS.BLOCKED,
  TASK_STATUS.ABORTED,
]

/** 业务错误码（云函数返回的 code 字段，前端 BizError 直接透传） */
const ERR = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  QUOTA_EXCEEDED: 429,
  /** AI 输出不符合结构化 schema：可重试，不结算额度 */
  UNPROCESSABLE: 422,
  INTERNAL: 500,
}

/** config 集合的配置键 */
const CONFIG_KEYS = {
  AI_PROVIDER: 'ai.provider',
  AI_MODEL: 'ai.model',
  DAILY_LIMIT: 'ai.dailyLimit',
  MAX_INPUT_CHARS: 'ai.maxInputChars',
  SECURITY_CHUNK_CHARS: 'security.chunkChars',
  SECURITY_CHUNK_INTERVAL_MS: 'security.chunkIntervalMs',
  STALE_AFTER_MS: 'task.staleAfterMs',
  MAINTENANCE_NOTICE: 'notice.maintenance',
  /** 订阅消息模板 ID（F8 面试提醒）。mp 后台申请后写入 config 集合即可生效 */
  SUBSCRIBE_TEMPLATE_ID: 'subscribe.templateId',
}

/**
 * 配置默认值。两个用途：
 *   1. config 集合缺项时的兜底（改配置不发版，但没配过就走这里）
 *   2. scripts/init-db.js 写入 config 集合的种子数据
 * 值必须是 JSON 可序列化的（要存进数据库）。
 */
const CONFIG_DEFAULTS = {
  [CONFIG_KEYS.AI_PROVIDER]: 'hunyuan-exp',
  [CONFIG_KEYS.AI_MODEL]: 'hy3',
  [CONFIG_KEYS.DAILY_LIMIT]: 5,
  [CONFIG_KEYS.MAX_INPUT_CHARS]: 5000,
  /**
   * 分段安全检测的触发阈值。权衡点：
   * - 值越小拦截越及时，但云调用次数线性上升（每次检测 = 一次云函数调用）
   * - 300 字约一个段落，用户最多看到约一段未过检内容；
   *   相比原先「全文 800 字看完才拦」已是数量级改善，且把单次任务的
   *   检测次数压到 2–3 次，在免费环境的调用预算内（详见 docs/10 §0.4）
   */
  [CONFIG_KEYS.SECURITY_CHUNK_CHARS]: 300,
  [CONFIG_KEYS.SECURITY_CHUNK_INTERVAL_MS]: 2000,
  /**
   * 在途任务判定为僵死的时限。不采用「心跳上报」方案：
   * 心跳虽能更快发现僵死，但 5s 一次 × 约 60s 任务 = 12 次写/任务，
   * 在免费环境预算下代价过高。改为按 createdAt 判定 + 定时清理，
   * 客户端正常退出时由 abort 立即结算，崩溃场景由 janitor 兜底。
   */
  [CONFIG_KEYS.STALE_AFTER_MS]: 15 * 60 * 1000,
  [CONFIG_KEYS.MAINTENANCE_NOTICE]: '',
  /**
   * 订阅消息模板 ID。默认空 = F8 静默降级：
   * reminder 定时任务直接跳过，前端不弹订阅授权，看板日程照常展示。
   * 在 mp 后台申请「面试提醒」类模板后，往 config 集合写入该键即可启用，
   * 不需要改代码发版（docs/03 §4）。
   */
  [CONFIG_KEYS.SUBSCRIBE_TEMPLATE_ID]: '',
}

/** 输入/输出长度上限 */
const LIMITS = {
  RESUME_MAX_LEN: 5000,
  JD_MAX_LEN: 5000,
  OUTPUT_MAX_LEN: 20000,
}

/**
 * 频率限制：同一用户时间窗口内最多发起的 preflight 次数。
 * 防刷靠这里，而不是靠「失败罚没额度」（docs/10 A3）。
 */
const RATE_LIMIT = {
  WINDOW_MS: 60 * 1000,
  MAX_PREFLIGHT: 3,
}

module.exports = {
  COLLECTIONS,
  TASK_STATUS,
  TERMINAL_STATUS,
  ERR,
  CONFIG_KEYS,
  CONFIG_DEFAULTS,
  LIMITS,
  RATE_LIMIT,
}
