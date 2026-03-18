const fs   = require('fs')
const path = require('path')
const os   = require('os')

const fetch = global.fetch || require('node-fetch')

const CONFIG = {
  site: 'bi.djcars.cn', // 自定义域名（可选）
  credentialsPath: path.join(os.homedir(), '.herenow', 'credentials')
}

function getApiKey() {
  if (process.env.HERENOW_API_KEY) return process.env.HERENOW_API_KEY
  try {
    if (fs.existsSync(CONFIG.credentialsPath)) {
      return fs.readFileSync(CONFIG.credentialsPath, 'utf8').trim()
    }
  } catch (e) {
    console.error('读取 credentials 失败:', e.message)
  }
  return null
}

async function publish(html) {
  const apiKey = getApiKey()

  console.log('------ HereNow Publish ------')
  console.log('API Key:', apiKey ? '已配置' : '未配置')

  const headers = {
    'Content-Type': 'application/json',
    'X-HereNow-Client': 'openclaw/social-bi-skill'
  }
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

  // ✅ 1. 创建版本（⚠️ 不传 site）
  const createBody = {
    files: [{
      path: 'index.html',
      size: Buffer.byteLength(html, 'utf8'),
      contentType: 'text/html; charset=utf-8'
    }]
  }

  const res = await fetch('https://here.now/api/v1/publish', {
    method: 'POST',
    headers,
    body: JSON.stringify(createBody)
  })

  const createData = await res.json()
  console.log('创建响应:', JSON.stringify(createData, null, 2))

  if (!createData.upload) {
    console.error('创建失败:', createData)
    return null
  }

  const uploadInfo = createData.upload.uploads?.[0]
  const finalizeUrl = createData.upload.finalizeUrl
  const versionId   = createData.upload.versionId

  if (!uploadInfo) {
    console.error('没有上传 URL')
    return null
  }

  // ✅ 2. 上传 HTML
  console.log('开始上传 index.html')

  const uploadRes = await fetch(uploadInfo.url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'text/html; charset=utf-8'
    },
    body: html
  })

  if (!uploadRes.ok) {
    console.error('上传失败:', await uploadRes.text())
    return null
  }

  console.log('上传成功')

  // ✅ 3. finalize（这里才绑定域名）
  console.log('开始 finalize')

  let finalizeBody = { versionId }

  // 👉 如果你有自定义域名再加
  if (CONFIG.site) {
    finalizeBody.site = CONFIG.site
  }

  const finalizeRes = await fetch(finalizeUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(finalizeBody)
  })

  const text = await finalizeRes.text()
  console.log('finalize 返回:', text)

  if (!finalizeRes.ok) {
    console.error('finalize 失败')
    return null
  }

  let finalData = {}
  try {
    finalData = JSON.parse(text)
  } catch {}

  console.log('✅ 发布完成')

  console.log('默认地址:', createData.siteUrl)

  if (CONFIG.site) {
    console.log('自定义域名:', `https://${CONFIG.site}`)
  }

  return {
    siteUrl: createData.siteUrl,
    customDomain: CONFIG.site
  }
}

module.exports = { publish, CONFIG }