import { cn } from "@/lib/utils";

/**
 * Tingkat risiko sel (backend: rendah/sedang/tinggi) DAN status rute (backend:
 * aman/waspada/berisiko_tinggi) — dua kosakata dari API yang berbeda, satu gaya badge.
 */
export type RiskBadgeLevel =
  | "rendah"
  | "sedang"
  | "tinggi"
  | "aman"
  | "waspada"
  | "berisiko_tinggi";

const LEVELS: Record<RiskBadgeLevel, { label: string; color: string }> = {
  rendah: { label: "Rendah", color: "var(--risk-low)" },
  aman: { label: "Aman", color: "var(--risk-low)" },
  sedang: { label: "Sedang", color: "var(--risk-medium)" },
  waspada: { label: "Waspada", color: "var(--risk-medium)" },
  tinggi: { label: "Tinggi", color: "var(--risk-high)" },
  berisiko_tinggi: { label: "Berisiko Tinggi", color: "var(--risk-high)" },
};

/**
 * Badge tingkat risiko bergaya referensi Diayu (pil dengan titik + cincin), memakai token
 * `--risk-*` (tidak diubah oleh token-swap). Teks SELALU `--foreground`: `--risk-high` sebagai
 * warna teks hanya 4.1:1 (di bawah AA), jadi warna risiko hanya di titik, cincin, dan latar
 * tipis — dan makna tidak hanya lewat warna karena label teks selalu tampil (REQ-NF-141).
 */
export function RiskBadge({
  level,
  score,
  className,
}: {
  level: RiskBadgeLevel;
  score?: number;
  className?: string;
}) {
  const { label, color } = LEVELS[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-foreground",
        className
      )}
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} 45%, transparent)`,
      }}
    >
      <span
        aria-hidden="true"
        className="inline-block size-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
      {typeof score === "number" && (
        <span className="text-muted-foreground">· {score.toFixed(1)}</span>
      )}
    </span>
  );
}
