module.exports = async (req, res) => {
    // 1. Set CORS Header super longgar
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', '*');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 2. Ambil URL asli langsung dari request URL mentah browser/player
    const originalUrl = req.url; // Contoh: /api/proxy/https://domain.com/live/manifest.mpd
    const prefix = '/api/proxy/';

    if (!originalUrl.includes(prefix)) {
        res.status(400).send("Akses harus melalui /api/proxy/");
        return;
    }

    // Potong string untuk mendapatkan URL target murni di belakang /api/proxy/
    let targetUrl = originalUrl.substring(originalUrl.indexOf(prefix) + prefix.length);

    // Perbaiki double slash yang sering hilang di lingkungan produksi
    if (targetUrl.startsWith('https:/') && !targetUrl.startsWith('https://')) {
        targetUrl = targetUrl.replace('https:/', 'https://');
    } else if (targetUrl.startsWith('http:/') && !targetUrl.startsWith('http://')) {
        targetUrl = targetUrl.replace('http:/', 'https://');
    }

    if (!targetUrl) {
        res.status(200).send("CORS Proxy Path Aktif!");
        return;
    }

    try {
        // 3. Tembak langsung ke server stream
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.starhubgo.com/',
                'Origin': 'https://www.starhubgo.com'
            }
        });

        // Teruskan Content-Type asli (application/dash+xml, video/mp4, dll.)
        const contentType = response.headers.get('content-type');
        if (contentType) {
            res.setHeader('content-type', contentType);
        }

        // Ambil data biner murni dan langsung kirimkan keluar
        const dataBuffer = await response.arrayBuffer();
        res.status(response.status).send(Buffer.from(dataBuffer));

    } catch (error) {
        res.status(500).send("Proxy Exception: " + error.message);
    }
};
