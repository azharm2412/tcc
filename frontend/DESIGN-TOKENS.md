# Gardu — Design Tokens

Referensi ringkas dari skill `gardu-design` (`.claude/skills/gardu-design/SKILL.md`).
**Skill itu tetap sumber kebenaran** — dokumen ini cuma ringkasan siap-pakai
biar tidak perlu buka skill tiap bikin komponen baru. Token sudah aktif
di [`src/app/globals.css`](src/app/globals.css), jangan didefinisikan ulang
di tempat lain.

Konsep: Gardu = pos ronda tradisional Jawa, nuansa lampu jaga yang menyala di
malam hari dan dijaga bersama warga — bukan dashboard SaaS korporat. Satu tema
(dark), bukan light/dark toggle. Palet = "Diayu": emerald di atas hitam-hijau.

## 1. Token Warna

| Token CSS | Utility Tailwind | Nilai | Pemakaian |
|---|---|---|---|
| `--background` | `bg-background` | `#060a08` | Latar utama, malam hitam-hijau |
| `--surface` (alias `--card`, `--popover`, `--secondary`) | `bg-surface` / `bg-card` | `#0f1713` | Kartu, panel, modal, popover |
| `--foreground` | `text-foreground` | `#E8E6E1` | Teks utama di atas background gelap |
| `--muted-foreground` | `text-muted-foreground` | `#9AA3B5` | Teks sekunder/caption |
| `--primary` | `bg-primary` / `text-primary` | `#34d399` (emerald-400) | Elemen utama, tombol primer |
| `--primary-foreground` | `text-primary-foreground` | `#022c22` (emerald-950) | Teks di atas `--primary` |
| `--primary-hover` | `bg-primary-hover` | `#6ee7b7` (emerald-300) | Hover state elemen primary |
| `--accent` | `text-accent` / `bg-accent` | `#5eead4` (teal-300) | Sorotan penting (mis. angka skor) — **TERBATAS** |
| `--accent-foreground` | `text-accent-foreground` | `#042f2e` (teal-950) | Teks di atas `--accent` |
| `--border` / `--input` | `border-border` | `rgba(148,163,184,0.15)` | Garis pembatas, outline card, input |
| `--ring` | `ring-ring` | `#34d399` | Focus ring |
| `--muted` | `bg-muted` | `#13201a` | Latar hover / tab non-aktif (turunan surface) |
| `--destructive` | `text-destructive` | `#B85C4C` | Error state (disamakan dgn `--risk-high`, tetap netral) |
| `--risk-low` | `bg-risk-low` | `#4C8C6B` | Skor risiko rendah (hijau lumut) |
| `--risk-medium` | `bg-risk-medium` | `#D4A24C` | Skor risiko sedang (kuning tanah) |
| `--risk-high` | `bg-risk-high` | `#B85C4C` | Skor risiko tinggi (merah bata, bukan merah alarm) |

`--risk-*` **tidak boleh diubah** oleh token-swap apa pun.

> Alasan `--risk-high` bukan merah cerah: REQ-NF-141 (SRS) mewajibkan bahasa
> UI netral & menenangkan meski ini aplikasi keselamatan.

Utilitas gaya Diayu yang sudah dipetakan ke token (di `globals.css`):
`.container-x` (lebar konten), `.glass-card` (panel semi-transparan),
`shadow-glow` (bayangan hijau lembut, dipakai hemat).

Radius dasar: `--radius: 0.5rem`. **Jangan** pakai radius seragam besar
(`rounded-2xl`/`rounded-3xl`) di semua elemen — itu ciri kartu generik AI.
Bentuk pil (`rounded-full`) hanya untuk badge/chip kecil.

## 2. Tipografi

- **Heading & body:** [Inter](https://fonts.google.com/specimen/Inter) — satu keluarga,
  hirarki dari bobot & ukuran: heading 600–700 dengan `tracking-tight`, body 400/500.
  Fallback `system-ui, sans-serif`.
- Skala: `h1` 2.25rem · `h2` 1.5rem · `h3` 1.25rem · body 1rem · caption 0.875rem.

Sudah di-wire lewat `next/font` di [`src/app/layout.tsx`](src/app/layout.tsx):

```tsx
import { Inter } from "next/font/google";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

// <html className={`${inter.variable} ...`}>
```

`globals.css` memetakan variabel font itu ke utility Tailwind:

```css
@theme inline {
  --font-sans: var(--font-inter);    /* body — dipakai default lewat <html class="font-sans"> */
  --font-heading: var(--font-inter); /* dipakai manual lewat class="font-heading" */
}
```

`h1`/`h2`/`h3` sudah otomatis `font-heading font-semibold tracking-tight` lewat
`@layer base` — elemen lain (mis. `CardTitle`) pakai `font-heading` secara eksplisit.

## 3. Motion (package `motion`, import dari `motion/react`)

- Entrance: fade + `translateY(8px)`, durasi 300–400ms, easing
  `cubic-bezier(0.16, 1, 0.3, 1)`.
- Stagger antar-item: 60–80ms, jangan lebih.
- Hover: **scale 1.02 ATAU shadow halus** — pilih satu, jangan dua-duanya.
- Wajib hormati `prefers-reduced-motion` (`MotionConfig reducedMotion="user"` di
  layout + fallback global di `globals.css`).
- Animasikan `transform`/`opacity` saja, jangan `width`/`height`.

## 4. Contoh Referensi Komponen

Kartu pakai `border-border` + `bg-surface/70` (bukan shadow tebal), tombol pakai
`--primary-hover` eksplisit, dan entrance motion sesuai spek di atas.

```tsx
"use client";

import * as motion from "motion/react-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function ContohKartuLaporan() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-foreground">Laporan Terverifikasi</CardTitle>
          <CardDescription>Jl. Kaliurang km 5, dilaporkan 21:40</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="bg-primary text-primary-foreground transition-shadow hover:bg-primary-hover hover:shadow-glow">
            Lihat Detail
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
```

Catatan pemakaian:
- `--accent` (teal) sengaja **tidak** dipakai untuk tombol/kartu sehari-hari —
  reserve untuk satu momen bermakna saja (mis. angka skor risiko).
- Badge status risiko: pakai komponen `RiskBadge` (`src/components/gardu/risk-badge.tsx`).
  Teks badge = `--foreground`; warna risiko HANYA di titik & cincin (lihat kontras di bawah).
- Kalau ambil komponen dari 21st.dev: copy strukturnya saja, lalu ganti
  semua class warna/font bawaan ke token di tabel atas sebelum dipakai.

## 5. Aksesibilitas & Kontras (dihitung dengan rumus WCAG)

- `--foreground` di atas `--background`: **16.0:1**; di atas `--surface`: **14.6:1**.
- `--muted-foreground` di atas `--surface`: **7.2:1** (di atas background 7.9:1).
- `--primary-foreground` di atas `--primary`: **7.9:1** (di atas `--primary-hover` 9.9:1).
- `--primary` sebagai teks/tautan di atas background: **10.4:1** (di atas surface 9.5:1).
- `--accent` di atas `--surface`: **12.3:1**; `--accent-foreground` di atas `--accent`: **9.8:1**.
- `--risk-medium` di atas surface 7.9:1, `--risk-low` 4.6:1, tapi **`--risk-high` hanya
  4.1:1** (di bawah AA 4.5:1). Jadi warna risiko **jangan dipakai sebagai warna teks**:
  teks label tetap `--foreground`, warna risiko di titik/cincin/bilah, dan makna
  selalu ditambah label teks (bukan warna saja).
- Focus ring pakai `--ring` (emerald), terlihat jelas di atas background gelap.
