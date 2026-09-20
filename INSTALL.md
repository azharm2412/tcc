# Urutan Install Toolchain Gardu (jalankan sekali di awal)

Semua perintah `/plugin ...` dan `/...` dijalankan DI DALAM Claude Code
(kotak chat), bukan di terminal biasa. Perintah `npm`/`npx` dijalankan di
terminal biasa.

## 1. Extract file ini
Extract isi zip ini persis di root folder project (`CLAUDE.md` dan `.claude/`
sejajar dengan folder `frontend/`/`backend/` nanti).

## 2. Install ECC (kebiasaan umum agent)
Di dalam Claude Code:
```
/plugin marketplace add https://github.com/affaan-m/ECC
/plugin install ecc@ecc
```

## 3. Install UI UX Pro Max (referensi pola desain umum)
```
/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill
/plugin install ui-ux-pro-max@ui-ux-pro-max-skill
```

## 4. Install skill desain resmi Anthropic (hindari pola generik AI)
Di terminal, dari root project:
```
npx skills add frontend-design
```

## 5. Restart session Claude Code
Supaya skill/plugin baru terbaca. Buka session baru, lalu validasi:
```
baca CLAUDE.md dan jelasin scope project ini
```
Kalau jawabannya akurat soal Gardu (klitih, Supabase, dst), lanjut ke langkah 6.

## 6. Jalankan /scaffold
Ini akan install `motion` otomatis di frontend/ sesuai instruksi di command-nya.

## 7. Login 21st.dev (opsional, dipakai saat butuh komponen UI)
Di terminal:
```
npx @21st-dev/cli login
```

## 8. Jalankan /design-system
Sekali saja, sebelum mulai bangun banyak halaman — ini mengunci token warna/font
Gardu jadi referensi tetap buat semua komponen berikutnya.

## Urutan kerja harian setelahnya
`/build-module <nama modul>` untuk tiap fitur, `/review` sebelum commit penting.
