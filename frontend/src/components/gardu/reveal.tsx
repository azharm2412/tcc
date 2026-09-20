"use client";

import * as motion from "motion/react-client";
import type { ReactNode } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Entrance saat elemen masuk viewport (dari referensi Diayu, disesuaikan ke aturan
 * motion gardu-design): fade + translateY 8px, 350ms, easing halus, sekali saja.
 * Stagger antar-item: pakai `delay={index * 0.07}` (60-80ms per item, jangan lebih).
 * Hormati prefers-reduced-motion lewat MotionConfig di layout.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.35, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}
