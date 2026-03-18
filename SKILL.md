---
name: social-bi
description: 通过 bb-browser 抓取 B站/抖音账号数据并生成 BI 看板，发布到 bi.djcars.cn
read_when:
  - 抓取 B站账号数据
  - 抓取抖音账号数据
  - 生成社媒 BI 看板
  - 社交媒体数据追踪
metadata: {"clawdbot":{"emoji":"📊"}}
allowed-tools: Bash(node:*), Bash(bb-browser:*)
---

# Social BI Skill

通过 **bb-browser**（OpenClaw 浏览器）抓取 B站 / 抖音账号数据，生成 BI 看板并发布到 `bi.djcars.cn`。

## 前提

- 已安装 `bb-browser`（`npm i -g bb-browser`）
- OpenClaw 浏览器已运行，且已在浏览器中登录 B站 / 抖音

## 快速开始

```bash
# 一键抓取 + 发布
node index.js

# 仅重新发布（用已有 data.json）
node publish.js

# 干跑：只抓数据，输出到 output/dashboard.html，不发布
node index.js --dry-run

# 定时任务（每天 10:00 / 17:00 自动更新）
node scheduler/cron.js
```

## 配置账号

编辑 `config/accounts.json`：

```json
{
  "bilibili": [
    { "name": "账号名称", "uid": "B站用户ID" }
  ],
  "douyin": [
    { "name": "账号名称", "url": "https://www.douyin.com/user/MS4w..." }
  ]
}
```

## 抓取策略

### B站
1. `bb-browser site bilibili/space <uid> --openclaw --json`（主）
2. 降级：`bb-browser site bilibili/search <name> --openclaw --json`（累加视频数据）

### 抖音
1. `bb-browser site douyin/user <uid> --openclaw --json`（主，从 URL 提取 uid）
2. 降级：`bb-browser open <url> --openclaw` + `bb-browser snapshot` 解析页面文本

## 文件结构

```
config/accounts.json       账号配置
crawler/bilibili.js        B站抓取
crawler/douyin.js          抖音抓取
dashboard/generate-html.js 生成 HTML 看板
publisher/here.js          发布到 here.now
index.js                   主入口（抓取 + 发布）
publish.js                 仅发布（读 data.json）
scheduler/cron.js          定时任务
data.json                  上次抓取结果（自动生成）
```

## 发布配置

- 固定域名：`bi.djcars.cn`
- API Key：`~/.herenow/credentials` 或环境变量 `HERENOW_API_KEY`

## 数据格式（data.json）

```json
[
  {
    "name": "账号名称",
    "platform": "bilibili | douyin",
    "uid": "用户ID（B站）",
    "url": "主页链接",
    "followers": "粉丝数（如 12.3万）",
    "following": "关注数",
    "videos": "投稿/作品数",
    "likes": "获赞数",
    "plays": "播放数（B站）",
    "avatar": "头像URL"
  }
]
```
