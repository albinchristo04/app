import os
import json
import datetime as dt
from pathlib import Path
import requests

# --- Configuration ---
API_KEY = "123" # Use "123" as it worked for search_all_leagues and eventsnextleague
BASE_API_URL = f"https://www.thesportsdb.com/api/v1/json/{API_KEY}/"

REPO_ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = REPO_ROOT / "matches"
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT_PATH = OUT_DIR / "today.json"

# List of popular soccer league IDs to fetch events from
# English Premier League (4328) is confirmed to work.
# We can add more popular leagues here if needed.
POPULAR_SOCCER_LEAGUE_IDS = ["4328"] # English Premier League

def get_today_date_str():
    return dt.date.today().strftime("%Y-%m-%d")

def scrape_thesportsdb():
    today_date_str = get_today_date_str()
    all_matches = []
    
    for league_id in POPULAR_SOCCER_LEAGUE_IDS:
        api_url = f"{BASE_API_URL}eventsnextleague.php?id={league_id}"
        print(f"[TheSportsDB] Fetching data from: {api_url}")
        try:
            response = requests.get(api_url, timeout=30)
            response.raise_for_status()
            data = response.json()

            if data and data.get("events"): # The API returns a dict with a key 'events'
                print(f"[TheSportsDB] Found {len(data["events"])} events for League ID {league_id}.")
                for event in data["events"]:
                    # Filter for today's events
                    if event.get("dateEvent") == today_date_str:
                        home_team = event.get("strHomeTeam", "Unknown Home")
                        away_team = event.get("strAwayTeam", "Unknown Away")
                        competition = event.get("strLeague", "Unknown League")
                        event_time = event.get("strTime", "")
                        event_date = event.get("dateEvent", today_date_str)
                        event_status = event.get("strStatus", "NS")
                        final_score = event.get("strResult", "")

                        match_id = f"{home_team[:12]}-{away_team[:12]}-{event_date}".replace(" ", "")

                        home_logo = event.get("strHomeTeamBadge", "https://via.placeholder.com/50?text=H")
                        away_logo = event.get("strAwayTeamBadge", "https://via.placeholder.com/50?text=A")

                        status_code = "NS"
                        status_text = "Not Started"
                        if event_status == "FT":
                            status_code = "FT"
                            status_text = "Full-Time"
                        elif event_status == "HT":
                            status_code = "HT"
                            status_text = "Half-Time"
                        elif event_status and event_status != "NS":
                            status_code = "PST"
                            status_text = event_status

                        all_matches.append({
                            "id": match_id,
                            "home": home_team,
                            "away": away_team,
                            "home_logo": home_logo,
                            "away_logo": away_logo,
                            "time_baghdad": event_time, # Keeping the key name for app compatibility
                            "status": status_code,
                            "status_text": status_text,
                            "result_text": final_score,
                            "channel": event.get("strTVStation", None),
                            "commentator": None,
                            "competition": competition,
                            "_source": "thesportsdb"
                        })
            else:
                print(f"[TheSportsDB] No events found for League ID {league_id} or API response was empty/malformed.")

        except requests.exceptions.RequestException as e:
            print(f"[TheSportsDB] Error fetching data from API for League ID {league_id}: {e}")
        except json.JSONDecodeError:
            print(f"[TheSportsDB] Error decoding JSON response from API for League ID {league_id}.")

    return all_matches

def main():
    matches = scrape_thesportsdb()
    if not matches:
        print("No matches were scraped. Writing empty list to JSON.")
        output_data = {"date": get_today_date_str(), "source_url": "TheSportsDB API (multiple leagues)", "matches": []}
    else:
        print(f"[write] Scraped {len(matches)} matches in total.")
        output_data = {"date": get_today_date_str(), "source_url": "TheSportsDB API (multiple leagues)", "matches": matches}
    with OUT_PATH.open("w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    print(f"[write] Wrote {len(output_data['matches'])} matches to {OUT_PATH}.")

if __name__ == "__main__":
    main()