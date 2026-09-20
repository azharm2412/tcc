'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Reveal from '@/components/Reveal';
import RiskMap from '@/components/RiskMap';
import RiskBadge from '@/components/RiskBadge';
import { getRiskScores } from '@/lib/risk';
import { RiskPoint } from '@/lib/types';
import { isMockMode } from '@/lib/supabase';

function hourLabel(h: number) {
  return `${String(h).padStart(2, '0')}:00`;
}

export default function PetaPage() {
  const [hour, setHour] = useState(() => new Date().getHours());
  const [scores, setScores] = useState<RiskPoint[]>([]);
  const [loadedHour, setLoadedHour] = useState<number | null>(null);

  const loading = loadedHour !== hour;

  useEffect(() => {
    let alive = true;

    getRiskScores(hour).then((data) => {
      if (!alive) return;

      setScores(data);
      setLoadedHour(hour);
    });

    return () => {
      alive = false;
    };
  }, [hour]);

  const sorted = useMemo(
    () => [...scores].sort((a, b) => b.score - a.score),
    [scores]
  );

  const top = sorted.slice(0, 3);

  const rawanCount = scores.filter(
    (s) => s.level === 'rawan'
  ).length;

  return (
    <div className="container-x min-h-screen pb-24 pt-32">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-400">
              Dasbor Publik
            </p>

            <h1 className="mt-3 font-display text-4xl font-bold text-white">
              Peta Kerawanan Yogyakarta
            </h1>

            <p className="mt-2 max-w-xl text-zinc-500">
              Heatmap skor kerawanan per area & jam. Geser untuk melihat
              kondisi pada jam berbeda.
            </p>
          </div>

          {isMockMode && (
            <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-300">
              Mode Demo - data simulasi
            </span>
          )}
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="glass-card mt-8 p-5">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Waktu simulasi</span>

            <span className="font-mono text-sm font-semibold text-emerald-300">
              {hourLabel(hour)}
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={23}
            value={hour}
            onChange={(e) => setHour(Number(e.target.value))}
            className="mt-3 w-full accent-emerald-400"
          />

          <div className="mt-1 flex justify-between text-[10px] text-zinc-600">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>23:00</span>
          </div>
        </div>
      </Reveal>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <Reveal delay={0.15}>
          <div className="relative">
            {loading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-ink/60 backdrop-blur-sm">
                <motion.span
                  className="h-8 w-8 rounded-full border-2 border-emerald-400/30 border-t-emerald-400"
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                />
              </div>
            )}

            <RiskMap points={scores} />

            <div className="absolute bottom-4 left-4 z-10 rounded-2xl border border-line bg-ink/85 px-4 py-3 backdrop-blur">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                Legenda
              </p>

              <div className="space-y-1.5 text-xs text-zinc-400">
                <span className="flex items-center gap-2">
                  <i className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  Aman (&lt;40)
                </span>

                <span className="flex items-center gap-2">
                  <i className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  Waspada (40-69)
                </span>

                <span className="flex items-center gap-2">
                  <i className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  Rawan (70+)
                </span>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.2}>
          <div className="space-y-4">
            <div className="glass-card p-5">
              <p className="text-xs uppercase tracking-widest text-zinc-500">
                Ringkasan {hourLabel(hour)}
              </p>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-line bg-ink/50 p-4">
                  <p className="font-display text-3xl font-bold text-red-300">
                    {rawanCount}
                  </p>

                  <p className="mt-1 text-xs text-zinc-500">
                    Zona rawan
                  </p>
                </div>

                <div className="rounded-2xl border border-line bg-ink/50 p-4">
                  <p className="font-display text-3xl font-bold text-emerald-300">
                    {scores.length}
                  </p>

                  <p className="mt-1 text-xs text-zinc-500">
                    Area terpantau
                  </p>
                </div>
              </div>
            </div>

            <div className="glass-card p-5">
              <p className="text-xs uppercase tracking-widest text-zinc-500">
                Paling rawan saat ini
              </p>

              <ul className="mt-3 space-y-3">
                {top.map((s, i) => (
                  <li
                    key={s.area_name}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-400/10 font-mono text-xs font-bold text-red-300 ring-1 ring-red-400/25">
                        {i + 1}
                      </span>

                      <span className="text-sm text-zinc-300">
                        {s.area_name}
                      </span>
                    </div>

                    <RiskBadge
                      level={s.level}
                      score={s.score}
                    />
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/5 p-5 text-xs leading-relaxed text-zinc-500">
              Data ditampilkan agregat per area — tanpa identitas individu
              mana pun (REQ-F-042). Skor bersifat prediktif, bukan klaim
              data resmi kepolisian.
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
