const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

// ===============================
// ANALISIS PRODUK — VERSI GRATIS
// ===============================
app.post("/api/analyze", (req, res) => {
  const images = req.body.images || [];

  if (!images.length) {
    return res.status(400).json({
      error: "Belum ada foto produk."
    });
  }

  res.json({
    success: true,
    jumlahFoto: images.length,
    message:
      "Foto produk berhasil dimasukkan. Karena versi gratis tidak menggunakan AI API, informasi produk diambil dari data yang kamu masukkan pada form."
  });
});


// ===============================
// GENERATOR PROMPT VIDEO
// ===============================
app.post("/api/generate", (req, res) => {

  const analysis = req.body.analysis || {};
  const settings = req.body.settings || {};
  const custom = req.body.customSelections || {};

  const product =
    custom.productName ||
    "produk ini";

  const description =
    custom.description ||
    "Tampilkan produk sesuai foto referensi tanpa mengubah bentuk, warna, logo, atau detail produk.";

  const duration =
    settings.duration || "20";

  const style =
    settings.style || "TikTok Creator FYP";

  const tone =
    settings.tone || "Sensasional (ngegas + heboh)";

  const voice =
    settings.voice || "Wanita Dewasa Indonesia";

  const model =
    settings.model || "Wanita Fokus Tangan";

  const hook =
    settings.hook || "Ada rekomendasi";

  const customPoints =
    custom.customPoints || "";

  let sceneCount = 6;

  if (duration === "10") sceneCount = 4;
  if (duration === "20") sceneCount = 6;
  if (duration === "30") sceneCount = 8;


  const sceneDurations = {

    "10": ["4 detik", "3 detik", "3 detik", "CTA 3 detik"],

    "20": [
      "4 detik",
      "3 detik",
      "3 detik",
      "3 detik",
      "3 detik",
      "4 detik"
    ],

    "30": [
      "4 detik",
      "3 detik",
      "3 detik",
      "3 detik",
      "4 detik",
      "3 detik",
      "3 detik",
      "4 detik"
    ]

  };

  const durations =
    sceneDurations[duration] ||
    sceneDurations["20"];


  const scenes = [];


  // ===============================
  // SCENE 1
  // ===============================

  scenes.push({
    id: 1,
    title: "HOOK",
    duration: durations[0],

    visual:
      `Tampilkan ${product} dengan sangat jelas sejak awal video. Produk menjadi fokus utama dan seluruh bentuk, warna, logo, tekstur, serta detailnya harus mengikuti foto referensi.`,

    camera:
      "Kamera bergerak perlahan mendekati produk dari jarak sedang menuju close-up. Gerakan kamera halus tetapi tetap terasa hidup seperti video creator TikTok.",

    modelAction:
      model === "Tanpa Model"
        ? "Tidak ada model. Produk ditampilkan sebagai fokus utama."
        : `${model} menampilkan produk secara natural dan langsung mengarahkan perhatian penonton ke produk.`,

    background:
      "Background bersih, terang, realistis, dan tidak mengganggu produk.",

    text:
      `${hook} ${product}!`,

    aiVideoPrompt:
      `Buat video affiliate vertikal 9:16. ${product} menjadi fokus utama. Gunakan foto produk sebagai referensi utama. Pertahankan bentuk, warna, logo
