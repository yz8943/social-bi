const { execSync } = require('child_process')

/**
 * B站数据抓取
 *
 * 头像获取策略（多级 fallback）：
 *   1. /x/space/acc/info API → data.face
 *   2. /x/space/wbi/acc/info API（新版接口）→ data.face
 *   3. bb-browser open 用户主页 → snapshot 提取 image URL
 *   4. 默认头像
 */
async function crawlBilibili(account) {
  const { name, uid } = account
  console.log(`📡 抓取 B站: ${name} (uid: ${uid})`)

  const base = {
    name, platform: 'bilibili', uid,
    url: `https://space.bilibili.com/${uid}`,
    followers: '0', following: '0', videos: '0',
    likes: '0', plays: '0', avatar: ''
  }

  try {
    // ── 1. 粉丝数 ──
    const relStat = fetchJson(`https://api.bilibili.com/x/relation/stat?vmid=${uid}&jsonp=jsonp`)
    const follower  = relStat?.data?.follower  ?? 0
    const following = relStat?.data?.following ?? 0

    // ── 2. 用户信息（头像）多级 fallback ──
    let avatar = ''
    avatar = await getAvatar(uid, name)

    // ── 3. 获赞 / 播放量 ──
    let likes = 0, plays = 0
    const upStat = fetchJson(`https://api.bilibili.com/x/space/upstat?mid=${uid}&jsonp=jsonp`)
    if (upStat?.code === 0) {
      likes = upStat.data?.likes         ?? 0
      plays = upStat.data?.archive?.view ?? 0
    }

    console.log(`  ✅ ${name}: 粉丝 ${formatNumber(follower)}, 播放 ${formatNumber(plays)}, 获赞 ${formatNumber(likes)}, 头像 ${avatar ? '✓' : '✗'}`)

    return {
      ...base,
      followers: formatNumber(follower),
      following: formatNumber(following),
      plays:     formatNumber(plays),
      likes:     formatNumber(likes),
      avatar
    }
  } catch (e) {
    console.error(`❌ B站抓取失败 [${name}]:`, e.message)
    return base
  }
}

/**
 * 多级 fallback 获取 B站用户头像
 */
async function getAvatar(uid, name) {
  // 方案 A：旧版 acc/info
  const accInfo = fetchJson(`https://api.bilibili.com/x/space/acc/info?mid=${uid}&jsonp=jsonp`)
  if (accInfo?.code === 0 && accInfo.data?.face) {
    return accInfo.data.face
  }
  if (accInfo?.code !== 0) {
    console.log(`  ↳ acc/info code=${accInfo?.code}, 尝试备用接口...`)
  }

  // 方案 B：member/search 接口（无需登录，返回用户基本信息含头像）
  const memberInfo = fetchJson(`https://api.bilibili.com/x/web-interface/card?mid=${uid}&photo=true`)
  if (memberInfo?.code === 0 && memberInfo.data?.card?.face) {
    return memberInfo.data.card.face
  }

  // 方案 C：从 B站主页 snapshot 提取头像
  // snapshot 里头像通常在 `- image <img>` 节点，紧跟用户名附近
  // 但 snapshot 不含 URL，改用 bb-browser fetch 拿 HTML 解析
  const face = fetchAvatarFromPage(uid)
  if (face) return face

  console.warn(`  ↳ ${name} 头像获取失败，使用默认图`)
  return ''
}

/**
 * 通过 B站空间页 HTML 提取头像 URL
 * 页面 <meta property="og:image"> 通常含头像
 */
function fetchAvatarFromPage(uid) {
  try {
    const html = execSync(
        `bb-browser fetch "https://space.bilibili.com/${uid}" --openclaw`,
        {
          encoding: 'utf8',
          env: { ...process.env, NO_COLOR: '1' },
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 20000
        }
    )
    // og:image 包含用户头像
    const ogMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/)
    if (ogMatch) return ogMatch[1]

    // 备用：avatar 关键字附近的图片 URL
    const avatarMatch = html.match(/["'](https:\/\/i[0-9]\.hdslb\.com\/bfs\/face\/[^"']+)["']/)
    if (avatarMatch) return avatarMatch[1]
  } catch (_) {}
  return ''
}

function fetchJson(url) {
  for (const flag of ['--openclaw', '']) {
    try {
      const cmd = flag
          ? `bb-browser fetch "${url}" ${flag} --json`
          : `bb-browser fetch "${url}" --json`
      const out = execSync(cmd, {
        encoding: 'utf8',
        env: { ...process.env, NO_COLOR: '1' },
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 20000
      })
      return JSON.parse(out.trim())
    } catch (_) {}
  }
  console.warn(`  ⚠️  fetch 失败: ${url}`)
  return null
}

function formatNumber(num) {
  const n = typeof num === 'string' ? parseFloat(num.replace(/[,，]/g, '')) : Number(num)
  if (!n || isNaN(n)) return '0'
  if (n >= 100000000) return (n / 100000000).toFixed(1) + '亿'
  if (n >= 10000)     return (n / 10000).toFixed(1) + '万'
  return String(Math.round(n))
}

module.exports = { crawlBilibili }