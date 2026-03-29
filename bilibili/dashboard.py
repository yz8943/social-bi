from flask import Flask, render_template
import pandas as pd
import json

app = Flask(__name__)

@app.route("/")
def index():

    try:
        df = pd.read_excel("report.xlsx")
    except:
        df = pd.DataFrame()

    if len(df) == 0:
        return "暂无数据"

    # 账号排行榜
    account_rank = df.groupby("账号")["播放增长"].sum().reset_index()
    account_rank = account_rank.sort_values(
        "播放增长",
        ascending=False
    ).head(10)

    # 视频排行榜
    video_rank = df.sort_values(
        "播放增长",
        ascending=False
    ).head(10)

    # 趋势图
    trend = df.groupby(
        ["日期","账号"]
    )["播放增长"].sum().reset_index()

    return render_template(
        "index.html",
        account_rank=account_rank.to_dict("records"),
        video_rank=video_rank.to_dict("records"),
        trend=json.dumps(trend.to_dict("records"))
    )


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )