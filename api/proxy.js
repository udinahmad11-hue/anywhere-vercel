module.exports = async (req, res) => {
    // 1. Set CORS Header super longgar agar player tidak rewel
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', '*');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 2. Ambil seluruh path mentah dari request URL setelah /api/proxy/
    // Contoh req.url: /api/proxy/https://rcg-bks400-06.starhubgo.com:443/live/dash/file.dash
    const proxyPrefix = '/api/proxy/';
    const reqUrl = req.url;

    if (!reqUrl.includes(proxyPrefix)) {
        res.status(400).send("Format salah.");
        return;
    }

    // Ekstrak URL target murni di belakang /api/proxy/
    let targetUrl = reqUrl.substring(reqUrl.indexOf(proxyPrefix) + proxyPrefix.length);

    // Fix jika double slash setelah https: hilang akibat parsing browser/player
    if (targetUrl.startsWith('https:/') && !targetUrl.startsWith('https://')) {
        targetUrl = targetUrl.replace('https:/', 'https://');
    } else if (targetUrl.startsWith('http:/') && !targetUrl.startsWith('http://')) {
        targetUrl = targetUrl.replace('http:/', 'https://');
    }

    if (!targetUrl) {
        res.status(200).send("Proxy Aktif. Siap menerima path murni.");
        return;
    }

    try {
        // 3. Lakukan request murni ke server target
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.starhubgo.com/',
                'Origin': 'https://www.starhubgo.com'
            }
        });

        // Copy content type asli dari origin (xml, mp4, m4s, dll)
        const contentType = response.headers.get('content-type');
        if (contentType) {
            res.setHeader('content-type', contentType);
        }

        // Ambil data dalam bentuk buffer lalu kirim utuh tanpa modifikasi string
        const dataBuffer = await response.arrayBuffer();
        res.status(response.status).send(Buffer.from(dataBuffer));

    } catch (error) {
        res.status(500).send("Proxy Error: " + error.message);
    }
};
