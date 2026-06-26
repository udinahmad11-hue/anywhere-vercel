module.exports = async (req, res) => {
    // 1. Set CORS Header super longgar untuk Player Video
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', '*');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 2. Ambil path mentah dari request browser/player
    const originalUrl = req.url; // Contoh: /api/proxy/https:/domain.com/live/manifest.mpd
    const prefix = '/api/proxy/';

    if (!originalUrl.includes(prefix)) {
        res.status(400).send("Akses ditolak. Harus lewat /api/proxy/");
        return;
    }

    // Potong untuk mengambil URL Target di belakang /api/proxy/
    let targetUrl = originalUrl.substring(originalUrl.indexOf(prefix) + prefix.length);

    // --- TRICK SAKTI BYPASS VERCEL ROUTING ---
    // Jika Vercel memotong double-slash menjadi single-slash (https:/) atau malah hilang (https:)
    if (targetUrl.startsWith('https:/') && !targetUrl.startsWith('https://')) {
        targetUrl = targetUrl.replace('https:/', 'https://');
    } else if (targetUrl.startsWith('http:/') && !targetUrl.startsWith('http://')) {
        targetUrl = targetUrl.replace('http:/', 'http://');
    } else if (targetUrl.startsWith('https:') && !targetUrl.startsWith('https:/')) {
        targetUrl = targetUrl.replace('https:', 'https://');
    } else if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        // Jika player mengirim murni tanpa protocol (karena efek BaseURL relatif), paksa tambah https://
        targetUrl = 'https://' + targetUrl;
    }

    try {
        // 3. Tembak murni 1:1 ke Starhub
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.starhubgo.com/',
                'Origin': 'https://www.starhubgo.com'
            }
        });

        // Teruskan Content-Type asli (application/dash+xml / video/mp4)
        const contentType = response.headers.get('content-type');
        if (contentType) {
            res.setHeader('content-type', contentType);
        }

        // Ambil biner stream / XML manifest, oper langsung keluar
        const dataBuffer = await response.arrayBuffer();
        res.status(response.status).send(Buffer.from(dataBuffer));

    } catch (error) {
        res.status(500).send("Proxy Error: " + error.message);
    }
};
