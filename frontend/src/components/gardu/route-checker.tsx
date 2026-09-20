"use client";

import { useEffect, useState, type FormEvent } from "react";
import * as motion from "motion/react-client";
import { LocateFixed, ShieldAlert, ShieldCheck, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  checkRoute,
  type FlaggedArea,
  type RouteCheckPayload,
  type RouteCheckResponse,
  type RouteRiskLevel,
  type TimeBucket,
} from "@/lib/api";

type CheckState = "idle" | "loading" | "success" | "error";
type Coordinates = { latitude: number; longitude: number };

const MIN_PLACE_LENGTH = 2;
// REQ-NF-102: kalau respons melebihi 8 detik, tampilkan status "sedang diproses".
const SLOW_RESPONSE_MS = 8000;
const ENTRANCE_TRANSITION = { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const };
const STAGGER_SECONDS = 0.07;

// Indikator sederhana (REQ-F-031). Makna TIDAK hanya lewat warna: ikon + label teks
// juga membedakan tingkatnya. Warna memakai token risk-* (bukan merah alarm, REQ-NF-141).
const LEVELS: Record<
  RouteRiskLevel,
  { label: string; Icon: typeof ShieldCheck; color: string }
> = {
  aman: { label: "Aman", Icon: ShieldCheck, color: "var(--risk-low)" },
  waspada: { label: "Waspada", Icon: TriangleAlert, color: "var(--risk-medium)" },
  berisiko_tinggi: { label: "Berisiko Tinggi", Icon: ShieldAlert, color: "var(--risk-high)" },
};

const BUCKET_LABELS: Record<TimeBucket, string> = {
  dini_hari: "dini hari",
  pagi: "pagi",
  siang: "siang",
  sore: "sore",
  malam: "malam",
};

function describeLevel(result: RouteCheckResponse): string {
  if (result.risk_level === "berisiko_tinggi") {
    return "Rute ini melewati area dengan tingkat kerawanan tinggi pada jam tersebut.";
  }
  if (result.risk_level === "waspada") {
    return "Rute ini melewati area dengan tingkat kerawanan sedang pada jam tersebut.";
  }
  return result.areas_with_data === 0
    ? "Belum ada catatan kerawanan untuk area yang dilalui rute ini. Ini bukan jaminan keamanan."
    : "Tidak ada area berisiko sedang atau tinggi yang tercatat di sepanjang rute ini.";
}

function formatDeparture(isoTime: string): string {
  const formatted = new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(isoTime));
  return `${formatted} WIB`;
}

/**
 * Halaman Cek Rute Aman (REQ-F-030..032). Penilaian & validasi mengikat ada di
 * backend (backend/app/api/route.py); validasi di sini hanya untuk UX cepat.
 * Tidak ada identitas yang diminta, dan lokasi (termasuk GPS) hanya dikirim
 * untuk pemeriksaan ini — tidak disimpan.
 */
export function RouteChecker() {
  const [originText, setOriginText] = useState("");
  const [originCoords, setOriginCoords] = useState<Coordinates | null>(null);
  const [destinationText, setDestinationText] = useState("");
  const [departureAt, setDepartureAt] = useState("");
  const [departureIncomplete, setDepartureIncomplete] = useState(false);
  const [state, setState] = useState<CheckState>("idle");
  const [isSlow, setIsSlow] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationNote, setLocationNote] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<RouteCheckResponse | null>(null);

  // REQ-NF-102: penanda "sedang diproses" muncul kalau respons lebih dari 8 detik.
  useEffect(() => {
    if (state !== "loading") return;
    const timer = window.setTimeout(() => setIsSlow(true), SLOW_RESPONSE_MS);
    return () => window.clearTimeout(timer);
  }, [state]);

  function handleUseMyLocation() {
    setLocationNote(null);
    if (!("geolocation" in navigator)) {
      setLocationNote("Peramban ini tidak mendukung lokasi. Ketik nama tempat asal.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setOriginCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setOriginText("Lokasi saya (GPS)");
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
        setLocationNote(
          "Lokasi tidak dapat diakses. Izinkan akses lokasi di peramban, atau ketik nama tempat asal."
        );
      },
      { timeout: 8000, maximumAge: 60_000 }
    );
  }

  function handleOriginChange(value: string) {
    setOriginText(value);
    setOriginCoords(null); // mengetik manual membatalkan titik GPS sebelumnya
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Reset di AWAL: flag ini hanya boleh mencerminkan pengecekan waktu berangkat pada
    // submit TERAKHIR. Kalau di-reset setelah validasi asal/tujuan (yang return lebih
    // awal), flag lama tertinggal dan onChange bisa menghapus pesan error yang bukan miliknya.
    setDepartureIncomplete(false);

    const trimmedOrigin = originText.trim();
    const trimmedDestination = destinationText.trim();

    if (!originCoords && trimmedOrigin.length < MIN_PLACE_LENGTH) {
      setState("error");
      setErrorMessage("Titik asal wajib diisi (ketik nama tempat atau pakai lokasi saya).");
      return;
    }
    if (trimmedDestination.length < MIN_PLACE_LENGTH) {
      setState("error");
      setErrorMessage("Titik tujuan wajib diisi.");
      return;
    }

    // Tanggal/jam yang terisi SEBAGIAN: browser membiarkan `value` kosong tapi menandai
    // validity.badInput. Tanpa cek ini isian dianggap kosong dan diam-diam berjalan
    // sebagai "berangkat sekarang" (skor jam yang salah bisa tampil "aman").
    const departureInput = event.currentTarget.elements.namedItem("departure");
    if (departureInput instanceof HTMLInputElement && departureInput.validity.badInput) {
      setDepartureIncomplete(true);
      setState("error");
      setErrorMessage(
        "Waktu berangkat belum lengkap. Lengkapi tanggal dan jam, atau kosongkan semuanya untuk berangkat sekarang."
      );
      return;
    }

    const payload: RouteCheckPayload = {
      origin: originCoords ? { ...originCoords } : { text: trimmedOrigin },
      destination: { text: trimmedDestination },
      // Kosong = berangkat sekarang (backend memakai waktu saat ini).
      ...(departureAt ? { departure_time: new Date(departureAt).toISOString() } : {}),
    };

    setState("loading");
    setIsSlow(false);
    setErrorMessage(null);

    try {
      setResult(await checkRoute(payload, { includeNarrative: true }));
      setState("success");
    } catch (error) {
      setResult(null);
      setState("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Pemeriksaan rute gagal, coba lagi."
      );
    }
  }

  const isLoading = state === "loading";

  return (
    <div className="flex flex-col gap-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={ENTRANCE_TRANSITION}
      >
        <Card className="border-border bg-surface">
          <CardHeader>
            <CardTitle className="font-heading text-foreground">Cek Rute Aman</CardTitle>
            <CardDescription className="text-muted-foreground">
              Lihat tingkat kerawanan rute perjalananmu pada jam berangkat. Lokasi
              hanya dipakai untuk pemeriksaan ini dan tidak disimpan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="origin">Titik Asal</Label>
                <div className="flex gap-2">
                  <Input
                    id="origin"
                    value={originText}
                    onChange={(event) => handleOriginChange(event.target.value)}
                    placeholder="Nama tempat, mis. Gedongkuning, Kotagede"
                    maxLength={200}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleUseMyLocation}
                    disabled={isLocating || isLoading}
                    className="shrink-0"
                  >
                    <LocateFixed aria-hidden="true" />
                    {isLocating ? "Mencari..." : "Lokasi saya"}
                  </Button>
                </div>
                {locationNote && (
                  <p role="status" className="text-xs text-muted-foreground">
                    {locationNote}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="destination">Titik Tujuan</Label>
                <Input
                  id="destination"
                  value={destinationText}
                  onChange={(event) => setDestinationText(event.target.value)}
                  placeholder="Nama tempat, mis. Stasiun Tugu Yogyakarta"
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground">
                  Sertakan nama kecamatan atau &quot;Yogyakarta&quot; biar lokasi lebih
                  akurat dipetakan
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="departure">Waktu Berangkat</Label>
                <Input
                  id="departure"
                  type="datetime-local"
                  value={departureAt}
                  aria-invalid={departureIncomplete || undefined}
                  onChange={(event) => {
                    setDepartureAt(event.target.value);
                    if (departureIncomplete) {
                      // Isian sudah diperbaiki: bersihkan JUGA pesan errornya, bukan cuma
                      // aria-invalid, supaya teks error tidak tertinggal sampai submit berikutnya.
                      setDepartureIncomplete(false);
                      setState("idle");
                      setErrorMessage(null);
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Kosongkan kalau berangkat sekarang.
                </p>
              </div>

              {state === "error" && errorMessage && (
                <p role="alert" className="text-sm text-destructive">
                  {errorMessage}
                </p>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="bg-primary text-primary-foreground transition-transform hover:scale-[1.02] hover:bg-primary-hover disabled:pointer-events-none disabled:opacity-60"
              >
                {isLoading ? "Memeriksa rute..." : "Cek Rute"}
              </Button>

              <div aria-live="polite">
                {isLoading && isSlow && (
                  <p className="text-sm text-muted-foreground">
                    Masih diproses, mohon tunggu sebentar. Pemeriksaan pertama untuk
                    rute baru bisa lebih lama.
                  </p>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {state === "success" && result && <RouteResult result={result} />}
    </div>
  );
}

function RouteResult({ result }: { result: RouteCheckResponse }) {
  const level = LEVELS[result.risk_level];
  const originName = result.origin.place_name;
  const destinationName = result.destination.place_name;
  const hasScores = result.areas_with_data > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={ENTRANCE_TRANSITION}
      aria-live="polite"
    >
      <Card className="border-border bg-surface">
        <CardContent className="flex flex-col gap-5">
          {/* Indikator risiko rute (REQ-F-031): bilah warna + ikon + label teks. */}
          <div
            className="flex items-start gap-3 rounded-lg border border-border border-l-4 bg-background p-4"
            style={{ borderLeftColor: level.color }}
          >
            <level.Icon
              aria-hidden="true"
              className="mt-0.5 size-6 shrink-0"
              style={{ color: level.color }}
            />
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl text-foreground">{level.label}</h2>
              <p className="text-sm text-muted-foreground">{describeLevel(result)}</p>
              {hasScores && (
                <p className="text-sm text-muted-foreground">
                  Skor kerawanan tertinggi di rute:{" "}
                  <span className="font-heading text-lg text-accent">
                    {result.max_risk_score.toFixed(1)}
                  </span>{" "}
                  dari 10
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <p>
              Dari {originName ?? "titik asal"} ke {destinationName ?? "titik tujuan"} ·{" "}
              {result.distance_km.toFixed(1)} km · sekitar {result.duration_minutes} menit ·
              berangkat {formatDeparture(result.departure_time)}
            </p>
            {(originName || destinationName) && (
              <p className="text-xs">
                Lokasi dipetakan ke area {originName ?? "?"} dan {destinationName ?? "?"}. Kalau
                kurang tepat, tambahkan nama kecamatan pada isian lokasi.
              </p>
            )}
          </div>

          {result.narrative && (
            <div className="flex flex-col gap-1">
              <p className="text-sm leading-relaxed text-foreground">{result.narrative}</p>
              <p className="text-xs text-muted-foreground">
                Ringkasan otomatis oleh AI, berdasarkan data yang tersedia.
              </p>
            </div>
          )}

          <AreaList
            title="Area yang sebaiknya dihindari"
            hint="Melewati area berikut pada jam ini berisiko tinggi."
            areas={result.areas_to_avoid}
          />
          <AreaList
            title="Area yang perlu diwaspadai"
            hint="Tingkat kerawanan sedang pada jam ini."
            areas={result.areas_to_watch}
          />

          <p className="text-xs text-muted-foreground">
            Skor tersedia untuk {result.areas_with_data} dari {result.areas_checked} area yang
            dilalui. Area tanpa data belum tentu aman.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function AreaList({
  title,
  hint,
  areas,
}: {
  title: string;
  hint: string;
  areas: FlaggedArea[];
}) {
  if (areas.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <div>
        <h3 className="text-base text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <ul className="flex flex-col gap-2">
        {areas.map((area, index) => (
          <motion.li
            key={`${area.area_name}-${area.time_bucket}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...ENTRANCE_TRANSITION, delay: index * STAGGER_SECONDS }}
            className="flex items-baseline justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <span className="text-foreground">{area.place_name ?? area.area_name}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              skor {area.risk_score.toFixed(1)} · {BUCKET_LABELS[area.time_bucket]}
            </span>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
