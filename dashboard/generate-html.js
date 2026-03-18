function generate(data) {
  const bilibiliData = data.filter(a => a.platform === 'bilibili')
  const douyinData   = data.filter(a => a.platform === 'douyin')
  const updatedAt    = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })

  // B站头像通过 proxy API 绕过防盗链（使用 images.weserv.nl 公共代理）
  function biliAvatarSrc(face) {
    if (!face || !face.startsWith('http')) return ''
    // weserv.nl 代理，去掉 https:// 前缀
    const stripped = face.replace(/^https?:\/\//, '')
    return `https://images.weserv.nl/?url=${encodeURIComponent(stripped)}&w=128&h=128&fit=cover`
  }

  const BILI_DEFAULT = 'https://i0.hdslb.com/bfs/face/member/noface.jpg'
  const DY_DEFAULT   = 'https://p3.douyinpic.com/aweme/100x100/aweme-avatar/mosaic-legacy_a68c0003a7f3cb20af60.jpeg'

  function card(a) {
    const isBili = a.platform === 'bilibili'
    const tag    = isBili
      ? `<span class="tag bili">B站</span>`
      : `<span class="tag dy">抖音</span>`

    const metrics = isBili
      ? [
          { label: '粉丝',   value: a.followers },
          { label: '播放量', value: a.plays     },
          { label: '获赞',   value: a.likes     }
        ]
      : [
          { label: '粉丝', value: a.followers },
          { label: '作品', value: a.videos    },
          { label: '获赞', value: a.likes     }
        ]

    // 头像处理
    let avatarHtml
    if (isBili) {
      // B站：用代理绕过防盗链，onerror 降级
      const proxySrc = biliAvatarSrc(a.avatar)
      const fallback = BILI_DEFAULT
      avatarHtml = proxySrc
        ? `<img src="${proxySrc}" alt="${a.name}" onerror="this.onerror=null;this.src='${fallback}'">`
        : `<img src="${fallback}" alt="${a.name}">`
    } else {
      // 抖音：头像无法直接展示（跨域+防盗链），用平台色块+首字作为替代
      const initial = a.name ? a.name.charAt(0) : '音'
      avatarHtml = `<div class="avatar-text dy-avatar">${initial}</div>`
    }

    return `
    <div class="card">
      <a class="avatar" href="${a.url || '#'}" target="_blank" rel="noopener">${avatarHtml}</a>
      <div class="info">
        <div class="name-row">
          <a class="name" href="${a.url || '#'}" target="_blank" rel="noopener">${a.name}</a>
          ${tag}
        </div>
        <div class="metrics">
          ${metrics.map(m => `
          <div class="metric">
            <div class="metric-label">${m.label}</div>
            <div class="metric-value">${m.value || '-'}</div>
          </div>`).join('')}
        </div>
      </div>
    </div>`
  }

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8"/>
  <title>社媒运营BI · 大家车</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", Arial, sans-serif;
      background: #f0f2f5; color: #222; min-height: 100vh; padding: 20px 16px 40px;
    }
    .header { text-align: center; margin-bottom: 24px; }
    .header h1 { font-size: 22px; font-weight: 700; color: #1a1a1a; }
    .header .subtitle { font-size: 13px; color: #888; margin-top: 4px; }
    .tabs { display: flex; justify-content: center; gap: 10px; margin-bottom: 20px; }
    .tab-btn {
      display: flex; align-items: center; gap: 6px;
      padding: 10px 24px; border: none; border-radius: 24px;
      cursor: pointer; font-size: 15px; font-weight: 600;
      transition: all 0.2s; background: #e0e0e0; color: #555;
    }
    .tab-btn .count {
      background: rgba(0,0,0,0.12); border-radius: 10px;
      font-size: 12px; padding: 1px 7px;
    }
    .tab-btn.active-bili { background: #fb7299; color: #fff; }
    .tab-btn.active-dy   { background: #1a1a1a; color: #fff; }
    .tab-btn.active-bili .count,
    .tab-btn.active-dy   .count { background: rgba(255,255,255,0.25); }
    .panel { max-width: 720px; margin: 0 auto; }
    .card {
      background: #fff; border-radius: 14px; padding: 16px;
      margin-bottom: 12px; display: flex; gap: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06); transition: box-shadow 0.2s;
    }
    .card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
    .avatar {
      flex-shrink: 0; width: 64px; height: 64px; border-radius: 50%;
      overflow: hidden; background: #eee; display: block;
    }
    .avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
    /* 抖音：文字头像 */
    .avatar-text {
      width: 100%; height: 100%; display: flex; align-items: center;
      justify-content: center; font-size: 22px; font-weight: 700; color: #fff;
      border-radius: 50%;
    }
    .dy-avatar { background: linear-gradient(135deg, #1a1a1a 0%, #3a3a3a 100%); }
    .info { flex: 1; min-width: 0; }
    .name-row { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
    .name {
      font-size: 15px; font-weight: 700; color: #1a1a1a; text-decoration: none;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .name:hover { color: #fb7299; }
    .tag { flex-shrink: 0; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; }
    .tag.bili { background: #fff0f4; color: #fb7299; }
    .tag.dy   { background: #f0f0f0; color: #333; }
    .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .metric { background: #fafafa; border-radius: 10px; padding: 10px 8px; text-align: center; }
    .metric-label { font-size: 11px; color: #999; margin-bottom: 4px; }
    .metric-value { font-size: 17px; font-weight: 700; color: #1a1a1a; }
    .empty { text-align: center; padding: 40px; color: #bbb; font-size: 14px; }
    .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #bbb; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 社媒运营 BI</h1>
    <div class="subtitle">大家车 · 更新于 ${updatedAt}</div>
  </div>
  <div class="tabs">
    <button class="tab-btn active-bili" id="tab-bili" onclick="showTab('bili')">
      <span>📺 B站</span><span class="count">${bilibiliData.length}</span>
    </button>
    <button class="tab-btn" id="tab-dy" onclick="showTab('dy')">
      <span>🎵 抖音</span><span class="count">${douyinData.length}</span>
    </button>
  </div>
  <div class="panel" id="panel-bili">
    ${bilibiliData.length ? bilibiliData.map(card).join('\n') : '<div class="empty">暂无数据</div>'}
  </div>
  <div class="panel" id="panel-dy" style="display:none">
    ${douyinData.length ? douyinData.map(card).join('\n') : '<div class="empty">暂无数据</div>'}
  </div>
  <div class="footer">bi.djcars.cn · Powered by OpenClaw</div>
  <script>
    function showTab(tab) {
      document.getElementById('panel-bili').style.display = tab === 'bili' ? 'block' : 'none';
      document.getElementById('panel-dy' ).style.display = tab === 'dy'   ? 'block' : 'none';
      document.getElementById('tab-bili').className = 'tab-btn' + (tab === 'bili' ? ' active-bili' : '');
      document.getElementById('tab-dy'  ).className = 'tab-btn' + (tab === 'dy'   ? ' active-dy'   : '');
    }
  </script>
</body>
</html>`
}

module.exports = { generate }
