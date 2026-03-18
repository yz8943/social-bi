#!/usr/bin/env node
/**
 * publish.js — 读取已有 data.json，生成 HTML 并发布
 * 用法：node publish.js
 */
const fs   = require('fs')
const path = require('path')
const { generate } = require('./dashboard/generate-html')
const { publish }  = require('./publisher/here')

const DATA_PATH = path.join(__dirname, 'data.json')

if (!fs.existsSync(DATA_PATH)) {
  console.error(`❌ 找不到 ${DATA_PATH}，请先运行 node index.js 抓取数据`)
  process.exit(1)
}

const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'))
console.log(`📦 读取 ${data.length} 条数据`)

const html = generate(data)
console.log('✅ HTML 生成成功')

publish(html)
  .then(result => {
    if (result) {
      console.log('🎉 发布成功:', result.siteUrl)
    } else {
      console.error('❌ 发布失败')
      process.exit(1)
    }
  })
  .catch(err => {
    console.error('💥 发布出错:', err)
    process.exit(1)
  })
