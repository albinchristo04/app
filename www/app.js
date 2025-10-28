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

document.addEventListener('DOMContentLoaded', async () => {
    logToNative('JS_LOG: app.js script loaded and DOMContentLoaded.');
    const playlistSelect = document.getElementById('playlist-select');
    const channelListContainer = document.getElementById('channel-list');
    const languageSelect = document.getElementById('language-select');

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

                logToNative('JS_LOG: Final player URL constructed:' + finalPlayerUrl);

                const destinationUrl = `player.html?stream=${encodeURIComponent(finalPlayerUrl)}&playlist=${encodeURIComponent(playlistFile)}`;
                
                // Ad logic: store destination and call native ad interface
                destinationUrlAfterAd = destinationUrl;
                logToNative('JS_LOG: Channel click detected. Destination URL stored:' + destinationUrlAfterAd);
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

    // =================================================================================
    // NOUVELLE LOGIQUE DE CHARGEMENT DYNAMIQUE DES PLAYLISTS
    // =================================================================================

    const { Filesystem, Directory, Encoding } = Capacitor.Plugins;

    /**
     * Affiche un message d'état ou d'erreur dans le conteneur de la liste des chaînes.
     * @param {string} message - Le message à afficher.
     * @param {boolean} isError - Si vrai, affiche le message en tant qu'erreur.
     */
    function showStatus(message, isError = false) {
        channelListContainer.innerHTML = `<p class="${isError ? 'error-message' : 'status-message'}">${message}</p>`;
    }

    /**
     * Gère le téléchargement, la mise en cache et l'affichage d'une playlist.
     * @param {string} playlistFile - Le nom du fichier de la playlist (ex: 'bein.m3u').
     */
    async function managePlaylist(playlistFile) {
        logToNative(`JS_LOG: managePlaylist called for: ${playlistFile}`);
        logToNative(`JS_LOG: Capacitor.Plugins.Filesystem: ${JSON.stringify(Capacitor.Plugins.Filesystem)}`);
        logToNative(`JS_LOG: Capacitor.Plugins.Filesystem.Directory: ${JSON.stringify(Capacitor.Plugins.Filesystem.Directory)}`);
        if (!Capacitor || !Capacitor.Plugins || !Capacitor.Plugins.Filesystem) {
            logToNative('JS_LOG: Capacitor Filesystem plugin not available!');
            showStatus(translations.load_error || 'Erreur: Plugin de fichiers non disponible.', true);
            return;
        }

        if (playlistFile === 'matches_today.json') {
            window.location.href = 'matches.html';
            return;
        }

        const remoteUrl = `https://raw.githubusercontent.com/amouradore/chaine-en-live/main/www/${playlistFile}`;
        const localPath = `playlists/${playlistFile}`;
        logToNative(`JS_LOG: Remote URL: ${remoteUrl}, Local Path: ${localPath}`);

        try {
            // 1. Essayer de lire la version locale en premier
            logToNative(`JS_LOG: Attempting to read local playlist: ${localPath}`);
            const localData = await Capacitor.Plugins.Filesystem.readFile({
                path: localPath,
                directory: Capacitor.Plugins.Filesystem.Directory.Data,
                encoding: Capacitor.Plugins.Filesystem.Encoding.UTF8
            });
            logToNative(`JS_LOG: Successfully read local playlist ${playlistFile}. Content length: ${localData.data.length}`);
            const channels = parseM3U(localData.data);
            logToNative(`JS_LOG: Parsed ${channels.length} channels from local ${playlistFile}.`);
            displayChannels(channels, playlistFile);
            logToNative(`JS_LOG: Displayed channels from local ${playlistFile}.`);

            // 2. En arrière-plan, vérifier les mises à jour
            logToNative(`JS_LOG: Checking for updates for ${playlistFile} in the background from ${remoteUrl}.`);
            try {
                const response = await fetch(remoteUrl);
                if (!response.ok) throw new Error(`Network response was not ok. Status: ${response.status}`);
                const remoteContent = await response.text();
                logToNative(`JS_LOG: Downloaded remote content for ${playlistFile}. Content length: ${remoteContent.length}`);

                if (remoteContent.trim() !== localData.data.trim()) {
                    logToNative(`JS_LOG: New content found for ${playlistFile}. Updating local cache.`);
                    await Capacitor.Plugins.Filesystem.writeFile({
                        path: localPath,
                        data: remoteContent,
                        directory: Capacitor.Plugins.Filesystem.Directory.Data,
                        encoding: Capacitor.Plugins.Filesystem.Encoding.UTF8,
                        recursive: true // Crée le dossier 'playlists' si nécessaire
                    });
                    logToNative(`JS_LOG: Local cache updated for ${playlistFile}.`);
                } else {
                    logToNative(`JS_LOG: Local playlist ${playlistFile} is already up to date.`);
                }
            } catch (updateError) {
                logToNative(`JS_LOG: Could not check for updates for ${playlistFile}: ${updateError.message || updateError}`);
                // Pas besoin de notifier l'utilisateur, l'app fonctionne avec le cache
            }

        } catch (e) {
            // 3. Le fichier local n'existe pas (ou erreur de lecture), le télécharger
            logToNative(`JS_LOG: Local playlist ${playlistFile} not found or error reading. Attempting to download from remote.`);
            showStatus(translations.updating_channels || 'Mise à jour des chaînes...');

            try {
                const response = await fetch(remoteUrl);
                if (!response.ok) throw new Error(`Network error! Status: ${response.status}`);
                const remoteContent = await response.text();
                logToNative(`JS_LOG: Downloaded remote content for ${playlistFile}. Content length: ${remoteContent.length}`);

                // Sauvegarder pour la prochaine fois
                await Capacitor.Plugins.Filesystem.writeFile({
                    path: localPath,
                    data: remoteContent,
                    directory: Capacitor.Plugins.Filesystem.Directory.Data,
                    encoding: Capacitor.Plugins.Filesystem.Encoding.UTF8,
                    recursive: true
                });
                logToNative(`JS_LOG: Playlist ${playlistFile} downloaded and cached.`);

                // Afficher les chaînes
                const channels = parseM3U(remoteContent);
                logToNative(`JS_LOG: Parsed ${channels.length} channels from remote ${playlistFile}.`);
                displayChannels(channels, playlistFile);
                logToNative(`JS_LOG: Displayed channels from remote ${playlistFile}.`);

            } catch (downloadError) {
                logToNative(`JS_LOG: Failed to download playlist ${playlistFile}: ${downloadError.message || downloadError}`);
                showStatus(translations.load_error || 'Impossible de charger les données. Vérifiez votre connexion.', true);
            }
        }
    }

    const loadPlaylist = managePlaylist;
    


    playlistSelect.addEventListener('change', (e) => {
        const selectedValue = e.target.value;
        loadPlaylist(selectedValue);
        localStorage.setItem('lastPlaylist', selectedValue);
    });
    
    const savedLanguage = localStorage.getItem('language') || 'ar';
    logToNative('JS_LOG: Saved language:' + savedLanguage);
    // Explicitly set language to Arabic to ensure default
    localStorage.setItem('language', 'ar');
    languageSelect.value = 'ar';
    await setLanguage('ar');

    // Load initial playlist only if on channels page (index.html) and not redirecting
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('showchannels')) {
        const lastPlaylist = localStorage.getItem('lastPlaylist') || playlistSelect.value;
        playlistSelect.value = lastPlaylist;
        loadPlaylist(lastPlaylist);
    }
});
