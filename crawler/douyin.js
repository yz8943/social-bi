const { execSync } = require('child_process')

/**
 * 抖音数据抓取
 *
 * 问题根因：
 * 1. bb-browser open 有时复用已有 tab 而不是打开新页面 → 强制用新 tab
 * 2. 部分账号页面加载慢，需要更长等待并验证页面内容
 */
async function crawlDouyin(account) {
  const { name, url } = account
  console.log(`📡 抓取抖音: ${name}`)

  const base = {
    name, platform: 'douyin', url,
    followers: '0', following: '0', videos: '0',
    likes: '0', plays: '0', avatar: ''
  }

  // 关闭所有残留 tab（多次尝试直到报错说明已经没有了）
  let closeCount = 0
  while (closeCount < 5) {
    try { runCmd(`bb-browser tab close --openclaw`); closeCount++ }
    catch (_) { break }
    await sleep(300)
  }
  await sleep(1500)

  // 用 navigate 而不是 open，确保加载指定 URL（而不是复用旧 tab）
  // bb-browser open 会在新 tab 中打开；先 open，然后等待
  let opened = false
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      // 每次重试前再清一次 tab
      if (attempt > 1) {
        try { runCmd(`bb-browser tab close --openclaw`) } catch (_) {}
        await sleep(1000)
      }
      runCmd(`bb-browser open "${url}" --openclaw`)
      opened = true
      break
    } catch (e) {
      console.warn(`  ⚠️  open 第 ${attempt} 次失败:`, e.message.split('\n')[0])
      await sleep(2000)
    }
  }
  if (!opened) {
    console.error(`❌ 无法打开页面 [${name}]`)
    return base
  }

  // 等待渲染，最多等 3 轮（每轮 5s），直到 snapshot 包含账号主页关键词
  let snapshot = ''
  let isProfilePage = false

  for (let round = 1; round <= 4; round++) {
    await sleep(5000)
    try {
      snapshot = runCmd(`bb-browser snapshot --openclaw`)
    } catch (e) {
      console.warn(`  ⚠️  snapshot 第 ${round} 次失败`)
      continue
    }

    // 检查是否是账号主页（包含"粉丝"且标题含账号名或"的抖音"）
    const hasProfile = snapshot.includes('粉丝') && (
      snapshot.includes('- div "关注') ||
      snapshot.includes('heading "作品')
    )
    if (hasProfile) {
      isProfilePage = true
      break
    }

    // 可能是推荐页/搜索页，尝试再次导航
    console.warn(`  ⏳ 等待账号主页加载 (轮次 ${round})，当前页面不含账号数据，重新导航...`)
    if (round <= 2) {
      try {
        // 用 navigate 刷新到目标 URL
        runCmd(`bb-browser navigate "${url}" --openclaw`)
      } catch (_) {
        try {
          runCmd(`bb-browser tab close --openclaw`)
        } catch (_) {}
        await sleep(500)
        try { runCmd(`bb-browser open "${url}" --openclaw`) } catch (_) {}
      }
    }
  }

  // 关闭 tab
  try { runCmd(`bb-browser tab close --openclaw`) } catch (_) {}
  await sleep(2000)

  if (!isProfilePage) {
    const relevant = snapshot.split('\n')
      .filter(l => /粉丝|获赞|关注|作品/.test(l)).slice(0, 5)
    console.warn(`  ⚠️  ${name}: 未能加载账号主页，相关行:`, relevant.join(' | ') || '无')
    return base
  }

  // ── 提取头像 ──
  const avatar = fetchAvatarFromPage(url)

  // ── 提取：优先复合 div ──
  const compositeMatch = snapshot.match(/- div "关注 ([\d.万亿]+) 粉丝 ([\d.万亿]+) 获赞 ([\d.万亿]+)" <div>/)
  if (compositeMatch) {
    const following = compositeMatch[1]
    const followers = compositeMatch[2]
    const likes     = compositeMatch[3]
    const videosM   = snapshot.match(/- (?:heading|tab) "作品 (\d+)"/)
    const videos    = videosM ? videosM[1] : '0'
    console.log(`  ✅ ${name}: 粉丝 ${followers}, 关注 ${following}, 获赞 ${likes}, 作品 ${videos}, 头像 ${avatar ? '✓' : '✗'}`)
    return { ...base, followers, following, likes, videos, avatar }
  }

  // ── 降级：逐字段，取最后一次（目标账号在登录菜单之后出现）──
  const followers = extractLast(snapshot, /- div "粉丝 ([\d.万亿]+)" <div>/)
  const following = extractLast(snapshot, /- div "关注 (\d[\d.万亿]*)" <div>/)
  const likes     = extractLast(snapshot, /- div "获赞 ([\d.万亿]+)" <div>/)
  const videosM   = snapshot.match(/- (?:heading|tab) "作品 (\d+)"/)
  const videos    = videosM ? videosM[1] : '0'

  if (followers !== '0' || likes !== '0') {
    console.log(`  ✅ ${name} (降级): 粉丝 ${followers}, 获赞 ${likes}, 作品 ${videos}, 头像 ${avatar ? '✓' : '✗'}`)
    return { ...base, followers, following, likes, videos, avatar }
  }

  const relevant = snapshot.split('\n')
    .filter(l => /粉丝|获赞|关注|作品/.test(l)).slice(0, 8)
  console.warn(`  ⚠️  ${name}: 未能提取数据，相关行:`, relevant.join(' | ') || '无')
  return { ...base, avatar }
}

function runCmd(cmd) {
  return execSync(cmd, {
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 35000
  })
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

/**
 * 从抖音用户主页 HTML 提取头像 URL
 * 页面 RENDER_DATA 中包含 avatarUrl 字段
 */
function fetchAvatarFromPage(url) {
  try {
    const html = runCmd(`bb-browser fetch "${url}" --openclaw`)
    // 优先：签名头像 URL（p{n}-pc-sign.douyinpic.com，画质更好）
    const signedMatch = html.match(/avatarUrl[^,]*?https:\\u002F\\u002Fp[0-9]+-pc-sign\.douyinpic\.com\\u002F[^"\\]+/)
    if (signedMatch) {
      return decodeURIComponent(
        signedMatch[0].replace(/^avatarUrl[^,]*?/, '').replace(/\\u002F/g, '/').replace(/\\u0026/g, '&').replace(/\\u0025/g, '%')
      )
    }
    // 备用 1：avatarUrl 字段中的 douyinpic URL
    const avatarMatch = html.match(/avatarUrl[^"]*"(https?:\/\/[^"\\]+douyinpic[^"\\]*aweme-avatar[^"\\]*\.(?:jpeg|webp|jpg)[^"\\]*)/)
    if (avatarMatch) {
      return avatarMatch[1].replace(/\\u0026/g, '&').replace(/\\u0025/g, '%').replace(/&amp;/g, '&')
    }
    // 备用 2：页面中任意 douyinpic 头像 URL
    const urlMatch = html.match(/(https:\/\/p[0-9]+-pc\.douyinpic\.com\/aweme[^"'\s\\]*aweme-avatar[^"'\s\\]*\.(?:jpeg|webp|jpg)[^"'\s\\]*)/)
    if (urlMatch) {
      return urlMatch[1].replace(/\\u0026/g, '&').replace(/\\u0025/g, '%').replace(/&amp;/g, '&')
    }
  } catch (e) {
    console.warn(`  ⚠️  头像获取失败:`, e.message.split('\n')[0])
  }
  return ''
}

function extractLast(text, regex) {
  const re = new RegExp(regex.source, 'g')
  let match, last = null
  while ((match = re.exec(text)) !== null) last = match
  return last ? last[1] : '0'
}

module.exports = { crawlDouyin }
