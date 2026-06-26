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
        // 2. Tarik data asli dari Starhub
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.starhubgo.com/',
                'Origin': 'https://www.starhubgo.com'
            }
        });

        const contentType = response.headers.get('content-type') || '';
        
        // Ambil data dalam bentuk text string terlebih dahulu
        let responseData = await response.text();

        // 3. JIKA RESPONS ADALAH MANIFEST MPD (DASH XML)
        if (contentType.includes('xml') || contentType.includes('dash+xml') || targetUrl.includes('.mpd') || responseData.includes('<MPD')) {
            
            // Dapatkan URL base direktori dari file manifest asli
            // Contoh: https://mh-bks400-06.starhubgo.com/bpk-tv/FIFAWCCh2/output/manifest.mpd 
            // Menjadi: https://mh-bks400-06.starhubgo.com/bpk-tv/FIFAWCCh2/output/
            const baseRemoteDir = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);

            // Bersihkan / manipulasi tag <BaseURL> bawaan yang merusak routing
            // Kita paksa isinya mengarah langsung secara absolut ke server Starhub asli lewat segmen "dash/"
            const absoluteBaseUrl = `${baseRemoteDir}dash/`;
            
            // Encode kembali absolute URL tadi ke Base64 agar aman saat dipanggil player
            const base64AbsoluteUrl = Buffer.from(absoluteBaseUrl).toString('base64');
            
            // Inject base url baru yang mengarah kembali ke proxy Vercel kita sendiri
            // Sehingga player dipaksa memanggil: https://anywhere-vercel.vercel.app/api/proxy?url=[BASE64_STREAMS_DASH]
            const hostUrl = `https://${req.headers.host}/api/proxy?url=${base64AbsoluteUrl}`;

            // Eksekusi replace tag <BaseURL> mentah
            if (responseData.includes('<BaseURL>')) {
                responseData = responseData.replace(/<BaseURL>.*?<\/BaseURL>/g, `<BaseURL>${hostUrl}</BaseURL>`);
            } else {
                // Jika tidak ada tag BaseURL, sisipkan tepat di bawah tag <Period>
                responseData = responseData.replace('<Period id="1" start="PT0S">', `<Period id="1" start="PT0S">\n    <BaseURL>${hostUrl}</BaseURL>`);
            }

            res.setHeader('Content-Type', 'application/dash+xml');
            res.status(response.status).send(responseData);
            return;
        }

        // 4. JIKA RESPONS BUKAN XML (Segmen Video .dash / biner / audio)
        // Kembalikan tipe content murni dan kirim buffer binernya langsung
        if (contentType) {
            res.setHeader('content-type', contentType);
        }
        
        // Convert string text kembali ke binary buffer sebelum dilempar ke player
        const binaryBuffer = Buffer.from(responseData, 'utf8');
        res.status(response.status).send(binaryBuffer);

    } catch (error) {
        res.status(500).send("Proxy Dynamic Error: " + error.message);
    }
};
