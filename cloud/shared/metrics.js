'use strict'

/**
 * 埋点写入（docs/10 C3）。
 *
 * 背景：MVP 定义的四个验证问题（真机流式体验 / 单次成本 / 安全检测误杀率 / 用户主观反馈）
 * 在没有任何数据采集时技术上无法回答——MVP 跑完了却一个问题都答不上来。
 *
 * 写入原则：
 *   - **一次任务一次写入**：指标随 complete/abort 一起上报，不单独开一次写，
 *     否则在免费环境的调用次数预算下代价过高（见 docs/10 §0.4）
 *   - **绝不影响主流程**：埋点失败静默吞掉，不能让用户因为埋点挂掉而用不了功能
 *
 * 已知限制：前端不消费 eventStream（上传管线对 for await 支持不稳），
 * 拿不到模型返回的精确 token 用量，只能用字数估算。此限制需写入 README「已知问题」。
 */

const { COLLECTIONS } = require('./constants')

/**
 * 按字数粗估 token 数。
 * 中文约 1 字 ≈ 0.6~1 token，英文约 4 字符 ≈ 1 token；
 * 这里取保守的单一系数，只用于成本量级观测，不用于计费。
 */
const CHARS_PER_TOKEN = 2

function estimateTokens(inputChars, outputChars) {
  return Math.round(((Number(inputChars) || 0) + (Number(outputChars) || 0)) / CHARS_PER_TOKEN)
}

function makeMetricsWriter(db) {
  const coll = db.collection(COLLECTIONS.METRICS)

  return {
    /**
     * @param openid {string}
     * @param record {object} 见 docs/10 §2.5 字段定义
     */
    write: async function (openid, record) {
      const inputChars = Number(record.inputChars) || 0
      const outputChars = Number(record.outputChars) || 0
      try {
        await coll.add({
          data: Object.assign(
            {
              _openid: openid,
              estTokens: estimateTokens(inputChars, outputChars),
              createdAt: db.serverDate(),
            },
            record
          ),
        })
        return true
      } catch (e) {
        // 埋点失败必须静默：它只是观测手段，不能成为功能可用性的一环
        return false
      }
    },
  }
}

module.exports = { makeMetricsWriter, estimateTokens, CHARS_PER_TOKEN }
