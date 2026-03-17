const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

// bb-browser 命令路径
const BB_BROWSER = "bb-browser"

/* ========== 配置 ========== */
const CONFIG = {
  // B站账号配置
  bilibili: {
    accounts: [
      { name: "袁启聪", uid: "502925577" },
      { name: "大家车言论", uid: "36044181" },
      { name: "大家车-YYP", uid: "398326679" },
      { name: "粤爱车", uid: "408422610" },
      { name: "大家车-曾颖卓", uid: "31659234" },
      { name: "智能车研究所", uid: "3546814473046548" },
      { name: "大家车观察", uid: "3493275025541345" },
      { name: "瑶小受ribbon", uid: "5128686" }
    ]
  },
  
  // 抖音账号配置
  douyin: {
    accounts: [
      { name: "大家车言论", url: "https://www.douyin.com/user/MS4wLjABAAAARLKJ_a-XJPh57V0sF1tesLRQMmxv9Q4DQ314W1SKCjE" },
      { name: "粤爱车", url: "https://www.douyin.com/user/MS4wLjABAAAABegPKx8SlqBi7ygkVD1SBQenP522I3hfwshbbhum2aQxIsrqogsB9VyC0-7nVl3j" },
      { name: "大家车观察", url: "https://www.douyin.com/user/MS4wLjABAAAAt90sbP9OcV9KrhoKhdyRiBTNVuM1k75QrkMHvWRdZwWrqZi7pciLM0hdqirKxP3C" },
      { name: "智能车研究所", url: "https://www.douyin.com/user/MS4wLjABAAAAEiS_VUYdHHDtG_8USnYp3N-EnVHf6KB-oJM29HRKVVJ2BOO5WofSFOpaVV_gMWvj" },
      { name: "YYP颜宇鹏", url: "https://www.douyin.com/user/MS4wLjABAAAABw-B4qfqMmbSbYL0d_S9IeEfBdt-lPQjktspRZ67aBk" },
      { name: "袁启聪", url: "https://www.douyin.com/user/MS4wLjABAAAAJM1MjZHqM7Ek9K9JIQFZaY0TnTx0VeulS5_wsmA8WOs" },
      { name: "曾颖卓", url: "https://www.douyin.com/user/MS4wLjABAAAA6kARwECgrqm4ykLocS_IDQDkkR9aHg6vmc4RYy4yPzI" }
    ]
  },
  
  // 输出配置
  output: {
    dataPath: "./data.json",
    dashboardPath: "./output/dashboard.html"
  }
}

/* ========== 主函数 ========== */
async function run() {
  console.log("🚀 开始抓取数据...")
  
  // 1. 抓取 B站数据
  const bilibiliData = await fetchBilibiliData()
  
  // 2. 抓取抖音数据
  const douyinData = await fetchDouyinData()
  
  // 3. 合并数据
  const allData = [...bilibiliData, ...douyinData]
  
  // 4. 保存数据
  fs.writeFileSync(CONFIG.output.dataPath, JSON.stringify(allData, null, 2)
  console.log(`✅ 数据已保存到 ${CONFIG.output.dataPath}`)
  
  // 5. 生成看板
  const { generate } = require("./dashboard/generate-html")
  const html = generate(allData)
  
  // 6. 发布
  const { publish } = require("./publisher/here")
  await publish(html)
  
  console.log("🎉 完成！")
}

/* ========== B站数据抓取 ========== */
async function fetchBilibiliData() {
  const results = []
  
  for (const account of CONFIG.bilibili.accounts) {
    try {
      console.log(`📡 抓取 B站: ${account.name}...`)
      
      const cmd = `${BB_BROWSER} site bilibili/space ${account.uid} --json`
      const output = execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe1", "pipe2"] })
      
      let stdout = ""
      let stderr = ""
      
      output.stdout.on("data", (data) => {
        stdout += data
      })
      
      output.stderr.on("data", (data) => {
        stderr += data
      })
      
      output.on("close", (code) => {
        try {
          const json = JSON.parse(stdout)
          results.push({
            platform: "bilibili",
            name: account.name,
            uid: account.uid,
            url: `https://space.bilibili.com/${account.uid}`,
            followers: formatNumber(json.followers),
            likes: formatNumber(json.likes),
            views: formatNumber(json.views),
            videos: json.videos || "未知"
          })
        } catch (e) {
          console.error(`解析 B站数据失败: ${account.name}:`, e.message)
        }
      })
    } catch (e) {
      console.error(`抓取 B站数据失败 ${account.name}:`, e.message)
    }
  }
  
  return results
}

/* ========== 抖音数据抓取（使用浏览器) ========== */
async function fetchDouyinData() {
  console.log("⚠️ 抖音需要使用浏览器手动抓取...")
  console.log("提示: 请在浏览器中登录抖音后，按 [Enter] 继续...")
  
  // 暂时返回空数组，实际抓取需要浏览器
  return []
}

/* ========== 数字格式化 ========== */
function formatNumber(num) {
  if (!num) return "0"
  if (num >= 100000000) return (num / 100000000).toFixed(1) + "亿"
  if (num >= 10000) return (num / 10000).toFixed(1) + "万"
  return num.toString()
}

// 导出
module.exports = { run }

// 如果作为 CLI 直接运行
if (require.main === module.parent) {
  run().catch(console.error)
}
