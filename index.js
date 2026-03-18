#!/usr/bin/env node
/**
 * social-bi — 主入口
 * 用法：node index.js
 *       node index.js --dry-run   # 只抓数据，不发布
 */

const fs   = require('fs')
const path = require('path')
const { crawlBilibili } = require('./crawler/bilibili')
const { crawlDouyin }   = require('./crawler/douyin')
const { generate }      = require('./dashboard/generate-html')
const { publish }       = require('./publisher/here')

const CONFIG_PATH = path.join(__dirname, 'config', 'accounts.json')
const DATA_PATH   = path.join(__dirname, 'data.json')

const DRY_RUN = process.argv.includes('--dry-run')

/* ════════════════════════════════
   主流程
════════════════════════════════ */
async function run() {
  console.log('🚀 开始抓取数据...\n')

  // 读取账号配置
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))

  const results = []

  // ── B站 ──
  console.log(`\n── B站 (${config.bilibili.length} 个账号) ──`)
  for (const account of config.bilibili) {
    const data = await crawlBilibili(account)
    results.push(data)
    await sleep(1500) // 避免请求过快
  }

  // ── 抖音 ──
  console.log(`\n── 抖音 (${config.douyin.length} 个账号) ──`)
  for (const account of config.douyin) {
    const data = await crawlDouyin(account)
    results.push(data)
    await sleep(2000)
  }

  // ── 保存数据 ──
  fs.writeFileSync(DATA_PATH, JSON.stringify(results, null, 2))
  console.log(`\n✅ 数据已保存 → ${DATA_PATH}`)
  console.log(`   共 ${results.length} 条记录 (B站 ${results.filter(r=>r.platform==='bilibili').length} / 抖音 ${results.filter(r=>r.platform==='douyin').length})`)

  // ── 生成并发布 ──
  const html = generate(results)

  if (DRY_RUN) {
    const outPath = path.join(__dirname, 'output', 'dashboard.html')
    fs.mkdirSync(path.dirname(outPath), { recursive: true })
    fs.writeFileSync(outPath, html)
    console.log(`\n[dry-run] HTML 已保存 → ${outPath}`)
    return
  }

  console.log('\n📤 发布中...')
  const result = await publish(html)

  if (result) {
    console.log(`\n🎉 发布成功！`)
    console.log(`   🌐 ${result.siteUrl}`)
  } else {
    console.error('\n❌ 发布失败')
    process.exit(1)
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

// ── CLI 入口 ──
if (require.main === module) {
  run().catch(err => {
    console.error('💥 运行出错:', err)
    process.exit(1)
  })
}

module.exports = { run }
