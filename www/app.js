let destinationUrlAfterAd = '';

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

document.addEventListener('deviceready', () => {
    logToNative('JS_LOG: Device is ready. Initializing app.');
    initializeApp();
}, false);

async function initializeApp() {
    logToNative('JS_LOG: app.js script loaded and DOMContentLoaded.');
    const playlistSelect = document.getElementById('playlist-select');
    const channelListContainer = document.getElementById('channel-list');
    const languageSelect = document.getElementById('language-select');

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
        } catch (error) {
            logToNative('JS_LOG: Error loading translations:' + error);
        }
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
                const logoMatch = line.match(/tvg-logo="([^"]*)"/);
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
            channelItem.href = "#";

            channelItem.addEventListener('click', (event) => {
                event.preventDefault();
                let streamUrl = channel.url;
                let finalPlayerUrl = `https://chaine-en-live.vercel.app/api/proxy?url=${encodeURIComponent(streamUrl)}`;
                logToNative('JS_LOG: Final player URL constructed:' + finalPlayerUrl);
                const destinationUrl = `player.html?stream=${encodeURIComponent(finalPlayerUrl)}&playlist=${encodeURIComponent(playlistFile)}`;
                destinationUrlAfterAd = destinationUrl;
                logToNative('JS_LOG: Channel click detected. Destination URL stored:' + destinationUrlAfterAd);
                if (window.Android && typeof window.Android.showInterstitialAd === 'function') {
                    logToNative('JS_LOG: window.Android.showInterstitialAd is available. Calling native ad.');
                    window.Android.showInterstitialAd();
                } else {
                    logToNative('JS_LOG: window.Android.showInterstitialAd NOT available. Navigating directly.');
                    window.location.href = destinationUrl;
                }
            });

            if (playlistFile === 'dazn.m3u' || playlistFile === 'bein.m3u' || playlistFile === 'sport-espn.m3u' || playlistFile === 'bein_sports_arabic.m3u' || playlistFile === 'bein_sports_other_languages.m3u' || playlistFile === 'bein_sports_turkish.m3u' || playlistFile === 'dazn_channels.m3u') {
                channelItem.className = 'channel-item-image';
                let imagePath = channel.logo;
                // ... (rest of your image path logic)
                const logo = document.createElement('img');
                logo.src = imagePath;
                logo.alt = channel.name;
                logo.className = 'channel-logo';
                logo.onerror = () => { logo.src = 'https://via.placeholder.com/60?text=N/A'; };
                channelItem.appendChild(logo);
            } else {
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

    const { Filesystem, Directory, Encoding } = Capacitor.Plugins;

    function showStatus(message, isError = false) {
        channelListContainer.innerHTML = `<p class="${isError ? 'error-message' : 'status-message'}">${message}</p>`;
    }

    async function managePlaylist(playlistFile) {
        logToNative(`JS_LOG: Managing playlist: ${playlistFile}`);
        if (playlistFile === 'matches_today.json') {
            window.location.href = 'matches.html';
            return;
        }

        const remoteUrl = `https://raw.githubusercontent.com/amouradore/chaine-en-live/main/www/${playlistFile}`; 
        const localPath = `playlists/${playlistFile}`;

        try {
            const localData = await Filesystem.readFile({
                path: localPath,
                directory: Directory.Data,
                encoding: Encoding.UTF8
            });
            logToNative(`JS_LOG: Local playlist found: ${playlistFile}`);
            const channels = parseM3U(localData.data);
            displayChannels(channels, playlistFile);
            updatePlaylistInBackground(playlistFile, remoteUrl, localPath, localData.data);
        } catch (e) {
            logToNative(`JS_LOG: Local playlist not found. Downloading: ${playlistFile}`);
            showStatus(translations.updating_channels || 'Mise à jour des chaînes...');
            try {
                const response = await fetch(remoteUrl);
                if (!response.ok) throw new Error(`Network error! Status: ${response.status}`);
                const remoteContent = await response.text();
                await Filesystem.writeFile({
                    path: localPath,
                    data: remoteContent,
                    directory: Directory.Data,
                    encoding: Encoding.UTF8,
                    recursive: true
                });
                logToNative(`JS_LOG: Playlist downloaded and cached: ${playlistFile}`);
                const channels = parseM3U(remoteContent);
                displayChannels(channels, playlistFile);
            } catch (downloadError) {
                logToNative(`JS_LOG: Failed to download playlist: ${downloadError}`);
                showStatus(translations.load_error || 'Impossible de charger les données. Vérifiez votre connexion.', true);
            }
        }
    }

    async function updatePlaylistInBackground(playlistFile, remoteUrl, localPath, localContent) {
        logToNative(`JS_LOG: Checking for updates in background: ${playlistFile}`);
        try {
            const response = await fetch(remoteUrl);
            if (!response.ok) throw new Error(`Network error! Status: ${response.status}`);
            const remoteContent = await response.text();
            if (remoteContent.trim() !== localContent.trim()) {
                logToNative(`JS_LOG: New content found. Updating local cache: ${playlistFile}`);
                await Filesystem.writeFile({
                    path: localPath,
                    data: remoteContent,
                    directory: Directory.Data,
                    encoding: Encoding.UTF8,
                    recursive: true
                });
            } else {
                logToNative(`JS_LOG: Playlist is up to date: ${playlistFile}`);
            }
        } catch (updateError) {
            logToNative(`JS_LOG: Could not update playlist in background: ${updateError}`);
        }
    }

    playlistSelect.addEventListener('change', (e) => {
        const selectedValue = e.target.value;
        managePlaylist(selectedValue);
        localStorage.setItem('lastPlaylist', selectedValue);
    });

    await setLanguage(localStorage.getItem('language') || 'ar');

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('showchannels')) {
        const lastPlaylist = localStorage.getItem('lastPlaylist') || playlistSelect.value;
        playlistSelect.value = lastPlaylist;
        managePlaylist(lastPlaylist);
    } else {
        managePlaylist(playlistSelect.value);
    }
}