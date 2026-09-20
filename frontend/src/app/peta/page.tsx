import type { Metadata } from "next";
import { RiskDashboard } from "@/components/gardu/risk-dashboard";
import { currentBucketWib } from "@/lib/time-buckets";

export const metadata: Metadata = {
  title: "Peta Kerawanan — Gardu",
  description:
    "Peta publik tingkat kerawanan jalanan di Yogyakarta menurut rentang jam, tanpa perlu akun.",
};

// Bucket jam "saat ini" dihitung PER PERMINTAAN di server (bukan saat build), supaya tab
// awal selalu sesuai jam sekarang dan server/klien memakai nilai yang sama saat hidrasi.
export const dynamic = "force-dynamic";

export default function PetaKerawananPage() {
  return (
    <div className="flex flex-1 justify-center bg-background">
      <RiskDashboard initialBucket={currentBucketWib()} />
    </div>
  );
}
