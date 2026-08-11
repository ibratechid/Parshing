// api/parse.js
// Vercel Serverless Function (Node.js runtime).
// This is the ONLY place the BazaarLink API key is ever used.
// It reads the key from the server-side environment variable BAZAARLINK_API_KEY,
// which is never sent to the browser. The frontend calls this endpoint instead
// of calling bazaarlink.ai directly.

const API_URL = "https://bazaarlink.ai/api/v1/chat/completions";
const MODEL = "auto:free";

// Free-tier AI models routed via auto:free can take 15-30s to respond.
// Vercel Hobby plan defaults to a 10s function timeout, which isn't enough.
// This raises it to 60s (the Hobby plan max) so slow-but-successful
// responses aren't cut off.
module.exports.config = { maxDuration: 60 };

const KATEGORI_LIST = ["Accounting","Audit","Bank & BUMN","Finance","GRC","Tax","IT","Fresh Graduate"];

function buildPrompt(rawText) {
  return `Dari teks loker berikut, keluarkan JSON array. Satu object per posisi kerja (pecah jika ada beberapa posisi).
Tiap object:
{"posisi": "judul bersih tanpa catatan tambahan dalam kurung",
"perusahaan": "nama perusahaan LENGKAP apa adanya sesuai teks asli, termasuk suffix legal seperti Tbk/Persero jika ada, JANGAN disingkat atau dikurangi hurufnya, buang hanya jika ada embel department/divisi yang menempel (misal 'PT ABC - Marketing' jadi 'PT ABC')",
"lokasi": "nama kota jika hanya 1 lokasi disebut, atau 'All Indonesia' jika lebih dari 1 kota disebut / teks bilang seluruh Indonesia, kosongkan jika tidak ada info lokasi sama sekali",
"kategori": "salah satu dari [${KATEGORI_LIST.join(",")}] atau kosong jika tidak cocok",
"excerpt": "1 kalimat ringkas ditulis ulang, maks 15 kata",
"tanggung_jawab": ["poin AKTIVITAS/TUGAS yang akan dikerjakan di posisi ini sehari-hari, array kosong [] jika tidak disebutkan"],
"persyaratan": ["poin SYARAT/KUALIFIKASI yang harus dimiliki kandidat agar bisa melamar, array kosong [] jika tidak disebutkan"]}

ATURAN KLASIFIKASI tanggung_jawab vs persyaratan (PENTING, sering tertukar):
- tanggung_jawab = kalimat tentang APA YANG AKAN DIKERJAKAN di posisi ini. Biasanya diawali kata kerja aktif seperti "mengelola", "mengoordinasikan", "menyusun", "bertanggung jawab atas", "manage", "coordinate", "handle", "oversee", "prepare", "assist with". Contoh: "Mengelola jadwal dan kalender CEO", "Coordinate meetings and travel arrangements".
- persyaratan = kalimat tentang SYARAT/KUALIFIKASI kandidat, biasanya di bawah heading seperti "Requirements", "Qualifications", "What We're Looking For", "Kualifikasi", "Syarat". Formatnya sering: pengalaman minimal ("minimum X years experience"), skill/kemampuan ("proficient in...", "fluent in..."), sifat personal ("reliable", "detail-oriented"), pendidikan minimal. Contoh: "Minimum 4 years of experience...", "Fluent in English", "Proficient in Microsoft Office".
- Kalau seluruh isi teks cuma berupa daftar kualifikasi kandidat (tidak ada kalimat yang menjelaskan tugas harian), maka SEMUA poin itu masuk persyaratan, dan tanggung_jawab dikosongkan (array []). Jangan memaksa isi tanggung_jawab dengan menulis ulang poin persyaratan.
- Jangan mengarang tanggung_jawab atau persyaratan yang tidak ada dasarnya di teks asli.

Balas HANYA JSON array, tanpa penjelasan, tanpa markdown fence.

Teks:
"""${rawText}"""`;
}

function buildImagePrompt() {
  return `Gambar ini adalah screenshot atau foto lowongan kerja. Baca semua teks di gambar, lalu keluarkan JSON array persis dengan format berikut. Satu object per posisi kerja (pecah jika ada beberapa posisi dalam satu gambar).

Karena input berupa gambar (bukan teks polos), kamu HARUS membaca sendiri semua detail berikut langsung dari gambar (jangan dikosongkan kalau terlihat jelas di gambar):

{"posisi": "judul bersih tanpa catatan tambahan dalam kurung",
"perusahaan": "nama perusahaan LENGKAP apa adanya sesuai teks di gambar, termasuk suffix legal seperti Tbk/Persero jika ada, JANGAN disingkat, buang hanya embel department/divisi yang menempel",
"lokasi": "nama kota jika hanya 1 lokasi disebut, atau 'All Indonesia' jika lebih dari 1 kota / seluruh Indonesia, kosongkan jika tidak ada info lokasi",
"kategori": "salah satu dari [${KATEGORI_LIST.join(",")}] atau kosong jika tidak cocok",
"excerpt": "1 kalimat ringkas ditulis ulang, maks 15 kata",
"tanggung_jawab": ["poin AKTIVITAS/TUGAS sehari-hari di posisi ini, array kosong [] jika tidak disebutkan"],
"persyaratan": ["poin SYARAT/KUALIFIKASI kandidat, array kosong [] jika tidak disebutkan"],
"tipe_kerja": "WFO, WFH, Hybrid, atau Remote jika disebutkan di gambar, kosongkan jika tidak ada",
"email": "alamat email lamaran jika terlihat di gambar, kosongkan jika tidak ada",
"whatsapp": "nomor WhatsApp/telepon jika terlihat di gambar (format 62xxxxxxxxxx tanpa spasi/strip/plus), kosongkan jika tidak ada",
"link_apply": "URL untuk melamar jika terlihat di gambar, kosongkan jika tidak ada",
"gaji": "range gaji jika disebutkan di gambar (format apa adanya, misal 'Rp 5.000.000 - Rp 7.000.000'), kosongkan jika tidak ada",
"pendidikan": "minimal pendidikan (S1/S2/S3/D3/D4/SMA/SMK) jika disebutkan, kosongkan jika tidak ada",
"deadline": "tanggal deadline lamaran format DD/MM/YYYY jika disebutkan, kosongkan jika tidak ada"}

ATURAN KLASIFIKASI tanggung_jawab vs persyaratan (PENTING, sering tertukar):
- tanggung_jawab = kalimat tentang APA YANG AKAN DIKERJAKAN di posisi ini. Biasanya diawali kata kerja aktif seperti "mengelola", "mengoordinasikan", "menyusun", "bertanggung jawab atas", "manage", "coordinate", "handle", "oversee", "prepare", "assist with".
- persyaratan = kalimat tentang SYARAT/KUALIFIKASI kandidat, biasanya di bawah heading seperti "Requirements", "Qualifications", "Kualifikasi", "Syarat". Formatnya sering: pengalaman minimal, skill/kemampuan, sifat personal, pendidikan minimal.
- Kalau seluruh isi gambar cuma daftar kualifikasi kandidat (tidak ada tugas harian), maka SEMUA poin masuk persyaratan, tanggung_jawab dikosongkan (array []).
- Jangan mengarang apapun yang tidak benar-benar terlihat/terbaca di gambar. Kalau tulisan di gambar buram/tidak terbaca untuk suatu field, kosongkan field itu, jangan menebak.

Balas HANYA JSON array, tanpa penjelasan, tanpa markdown fence.`;
}


function extractWorkType(text) {
  const m = text.match(/\b(WFO|WFH|Hybrid|Remote)\b/i);
  return m ? (m[1][0].toUpperCase() + m[1].slice(1).toLowerCase()).replace("Wfo","WFO").replace("Wfh","WFH") : "";
}
function extractEmail(text) {
  const m = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return m ? m[0] : "";
}
function extractWhatsapp(text) {
  const m = text.match(/(?:\+?62|0)8[0-9][0-9\- ]{7,13}[0-9]/);
  if (!m) return "";
  return m[0].replace(/[\s\-]/g, "").replace(/^0/, "62").replace(/^\+/, "");
}
function extractApplyLink(text) {
  const nearKeyword = text.match(/(?:apply|lamar|daftar)[^h]*?(https?:\/\/[^\s\)\]]+)/i);
  if (nearKeyword) return nearKeyword[1].replace(/[.,;]+$/, "");
  const anyUrl = text.match(/https?:\/\/[^\s\)\]]+/);
  return anyUrl ? anyUrl[0].replace(/[.,;]+$/, "") : "";
}
function extractSalary(text) {
  const m = text.match(/Rp\.?\s?[\d.,]+(?:\s?-\s?Rp\.?\s?[\d.,]+)?(?:\s?(?:juta|jt))?/i);
  return m ? m[0].trim() : "";
}
function extractEducation(text) {
  const m = text.match(/\b(S1|S2|S3|D3|D4|SMA|SMK)\b/i);
  return m ? m[0].toUpperCase() : "";
}
function extractDeadline(text) {
  const m = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
  if (!m) return "";
  const [, d, mo, y] = m;
  const year = y.length === 2 ? "20" + y : y;
  return `${d.padStart(2,"0")}/${mo.padStart(2,"0")}/${year}`;
}
function regexExtract(rawText) {
  return {
    tipe_kerja: extractWorkType(rawText),
    email: extractEmail(rawText),
    whatsapp: extractWhatsapp(rawText),
    link_apply: extractApplyLink(rawText),
    gaji: extractSalary(rawText),
    pendidikan: extractEducation(rawText),
    deadline: extractDeadline(rawText)
  };
}

// Very small in-memory rate limiter per Vercel function instance.
// Not a substitute for BazaarLink's own free-tier limit (10/min, 150/day),
// just a cheap guard against accidental hammering from one client.
const rateBucket = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const windowMs = 60_000;
  const max = 10;
  const entry = rateBucket.get(ip) || [];
  const recent = entry.filter(t => now - t < windowMs);
  recent.push(now);
  rateBucket.set(ip, recent);
  return recent.length > max;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.BAZAARLINK_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Server belum dikonfigurasi: BAZAARLINK_API_KEY belum di-set di environment variables." });
    return;
  }

  const ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown";
  if (rateLimited(ip)) {
    res.status(429).json({ error: "Terlalu banyak request, coba lagi sebentar." });
    return;
  }

  let rawText = "";
  let imageDataUri = "";
  try {
    rawText = (req.body && req.body.rawText ? req.body.rawText : "").toString();
    imageDataUri = (req.body && req.body.image ? req.body.image : "").toString();
  } catch {
    res.status(400).json({ error: "Body tidak valid." });
    return;
  }

  const hasImage = imageDataUri.trim().length > 0;
  const hasText = rawText.trim().length > 0;

  if (!hasImage && !hasText) {
    res.status(400).json({ error: "Isi teks lowongan atau upload foto dulu." });
    return;
  }
  if (hasText && rawText.length > 8000) {
    res.status(400).json({ error: "Teks terlalu panjang (maks 8000 karakter)." });
    return;
  }
  if (hasImage) {
    const validPrefix = /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i;
    if (!validPrefix.test(imageDataUri)) {
      res.status(400).json({ error: "Format gambar tidak valid. Gunakan PNG, JPG, WebP, atau GIF." });
      return;
    }
    // Rough size guard: base64 is ~1.37x the original byte size. Vercel's
    // default serverless function body limit is 4.5MB, so cap comfortably
    // under that.
    if (imageDataUri.length > 4_000_000) {
      res.status(400).json({ error: "Ukuran gambar terlalu besar. Vercel membatasi request body ke ~4.5MB — kompres atau resize foto dulu (maks sekitar 2-3MB)." });
      return;
    }
  }

  try {
    let sharedFields = {};
    let messages;

    if (hasImage) {
      // Image path: no separate plain text to run regex against, so the AI
      // reads every field itself (marked "ai" on the frontend for those cases).
      messages = [{
        role: "user",
        content: [
          { type: "text", text: buildImagePrompt() },
          { type: "image_url", image_url: { url: imageDataUri } }
        ]
      }];
    } else {
      sharedFields = regexExtract(rawText);
      messages = [{ role: "user", content: buildPrompt(rawText) }];
    }

    const upstream = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        messages
      })
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      if (hasImage && (upstream.status === 400 || upstream.status === 422)) {
        res.status(upstream.status).json({
          error: `Model auto:free sepertinya tidak mendukung gambar (${upstream.status}). Perlu ganti ke model vision spesifik seperti google/gemini-2.5-flash atau anthropic/claude-sonnet-4.6 di api/parse.js. Detail: ${errText}`
        });
        return;
      }
      res.status(upstream.status).json({ error: `BazaarLink API error ${upstream.status}: ${errText}` });
      return;
    }

    const data = await upstream.json();
    const text = (data.choices?.[0]?.message?.content || "").trim();

    // Strip markdown code fences if present, in any position/casing.
    let clean = text.replace(/```json/gi, "").replace(/```/g, "").trim();

    let aiJobs;
    try {
      aiJobs = JSON.parse(clean);
    } catch {
      // Fallback: the model sometimes adds a sentence before/after the JSON,
      // or the response got cut off mid-array. Try to isolate just the
      // array portion and recover as many complete job objects as possible.
      const start = clean.indexOf("[");
      const end = clean.lastIndexOf("]");
      if (start !== -1 && end !== -1 && end > start) {
        try {
          aiJobs = JSON.parse(clean.slice(start, end + 1));
        } catch {
          // Truncated mid-object: grab whichever leading job objects are
          // syntactically complete, ignore the rest.
          const objMatches = clean.slice(start + 1).match(/\{[^{}]*\}/g);
          if (objMatches && objMatches.length) {
            aiJobs = [];
            for (const m of objMatches) {
              try { aiJobs.push(JSON.parse(m)); } catch { /* skip broken object */ }
            }
          }
        }
      }
      if (!aiJobs || !Array.isArray(aiJobs) || aiJobs.length === 0) {
        console.error("Unparseable AI response:", text);
        res.status(502).json({ error: "AI mengembalikan format yang tidak bisa di-parse. Coba lagi, atau paste teks yang lebih pendek." });
        return;
      }
    }

    const jobs = aiJobs.map(aiJob => ({ ...sharedFields, ...aiJob }));
    res.status(200).json({ jobs, usage: data.usage || null, mode: hasImage ? "image" : "text" });
  } catch (err) {
    res.status(500).json({ error: `Gagal memproses: ${err.message}` });
  }
};
