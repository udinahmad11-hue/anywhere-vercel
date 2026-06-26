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

    // 2. Ambil parameter URL murni dari parameter query string
    let targetUrl = req.query.url;

    if (!targetUrl) {
        res.status(200).send("Proxy Aktif.");
        return;
    }

    // Cek jika URL dikirim dalam bentuk Base64 (tidak diawali http)
    if (!targetUrl.startsWith('http')) {
        try {
            targetUrl = Buffer.from(targetUrl, 'base64').toString('utf8');
        } catch (e) {
            res.status(400).send("Gagal decode Base64 target.");
            return;
        }
    }

    try {
        // 3. Tembak murni 1:1 ke Starhub
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.starhubgo.com/',
                'Origin': 'https://www.starhubgo.com'
            }
        });

        const contentType = response.headers.get('content-type');
        if (contentType) {
            res.setHeader('content-type', contentType);
        }

        const dataBuffer = await response.arrayBuffer();
        res.status(response.status).send(Buffer.from(dataBuffer));

    } catch (error) {
        res.status(500).send("Proxy Error: " + error.message);
    }
};
