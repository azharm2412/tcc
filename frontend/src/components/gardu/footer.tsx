import Link from "next/link";

/** Footer situs (struktur dari referensi Diayu). Hanya menautkan halaman yang ada. */
export function Footer() {
  return (
    <footer className="border-t border-border bg-surface/60">
      <div className="container-x py-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <p className="text-lg font-bold tracking-wide text-foreground">GARDU</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Sistem Kesadaran Komunitas dan Rute Aman Warga terhadap Kejahatan Jalanan (Klitih) di
              Yogyakarta. Berorientasi pencegahan dan dukungan, bukan penghakiman.
            </p>
          </div>
          <div className="text-sm">
            <p className="mb-3 font-semibold text-foreground">Fitur</p>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link className="transition-colors hover:text-primary" href="/lapor">
                  Lapor Kejadian
                </Link>
              </li>
              <li>
                <Link className="transition-colors hover:text-primary" href="/peta">
                  Peta Kerawanan
                </Link>
              </li>
              <li>
                <Link className="transition-colors hover:text-primary" href="/rute">
                  Cek Rute Aman
                </Link>
              </li>
              <li>
                <Link className="transition-colors hover:text-primary" href="/sumber-daya">
                  Sumber Daya &amp; Kontak
                </Link>
              </li>
            </ul>
          </div>

        </div>
        <div className="mt-10 border-t border-border pt-6 text-xs text-muted-foreground">
          Prototipe TCC Vibe Code 2026 (UKM Triple-C, Universitas Trunojoyo Madura). Data awal bersifat
          simulasi dan anonim; tidak ada identitas pribadi yang disimpan.
        </div>
      </div>
    </footer>
  );
}
