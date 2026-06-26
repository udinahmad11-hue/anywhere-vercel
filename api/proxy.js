module.exports = async (req, res) => {
    // 1. Atur CORS Header super longgar
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', '*');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    let targetUrl = req.query.url;
    if (!targetUrl) {
        res.status(200).send("Proxy Server Aktif.");
        return;
    }

    // Decode Base64 dari PHP backend jika dikirim ter-encode
    if (!targetUrl.startsWith('http')) {
        try {
            targetUrl = Buffer.from(targetUrl, 'base64').toString('utf8');
        } catch (e) {
            res.status(400).send("Gagal decode Base64.");
            return;
        }
    }

    try {
        // 2. Ambil data asli dari Starhub sebagai ArrayBuffer terlebih dahulu (aman untuk text maupun binary)
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.starhubgo.com/',
                'Origin': 'https://www.starhubgo.com'
            }
        });

        const contentType = response.headers.get('content-type') || '';
        const bufferData = await response.arrayBuffer();
        const nodeBuffer = Buffer.from(bufferData);

        // 3. JIKA REQUEST ADALAH MANIFEST UTAMA MPD (Bukan segmen video .dash)
        if (targetUrl.includes('.mpd') || contentType.includes('xml') || contentType.includes('dash+xml')) {
            
            // Ubah buffer menjadi text string untuk dimanipulasi
            let responseData = nodeBuffer.toString('utf8');

            // Dapatkan URL base direktori dari file manifest asli
            // Contoh: https://ucdn.starhubgo.com/bpk-tv/FIFAWCCh1/output/manifest.mpd
            // Menjadi: https://ucdn.starhubgo.com/bpk-tv/FIFAWCCh1/output/
            const baseRemoteDir = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);

            // Alamat remote absolut untuk segmen
            const absoluteBaseUrl = `${baseRemoteDir}dash/`;
            
            // Encode base remote target ke Base64 agar aman saat dilempar ke query string
            const base64AbsoluteUrl = Buffer.from(absoluteBaseUrl).toString('base64');
            
            // Bentuk URL Vercel kamu sebagai BaseURL baru bagi player
            const hostUrl = `https://${req.headers.host}/api/proxy?url=${base64AbsoluteUrl}/`;

            // Eksekusi penulisan ulang tag <BaseURL> secara paksa
            if (responseData.includes('<BaseURL>')) {
                responseData = responseData.replace(/<BaseURL>.*?<\/BaseURL>/g, `<BaseURL>${hostUrl}</BaseURL>`);
            } else {
                // Jika bawaannya tidak ada tag BaseURL, sisipkan tepat di bawah <Period id="1" start="PT0S">
                responseData = responseData.replace('<Period id="1" start="PT0S">', `<Period id="1" start="PT0S">\n    <BaseURL>${hostUrl}</BaseURL>`);
            }

            res.setHeader('Content-Type', 'application/dash+xml');
            res.status(response.status).send(responseData);
            return;
        }

        // 4. JIKA REQUEST ADALAH SEGMEN BINER (.dash / audio / video)
        // Kirim datanya murni 1:1 tanpa menyentuh isinya
        if (contentType) {
            res.setHeader('Content-Type', contentType);
        } else {
            res.setHeader('Content-Type', 'application/octet-stream');
        }
        
        res.status(response.status).send(nodeBuffer);

    } catch (error) {
        res.status(500).send("Proxy Dynamic Error: " + error.message);
    }
};
