'use client';

import { motion } from 'framer-motion';
import RiskBadge from '@/components/RiskBadge';

export default function HeroCard() {
  return (
    <div className="glass-card animate-floaty p-6 shadow-glow">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-zinc-500">
          Status kawasan - malam ini
        </p>

        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute h-full w-full animate-ping rounded-full bg-red-400 opacity-70" />
          <span className="relative h-2.5 w-2.5 rounded-full bg-red-400" />
        </span>
      </div>

      <p className="mt-3 font-display text-2xl font-bold text-white">
        Ring Road Timur
      </p>

      <div className="mt-4 flex items-end gap-3">
        <motion.span
          className="font-display text-5xl font-bold text-amber-300"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            delay: 0.9,
            duration: 0.6,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          72
        </motion.span>

        <div className="pb-1.5">
          <RiskBadge level="waspada" />
        </div>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-zinc-800">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '72%' }}
          transition={{
            duration: 1.3,
            delay: 0.7,
            ease: 'easeOut',
          }}
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-red-400"
        />
      </div>

      <p className="mt-4 text-xs leading-relaxed text-zinc-500">
        Skor prediktif per jam, diperbarui oleh Risk Prediction Agent.
      </p>
    </div>
  );
}