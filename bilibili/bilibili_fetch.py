import time
import re
import os
import pandas as pd
from datetime import datetime
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

LIST_URL = "https://member.bilibili.com/platform/upload-manager/article"
DATA_URL = "https://member.bilibili.com/platform/upload-manager/article/data/{bv}"

ACCOUNTS = {
    "Kerry学英语.json": "Kerry学英语",
}

HISTORY      = "history.xlsx"
REPORT       = "report.xlsx"
TREND        = "trend.xlsx"
HOT          = "hot.xlsx"
ACCOUNT_RANK = "account_rank.xlsx"
VIDEO_RANK   = "video_rank.xlsx"


def parse_num(text: str) -> int:
    """解析数字，支持 '19.7万' 格式"""
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
            # 第3层父级包含完整卡片文字
            # 结构: 标题\n日期\n编辑\n数据\n播放\n点赞\n弹幕\n评论\n投币\n收藏\n分享
            card_text = link.locator("../../..").inner_text(timeout=3_000)
            lines = [l.strip() for l in card_text.split("\n") if l.strip()]

            # lines[0] = 标题（第一行，非时间非操作文字）
            # lines[1] = 日期，如 "2021年08月27日 14:50:07"
            # lines[2] = "编辑"
            # lines[3] = "数据"
            # lines[4:] = 数字
            title     = lines[0] if lines else ""
            pub_date  = lines[1] if len(lines) > 1 else ""
            nums      = [parse_num(l) for l in lines if re.match(r"^[\d.,万]+$", l)]

            # 顺序：播放 点赞 弹幕 评论 投币 收藏 分享
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
            continue

    return results


def fetch_detail_extra(page, bv: str) -> dict:
    """可选：抓详情页的平均播放进度和完成率"""
    page.goto(DATA_URL.format(bv=bv), wait_until="domcontentloaded")
    try:
        page.wait_for_selector("text=平均播放进度", timeout=10_000)
    except PlaywrightTimeoutError:
        return {"平均播放进度(秒)": 0, "完成率(%)": 0.0}
    time.sleep(1)

    extra = {"平均播放进度(秒)": 0, "完成率(%)": 0.0}
    try:
        block = page.locator("text=平均播放进度").locator("../..").inner_text(timeout=3_000)
        mins = re.search(r"(\d+)\s*分", block)
        secs = re.search(r"(\d+)\s*秒", block)
        extra["平均播放进度(秒)"] = (int(mins.group(1)) * 60 if mins else 0) + (int(secs.group(1)) if secs else 0)
    except Exception:
        pass
    try:
        block = page.locator("text=占总时长").locator("../..").inner_text(timeout=3_000)
        m = re.search(r"([\d.]+)\s*%", block)
        extra["完成率(%)"] = float(m.group(1)) if m else 0.0
    except Exception:
        pass
    return extra


def save_history(data: list[dict]):
    df = pd.DataFrame(data)
    if df.empty:
        print("[警告] 本次未抓到任何数据")
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
        print(f"[错误] 无法写入 {HISTORY}，请先关闭 Excel 中打开的该文件，然后重新运行")


def calc_growth() -> pd.DataFrame:
    df = pd.read_excel(HISTORY)
    df = df.sort_values(["账号", "BV号", "日期"])
    df["昨日播放"] = df.groupby(["账号", "BV号"])["播放量"].shift(1)
    df["播放增长"] = df["播放量"] - df["昨日播放"]
    df.to_excel(REPORT, index=False)
    return df


def calc_trend(df):
    df.groupby(["日期", "账号"])["播放增长"].sum().reset_index().to_excel(TREND, index=False)

def calc_hot(df):
    df[df["播放增长"] > 1000].to_excel(HOT, index=False)

def account_rank(df):
    (df.groupby("账号")["播放增长"].sum()
       .reset_index()
       .sort_values("播放增长", ascending=False)
       .to_excel(ACCOUNT_RANK, index=False))

def video_rank(df):
    df.sort_values("播放增长", ascending=False).to_excel(VIDEO_RANK, index=False)


def main():
    all_data = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for file, account in ACCOUNTS.items():
            account_file = f"accounts/{file}"
            if not os.path.exists(account_file):
                print(f"[错误] 找不到账号文件：{account_file}")
                continue
            print(f"\n▶ 抓取账号：{account}")
            context = browser.new_context(storage_state=account_file)
            page = context.new_page()
            page.on("console", lambda msg: None)
            data = fetch_list_page(page, account)
            all_data.extend(data)
            context.close()
        browser.close()

    if not all_data:
        print("\n[错误] 没有抓到任何数据，请检查 cookie 是否过期")
        return

    save_history(all_data)
    try:
        df = calc_growth()
        calc_trend(df)
        calc_hot(df)
        account_rank(df)
        video_rank(df)
        print("\n✅ 全部完成，输出文件：")
        for f in [HISTORY, REPORT, TREND, HOT, ACCOUNT_RANK, VIDEO_RANK]:
            if os.path.exists(f):
                print(f"   {f}")
    except Exception as e:
        print(f"\n[分析阶段错误] {e}（数据已保存到 history.xlsx）")


if __name__ == "__main__":
    main()