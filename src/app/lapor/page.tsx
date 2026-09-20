'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Reveal from '@/components/Reveal';
import { supabase, isMockMode } from '@/lib/supabase';
import { simulateVerification } from '@/lib/ai';
import { PLACES } from '@/lib/gazetteer';

const INCIDENT_TYPES = [
  'Pencurian dengan kekerasan',
  'Pembacokan',
  'Penodongan',
  'Kejar-kejaran',
  'Pencurian kendaraan',
  'Penyerangan kelompok',
  'Lainnya',
];

export default function LaporPage() {
  const [description, setDescription] = useState('');
  const [locationText, setLocationText] = useState(PLACES[0].name);
  const [incidentType, setIncidentType] = useState(INCIDENT_TYPES[0]);
  const [occurredAt, setOccurredAt] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [error, setError] = useState('');
  const [phase, setPhase] = useState<'form' | 'sending' | 'done'>('form');

  const selectedPlace = PLACES.find((p) => p.name === locationText);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (description.trim().length < 20) {
      setError('Deskripsi minimal 20 karakter agar AI dapat memverifikasi laporan (REQ-F-004).');
      return;
    }
    if (!locationText.trim()) {
      setError('Lokasi kejadian wajib diisi.');
      return;
    }

    setPhase('sending');

    // Simulasi Report Verification Agent
    const verification = simulateVerification(description);
    const finalType =
      verification.incident_type !== 'lainnya'
        ? verification.incident_type
        : incidentType.toLowerCase();

    if (!isMockMode && supabase) {
      const { error: dbError } = await supabase.from('reports').insert({
        description: description.trim(),
        location_text: locationText.trim(),
        location: selectedPlace ? `(${selectedPlace.lng},${selectedPlace.lat})` : null,
        occurred_at: new Date(occurredAt).toISOString(),
        incident_type: finalType,
        ai_summary: verification.ai_summary,
        flagged_reason: verification.flagged_reason,
        // embedding: verification.embedding, // aktifkan bila pipeline embedding jalan
      });

      if (dbError) {
        setError('Gagal mengirim laporan. Coba lagi dalam beberapa saat.');
        setPhase('form');
        return;
      }
    }

    setTimeout(() => setPhase('done'), 1200);
  }

  function reset() {
    setDescription('');
    setError('');
    setPhase('form');
  }

  return (
    <div className="container-x min-h-screen pb-24 pt-32">
      <div className="mx-auto max-w-3xl">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-400">Lapor Kejadian</p>
          <h1 className="mt-3 font-display text-4xl font-bold text-white">Ceritakan apa yang kamu lihat.</h1>
          <p className="mt-3 text-zinc-500">
            Laporan bersifat <span className="text-emerald-300">anonim</span>. Tidak ada nama, nomor
            telepon, atau akun yang disimpan — sistem sengaja dirancang melindungi privasimu.
          </p>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="glass-card mt-10 p-6 sm:p-8">
            <AnimatePresence mode="wait">
              {phase === 'done' ? (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-10 text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
                    className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/10 ring-1 ring-emerald-400/30"
                  >
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
                  </motion.div>
                  <h2 className="mt-5 font-display text-2xl font-bold text-white">Laporan diterima</h2>
                  <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
                    Terima kasih. Laporanmu masuk antrean verifikasi AI dan akan
                    diklasterkan dengan laporan lain di sekitar lokasi & waktu yang sama.
                  </p>
                  <button onClick={reset} className="btn-ghost mt-6 cursor-pointer">
                    Kirim laporan lain
                  </button>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit}
                  className="space-y-6"
                >
                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-300">Jenis kejadian</label>
                    <select value={incidentType} onChange={(e) => setIncidentType(e.target.value)} className="input">
                      {INCIDENT_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-300">Deskripsi kejadian</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      placeholder="Contoh: Ada kelompok remaja menodong pengendara motor di dekat Tugu, sekitar jam setengah dua malam tadi..."
                      className="input resize-none"
                    />
                    <div className="mt-1.5 flex justify-between text-xs">
                      <span className={description.trim().length < 20 ? 'text-zinc-600' : 'text-emerald-400'}>
                        Minimal 20 karakter
                      </span>
                      <span className="text-zinc-600">{description.length}</span>
                    </div>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-zinc-300">Lokasi kejadian</label>
                      <select value={locationText} onChange={(e) => setLocationText(e.target.value)} className="input">
                        {PLACES.map((p) => (
                          <option key={p.name} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-zinc-300">Perkiraan waktu kejadian</label>
                      <input
                        type="datetime-local"
                        value={occurredAt}
                        onChange={(e) => setOccurredAt(e.target.value)}
                        className="input"
                      />
                    </div>
                  </div>

                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300"
                    >
                      {error}
                    </motion.p>
                  )}

                  <button type="submit" disabled={phase === 'sending'} className="btn-primary w-full disabled:opacity-60 cursor-pointer">
                    {phase === 'sending' ? (
                      <>
                        <motion.span
                          className="h-4 w-4 rounded-full border-2 border-emerald-950/40 border-t-emerald-950"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                        />
                        Mengirim...
                      </>
                    ) : (
                      'Kirim Laporan Anonim'
                    )}
                  </button>

                  <p className="text-center text-xs text-zinc-600">
                    {isMockMode
                      ? 'Mode Demo: laporan tidak dikirim ke server. Isi env Supabase untuk mengaktifkan penyimpanan.'
                      : 'Laporan tersimpan sebagai "menunggu verifikasi" dan diproses AI di latar belakang.'}
                  </p>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </Reveal>
      </div>
    </div>
  );
}