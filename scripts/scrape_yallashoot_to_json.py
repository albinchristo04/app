import os, json, datetime as dt, time
from pathlib import Path
from zoneinfo import ZoneInfo
from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
from googletrans import Translator # New import

BAGHDAD_TZ = ZoneInfo("Asia/Baghdad")
DEFAULT_URL = "https://www.yalla-shoot.info/matches-today/"

REPO_ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = REPO_ROOT / "matches"
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT_PATH = OUT_DIR / "today.json"

translator = Translator() # Initialize translator

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

        js = r"""
            () => {
                const cards = [];
                document.querySelectorAll('.AY_Inner').forEach((inner, idx) => {
                    const root = inner.parentElement || inner;
                    const qText = (sel) => {
                        const el = root.querySelector(sel);
                        return el ? el.textContent.trim() : "";
                    };
                    const qAttr = (sel, attr) => {
                        const el = root.querySelector(sel);
                        if (!el) return "";
                        return el.getAttribute(attr) || el.getAttribute('data-' + attr) || "";
                    };

                    const home = qText('.MT_Team.TM1 .TM_Name');
                    const away = qText('.MT_Team.TM2 .TM_Name');
                    const homeLogo = qAttr('.MT_Team.TM1 .TM_Logo img', 'src') || qAttr('.MT_Team.TM1 .TM_Logo img', 'data-src');
                    const awayLogo = qAttr('.MT_Team.TM2 .TM_Logo img', 'src') || qAttr('.MT_Team.TM2 .TM_Logo img', 'data-src');
                    const time = qText('.MT_Data .MT_Time');
                    const result = qText('.MT_Data .MT_Result');
                    const status = qText('.MT_Data .MT_Stat');
                    const infoLis = Array.from(root.querySelectorAll('.MT_Info li span')).map(x => x.textContent.trim());
                    const channel = infoLis[0] || "";
                    const commentator = infoLis[1] || "";
                    const competition = infoLis[2] || "";

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
        # Translate fields from Arabic to English
        translated_home = translator.translate(c["home"], src='ar', dest='en').text
        translated_away = translator.translate(c["away"], src='ar', dest='en').text
        translated_competition = translator.translate(c["competition"], src='ar', dest='en').text
        translated_status_text = translator.translate(c["status_text"], src='ar', dest='en').text
        translated_result_text = translator.translate(c["result_text"], src='ar', dest='en').text # Translate result text too

        mid = f"{translated_home[:12]}-{translated_away[:12]}-{today}".replace(" ", "")
        out["matches"].append({
            "id": mid,
            "home": translated_home,
            "away": translated_away,
            "home_logo": c["home_logo"],
            "away_logo": c["away_logo"],
            "time_baghdad": c["time_local"],
            "status": normalize_status(c["status_text"]), # Keep original status for normalization
            "status_text": translated_status_text,
            "result_text": translated_result_text,
            "channel": c["channel"] or None,
            "commentator": c["commentator"] or None,
            "competition": translated_competition,
            "_source": "yalla1shoot_translated" # Indicate translated source
        })

    with OUT_PATH.open("w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print(f"[write] {OUT_PATH} with {len(out['matches'])} matches.")


if __name__ == "__main__":
    scrape()