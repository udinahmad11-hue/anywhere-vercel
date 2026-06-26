const cors_proxy = require('cors-anywhere');
const http = require('http');

// Inisialisasi proxy bawaan
const proxyServer = cors_proxy.createServer({
    originWhitelist: [], 
    requireHeader: [], 
    removeHeaders: ['cookie', 'cookie2', 'x-request-user-agent', 'x-cosmetic-meta'],
    redirectSameOrigin: true
});

module.exports = (req, res) => {
    let targetUrl = req.query.url;

    if (!targetUrl) {
        res.status(200).send("CORS Anywhere Singapore Serverless Aktif!");
        return;
    }

    // Rapikan format protokol jika ada kerusakan akibat parsing gateway
    if (targetUrl.startsWith('https:/') && !targetUrl.startsWith('https://')) {
        targetUrl = targetUrl.replace('https:/', 'https://');
    } else if (targetUrl.startsWith('http:/') && !targetUrl.startsWith('http://')) {
        targetUrl = targetUrl.replace('http:/', 'https://');
    }

    // Identifikasi apakah request ini bertujuan mengambil manifest .mpd utamanya
    const isMpdManifest = req.url.includes('.mpd');

    if (isMpdManifest) {
        // Ekstrak URL Base asli dari domain target streaming (misal: https://rcg-bks400-06.starhubgo.com/.../ )
        const urlObj = new URL(targetUrl);
        const lastSlashIndex = urlObj.href.lastIndexOf('/');
        const originalBasePath = urlObj.href.substring(0, lastSlashIndex + 1);

        // Ambil domain host proxy aktif saat ini secara dinamis (Vercel domain)
        const proxyHost = req.headers.host;
        const proxyProtocol = req.headers['x-forwarded-proto'] || 'https';
        const customProxyPrefix = `${proxyProtocol}://${proxyHost}/api/proxy?url=`;

        // Intercept fungsi res.write dan res.end khusus untuk memodifikasi XML MPD
        const oldWrite = res.write;
        const oldEnd = res.end;
        let responseBuffer = [];

        res.write = function (chunk) {
            responseBuffer.push(chunk);
        };

        res.end = function (chunk) {
            if (chunk) responseBuffer.push(chunk);
            
            let originalBody = Buffer.concat(responseBuffer).toString('utf8');

            // --- TEKNIK MANIPULASI ABSOLUT BROADPEAK MPD ---
            // Cari tag <BaseURL>dash/</BaseURL> dan timpa dengan URL proxy absolut lengkap!
            const newAbsoluteBaseUrl = `${customProxyPrefix}${originalBasePath}dash/`;
            
            if (originalBody.includes('<BaseURL>')) {
                originalBody = originalBody.replace(/<BaseURL>([^<]+)<\/BaseURL>/g, `<BaseURL>${newAbsoluteBaseUrl}</BaseURL>`);
            } else {
                // Jika tidak ada tag BaseURL bawaan, sisipkan tepat di bawah tag <Period>
                originalBody = originalBody.replace('<Period id="1" start="PT0S">', `<Period id="1" start="PT0S">\n    <BaseURL>${newAbsoluteBaseUrl}</BaseURL>`);
            }

            // Kembalikan header panjang konten yang baru setelah dimanipulasi
            res.setHeader('content-length', Buffer.byteLength(originalBody));
            
            // Panggil kembali fungsi response asli untuk mengirimkan XML modifikasi ke player
            oldEnd.call(this, originalBody, 'utf8');
        };
    }

    // Setel ulang konfigurasi routing internal untuk cors-anywhere
    req.url = '/' + targetUrl;
    req.headers.origin = req.headers.origin || 'https://localhost';
    req.headers['x-requested-with'] = req.headers['x-requested-with'] || 'XMLHttpRequest';

    // Jalankan server proxy
    proxyServer.emit('request', req, res);
};
