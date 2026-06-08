# BotPenjaga - Minecraft Bot

Bot Minecraft dengan fitur:
- Auto-reconnect jika terputus
- Anti-AFK (gerak acak tiap 2-4 menit)
- Web server untuk UptimeRobot
- Error handling lengkap

## Deploy ke Railway (Gratis)

1. Buka https://railway.app dan login dengan GitHub
2. Klik **New Project → Deploy from GitHub repo**
3. Upload folder ini ke GitHub terlebih dahulu, atau gunakan **Deploy from local** jika tersedia
4. Railway otomatis mendeteksi `package.json` dan menjalankan `npm start`
5. Setelah deploy, salin URL dari Railway (format: `https://botpenjaga-xxx.up.railway.app`)
6. Masukkan URL tersebut ke UptimeRobot untuk di-ping setiap 5 menit

## Deploy ke Render (Gratis)

1. Buka https://render.com dan login dengan GitHub
2. Klik **New → Web Service**
3. Hubungkan repo GitHub yang berisi folder ini
4. Isi pengaturan:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free
5. Klik **Create Web Service**
6. Salin URL dari Render (format: `https://botpenjaga.onrender.com`)
7. Masukkan URL ke UptimeRobot

## URL untuk UptimeRobot

Ping salah satu endpoint ini:
- `/` — Halaman status dengan tampilan web
- `/status` — Data JSON (lebih ringan, cocok untuk ping)

## Catatan Render (Penting!)

Render Free akan "tidur" setelah 15 menit tidak ada request. Pastikan UptimeRobot ping setiap **5 menit** agar bot tidak mati.
