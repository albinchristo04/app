# scripts/scrape_yallashoot_to_json.py
import os
import json
import datetime as dt
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
import time

# --- Configuration ---
# The new source for match data
BASE_URL = "https://int.soccerway.com/matches/"
REPO_ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = REPO_ROOT / "matches"
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT_PATH = OUT_DIR / "today.json"

def get_soccerway_url_for_today():
    """Constructs the URL for today's matches on Soccerway."""
    today = dt.date.today()
    # Format month and day with leading zeros
    return f"{BASE_URL}{today.year}/{today.month:02d}/{today.day:02d}/"

def scrape_soccerway():
    """
    Scrapes match data from Soccerway.com.
    NOTE: This script is based on common HTML patterns for this site, as direct
    inspection was not possible. Selectors may need adjustment.
    """
    url = get_soccerway_url_for_today()
    today_iso = dt.date.today().isoformat()
    all_matches = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127 Safari/537.36",
            locale="en-US",
        )
        page = ctx.new_page()
        page.set_default_timeout(90000)  # Increased timeout for this potentially heavier site

        print(f"[Soccerway] Navigating to {url}")
        page.goto(url, wait_until="domcontentloaded")
        try:
            # Wait for the main match table container to be visible
            # Soccerway uses tables with a class `matches`
            page.wait_for_selector('table.matches', state='visible', timeout=30000)
            print("[Soccerway] Match tables found.")
        except PWTimeout:
            print("[Soccerway] Timed out waiting for match tables. The page structure might have changed.")
            # Let's try to accept a cookie banner if it's in the way
            try:
                cookie_button = page.query_selector('button:has-text("ACCEPT")') or page.query_selector('button:has-text("AGREE")')
                if cookie_button:
                    cookie_button.click()
                    print("[Soccerway] Clicked cookie consent button. Retrying wait.")
                    page.wait_for_selector('table.matches', state='visible', timeout=30000)
                else:
                    browser.close()
                    return []
            except Exception as e:
                print(f"[Soccerway] Could not click cookie button or find matches after: {e}")
                browser.close()
                return []

        competition_tables = page.query_selector_all('table.matches')
        print(f"[Soccerway] Found {len(competition_tables)} competition tables.")

        for table in competition_tables:
            try:
                # The competition name is usually in the thead of the table
                competition_name_element = table.query_selector('thead th a')
                competition_name = competition_name_element.inner_text().strip() if competition_name_element else "Unknown Competition"
            except AttributeError:
                competition_name = "Unknown Competition"

            match_rows = table.query_selector_all('tbody tr:not(.group-head)') # Exclude group headers within a competition

            for row in match_rows:
                try:
                    home_team_element = row.query_selector('td.team-a a')
                    away_team_element = row.query_selector('td.team-b a')
                    score_time_element = row.query_selector('td.score-time a')

                    # Skip if essential elements are missing
                    if not all([home_team_element, away_team_element, score_time_element]):
                        continue

                    home_team = home_team_element.get_attribute('title').strip()
                    away_team = away_team_element.get_attribute('title').strip()
                    score_or_time = score_time_element.inner_text().strip()

                    status = "NS"  # Not Started
                    result_text = ""
                    time_utc = ""
                    status_text = "Not Started"

                    if ':' in score_or_time:
                        time_utc = score_or_time
                    elif '-' in score_or_time: # It's a score like "2 - 1"
                        status = "FT"  # Assume Full-Time
                        result_text = score_or_time
                        status_text = "Full-Time"
                    else: # Could be postponed (PST), cancelled (CAN), etc.
                        status = "PST"
                        status_text = score_or_time


                    match_data = {
                        "id": f"{home_team[:12]}-{away_team[:12]}-{today_iso}".replace(" ", ""),
                        "home": home_team,
                        "away": away_team,
                        "home_logo": "https://via.placeholder.com/50?text=L",  # Placeholder logo
                        "away_logo": "https://via.placeholder.com/50?text=L",  # Placeholder logo
                        "time_baghdad": time_utc, # Keep key for app compatibility, but value is UTC
                        "status": status,
                        "status_text": status_text,
                        "result_text": result_text,
                        "channel": None,
                        "commentator": None,
                        "competition": competition_name,
                        "_source": "soccerway"
                    }
                    all_matches.append(match_data)

                except Exception as e:
                    print(f"[Soccerway] Error parsing a match row: {e}")
                    continue

        browser.close()
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