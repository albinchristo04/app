import os
import json
import datetime as dt
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
import time

# --- Configuration ---
BASE_URL = "https://int.soccerway.com/matches/"
REPO_ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = REPO_ROOT / "matches"
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT_PATH = OUT_DIR / "today.json"

def get_soccerway_url_for_today():
    """Constructs the URL for today's matches on Soccerway."""
    today = dt.date.today()
    return f"{BASE_URL}{today.year}/{today.month:02d}/{today.day:02d}/?force=1"

def scrape_soccerway():
    url = get_soccerway_url_for_today()
    today_iso = dt.date.today().isoformat()
    all_matches = []

    print(f"[Soccerway] Launching browser...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127 Safari/537.36",
            locale="en-US",
            extra_http_headers={"Accept-Language": "en-US,en;q=0.9"}
        )
        page = ctx.new_page()
        page.set_default_timeout(90000)

        print(f"[Soccerway] Navigating to {url}")
        try:
            page.goto(url, wait_until="domcontentloaded")
        except PWTimeout:
            print("[Soccerway] Page navigation timed out. Aborting.")
            browser.close()
            return []

        print("[Soccerway] Looking for cookie consent button...")
        try:
            cookie_button = page.locator('#onetrust-accept-btn-handler').first
            cookie_button.wait_for(timeout=15000)
            if cookie_button.is_visible():
                print("[Soccerway] Cookie consent button found. Clicking it.")
                cookie_button.click()
                time.sleep(3)
        except Exception:
            print("[Soccerway] Could not find or click cookie button, continuing.")

        print("[Soccerway] Waiting for match content to render...")
        try:
            page.wait_for_selector("div.table-container table.matches", state='visible', timeout=45000)
            print("[Soccerway] Match content appears to be rendered.")
        except PWTimeout:
            print("[Soccerway] Timed out waiting for match content to render. Aborting.")
            browser.close()
            return []

        competition_divs = page.locator('div.table-container').all()
        print(f"[Soccerway] Found {len(competition_divs)} competition containers.")

        for container in competition_divs:
            try:
                competition_name = container.locator('h2.block_header a').inner_text().strip()
            except Exception:
                competition_name = "Unknown Competition"

            match_rows = container.locator('table.matches tbody tr').all()
            for row in match_rows:
                try:
                    score_time_element = row.locator('td.score-time a')
                    if score_time_element.count() == 0:
                        continue

                    home_team = row.locator('td.team-a a').get_attribute('title').strip()
                    away_team = row.locator('td.team-b a').get_attribute('title').strip()
                    score_or_time = score_time_element.inner_text().strip()

                    status, result_text, time_utc, status_text = "NS", "", "", "Not Started"

                    if ':' in score_or_time:
                        time_utc = score_or_time
                    elif '-' in score_or_time.strip():
                        status = "FT"
                        result_text = score_or_time.strip()
                        status_text = "Full-Time"
                    else:
                        status = "PST"
                        status_text = score_or_time.strip()

                    all_matches.append({
                        "id": f"{home_team[:12]}-{away_team[:12]}-{today_iso}".replace(" ", ""),
                        "home": home_team,
                        "away": away_team,
                        "home_logo": "https://via.placeholder.com/50?text=L",
                        "away_logo": "https://via.placeholder.com/50?text=L",
                        "time_baghdad": time_utc,
                        "status": status,
                        "status_text": status_text,
                        "result_text": result_text,
                        "channel": None,
                        "commentator": None,
                        "competition": competition_name,
                        "_source": "soccerway"
                    })
                except Exception:
                    continue

        browser.close()
        print(f"[Soccerway] Successfully extracted {len(all_matches)} matches.")
        return all_matches

def main():
    matches = scrape_soccerway()
    if not matches:
        print("No matches were scraped. Writing empty list to JSON.")
        output_data = {"date": dt.date.today().isoformat(), "source_url": get_soccerway_url_for_today(), "matches": []}
    else:
        print(f"[write] Scraped {len(matches)} matches in total.")
        output_data = {"date": dt.date.today().isoformat(), "source_url": get_soccerway_url_for_today(), "matches": matches}
    with OUT_PATH.open("w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    print(f"[write] Wrote {len(output_data['matches'])} matches to {OUT_PATH}.")

if __name__ == "__main__":
    main()
