from flask import Flask, render_template
import pandas as pd
import json

app = Flask(__name__)

def safe_read(path):
    try:
        df = pd.read_excel(path)
        df = df.where(pd.notnull(df), None)
        return df
    except:
        return pd.DataFrame()

def to_json(df):
    df = df.copy()
    for col in df.select_dtypes(include=["datetime64[ns]", "datetime64[ns, UTC]"]).columns:
        df[col] = df[col].astype(str)
    for col in df.columns:
        df[col] = df[col].apply(lambda x: None if (isinstance(x, float) and pd.isna(x)) else x)
    return json.dumps(df.to_dict("records"), default=str, ensure_ascii=False)

@app.route("/")
def index():
    history = safe_read("history.xlsx")
    if history.empty:
        return "暂无数据，请先运行 bilibili_fetch.py"

    # 计算增长
    history = history.sort_values(["账号", "BV号", "日期"])
    history["昨日播放"] = history.groupby(["账号", "BV号"])["播放量"].shift(1)
    history["播放增长"] = history["播放量"] - history["昨日播放"]

    latest_date = history["日期"].max()
    df_today = history[history["日期"] == latest_date].copy()
    has_growth = df_today["播放增长"].notna().any()

    # 汇总卡片数据
    total_plays   = int(df_today["播放量"].sum())
    total_likes   = int(df_today["点赞"].sum()) if "点赞" in df_today.columns else 0
    total_comments= int(df_today["评论"].sum()) if "评论" in df_today.columns else 0
    total_coins   = int(df_today["投币"].sum()) if "投币" in df_today.columns else 0
    total_collect = int(df_today["收藏"].sum()) if "收藏" in df_today.columns else 0
    total_share   = int(df_today["分享"].sum()) if "分享" in df_today.columns else 0
    total_danmu   = int(df_today["弹幕"].sum()) if "弹幕" in df_today.columns else 0
    total_growth  = int(df_today["播放增长"].sum()) if has_growth else 0

    # 账号排行
    if has_growth:
        account_rank = (df_today.groupby("账号")["播放增长"]
                        .sum().reset_index()
                        .sort_values("播放增长", ascending=False).head(10))
    else:
        account_rank = (df_today.groupby("账号")["播放量"]
                        .sum().reset_index()
                        .rename(columns={"播放量": "播放增长"})
                        .sort_values("播放增长", ascending=False).head(10))

    # 视频排行
    sort_col = "播放增长" if has_growth else "播放量"
    video_rank = df_today.dropna(subset=[sort_col]).sort_values(sort_col, ascending=False).head(10)

    # 趋势
    df_trend = history.dropna(subset=["播放增长"]) if has_growth else history
    trend_col = "播放增长" if has_growth else "播放量"
    trend = (df_trend.groupby(["日期", "账号"])[trend_col]
             .sum().reset_index().rename(columns={trend_col: "播放增长"}))
    trend["日期"] = trend["日期"].astype(str)

    # 各视频完整数据表
    cols = ["BV号","标题","播放量","点赞","弹幕","评论","投币","收藏","分享"]
    cols = [c for c in cols if c in df_today.columns]
    table_data = df_today[cols].sort_values("播放量", ascending=False)

    return render_template("index.html",
        latest_date=str(latest_date)[:10],
        has_growth=has_growth,
        total_plays=total_plays,
        total_growth=total_growth,
        total_likes=total_likes,
        total_comments=total_comments,
        total_coins=total_coins,
        total_collect=total_collect,
        total_share=total_share,
        total_danmu=total_danmu,
        account_rank=account_rank.to_dict("records"),
        video_rank=video_rank.to_dict("records"),
        trend=to_json(trend),
        table_data=to_json(table_data),
    )

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)