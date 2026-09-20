import type { Metadata } from "next";
import { Reveal } from "@/components/gardu/reveal";

export const metadata: Metadata = {
  title: "Sumber Daya & Kontak — Gardu",
  description:
    "Akses cepat ke kontak resmi satgas kejahatan jalanan, layanan pengaduan, dan program rehabilitasi remaja di Yogyakarta.",
};

/*
 * Data kontak resmi (REQ-F-050). Konten statis, tidak ada input pengguna,
 * tidak ada fetch ke backend (sesuai SRS bagian 5.5). Semua konten disusun
 * dengan nada suportif dan preventif, bukan punitif (REQ-F-051).
 */
interface Resource {
  category: "Darurat" | "Pengaduan" | "Rehabilitasi" | "Pemantau Independen";
  title: string;
  contact: string;
  description: string;
}

const RESOURCES: Resource[] = [
  {
    category: "Darurat",
    title: "Call Center Polri",
    contact: "110",
    description:
      "Layanan darurat kepolisian 24 jam. Gunakan untuk kondisi yang mengancam keselamatan jiwa.",
  },
  {
    category: "Darurat",
    title: "PSC 112 DIY",
    contact: "112",
    description:
      "Pusat panggilan darurat terpadu Daerah Istimewa Yogyakarta untuk kecelakaan, bencana, dan kedaruratan.",
  },
  {
    category: "Pengaduan",
    title: "Satpol PP DIY",
    contact: "(0274) 512000 / 112",
    description:
      "Pengaduan ketertiban & keamanan wilayah, termasuk kejahatan jalanan. Tersedia juga layanan aduan masyarakat via Geoportal DIY.",
  },
  {
    category: "Pengaduan",
    title: "Hotline KemenPPPA 129",
    contact: "129",
    description:
      "Layanan pengaduan perlindungan perempuan & anak — relevan bila korban adalah anak atau remaja.",
  },
  {
    category: "Rehabilitasi",
    title: "Dinas Sosial DIY",
    contact: "(0274) 512211",
    description:
      "Koordinasi program rehabilitasi sosial, termasuk pendampingan remaja yang terlibat kejahatan jalanan.",
  },
  {
    category: "Rehabilitasi",
    title: "Balai Rehabilitasi Sosial Anak",
    contact: "KemenSos RI",
    description:
      "Layanan pembinaan & rehabilitasi sosial bagi anak yang terlibat tindak kekerasan atau kejahatan.",
  },
  {
    category: "Pemantau Independen",
    title: "Jogja Police Watch (JPW)",
    contact: "Kanal media sosial JPW",
    description:
      "Lembaga pemantau independen yang rutin mencatat dan merilis data kasus kejahatan jalanan di DIY — salah satu sumber seed data Gardu.",
  },
];

/* Warna badge per kategori. Mengikuti token gardu-design: tidak pakai warna
 * default shadcn; warna risiko (--risk-*) tidak dipakai di sini karena kategori
 * ini bukan tingkat bahaya, melainkan jenis layanan. */
const CATEGORY_STYLE: Record<Resource["category"], { pill: string; dot: string }> = {
  Darurat: {
    pill: "border-destructive/30 bg-destructive/10 text-foreground",
    dot: "bg-destructive",
  },
  Pengaduan: {
    pill: "border-risk-medium/30 bg-risk-medium/10 text-foreground",
    dot: "bg-risk-medium",
  },
  Rehabilitasi: {
    pill: "border-primary/30 bg-primary/10 text-foreground",
    dot: "bg-primary",
  },
  "Pemantau Independen": {
    pill: "border-accent/30 bg-accent/10 text-foreground",
    dot: "bg-accent",
  },
};

export default function SumberDayaPage() {
  return (
    <div className="container-x min-h-[calc(100vh-4rem)] pb-24 pt-16 lg:pt-20">
      <Reveal>
        <p className="text-sm font-medium text-primary">Sumber Daya &amp; Kontak</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">
          Siapa yang bisa dihubungi?
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Akses cepat ke kontak resmi satgas kejahatan jalanan, layanan pengaduan, dan
          program rehabilitasi remaja. Gardu berorientasi pada pencegahan dan dukungan,
          bukan penghakiman.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {RESOURCES.map((resource, index) => {
          const style = CATEGORY_STYLE[resource.category];
          return (
            <Reveal key={resource.title} delay={Math.min(index, 6) * 0.06}>
              <div className="glass-card h-full p-6 transition-shadow duration-300 hover:shadow-glow">
                {/* Badge kategori: titik warna + label; warna hanya di titik (kontras AA) */}
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${style.pill}`}
                >
                  <span aria-hidden="true" className={`size-1.5 rounded-full ${style.dot}`} />
                  {resource.category}
                </span>
                <h2 className="mt-4 text-lg font-semibold text-foreground">
                  {resource.title}
                </h2>
                <p className="mt-1 font-mono text-sm font-semibold text-primary">
                  {resource.contact}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {resource.description}
                </p>
              </div>
            </Reveal>
          );
        })}
      </div>

      <Reveal delay={0.3}>
        <div className="mt-10 rounded-lg border border-risk-medium/25 bg-risk-medium/5 p-6 text-sm leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">Catatan:</span>{" "}
          daftar kontak perlu diverifikasi ulang menjelang presentasi. Prinsip sistem:
          tidak ada penamaan, pelacakan, atau tindakan main hakim sendiri terhadap
          terduga pelaku.
        </div>
      </Reveal>
    </div>
  );
}
