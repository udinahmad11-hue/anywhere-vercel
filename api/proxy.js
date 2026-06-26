const cors_proxy = require('cors-anywhere');

const proxyServer = cors_proxy.createServer({
    originWhitelist: [], 
    requireHeader: [],   
    removeHeaders: ['cookie', 'cookie2', 'x-request-user-agent', 'x-cosmetic-meta'],
    redirectSameOrigin: true
});

module.exports = (req, res) => {
    // Ambil semua string URL setelah domain vercel kamu
    const rawUrl = req.url; 
    
    // Cari posisi di mana 'http' atau 'https' dimulai
    const httpIndex = rawUrl.indexOf('http');
    
    if (httpIndex === -1) {
        res.status(200).send("CORS Anywhere Serverless Aktif di Singapore! Silakan tempel URL target di belakang domain.");
        return;
    }

    // Potong URL sehingga menyisakan target murni (misal: https://rcg-bks400...)
    const targetUrl = rawUrl.substring(httpIndex);

    // Setel kembali request URL untuk kebutuhan internal cors-anywhere
    req.url = '/' + targetUrl;

    // Suntik header penengah agar tidak kena blokir filter internal
    req.headers.origin = req.headers.origin || 'https://localhost';
    req.headers['x-requested-with'] = req.headers['x-requested-with'] || 'XMLHttpRequest';

    // Jalankan proxy
    proxyServer.emit('request', req, res);
};
