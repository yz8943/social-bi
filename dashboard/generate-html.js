function generate(data) {
  // 分离 B站和抖音数据
  const bilibiliData = data.filter(a => a.platform === 'bilibili' || a.platform === 'douyin');
  const douyinData = data.filter(a => a.platform === 'douyin');

  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8"/>
  <title>社媒运营BI - 大家车</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #f5f6fa;
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
    }
    h1 {
      text-align: center;
      color: #333;
      margin-bottom: 20px;
      font-size: 24px;
    }
    .tabs {
      display: flex;
      justify-content: center;
      gap: 10px;
      margin-bottom: 20px;
    }
    .tab-btn{
      padding: 12px 24px;
      border: none;
      background: #e0e0e0;
      border-radius: 8px;
      cursor: pointer;
      font-size: 16px;
      transition: all 0.2s;
    }
    .tab-btn.active{
      background: #fb7299;
      color: white;
    }
    .tab-btn.douyin{
      background: #000;
      color: white;
    }
    .card{
      background: white;
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 15px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      display: flex;
      align-items: flex-start;
      gap: 20px;
    }
    .avatar{
      flex-shrink: 0;
      width: 70px;
      height: 70px;
      border-radius: 50%;
      overflow: hidden;
      background: #eee;
    }
    .avatar img{
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .avatar a{
      display: block;
      width: 100%;
      height: 100%;
    }
    .info{
      flex: 1;
    }
    .info h2{
      margin: 0 0 12px 0;
      font-size: 16px;
    }
    .info h2 a{
      color: #333;
      text-decoration: none;
    }
    .infoh2 a:hover{
      color: #00a1d6;
    }
    .platform-tag{
      display: inline-block;
      padding: 2px 10px;
      border-radius: 4px;
      font-size: 12px;
      margin-left: 8px;
      background: #fb7299;
      color: white;
    }
    .platform-tag.douyin{
      background: #000;
    }
    .grid{
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-top: 12px;
    }
    .metric{
      background: #fafafa;
      padding: 12px;
      border-radius: 8px;
      text-align: center;
    }
    .metric-label{
      color: #999;
      font-size: 12px;
      margin-bottom: 4px;
    }
    .metric-value{
      color: #333;
      font-size: 16px;
      font-weight: bold;
    }
    .updated{
      text-align: center;
      color: #999;
      font-size: 11px;
      margin-top: 15px;
    }
  </style>
</head>
<body>
  <h1>📊 社媒运营BI</h1>
  
  <div class="tabs">
    <button class="tab-btn active" id="tab-bilibili" onclick="showTab('bilibili')">B站 (${bilibiliData.length})</button>
    <button class="tab-btn douyin" id="tab-douyin" onclick="showTab('douyin')">抖音 (${douyinData.length})</button>
  </div>
  
  <div id="content-bilibili">
    ${bilibiliData.map(a => `
    <div class="card">
      <div class="avatar">
        <a href="${a.url || '#'}" target="_blank">
          <img src="${a.avatar || 'https://i0.hdslb.com/bfs/face/member/noface.jpg'}" alt="${a.name}" onerror="this.src='https://i0.hdslb.com/bfs/face/member/noface.jpg'"/>
        </a>
      </div>
      <div class="info">
        <h2><a href="${a.url || '#'}" target="_blank">${a.name}</a><span class="platform-tag">B站</span></h2>
        <div class="grid">
          <div class="metric">
            <div class="metric-label">粉丝</div>
            <div class="metric-value">${a.followers}</div>
          </div>
          <div class="metric">
            <div class="metric-label">投稿</div>
            <div class="metric-value">${a.videos || '-'}</div>
          </div>
          <div class="metric">
            <div class="metric-label">获赞</div>
            <div class="metric-value">${a.likes}</div>
          </div>
        </div>
      </div>
    </div>
    `).join('')}
  </div>
  
  <div id="content-douyin" style="display:none">
    ${douyinData.map(a => `
    <div class="card">
      <div class="avatar">
        <a href="${a.url || '#'}" target="_blank">
          <img src="${a.avatar || 'https://p3.douyinpic.com/aweme/100x100.jpeg'}" alt="${a.name}" onerror="this.src='https://p3.douyinpic.com/aweme/100x100.jpeg'"/>
        </a>
      </div>
      <div class="info">
        <h2><a href="${a.url || '#'}" target="_blank">${a.name}</a><span class="platform-tag douyin">抖音</span></h2>
        <div class="grid">
          <div class="metric">
            <div class="metric-label">粉丝</div>
            <div class="metric-value">${a.followers}</div>
          </div>
          <div class="metric">
            <div class="metric-label">作品</div>
            <div class="metric-value">${a.videos || '-'}</div>
          </div>
          <div class="metric">
            <div class="metric-label">获赞</div>
            <div class="metric-value">${a.likes}</div>
          </div>
        </div>
      </div>
    </div>
    `).join('')}
  </div>
  
  <p class="updated">更新时间: ${new Date().toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})}</p>
  
  <script>
    function showTab(platform) {
      document.getElementById('content-bilibili').style.display = platform === 'bilibili' ? 'block' : 'none';
      document.getElementById('content-douyin').style.display = platform === 'douyin' ? 'block' : 'none';
      document.getElementById('tab-bilibili').classList.toggle('active', platform === 'bilibili');
      document.getElementById('tab-douyin').classList.toggle('active', platform === 'douyin');
      document.getElementById('tab-bilibili').classList.toggle('douyin', platform !== 'bilibili');
      document.getElementById('tab-douyin').classList.toggle('douyin', platform !== 'douyin');
    }
  </script>
</body>
</html>
`
}

module.exports = { generate }
