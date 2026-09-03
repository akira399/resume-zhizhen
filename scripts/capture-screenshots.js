#!/usr/bin/env node
/**
 * 功能页自动截图（P3 提审材料 / 大赛演示素材）。
 *
 * 用 miniprogram-automator 驱动微信开发者工具，逐页导航并截图到 docs/screenshots/。
 * 全部走无副作用路径：不跑云调用、不写业务数据（看板等页面的演示数据由页面自身提供）。
 *
 * 前提：开发者工具「设置 → 安全设置 → 服务端口」已开启，且已用
 *   cli auto --auto-port 9420 --project <绝对路径>
 * 开启自动化通道。
 *
 * 用法：node scripts/capture-screenshots.js
 *      node scripts/capture-screenshots.js --core   // 只截提审用的核心 7 张
 */
'use strict'

const path = require('node:path')
const fs = require('node:fs')

const CLI = 'E:\\wechat\\微信web开发者工具\\cli.bat'
const PROJECT = path.resolve(__dirname, '..')
const OUT = path.join(PROJECT, 'docs', 'screenshots')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * 提审核心 7 张（core:true）——覆盖产品骨架，审核员看这 7 张即知全貌。
 * 其余为大赛演示补充（功能完整度佐证）。
 */
const SHOTS = [
  { name: '01-home', url: '/pages/home/index', wait: 3000, core: true },
  { name: '02-kanban', url: '/pages/kanban/index', wait: 2500, core: true },
  { name: '03-checklist', url: '/package-tools/pages/checklist/index', wait: 2000, core: true },
  { name: '04-keyword', url: '/package-tools/pages/keyword/index', wait: 2500, core: true },
  { name: '05-practice', url: '/package-tools/pages/practice/index', wait: 2000, core: true },
  { name: '06-questions', url: '/package-tools/pages/questions/index', wait: 2500, core: true },
  { name: '07-stats', url: '/package-tools/pages/stats/index', wait: 2500, core: true },

  // 大赛演示补充：P1 增强 + P2 增值模块
  { name: '08-offer-compare', url: '/package-tools/pages/offer-compare/index', wait: 2000 },
  { name: '09-review', url: '/package-tools/pages/review/index', wait: 2000 },
  { name: '10-timeline', url: '/package-tools/pages/timeline/index', wait: 2000 },
  { name: '11-todo', url: '/package-tools/pages/todo/index', wait: 2000 },
  { name: '12-career-checklist', url: '/package-tools/pages/career/index', wait: 2000 },
  { name: '13-learning-path', url: '/package-tools/pages/learning/index', wait: 2000 },
  { name: '14-practice-mode', url: '/package-tools/pages/practice-mode/index', wait: 2000 },
  { name: '15-parse', url: '/package-tools/pages/parse/index', wait: 2500 },
  { name: '16-intro', url: '/package-tools/pages/intro/index', wait: 2000 },
  { name: '17-profile', url: '/pages/profile/index', wait: 2000 },
]

async function main() {
  fs.mkdirSync(OUT, { recursive: true })

  let automator
  try {
    automator = require('miniprogram-automator')
  } catch (e) {
    try {
      automator = require(path.join(
        process.env.APPDATA || '',
        'npm',
        'node_modules',
        'miniprogram-automator'
      ))
    } catch (e2) {
      console.error('未找到 miniprogram-automator，请先安装：npm i -g miniprogram-automator')
      console.error('并确认开发者工具已开启：' + CLI + ' auto --auto-port 9420 --project ' + PROJECT)
      process.exit(1)
    }
  }

  const coreOnly = process.argv.indexOf('--core') !== -1
  const list = coreOnly ? SHOTS.filter((s) => s.core) : SHOTS

  console.log('连接微信开发者工具自动化端口...')
  const miniProgram = await automator.connect({ wsEndpoint: 'ws://localhost:9420' })
  console.log('开发者工具已连接，共 ' + list.length + ' 张')

  try {
    // 给 webview 充分的初始化时间：立即 reLaunch 会拿不到 pageMeta
    // （miniprogram-automator 报 "getPageMetaByWebviewId(...) is null"）
    await sleep(6000)
    try { await miniProgram.currentPage() } catch (e) { /* 首次可能为空，忽略 */ }

    // 先落首页，处理可能出现的隐私弹窗（后台指引已配置时模拟器会弹）
    let page = await miniProgram.reLaunch(list[0].url)
    await sleep(3500)
    const agree = await page.$('button[open-type="agreePrivacyAuthorization"]')
    if (agree) {
      console.log('检测到隐私弹窗，自动同意')
      await agree.tap()
      await sleep(1200)
    }

    const failed = []
    for (const shot of list) {
      const file = path.join(OUT, shot.name + '.png')
      let ok = false
      for (let attempt = 1; attempt <= 2 && !ok; attempt++) {
        try {
          page = await miniProgram.reLaunch(shot.url)
          await sleep(shot.wait)
          await miniProgram.screenshot({ path: file })
          console.log('已截图:', path.relative(PROJECT, file))
          ok = true
        } catch (err) {
          if (attempt === 2) {
            console.log('跳过（失败）:', shot.name, '→', err && err.message)
            failed.push(shot.name)
          } else {
            await sleep(2500) // webview 切换需要时间，重试前多等一会
          }
        }
      }
    }
    if (failed.length) console.log('\n失败 ' + failed.length + ' 张：' + failed.join(', '))

    console.log('\n全部完成，共 ' + list.length + ' 张 → ' + path.relative(PROJECT, OUT))
  } finally {
    await miniProgram.disconnect()
  }
}

main().catch((err) => {
  console.error('截图失败:', err && err.message)
  process.exit(1)
})
