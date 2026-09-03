#!/usr/bin/env node
/**
 * 敏感信息扫描（P0-1）。
 *
 * 目标：开源前确保仓库内没有真实密钥。设计取舍：
 * - 只扫 **git 已跟踪** 的文件（`git ls-files`），天然跳过 .gitignore 的本地密钥文件；
 * - 只报 **高置信度** 模式，避免大量误报导致脚本被忽略；
 * - 退出码非 0 → CI 失败，强制人工确认。
 *
 * 用法：node scripts/check-secrets.js
 */
'use strict'

const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

/** 高置信度密钥模式：命中即失败 */
const PATTERNS = [
  { name: 'GitHub PAT (classic)', re: /ghp_[A-Za-z0-9]{20,}/ },
  { name: 'GitHub PAT (fine-grained)', re: /github_pat_[A-Za-z0-9_]{20,}/ },
  { name: 'GitHub OAuth token', re: /gho_[A-Za-z0-9]{20,}/ },
  { name: 'TencentCloud SecretId', re: /AKID[A-Za-z0-9]{20,}/ },
  { name: 'AWS Access Key', re: /AKIA[0-9A-Z]{16}/ },
  { name: 'Private key block', re: /-----BEGIN (RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/ },
]

/**
 * 占位符白名单：形如 "appSecret": "YOUR_APP_SECRET" 属于模板，不算泄露。
 * 但 "appSecret": "a1b2c3..." 这种真实值必须报出来。
 */
const PLACEHOLDER_RE = /^(YOUR_|xxx|<|\$\{|CHANGE_ME|TODO|PLACEHOLDER)/i

/** 形如 "appSecret": "..." 的赋值，值非占位符则告警 */
const SECRET_FIELD_RE = /"(appSecret|secretKey|apiKey|accessToken|privateKey)"\s*:\s*"([^"]+)"/gi

const SKIP_DIR_RE = /(^|\/)(node_modules|\.git|miniprogram_npm|dist)(\/|$)/

function trackedFiles() {
  const out = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  return out.split('\n').map((s) => s.trim()).filter(Boolean)
}

/** 跳过二进制与超大文件，避免读崩 */
function isReadableText(file) {
  try {
    const st = fs.statSync(file)
    return st.isFile() && st.size <= 512 * 1024
  } catch (e) {
    return false
  }
}

function scan() {
  const findings = []
  const files = trackedFiles().filter((f) => !SKIP_DIR_RE.test(f) && isReadableText(f))

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8')

    for (const p of PATTERNS) {
      if (p.re.test(content)) {
        findings.push({ file, kind: p.name, detail: '命中高置信度密钥模式' })
      }
    }

    SECRET_FIELD_RE.lastIndex = 0
    let m
    while ((m = SECRET_FIELD_RE.exec(content)) !== null) {
      const value = m[2]
      if (PLACEHOLDER_RE.test(value) || value.length < 16) continue
      findings.push({ file, kind: `疑似真实密钥字段 ${m[1]}`, detail: `值长度 ${value.length}` })
    }
  }
  return findings
}

function main() {
  const findings = scan()
  if (findings.length === 0) {
    console.log('check-secrets: OK — 未发现敏感信息')
    return
  }

  console.error(`check-secrets: FAILED — 发现 ${findings.length} 处可疑内容\n`)
  for (const f of findings) {
    console.error(`  [${f.kind}] ${f.file} — ${f.detail}`)
  }
  console.error('\n处理：')
  console.error('  1. 立即在对应平台吊销/重置该密钥')
  console.error('  2. 从文件中移除真实值，改用配置模板 + 本地 env')
  console.error('  3. 如已提交进历史，用 git filter-repo 清理后再开源')
  process.exitCode = 1
}

main()
