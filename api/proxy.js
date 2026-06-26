const cors_proxy = require('cors-anywhere');

const proxyServer = cors_proxy.createServer({
    originWhitelist: [], 
    requireHeader: [], 
    removeHeaders: ['cookie', 'cookie2', 'x-request-user-agent', 'x-cosmetic-meta'],
    redirectSameOrigin: true
});

module.exports = (req, res) => {
    // 1. Tangkap URL target dari hasil rewrite vercel.json
    let targetUrl = req.query.url;

    if (!targetUrl) {
        res.status(200).send("CORS Anywhere Singapore Serverless Aktif! Cara pakai: /api/proxy/HTTPS://LINK-TARGET");
        return;
    }

    // Fix otomatis jika double slash hilang saat proses rewrite oleh Vercel Gateway
    if (targetUrl.startsWith('https:/') && !targetUrl.startsWith('https://')) {
        targetUrl = targetUrl.replace('https:/', 'https://');
    } else if (targetUrl.startsWith('http:/') && !targetUrl.startsWith('http://')) {
        targetUrl = targetUrl.replace('http:/', 'https://');
    }

    // 2. Jika request adalah manifest MPD, intercept untuk manipulasi BaseURL ke format path
    const isMpdManifest = req.url.includes('.mpd');

    if (isMpdManifest) {
        const urlObj = new URL(targetUrl);
        const lastSlashIndex = urlObj.href.lastIndexOf('/');
        const originalBasePath = urlObj.href.substring(0, lastSlashIndex + 1);

        // Susun prefix baru menggunakan format path murni tanpa query string '?'
        const proxyHost = req.headers.host;
        const proxyProtocol = req.headers['x-forwarded-proto'] || 'https';
        const customProxyPrefix = `${proxyProtocol}://${proxyHost}/api/proxy/`;

        const oldWrite = res.write;
        const oldEnd = res.end;
        let responseBuffer = [];

        res.write = function (chunk) {
            responseBuffer.push(chunk);
        };

        res.end = function (chunk) {
            if (chunk) responseBuffer.push(chunk);
            
            let originalBody = Buffer.concat(responseBuffer).toString('utf8');

            // Set BaseURL absolut dengan format /api/proxy/https://...
            const newAbsoluteBaseUrl = `${customProxyPrefix}${originalBasePath}dash/`;
            
            if (originalBody.includes('<BaseURL>')) {
                originalBody = originalBody.replace(/<BaseURL>([^<]+)<\/BaseURL>/g, `<BaseURL>${newAbsoluteBaseUrl}</BaseURL>`);
            } else {
                originalBody = originalBody.replace('<Period id="1" start="PT0S">', `<Period id="1" start="PT0S">\n    <BaseURL>${newAbsoluteBaseUrl}</BaseURL>`);
            }

            res.setHeader('content-length', Buffer.byteLength(originalBody));
            oldEnd.call(this, originalBody, 'utf8');
        };
    }

    // 3. Setel req.url internal untuk cors-anywhere
    req.url = '/' + targetUrl;
    req.headers.origin = req.headers.origin || 'https://localhost';
    req.headers['x-requested-with'] = req.headers['x-requested-with'] || 'XMLHttpRequest';

    // Jalankan proxy
    proxyServer.emit('request', req, res);
};
