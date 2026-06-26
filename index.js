const cors_proxy = require('cors-anywhere');
const http = require('http');

// Konfigurasi murni CORS Anywhere
const proxyServer = cors_proxy.createServer({
    originWhitelist: [], 
    requireHeader: [],   // KOSONGKAN agar tidak wajib origin/x-requested-with
    removeHeaders: ['cookie', 'cookie2', 'x-request-user-agent', 'x-cosmetic-meta'],
    redirectSameOrigin: true
});

// Server HTTP penengah
const server = http.createServer((req, res) => {
    // 1. Ambil URL asli langsung dari header routing internal Vercel/Gateway
    // Jika tidak ada, pakai req.url bawaan sebagai cadangan
    const fallbackUrl = req.url || '';
    const vercelRoute = req.headers['x-now-route-matches'] || req.headers['x-matched-path'] || '';
    
    // Gabungkan pencarian string untuk mencari link target (http/https)
    const fullSearchString = decodeURIComponent(vercelRoute + '||' + fallbackUrl);
    const httpIndex = fullSearchString.indexOf('http');

    if (httpIndex === -1) {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end("CORS Anywhere Singapore Serverless Ready! Silakan tempel URL setelah domain.");
        return;
    }

    // 2. Potong string untuk mengambil URL target streaming murni yang utuh
    const targetUrl = fullSearchString.substring(httpIndex);
    
    // 3. Setel kembali untuk kebutuhan internal cors-anywhere
    req.url = '/' + targetUrl;

    // 4. Suntik header penengah wajib biar lolos filter internal cors-anywhere
    req.headers.origin = req.headers.origin || 'https://localhost';
    req.headers['x-requested-with'] = req.headers['x-requested-with'] || 'XMLHttpRequest';

    // Eksekusi proxy
    proxyServer.emit('request', req, res);
});

// Ekspor modul serverless untuk Vercel
module.exports = server;

// Jalankan port jika di luar mode produksi
const port = process.env.PORT || 8000;
if (process.env.NODE_ENV !== 'production') {
    server.listen(port);
}
