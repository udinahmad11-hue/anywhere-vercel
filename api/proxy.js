const cors_proxy = require('cors-anywhere');

const proxyServer = cors_proxy.createServer({
    originWhitelist: [], 
    requireHeader: [],   
    removeHeaders: ['cookie', 'cookie2', 'x-request-user-agent', 'x-cosmetic-meta'],
    redirectSameOrigin: true
});

module.exports = (req, res) => {
    // 1. Ambil URL mentah dari request (Contoh: /https://mh-bks400-06.starhubgo.com/...)
    const rawUrl = req.url;

    // 2. Cari posisi di mana teks "http" dimulai
    const httpIndex = rawUrl.indexOf('http');

    if (httpIndex === -1) {
        res.status(200).send("CORS Anywhere Singapore Serverless Ready! Silakan tempel URL setelah domain.");
        return;
    }

    // 3. Potong string untuk mendapatkan URL target murni yang utuh beserta parameternya
    const targetUrl = rawUrl.substring(httpIndex);

    // 4. Rekonstruksi untuk kebutuhan internal cors-anywhere
    req.url = '/' + targetUrl;

    // 5. Suntik header penengah agar lolos filter internal
    req.headers.origin = req.headers.origin || 'https://localhost';
    req.headers['x-requested-with'] = req.headers['x-requested-with'] || 'XMLHttpRequest';

    // Jalankan proxy
    proxyServer.emit('request', req, res);
};
