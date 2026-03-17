const { execSync } = require('child_process')

async function crawlDouyin(url){
  // 使用 bb-browser CLI
  const result = execSync(`bb-browser open "${url}" --openclaw`, { 
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' }
  })
  
  // 等待页面加载
  await new Promise(r => setTimeout(r, 5000))
  
  // 获取 snapshot
  const snapshot = execSync(`bb-browser snapshot --openclaw`, {
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' }
  })
  
  // 关闭浏览器
  execSync(`bb-browser tab close`, {
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' }
  })
  
  // 解析数据 - 抖音页面结构不同，需要调整
  function extractNumber(text, regex) {
    const m = text.match(regex)
    return m ? m[1].replace(/,/g, '').replace('万', '') : '0'
  }
  
  const data = {
    followers: extractNumber(snapshot, /粉丝[^\d]*([\d,\.]+万?)/),
    likes: extractNumber(snapshot, /获赞[^\d]*([\d,\.]+万?)/)
  }
  
  return data
}

module.exports = { crawlDouyin }