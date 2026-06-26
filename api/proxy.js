const cors_proxy = require('cors-anywhere');

const proxyServer = cors_proxy.createServer({
    originWhitelist: [], 
    requireHeader: [],   
    removeHeaders: ['cookie', 'cookie2', 'x-request-user-agent', 'x-cosmetic-meta'],
    redirectSameOrigin: true
});

module.exports = (req, res) => {
    // 1. Tangkap URL asli dari query parameter Vercel
    let targetUrl = req.query.url;

    if (!targetUrl) {
        res.status(200).send("CORS Anywhere Singapore Serverless Ready! Silakan tempel URL setelah domain.");
        return;
    }

    // Koreksi otomatis jika format URL yang ditangkap agak berantakan akibat rewrites
    // Misalnya jika mendeteksi 'https:/rcg-bks400' (kurang satu garis miring)
    if (targetUrl.startsWith('https:/') && !targetUrl.startsWith('https://')) {
        targetUrl = targetUrl.replace('https:/', 'https://');
    } else if (targetUrl.startsWith('http:/') && !targetUrl.startsWith('http://')) {
        targetUrl = targetUrl.replace('http:/', 'http://');
    }

    // 2. Rekonstruksi request URL internal agar dibaca benar oleh cors-anywhere
    req.url = '/' + targetUrl;

    // 3. Suntik header wajib penengah biar lolos filter internal
    req.headers.origin = req.headers.origin || 'https://localhost';
    req.headers['x-requested-with'] = req.headers['x-requested-with'] || 'XMLHttpRequest';

    // Eksekusi proxy
    proxyServer.emit('request', req, res);
};
