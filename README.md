# Gardu

Platform web kesadaran komunitas & rute aman warga terhadap kejahatan
jalanan (klitih) di Yogyakarta — dibangun untuk TCC Vibe Code 2026
(UKM Triple-C, Universitas Trunojoyo Madura).

Detail requirement lengkap ada di
[`docs/SRS_Sistem_Kesadaran_Klitih_TCC2026.tex`](docs/SRS_Sistem_Kesadaran_Klitih_TCC2026.tex).

## Struktur Proyek

```
frontend/   Next.js + Tailwind CSS + shadcn/ui + motion
backend/    FastAPI + LangChain/LangGraph (orkestrasi 3 AI Agent)
docs/       SRS dan diagram arsitektur
```

## Menjalankan Frontend

```bash
cd frontend
cp .env.example .env.local   # isi Supabase URL/anon key, Mapbox token, dsb.
npm install
npm run dev
```

Frontend berjalan di `http://localhost:3000`.

Manual check yang masih perlu dilakukan (REQ-NF-130, Firefox): validasi "Waktu Berangkat" di `/rute` memakai `validity.badInput` dan baru diuji di Chromium. Di Firefox, isi hanya tanggal pada "Waktu Berangkat" lalu klik "Cek Rute". Harus muncul pesan "Waktu berangkat belum lengkap…" dan tidak ada permintaan ke `/route/check`. Kalau tidak muncul, Firefox tidak melaporkan `badInput` untuk `datetime-local`, dan isian sebagian jatuh kembali menjadi "berangkat sekarang".

## Menjalankan Backend

```bash
cd backend
cp .env.example .env         # isi Supabase service role key, API key AI, dsb.
python -m venv .venv
.venv\Scripts\activate        # Windows. Di macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload
```

Backend berjalan di `http://localhost:8000` (dokumentasi Swagger di `/docs`).

Known limitation: rate limiter (berlaku untuk /reports dan /route/check) pakai request.client.host langsung, perlu --proxy-headers + --forwarded-allow-ips saat deploy di belakang proxy (Railway/Render), belum dikonfigurasi.

Jalankan test ringan backend dengan:

```bash
pytest
```

## Database

Skema awal (`reports`, `incidents`, `risk_scores`, `moderators`) ada di
[`backend/supabase/migrations/`](backend/supabase/migrations/). Jalankan lewat
Supabase SQL editor atau `supabase db push` setelah project Supabase dibuat.
Tabel `reports` sengaja tidak punya kolom identitas pelapor apa pun — lihat
skill `database-design` dan REQ-NF-120 di SRS.

## Environment Variables

Jangan pernah commit `.env`/`.env.local` berisi value asli — hanya
`.env.example` yang masuk git. Variabel yang dibutuhkan:

| Variabel | Sisi | Keterangan |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Frontend | Baca data publik (RLS aktif) |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Frontend | Peta interaktif |
| `NEXT_PUBLIC_API_BASE_URL` | Frontend | URL backend FastAPI |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Backend | Tulis data setelah tervalidasi API |
| `MAPBOX_TOKEN` | Backend | Geocoding laporan (opsional, lewati kalau kosong) |
| `GEMINI_API_KEY` | Backend | **Wajib** — Verification Agent (embedding + klasifikasi, full Gemini) |
| `ANTHROPIC_API_KEY` | Backend | Opsional, hanya cadangan — keputusan final: semua AI Agent memakai Gemini, jadi biarkan kosong kecuali diminta dipakai secara eksplisit |
