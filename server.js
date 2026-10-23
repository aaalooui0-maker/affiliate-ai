
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "40mb" }));
app.use(express.static(__dirname));

const API_KEY = process.env.GEMINI_API_KEY;

function getScenePlan(duration) {
  const plans = {
    10: [4, 3, 3],
    16: [4, 3, 3, 3, 3],
    20: [4, 3, 3, 3, 3, 4],
    26: [4, 3, 3, 3, 4, 3, 3, 3],
    30: [4, 3, 3, 3, 4, 3, 3, 3, 4]
  };
  return plans[duration] || plans[20];
}

app.post("/api/generate", async (req, res) => {
  try {
    if (!API_KEY) {
      return res.status(500).json({
        error: "Gemini API key belum dipasang. Tambahkan GEMINI_API_KEY di pengaturan Environment server."
      });
    }

    const data = req.body || {};
    const duration = Number(data.duration) || 20;
    const scenePlan = getScenePlan(duration);

    const images = Array.isArray(data.images) ? data.images.slice(0, 10) : [];

    const imageParts = images
      .filter(img =>
        img &&
        typeof img.data === "string" &&
        /^image\/(jpeg|png|webp|gif)$/i.test(img.mimeType || "")
      )
      .map(img => ({
        inlineData: {
          mimeType: img.mimeType,
          data: img.data
        }
      }));

    const sceneDescription = scenePlan
      .map((seconds, index) =>
        `Adegan ${index + 1}: ${seconds} detik`
      )
      .join("\n");

    const prompt = `
Kamu adalah Affiliate AI Studio, ahli analisis produk dan pembuatan prompt video TikTok Affiliate berbahasa Indonesia.

ANALISIS PRODUK:
Nama produk: ${data.productName || "Identifikasi dari foto jika memungkinkan"}
Link produk: ${data.productLink || "Tidak diberikan"}
Informasi tambahan pengguna: ${data.extraInfo || "Tidak ada"}

PENGATURAN VIDEO:
Durasi: ${duration} detik
Tujuan: ${data.goal || "Review produk"}
Model: ${data.model || "Wanita"}
Jenis suara: ${data.voice || "Wanita dewasa Indonesia"}
Nada suara: ${data.tone || "Sensasional (ngegas + heboh)"}
Gaya video: ${data.style || "TikTok Creator FYP"}
Pilihan hook: ${data.hookMode || "Acak sesuai produk"}
Hook khusus: ${data.customHook || "Pilih hook paling sesuai"}
Gaya teks: ${data.textStyle || "Teks singkat dan mencolok"}
Instruksi tambahan: ${data.extraStyle || "Tidak ada"}

PEMBAGIAN DURASI:
${sceneDescription}
Jumlah seluruh adegan harus tepat ${scenePlan.length}, dengan total ${duration} detik. Durasi setiap adegan tidak boleh diubah.

TUGAS:
1. Baca foto produk dan screenshot deskripsi yang dilampirkan.
2. Analisis nama produk, kategori, warna, bahan, detail, fitur dan informasi yang benar-benar terlihat atau terbaca.
3. Bedakan fakta yang terlihat dari informasi yang belum diketahui. Jangan mengarang harga, diskon, ukuran, bahan, manfaat, sertifikasi atau klaim produk.
4. Jika informasi penting tidak terbaca, nyatakan bahwa informasi tersebut belum terverifikasi.
5. Buat hook yang menarik, relevan dan tidak menipu. Jika diminta "Jangan skip dulu", gunakan secara natural.
6. Buat prompt video terperinci untuk setiap adegan: durasi, framing, posisi produk, aksi model, gerakan kamera, pencahayaan, latar, transisi, teks dan voice-over sesuai pilihan.
7. Pertahankan bentuk, warna, logo dan detail produk sesuai referensi. Jangan menambahkan produk atau aksesori yang tidak diminta.
8. Jika model "Tanpa model" atau "Produk saja, tanpa tangan", jangan tampilkan orang atau tangan. Jika memilih fokus tangan, jangan tampilkan wajah.
9. Untuk "Tanpa teks di video", jangan menambahkan teks visual. Untuk "Tanpa suara" atau "Tanpa voice-over", jangan menambahkan narasi atau dialog.
10. Jika memilih ASMR, prioritaskan suara alami yang relevan dengan produk; jangan menambahkan narasi yang bertentangan dengan pilihan tersebut.
11. CTA boleh menggunakan "cek keranjang kuning" jika sesuai. Jangan mengklaim produk pasti viral, pasti laku atau pasti membuat hasil tertentu.
12. Buat caption dan hashtag yang relevan tanpa spam hashtag.
13. Jangan mengaku sudah membuka atau membaca link TikTok Shop jika konten link tidak benar-benar tersedia. Gunakan foto dan informasi yang diberikan.

KELUARKAN HASIL DALAM FORMAT JSON VALID SAJA, tanpa markdown atau code fence, menggunakan tiga properti string:
{
  "analysis": "Analisis produk yang terstruktur dan mudah dibaca",
  "videoPrompt": "Hook dan prompt lengkap per adegan dengan waktu mulai-selesai, gerakan kamera, aksi, visual dan audio",
  "caption": "Caption menarik diikuti hashtag relevan"
}

Di bagian videoPrompt, sertakan semua adegan dengan waktu yang akurat dan total durasi yang tepat. Tuliskan voice-over Bahasa Indonesia yang sesuai pilihan pengguna jika suara narasi diaktifkan.
`;

    const parts = [{ text: prompt }, ...imageParts];

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
      encodeURIComponent(API_KEY),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: "application/json"
          }
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      const message =
        result?.error?.message || "Permintaan Gemini gagal.";
      return res.status(response.status === 429 ? 429 : 502).json({
        error: "Gemini: " + message
      });
    }

    const text = result?.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("")
      .trim();

    if (!text) {
      return res.status(502).json({
        error: "Gemini tidak mengembalikan hasil. Coba lagi."
      });
    }

    let output;
    try {
      output = JSON.parse(text);
    } catch {
      const cleaned = text
        .replace(/^```json\s*/i, "")
        .replace(/\s*```$/, "");
      output = JSON.parse(cleaned);
    }

    return res.json({
      analysis: String(output.analysis || ""),
      videoPrompt: String(output.videoPrompt || ""),
      caption: String(output.caption || "")
    });
  } catch (error) {
    console.error("Affiliate AI error:", error);
    return res.status(500).json({
      error: "Terjadi kesalahan server: " + error.message
    });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", app: "Affiliate AI Studio" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Affiliate AI berjalan pada port " + PORT);
});
