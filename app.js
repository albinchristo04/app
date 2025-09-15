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
            sourceUrl = `/proxy?url=${encodeURIComponent(url)}`;
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
        const rai1Url = 'http://kavamz.xyz/live/Sorellagiovanni/bwkMzU31/dda83e75-3b38-4cf5-a9c0-6c5423d667a2.m3u';
        playChannel(rai1Url);
    };

    init();
});