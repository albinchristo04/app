function logToNative(message) {
    if (window.Android && typeof window.Android.log === 'function') {
        window.Android.log(message);
    } else {
        console.log(message);
    }
}

document.addEventListener('DOMContentLoaded', function () {
    logToNative('JS_LOG: matches.js script loaded and DOMContentLoaded.');
    const matchesContainer = document.getElementById('matches-container');
    const loadingDiv = document.querySelector('.loading');
    
    // Initialize language functionality
    let currentLanguage = 'ar';
    let translations = {};
    
    async function setLanguage(lang) {
        currentLanguage = lang;
        logToNative('JS_LOG: Setting language to:' + lang);
        try {
            const response = await fetch(`lang/${lang}.json`);
            translations = await response.json();
            logToNative('JS_LOG: Translations loaded:' + JSON.stringify(translations));
            applyTranslations();
            document.documentElement.lang = lang;
            document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
            localStorage.setItem('language', lang);
        } catch (e) {
            console.error("Error loading translations", e);
        }
    }

    function applyTranslations() {
        document.querySelectorAll('[data-translate]').forEach(element => {
            const key = element.getAttribute('data-translate');
            element.textContent = translations[key] || element.textContent;
        });
    }
    
    const languageSelect = document.getElementById('language-select');
    if (languageSelect) {
        languageSelect.addEventListener('change', (e) => {
            setLanguage(e.target.value);
        });
    }
    
    const savedLanguage = localStorage.getItem('language') || 'ar';
    if (languageSelect) languageSelect.value = savedLanguage;
    setLanguage(savedLanguage);

    async function loadMatches() {
        try {
            // New Data Source
            const response = await fetch('https://raw.githubusercontent.com/albinchristo04/ptv/refs/heads/main/events_with_m3u8.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            logToNative('JS_LOG: Fetched match data from new source.');
            
            displayMatches(data);

        } catch (error) {
            logToNative('JS_LOG: Error loading matches:' + error);
            if (loadingDiv) {
                loadingDiv.textContent = `Failed to load matches: ${error.message || error}`;
                loadingDiv.className = 'error';
            }
        }
    }

    function displayMatches(data) {
        if (loadingDiv) {
            loadingDiv.remove();
        }
        matchesContainer.innerHTML = ''; 

        if (!data.events || !data.events.streams) {
            matchesContainer.innerHTML = '<p class="error-message">No events found.</p>';
            return;
        }

        data.events.streams.forEach(category => {
            if (category.streams && category.streams.length > 0) {
                const categoryGroup = document.createElement('div');
                categoryGroup.className = 'competition-group';

                const categoryTitle = document.createElement('h2');
                categoryTitle.className = 'competition-title';
                categoryTitle.textContent = category.category;
                categoryGroup.appendChild(categoryTitle);

                category.streams.forEach(match => {
                    const matchCard = document.createElement('div');
                    matchCard.className = 'match-card';

                    // Format time
                    const matchDate = new Date(match.starts_at * 1000);
                    const displayTime = matchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const displayDate = matchDate.toLocaleDateString();

                    matchCard.innerHTML = `
                        <div class="match-header">
                            <div class="match-time">${displayDate} ${displayTime}</div>
                            <div class="match-status ${match.always_live ? 'LIVE' : ''}">${match.always_live ? 'LIVE' : 'UPCOMING'}</div>
                        </div>
                        <div class="match-content" style="display: flex; align-items: center;">
                            <img src="${match.poster}" alt="${match.name}" class="match-poster" style="width: 100px; height: auto; border-radius: 8px; margin-right: 15px;">
                            <div class="match-info">
                                <div class="match-name" style="font-weight: bold; font-size: 1.1em;">${match.name}</div>
                                <div class="match-category" style="color: #ccc; font-size: 0.9em;">${match.category_name}</div>
                            </div>
                        </div>
                    `;
                    
                    matchCard.style.cursor = 'pointer';
                    matchCard.addEventListener('click', () => {
                        if (match.m3u8_url) {
                            const destinationUrl = `player.html?stream=${encodeURIComponent(match.m3u8_url)}`;
                            
                            if (window.Android && typeof window.Android.showInterstitialAd === 'function') {
                                window.Android.showInterstitialAd();
                                setTimeout(() => {
                                    window.location.href = destinationUrl;
                                }, 500);
                            } else {
                                window.location.href = destinationUrl;
                            }
                        } else {
                            alert('Stream not available');
                        }
                    });

                    categoryGroup.appendChild(matchCard);
                });
                matchesContainer.appendChild(categoryGroup);
            }
        });
    }

    loadMatches();
});