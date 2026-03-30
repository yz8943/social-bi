import time
import re
import os
import pandas as pd
from datetime import datetime
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

LIST_URL  = "https://member.bilibili.com/platform/upload-manager/article"
DATA_URL  = "https://member.bilibili.com/platform/upload-manager/article/data/{bv}"

# 账号配置：json文件名 → (显示名, 空间UID)
ACCOUNTS = {
    "Kerry学英语.json": ("Kerry学英语", "404045311"),
}

HISTORY       = "history.xlsx"
SPACE_HISTORY = "space_history.xlsx"  # 空间数据单独存一张表

def parse_num(text: str) -> int:
    text = text.strip()
    if not text or text == "-":
        return 0
    m = re.match(r"([\d.]+)\s*万", text)
    if m:
        return int(float(m.group(1)) * 10000)
    m = re.search(r"[\d,]+", text)
    if m:
        return int(m.group().replace(",", ""))
    return 0


# ════════════════════════════════════════════════════════════════════════
# 空间数据抓取
# ════════════════════════════════════════════════════════════════════════
def fetch_space(page, account: str, uid: str) -> dict:
    url = f"https://space.bilibili.com/{uid}"
    page.goto(url, wait_until="domcontentloaded")
    try:
        page.wait_for_selector("text=粉丝数", timeout=15_000)
    except PlaywrightTimeoutError:
        print(f"  [警告] 空间页超时: {account}")
        return {}
    time.sleep(2)

    data = {
        "日期":   datetime.now().date(),
        "账号":   account,
        "UID":    uid,
        "关注数": 0,
        "粉丝数": 0,
        "获赞数": 0,
        "播放数": 0,
    }

    try:
        body = page.locator("body").inner_text(timeout=5_000)
        lines = [l.strip() for l in body.split("\n") if l.strip()]

        # 找"关注数"后面紧跟的数字
        for i, line in enumerate(lines):
            if line == "关注数" and i + 1 < len(lines):
                data["关注数"] = parse_num(lines[i + 1])
            elif line == "粉丝数" and i + 1 < len(lines):
                data["粉丝数"] = parse_num(lines[i + 1])
            elif line == "获赞数" and i + 1 < len(lines):
                data["获赞数"] = parse_num(lines[i + 1])
            elif line == "播放数" and i + 1 < len(lines):
                data["播放数"] = parse_num(lines[i + 1])

    except Exception as e:
        print(f"  [错误] 空间解析失败: {e}")

    print(f"  空间数据 | 关注:{data['关注数']} 粉丝:{data['粉丝数']} "
          f"获赞:{data['获赞数']} 播放:{data['播放数']}")
    return data


def save_space_history(data: list[dict]):
    if not data:
        return
    df = pd.DataFrame(data)
    try:
        old = pd.read_excel(SPACE_HISTORY)
        df = pd.concat([old, df], ignore_index=True)
    except FileNotFoundError:
        pass
    try:
        df.to_excel(SPACE_HISTORY, index=False)
        print(f"space_history.xlsx 已更新，共 {len(df)} 行")
    except PermissionError:
        print(f"[错误] 无法写入 {SPACE_HISTORY}，请先关闭 Excel")


# ════════════════════════════════════════════════════════════════════════
# 视频列表抓取
# ════════════════════════════════════════════════════════════════════════
def fetch_list_page(page, account: str) -> list[dict]:
    page.goto(LIST_URL, wait_until="domcontentloaded")
    try:
        page.wait_for_selector("a[href*='article/data/']", timeout=20_000)
    except PlaywrightTimeoutError:
        print("  [警告] 列表页超时")
        return []
    time.sleep(2)

    today = datetime.now().date()
    results = []
    data_links = page.locator("a[href*='article/data/']").all()
    print(f"  找到视频数：{len(data_links)}")

    for link in data_links:
        href = link.get_attribute("href") or ""
        m = re.search(r"(BV\w+)", href)
        if not m:
            continue
        bv = m.group(1)

        try:
            card_text = link.locator("../../..").inner_text(timeout=3_000)
            lines = [l.strip() for l in card_text.split("\n") if l.strip()]

            # 结构: 标题 / 日期 / 编辑 / 数据 / 播放 点赞 弹幕 评论 投币 收藏 分享
            title    = lines[0] if lines else ""
            pub_date = lines[1] if len(lines) > 1 else ""
            nums     = [parse_num(l) for l in lines if re.match(r"^[\d.,万]+$", l)]

            def g(i): return nums[i] if i < len(nums) else 0

            row = {
                "日期":   today,
                "账号":   account,
                "BV号":   bv,
                "标题":   title,
                "发布日期": pub_date,
                "播放量":  g(0),
                "点赞":    g(1),
                "弹幕":    g(2),
                "评论":    g(3),
                "投币":    g(4),
                "收藏":    g(5),
                "分享":    g(6),
            }

            print(f"  {bv} | {title[:18]} | "
                  f"播:{row['播放量']} 赞:{row['点赞']} 弹:{row['弹幕']} "
                  f"评:{row['评论']} 币:{row['投币']} 藏:{row['收藏']} 享:{row['分享']}")
            results.append(row)

        except Exception as e:
            print(f"  [错误] {bv}: {e}")

    return results


def save_history(data: list[dict]):
    df = pd.DataFrame(data)
    if df.empty:
        print("[警告] 本次未抓到任何视频数据")
        return
    try:
        old = pd.read_excel(HISTORY)
        df = pd.concat([old, df], ignore_index=True)
    except FileNotFoundError:
        pass
    try:
        df.to_excel(HISTORY, index=False)
        print(f"history.xlsx 已更新，共 {len(df)} 行")
    except PermissionError:
        print(f"[错误] 无法写入 {HISTORY}，请先关闭 Excel")


def calc_growth() -> pd.DataFrame:
    df = pd.read_excel(HISTORY)
    df = df.sort_values(["账号", "BV号", "日期"])
    df["昨日播放"] = df.groupby(["账号", "BV号"])["播放量"].shift(1)
    df["播放增长"] = df["播放量"] - df["昨日播放"]
    try:
        df.to_excel("report.xlsx", index=False)
    except PermissionError:
        print("[错误] 无法写入 report.xlsx，请先关闭 Excel")
    return df

def calc_trend(df):
    df.groupby(["日期","账号"])["播放增长"].sum().reset_index().to_excel("trend.xlsx", index=False)

def calc_hot(df):
    df[df["播放增长"] > 1000].to_excel("hot.xlsx", index=False)

def account_rank(df):
    (df.groupby("账号")["播放增长"].sum()
       .reset_index().sort_values("播放增长", ascending=False)
       .to_excel("account_rank.xlsx", index=False))

def video_rank(df):
    df.sort_values("播放增长", ascending=False).to_excel("video_rank.xlsx", index=False)


# ════════════════════════════════════════════════════════════════════════
# 主流程
# ════════════════════════════════════════════════════════════════════════
def main():
    all_video_data  = []
    all_space_data  = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        for file, (account, uid) in ACCOUNTS.items():
            account_file = f"accounts/{file}"
            if not os.path.exists(account_file):
                print(f"[错误] 找不到账号文件：{account_file}")
                continue

            print(f"\n▶ 账号：{account}")
            context = browser.new_context(storage_state=account_file)
            page = context.new_page()
            page.on("console", lambda msg: None)

            # 1. 抓空间数据
            print("  → 抓取空间数据...")
            space = fetch_space(page, account, uid)
            if space:
                all_space_data.append(space)

            # 2. 抓视频列表
            print("  → 抓取视频列表...")
            videos = fetch_list_page(page, account)
            all_video_data.extend(videos)

            context.close()

        browser.close()

    # 保存
    save_space_history(all_space_data)

    if all_video_data:
        save_history(all_video_data)
        try:
            df = calc_growth()
            calc_trend(df)
            calc_hot(df)
            account_rank(df)
            video_rank(df)
        except Exception as e:
            print(f"[分析错误] {e}")

    print("\n✅ 全部完成")
    outputs = ["history.xlsx","space_history.xlsx","report.xlsx",
               "trend.xlsx","hot.xlsx","account_rank.xlsx","video_rank.xlsx"]
    for f in outputs:
        if os.path.exists(f):
            print(f"   {f}")


if __name__ == "__main__":
    main()