const cors_proxy = require('cors-anywhere');

// Inisialisasi proxy serverless
const proxyServer = cors_proxy.createServer({
    originWhitelist: [], // Izinkan semua domain
    requireHeader: [],   // KOSONGKAN agar tidak wajib mengirim header origin/x-requested-with
    removeHeaders: ['cookie', 'cookie2', 'x-request-user-agent', 'x-cosmetic-meta'],
    redirectSameOrigin: true
});

module.exports = (req, res) => {
    // 1. Ambil URL target asli dari query/request path secara bersih
    // Menghapus tanda '/' di paling depan agar menyisakan 'https://...' secara utuh
    const targetUrl = req.url.startsWith('/') ? req.url.slice(1) : req.url;

    // Jika kosong atau tidak valid, kembalikan teks bantuan bawaan
    if (!targetUrl || !targetUrl.startsWith('http')) {
        res.status(200).send("CORS Anywhere Serverless is running. Please append the target URL.");
        return;
    }

    // 2. Suntik header manipulasi agar lolos pengecekan internal cors-anywhere
    req.headers.origin = req.headers.origin || 'https://localhost';
    req.headers['x-requested-with'] = req.headers['x-requested-with'] || 'XMLHttpRequest';

    // 3. Set ulang req.url menjadi path target murni yang diinginkan cors-anywhere
    req.url = '/' + targetUrl;

    // Jalankan proxy
    proxyServer.emit('request', req, res);
};
