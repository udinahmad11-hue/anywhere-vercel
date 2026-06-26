const cors_proxy = require('cors-anywhere');

// Inisialisasi proxy dengan mematikan proteksi header bawaan
const proxyServer = cors_proxy.createServer({
    originWhitelist: [], // Kosongkan agar semua origin diizinkan
    requireHeader: [],    // PENTING: Kosongkan ini agar tidak memunculkan halaman "Usage help" di player/browser
    removeHeaders: ['cookie', 'cookie2', 'x-request-user-agent', 'x-cosmetic-meta'],
    redirectSameOrigin: true
});

module.exports = (req, res) => {
    // Jalankan CORS headers dasar untuk penanganan awal
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Ambil URL target dari hasil rewrite query vercel
    let targetUrl = req.query.url;

    if (!targetUrl) {
        res.status(200).send("CORS Proxy Aktif. Gunakan format: /api/proxy/https://domain.com/file.mpd");
        return;
    }

    // Perbaiki hilangnya double-slash jika terpotong oleh gateway pembaca url
    if (targetUrl.startsWith('https:/') && !targetUrl.startsWith('https://')) {
        targetUrl = targetUrl.replace('https:/', 'https://');
    } else if (targetUrl.startsWith('http:/') && !targetUrl.startsWith('http://')) {
        targetUrl = targetUrl.replace('http:/', 'https://');
    }

    // Ambil query string asli (seperti ?bkm-query atau token pendukung) jika ada di req.url bawaan
    const originalUrl = req.url;
    if (originalUrl.includes('?')) {
        const extraQuery = originalUrl.substring(originalUrl.indexOf('?'));
        // Jika targetUrl belum membawa query tersebut, satukan kembali
        if (!targetUrl.includes(extraQuery) && extraQuery !== `?url=${req.query.url}`) {
            // Hindari duplikasi parameter internal vercel (?url=)
            const cleanQuery = extraQuery.replace(`?url=${encodeURIComponent(req.query.url)}`, '').replace(`&url=${encodeURIComponent(req.query.url)}`, '');
            if (cleanQuery && cleanQuery !== '?') {
                targetUrl += cleanQuery;
            }
        }
    }

    // Setel req.url internal murni yang akan dieksekusi oleh cors-anywhere
    req.url = '/' + targetUrl;

    // Suntik header palsu agar engine cors-anywhere menganggap request ini valid dan langsung melemparkan data murninya
    req.headers['origin'] = req.headers['origin'] || 'https://localhost';
    req.headers['x-requested-with'] = req.headers['x-requested-with'] || 'XMLHttpRequest';

    // Oper jalurnya ke server proxy utama
    proxyServer.emit('request', req, res);
};
