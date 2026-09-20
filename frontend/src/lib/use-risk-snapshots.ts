"use client";

import { useEffect, useState } from "react";
import { fetchRiskHeatmap, type RiskHeatmap, type TimeBucket } from "@/lib/api";
import { TIME_BUCKETS } from "@/lib/time-buckets";

export type RiskSnapshots = Partial<Record<TimeBucket, RiskHeatmap>>;
export type SnapshotStatus = "loading" | "ready" | "error";

/**
 * Muat heatmap kelima bucket jam dari GET /risk/heatmap (5 permintaan kecil, di-cache
 * server). Dipakai Beranda (statistik & status kawasan) dan Peta Kerawanan, jadi angka
 * di kedua halaman selalu berasal dari sumber yang sama — tidak ada data hardcode/mock.
 *
 * `status` = "error" hanya kalau SEMUA bucket gagal; sebagian gagal tetap "ready" dengan
 * `error` berisi pesan pertama (bucket yang gagal tidak ada di `snapshots`).
 */
export function useRiskSnapshots() {
  const [snapshots, setSnapshots] = useState<RiskSnapshots>({});
  const [status, setStatus] = useState<SnapshotStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  // setState hanya di callback promise (bukan sinkron di badan efek); `cancelled`
  // mencegah update setelah komponen dilepas.
  useEffect(() => {
    let cancelled = false;
    Promise.allSettled(TIME_BUCKETS.map((item) => fetchRiskHeatmap(item.id))).then((results) => {
      if (cancelled) return;
      const loaded: RiskSnapshots = {};
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
      setError(firstError);
      setStatus(Object.keys(loaded).length === 0 ? "error" : "ready");
    });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  function reload() {
    setStatus("loading");
    setReloadToken((token) => token + 1);
  }

  return { snapshots, status, error, reload };
}
