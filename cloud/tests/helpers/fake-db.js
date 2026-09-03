'use strict'

/**
 * cloud.database() 的内存假实现，供云函数层单测使用。
 *
 * 只实现项目真正用到的能力，但**语义与真实云开发保持一致**，特别是：
 *   - where(...).update() 返回 stats.updated，条件更新是并发安全的唯一依据
 *   - doc(id).get() 在文档不存在时**抛异常**（真实行为），以覆盖调用方的 catch 分支
 * 这样测试跑的不是「能不能跑通」，而是「条件更新 / 幂等 / 越权」这些真正会出事的地方。
 */

function makeFakeDb() {
  /** @type {Record<string, Map<string, object>>} */
  const store = {}
  let seq = 0

  const command = {
    inc: (n) => ({ __op: 'inc', n }),
    gt: (n) => ({ __op: 'gt', n }),
    lt: (n) => ({ __op: 'lt', n }),
    in: (arr) => ({ __op: 'in', arr }),
  }

  function isOp(v) {
    return Boolean(v) && typeof v === 'object' && typeof v.__op === 'string'
  }

  function toTime(v) {
    if (v instanceof Date) return v.getTime()
    if (typeof v === 'number') return v
    return 0
  }

  /** 支撐：等值、_.in、_.gt、_.lt */
  function matchWhere(doc, cond) {
    for (const key of Object.keys(cond)) {
      const want = cond[key]
      const got = doc[key]
      if (isOp(want)) {
        if (want.__op === 'in') {
          if (want.arr.indexOf(got) < 0) return false
        } else if (want.__op === 'gt') {
          if (!(Number(got) > want.n)) return false
        } else if (want.__op === 'lt') {
          if (!(toTime(got) < toTime(want.n))) return false
        } else {
          throw new Error('fake-db 未支持的查询操作符：' + want.__op)
        }
      } else if (got !== want) {
        return false
      }
    }
    return true
  }

  /** 支撐：直接赋值、_.inc */
  function applyUpdate(doc, data) {
    for (const key of Object.keys(data)) {
      const v = data[key]
      if (isOp(v) && v.__op === 'inc') {
        doc[key] = (Number(doc[key]) || 0) + v.n
      } else {
        doc[key] = v
      }
    }
  }

  function collection(name) {
    if (!store[name]) store[name] = new Map()
    const docs = store[name]

    function all() {
      const out = []
      for (const d of docs.values()) out.push(Object.assign({}, d))
      return out
    }

    function cmpVal(a, b) {
      const an = a instanceof Date ? a.getTime() : a
      const bn = b instanceof Date ? b.getTime() : b
      if (an < bn) return -1
      if (an > bn) return 1
      return 0
    }

    const whereApi = (cond) => {
      /** orderBy 可以链式多次调用，语义与真实 SDK 一致：先过滤、再排序、最后 limit */
      const sorts = []

      function build() {
        let rows = all().filter((d) => matchWhere(d, cond))
        for (const s of sorts) {
          rows = rows.slice().sort((a, b) => (s.order === 'desc' ? -cmpVal(a[s.field], b[s.field]) : cmpVal(a[s.field], b[s.field])))
        }
        return rows
      }

      const api = {
        async get() {
          return { data: build() }
        },
        limit(n) {
          return {
            async get() {
              return { data: build().slice(0, n) }
            },
          }
        },
        orderBy(field, order) {
          sorts.push({ field: field, order: order === 'desc' ? 'desc' : 'asc' })
          return api
        },
        async update(opts) {
          let updated = 0
          for (const [id, d] of docs.entries()) {
            if (matchWhere(d, cond)) {
              applyUpdate(d, opts.data)
              docs.set(id, d)
              updated++
            }
          }
          return { stats: { updated } }
        },
        async remove() {
          let removed = 0
          for (const [id, d] of docs.entries()) {
            if (matchWhere(d, cond)) {
              docs.delete(id)
              removed++
            }
          }
          return { stats: { removed } }
        },
      }
      return api
    }

    return {
      async add(opts) {
        // 与真实云开发一致：data 里显式给 _id 时作为自定义主键（前端生成 recordId 依赖此能力）
        const _id = (opts.data && opts.data._id) || 'id_' + ++seq
        docs.set(_id, Object.assign({ _id }, opts.data))
        return { _id }
      },
      // 真实 SDK 允许不带 where 直接 limit（config-store 读全表时就是这么用）
      limit(n) {
        return {
          async get() {
            return { data: all().slice(0, n) }
          },
        }
      },
      doc(id) {
        return {
          async get() {
            const d = docs.get(id)
            // 与真实云开发一致：文档不存在时抛异常
            if (!d) throw new Error('document.get document does not exist')
            return { data: Object.assign({}, d) }
          },
          async update(opts) {
            const d = docs.get(id)
            if (!d) throw new Error('document.update document does not exist')
            applyUpdate(d, opts.data)
            return { stats: { updated: 1 } }
          },
        }
      },
      where(cond) {
        return whereApi(cond)
      },
      async get() {
        return { data: all() }
      },
    }
  }

  return {
    collection,
    command,
    // 真实云开发会把服务端时间写入文档；这里用本地时间，
    // 语义等价且让 findStale 之类的时间比较可测
    serverDate: () => new Date(),
    createCollection: async () => ({}),

    // ---- 以下为测试辅助，生产代码不会用到 ----
    _store: store,
    _seed(name, rows) {
      if (!store[name]) store[name] = new Map()
      const docs = store[name]
      for (const row of rows) {
        const _id = row._id || 'id_' + ++seq
        docs.set(_id, Object.assign({ _id }, row))
      }
    },
    _get(name, id) {
      const d = (store[name] || new Map()).get(id)
      return d ? Object.assign({}, d) : null
    },
    _all(name) {
      const docs = store[name]
      if (!docs) return []
      const out = []
      for (const d of docs.values()) out.push(Object.assign({}, d))
      return out
    },
  }
}

module.exports = { makeFakeDb }
