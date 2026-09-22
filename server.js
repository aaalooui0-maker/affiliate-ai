require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { OpenAI } = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
// Limit diperbesar ke 50mb untuk menerima banyak gambar base64
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Menyajikan file static dari folder public (tempat index.html berada)
app.use(express.static(path.join(__dirname, 'public')));

// Inisialisasi OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// =========================================================================
// ENDPOINT 1: Analisis Gambar (Membaca semua foto dengan AI Vision)
// =========================================================================
app.post('/api/analyze', async (req, res) => {
    try {
        const { images } = req.body; 

        if (!images || images.length === 0) {
            return res.status(400).json({ error: 'Tidak ada gambar yang dikirim.' });
        }

        // Format gambar untuk OpenAI Vision
        const imageContents = images.map(imgBase64 => ({
            type: "image_url",
            image_url: { url: imgBase64 }
        }));

        const promptText = `
        Anda adalah analis produk profesional. Analisis SEMUA gambar produk ini secara teliti.
        BACA semua tulisan yang terlihat pada kemasan maupun deskripsi yang ada di foto.
        
        Keluarkan data dalam format JSON dengan struktur persis seperti ini:
        {
            "nama_produk": "...",
            "kategori": "...",
            "jenis": "...",
            "warna": "...",
            "bentuk": "...",
            "ukuran_volume": "...",
            "tekstur": "...",
            "kandungan": "...",
            "manfaat": "...",
            "fitur": "...",
            "klaim": "...",
            "informasi_kemasan": "...",
            "tulisan_terbaca": "...",
            "informasi_tidak_ditemukan": "Daftar info yang benar-benar tidak ada di foto"
        }

        ATURAN SANGAT KETAT (ANTI-HALLUCINATION):
        1. DILARANG MENGARANG INFORMASI. Jangan menebak-nebak.
        2. Jika sebuah informasi tidak terlihat, tidak ada di foto, atau tidak disebutkan, tulis persis: "Informasi tidak ditemukan pada foto."
        3. Jika ada teks yang buram atau tidak terbaca, tulis: "Tulisan tidak terbaca."
        4. Hanya gunakan FAKTA dari gambar yang diunggah.
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o", 
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: promptText },
                        ...imageContents
                    ]
                }
            ],
            response_format: { type: "json_object" },
            max_tokens: 1500,
        });

        const analysisResult = JSON.parse(response.choices[0].message.content);
        res.json(analysisResult);

    } catch (error) {
        console.error('Analyze Error:', error);
        res.status(500).json({ error: 'Gagal menganalisis gambar. Pastikan API Key valid atau coba kurangi jumlah/ukuran foto.' });
    }
});

// =========================================================================
// ENDPOINT 2: Generate Prompt (Membuat 6 Scene Video Berdasarkan Analisis)
// =========================================================================
app.post('/api/generate', async (req, res) => {
    try {
        const { analysis, settings, customSelections } = req.body;

        const promptText = `
        Anda adalah Video Director dan Copywriter profesional untuk konten TikTok Affiliate.
        Berdasarkan data produk nyata hasil analisis Vision AI berikut ini:
        ${JSON.stringify(analysis, null, 2)}
        
        Dan pengaturan video yang dipilih user:
        Durasi: ${settings.duration} detik
        Style Video: ${settings.style}
        Nada Suara: ${settings.tone}
        Jenis Suara: ${settings.voice}
        Model: ${settings.model}
        Hook Opening: ${settings.hook}
        Pengaturan Custom: ${JSON.stringify(customSelections)}

        Buatlah 6 Scene Video Prompt (Hook, Pain Point, Solution, Benefit, Proof, CTA) dengan total durasi pas ${settings.duration} detik.
        
        ATURAN SANGAT KETAT:
        1. DILARANG MEMBUAT VOICE-OVER TEMPLATE. Voice Over harus dinamis, natural, dan 100% didasarkan pada fakta produk di atas. Sesuaikan gaya bicara dengan "Nada Suara" dan "Jenis Suara".
        2. Jangan membuat klaim medis, janji palsu, "100% berhasil", atau klaim berlebihan jika tidak terverifikasi di data produk.
        3. Scene 1 WAJIB berupa Hook (4 detik).
        4. Scene 6 WAJIB berupa CTA mengarahkan ke "keranjang kuning ðŸŸ¡". Dilarang menyuruh klik link bio.
        5. Visual dan AI Prompt wajib menginstruksikan: "Preserve the exact product identity, packaging, logo, text, color, shape and proportions from the reference images".
        6. Format output HARUS JSON dengan struktur persis seperti ini:
        {
            "isCompliant": boolean,
            "complianceMessage": "Pesan review keamanan konten TikTok affiliate",
            "caption": "Ide caption TikTok yang menarik",
            "hashtags": "#tagar1 #tagar2 (minimal 5)",
            "scenes": [
                {
                    "id": 1, "title": "HOOK", "duration": 4,
                    "visual": "...", "text": "...", "vo": "...",
                    "camera": "...", "modelAction": "...", "productPosition": "...",
                    "lighting": "...", "background": "...",
                    "aiVideoPrompt": "...", "t2iPrompt": "...", "i2vPrompt": "...",
                    "cta": "" 
                }
                // Lanjutkan persis sampai 6 scene. (Untuk Scene 6, isi field "cta": "Keranjang Kuning ðŸŸ¡")
            ]
        }
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "You are an expert AI JSON API generating TikTok video prompt storyboards based on factual product data." },
                { role: "user", content: promptText }
            ],
            response_format: { type: "json_object" },
            max_tokens: 3500,
        });

        const scenesResult = JSON.parse(response.choices[0].message.content);
        res.json(scenesResult);

    } catch (error) {
        console.error('Generate Error:', error);
        res.status(500).json({ error: 'Gagal membuat script prompt video.' });
    }
});

// Wajib bind ke 0.0.0.0 untuk cloud hosting seperti Render/Heroku
app.listen(PORT, '0.0.0.0', () => {
    console.log(`âœ… Backend berjalan di port ${PORT}`);
});
