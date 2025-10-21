let destinationUrlAfterAd = '';

function navigateAfterAd() {
    console.log('JS_LOG: navigateAfterAd called, navigating to:', destinationUrlAfterAd);
    if (destinationUrlAfterAd) {
        window.location.href = destinationUrlAfterAd;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const playlistSelect = document.getElementById('playlist-select');
    const channelListContainer = document.getElementById('channel-list');
    const languageSelect = document.getElementById('language-select');

    let currentLanguage = 'ar';
    let translations = {};

    async function setLanguage(lang) {
        currentLanguage = lang;
        console.log('JS_LOG: Setting language to:', lang);
        const response = await fetch(`lang/${lang}.json`);
        translations = await response.json();
        console.log('JS_LOG: Translations loaded:', translations);
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

    languageSelect.addEventListener('change', (e) => {
        setLanguage(e.target.value);
    });

    // --- Logique de l'application ---

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
                const logoMatch = line.match(/tvg-logo="([^"\"]*)"/);
                if (logoMatch && logoMatch[1]) logo = logoMatch[1];
                if (name) channels.push({ name, logo, url: nextLine });
            }
        }
        return channels;
    }

    function displayChannels(channels, playlistFile) {
        channelListContainer.innerHTML = '';
        if (channels.length === 0) {
            channelListContainer.innerHTML = `<p class="error-message">${translations.no_channels || 'Aucune chaîne trouvée...'}</p>`;
            return;
        }

        channels.forEach(channel => {
            const channelItem = document.createElement('a');
            channelItem.title = channel.name;
            channelItem.href = "#"; // Prevent default navigation and provide a fallback

            channelItem.addEventListener('click', (event) => {
                event.preventDefault();

                let streamUrl = channel.url;
                let finalPlayerUrl;

                if (playlistFile === 'lista.m3u') {
                    const aceIdMatch = streamUrl.match(/id=([a-f0-9]{40})/);
                    if (aceIdMatch && aceIdMatch[1]) {
                        const contentId = aceIdMatch[1];
                        finalPlayerUrl = `http://127.0.0.1:6878/ace/manifest.m3u8?id=${contentId}`;
                    } else {
                        finalPlayerUrl = `https://chaine-en-live.vercel.app/api/proxy?url=${encodeURIComponent(streamUrl)}`;
                    }
                } else {
                    finalPlayerUrl = `https://chaine-en-live.vercel.app/api/proxy?url=${encodeURIComponent(streamUrl)}`;
                }

                const destinationUrl = `player.html?stream=${encodeURIComponent(finalPlayerUrl)}&playlist=${encodeURIComponent(playlistFile)}`;
                
                // Ad logic: store destination and call native ad interface
                destinationUrlAfterAd = destinationUrl;
                console.log('JS_LOG: Channel click detected. Destination URL stored:', destinationUrlAfterAd);
                if (window.Android && typeof window.Android.showInterstitialAd === 'function') {
                    console.log('JS_LOG: window.Android.showInterstitialAd is available. Calling native ad.');
                    window.Android.showInterstitialAd();
                } else {
                    console.log('JS_LOG: window.Android.showInterstitialAd NOT available. Navigating directly.');
                    window.location.href = destinationUrl;
                }
            });

            if (playlistFile === 'dazn.m3u' || playlistFile === 'bein.m3u' || playlistFile === 'sport-espn.m3u' || playlistFile === 'bein_sports_arabic.m3u' || playlistFile === 'bein_sports_other_languages.m3u' || playlistFile === 'bein_sports_turkish.m3u' || playlistFile === 'dazn_channels.m3u') {
                channelItem.className = 'channel-item-image';
                
                let imagePath = channel.logo;
                
                if (playlistFile === 'dazn.m3u') {
                    if (channel.name.toLowerCase().includes('dazn 1')) imagePath = 'images/dazn1.png';
                    else if (channel.name.toLowerCase().includes('dazn 2')) imagePath = 'images/dazn2.png';
                    else if (channel.name.toLowerCase().includes('dazn 3')) imagePath = 'images/dazn3.png';
                    else if (channel.name.toLowerCase().includes('dazn 4')) imagePath = 'images/dazn4.png';
                    else if (channel.name.toLowerCase().includes('dazn 5')) imagePath = 'images/dazn5.png';
                    else if (channel.name.toLowerCase().includes('dazn 6')) imagePath = 'images/dazn6.png';
                } else if (playlistFile === 'bein.m3u') {
                    if (channel.name.toLowerCase().includes('bein sports 1')) imagePath = 'images/beinsport1.png';
                    else if (channel.name.toLowerCase().includes('bein sports 2')) imagePath = 'images/beinsports2.png';
                    else if (channel.name.toLowerCase().includes('bein sports 3')) imagePath = 'images/beinsports3.png';
                    else if (channel.name.toLowerCase().includes('bein sports 4')) imagePath = 'images/beinsports4.png';
                    else if (channel.name.toLowerCase().includes('bein sports 5')) imagePath = 'images/beinsports5.png';
                    else if (channel.name.toLowerCase().includes('bein sports 6')) imagePath = 'images/beinsports6.png';
                    else if (channel.name.toLowerCase().includes('bein sports 7')) imagePath = 'images/beinsports7.png';
                    else if (channel.name.toLowerCase().includes('bein sports 8')) imagePath = 'images/beinsports8.png';
                    else if (channel.name.toLowerCase().includes('bein sports 9')) imagePath = 'images/beinsports9.png';
                } else if (playlistFile === 'sport-espn.m3u') {
                    if (channel.name.toLowerCase().includes('espn 2')) imagePath = 'images/ESPN2.png';
                    else if (channel.name.toLowerCase().includes('espn 3')) imagePath = 'images/ESPN3.png';
                    else if (channel.name.toLowerCase().includes('espn 4')) imagePath = 'images/ESPN4.png';
                    else if (channel.name.toLowerCase().includes('espn 6')) imagePath = 'images/ESPN6.png';
                    else if (channel.name.toLowerCase().includes('espn 7')) imagePath = 'images/ESPN7.png';
                    else if (channel.name.toLowerCase().includes('espn')) imagePath = 'images/ESPN1.png';
                }
                
                const logo = document.createElement('img');
                logo.src = imagePath;
                logo.alt = channel.name;
                logo.className = 'channel-logo';
                logo.onerror = () => { logo.src = 'https://via.placeholder.com/60?text=N/A'; };
                channelItem.appendChild(logo);
            }
            else {
                channelItem.className = 'channel-item';
                const logo = document.createElement('img');
                logo.src = channel.logo;
                logo.alt = channel.name;
                logo.className = 'channel-logo';
                logo.onerror = () => { logo.src = 'https://via.placeholder.com/60?text=N/A'; };
                const name = document.createElement('span');
                name.className = 'channel-name';
                name.textContent = channel.name;
                channelItem.appendChild(logo);
                channelItem.appendChild(name);
            }
            channelListContainer.appendChild(channelItem);
        });
    }





    async function loadPlaylist(playlistFile) {
        if (playlistFile === 'matches_today.json') {
            window.location.href = 'matches.html';
            return;
        }

        try {
            const response = await fetch(playlistFile);
            if (!response.ok) throw new Error(`Erreur réseau: Impossible de charger la playlist. Statut: ${response.status}`);
            const m3uContent = await response.text();
            const channels = parseM3U(m3uContent);
            displayChannels(channels, playlistFile);
        } catch (error) {
            console.error('JS_LOG: Erreur chargement playlist ou matchs', error);
            channelListContainer.innerHTML = `<p class="error-message">${translations.load_error || 'Impossible de charger les données.'}</p>`;
        }
    }
    


    playlistSelect.addEventListener('change', (e) => {
        const selectedValue = e.target.value;
        loadPlaylist(selectedValue);
        localStorage.setItem('lastPlaylist', selectedValue);
    });
    
    const lastPlaylist = localStorage.getItem('lastPlaylist');
    console.log('JS_LOG: Saved language:', savedLanguage, 'Saved playlist:', lastPlaylist);
    if (lastPlaylist) {
        playlistSelect.value = lastPlaylist;
    } else {
        const defaultPlaylist = 'bein.m3u';
        playlistSelect.value = defaultPlaylist;
    }

    const savedLanguage = localStorage.getItem('language') || 'ar';
    console.log('JS_LOG: Saved language:', savedLanguage);
    languageSelect.value = savedLanguage;
    await setLanguage(savedLanguage);

    loadPlaylist(playlistSelect.value);
});
