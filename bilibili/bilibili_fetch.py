import time
import os
import pandas as pd
from datetime import datetime
from playwright.sync_api import sync_playwright

LIST_URL = "https://member.bilibili.com/platform/upload-manager/article"

ACCOUNTS = {
    "Kerry学英语.json": "Kerry学英语",
}

HISTORY = "history.xlsx"
REPORT = "report.xlsx"
TREND = "trend.xlsx"
HOT = "hot.xlsx"
ACCOUNT_RANK = "account_rank.xlsx"
VIDEO_RANK = "video_rank.xlsx"


def get_number(page, name):

    try:
        text = page.locator(f"text={name}").locator("..").inner_text()
        num = ''.join(filter(str.isdigit, text))
        return int(num) if num else 0

    except:
        return 0


def fetch_video(page, account, bv):

    url = f"https://member.bilibili.com/platform/upload-manager/article/data/{bv}"

    page.goto(url)

    time.sleep(2)

    data = {}

    data["日期"] = datetime.now().date()
    data["账号"] = account
    data["BV号"] = bv

    try:
        data["标题"] = page.locator("h3").first.inner_text()
    except:
        data["标题"] = ""

    data["播放量"] = get_number(page, "播放量")
    data["点赞"] = get_number(page, "点赞")
    data["评论"] = get_number(page, "评论")
    data["收藏"] = get_number(page, "收藏")
    data["投币"] = get_number(page, "投币")
    data["分享"] = get_number(page, "分享")

    return data


def fetch_account(page, account):

    page.goto(LIST_URL)

    time.sleep(3)

    links = page.locator("a[href*='article/data']").all()

    bvs = []

    for link in links:

        href = link.get_attribute("href")

        if href and "BV" in href:

            bv = href.split("/")[-1]

            bvs.append(bv)

    print(account, "视频:", len(bvs))

    results = []

    for bv in bvs:

        print("抓取:", bv)

        data = fetch_video(page, account, bv)

        results.append(data)

    return results


def save_history(data):

    df = pd.DataFrame(data)

    try:

        old = pd.read_excel(HISTORY)

        df = pd.concat([old, df])

    except:

        pass

    df.to_excel(HISTORY, index=False)


def calc_growth():

    df = pd.read_excel(HISTORY)

    df = df.sort_values(["账号", "BV号", "日期"])

    df["昨日播放"] = df.groupby(
        ["账号", "BV号"]
    )["播放量"].shift(1)

    df["播放增长"] = df["播放量"] - df["昨日播放"]

    df.to_excel(REPORT, index=False)

    return df


def calc_trend(df):

    trend = df.groupby(
        ["日期", "账号"]
    )["播放增长"].sum().reset_index()

    trend.to_excel(TREND, index=False)


def calc_hot(df):

    hot = df[df["播放增长"] > 1000]

    hot.to_excel(HOT, index=False)


def account_rank(df):

    rank = df.groupby(
        "账号"
    )["播放增长"].sum().reset_index()

    rank = rank.sort_values(
        "播放增长",
        ascending=False
    )

    rank.to_excel(ACCOUNT_RANK, index=False)


def video_rank(df):

    rank = df.sort_values(
        "播放增长",
        ascending=False
    )

    rank.to_excel(VIDEO_RANK, index=False)


def main():

    all_data = []

    with sync_playwright() as p:

        browser = p.chromium.launch(
            headless=True
        )

        for file, account in ACCOUNTS.items():

            print("抓取账号:", account)

            context = browser.new_context(
                storage_state=f"accounts/{file}"
            )

            page = context.new_page()

            data = fetch_account(
                page,
                account
            )

            all_data.extend(data)

            context.close()

        browser.close()

    save_history(all_data)

    df = calc_growth()

    calc_trend(df)

    calc_hot(df)

    account_rank(df)

    video_rank(df)

    print("全部完成")


if __name__ == "__main__":

    main()