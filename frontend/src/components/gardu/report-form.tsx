"use client";

import { useState, type FormEvent } from "react";
import * as motion from "motion/react-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitReport } from "@/lib/api";

type SubmitState = "idle" | "submitting" | "success" | "error";

const MIN_DESCRIPTION_LENGTH = 10;
const ENTRANCE_TRANSITION = { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const };

/**
 * Form Lapor Kejadian (REQ-F-001..004). Sengaja tidak punya field
 * nama/no HP/email — laporan sepenuhnya anonim (REQ-NF-120). Validasi
 * dasar di sini hanya untuk UX cepat; validasi yang mengikat tetap di
 * backend (lihat backend/app/schemas/report.py).
 */
export function ReportForm() {
  const [description, setDescription] = useState("");
  const [locationText, setLocationText] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [state, setState] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedDescription = description.trim();
    const trimmedLocation = locationText.trim();

    if (trimmedDescription.length < MIN_DESCRIPTION_LENGTH) {
      setState("error");
      setErrorMessage(`Deskripsi kejadian minimal ${MIN_DESCRIPTION_LENGTH} karakter.`);
      return;
    }
    if (!trimmedLocation) {
      setState("error");
      setErrorMessage("Lokasi kejadian wajib diisi.");
      return;
    }
    if (!occurredAt) {
      setState("error");
      setErrorMessage("Waktu kejadian wajib diisi.");
      return;
    }

    setState("submitting");
    setErrorMessage(null);

    try {
      await submitReport({
        description: trimmedDescription,
        location_text: trimmedLocation,
        occurred_at: new Date(occurredAt).toISOString(),
      });
      setState("success");
      setDescription("");
      setLocationText("");
      setOccurredAt("");
    } catch (error) {
      setState("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Laporan gagal dikirim, coba lagi."
      );
    }
  }

  if (state === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={ENTRANCE_TRANSITION}
      >
        <Card className="border-border bg-surface">
          <CardHeader>
            <CardTitle className="font-heading text-foreground">
              Laporan Terkirim
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Terima kasih. Laporan kamu tersimpan secara anonim dan akan ditinjau
              sistem.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => setState("idle")}>
              Kirim Laporan Lain
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={ENTRANCE_TRANSITION}
    >
      <Card className="border-border bg-surface">
        <CardHeader>
          <CardTitle className="font-heading text-foreground">
            Lapor Kejadian
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Laporan bersifat anonim — kami tidak meminta nama, nomor HP, atau
            identitas apa pun.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">Deskripsi Kejadian</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Ceritakan singkat apa yang terjadi..."
                rows={4}
                maxLength={2000}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="location">Lokasi</Label>
              <Input
                id="location"
                value={locationText}
                onChange={(event) => setLocationText(event.target.value)}
                placeholder="Nama jalan/area, mis. Jl. Kaliurang km 5"
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">
                Sertakan nama kecamatan atau &quot;Yogyakarta&quot; biar lokasi lebih
                akurat dipetakan
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="occurred-at">Waktu Kejadian</Label>
              <Input
                id="occurred-at"
                type="datetime-local"
                value={occurredAt}
                onChange={(event) => setOccurredAt(event.target.value)}
              />
            </div>

            {state === "error" && errorMessage && (
              <p role="alert" className="text-sm text-destructive">
                {errorMessage}
              </p>
            )}

            <Button
              type="submit"
              disabled={state === "submitting"}
              className="bg-primary text-primary-foreground transition-transform hover:scale-[1.02] hover:bg-primary-hover disabled:pointer-events-none disabled:opacity-60"
            >
              {state === "submitting" ? "Mengirim..." : "Kirim Laporan"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
