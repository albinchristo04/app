import os
import json
import datetime as dt
from pathlib import Path
import requests # New import

# --- Configuration ---
API_KEY = "1" # Free API key for v1, will try this first
BASE_API_URL = f"https://www.thesportsdb.com/api/v1/json/{API_KEY}/eventsday.php" # Common v1 endpoint for events by day

REPO_ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = REPO_ROOT / "matches"
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT_PATH = OUT_DIR / "today.json"

def get_today_date_str():
    """Returns today's date in YYYY-MM-DD format."""
    return dt.date.today().strftime("%Y-%m-%d")

def scrape_thesportsdb():
    """
    Fetches match data from TheSportsDB.com API.
    """
    today_date_str = get_today_date_str()
    api_url = f"{BASE_API_URL}?d={today_date_str}"
    all_matches = []

    print(f"[TheSportsDB] Fetching data from: {api_url}")
    try:
        response = requests.get(api_url, timeout=30) # 30 second timeout
        response.raise_for_status() # Raise an exception for HTTP errors (4xx or 5xx)
        data = response.json()

        if data and data.get("events"): # The API returns a dict with a key 'events'
            print(f"[TheSportsDB] Found {len(data["events"])} events.")
            for event in data["events"]:
                # Map API fields to our desired JSON structure
                home_team = event.get("strHomeTeam", "Unknown Home")
                away_team = event.get("strAwayTeam", "Unknown Away")
                competition = event.get("strLeague", "Unknown League")
                event_time = event.get("strTime", "") # Format: HH:MM:SS
                event_date = event.get("dateEvent", today_date_str) # Format: YYYY-MM-DD
                event_status = event.get("strStatus", "NS") # e.g., "FT", "NS", "HT"
                final_score = event.get("strResult", "") # e.g., "1-0"

                # Construct a unique ID
                match_id = f"{home_team[:12]}-{away_team[:12]}-{event_date}".replace(" ", "")

                # TheSportsDB doesn't always provide logos directly in this endpoint, use placeholders
                home_logo = event.get("strHomeTeamBadge", "https://via.placeholder.com/50?text=H")
                away_logo = event.get("strAwayTeamBadge", "https://via.placeholder.com/50?text=A")

                # Status mapping
                status_code = "NS"
                status_text = "Not Started"
                if event_status == "FT":
                    status_code = "FT"
                    status_text = "Full-Time"
                elif event_status == "HT":
                    status_code = "HT"
                    status_text = "Half-Time"
                elif event_status and event_status != "NS": # Other statuses like "Postponed"
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
                    "channel": event.get("strTVStation", None), # API might provide this
                    "commentator": None, # API unlikely to provide this
                    "competition": competition,
                    "_source": "thesportsdb"
                })
        else:
            print("[TheSportsDB] No events found for today or API response was empty/malformed.")

    except requests.exceptions.RequestException as e:
        print(f"[TheSportsDB] Error fetching data from API: {e}")
    except json.JSONDecodeError:
        print("[TheSportsDB] Error decoding JSON response from API.")

    return all_matches

def main():
    matches = scrape_thesportsdb()
    if not matches:
        print("No matches were scraped. Writing empty list to JSON.")
        output_data = {"date": get_today_date_str(), "source_url": f"{BASE_API_URL}?d={get_today_date_str()}", "matches": []}
    else:
        print(f"[write] Scraped {len(matches)} matches in total.")
        output_data = {"date": get_today_date_str(), "source_url": f"{BASE_API_URL}?d={get_today_date_str()}", "matches": matches}
    with OUT_PATH.open("w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    print(f"[write] Wrote {len(output_data['matches'])} matches to {OUT_PATH}.")

if __name__ == "__main__":
    main()