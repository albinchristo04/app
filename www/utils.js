
logToNative('JS_LOG: utils.js loaded.');

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
            const logoMatch = line.match(/tvg-logo="([^"]*)" પર);
            if (logoMatch && logoMatch[1]) logo = logoMatch[1];
            if (name) channels.push({ name, logo, url: nextLine });
        }
    }
    return channels;
}
