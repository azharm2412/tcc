# CLAUDE.md — Gardu (TCC Vibe Code 2026)

## Tentang project
Gardu: web app pelaporan komunitas + prediksi risiko + rute aman untuk kejahatan
jalanan (klitih) di Yogyakarta. Referensi lengkap: SRS_TCC_Vibe_Coding.pdf dan
Context_Gardu_Vibe_Coding.pdf di /docs.

## Stack
- Frontend: Next.js + Tailwind CSS + shadcn/ui + Framer Motion
- Backend: FastAPI + LangChain/LangGraph
- Database: Supabase (PostgreSQL + pgvector)
- Peta: Mapbox GL JS
- AI: Claude atau Gemini API

## Struktur folder
frontend/        -> Next.js app
backend/agents/   -> Verification, Risk Prediction, Safe Route Advisor (terpisah per file)
data/seed/        -> seed data + metadata sumber
docs/             -> SRS, contracts.md, skills/

## Aturan wajib
1. Baca docs/contracts.md SEBELUM mengubah skema data atau format request/response.
2. Jangan ubah kontrak yang sudah disepakati tanpa bilang ke tim dulu.
3. Tiga AI Agent (Verification, Risk Prediction, Safe Route Advisor) harus tetap
   jadi modul terpisah — jangan digabung jadi satu fungsi/prompt besar.
4. Tidak boleh menyimpan identitas pribadi pelapor (nama, no HP, akun medsos).
5. Tidak boleh ada fitur yang mengarah ke identifikasi terduga pelaku.
6. Jangan commit API key atau file .env asli — hanya .env.example.
7. Sebelum mengedit file, baca skill file yang relevan di docs/skills/:
   - Kerja di frontend -> baca docs/skills/frontend.md
   - Kerja di AI agent/backend -> baca docs/skills/agents.md
   - Kerja di database/seed data -> baca docs/skills/data.md
8. Setelah selesai satu task, laporkan: file apa yang diubah, dan hasil test/run-nya.

## Yang harus dihindari
- Jangan scraping otomatis dari media sosial (di luar scope kompetisi).
- Jangan klaim seed data sebagai data resmi kepolisian.
- Jangan mulai kerja di dasbor/peta sebelum data dari agent tersedia.
