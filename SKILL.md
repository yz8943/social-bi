---
name: social-bi
description: 抓取 B站/抖音账号数据并生成 BI 看板，支持定时任务和自动发布
read_when:
  - 抓取 B站账号数据
  - 抓取抖音账号数据
  - 生成 BI 看板
  - 社交媒体数据追踪
metadata: {"clawdbot":{"emoji":"📊"}}
allowed-tools: Bash(node:*), Browser(*)
---

# Social BI Skill

抓取 B站 / 抖音账号数据并生成 BI 看板。

## 功能

- 抓取 B站账号数据（粉丝、播放、获赞、投稿数）
- 抓取抖音账号数据（粉丝、获赞、作品数、关注数）
- 自动生成 HTML BI 看板
- 发布到 here.now (固定域名: bi.djcars.cn)
- 支持定时任务

## 使用方式

### 由 Agent 调用

Agent 会读取 `config/accounts.json`，使用浏览器工具获取每个账号的数据，然后调用 `publish.js` 生成并发布看板。

### 配置账号

编辑 `config/accounts.json`:

```json
{
  "bilibili": [
    {
      "name": "账号名称",
      "uid": "B站用户ID"
    }
  ],
  "douyin": [
    {
      "name": "账号名称",
      "url": "https://www.douyin.com/user/xxx"
    }
  ]
}
```

## 运行

```bash
cd ~/.openclaw/workspace/skills/social-bi
node publish.js
```

## 模块说明

- `config/accounts.json` - 账号配置
- `crawler/bilibili.js` - B站数据抓取 (通过 Agent 浏览器)
- `crawler/douyin.js` - 抖音数据抓取 (通过 Agent 浏览器)
- `dashboard/generate-html.js` - 生成 HTML 看板
- `publisher/here.js` - 发布到 here.now

## 发布配置

- 固定域名: `bi.djcars.cn`
- API Key: `~/.herenow/credentials`

## 数据格式

```json
{
  "name": "账号名称",
  "platform": "bilibili | douyin",
  "uid": "用户ID",
  "followers": "粉丝数",
  "following": "关注数",
  "videos": "投稿数",
  "likes": "获赞数",
  "plays": "播放数",
  "avatar": "头像URL",
  "url": "主页链接"
}
```

## 当前追踪账号

### B站 (7个)
- 大家车言论、粤爱车、大家车观察、 智能车研究所
- 大家车-YYP、袁启聪、大家车-曾颖卓

### 抖音 (7个)
- 大家车言论、粤爱车、大家车观察、 智能车研究所
- YYP颜宇鹏、袁启聪、曾颖卓
