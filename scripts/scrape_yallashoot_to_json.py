import os
import datetime as dt
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
import time

# --- Configuration ---
BASE_URL = "https://int.soccerway.com/matches/"
REPO_ROOT = Path(__file__).resolve().parents[1]

def get_soccerway_url_for_today():
    today = dt.date.today()
    return f"{BASE_URL}{today.year}/{today.month:02d}/{today.day:02d}/"

def capture_page_state():
    """
    This is a DEBUGGING script.
    It navigates to the page, handles cookies, waits for content,
    and then saves a screenshot and the rendered HTML for analysis.
    """
    url = get_soccerway_url_for_today()
    print(f"[Soccerway-Debug] Launching browser...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127 Safari/537.36",
            locale="en-US",
        )
        page = ctx.new_page()
        page.set_default_timeout(90000)

        print(f"[Soccerway-Debug] Navigating to {url}")
        try:
            page.goto(url, wait_until="domcontentloaded")
        except PWTimeout:
            print("[Soccerway-Debug] Page navigation timed out.")
            browser.close()
            return

        print("[Soccerway-Debug] Looking for cookie consent button...")
        try:
            cookie_button = page.locator('#onetrust-accept-btn-handler, button:has-text("AGREE"), button:has-text("ACCEPT")').first
            cookie_button.wait_for(timeout=15000)
            if cookie_button.is_visible():
                print("[Soccerway-Debug] Cookie consent button found. Clicking it.")
                cookie_button.click()
                time.sleep(3)
        except Exception:
            print("[Soccerway-Debug] Could not find or click cookie button, continuing.")

        print("[Soccerway-Debug] Waiting for match tables to appear...")
        try:
            page.wait_for_selector("table.matches tbody tr", state='attached', timeout=45000)
            print("[Soccerway-Debug] Wait successful. Content should be present.")
        except PWTimeout:
            print("[Soccerway-Debug] Timed out waiting for content. Will capture state anyway.")

        # --- Capture State ---
        print("[Soccerway-Debug] Capturing page state for analysis...")
        screenshot_path = REPO_ROOT / "debug_screenshot.png"
        html_path = REPO_ROOT / "rendered_page.html"

        try:
            page.screenshot(path=screenshot_path, full_page=True)
            print(f"[Soccerway-Debug] Screenshot saved to {screenshot_path}")
            
            html_content = page.content()
            with open(html_path, "w", encoding="utf-8") as f:
                f.write(html_content)
            print(f"[Soccerway-Debug] Rendered HTML saved to {html_path}")
        except Exception as e:
            print(f"[Soccerway-Debug] Failed to capture page state: {e}")

        browser.close()

if __name__ == "__main__":
    capture_page_state()
