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
                
                // Try to find match cards with more flexible selectors
                // First, try common class names that might contain matches
                let allElements = Array.from(document.querySelectorAll('*'));
                
                // Filter elements that might be match containers
                let matchElements = allElements.filter(el => {
                    const classList = el.classList;
                    const id = el.id || '';
                    const text = el.textContent || '';
                    
                    // Look for elements that have match-related indicators
                    return classList.contains('match') || 
                           classList.contains('Match') ||
                           classList.contains('game') ||
                           classList.contains('Game') ||
                           classList.contains('event') ||
                           id.includes('match') ||
                           id.includes('game') ||
                           text.includes('VS') ||
                           text.includes('vs') ||
                           text.includes('-');
                });
                
                // If no elements found with the filter, use the original selectors
                if (matchElements.length === 0) {
                    matchElements = document.querySelectorAll('.AY_Inner');
                    if (matchElements.length === 0) {
                        matchElements = document.querySelectorAll('[class*="Match"]');
                    }
                    if (matchElements.length === 0) {
                        matchElements = document.querySelectorAll('.match-item');
                    }
                    if (matchElements.length === 0) {
                        matchElements = document.querySelectorAll('[id*="match"]');
                    }
                    if (matchElements.length === 0) {
                        // Try to find elements that contain team names or match indicators
                        matchElements = Array.from(document.querySelectorAll('div, li'))
                            .filter(el => {
                                const text = el.textContent.toLowerCase();
                                return text.includes('vs') || text.includes('-') || 
                                       text.includes('match') || text.includes('game');
                            });
                    }
                }
                
                matchElements.forEach((element, idx) => {
                    // Create a generic text extraction function
                    const extractText = (selectorList) => {
                        if (!Array.isArray(selectorList)) selectorList = [selectorList];
                        for (const selector of selectorList) {
                            try {
                                const elements = typeof selector === 'string' ? 
                                    element.querySelectorAll(selector) : 
                                    [element].filter(() => selector(element));
                                
                                if (typeof selector === 'function') {
                                    if (selector(element)) return element.textContent.trim();
                                } else {
                                    for (const el of elements) {
                                        const text = el.textContent.trim();
                                        if (text) return text;
                                    }
                                }
                            } catch (e) {
                                // Skip if selector is invalid
                            }
                        }
                        return '';
                    };
                    
                    const extractImageSrc = (selectorList) => {
                        if (!Array.isArray(selectorList)) selectorList = [selectorList];
                        for (const selector of selectorList) {
                            try {
                                const img = element.querySelector(selector);
                                if (img) {
                                    const src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
                                    if (src) return src;
                                }
                            } catch (e) {
                                // Skip if selector is invalid
                            }
                        }
                        return '';
                    };
                    
                    // Try to find home team - look for first team indicator
                    const home = extractText([
                        '.home-team [class*="name"], .home-team span, .home-team',
                        '[class*="home"] [class*="name"], [class*="home"] span',
                        '[class*="team1"] [class*="name"], [class*="team1"] span',
                        '.team-home [class*="name"], .team-home span',
                        (el) => {
                            // Custom function to check if element likely contains home team
                            const text = el.textContent;
                            const nextSibling = el.nextElementSibling;
                            return text && nextSibling && nextSibling.textContent.includes('VS');
                        }
                    ]);
                    
                    // Try to find away team - look for second team indicator
                    const away = extractText([
                        '.away-team [class*="name"], .away-team span, .away-team',
                        '[class*="away"] [class*="name"], [class*="away"] span',
                        '[class*="team2"] [class*="name"], [class*="team2"] span',
                        '.team-away [class*="name"], .team-away span',
                        (el) => {
                            // Custom function to check if element likely contains away team
                            const text = el.textContent;
                            const prevSibling = el.previousElementSibling;
                            return text && prevSibling && prevSibling.textContent.includes('VS');
                        }
                    ]);
                    
                    // If no home/away found with above selectors, try a different approach
                    if (!home || !away) {
                        // Try to find all team-related elements and take first two
                        const possibleTeams = Array.from(element.querySelectorAll('*'))
                            .filter(el => {
                                const text = el.textContent.trim();
                                // Look for Arabic text which usually indicates team names
                                return text && text.length > 1 && (text.match(/[\u0600-\u06FF]/g) || []).length > 1; // Arabic characters
                            })
                            .map(el => el.textContent.trim())
                            .filter(text => text.length > 1)
                            .slice(0, 2);
                        
                        if (possibleTeams.length >= 2) {
                            possibleTeams[0] = possibleTeams[0].replace(/[\d:,\s]/g, '').trim();
                            possibleTeams[1] = possibleTeams[1].replace(/[\d:,\s]/g, '').trim();
                            
                            if (!home) home = possibleTeams[0];
                            if (!away) away = possibleTeams[1];
                        }
                    }
                    
                    // Extract logos
                    const homeLogo = extractImageSrc([
                        '.home-team img, [class*="home"] img, [class*="team1"] img, .team-home img',
                        'img[src*="team"], img[src*="logo"]'
                    ]);
                    
                    const awayLogo = extractImageSrc([
                        '.away-team img, [class*="away"] img, [class*="team2"] img, .team-away img',
                        'img[src*="team"], img[src*="logo"]'
                    ]);
                    
                    // Extract time
                    const time = extractText([
                        '[class*="time"] span, [class*="time"], .time, .match-time',
                        (el) => {
                            const text = el.textContent;
                            return text.match(/\b\d{1,2}:\d{2}\b/)?.[0] || '';
                        }
                    ]);
                    
                    // Extract other info
                    const result = extractText(['[class*="score"]', '[class*="result"]']);
                    const status = extractText(['[class*="status"]', '[class*="stat"]']);
                    
                    // Extract channel and competition information
                    const textContent = element.textContent;
                    const possibleInfo = Array.from(element.querySelectorAll('*'))
                        .map(el => el.textContent.trim())
                        .filter(text => text.length > 0);
                    
                    let channel = '';
                    let competition = '';
                    
                    // Try to identify channel from text
                    for (const text of possibleInfo) {
                        if (text.includes('beIN') || text.includes('Star') || text.includes('OSN') || 
                            text.includes('Sony') || text.includes('Dubai') || text.includes('Abu') || 
                            text.includes('on ') || text.includes('On ')) {
                            channel = text;
                            break;
                        }
                    }
                    
                    // Try to identify competition
                    for (const text of possibleInfo) {
                        if (text.includes('دوري') || text.includes('كأس') || text.includes('liga') || 
                            text.includes('Premier') || text.includes('Champions') || text.includes('Europa')) {
                            competition = text;
                            break;
                        }
                    }
                    
                    // Fallback: try to extract from the full text content
                    if (!channel) {
                        const channelMatches = textContent.match(/beIN|Star Sports|OSN|Sony|Dubai|Abu Dhabi|on\s[A-Z]/gi);
                        if (channelMatches && channelMatches.length > 0) {
                            channel = channelMatches[0];
                        }
                    }
                    
                    if (!competition) {
                        const compMatches = textContent.match(/دوري|liga|Premier|Champions|Europa|League|Cup/gi);
                        if (compMatches && compMatches.length > 0) {
                            competition = compMatches[0];
                        }
                    }
                    
                    // Only add if we have both home and away teams
                    if (home && away && home !== away) {  // Ensure they're different teams
                        cards.push({
                            home: home.replace(/[\r\n\t]/g, '').trim(),
                            away: away.replace(/[\r\n\t]/g, '').trim(),
                            home_logo: homeLogo,
                            away_logo: awayLogo,
                            time_local: time,
                            result_text: result,
                            status_text: status,
                            channel: channel || 'غير معروف',
                            commentator: 'غير معروف',  // Hard to extract reliably
                            competition: competition || 'غير معروف'
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
