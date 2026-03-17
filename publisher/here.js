const fs = require("fs")
const path = require("path")
const os = require("os")

// Node18+ 原生 fetch
const fetch = global.fetch || require("node-fetch")

// 配置
const CONFIG = {
  site: "bi.djcars.cn",
  credentialsPath: path.join(os.homedir(), ".herenow", "credentials")
}

/* ---------------- 获取 API KEY ---------------- */

function getApiKey() {
  if (process.env.HERENOW_API_KEY) {
    return process.env.HERENOW_API_KEY
  }

  try {
    if (fs.existsSync(CONFIG.credentialsPath)) {
      return fs.readFileSync(CONFIG.credentialsPath, "utf8").trim()
    }
  } catch (e) {
    console.error("读取 credentials 失败:", e.message)
  }

  return null
}

/* ---------------- 发布函数 ---------------- */

async function publish(html) {

  const apiKey = getApiKey()

  console.log("------ HereNow Publish ------")
  console.log("API Key:", apiKey ? "已配置" : "未配置")
  console.log("Site:", CONFIG.site || "默认 slug")

  /* ---------- 创建版本 ---------- */

  const headers = {
    "Content-Type": "application/json",
    "X-HereNow-Client": "openclaw/social-bi-skill"
  }

  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`
  }

  const body = {
    files: [{
      path: "index.html",
      size: Buffer.byteLength(html, "utf8"),
      contentType: "text/html; charset=utf-8"
    }]
  }

  if (apiKey && CONFIG.site) {
    body.site = CONFIG.site
  }

  let createRes
  try {
    createRes = await fetch("https://here.now/api/v1/publish", {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    })
  } catch (err) {
    console.error("创建发布请求失败:", err)
    return null
  }

  const createData = await createRes.json()

  console.log("创建响应:", JSON.stringify(createData, null, 2))

  if (createData.error) {
    console.error("创建站点失败:", createData.error)
    return null
  }

  if (!createData.upload?.uploads?.[0]) {
    console.error("没有获得上传URL")
    return null
  }

  const uploadUrl = createData.upload.uploads[0].url
  const finalizeUrl = createData.upload.finalizeUrl
  const versionId = createData.upload.versionId

  let siteUrl = createData.siteUrl

  if (CONFIG.site) {
    siteUrl = `https://${CONFIG.site}/`
  }

  /* ---------- 上传 HTML ---------- */

  console.log("开始上传 index.html")

  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "text/html; charset=utf-8"
    },
    body: html
  })

  if (!uploadRes.ok) {
    console.error("上传失败:", uploadRes.status)
    return null
  }

  console.log("文件上传成功")

  /* ---------- finalize ---------- */

  const finalizeHeaders = {
    "Content-Type": "application/json",
    "X-HereNow-Client": "openclaw/social-bi-skill"
  }

  if (apiKey) {
    finalizeHeaders["Authorization"] = `Bearer ${apiKey}`
  }

  const finalizeBody = {
    versionId
  }

  if (CONFIG.site) {
    finalizeBody.site = CONFIG.site
  }

  console.log("开始 finalize 发布")

  const finalizeRes = await fetch(finalizeUrl, {
    method: "POST",
    headers: finalizeHeaders,
    body: JSON.stringify(finalizeBody)
  })

  if (!finalizeRes.ok) {

    const errText = await finalizeRes.text()

    console.error("发布失败:", errText)

    console.log("尝试 fallback 发布...")

    // fallback（不绑定 site）
    const fallbackRes = await fetch(finalizeUrl, {
      method: "POST",
      headers: finalizeHeaders,
      body: JSON.stringify({ versionId })
    })

    if (!fallbackRes.ok) {
      console.error("fallback 也失败:", await fallbackRes.text())
      return null
    }

    siteUrl = createData.siteUrl
  }

  console.log("✅ 发布成功")
  console.log("🌐 地址:", siteUrl)

  return {
    siteUrl,
    slug: createData.slug
  }
}

module.exports = {
  publish,
  CONFIG
}