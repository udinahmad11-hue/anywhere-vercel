const cors_proxy = require('cors-anywhere');

// Inisialisasi proxy serverless
const proxyServer = cors_proxy.createServer({
    originWhitelist: [], // Izinkan semua domain
    requireHeader: [],   // KOSONGKAN agar player IPTV tidak terblokir
    removeHeaders: ['cookie', 'cookie2', 'x-request-user-agent', 'x-cosmetic-meta'],
    redirectSameOrigin: true
});

module.exports = (req, res) => {
    // Trik memanipulasi header request bawaan player/aplikasi agar lolos internal cors-anywhere
    if (!req.headers.origin) {
        req.headers.origin = 'https://localhost';
    }
    if (!req.headers['x-requested-with']) {
        req.headers['x-requested-with'] = 'XMLHttpRequest';
    }

    // Hilangkan prefix /api/proxy dari URL jika ada agar url target terbaca bersih
    req.url = req.url.replace(/^\/api\/proxy/, '');

    // Jalankan proxy
    proxyServer.emit('request', req, res);
};
