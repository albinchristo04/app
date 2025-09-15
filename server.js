const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = 8080;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.m3u8': 'application/vnd.apple.mpegurl',
    '.json': 'application/json',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
};

const server = http.createServer((req, res) => {
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
    let pathname = parsedUrl.pathname;

    if (pathname === '/proxy') {
        const targetUrlString = parsedUrl.searchParams.get('url');
        if (!targetUrlString) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Proxy error: URL parameter is missing.');
            return;
        }

        const protocol = targetUrlString.startsWith('https') ? https : http;

        const proxyRequest = protocol.get(targetUrlString, (proxyRes) => {
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
                    const base_url = new URL(targetUrlString);
                    const rewrittenPlaylist = body.split('\n').map(line => {
                        line = line.trim();
                        if (line && !line.startsWith('#')) {
                            return new URL(line, base_url).href;
                        }
                        return line;
                    }).join('\n');

                    res.writeHead(200, {
                        'Content-Type': 'application/vnd.apple.mpegurl',
                        'Access-Control-Allow-Origin': '*'
                    });
                    res.end(rewrittenPlaylist);
                });
            } else {
                res.writeHead(proxyRes.statusCode, proxyRes.headers);
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
        
        return;
    }

    // Static file serving logic
    if (pathname === '/') {
        pathname = '/player.html';
    }

    let filePath = path.join(__dirname, pathname);

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                fs.readFile(path.join(__dirname, 'player.html'), (err404, content404) => {
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end(content404, 'utf-8');
                });
            } else {
                res.writeHead(500);
                res.end('Sorry, check with the site admin for error: ' + err.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log('Ouvrez cette URL dans votre navigateur.');
});
