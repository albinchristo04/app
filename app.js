document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENTS ---
    const channelList = document.getElementById('channel-list');
    const sportChannelList = document.getElementById('sport-channel-list');
    const searchInput = document.getElementById('search-input');
    const btnGeneral = document.getElementById('btn-general');
    const btnSport = document.getElementById('btn-sport');

    // --- STATE ---
    let allChannels = [];
    let sportChannels = [];
    let activeList = 'general';

    // --- PARSING LOGIC ---
    const parseM3U = (data) => {
        const lines = data.trim().split('\n');
        const channels = [];
        let currentChannel = {};
        lines.forEach(line => {
            line = line.trim();
            if (line.startsWith('#EXTINF:')) {
                const name = line.split(',').pop();
                if (name) currentChannel.name = name;
            } else if (line.length > 0 && !line.startsWith('#')) {
                if (currentChannel.name) {
                    currentChannel.url = line;
                    channels.push(currentChannel);
                    currentChannel = {};
                }
            }
        });
        return channels;
    };

    // --- DISPLAY LOGIC ---
    const displayChannels = (channels, listElement) => {
        if (!listElement) return;
        listElement.innerHTML = channels.map(channel =>
            `<li data-url="${channel.url}">${channel.name}</li>`
        ).join('');
    };

    // --- PLAYER & ADS LOGIC ---
    const player = videojs('player');

    

    

    const playChannel = (url) => {
        let sourceUrl = url;
        // Only use proxy for absolute URLs (external links)
        if (url.startsWith('http://') || url.startsWith('https://')) {
            sourceUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
        }
        player.src({ src: sourceUrl, type: 'application/x-mpegURL' });
        player.play();
    };

    const handleChannelClick = (e) => {
        if (e.target && e.target.tagName === 'LI') {
            const url = e.target.dataset.url;
            playChannel(url);

            // Deselect from all lists
            document.querySelectorAll('#channel-list li, #sport-channel-list li').forEach(li => li.classList.remove('active'));
            
            // Select in current list
            e.target.classList.add('active');
        }
    };

    channelList.addEventListener('click', handleChannelClick);
    sportChannelList.addEventListener('click', handleChannelClick);


    // --- CATEGORY SWITCH LOGIC ---
    btnGeneral.addEventListener('click', () => {
        activeList = 'general';
        channelList.style.display = 'block';
        sportChannelList.style.display = 'none';
        btnGeneral.classList.add('active');
        btnSport.classList.remove('active');
        displayChannels(allChannels, channelList); // Refresh search
    });

    btnSport.addEventListener('click', () => {
        activeList = 'sport';
        channelList.style.display = 'none';
        sportChannelList.style.display = 'block';
        btnSport.classList.add('active');
        btnGeneral.classList.remove('active');
        displayChannels(sportChannels, sportChannelList); // Refresh search
    });

    // --- SEARCH LOGIC ---
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        if (activeList === 'general') {
            const filteredChannels = allChannels.filter(channel =>
                channel.name.toLowerCase().includes(searchTerm)
            );
            displayChannels(filteredChannels, channelList);
        } else {
            const filteredChannels = sportChannels.filter(channel =>
                channel.name.toLowerCase().includes(searchTerm)
            );
            displayChannels(filteredChannels, sportChannelList);
        }
    });

    // --- INITIALIZATION ---
    const init = async () => {
        try {
            // Fetch general channels
            const generalResponse = await fetch('chaine.m3u8');
            if (!generalResponse.ok) throw new Error(`HTTP error! status: ${generalResponse.status}`);
            const generalM3uData = await generalResponse.text();
            allChannels = parseM3U(generalM3uData);
            displayChannels(allChannels, channelList);

            // Fetch sport channels from All_Sports.m3u
            const sportResponse = await fetch('All_Sports.m3u');
            if (!sportResponse.ok) throw new Error(`HTTP error! status: ${sportResponse.status}`);
            const sportM3uData = await sportResponse.text();
            sportChannels = parseM3U(sportM3uData);
            displayChannels(sportChannels, sportChannelList);


            

            // Check for channel in URL or play default
            const urlParams = new URLSearchParams(window.location.search);
            let channelUrl = urlParams.get('channel');

            if (!channelUrl) {
                const defaultChannel = allChannels.find(c => c.name.trim() === 'BeIN Sport 1 HD');
                if (defaultChannel) {
                    channelUrl = defaultChannel.url;
                }
            }

            if (channelUrl) {
                playChannel(channelUrl);
                // Find active channel in the correct list
                let channelItem = channelList.querySelector(`li[data-url="${channelUrl}"]`);
                if (channelItem) {
                    channelItem.classList.add('active');
                } else {
                    channelItem = sportChannelList.querySelector(`li[data-url="${channelUrl}"]`);
                    if (channelItem) {
                        // Switch to sport tab if deep-linked channel is a sport channel
                        btnSport.click();
                        channelItem.classList.add('active');
                    }
                }
            }

        } catch (error) {
            console.error('Error loading or parsing M3U data:', error);
            if(channelList) channelList.innerHTML = '<li>Erreur de chargement des chaînes.</li>';
        }
    };

    init();
});