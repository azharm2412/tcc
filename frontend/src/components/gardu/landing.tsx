"use client";

import Link from "next/link";
import * as motion from "motion/react-client";
import { BrainCircuit, FilePenLine, MapPinned, Plus, Route } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Reveal } from "@/components/gardu/reveal";
import { RiskBadge } from "@/components/gardu/risk-badge";
import type { RiskCell, TimeBucket } from "@/lib/api";
import { TIME_BUCKETS, describeBucketRange } from "@/lib/time-buckets";
import { useRiskSnapshots, type RiskSnapshots, type SnapshotStatus } from "@/lib/use-risk-snapshots";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;
const STAGGER_SECONDS = 0.07;

const FEATURES = [
  {
    title: "Pelaporan anonim",
    desc: "Laporkan indikasi kerawanan kurang dari 1 menit. Tanpa akun, tanpa identitas.",
    href: "/lapor",
    Icon: FilePenLine,
  },
  {
    title: "Peta kerawanan publik",
    desc: "Heatmap skor kerawanan per area dan rentang jam, tanpa login. Klik satu area untuk penjelasannya.",
    href: "/peta",
    Icon: MapPinned,
  },
  {
    title: "Cek rute aman",
    desc: "Masukkan asal, tujuan, dan jam berangkat. Sistem menandai area berisiko di sepanjang rute.",
    href: "/rute",
    Icon: Route,
  },
  {
    title: "Verifikasi dan klasterisasi AI",
    desc: "Laporan warga diekstrak, diberi embedding, lalu dikelompokkan dengan laporan serupa sebelum memengaruhi skor.",
    href: "/lapor",
    Icon: BrainCircuit,
  },
];

const AGENTS = [
  {
    name: "Report Verification Agent",
    role: "Ekstraksi dan klasterisasi laporan",
    desc: "Mengekstrak jenis kejadian dari teks bebas, membuat embedding vektor (768 dimensi), lalu mengelompokkan laporan serupa lewat kemiripan kosinus untuk menyaring duplikat.",
    tag: "Gemini + pgvector",
  },
  {
    name: "Risk Prediction Agent",
    role: "Skor kerawanan per area dan jam",
    desc: "Mengagregasi data awal dan laporan terverifikasi menjadi skor 0-10 per sel area dan rentang jam WIB, dengan pengali musiman menjelang dan selama Ramadan. Angkanya deterministik; Gemini hanya menjelaskan.",
    tag: "Skor deterministik",
  },
  {
    name: "Safe Route Advisor",
    role: "Peringatan sebelum berangkat",
    desc: "Mengambil rute dari Mapbox, memeriksa tiap ~250 m terhadap skor pada jam saat titik itu dilalui, lalu memberi status aman, waspada, atau berisiko tinggi beserta area yang perlu dihindari.",
    tag: "LangGraph + Mapbox",
  },
];

const STEPS = [
  { n: "01", title: "Warga melapor", desc: "Isi formulir singkat: lokasi, waktu, deskripsi. Sepenuhnya anonim." },
  { n: "02", title: "AI memverifikasi", desc: "Jenis kejadian diekstrak, laporan diklasterkan, duplikat ditandai." },
  { n: "03", title: "Skor diperbarui", desc: "Insiden terverifikasi memperbarui skor kerawanan area dan jam terkait." },
  { n: "04", title: "Komunitas terlindungi", desc: "Peta publik dan Cek Rute memandu warga menghindari area berisiko." },
];

/** Statistik BERASAL dari data heatmap asli (bukan angka tetap). */
function summarize(snapshots: RiskSnapshots) {
  const cells = TIME_BUCKETS.flatMap((bucket) => snapshots[bucket.id]?.cells ?? []);
  return {
    areas: new Set(cells.map((cell) => cell.area_name)).size,
    // Tiap insiden masuk tepat satu baris (area, jam), jadi penjumlahan = insiden yang dipakai skor.
    incidents: cells.reduce((sum, cell) => sum + cell.contributing_incident_count, 0),
    bucketsWithData: TIME_BUCKETS.filter((bucket) => (snapshots[bucket.id]?.cells.length ?? 0) > 0).length,
  };
}

type Focus = { cell: RiskCell; bucket: TimeBucket; isCurrentBucket: boolean };

/** Area berskor tertinggi di jam sekarang; kalau jam itu kosong, yang tertinggi di semua jam. */
function pickFocus(snapshots: RiskSnapshots, nowBucket: TimeBucket): Focus | null {
  const top = (bucket: TimeBucket) =>
    (snapshots[bucket]?.cells ?? []).reduce<RiskCell | null>(
      (best, cell) => (best === null || cell.risk_score > best.risk_score ? cell : best),
      null
    );

  const current = top(nowBucket);
  if (current) return { cell: current, bucket: nowBucket, isCurrentBucket: true };

  let best: Focus | null = null;
  for (const bucket of TIME_BUCKETS) {
    const cell = top(bucket.id);
    if (cell && (best === null || cell.risk_score > best.cell.risk_score)) {
      best = { cell, bucket: bucket.id, isCurrentBucket: false };
    }
  }
  return best;
}

function bucketLabel(bucket: TimeBucket): string {
  return TIME_BUCKETS.find((item) => item.id === bucket)?.label.toLowerCase() ?? bucket;
}

function formatDate(isoTime: string): string {
  return `${new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(isoTime))} WIB`;
}

function latestUpdate(snapshots: RiskSnapshots): string | null {
  const times = TIME_BUCKETS.map((bucket) => snapshots[bucket.id]?.updated_at).filter(
    (value): value is string => Boolean(value)
  );
  return times.length > 0 ? times.reduce((latest, time) => (time > latest ? time : latest)) : null;
}

function StatusCard({
  status,
  focus,
  nowBucket,
  updatedAt,
  onRetry,
}: {
  status: SnapshotStatus;
  focus: Focus | null;
  nowBucket: TimeBucket;
  updatedAt: string | null;
  onRetry: () => void;
}) {
  const percent = focus ? Math.min(100, Math.max(0, focus.cell.risk_score * 10)) : 0;

  return (
    <div className="glass-card p-6 shadow-glow">
      <p className="text-sm text-muted-foreground">
        Status kawasan{" "}
        <span className="text-foreground">
          {focus && !focus.isCurrentBucket ? `jam ${bucketLabel(focus.bucket)}` : `jam ${bucketLabel(nowBucket)}`}
        </span>
      </p>

      {status === "loading" && (
        <p role="status" className="mt-4 text-sm text-muted-foreground">
          Memuat data kerawanan...
        </p>
      )}

      {status === "error" && (
        <div className="mt-4 flex flex-col items-start gap-3">
          <p role="alert" className="text-sm text-destructive">
            Data kerawanan belum bisa dimuat.
          </p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Coba lagi
          </Button>
        </div>
      )}

      {status === "ready" && !focus && (
        <p className="mt-4 text-sm text-muted-foreground">
          Belum ada catatan kerawanan. Ini belum tentu berarti aman: data baru terkumpul dari data awal dan
          laporan terverifikasi.
        </p>
      )}

      {status === "ready" && focus && (
        <>
          {!focus.isCurrentBucket && (
            <p className="mt-2 text-xs text-muted-foreground">
              Belum ada catatan untuk jam {bucketLabel(nowBucket)}; menampilkan area tertinggi di semua jam.
            </p>
          )}
          <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{focus.cell.area_name}</p>
          <div className="mt-4 flex items-end gap-3">
            <motion.span
              className="text-5xl font-bold tracking-tight text-accent"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EASE, delay: 0.2 }}
            >
              {focus.cell.risk_score.toFixed(1)}
            </motion.span>
            <span className="pb-1.5 text-sm text-muted-foreground">dari 10</span>
            <div className="pb-1.5">
              <RiskBadge level={focus.cell.risk_level} />
            </div>
          </div>
          {/* Bilah skor: gradien risiko membentang di SELURUH lintasan, yang terisi sampai skor. */}
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
            {percent > 0 && (
              <motion.div
                className="h-full rounded-full"
                style={{
                  width: `${percent}%`,
                  transformOrigin: "left",
                  backgroundImage: "linear-gradient(90deg, var(--risk-low), var(--risk-medium), var(--risk-high))",
                  backgroundSize: `${(100 / percent) * 100}% 100%`,
                }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.6, ease: EASE, delay: 0.2 }}
              />
            )}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            {focus.cell.contributing_incident_count} insiden tercatat pada {describeBucketRange(focus.bucket)}.
            Skor dari data awal dan laporan terverifikasi
            {updatedAt ? `, diperbarui ${formatDate(updatedAt)}` : ""}.
          </p>
        </>
      )}
    </div>
  );
}

/**
 * Beranda (struktur hero + kartu status kawasan dari referensi Diayu). Semua angka —
 * statistik dan status kawasan — diturunkan dari GET /risk/heatmap lewat useRiskSnapshots.
 */
export function Landing({ initialBucket }: { initialBucket: TimeBucket }) {
  const { snapshots, status, reload } = useRiskSnapshots();
  const stats = summarize(snapshots);
  const focus = status === "ready" ? pickFocus(snapshots, initialBucket) : null;

  const statTiles = [
    { value: stats.areas, label: "Area terpantau" },
    { value: stats.incidents, label: "Insiden tercatat" },
    { value: `${stats.bucketsWithData}/${TIME_BUCKETS.length}`, label: "Rentang jam berdata" },
  ];

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden pb-20 pt-16 lg:pt-24">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute right-0 top-40 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.13]"
            style={{
              backgroundImage:
                "linear-gradient(color-mix(in srgb, var(--primary) 25%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--primary) 25%, transparent) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
              maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent)",
              WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent)",
            }}
          />
        </div>

        <div className="container-x relative grid items-center gap-14 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
                Sistem kesadaran komunitas · Yogyakarta
              </span>
            </Reveal>
            <Reveal delay={0.07}>
              <h1 className="mt-6 text-5xl font-bold leading-[1.05] sm:text-6xl lg:text-7xl">
                Jaga jalurmu,
                <br />
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  jaga Jogjanya.
                </span>
              </h1>
            </Reveal>
            <Reveal delay={0.14}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
                Gardu membantu warga dan mahasiswa membangun kesadaran situasional terhadap kejahatan
                jalanan (klitih): lapor anonim, pantau area berisiko dari data, dan periksa rute sebelum
                berangkat.
              </p>
            </Reveal>
            <Reveal delay={0.21}>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link
                  href="/lapor"
                  className={cn(
                    buttonVariants(),
                    "h-11 bg-primary px-6 text-sm font-semibold text-primary-foreground transition-shadow hover:bg-primary-hover hover:shadow-glow"
                  )}
                >
                  <Plus aria-hidden="true" />
                  Lapor Kejadian
                </Link>
                <Link href="/peta" className={cn(buttonVariants({ variant: "outline" }), "h-11 px-6 text-sm font-semibold")}>
                  Lihat Peta Kerawanan
                </Link>
              </div>
            </Reveal>
            <Reveal delay={0.28}>
              <dl className="mt-12 grid max-w-lg grid-cols-3 divide-x divide-border rounded-lg border border-border bg-surface/50 backdrop-blur">
                {statTiles.map((tile) => (
                  <div key={tile.label} className="px-5 py-4">
                    <dd className="text-2xl font-bold tracking-tight text-primary">
                      {status === "ready" ? tile.value : "–"}
                    </dd>
                    <dt className="mt-1 text-[11px] leading-snug text-muted-foreground">{tile.label}</dt>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>
          <Reveal delay={0.21}>
            <StatusCard
              status={status}
              focus={focus}
              nowBucket={initialBucket}
              updatedAt={latestUpdate(snapshots)}
              onRetry={reload}
            />
          </Reveal>
        </div>
      </section>

      {/* FITUR */}
      <section className="container-x py-20">
        <Reveal>
          <p className="text-sm font-medium text-primary">Fitur utama</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-bold sm:text-4xl">
            Satu platform, dari lapor sampai selamat sampai tujuan.
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, index) => (
            <Reveal key={feature.title} delay={Math.min(index, 4) * STAGGER_SECONDS}>
              <Link
                href={feature.href}
                className="group glass-card block h-full p-6 transition-shadow duration-300 hover:border-primary/30 hover:shadow-glow"
              >
                <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/25 transition-colors group-hover:bg-primary/20">
                  <feature.Icon aria-hidden="true" className="size-5 text-primary" />
                </span>
                <h3 className="mt-5 text-lg text-foreground">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.desc}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* AI AGENTS */}
      <section className="border-y border-border bg-surface/40 py-20">
        <div className="container-x">
          <Reveal>
            <p className="text-sm font-medium text-primary">Arsitektur AI</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-bold sm:text-4xl">Tiga AI Agent bekerja di balik layar.</h2>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              Setiap agent punya peran spesifik dan diorkestrasi sebagai alur yang dapat ditelusuri, bukan
              sekadar pemanggilan API yang tersebar.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {AGENTS.map((agent, index) => (
              <Reveal key={agent.name} delay={index * STAGGER_SECONDS}>
                <div className="glass-card h-full p-6">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary ring-1 ring-primary/25">
                      Agent {index + 1}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{agent.tag}</span>
                  </div>
                  <h3 className="mt-5 text-xl text-foreground">{agent.name}</h3>
                  <p className="mt-1 text-sm font-medium text-primary">{agent.role}</p>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{agent.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CARA KERJA */}
      <section className="container-x py-20">
        <Reveal>
          <p className="text-sm font-medium text-primary">Alur sistem</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Dari laporan menjadi peringatan.</h2>
        </Reveal>
        <ol className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step.n}>
              <Reveal delay={index * STAGGER_SECONDS} className="h-full">
                <div className="h-full rounded-lg border border-border bg-surface/50 p-6">
                  <span className="text-4xl font-bold text-primary/25">{step.n}</span>
                  <h3 className="mt-3 text-lg text-foreground">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      {/* ETIKA + CTA */}
      <section className="container-x pb-20">
        <Reveal>
          <div className="glass-card relative overflow-hidden p-10 text-center sm:p-14">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[520px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
            />
            <h2 className="relative text-3xl font-bold sm:text-4xl">
              Pencegahan,{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                bukan penghakiman.
              </span>
            </h2>
            <p className="relative mx-auto mt-4 max-w-2xl text-muted-foreground">
              Gardu secara sengaja tidak menyediakan fitur identifikasi, pelacakan, atau penamaan terduga
              pelaku. Fokus kami: keselamatan warga, rehabilitasi, dan dukungan, sesuai prinsip etika sistem.
            </p>
            <div className="relative mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/lapor"
                className={cn(
                  buttonVariants(),
                  "h-11 bg-primary px-6 text-sm font-semibold text-primary-foreground transition-shadow hover:bg-primary-hover hover:shadow-glow"
                )}
              >
                Mulai Melapor
              </Link>
              <Link href="/rute" className={cn(buttonVariants({ variant: "outline" }), "h-11 px-6 text-sm font-semibold")}>
                Cek Rute Aman
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
