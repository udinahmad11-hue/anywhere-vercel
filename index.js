const cors_proxy = require('cors-anywhere');
const http = require('http');

const port = process.env.PORT || 8000;

// Konfigurasi murni CORS Anywhere
const proxyServer = cors_proxy.createServer({
    originWhitelist: [], 
    requireHeader: [],   // KOSONGKAN agar player IPTV tidak terblokir
    removeHeaders: ['cookie', 'cookie2', 'x-request-user-agent', 'x-cosmetic-meta'],
    redirectSameOrigin: true
});

// Server HTTP penengah untuk menangkap URL asli secara utuh dari browser
const server = http.createServer((req, res) => {
    const rawUrl = req.url;

    // Cari letak mulainya protokol http/https
    const httpIndex = rawUrl.indexOf('http');

    if (httpIndex === -1) {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end("CORS Anywhere Singapore Serverless Ready! Silakan tempel URL setelah domain.");
        return;
    }

    // Ambil URL target murni yang utuh tanpa rekayasa gateway
    const targetUrl = rawUrl.substring(httpIndex);
    req.url = '/' + targetUrl;

    // Suntik header penengah wajib internal
    req.headers.origin = req.headers.origin || 'https://localhost';
    req.headers['x-requested-with'] = req.headers['x-requested-with'] || 'XMLHttpRequest';

    // Jalankan proxy
    proxyServer.emit('request', req, res);
});

// Jalankan server di port yang disediakan Vercel
server.listen(port, () => {
    console.log('CORS Proxy berjalan di port ' + port);
});
