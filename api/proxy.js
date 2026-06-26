const cors_proxy = require('cors-anywhere');

// Inisialisasi proxy
const proxyServer = cors_proxy.createServer({
    originWhitelist: [], 
    requireHeader: [], // Kosongkan agar player IPTV tidak terblokir
    removeHeaders: ['cookie', 'cookie2', 'x-request-user-agent', 'x-cosmetic-meta'],
    redirectSameOrigin: true
});

module.exports = (req, res) => {
    // 1. Ambil URL target langsung dari parameter query '?url='
    let targetUrl = req.query.url;

    if (!targetUrl) {
        res.status(200).send("CORS Anywhere Singapore Serverless Aktif! Cara pakai: /api/proxy?url=HTTPS://LINK-TARGET");
        return;
    }

    // 2. Jika format URL agak rusak (misal double slash hilang akibat browser), rapikan otomatis
    if (targetUrl.startsWith('https:/') && !targetUrl.startsWith('https://')) {
        targetUrl = targetUrl.replace('https:/', 'https://');
    } else if (targetUrl.startsWith('http:/') && !targetUrl.startsWith('http://')) {
        targetUrl = targetUrl.replace('http:/', 'https://');
    }

    // 3. Setel kembali request URL untuk kebutuhan internal cors-anywhere
    req.url = '/' + targetUrl;

    // 4. Suntik header penengah wajib
    req.headers.origin = req.headers.origin || 'https://localhost';
    req.headers['x-requested-with'] = req.headers['x-requested-with'] || 'XMLHttpRequest';

    // Eksekusi proxy
    proxyServer.emit('request', req, res);
};
