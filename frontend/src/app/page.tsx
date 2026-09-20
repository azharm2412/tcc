import type { Metadata } from "next";
import { Landing } from "@/components/gardu/landing";
import { currentBucketWib } from "@/lib/time-buckets";

export const metadata: Metadata = {
  title: "Gardu — Sistem Kesadaran Komunitas Yogyakarta",
  description:
    "Platform kesadaran komunitas & rute aman warga terhadap kejahatan jalanan (klitih) di Yogyakarta. Lapor anonim, pantau zona rawan, dan periksa rute sebelum berangkat.",
};

/*
 * Bucket jam "saat ini" dihitung PER REQUEST di server (force-dynamic), bukan
 * saat build, agar kartu status kawasan langsung menampilkan jam yang relevan
 * dan server/client memakai nilai yang sama saat hidrasi awal.
 */
export const dynamic = "force-dynamic";

export default function HomePage() {
  return <Landing initialBucket={currentBucketWib()} />;
}
