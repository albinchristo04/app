import os
from pathlib import Path
from playwright.sync_api import sync_playwright
import time
import datetime as dt

BASE_URL = "https://int.soccerway.com/matches/"
REPO_ROOT = Path(__file__).resolve().parents[1]

def get_soccerway_url_for_today():
    today = dt.date.today()
    return f"{BASE_URL}{today.year}/{today.month:02d}/{today.day:02d}/"

def capture_simplest_state():
    """
    This is the simplest possible debug script.
    It just goes to the page, waits a fixed amount of time, and takes a screenshot.
    It makes ZERO assumptions about page content.
    """
    url = get_soccerway_url_for_today()
    print(f"[Soccerway-Super-Debug] Launching browser...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127 Safari/537.36",
            locale="en-US",
            viewport={'width': 1280, 'height': 1024}
        )
        page = ctx.new_page()
        
        print(f"[Soccerway-Super-Debug] Navigating to {url}")
        try:
            page.goto(url, wait_until="networkidle", timeout=60000)
            print("[Soccerway-Super-Debug] Page navigation finished (networkidle).")
        except Exception as e:
            print(f"[Soccerway-Super-Debug] Page navigation failed: {e}")
        
        print("[Soccerway-Super-Debug] Waiting for 15 seconds to allow JS to render...")
        time.sleep(15)

        # --- Capture State ---
        print("[Soccerway-Super-Debug] Capturing page state...")
        screenshot_path = REPO_ROOT / "debug_screenshot.png"
        html_path = REPO_ROOT / "rendered_page.html"

        try:
            page.screenshot(path=screenshot_path, full_page=True)
            print(f"[Soccerway-Super-Debug] Screenshot saved to {screenshot_path}")
            
            html_content = page.content()
            with open(html_path, "w", encoding="utf-8") as f:
                f.write(html_content)
            print(f"[Soccerway-Super-Debug] Rendered HTML saved to {html_path}")
        except Exception as e:
            print(f"[Soccerway-Super-Debug] Failed to capture page state: {e}")

        browser.close()

if __name__ == "__main__":
    capture_simplest_state()