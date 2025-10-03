const https = require('https');
const { URL } = require('url');
const zlib = require('zlib');

function doProxy(req, res, targetUrlString) {
    // Store the original targetUrlString for resolving relative paths later
    const originalTargetUrlString = targetUrlString;

    // The targetUrlString is used as is

    const protocol = targetUrlString.startsWith('https') ? https : require('http');

    const options = {
        headers: {
            // Spoof a modern browser UA to avoid server blocks
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            // Some origins check Referer/Origin
            'Referer': 'https://chaine-en-live.vercel.app/',
            'Origin': 'https://chaine-en-live.vercel.app',
            // Ensure servers return plain text for playlists when possible
            'Accept': 'application/vnd.apple.mpegurl,application/x-mpegURL,application/octet-stream,text/plain,*/*;q=0.2',
            'Accept-Encoding': 'identity'
        }
    };

    // Forward Range header if present (important for byterange/fMP4 segments)
    if (req.headers && req.headers.range) {
        options.headers.Range = req.headers.range;
    }

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

        const contentType = (proxyRes.headers['content-type'] || '').toLowerCase();
        const contentEncoding = (proxyRes.headers['content-encoding'] || '').toLowerCase();

        // Heuristic to decide if response could be a playlist
        const looksLikePlaylistType =
            contentType.includes('mpegurl') ||
            contentType.includes('m3u8') ||
            contentType.includes('application/octet-stream') ||
            contentType.includes('text/plain');

        // Helper to rewrite all playlist URLs to go through our proxy
        function rewritePlaylist(text) {
            const baseUrlForResolving = new URL(originalTargetUrlString);
            const lines = text.replace(/\r\n/g, '\n').split('\n');
            const rewritten = lines.map((rawLine) => {
                const line = rawLine.trim();
                if (!line) return line;

                // 1) Non-comment lines are segment/playlist URLs -> rewrite
                if (!line.startsWith('#')) {
                    if (line.includes('/api/proxy?url=')) return line; // already rewritten
                    const absoluteUrl = new URL(line, baseUrlForResolving).href;
                    return `/api/proxy?url=${encodeURIComponent(absoluteUrl)}`;
                }

                // 2) Tags that contain URI attributes (KEY, MAP, MEDIA, I-FRAME-STREAM-INF, etc.)
                if (/#EXT-X-(?:KEY|MAP|MEDIA|I-FRAME-STREAM-INF|SESSION-DATA|SESSION-KEY|STREAM-INF)/.test(line) && line.includes('URI=')) {
                    return line.replace(/URI=("([^"]+)"|'([^']+)')/g, (_m, _g, doubleQuoted, singleQuoted) => {
                        const quoted = doubleQuoted !== undefined ? doubleQuoted : singleQuoted;
                        try {
                            const absolute = new URL(quoted, baseUrlForResolving).href;
                            return `URI="/api/proxy?url=${encodeURIComponent(absolute)}"`;
                        } catch {
                            return _m; // leave unchanged on failure
                        }
                    });
                }

                return line;
            }).join('\n');
            return rewritten;
        }

        if (looksLikePlaylistType) {
            const chunks = [];
            proxyRes.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
            proxyRes.on('end', () => {
                const buffer = Buffer.concat(chunks);

                const finalize = (maybeBuffer) => {
                    let text;
                    try {
                        text = maybeBuffer.toString('utf8');
                    } catch {
                        // Fallback
                        text = buffer.toString('utf8');
                    }

                    // Verify it is a playlist; if not, just pass through original body
                    if (!text.includes('#EXTM3U')) {
                        res.writeHead(proxyRes.statusCode, {
                            ...proxyRes.headers,
                            'Cache-Control': 'no-cache, no-store, must-revalidate',
                            'Pragma': 'no-cache',
                            'Expires': '0'
                        });
                        res.end(buffer);
                        return;
                    }

                    const rewritten = rewritePlaylist(text);
                    res.writeHead(200, {
                        'Content-Type': 'application/vnd.apple.mpegurl',
                        'Access-Control-Allow-Origin': '*',
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                    });
                    res.end(rewritten);
                };

                if (contentEncoding.includes('gzip')) {
                    zlib.gunzip(buffer, (err, decompressed) => {
                        if (err) {
                            finalize(buffer);
                        } else {
                            finalize(decompressed);
                        }
                    });
                } else if (contentEncoding.includes('br')) {
                    zlib.brotliDecompress(buffer, (err, decompressed) => {
                        if (err) {
                            finalize(buffer);
                        } else {
                            finalize(decompressed);
                        }
                    });
                } else if (contentEncoding.includes('deflate')) {
                    zlib.inflate(buffer, (err, decompressed) => {
                        if (err) {
                            finalize(buffer);
                        } else {
                            finalize(decompressed);
                        }
                    });
                } else {
                    finalize(buffer);
                }
            });
        } else {
            res.writeHead(proxyRes.statusCode, {
                ...proxyRes.headers,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
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
