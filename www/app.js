document.addEventListener('DOMContentLoaded', async () => {
    const playlistSelect = document.getElementById('playlist-select');
    const channelListContainer = document.getElementById('channel-list');

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
                const logoMatch = line.match(/tvg-logo="([^"]*)"/
);
                if (logoMatch && logoMatch[1]) logo = logoMatch[1];
                if (name) channels.push({ name, logo, url: nextLine });
            }
        }
        return channels;
    }

    function displayChannels(channels, playlistFile) {
        channelListContainer.innerHTML = '';
        if (channels.length === 0) {
            channelListContainer.innerHTML = '<p class="error-message">Aucune chaîne trouvée...</p>';
            return;
        }

        channels.forEach(channel => {
            const channelItem = document.createElement('a');

            let streamUrl = channel.url;
            if (playlistFile === 'france-sport.m3u') {
                streamUrl = 'https://chaine-en-live.vercel.app/api/proxy?url=' + encodeURIComponent(channel.url);
            }
            const destinationUrl = `player.html?stream=${encodeURIComponent(streamUrl)}&playlist=${encodeURIComponent(playlistFile)}`;
            
            channelItem.href = destinationUrl;
            channelItem.title = channel.name;

            if (playlistFile === 'dazn.m3u' || playlistFile === 'bein.m3u') {
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
                }
                
                const logo = document.createElement('img');
                logo.src = imagePath;
                logo.alt = channel.name;
                logo.onerror = () => { logo.src = channel.logo; };
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
        try {
            const response = await fetch(playlistFile);
            if (!response.ok) throw new Error(`Erreur réseau`);
            const m3uContent = await response.text();
            const channels = parseM3U(m3uContent);
            displayChannels(channels, playlistFile);
        } catch (error) {
            console.error('Erreur chargement playlist', error);
            channelListContainer.innerHTML = `<p class="error-message">Impossible de charger la playlist.</p>`;
        }
    }

    playlistSelect.addEventListener('change', (e) => {
        const selectedValue = e.target.value;
        loadPlaylist(selectedValue);
        localStorage.setItem('lastPlaylist', selectedValue);
    });
    
    const lastPlaylist = localStorage.getItem('lastPlaylist');
    if (lastPlaylist) {
        playlistSelect.value = lastPlaylist;
        loadPlaylist(lastPlaylist);
    } else {
        const defaultPlaylist = 'bein.m3u';
        playlistSelect.value = defaultPlaylist;
        loadPlaylist(defaultPlaylist);
    }
});
