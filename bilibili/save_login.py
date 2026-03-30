from playwright.sync_api import sync_playwright
import os

ACCOUNTS = [
    "Kerry学英语",
]

os.makedirs("accounts", exist_ok=True)

with sync_playwright() as p:

    browser = p.chromium.launch(headless=False)

    for acc in ACCOUNTS:

        context = browser.new_context()
        page = context.new_page()

        page.goto("https://member.bilibili.com")

        print(f"\n请切换账号: {acc}")
        input("切换完成按回车...")

        context.storage_state(
            path=f"accounts/{acc}.json"
        )

        context.close()

    browser.close()

print("账号保存完成")