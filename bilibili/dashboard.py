from flask import Flask, render_template, request
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
    for col in df.select_dtypes(include=["datetime64[ns]","datetime64[ns, UTC]"]).columns:
        df[col] = df[col].astype(str)
    for col in df.columns:
        df[col] = df[col].apply(lambda x: None if (isinstance(x, float) and x != x) else x)
    return json.dumps(df.to_dict("records"), default=str, ensure_ascii=False)

@app.route("/")
def index():
    history = safe_read("history.xlsx")
    if history.empty:
        return "暂无数据，请先运行 bilibili_fetch.py"

    all_accounts = sorted(history["账号"].dropna().unique().tolist())
    selected = request.args.get("account", "all")

    df = history.copy()
    if selected != "all" and selected in all_accounts:
        df = df[df["账号"] == selected]

    df = df.sort_values(["账号", "BV号", "日期"])
    df["昨日播放"] = df.groupby(["账号", "BV号"])["播放量"].shift(1)
    df["播放增长"] = df["播放量"] - df["昨日播放"]

    latest_date = df["日期"].max()
    df_today = df[df["日期"] == latest_date].copy()
    has_growth = df_today["播放增长"].notna().any()

    def si(col): return int(df_today[col].sum()) if col in df_today.columns else 0

    total_plays    = si("播放量")
    total_likes    = si("点赞")
    total_comments = si("评论")
    total_coins    = si("投币")
    total_collect  = si("收藏")
    total_share    = si("分享")
    total_danmu    = si("弹幕")
    total_growth   = int(df_today["播放增长"].sum()) if has_growth else 0

    # 账号排行 top10
    if has_growth:
        account_rank = (df_today.groupby("账号")["播放增长"]
                        .sum().reset_index()
                        .sort_values("播放增长", ascending=False).head(10))
    else:
        account_rank = (df_today.groupby("账号")["播放量"]
                        .sum().reset_index()
                        .rename(columns={"播放量": "播放增长"})
                        .sort_values("播放增长", ascending=False).head(10))

    # 视频排行 top10
    sort_col = "播放增长" if has_growth else "播放量"
    video_rank = df_today.dropna(subset=[sort_col]).sort_values(sort_col, ascending=False).head(10)

    # 趋势
    df_trend = df.dropna(subset=["播放增长"]) if has_growth else df
    trend_col = "播放增长" if has_growth else "播放量"
    trend = (df_trend.groupby(["日期","账号"])[trend_col]
             .sum().reset_index().rename(columns={trend_col:"播放增长"}))
    trend["日期"] = trend["日期"].astype(str)

    # 全量表（全部视频）
    cols = ["账号","BV号","标题","播放量","点赞","弹幕","评论","投币","收藏","分享"]
    cols = [c for c in cols if c in df_today.columns]
    table_data = df_today[cols].sort_values("播放量", ascending=False)

    # ── 空间数据 ──────────────────────────────────────────────────
    space_df = safe_read("space_history.xlsx")
    space_cards = []
    space_trend_json = "[]"

    if not space_df.empty:
        # 按账号过滤
        sp = space_df.copy()
        if selected != "all" and "账号" in sp.columns:
            sp = sp[sp["账号"] == selected]

        if not sp.empty:
            # 最新一条
            sp = sp.sort_values("日期")
            latest_sp = sp.groupby("账号").last().reset_index()
            for _, row in latest_sp.iterrows():
                space_cards.append({
                    "账号":  row.get("账号",""),
                    "关注数": int(row.get("关注数") or 0),
                    "粉丝数": int(row.get("粉丝数") or 0),
                    "获赞数": int(row.get("获赞数") or 0),
                    "播放数": int(row.get("播放数") or 0),
                })

            # 粉丝趋势
            sp["日期"] = sp["日期"].astype(str)
            space_trend_json = to_json(sp[["日期","账号","粉丝数"]])

    return render_template("index.html",
        latest_date=str(latest_date)[:10],
        has_growth=has_growth,
        all_accounts=all_accounts,
        selected=selected,
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
        space_cards=space_cards,
        space_trend=space_trend_json,
    )

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)