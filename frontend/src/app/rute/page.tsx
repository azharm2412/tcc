import type { Metadata } from "next";
import { RouteChecker } from "@/components/gardu/route-checker";

export const metadata: Metadata = {
  title: "Cek Rute Aman — Gardu",
  description:
    "Periksa tingkat kerawanan rute perjalananmu di Yogyakarta pada jam berangkat, tanpa perlu akun.",
};

export default function CekRuteAmanPage() {
  return (
    <div className="flex flex-1 justify-center bg-background px-4 py-12">
      <div className="w-full max-w-lg">
        <RouteChecker />
      </div>
    </div>
  );
}
