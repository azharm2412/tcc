"use client";

import { useEffect, useState } from "react";
import * as motion from "motion/react-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Reveal } from "@/components/gardu/reveal";
import { supabase } from "@/lib/supabase";

/*
 * force-dynamic: halaman ini memakai Supabase Auth (env vars runtime),
 * tidak boleh di-pre-render saat build (REQ-NF-123: akses hanya untuk anggota tim).
 */
export const dynamic = "force-dynamic";

/* =========================================================================
 * Tipe laporan (sinkron dengan skema Supabase: tabel `reports`).
 * TIDAK ada kolom identitas pelapor (REQ-NF-120, CLAUDE.md security).
 * ========================================================================= */
type ReportStatus =
  | "menunggu_verifikasi"
  | "terverifikasi"
  | "ditandai_duplikat"
  | "ditandai_hoaks";

interface Report {
  id: string;
  description: string;
  location_text: string;
  occurred_at: string;
  incident_type: string | null;
  status: ReportStatus;
  ai_summary: string | null;
  flagged_reason: string | null;
  created_at: string | null;
}

/* Badge gaya per status — mengikuti token gardu-design, bukan warna hardcode */
const STATUS_STYLE: Record<
  ReportStatus,
  { pill: string; label: string }
> = {
  menunggu_verifikasi: {
    pill: "border-risk-medium/30 bg-risk-medium/10 text-foreground",
    label: "Menunggu verifikasi",
  },
  terverifikasi: {
    pill: "border-primary/30 bg-primary/10 text-foreground",
    label: "Terverifikasi",
  },
  ditandai_duplikat: {
    pill: "border-accent/30 bg-accent/10 text-foreground",
    label: "Ditandai duplikat",
  },
  ditandai_hoaks: {
    pill: "border-destructive/30 bg-destructive/10 text-foreground",
    label: "Ditandai hoaks",
  },
};

const STAGGER = 0.05;
const ENTRANCE = { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const };

/* =========================================================================
 * Panel Moderasi (REQ-F-060/061).
 * Autentikasi via Supabase Auth (email+password) — hanya anggota tim (REQ-NF-123).
 * Update status langsung ke Supabase: RLS memastikan hanya user terautentikasi
 * yang bisa menulis ke tabel reports.
 * ========================================================================= */
export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [filter, setFilter] = useState<ReportStatus | "semua">("semua");

  /* Cek session yang sudah ada saat halaman dibuka */
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) =>
      setSession(!!s)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  /* Muat laporan setelah login berhasil */
  useEffect(() => {
    if (!session || !supabase) return;
    setIsLoadingReports(true);
    supabase
      .from("reports")
      .select(
        "id, description, location_text, occurred_at, incident_type, status, ai_summary, flagged_reason, created_at"
      )
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        setIsLoadingReports(false);
        if (!error && data) setReports(data as Report[]);
      });
  }, [session]);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase) {
      setLoginError("Supabase belum dikonfigurasi. Isi .env.local dengan URL dan anon key.");
      return;
    }
    setIsLoggingIn(true);
    setLoginError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setIsLoggingIn(false);
    if (error) {
      setLoginError(
        "Login gagal. Pastikan akun sudah di-invite di Supabase Auth."
      );
    }
  }

  /* Update status laporan (REQ-F-061: manual override) */
  async function updateStatus(id: string, newStatus: ReportStatus) {
    if (!supabase) return;
    // Optimistic update: ubah UI dulu, rollback kalau gagal
    setReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    );
    const { error } = await supabase
      .from("reports")
      .update({ status: newStatus })
      .eq("id", id);
    if (error) {
      // Rollback: muat ulang dari Supabase
      supabase
        .from("reports")
        .select(
          "id, description, location_text, occurred_at, incident_type, status, ai_summary, flagged_reason, created_at"
        )
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          if (data) setReports(data as Report[]);
        });
    }
  }

  const filtered =
    filter === "semua" ? reports : reports.filter((r) => r.status === filter);

  /* ---- Tampilan login ---- */
  if (!session) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={ENTRANCE}
          className="w-full max-w-sm"
        >
          <Card className="border-border bg-surface">
            <CardHeader>
              <CardTitle className="text-foreground">Panel Moderasi</CardTitle>
              <CardDescription className="text-muted-foreground">
                Khusus anggota tim — autentikasi via Supabase Auth (REQ-NF-123).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <input
                  id="admin-email"
                  type="email"
                  required
                  placeholder="Email tim"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  autoComplete="username"
                />
                <input
                  id="admin-password"
                  type="password"
                  required
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  autoComplete="current-password"
                />
                {loginError && (
                  <p role="alert" className="text-sm text-destructive">
                    {loginError}
                  </p>
                )}
                <Button
                  type="submit"
                  disabled={isLoggingIn}
                  className="bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
                >
                  {isLoggingIn ? "Masuk..." : "Masuk"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  /* ---- Tampilan panel moderasi ---- */
  const FILTER_OPTIONS: Array<{ value: ReportStatus | "semua"; label: string }> = [
    { value: "semua", label: "Semua" },
    { value: "menunggu_verifikasi", label: "Menunggu" },
    { value: "terverifikasi", label: "Terverifikasi" },
    { value: "ditandai_duplikat", label: "Duplikat" },
    { value: "ditandai_hoaks", label: "Hoaks" },
  ];

  return (
    <div className="container-x min-h-[calc(100vh-4rem)] pb-24 pt-16 lg:pt-20">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-primary">Internal</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground">
              Panel Moderasi
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Tinjau laporan yang ditandai AI, lalu putuskan statusnya secara manual
              (REQ-F-061).
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => supabase?.auth.signOut()}
            className="shrink-0"
          >
            Keluar
          </Button>
        </div>
      </Reveal>

      {/* Filter status */}
      <Reveal delay={0.07}>
        <div
          role="group"
          aria-label="Filter status laporan"
          className="mt-8 flex flex-wrap gap-2"
        >
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              aria-pressed={filter === opt.value}
              onClick={() => setFilter(opt.value)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                filter === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Reveal>

      {/* State: loading laporan */}
      {isLoadingReports && (
        <p role="status" className="mt-8 text-sm text-muted-foreground">
          Memuat laporan...
        </p>
      )}

      {/* State: tidak ada laporan */}
      {!isLoadingReports && filtered.length === 0 && (
        <Reveal delay={0.1}>
          <div className="glass-card mt-8 p-10 text-center text-sm text-muted-foreground">
            Tidak ada laporan pada filter ini.
          </div>
        </Reveal>
      )}

      {/* Daftar laporan */}
      {!isLoadingReports && filtered.length > 0 && (
        <div className="mt-6 space-y-4">
          {filtered.map((report, index) => {
            const statusStyle = STATUS_STYLE[report.status];
            return (
              <motion.div
                key={report.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...ENTRANCE, delay: Math.min(index, 6) * STAGGER }}
                className="glass-card p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  {/* Info laporan */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Badge status */}
                      <span
                        className={`inline-block rounded-full border px-3 py-1 text-[11px] font-semibold ${statusStyle.pill}`}
                      >
                        {statusStyle.label}
                      </span>
                      {report.incident_type && (
                        <span className="rounded-full border border-border px-3 py-1 text-[11px] text-muted-foreground">
                          {report.incident_type}
                        </span>
                      )}
                    </div>

                    <p className="mt-3 text-sm leading-relaxed text-foreground">
                      {report.description}
                    </p>

                    <p className="mt-2 text-xs text-muted-foreground">
                      {report.location_text} ·{" "}
                      {new Date(report.occurred_at).toLocaleString("id-ID", {
                        timeZone: "Asia/Jakarta",
                      })}
                    </p>

                    {/* Ringkasan AI + alasan flag */}
                    {(report.ai_summary || report.flagged_reason) && (
                      <div className="mt-3 rounded-lg border border-border bg-background/50 p-3 text-xs leading-relaxed">
                        {report.ai_summary && (
                          <p>
                            <span className="font-semibold text-primary">AI: </span>
                            <span className="text-muted-foreground">{report.ai_summary}</span>
                          </p>
                        )}
                        {report.flagged_reason && (
                          <p className="mt-1">
                            <span className="font-semibold text-destructive">Flag: </span>
                            <span className="text-muted-foreground">{report.flagged_reason}</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Tombol aksi (REQ-F-061: manual override) */}
                  <div className="flex shrink-0 flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => updateStatus(report.id, "terverifikasi")}
                      disabled={report.status === "terverifikasi"}
                      className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-primary/20 disabled:cursor-default disabled:opacity-50"
                    >
                      Setuju (verifikasi)
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStatus(report.id, "ditandai_duplikat")}
                      disabled={report.status === "ditandai_duplikat"}
                      className="rounded-lg border border-accent/30 bg-accent/10 px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-accent/20 disabled:cursor-default disabled:opacity-50"
                    >
                      Tandai duplikat
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStatus(report.id, "ditandai_hoaks")}
                      disabled={report.status === "ditandai_hoaks"}
                      className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-destructive/20 disabled:cursor-default disabled:opacity-50"
                    >
                      Tandai hoaks
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <p className="mt-10 max-w-3xl text-xs text-muted-foreground">
        Halaman ini hanya bisa diakses setelah login dengan akun yang sudah di-invite
        di Supabase Auth. Tidak ada data identitas pelapor yang ditampilkan — sistem
        bersifat anonim (REQ-NF-120).
      </p>
    </div>
  );
}
