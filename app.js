// app.js

let hlsInstance; // Global Hls instance
let generalChannels = [];
let sportChannels = [];
let currentPlayingChannel = null; // To keep track of the currently playing channel

// Function to fetch and parse the M3U8 playlist
async function fetchAndParseM3U8(m3u8Url) {
    try {
        // Fetch the M3U8 file directly (assuming it's a local file)
        const response = await fetch(m3u8Url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const m3u8Content = await response.text();
        return parseM3U8(m3u8Content, m3u8Url);
    } catch (error) {
        console.error('Error fetching or parsing M3U8:', error);
        // No need to update channelListElement here, as displayChannels will handle it
        return [];
    }
}

// Function to parse M3U8 content
function parseM3U8(content, m3u8Url) {
    const lines = content.split('\n');
    const channels = [];
    let currentChannel = {};

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.startsWith('#EXTINF')) {
            const nameMatch = line.match(/,(.*)$/);
            currentChannel.name = nameMatch ? nameMatch[1].trim() : 'Unknown Channel';
        } else if (line && !line.startsWith('#')) {
            currentChannel.url = line;
            channels.push(currentChannel);
            currentChannel = {}; // Reset for the next channel
        }
    }

    if (m3u8Url === 'All_Sports.m3u') {
        channels.unshift({ name: 'Test Channel (Public)', url: 'https://ireplay.tv/test/blender.m3u8' });
    }

    return channels;
}

// Function to display channels for a given category
function displayChannels(channels, targetElementId) {
    const channelListElement = document.getElementById(targetElementId);
    if (!channelListElement) return;

    channelListElement.innerHTML = ''; // Clear previous list
    if (channels.length === 0) {
        channelListElement.innerHTML = '<p>No channels found.</p>';
        return;
    }

    const ul = document.createElement('ul');
    channels.forEach(channel => {
        const li = document.createElement('li');
        li.textContent = channel.name;
        li.dataset.url = channel.url;
        li.addEventListener('click', () => {
            playChannel(channel.url);
            currentPlayingChannel = channel; // Update currently playing channel
            updateShareLinks(channel.url, channel.name); // Update share links
        });
        ul.appendChild(li);
    });
    channelListElement.appendChild(ul);
}

// Function to play a channel
function playChannel(url) {
    const videoElement = document.getElementById('player');
    if (!videoElement) {
        console.error('Video element with ID "player" not found.');
        return;
    }

    let streamUrl = url;
    if (streamUrl.startsWith('http://')) {
        streamUrl = `/api/proxy?url=${encodeURIComponent(streamUrl)}`;
    }

    if (Hls.isSupported()) {
        if (hlsInstance) {
            hlsInstance.destroy();
        }
        hlsInstance = new Hls();
        hlsInstance.loadSource(streamUrl);
        hlsInstance.attachMedia(videoElement);
        hlsInstance.on(Hls.Events.MANIFEST_PARSED, function() {
            videoElement.play();
        });
        hlsInstance.on(Hls.Events.ERROR, function (event, data) {
            if (data.fatal) {
                switch (data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        console.error('Fatal network error, trying to reload stream.');
                        hlsInstance.startLoad();
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        console.error('Fatal media error, trying to recover.');
                        hlsInstance.recoverMediaError();
                        break;
                    default:
                        console.error('Fatal unhandled error, destroying Hls.js.');
                        hlsInstance.destroy();
                        break;
                }
            }
        });
    } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
        videoElement.src = streamUrl;
        videoElement.addEventListener('loadedmetadata', function() {
            videoElement.play();
        });
    } else {
        console.error('Your browser does not support HLS playback.');
    }
}

// Function to switch between categories
function switchCategory(category) {
    const generalList = document.getElementById('channel-list');
    const sportList = document.getElementById('sport-channel-list');
    const btnGeneral = document.getElementById('btn-general');
    const btnSport = document.getElementById('btn-sport');

    if (category === 'general') {
        generalList.style.display = 'block';
        sportList.style.display = 'none';
        btnGeneral.classList.add('active');
        btnSport.classList.remove('active');
        if (generalChannels.length > 0 && (!currentPlayingChannel || !generalChannels.some(c => c.url === currentPlayingChannel.url))) {
            playChannel(generalChannels[0].url);
            currentPlayingChannel = generalChannels[0];
            updateShareLinks(generalChannels[0].url, generalChannels[0].name);
        }
    } else if (category === 'sport') {
        generalList.style.display = 'none';
        sportList.style.display = 'block';
        btnGeneral.classList.remove('active');
        btnSport.classList.add('active');
        if (sportChannels.length > 0 && (!currentPlayingChannel || !sportChannels.some(c => c.url === currentPlayingChannel.url))) {
            playChannel(sportChannels[0].url);
            currentPlayingChannel = sportChannels[0];
            updateShareLinks(sportChannels[0].url, sportChannels[0].name);
        }
    }
}

// Make functions globally accessible for player.html
window.fetchAndParseM3U8 = fetchAndParseM3U8;
window.displayChannels = displayChannels;
window.playChannel = playChannel;
window.generalChannels = generalChannels; // Expose for initial load in player.html
window.sportChannels = sportChannels;     // Expose for initial load in player.html
window.switchCategory = switchCategory;   // Expose for category buttons
window.currentPlayingChannel = currentPlayingChannel; // Expose for initial load in player.html

