'use strict'

/**
 * 任务记录（诊断 / JD 匹配 / 模拟面试共用）的数据库操作。
 *
 * 状态流转的唯一入口是 finalize()：它用「条件更新」把非终态推进到终态，
 * 只有真正发生跃迁才返回 settled=true。额度结算与埋点都挂在这个返回值上，
 * 从而天然获得幂等——重复 complete、complete 与 janitor 竞争都只会被结算一次。
 *
 * 详见 docs/10 §2.2.2 状态机。
 */

const { TASK_STATUS, TERMINAL_STATUS, ERR } = require('./constants')
const { bizError } = require('./errors')

/** 非终态：可以推进到终态的状态集合 */
const OPEN_STATUS = [TASK_STATUS.CREATED, TASK_STATUS.STREAMING]

function makeTaskStore(db, collName) {
  const coll = db.collection(collName)
  const _ = db.command

  return {
    /** 建任务记录，返回 _id */
    create: async function (openid, data) {
      const res = await coll.add({
        data: Object.assign(
          { _openid: openid, status: TASK_STATUS.CREATED, createdAt: db.serverDate() },
          data
        ),
      })
      return res._id
    },

    /** 读任务并校验归属（越权防护） */
    requireOwned: async function (openid, taskId) {
      if (typeof taskId !== 'string' || !taskId) throw bizError(ERR.BAD_REQUEST, 'recordId 非法')
      const found = await coll.doc(taskId).get().catch(function () {
        return null
      })
      const doc = found && found.data
      if (!doc || doc._openid !== openid) throw bizError(ERR.NOT_FOUND, '记录不存在')
      return doc
    },

    /**
     * 原子推进到终态。
     * @param patch {object} 要写入的字段（应含 status 与业务结果）
     * @returns {{ settled:boolean, status:string|null }}
     *   settled 为 true 表示发生了状态跃迁，调用方据此结算额度（保证只结算一次）；
     *   settled 为 false 时回传**当前真实状态**，让调用方能区分
     *   「幂等重试（已是 DONE）」与「已被拦截/已失败」——两者要给客户端不同响应。
     */
    finalize: async function (openid, taskId, patch) {
      const res = await coll
        .where({ _id: taskId, _openid: openid, status: _.in(OPEN_STATUS) })
        .update({ data: Object.assign({}, patch, { finishedAt: db.serverDate() }) })

      if (res.stats && res.stats.updated === 1) {
        return { settled: true, status: patch.status }
      }

      // 未跃迁：读回真实状态。只在「任务已终态」这条少走分支上多一次读，
      // 且归属校验仍由 where 条件保证——读不到即视为无权访问，返回 null。
      const found = await coll.doc(taskId).get().catch(function () {
        return null
      })
      const doc = found && found.data
      return { settled: false, status: doc && doc._openid === openid ? doc.status : null }
    },

    /**
     * 历史列表分页查询（F9）。
     *
     * 只返回**终态**记录：在途（created/streaming）对用户无感，
     * 且 janitor 会兜底回收，放进列表只会出现「永远转圈」的条目（docs/10 A4/E1）。
     *
     * **游标为什么能跨集合共用**：游标取「上一页最后一条的 createdAt」，
     * 各集合都从同一时间点往前取 limit 条再归并。若全局第 k 条（k ≤ limit）
     * 属于某集合，它在该集合内排名必 ≤ k ≤ limit，因此一定被取到——
     * 归并后截断到 limit 条就等于全局正确的第 k 页。这个性质让前端
     * 只需维护一个游标，而不必为每个业务集合各存一个。
     *
     * @param openid {string}
     * @param opts {{ limit?:number, cursorMs?:number }} cursorMs 为空表示第一页
     * @returns {Promise<Array<object>>} 按 createdAt 降序
     */
    list: async function (openid, opts) {
      const o = opts || {}
      const limit = Math.max(1, Math.min(Number(o.limit) || 20, 50))
      const where = { _openid: openid, status: _.in(TERMINAL_STATUS) }
      if (o.cursorMs) where.createdAt = _.lt(new Date(o.cursorMs))

      const res = await coll
        .where(where)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get()
        .catch(function () {
          return null
        })
      return (res && res.data) || []
    },

    /**
     * 删除记录。**where 条件带 _openid** 而不是先读再删：
     * 云函数持有管理员权限，能删任何人的文档，少一个 openid 条件就是越权漏洞。
     * @returns {Promise<boolean>} 是否真的删掉了（false = 记录不存在或不属于该用户）
     */
    remove: async function (openid, taskId) {
      if (typeof taskId !== 'string' || !taskId) throw bizError(ERR.BAD_REQUEST, 'recordId 非法')
      const res = await coll
        .where({ _id: taskId, _openid: openid })
        .remove()
        .catch(function () {
          return null
        })
      return Boolean(res && res.stats && res.stats.removed > 0)
    },

    /**
     * 提供给 janitor：查出创建时间早于阈值的在途任务（僵死任务）。
     *
     * 不采用心跳方案：心跳能更早发现僵死，但 5s 一次 × 约 60s 任务 = 12 次写/任务，
     * 在免费环境的调用预算下代价过高。按 createdAt 判定虽然最长要等 STALE_AFTER_MS，
     * 但非终态记录不会出现在历史列表中，用户无感；客户端正常退出时
     * 也会由 abort 立即结算，只有进程被系统回收的极端情况才落到 janitor。
     *
     * @param createdBeforeMs {number} 创建时间早于该时间戳即视为僵死
     */
    findStale: async function (createdBeforeMs, limit) {
      const res = await coll
        .where({ status: _.in(OPEN_STATUS), createdAt: _.lt(new Date(createdBeforeMs)) })
        .limit(limit || 100)
        .get()
        .catch(function () {
          return null
        })
      return (res && res.data) || []
    },
  }
}

module.exports = { makeTaskStore, OPEN_STATUS }
