const cors_proxy = require('cors-anywhere');

const proxyServer = cors_proxy.createServer({
    originWhitelist: [], 
    requireHeader: [],   
    removeHeaders: ['cookie', 'cookie2', 'x-request-user-agent', 'x-cosmetic-meta'],
    redirectSameOrigin: true
});

module.exports = (req, res) => {
    // Vercel kadang menyembunyikan URL asli di req.headers['x-forwarded-url'] atau req.url
    const originalUrl = req.headers['x-forwarded-url'] || req.url;
    
    // Cari letak mulainya protokol http/https
    const httpIndex = originalUrl.indexOf('http');
    
    if (httpIndex === -1) {
        res.status(200).send("CORS Anywhere Singapore Serverless Ready! Silakan tempel URL setelah domain.");
        return;
    }

    // Ambil link target murni (misal: https://rcg-bks400...)
    const targetUrl = originalUrl.substring(httpIndex);

    // Rekonstruksi request untuk cors-anywhere
    req.url = '/' + targetUrl;

    // Suntik header wajib internal agar lolos validasi
    req.headers.origin = req.headers.origin || 'https://localhost';
    req.headers['x-requested-with'] = req.headers['x-requested-with'] || 'XMLHttpRequest';

    // Eksekusi proxy
    proxyServer.emit('request', req, res);
};
