import type { Metadata } from "next";
import { ReportForm } from "@/components/gardu/report-form";

export const metadata: Metadata = {
  title: "Lapor Kejadian — Gardu",
  description: "Laporkan indikasi kerawanan secara anonim, tanpa perlu akun.",
};

export default function LaporKejadianPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-lg">
        <ReportForm />
      </div>
    </div>
  );
}
