import os
import datetime as dt
from pathlib import Path
from playwright.sync_api import sync_playwright
import time
from zoneinfo import ZoneInfo # Keep ZoneInfo for BAGHDAD_TZ

BAGHDAD_TZ = ZoneInfo("Asia/Baghdad")
DEFAULT_URL = "https://www.yalla-shoot.info/matches-today/"

REPO_ROOT = Path(__file__).resolve().parents[1]

def get_yallashoot_url():
    return DEFAULT_URL

def capture_yallashoot_state():
    """
    DEBUGGING script for Yalla Shoot.
    It navigates to the page, waits a fixed amount of time, and takes a screenshot and saves HTML.
    """
    url = get_yallashoot_url()
    print(f"[YallaShoot-Debug] Launching browser...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(
            viewport={'width': 1366, 'height': 864},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127 Safari/537.36",
            locale="ar",
            timezone_id="Asia/Baghdad",
        )
        page = ctx.new_page()
        
        print(f"[YallaShoot-Debug] Navigating to {url}")
        try:
            page.goto(url, wait_until="networkidle", timeout=60000)
            print("[YallaShoot-Debug] Page navigation finished (networkidle).")
        except Exception as e:
            print(f"[YallaShoot-Debug] Page navigation failed: {e}")
            # Still try to take a screenshot of the error page
        
        print("[YallaShoot-Debug] Waiting for 15 seconds to allow JS to render...")
        time.sleep(15)

        # --- Capture State ---
        print("[YallaShoot-Debug] Capturing page state...")
        screenshot_path = REPO_ROOT / "debug_screenshot.png"
        html_path = REPO_ROOT / "rendered_page.html"

        try:
            page.screenshot(path=screenshot_path, full_page=True)
            print(f"[YallaShoot-Debug] Screenshot saved to {screenshot_path}")
            
            html_content = page.content()
            with open(html_path, "w", encoding="utf-8") as f:
                f.write(html_content)
            print(f"[YallaShoot-Debug] Rendered HTML saved to {html_path}")
        except Exception as e:
            print(f"[YallaShoot-Debug] Failed to capture page state: {e}")

        browser.close()

if __name__ == "__main__":
    capture_yallashoot_state()