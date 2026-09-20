"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import * as motion from "motion/react-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskMap } from "@/components/gardu/risk-map";
import {
  fetchRiskDetail,
  fetchRiskHeatmap,
  type RiskCell,
  type RiskDetail,
  type RiskHeatmap,
  type RiskLevel,
  type TimeBucket,
} from "@/lib/api";
import { TIME_BUCKETS, describeBucketRange } from "@/lib/time-buckets";
import { cn } from "@/lib/utils";

type LoadStatus = "loading" | "ready" | "error";
type DetailState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; data: RiskDetail }
  | { status: "error"; message: string };

const ENTRANCE_TRANSITION = { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const };
const STAGGER_SECONDS = 0.07;
const EMPTY_CELLS: RiskCell[] = []; // referensi stabil supaya peta tidak menggambar ulang tanpa perlu

// Makna tingkat TIDAK hanya lewat warna: titik warna selalu disertai label teks (REQ-NF-141: netral).
const LEVELS: Record<RiskLevel, { label: string; color: string }> = {
  rendah: { label: "Rendah", color: "var(--risk-low)" },
  sedang: { label: "Sedang", color: "var(--risk-medium)" },
  tinggi: { label: "Tinggi", color: "var(--risk-high)" },
};

function formatUpdatedAt(isoTime: string): string {
  const formatted = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(isoTime));
  return `${formatted} WIB`;
}

/**
 * Dasbor peta kerawanan publik (REQ-F-040/041/042): heatmap Mapbox per rentang jam,
 * tanpa login. Hanya menampilkan area (sel grid) dan jam — tidak ada nama, foto, atau
 * identitas individu mana pun. Bila peta tidak tersedia (token/WebGL/jaringan), daftar
 * area tetap tampil sebagai cadangan (REQ-NF-111).
 */
export function RiskDashboard({ initialBucket }: { initialBucket: TimeBucket }) {
  const [bucket, setBucket] = useState<TimeBucket>(initialBucket);
  const [snapshots, setSnapshots] = useState<Partial<Record<TimeBucket, RiskHeatmap>>>({});
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<RiskCell | null>(null);
  const [detail, setDetail] = useState<DetailState>({ status: "idle" });
  const [mapProblem, setMapProblem] = useState<string | null>(
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN ? null : "Token peta belum dikonfigurasi."
  );
  const [reloadToken, setReloadToken] = useState(0);
  const detailRequestId = useRef(0);

  // Muat kelima bucket sekaligus (5 permintaan kecil, di-cache server): pergantian jam instan
  // dan tiap tab bisa menampilkan jumlah areanya. setState hanya di callback promise (bukan
  // sinkron di badan efek); `cancelled` mencegah update setelah komponen dilepas.
  useEffect(() => {
    let cancelled = false;
    Promise.allSettled(TIME_BUCKETS.map((item) => fetchRiskHeatmap(item.id))).then((results) => {
      if (cancelled) return;
      const loaded: Partial<Record<TimeBucket, RiskHeatmap>> = {};
      let firstError: string | null = null;
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          loaded[TIME_BUCKETS[index].id] = result.value;
        } else if (!firstError) {
          firstError =
            result.reason instanceof Error ? result.reason.message : "Data peta kerawanan gagal dimuat.";
        }
      });
      setSnapshots(loaded);
      setLoadError(firstError);
      setStatus(Object.keys(loaded).length === 0 ? "error" : "ready");
    });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  function handleRetry() {
    setStatus("loading");
    setReloadToken((token) => token + 1);
  }

  function handleBucketChange(next: TimeBucket) {
    if (next === bucket) return;
    setBucket(next);
    setSelected(null);
    setDetail({ status: "idle" });
  }

  // Detail SATU sel + narasi Gemini: hanya saat pengguna memilih sel, bukan untuk semua sel.
  function handleSelect(cell: RiskCell) {
    setSelected(cell);
    setDetail({ status: "loading" });
    const requestId = ++detailRequestId.current;
    fetchRiskDetail(cell, bucket)
      .then((data) => {
        if (requestId === detailRequestId.current) setDetail({ status: "ready", data });
      })
      .catch((error: unknown) => {
        if (requestId !== detailRequestId.current) return;
        setDetail({
          status: "error",
          message: error instanceof Error ? error.message : "Detail area gagal dimuat.",
        });
      });
  }

  function handleCloseDetail() {
    detailRequestId.current += 1; // abaikan respons yang masih di jalan
    setSelected(null);
    setDetail({ status: "idle" });
  }

  const current = snapshots[bucket];
  const cells = current?.cells ?? EMPTY_CELLS;
  const bucketLabel = TIME_BUCKETS.find((item) => item.id === bucket)?.label.toLowerCase() ?? bucket;
  const bucketsWithData = TIME_BUCKETS.filter((item) => (snapshots[item.id]?.cells.length ?? 0) > 0);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={ENTRANCE_TRANSITION}
        className="flex flex-col gap-2"
      >
        <h1 className="text-4xl text-foreground">Peta Kerawanan</h1>
        <p className="max-w-2xl text-muted-foreground">
          Gambaran tingkat kerawanan jalanan di Yogyakarta menurut rentang jam. Peta ini
          menunjukkan area dan waktu, bukan orang atau kelompok tertentu.
        </p>
      </motion.header>

      <div role="group" aria-label="Pilih rentang jam" className="flex flex-wrap gap-2">
        {TIME_BUCKETS.map((item) => {
          const count = snapshots[item.id]?.cells.length;
          const active = item.id === bucket;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              onClick={() => handleBucketChange(item.id)}
              className={cn(
                "rounded-lg border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface text-foreground hover:bg-muted"
              )}
            >
              <span className="block font-medium">{item.label}</span>
              <span className={cn("block text-xs", active ? "text-primary-foreground" : "text-muted-foreground")}>
                {describeBucketRange(item.id)} · {count === undefined ? "–" : `${count} area`}
              </span>
            </button>
          );
        })}
      </div>

      {status === "loading" && (
        <p role="status" className="text-sm text-muted-foreground">
          Memuat peta kerawanan...
        </p>
      )}

      {status === "error" && (
        <Card className="border-border bg-surface">
          <CardContent className="flex flex-col items-start gap-3">
            <p role="alert" className="text-sm text-destructive">
              {loadError ?? "Data peta kerawanan gagal dimuat."}
            </p>
            <Button variant="outline" onClick={handleRetry}>
              Coba lagi
            </Button>
          </CardContent>
        </Card>
      )}

      {status === "ready" && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="flex flex-col gap-3">
            {mapProblem ? (
              <Card className="border-border bg-surface">
                <CardContent className="flex flex-col gap-1">
                  <p className="text-foreground">Peta tidak dapat ditampilkan saat ini.</p>
                  <p className="text-sm text-muted-foreground">
                    {mapProblem} Daftar area kerawanan tetap tersedia di samping.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="relative h-[60vh] min-h-[420px] overflow-hidden rounded-lg border border-border bg-surface">
                <RiskMap
                  cells={cells}
                  selectedAreaName={selected?.area_name ?? null}
                  onSelect={handleSelect}
                  onUnavailable={setMapProblem}
                />
                {current && cells.length === 0 && (
                  <p className="pointer-events-none absolute left-3 top-3 max-w-xs rounded-lg border border-border bg-surface/95 p-3 text-sm text-foreground">
                    Belum ada catatan kerawanan untuk jam {bucketLabel}.
                  </p>
                )}
              </div>
            )}
            <Legend updatedAt={current?.updated_at ?? null} />
            {!current && (
              <p role="alert" className="text-sm text-destructive">
                {loadError ?? "Data untuk jam ini gagal dimuat."}{" "}
                <button type="button" onClick={handleRetry} className="underline underline-offset-4">
                  Coba lagi
                </button>
              </p>
            )}
          </div>

          <div className="flex flex-col gap-6">
            {selected && (
              <AreaDetail
                key={selected.area_name}
                cell={selected}
                bucket={bucket}
                detail={detail}
                onClose={handleCloseDetail}
              />
            )}
            <AreaList
              key={bucket}
              cells={cells}
              selectedAreaName={selected?.area_name ?? null}
              onSelect={handleSelect}
              emptyHint={
                current && cells.length === 0 ? (
                  <EmptyBucket
                    bucketLabel={bucketLabel}
                    alternatives={bucketsWithData.map((item) => ({
                      id: item.id,
                      label: item.label,
                      count: snapshots[item.id]?.cells.length ?? 0,
                    }))}
                    onPick={handleBucketChange}
                  />
                ) : null
              }
            />
          </div>
        </div>
      )}

      <p className="max-w-3xl text-xs text-muted-foreground">
        Skor dihitung dari data awal yang disusun tim (kejadian terdokumentasi, bersifat simulasi)
        dan laporan warga yang telah terverifikasi. Area tanpa catatan bukan berarti pasti aman.
        Peta tidak menampilkan nama, foto, atau identitas individu mana pun.
      </p>
    </div>
  );
}

function Legend({ updatedAt }: { updatedAt: string | null }) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
      <div className="flex items-center gap-2">
        <span>Kerawanan</span>
        <span
          aria-hidden="true"
          className="h-2 w-28 rounded-full"
          style={{ background: "linear-gradient(90deg, var(--risk-low), var(--risk-medium), var(--risk-high))" }}
        />
        <span>rendah ke tinggi</span>
      </div>
      {updatedAt && <span>Diperbarui {formatUpdatedAt(updatedAt)}</span>}
    </div>
  );
}

function LevelMarker({ level }: { level: RiskLevel }) {
  const { label, color } = LEVELS[level];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden="true" className="inline-block size-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function AreaDetail({
  cell,
  bucket,
  detail,
  onClose,
}: {
  cell: RiskCell;
  bucket: TimeBucket;
  detail: DetailState;
  onClose: () => void;
}) {
  const level = LEVELS[cell.risk_level];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={ENTRANCE_TRANSITION}
    >
      <Card className="border-border bg-surface">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="font-heading text-lg text-foreground">{cell.area_name}</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Tutup
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div
            className="flex items-baseline justify-between rounded-lg border border-border border-l-4 bg-background px-3 py-2"
            style={{ borderLeftColor: level.color }}
          >
            <span className="text-sm text-foreground">
              Kerawanan <LevelMarker level={cell.risk_level} />
            </span>
            <span className="text-sm text-muted-foreground">
              skor <span className="font-heading text-lg text-accent">{cell.risk_score.toFixed(1)}</span> dari 10
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {cell.contributing_incident_count} insiden tercatat (data awal dan laporan terverifikasi) pada
            rentang {describeBucketRange(bucket)}.
          </p>

          <div aria-live="polite">
            {detail.status === "loading" && (
              <p className="text-sm text-muted-foreground">Menyusun penjelasan...</p>
            )}
            {detail.status === "ready" && detail.data.narrative && (
              <div className="flex flex-col gap-1">
                <p className="text-sm leading-relaxed text-foreground">{detail.data.narrative}</p>
                <p className="text-xs text-muted-foreground">
                  Ringkasan otomatis oleh AI, berdasarkan data yang tersedia.
                </p>
              </div>
            )}
            {detail.status === "ready" && !detail.data.narrative && cell.risk_level !== "rendah" && (
              <p className="text-xs text-muted-foreground">Penjelasan otomatis belum tersedia saat ini.</p>
            )}
            {detail.status === "error" && (
              <p role="alert" className="text-xs text-destructive">
                {detail.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function EmptyBucket({
  bucketLabel,
  alternatives,
  onPick,
}: {
  bucketLabel: string;
  alternatives: { id: TimeBucket; label: string; count: number }[];
  onPick: (bucket: TimeBucket) => void;
}) {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <p className="text-muted-foreground">
        Belum ada catatan kerawanan untuk jam {bucketLabel}. Ini belum tentu berarti aman: data baru
        terkumpul dari data awal dan laporan terverifikasi.
      </p>
      {alternatives.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {alternatives.map((item) => (
            <Button key={item.id} variant="outline" size="sm" onClick={() => onPick(item.id)}>
              Lihat jam {item.label.toLowerCase()} ({item.count} area)
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

function AreaList({
  cells,
  selectedAreaName,
  onSelect,
  emptyHint,
}: {
  cells: RiskCell[];
  selectedAreaName: string | null;
  onSelect: (cell: RiskCell) => void;
  emptyHint: ReactNode;
}) {
  return (
    <section aria-labelledby="area-list-title" className="flex flex-col gap-2">
      <h2 id="area-list-title" className="text-lg text-foreground">
        Daftar area
      </h2>
      {cells.length === 0 ? (
        emptyHint
      ) : (
        <ul className="flex flex-col gap-2">
          {cells.map((cell, index) => {
            const active = cell.area_name === selectedAreaName;
            return (
              <motion.li
                key={cell.area_name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...ENTRANCE_TRANSITION, delay: Math.min(index, 8) * STAGGER_SECONDS }}
              >
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSelect(cell)}
                  className={cn(
                    "flex w-full items-baseline justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "border-ring bg-muted" : "border-border bg-surface hover:bg-muted"
                  )}
                >
                  <span className="text-foreground">{cell.area_name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    <LevelMarker level={cell.risk_level} /> · {cell.risk_score.toFixed(1)}
                  </span>
                </button>
              </motion.li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
