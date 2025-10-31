import os, json, datetime as dt, time
from pathlib import Path
from zoneinfo import ZoneInfo
from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

BAGHDAD_TZ = ZoneInfo("Asia/Baghdad")
DEFAULT_URL = "https://www.yalla-shoot.info/matches-today/"

REPO_ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = REPO_ROOT / "matches"
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT_PATH = OUT_DIR / "today.json"


def gradual_scroll(page, step=900, pause=0.25):
    last_h = 0
    while True:
        h = page.evaluate("() => document.body.scrollHeight")
        if h <= last_h:
            break
        for y in range(0, h, step):
            page.evaluate(f"window.scrollTo(0, {y});")
            time.sleep(pause)
        last_h = h


def scrape():
    url = os.environ.get("FORCE_URL") or DEFAULT_URL
    today = dt.datetime.now(BAGHDAD_TZ).date().isoformat()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(
            viewport={"width": 1366, "height": 864},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127 Safari/537.36",
            locale="ar",
            timezone_id="Asia/Baghdad",
        )
        page = ctx.new_page()
        page.set_default_timeout(60000)

        print("[open]", url)
        page.goto(url, wait_until="domcontentloaded", timeout=60000)
        try:
            page.wait_for_load_state("networkidle", timeout=20000)
        except PWTimeout:
            pass

        gradual_scroll(page)

        screenshot_path = REPO_ROOT / "debug_screenshot.png"
        page.screenshot(path=screenshot_path, full_page=True)
        print(f"[screenshot] Saved screenshot to {screenshot_path}")

        js = r"""
            () => {
                const cards = [];
                
                // Try multiple possible selectors for match cards
                let matchElements = document.querySelectorAll('.AY_Inner');
                if (matchElements.length === 0) {
                    matchElements = document.querySelectorAll('[class*="Match"]'); // Generic match class
                }
                if (matchElements.length === 0) {
                    matchElements = document.querySelectorAll('.match-item'); // Another common class
                }
                if (matchElements.length === 0) {
                    matchElements = document.querySelectorAll('[id*="match"]'); // Match in id
                }
                if (matchElements.length === 0) {
                    // Fallback to any element that might contain match data
                    matchElements = document.querySelectorAll('div[data-*], div[class*="card"], div[class*="match"]');
                }
                
                matchElements.forEach((element, idx) => {
                    // Try multiple selector strategies for each field
                    const qText = (selArray) => {
                        if (!Array.isArray(selArray)) selArray = [selArray];
                        for (const sel of selArray) {
                            const el = element.querySelector(sel);
                            if (el) return el.textContent.trim();
                        }
                        return "";
                    };
                    
                    const qAttr = (selArray, attr) => {
                        if (!Array.isArray(selArray)) selArray = [selArray];
                        for (const sel of selArray) {
                            const el = element.querySelector(sel);
                            if (el) {
                                return el.getAttribute(attr) || el.getAttribute('data-' + attr) || "";
                            }
                        }
                        return "";
                    };
                    
                    // Define multiple possible selectors for each field
                    const home = qText([
                        '.MT_Team.TM1 .TM_Name', 
                        '[class*="home"] [class*="name"]', 
                        '[class*="team1"]', 
                        '.home-team',
                        '[class*="team"] .name:first-child',
                        '.match-teams > div:first-child [class*="name"]'
                    ]);
                    
                    const away = qText([
                        '.MT_Team.TM2 .TM_Name', 
                        '[class*="away"] [class*="name"]', 
                        '[class*="team2"]', 
                        '.away-team',
                        '[class*="team"] .name:last-child',
                        '.match-teams > div:last-child [class*="name"]'
                    ]);
                    
                    const homeLogo = qAttr([
                        '.MT_Team.TM1 .TM_Logo img', 
                        '[class*="home"] img', 
                        '[class*="team1"] img',
                        '.home-team img'
                    ], 'src') || qAttr([
                        '.MT_Team.TM1 .TM_Logo img', 
                        '[class*="home"] img', 
                        '[class*="team1"] img',
                        '.home-team img'
                    ], 'data-src');
                    
                    const awayLogo = qAttr([
                        '.MT_Team.TM2 .TM_Logo img', 
                        '[class*="away"] img', 
                        '[class*="team2"] img',
                        '.away-team img'
                    ], 'src') || qAttr([
                        '.MT_Team.TM2 .TM_Logo img', 
                        '[class*="away"] img', 
                        '[class*="team2"] img',
                        '.away-team img'
                    ], 'data-src');
                    
                    const time = qText([
                        '.MT_Data .MT_Time', 
                        '[class*="time"]', 
                        '.match-time',
                        '[class*="clock"]'
                    ]);
                    
                    const result = qText([
                        '.MT_Data .MT_Result', 
                        '[class*="result"]', 
                        '.match-result',
                        '[class*="score"]'
                    ]);
                    
                    const status = qText([
                        '.MT_Data .MT_Stat', 
                        '[class*="status"]', 
                        '.match-status',
                        '[class*="state"]'
                    ]);
                    
                    // For channels, commentators, and competitions, try different approaches
                    let channel = '', commentator = '', competition = '';
                    
                    // Try the original method first
                    const infoLis = element.querySelectorAll('.MT_Info li span');
                    if (infoLis.length >= 3) {
                        channel = infoLis[0] ? infoLis[0].textContent.trim() : "";
                        commentator = infoLis[1] ? infoLis[1].textContent.trim() : "";
                        competition = infoLis[2] ? infoLis[2].textContent.trim() : "";
                    } else {
                        // Alternative method: try to find these in other ways
                        const possibleChannel = qText([
                            '[class*="channel"]', 
                            '[class*="broadcast"]',
                            '.channel-name',
                            '.tv-channel'
                        ]);
                        channel = possibleChannel;
                        
                        const possibleCompetition = qText([
                            '[class*="competition"]', 
                            '[class*="league"]', 
                            '[class*="tournament"]',
                            '.competition-name',
                            '.league-name'
                        ]);
                        competition = possibleCompetition;
                    }
                    
                    // Only add if we have at least home and away teams
                    if (home && away) {
                        cards.push({
                            home,
                            away,
                            home_logo: homeLogo,
                            away_logo: awayLogo,
                            time_local: time,
                            result_text: result,
                            status_text: status,
                            channel,
                            commentator,
                            competition
                        });
                    }
                });
                return cards;
            }
        """
        cards = page.evaluate(js)
        browser.close()
        print(f"[found] {len(cards)} cards")

    def normalize_status(ar_text: str) -> str:
        t = (ar_text or "").strip()
        if not t:
            return "NS"
        if "انتهت" in t or "نتهت" in t:
            return "FT"
        if "مباشر" in t or "الشوط" in t:
            return "LIVE"
        if "لم" in t and "تبدأ" in t:
            return "NS"
        return "NS"

    out = {
        "date": today,
        "source_url": url,
        "matches": []
    }

    for c in cards:
        mid = f"{c['home'][:12]}-{c['away'][:12]}-{today}".replace(" ", "")
        out["matches"].append({
            "id": mid,
            "home": c["home"],
            "away": c["away"],
            "home_logo": c["home_logo"],
            "away_logo": c["away_logo"],
            "time_baghdad": c["time_local"],
            "status": normalize_status(c["status_text"]),
            "status_text": c["status_text"],
            "result_text": c["result_text"],
            "channel": c["channel"] or None,
            "commentator": c["commentator"] or None,
            "competition": c["competition"] or None,
            "_source": "yalla1shoot"
        })

    with OUT_PATH.open("w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print(f"[write] {OUT_PATH} with {len(out['matches'])} matches.")


if __name__ == "__main__":
    scrape()
