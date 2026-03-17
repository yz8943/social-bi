const { execSync } = require('child_process')

async function crawlBilibili(uid){
  console.log('抓B站:', uid)
  
  // 直接使用 bb-browser site 命令搜索
  let data = {
    name: uid,
    platform: 'bilibili',
    followers: '0',
    following: '0', 
    videos: '0',
    likes: '0',
    plays: '0'
  }
  
  try {
    // 使用搜索获取数据
    const result = execSync(`bb-browser site bilibili/search "${uid}" count 5 --json`, {
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1' },
      stdio: ['pipe', 'pipe', 'pipe']
    }).stdout
    
    if (result) {
      const parsed = JSON.parse(result)
      if (parsed.videos && parsed.videos.length > 0) {
        // 累加播放量和点赞
        let totalPlays = 0
        let totalLikes = 0
        for (const v of parsed.videos) {
          totalPlays += parseInt(v.play) || 0
          totalLikes += parseInt(v.like) || 0
        }
        data.plays = totalPlays.toString()
        data.likes = totalLikes.toString()
      }
    }
  } catch (e) {
    console.error('搜索失败:', e.message)
  }
  
  console.log('B站数据:', JSON.stringify(data, null, 2))
  return data
}

module.exports = { crawlBilibili }
