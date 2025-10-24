function logToNative(message) {
    if (window.Android && typeof window.Android.log === 'function') {
        window.Android.log(message);
    } else {
        console.log(message);
    }
}

function navigateAfterAd() {
    logToNative('JS_LOG: navigateAfterAd called, navigating to:' + destinationUrlAfterAd);
    if (destinationUrlAfterAd) {
        window.location.href = destinationUrlAfterAd;
    }
}

document.addEventListener('DOMContentLoaded', function () {
    logToNative('JS_LOG: matches.js script loaded and DOMContentLoaded.');
    const matchesContainer = document.getElementById('matches-container');
    const loadingDiv = document.querySelector('.loading');
    
    // Initialize language functionality similar to app.js
    let currentLanguage = 'ar';
    let translations = {};
    
    async function setLanguage(lang) {
        currentLanguage = lang;
        logToNative('JS_LOG: Setting language to:' + lang);
        const response = await fetch(`lang/${lang}.json`);
        translations = await response.json();
        logToNative('JS_LOG: Translations loaded:' + JSON.stringify(translations));
        applyTranslations();
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        localStorage.setItem('language', lang);
    }

    function applyTranslations() {
        document.querySelectorAll('[data-translate]').forEach(element => {
            const key = element.getAttribute('data-translate');
            element.textContent = translations[key] || element.textContent;
        });
    }
    
    // Set up language selector
    const languageSelect = document.getElementById('language-select');
    if (languageSelect) {
        languageSelect.addEventListener('change', (e) => {
            setLanguage(e.target.value);
        });
    }
    
    // Load saved language or default to Arabic
    const savedLanguage = localStorage.getItem('language') || 'ar';
    logToNative('JS_LOG: Saved language:' + savedLanguage);
    if (languageSelect) languageSelect.value = savedLanguage;
    setLanguage(savedLanguage);

    // Function to transliterate Arabic team names to English
    function transliterateToEnglish(text) {
        const arabicMap = {
            'الزمالك': 'Zamalek', 'الأهلي': 'Al Ahly', 'بيراميدز': 'Pyramids', 'فيوتشر': 'Future',
            'سموحة': 'Smouha', 'البنك الأهلي': 'National Bank', 'طلائع الجيش': 'Tala\'ea El Gaish',
            'فاركو': 'Pharco', 'إنبي': 'Enppi', 'المصري': 'Al Masry', 'الاتحاد السكندري': 'Al Ittihad',
            'سيراميكا كليوباترا': 'Ceramica Cleopatra', 'الإسماعيلي': 'Ismaily', 'الجونة': 'El Gouna',
            'غزل المحلة': 'Ghazl El Mahalla', 'المقاولون العرب': 'Al Mokawloon', 'مصر المقاصة': 'Misr El Makkasa',
            'إيسترن كومباني': 'Eastern Company', 'مانشستر سيتي': 'Manchester City', 'ليفربول': 'Liverpool',
            'تشيلسي': 'Chelsea', 'توتنهام هوتسبير': 'Tottenham Hotspur', 'آرسنال': 'Arsenal',
            'مانشستر يونايتد': 'Manchester United', 'وست هام يونايتد': 'West Ham United',
            'ليستر سيتي': 'Leicester City', 'برايتون وهوف ألبيون': 'Brighton & Hove Albion',
            'وولفرهامبتون واندررز': 'Wolverhampton Wanderers', 'نيوكاسل يونايتد': 'Newcastle United',
            'كريستال بالاس': 'Crystal Palace', 'برينتفورد': 'Brentford', 'أستون فيلا': 'Aston Villa',
            'ساوثهامبتون': 'Southampton', 'إيفرتون': 'Everton', 'ليدز يونايتد': 'Leeds United',
            'بيرنلي': 'Burnley', 'واتفورد': 'Watford', 'نورويتش سيتي': 'Norwich City',
            'ريال مدريد': 'Real Madrid', 'برشلونة': 'Barcelona', 'أتلتيكو مدريد': 'Atletico Madrid',
            'إشبيلية': 'Sevilla', 'ريال بيتيس': 'Real Betis', 'ريال سوسيداد': 'Real Sociedad',
            'فياريال': 'Villarreal', 'أتلتيك بلباو': 'Athletic Bilbao', 'فالنسيا': 'Valencia',
            'أوساسونا': 'Osasuna', 'سيلتا فيغو': 'Celta Vigo', 'رايو فاليكانو': 'Rayo Vallecano',
            'إلتشي': 'Elche', 'إسبانيول': 'Espanyol', 'خيتافي': 'Getafe', 'مايوركا': 'Mallorca',
            'قادش': 'Cadiz', 'غرناطة': 'Granada', 'ليفانتي': 'Levante', 'ألافيس': 'Alaves',
            'ميلان': 'AC Milan', 'إنتر ميلان': 'Inter Milan', 'نابولي': 'Napoli', 'يوفنتوس': 'Juventus',
            'لاتسيو': 'Lazio', 'روما': 'AS Roma', 'فيورنتينا': 'Fiorentina', 'أتالانتا': 'Atalanta',
            'هيلاس فيرونا': 'Hellas Verona', 'ساسولو': 'Sassuolo', 'تورينو': 'Torino', 'أودينيزي': 'Udinese',
            'بولونيا': 'Bologna', 'إمبولي': 'Empoli', 'سامبدوريا': 'Sampdoria', 'سبيزيا': 'Spezia',
            'كالياري': 'Cagliari', 'جنوى': 'Genoa', 'فينيسيا': 'Venezia', 'ساليرنيتانا': 'Salernitana',
            'بايرن ميونخ': 'Bayern Munich', 'بوروسيا دورتموند': 'Borussia Dortmund',
            'باير ليفركوزن': 'Bayer Leverkusen', 'لايبزيغ': 'RB Leipzig',
            'يونيون برلين': 'Union Berlin', 'فرايبورغ': 'Freiburg', 'كولن': 'FC Koln',
            'هوفنهايم': 'Hoffenheim', 'ماينتس': 'Mainz 05', 'بوروسيا مونشنغلادباخ': 'Borussia Monchengladbach',
            'بوخوم': 'VfL Bochum', 'فولفسبورغ': 'VfL Wolfsburg', 'أوغسبورغ': 'FC Augsburg',
            'شتوتغارت': 'VfB Stuttgart', 'هرتا برلين': 'Hertha BSC', 'أرمينيا بيليفيلد': 'Arminia Bielefeld',
            'غرويتر فورت': 'Greuther Furth', 'باريس سان جيرمان': 'Paris Saint-Germain',
            'مارسيليا': 'Olympique Marseille', 'موناكو': 'AS Monaco', 'نيس': 'OGC Nice',
            'رين': 'Stade Rennais', 'ستراسبورغ': 'RC Strasbourg', 'لانس': 'RC Lens',
            'ليون': 'Olympique Lyonnais', 'ليل': 'Lille OSC', 'نانت': 'FC Nantes',
            'بريست': 'Stade Brestois', 'مونبلييه': 'Montpellier HSC', 'ريمس': 'Stade de Reims',
            'تروا': 'Troyes AC', 'لوريان': 'FC Lorient', 'أنجيه': 'Angers SCO',
            'كليرمون فوت': 'Clermont Foot', 'سانت إتيان': 'AS Saint-Etienne', 'ميتز': 'FC Metz',
            'بوردو': 'Girondins de Bordeaux'
        };
        return arabicMap[text] || text;
    }

    // Function to fetch and display matches
    async function loadMatches() {
        try {
            const response = await fetch('https://amouradore.github.io/chaine-en-live/today.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            logToNative('JS_LOG: Fetched match data:' + JSON.stringify(data)); // Debug log

            if (loadingDiv) {
                loadingDiv.remove();
            }

            const lang = localStorage.getItem('language') || 'ar';

            const groupedMatches = data.matches.reduce((acc, match) => {
                const competition = match.competition;
                if (!acc[competition]) {
                    acc[competition] = [];
                }
                acc[competition].push(match);
                return acc;
            }, {});
            logToNative('JS_LOG: Grouped matches:' + JSON.stringify(groupedMatches)); // Debug log

            for (const competition in groupedMatches) {
                const competitionGroup = document.createElement('div');
                competitionGroup.className = 'competition-group';

                const competitionTitle = document.createElement('h2');
                competitionTitle.className = 'competition-title';
                competitionTitle.textContent = lang === 'en' ? transliterateToEnglish(competition) : competition;
                competitionGroup.appendChild(competitionTitle);

                groupedMatches[competition].forEach(match => {
                    const matchCard = document.createElement('div');
                    matchCard.className = 'match-card';

                    let homeTeamName = match.home;
                    let awayTeamName = match.away;

                    if (lang === 'en') {
                        homeTeamName = transliterateToEnglish(homeTeamName);
                        awayTeamName = transliterateToEnglish(awayTeamName);
                    }

                    // Function to determine match status based on current time
                    function determineMatchStatus(matchTime, matchOriginalStatus) {
                        // If original status is already "FT" (Finished), return as is
                        if (matchOriginalStatus === 'FT') {
                            return { status: 'FT', status_text: 'إنتهت' };
                        }
                        
                        // Parse the match date and time
                        const [matchDate, matchTimeStr] = [data.date, match.time_baghdad];
                        const [hours, minutes] = matchTimeStr.split(':').map(Number);
                        
                        // Create date object with Baghdad timezone (UTC+3)
                        // Using Baghdad time as per the scraper configuration
                        const matchDateTime = new Date(`${matchDate}T${hours}:${minutes}:00+03:00`);
                        
                        // Get current time
                        const now = new Date();
                        
                        // Calculate time difference in minutes
                        const timeDiff = (now - matchDateTime) / (1000 * 60);
                        
                        // If match time has passed by more than 5 hours, mark as finished
                        if (timeDiff > 300) { // More than 5 hours (300 minutes)
                            return { status: 'FT', status_text: 'إنتهت' };
                        }
                        
                        // If match time is within 3 hours in the past and has a "Not Started" status,
                        // but it's likely finished (maybe 90-120 minutes match + buffer)
                        if (timeDiff > 0 && timeDiff <= 300 && matchOriginalStatus === 'NS') {
                            // Check if we have result information to determine if it's live or finished
                            if (match.result_text && match.result_text !== '0-0' && !match.result_text.includes('-')) {
                                // If result exists and it's not 0-0, and time has passed, it's likely finished
                                return { status: 'FT', status_text: 'إنتهت' };
                            }
                            // For now, if it should have started but no result yet, consider LIVE
                            if (timeDiff <= 120) { // Within 2 hours of match time
                                return { status: 'LIVE', status_text: 'مباشر' };
                            }
                        }
                        
                        // If match time hasn't come yet, mark as not started
                        if (timeDiff < -30) { // More than 30 mins before match
                            return { status: 'NS', status_text: 'لم تبدأ بعد' };
                        }
                        
                        // If we're close to match time (within 30 mins before), consider it may start soon
                        if (timeDiff >= -30 && timeDiff < 0) {
                            return { status: 'NS', status_text: 'سيبدأ قريباً' };
                        }
                        
                        // Default return if none of the above conditions are met
                        return { status: matchOriginalStatus, status_text: match.status_text };
                    }
                    
                    // Determine the current status based on time
                    const currentStatus = determineMatchStatus(match.time_baghdad, match.status);
                    
                    // Safely convert match time to user's local timezone
                    let displayTime;
                    try {
                        const matchDateTime = new Date(`${data.date}T${match.time_baghdad}:00+03:00`);
                        if (!isNaN(matchDateTime)) {
                            displayTime = matchDateTime.toLocaleTimeString(navigator.language, { hour: '2-digit', minute: '2-digit' });
                        } else {
                            displayTime = match.time_baghdad; // Fallback to original time if date is invalid
                        }
                    } catch (e) {
                        displayTime = match.time_baghdad; // Fallback on any other error
                    }

                    matchCard.innerHTML = `
                        <div class="match-header">
                            <div class="match-time">${displayTime}</div>
                            <div class="match-status ${currentStatus.status}">${currentStatus.status_text}</div>
                        </div>
                        <div class="match-teams">
                            <div class="team">
                                <img src="${match.home_logo || 'images/default_logo.png'}" alt="${homeTeamName} logo" class="team-logo" onerror="this.src='images/default_logo.png'">
                                <div class="team-name">${homeTeamName}</div>
                            </div>
                            <div class="vs">VS</div>
                            <div class="team">
                                <img src="${match.away_logo || 'images/default_logo.png'}" alt="${awayTeamName} logo" class="team-logo" onerror="this.src='images/default_logo.png'">
                                <div class="team-name">${awayTeamName}</div>
                            </div>
                        </div>
                        <div class="match-footer">
                            <div class="match-competition">${lang === 'en' ? transliterateToEnglish(competition) : competition}</div>
                            <div class="match-details-bottom">
                                <div class="match-channel">📺 ${match.channel || 'Channel not specified'}</div>
                                ${match.commentator && match.commentator !== 'غير معروف' ? `<div class="match-commentator">🎤 ${match.commentator}</div>` : ''}
                            </div>
                        </div>
                    `;
                    matchCard.style.cursor = 'pointer';
                    // Add click event listener to open the channel stream
                    matchCard.addEventListener('click', async function() {
                        if (match.channel) {
                            const channelStream = await findChannelStream(match.channel);
                            if (channelStream) {
                                // Determine the final player URL based on the stream type, similar to app.js
                                let streamUrl = channelStream.url;
                                let finalPlayerUrl;

                                logToNative('JS_LOG: Original streamUrl from findChannelStream:' + streamUrl);

                                // Check if it's an ace stream URL (contains 'id=' with 40-character hex string)
                                const aceIdMatch = streamUrl.match(/id=([a-f0-9]{40})/);
                                logToNative('JS_LOG: aceIdMatch result:' + aceIdMatch);
                                if (aceIdMatch && aceIdMatch[1]) {
                                    const contentId = aceIdMatch[1];
                                    finalPlayerUrl = `http://127.0.0.1:6878/ace/manifest.m3u8?id=${contentId}`;
                                } else {
                                    logToNative('JS_LOG: Not an ace stream. Applying proxy.');
                                    finalPlayerUrl = `https://chaine-en-live.vercel.app/api/proxy?url=${encodeURIComponent(streamUrl)}`;
                                }

                                logToNative('JS_LOG: Final player URL constructed:' + finalPlayerUrl);

                                const destinationUrl = `player.html?stream=${encodeURIComponent(finalPlayerUrl)}`;
                                
                                // Ad logic: store destination and call native ad interface
                                destinationUrlAfterAd = destinationUrl;
                                logToNative('JS_LOG: Match click detected. Destination URL stored:' + destinationUrlAfterAd);
                                logToNative('JS_LOG: Checking window.Android availability: ' + (!!window.Android) + ', typeof showInterstitialAd: ' + (typeof window.Android.showInterstitialAd));
                                if (window.Android && typeof window.Android.showInterstitialAd === 'function') {
                                    logToNative('JS_LOG: window.Android.showInterstitialAd is available. Calling native ad with delay.');
                                    setTimeout(() => {
                                        window.Android.showInterstitialAd();
                                    }, 500); // Add a small delay to ensure native interface is ready
                                } else {
                                    logToNative('JS_LOG: window.Android.showInterstitialAd NOT available. Navigating directly.');
                                    window.location.href = destinationUrl;
                                }
                            }
                            else {
                                alert(`Channel "${match.channel}" not found in playlists.`);
                            }
                        }
                        else {
                            alert('No channel specified for this match.');
                        }
                    });

                    competitionGroup.appendChild(matchCard);
                });
                matchesContainer.appendChild(competitionGroup);
            }
        } catch (error) {
            logToNative('JS_LOG: Error loading matches:' + error);
            if (loadingDiv) {
                loadingDiv.textContent = `Failed to load matches: ${error.message || error}`;
                loadingDiv.className = 'error';
            }
        }
    }

    // Function to search for a channel in all playlists with intelligent matching
    async function findChannelStream(channelName) {
        const playlists = [
            'bein.m3u', 'bein_sports_arabic.m3u', 'bein_sports_other_languages.m3u',
            'bein_sports_turkish.m3u', 'sport-espn.m3u', 'dazn.m3u', 'dazn_channels.m3u',
            'france-sport.m3u', 'chaine-us.m3u', 'mbc.m3u'
        ];

        // Normalize channel name for robust comparison
        const normalize = (name) => {
            if (!name) return '';
            return name.toLowerCase()
                .replace(/hd|sd|fhd|uhd|4k/g, '') // Remove quality indicators
                .replace(/sports/g, '') // Remove "sports"
                .replace(/[\s\-_]+/g, ' ') // Normalize separators to a single space
                .trim();
        };

        const searchName = normalize(channelName);

        for (const playlist of playlists) {
            try {
                const response = await fetch(playlist);
                if (!response.ok) continue;

                const m3uContent = await response.text();
                const channels = parseM3U(m3uContent);

                for (const channel of channels) {
                    const playlistChannelName = normalize(channel.name);

                    // Check if the playlist channel name includes the search name
                    // e.g., "bein 1" (search) is included in "bein sport 1" (playlist)
                    if (playlistChannelName.includes(searchName)) {
                        return { name: channel.name, url: channel.url, logo: channel.logo };
                    }
                }
            } catch (error) {
                logToNative(`JS_LOG: Error searching in playlist ${playlist}:` + error);
            }
        }

        return null; // Channel not found
    }

    // Copy the parseM3U function from app.js
    function parseM3U(m3uContent) {
        const channels = [];
        const lines = m3uContent.split(/\r\n|\n/);
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('#EXTINF:')) {
                const nextLine = lines[i + 1] ? lines[i + 1].trim() : '';
                if (!nextLine || nextLine.startsWith('#')) continue;
                const commaIndex = line.lastIndexOf(',');
                if (commaIndex === -1) continue;
                const name = line.substring(commaIndex + 1).trim();
                let logo = 'https://via.placeholder.com/60?text=N/A';
                const logoMatch = line.match(/tvg-logo="([^\"]*)"/);
                if (logoMatch && logoMatch[1]) logo = logoMatch[1];
                if (name) channels.push({ name, logo, url: nextLine });
            }
        }
        return channels;
    }

    // Store the original match data to reference for status updates
    let originalMatchesData = null;
    
    // Function to refresh match statuses based on current time
    function refreshMatchStatuses() {
        // Get all match cards
        const matchCards = document.querySelectorAll('.match-card');
        
        // If we have original data, process each match
        if (originalMatchesData) {
            matchCards.forEach((card, index) => {
                const statusElement = card.querySelector('.match-status');
                const timeElement = card.querySelector('.match-time');
                
                if (statusElement && timeElement && originalMatchesData.matches[index]) {
                    const match = originalMatchesData.matches[index];
                    const currentStatus = determineMatchStatus(match.time_baghdad, match.status);
                    
                    // Update the status text and class
                    statusElement.textContent = currentStatus.status_text;
                    // Remove old status classes and add new one
                    const statusClasses = Array.from(statusElement.classList).filter(cls => 
                        cls === 'match-status' || cls === 'NS' || cls === 'FT' || cls === 'LIVE'
                    );
                    statusClasses.forEach(cls => statusElement.classList.remove(cls));
                    statusElement.classList.add(currentStatus.status);
                }
            });
        }
    }
    
    // Refresh match statuses every 5 minutes
    setInterval(refreshMatchStatuses, 5 * 60 * 1000); // 5 minutes
    
    loadMatches();
});