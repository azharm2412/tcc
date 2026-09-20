export type ReportStatus =
  | "menunggu_verifikasi"
  | "terverifikasi"
  | "ditandai_duplikat"
  | "ditandai_hoaks";

export type ReportPayload = {
  description: string;
  location_text: string;
  occurred_at: string;
};

export type ReportResponse = {
  id: string;
  status: ReportStatus;
  created_at: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

/**
 * Kirim laporan warga ke backend FastAPI (POST /reports). Validasi utama
 * tetap terjadi di server — lihat backend/app/api/reports.py — fungsi ini
 * hanya memanggil HTTP dan menerjemahkan error jadi pesan yang jelas.
 */
export async function submitReport(payload: ReportPayload): Promise<ReportResponse> {
  const response = await fetch(`${API_BASE_URL}/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      body && typeof body.detail === "string"
        ? body.detail
        : "Laporan gagal dikirim, coba lagi.";
    throw new Error(message);
  }

  return response.json();
}

export type RouteRiskLevel = "aman" | "waspada" | "berisiko_tinggi";
export type TimeBucket = "dini_hari" | "pagi" | "siang" | "sore" | "malam";

/** Satu titik rute: teks lokasi ATAU koordinat (mis. dari GPS). Koordinat menang bila keduanya ada. */
export type PlaceInput = {
  text?: string;
  latitude?: number;
  longitude?: number;
};

export type RouteCheckPayload = {
  origin: PlaceInput;
  destination: PlaceInput;
  departure_time?: string;
};

export type FlaggedArea = {
  area_name: string;
  place_name: string | null;
  latitude: number;
  longitude: number;
  time_bucket: TimeBucket;
  risk_score: number;
  risk_level: "sedang" | "tinggi";
};

export type RoutePoint = {
  latitude: number;
  longitude: number;
  place_name: string | null;
};

export type RouteCheckResponse = {
  risk_level: RouteRiskLevel;
  max_risk_score: number;
  areas_to_avoid: FlaggedArea[];
  areas_to_watch: FlaggedArea[];
  areas_checked: number;
  areas_with_data: number;
  origin: RoutePoint;
  destination: RoutePoint;
  distance_km: number;
  duration_minutes: number;
  departure_time: string;
  time_buckets: TimeBucket[];
  narrative: string | null;
};

export type RiskLevel = "rendah" | "sedang" | "tinggi";

/** Satu sel heatmap. Koordinat = pusat sel grid publik; label area netral (REQ-F-042). */
export type RiskCell = {
  area_name: string;
  latitude: number;
  longitude: number;
  risk_score: number;
  risk_level: RiskLevel;
  contributing_incident_count: number;
};

export type RiskHeatmap = {
  time_bucket: TimeBucket;
  cells: RiskCell[];
  updated_at: string | null;
};

export type RiskDetail = {
  area_name: string;
  time_bucket: TimeBucket;
  risk_score: number;
  risk_level: RiskLevel;
  contributing_incident_count: number;
  has_data: boolean;
  narrative: string | null;
};

const READ_TIMEOUT_MS = 15_000;

// Jam representatif tiap bucket WIB, dipakai untuk memilih bucket lewat parameter `at`
// (backend hanya memakai jamnya; tanggal diabaikan, tanpa zona waktu = WIB).
const BUCKET_REPRESENTATIVE_HOUR: Record<TimeBucket, string> = {
  dini_hari: "02",
  pagi: "08",
  siang: "13",
  sore: "16",
  malam: "21",
};

async function readJson<T>(url: string, failureMessage: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(READ_TIMEOUT_MS) });
  } catch {
    throw new Error("Tidak dapat terhubung ke layanan Gardu, periksa koneksi internet lalu coba lagi.");
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body && typeof body.detail === "string" ? body.detail : failureMessage);
  }
  return response.json();
}

/**
 * Semua sel skor untuk satu bucket jam (GET /risk/heatmap, REQ-F-040/041): publik,
 * tanpa login, satu permintaan untuk seluruh sel, tanpa Gemini.
 */
export function fetchRiskHeatmap(bucket: TimeBucket): Promise<RiskHeatmap> {
  return readJson<RiskHeatmap>(
    `${API_BASE_URL}/risk/heatmap?time_bucket=${bucket}`,
    "Data peta kerawanan gagal dimuat, coba lagi."
  );
}

/**
 * Detail SATU sel beserta penjelasan Gemini (GET /risk/score?include_narrative=true).
 * Hanya dipanggil saat pengguna membuka satu titik — bukan otomatis untuk semua sel.
 * `narrative` boleh null (Gemini tidak tersedia); angka skor tetap valid.
 */
export function fetchRiskDetail(cell: RiskCell, bucket: TimeBucket): Promise<RiskDetail> {
  const query = new URLSearchParams({
    lat: String(cell.latitude),
    lon: String(cell.longitude),
    at: `2000-01-01T${BUCKET_REPRESENTATIVE_HOUR[bucket]}:00:00`,
    include_narrative: "true",
  });
  return readJson<RiskDetail>(
    `${API_BASE_URL}/risk/score?${query.toString()}`,
    "Detail area gagal dimuat, coba lagi."
  );
}

const ROUTE_CHECK_TIMEOUT_MS = 30_000;

/**
 * Cek Rute Aman (POST /route/check, REQ-F-030..032). Validasi & penilaian tetap
 * di server — lihat backend/app/api/route.py. `includeNarrative` meminta
 * penjelasan Gemini (opsional; boleh null di respons, bukan error).
 * Melempar Error berpesan Indonesia yang aman ditampilkan ke pengguna.
 */
export async function checkRoute(
  payload: RouteCheckPayload,
  options: { includeNarrative?: boolean } = {}
): Promise<RouteCheckResponse> {
  const query = options.includeNarrative ? "?include_narrative=true" : "";

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/route/check${query}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(ROUTE_CHECK_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new Error("Pemeriksaan rute memakan waktu terlalu lama, coba lagi sebentar lagi.");
    }
    throw new Error("Tidak dapat terhubung ke layanan Gardu, periksa koneksi internet lalu coba lagi.");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    // 422 dari validasi Pydantic berupa array; pesan dari agen berupa string.
    const message =
      body && typeof body.detail === "string"
        ? body.detail
        : response.status === 422
          ? "Data rute belum lengkap atau tidak valid, periksa kembali isian kamu."
          : "Pemeriksaan rute gagal, coba lagi.";
    throw new Error(message);
  }

  return response.json();
}
