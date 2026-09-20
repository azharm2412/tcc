'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Reveal from '@/components/Reveal';
import RiskBadge from '@/components/RiskBadge';
import { getRiskScores, checkRoute } from '@/lib/risk';
import { PLACES } from '@/lib/gazetteer';
import { Place, RouteResult, LEVEL_STYLE } from '@/lib/types';
import { supabase, isMockMode } from '@/lib/supabase';

function Gauge({ score, level }: { score: number; level: keyof typeof LEVEL_STYLE }) {
  const style = LEVEL_STYLE[level];
  const r = 74;
  const circumference = Math.PI * r;
  const filled = (Math.min(score, 100) / 100) * circumference;

  return (
    <div className="relative mx-auto h-32 w-48">
      <svg viewBox="0 0 200 120" className="h-full w-full">
        <path d="M 26 110 A 74 74 0 0 1 174 110" fill="none" stroke="#1d2b24" strokeWidth="14" strokeLinecap="round" />
        <motion.path
          d="M 26 110 A 74 74 0 0 1 174 110"
          fill="none"
          stroke={style.hex}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - filled }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <motion.p
          key={score}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-4xl font-bold"
          style={{ color: style.hex }}
        >
          {score.toFixed(0)}
        </motion.p>
      </div>
    </div>
  );
}

const SUGGESTIONS: Record<string, string[]> = {
  aman: ['Kondisi rute relatif aman pada jam tersebut. Tetap jaga kewaspadaan standar.'],
  waspada: [
    'Hindari berhenti di tempat sepi atau penerangan minim.',
    'Pertimbangkan berangkat lebih awal atau menunggu hingga jam lebih ramai.',
    'Aktifkan berbagi lokasi live ke orang terdekat.',
  ],
  rawan: [
    'Sangat disarankan menunda perjalanan atau memilih waktu lain.',
    'Gunakan jalur alternatif yang lebih ramai & terang.',
    'Berpergian berkelompok dan hindari membawa barang mencolok.',
  ],
};

export default function RutePage() {
  const [origin, setOrigin] = useState<Place>(PLACES[0]);
  const [dest, setDest] = useState<Place>(PLACES[3]);
  const [departAt, setDepartAt] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<RouteResult | null>(null);
  const [geoMsg, setGeoMsg] = useState('');

  function useMyLocation() {
    if (!navigator.geolocation) {
      setGeoMsg('Browser tidak mendukung geolokasi.');
      return;
    }
    setGeoMsg('Mengambil lokasi...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({ name: 'Lokasi saya (GPS)', lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoMsg('');
      },
      () => setGeoMsg('Izin lokasi ditolak. Pilih area manual.')
    );
  }

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault();
    setChecking(true);
    setResult(null);

    const departDate = new Date(departAt);
    const hour = departDate.getHours();

    const scores = await getRiskScores(hour);
    const res = checkRoute(origin, dest, hour, scores);
    setResult(res);
    setChecking(false);

    if (!isMockMode && supabase) {
      supabase.from('route_checks').insert({
        origin_text: origin.name,
        destination_text: dest.name,
        depart_at: departDate.toISOString(),
        result: res as unknown as Record<string, unknown>,
      }).then(() => {});
    }
  }

  return (
    <div className="container-x min-h-screen pb-24 pt-32">
      <Reveal>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-400">Safe Route Advisor</p>
        <h1 className="mt-3 font-display text-4xl font-bold text-white">Cek rute sebelum berangkat.</h1>
        <p className="mt-2 max-w-xl text-zinc-500">
          AI memeriksa apakah rute melintasi zona berisiko tinggi pada jam keberangkatanmu.
        </p>
      </Reveal>

      <div className="mt-10 grid gap-6 lg:grid-cols-[380px_1fr]">
        <Reveal delay={0.1}>
          <form onSubmit={handleCheck} className="glass-card space-y-5 p-6">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-zinc-300">Titik asal</label>
                <button type="button" onClick={useMyLocation} className="text-xs font-medium text-emerald-400 hover:text-emerald-300">
                  Gunakan GPS saya
                </button>
              </div>
              <select
                value={origin.name}
                onChange={(e) => setOrigin(PLACES.find((p) => p.name === e.target.value) ?? origin)}
                className="input"
              >
                {PLACES.map((p) => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
                {origin.name === 'Lokasi saya (GPS)' && <option value={origin.name}>{origin.name}</option>}
              </select>
              {geoMsg && <p className="mt-1.5 text-xs text-amber-300">{geoMsg}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">Tujuan</label>
              <select
                value={dest.name}
                onChange={(e) => setDest(PLACES.find((p) => p.name === e.target.value) ?? dest)}
                className="input"
              >
                {PLACES.map((p) => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">Waktu keberangkatan</label>
              <input type="datetime-local" value={departAt} onChange={(e) => setDepartAt(e.target.value)} className="input" />
            </div>

            <button type="submit" disabled={checking} className="btn-primary w-full disabled:opacity-60">
              {checking ? (
                <>
                  <motion.span
                    className="h-4 w-4 rounded-full border-2 border-emerald-950/40 border-t-emerald-950"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                  Menganalisis rute...
                </>
              ) : (
                'Periksa Risiko Rute'
              )}
            </button>

            <p className="text-xs leading-relaxed text-zinc-600">
              Sistem menandai tingkat risiko di sepanjang rute — bukan mesin navigasi turn-by-turn.
            </p>
          </form>
        </Reveal>

        <Reveal delay={0.2}>
          <div className="glass-card flex h-full flex-col items-center justify-center p-8">
            <AnimatePresence mode="wait">
              {!result && !checking && (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-16 text-center">
                  <svg className="mx-auto text-zinc-700" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 20l-5.45-2.72A1 1 0 014 16.38V5.62a1 1 0 011.45-.9L9 7m0 13l6-3m-6 3V7m6 10l4.55 2.28a1 1 0 001.45-.9V8.62a1 1 0 00-.55-.9L15 5m0 12V5m0 0L9 7" />
                  </svg>
                  <p className="mt-4 text-sm text-zinc-500">
                    Isi form lalu tekan <span className="text-emerald-300">Periksa Risiko Rute</span>.
                  </p>
                </motion.div>
              )}

              {checking && (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center py-16">
                  <motion.span
                    className="h-10 w-10 rounded-full border-2 border-emerald-400/30 border-t-emerald-400"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                  <p className="mt-4 text-sm text-zinc-500">
                    Safe Route Advisor sedang memeriksa 24 titik sepanjang rute...
                  </p>
                </motion.div>
              )}

              {result && !checking && (
                <motion.div key="result" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full max-w-md">
                  <div className="text-center">
                    <RiskBadge level={result.status} />
                    <div className="mt-4">
                      <Gauge score={result.maxScore} level={result.status} />
                    </div>
                    <p className="mt-1 text-xs text-zinc-600">
                      Skor kerawanan tertinggi di sepanjang rute ({result.checkedSamples} titik diperiksa)
                    </p>
                  </div>

                  {result.hotspots.length > 0 && (
                    <div className="mt-8">
                      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                        Area yang sebaiknya dihindari
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {result.hotspots.map((h) => (
                          <span key={h.name} className="rounded-full border border-red-400/30 bg-red-400/10 px-3 py-1.5 text-xs text-red-300">
                            {h.name} - {h.score.toFixed(0)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-8">
                    <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Saran</p>
                    <ul className="mt-3 space-y-2">
                      {SUGGESTIONS[result.status].map((s) => (
                        <li key={s} className="flex gap-2.5 text-sm text-zinc-400">
                          <svg className="mt-0.5 shrink-0 text-emerald-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Reveal>
      </div>
    </div>
  );
}