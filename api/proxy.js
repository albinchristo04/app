const https = require('https');
const { URL } = require('url');

function doProxy(req, res, targetUrlString) {
    // Store the original targetUrlString for resolving relative paths later
    const originalTargetUrlString = targetUrlString;

    // The targetUrlString is used as is

    const protocol = targetUrlString.startsWith('https') ? https : require('http');

    const options = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Referer': 'https://chaine-en-live.vercel.app/',
            'Authorization': 'Basic YW5jaGFycmllcmUxOkRhSm1tNUd2dVk='
        }
    };

    const proxyRequest = protocol.get(targetUrlString, options, (proxyRes) => {
        if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
            const redirectUrl = new URL(proxyRes.headers.location, targetUrlString).href;
            doProxy(req, res, redirectUrl);
            return;
        }

        if (proxyRes.statusCode !== 200) {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res, { end: true });
            return;
        }

        const contentType = proxyRes.headers['content-type'] || '';
        if (contentType.includes('application/vnd.apple.mpegurl') || contentType.includes('application/x-mpegurl')) {
            let body = '';
            proxyRes.on('data', chunk => body += chunk);
            proxyRes.on('end', () => {
                const base_url_for_resolving = new URL(originalTargetUrlString); // Use the original URL for resolving relative paths
                const rewrittenPlaylist = body.split('\n').map(line => {
                    line = line.trim();
                    // Rewrite stream URLs (lines that are not comments)
                    if (line && !line.startsWith('#')) {
                        let absoluteUrl = new URL(line, base_url_for_resolving).href;
                        // The absoluteUrl is used as is
                        return `/api/proxy?url=${encodeURIComponent(absoluteUrl)}`;
                    }
                    // Rewrite URI attributes in #EXT-X-STREAM-INF lines
                    if (line.startsWith('#EXT-X-STREAM-INF') && line.includes('URI="')) {
                        return line.replace(/URI="(http:\/\/[^\"]+)"/, (match, p1) => {
                            let uri = p1;
                            // The uri is used as is
                            return `URI=\"/api/proxy?url=${encodeURIComponent(uri)}\"`;
                        });
                    }
                    return line;
                }).join('\n');

                res.writeHead(200, {
                    'Content-Type': 'application/vnd.apple.mpegurl',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'no-cache, no-store, must-revalidate', // Add cache control
                    'Pragma': 'no-cache',
                    'Expires': '0'
                });
                res.end(rewrittenPlaylist);
            });
        } else {
            res.writeHead(proxyRes.statusCode, {
                ...proxyRes.headers,
                'Cache-Control': 'no-cache, no-store, must-revalidate', // Add cache control
                'Pragma': 'no-cache',
                'Expires': '0'
            });
            proxyRes.pipe(res, { end: true });
        }
    });

    proxyRequest.on('error', (err) => {
        console.error('Proxy request error:', err);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Proxy error: ${err.message}`);
    });

    req.on('close', () => {
        proxyRequest.destroy();
    });
}

export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Request-Method', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
    res.setHeader('Access-Control-Allow-Headers', '*');
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const targetUrlString = parsedUrl.searchParams.get('url');

    if (!targetUrlString) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Proxy error: URL parameter is missing.');
        return;
    }

    doProxy(req, res, targetUrlString);
}
