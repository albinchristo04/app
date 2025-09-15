// app.js

let hlsInstance; // Global Hls instance

// Function to fetch and parse the M3U8 playlist
async function fetchAndParseM3U8(m3u8Url) {
    try {
        const response = await fetch(`/api/proxy?url=${encodeURIComponent(m3u8Url)}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const m3u8Content = await response.text();
        return parseM3U8(m3u8Content);
    } catch (error) {
        console.error('Error fetching or parsing M3U8:', error);
        const channelListElement = document.getElementById('channel-list');
        if (channelListElement) {
            channelListElement.innerHTML = '<p>Error loading channels. Please try again later.</p>';
        }
        return [];
    }
}

// Function to parse M3U8 content
function parseM3U8(content) {
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
    return channels;
}

// Function to display channels
function displayChannels(channels) {
    const channelListElement = document.getElementById('channel-list');
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
        li.addEventListener('click', () => playChannel(channel.url));
        ul.appendChild(li);
    });
    channelListElement.appendChild(ul);
}

// Function to play a channel
function playChannel(url) {
    const videoElement = document.getElementById('player'); // Changed from videoPlayer to player
    if (!videoElement) {
        console.error('Video element with ID "player" not found.');
        return;
    }

    if (Hls.isSupported()) {
        if (hlsInstance) {
            hlsInstance.destroy(); // Destroy previous Hls instance if exists
        }
        hlsInstance = new Hls();
        hlsInstance.loadSource(url);
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
        // Native HLS support for Safari
        videoElement.src = url;
        videoElement.addEventListener('loadedmetadata', function() {
            videoElement.play();
        });
    } else {
        console.error('Your browser does not support HLS playback.');
    }
}

// Make functions globally accessible for player.html
window.fetchAndParseM3U8 = fetchAndParseM3U8;
window.displayChannels = displayChannels;
window.playChannel = playChannel;