from flask import Flask, render_template
import pandas as pd
import json

app = Flask(__name__)

@app.route("/")
def index():

    try:
        df = pd.read_excel("history.xlsx")
    except:
        return "暂无数据，请先运行 bilibili_fetch.py"

    if df.empty:
        return "暂无数据"

    # 计算播放增长（需要至少两天数据）
    df = df.sort_values(["账号", "BV号", "日期"])
    df["昨日播放"] = df.groupby(["账号", "BV号"])["播放量"].shift(1)
    df["播放增长"] = df["播放量"] - df["昨日播放"]

    # 取最新一天的数据
    latest_date = df["日期"].max()
    df_today = df[df["日期"] == latest_date].copy()

    # 是否有增长数据（第二天起才有）
    has_growth = df_today["播放增长"].notna().any()

    # 账号排行榜
    if has_growth:
        rank_col = "播放增长"
        account_rank = (df_today.groupby("账号")["播放增长"]
                        .sum().reset_index()
                        .sort_values("播放增长", ascending=False)
                        .head(10))
        video_rank = (df_today.dropna(subset=["播放增长"])
                      .sort_values("播放增长", ascending=False)
                      .head(10))
    else:
        rank_col = "播放量"
        account_rank = (df_today.groupby("账号")["播放量"]
                        .sum().reset_index()
                        .rename(columns={"播放量": "播放增长"})
                        .sort_values("播放增长", ascending=False)
                        .head(10))
        video_rank = (df_today.sort_values("播放量", ascending=False)
                      .head(10)
                      .rename(columns={"播放量": "播放增长"}))

    # 趋势图（按日期汇总，只取有增长数据的行）
    df_growth = df.dropna(subset=["播放增长"])
    if not df_growth.empty:
        trend = (df_growth.groupby(["日期", "账号"])["播放增长"]
                 .sum().reset_index())
    else:
        # 第一天：用播放量代替
        trend = (df.groupby(["日期", "账号"])["播放量"]
                 .sum().reset_index()
                 .rename(columns={"播放量": "播放增长"}))

    trend["日期"] = trend["日期"].astype(str)

    return render_template(
        "index.html",
        account_rank=account_rank.to_dict("records"),
        video_rank=video_rank[["标题", "播放增长"]].to_dict("records"),
        trend=json.dumps(trend.to_dict("records"), default=str),
        rank_col=rank_col,
        latest_date=str(latest_date),
        has_growth=has_growth,
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)