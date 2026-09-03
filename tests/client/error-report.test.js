import { describe, it, expect } from 'vitest'
import { APP_BUILD } from '../../miniprogram/config'
import { serialize, deserialize } from '../../miniprogram/services/error-report'

/**
 * 回归背景：切换前端技术栈后，旧版本遗留在用户设备上的崩溃记录会被首页读出并展示，
 * 导致「已经修好的版本看起来仍在崩溃」。该测试锁死崩溃记录必须带栈标识与时间戳。
 */
describe('崩溃记录的读写', () => {
  it('同栈的新鲜记录可以读回', () => {
    const raw = serialize('onError: boom')
    expect(deserialize(raw)).toBe('onError: boom')
  })

  it('丢弃其他技术栈留下的记录（跨栈）', () => {
    // 模拟 Taro 时期写入的记录：栈标识不同
    const raw = JSON.stringify({ v: 1, tag: 'taro-4.1.11', at: Date.now(), text: 'onError: boom' })
    expect(deserialize(raw)).toBeNull()
  })

  it('丢弃老格式的纯字符串记录', () => {
    // Taro 时期直接存文本，没有栈标识，无法确认它属于当前版本
    expect(deserialize('onError: MiniProgramError r(...) is not a function')).toBeNull()
  })

  it('丢弃超过 24 小时的陈旧记录', () => {
    const raw = JSON.stringify({ v: 1, tag: APP_BUILD, at: Date.now() - 25 * 60 * 60 * 1000, text: 'boom' })
    expect(deserialize(raw)).toBeNull()
  })

  it('空值与畸形输入返回 null', () => {
    expect(deserialize('')).toBeNull()
    expect(deserialize(null)).toBeNull()
    expect(deserialize('not json')).toBeNull()
    expect(deserialize(JSON.stringify({ v: 99, tag: APP_BUILD, at: Date.now(), text: 'x' }))).toBeNull()
  })
})
