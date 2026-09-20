import type { TimeBucket } from "@/lib/api";

/**
 * Lima bucket jam WIB. HARUS identik dengan TIME_BUCKET_HOURS di
 * backend/app/agents/risk_agent.py (jam mulai inklusif, jam selesai eksklusif).
 */
export const TIME_BUCKETS: ReadonlyArray<{
  id: TimeBucket;
  label: string;
  startHour: number;
  endHour: number;
}> = [
  { id: "dini_hari", label: "Dini hari", startHour: 0, endHour: 5 },
  { id: "pagi", label: "Pagi", startHour: 5, endHour: 11 },
  { id: "siang", label: "Siang", startHour: 11, endHour: 15 },
  { id: "sore", label: "Sore", startHour: 15, endHour: 18 },
  { id: "malam", label: "Malam", startHour: 18, endHour: 24 },
];

export function describeBucketRange(bucket: TimeBucket): string {
  const found = TIME_BUCKETS.find((item) => item.id === bucket);
  if (!found) return bucket;
  const pad = (hour: number) => String(hour).padStart(2, "0");
  return `${pad(found.startHour)}.00-${pad(found.endHour)}.00 WIB`;
}

/** Bucket jam untuk waktu `now` di zona WIB (Asia/Jakarta), terlepas dari zona waktu perangkat/server. */
export function currentBucketWib(now: Date = new Date()): TimeBucket {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hourCycle: "h23",
      timeZone: "Asia/Jakarta",
    }).format(now)
  );
  const found = TIME_BUCKETS.find((item) => hour >= item.startHour && hour < item.endHour);
  return found ? found.id : "malam";
}
