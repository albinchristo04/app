# scripts/scrape_yallashoot_to_json.py
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
    return f"{BASE_URL}{today.year}/{today.month:02d}/{today.day:02d}/"

def scrape_soccerway():
    """
    Scrapes match data from Soccerway.com.
    This version is more robust, handles cookie banners, and waits for dynamic content.
    """
    url = get_soccerway_url_for_today()
    today_iso = dt.date.today().isoformat()
    all_matches = []

    print(f"[Soccerway] Launching browser...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127 Safari/537.36",
            locale="en-US",
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

        # --- Step 1: Handle Cookie Consent ---
        print("[Soccerway] Looking for cookie consent button...")
        try:
            # OneTrust banners often use these IDs or text
            cookie_button = page.locator('#onetrust-accept-btn-handler, button:has-text("AGREE"), button:has-text("ACCEPT")').first
            cookie_button.wait_for(timeout=15000) # Wait for the button to be available
            if cookie_button.is_visible():
                print("[Soccerway] Cookie consent button found. Clicking it.")
                cookie_button.click()
                time.sleep(3) # Wait for the banner to disappear
            else:
                print("[Soccerway] Cookie button not visible, assuming no banner.")
        except PWTimeout:
            print("[Soccerway] Timed out waiting for cookie button. It might not exist, continuing.")
        except Exception as e:
            print(f"[Soccerway] Error clicking cookie button: {e}")

        # --- Step 2: Wait for Match Content ---
        print("[Soccerway] Waiting for matches to be rendered dynamically...")
        try:
            # This is a better selector. We wait for a row that has a team name in it.
            # This is more specific than just waiting for any table.
            page.wait_for_selector("tr.match td.team-a a", state='visible', timeout=45000)
            print("[Soccerway] Match content appears to be rendered.")
        except PWTimeout:
            print("[Soccerway] Timed out waiting for match content to render. The page might be empty or the structure has changed. Aborting.")
            page.screenshot(path=REPO_ROOT / "debug_screenshot.png") # Take a screenshot for debugging
            browser.close()
            return []

        # --- Step 3: Scrape the Data ---
        print("[Soccerway] Starting data extraction...")
        # A competition is a table with class 'matches'
        competition_tables = page.locator('table.matches').all()

        print(f"[Soccerway] Found {len(competition_tables)} competition tables.")

        for table in competition_tables:
            try:
                competition_name = table.locator('thead th a').inner_text().strip()
            except Exception:
                competition_name = "Unknown Competition"

            # Get all match rows, excluding header/group rows
            match_rows = table.locator('tbody tr:not(.group-head):not(.empty)').all()

            for row in match_rows:
                try:
                    home_team = row.locator('td.team-a a').get_attribute('title').strip()
                    away_team = row.locator('td.team-b a').get_attribute('title').strip()
                    score_or_time = row.locator('td.score-time a').inner_text().strip()

                    status, result_text, time_utc, status_text = "NS", "", "", "Not Started"

                    if ':' in score_or_time:
                        time_utc = score_or_time
                    elif '-' in score_or_time:
                        status = "FT"  # Assume Full-Time
                        result_text = score_or_time
                        status_text = "Full-Time"
                    else:
                        status = "PST" # Postponed or other status
                        status_text = score_or_time

                    all_matches.append({
                        "id": f"{home_team[:12]}-{away_team[:12]}-{today_iso}".replace(" ", ""),
                        "home": home_team,
                        "away": away_team,
                        "home_logo": "https://via.placeholder.com/50?text=L",
                        "away_logo": "https://via.placeholder.com/50?text=L",
                        "time_baghdad": time_utc, # Garder la clé pour la compatibilité avec l'application, mais la valeur est UTC
                        "status": status,
                        "status_text": status_text,
                        "result_text": result_text,
                        "channel": None,
                        "commentator": None,
                        "competition": competition_name,
                        "_source": "soccerway"
                    })
                except Exception as e:
                    print(f"[Soccerway] Error parsing a match row: {e}")
                    continue

        browser.close()
        print(f"[Soccerway] Successfully extracted {len(all_matches)} matches.")
        return all_matches

def main():
    """Main function to run the scraper and write the JSON file."""
    matches = scrape_soccerway()

    if not matches:
        print("No matches were scraped. The output file will not be updated, writing empty list.")
        output_data = {"date": dt.date.today().isoformat(), "source_url": get_soccerway_url_for_today(), "matches": []}
    else:
        print(f"[write] Scraped {len(matches)} matches in total.")
        output_data = {
            "date": dt.date.today().isoformat(),
            "source_url": get_soccerway_url_for_today(),
            "matches": matches
        }

    with OUT_PATH.open("w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    print(f"[write] Wrote {len(output_data['matches'])} matches to {OUT_PATH}.")


if __name__ == "__main__":
    main()
