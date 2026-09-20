# Data Contracts — Gardu

Semua modul WAJIB ikut format ini. Kalau mau ubah, diskusikan dulu di grup
sebelum commit.

## 1. Tabel Supabase: reports
| Kolom       | Tipe        | Keterangan                              |
|-------------|-------------|------------------------------------------|
| id          | uuid (pk)   | auto                                     |
| description | text        | deskripsi kejadian dari warga            |
| location    | text        | nama jalan/area                         |
| lat, lng    | float8      | opsional, kalau titik peta dipakai       |
| reported_at | timestamptz | waktu kejadian dari user                 |
| status      | text        | "menunggu_verifikasi" \| "terverifikasi" \| "ditandai" |
| embedding   | vector(1536)| diisi Verification Agent, bukan frontend |
| created_at  | timestamptz | default now()                            |

## 2. Tabel Supabase: seed_data
| Kolom       | Tipe        | Keterangan                        |
|-------------|-------------|-------------------------------------|
| id          | uuid (pk)   | auto                               |
| location    | text        |                                     |
| time_period | text        | contoh: "dini_hari", "malam"       |
| incident_type | text      |                                     |
| source_url  | text        | wajib diisi, link berita/JPW       |

## 3. Tabel Supabase: risk_scores
| Kolom     | Tipe    | Keterangan                      |
|-----------|---------|----------------------------------|
| area      | text    |                                   |
| time_slot | text    |                                   |
| score     | float8  | 0-100                             |
| updated_at| timestamptz |                               |

## 4. API Contract: Verification Agent
POST /agents/verify
Request:  { "report_id": "uuid", "text": "string" }
Response: {
  "location": "string",
  "time": "string",
  "incident_type": "string",
  "cluster_id": "uuid | null",
  "flagged": boolean
}

## 5. API Contract: Risk Prediction Agent
GET /agents/risk?area=string&time_slot=string
Response: { "area": "string", "time_slot": "string", "score": number }

## 6. API Contract: Safe Route Advisor
POST /agents/route-check
Request:  { "origin": "string", "destination": "string", "departure_time": "string" }
Response: {
  "risk_level": "aman" | "waspada" | "berisiko_tinggi",
  "avoid_areas": ["string"]
}

## Catatan
- Semua response API pakai snake_case, bukan camelCase.
- Semua timestamp pakai format ISO 8601.
- Field yang belum ada datanya isi null, jangan dihapus dari response.
