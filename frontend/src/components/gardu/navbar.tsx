"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Menu, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Halaman-halaman publik yang sudah ada.
const LINKS = [
  { href: "/", label: "Beranda" },
  { href: "/lapor", label: "Lapor" },
  { href: "/peta", label: "Peta Kerawanan" },
  { href: "/rute", label: "Cek Rute" },
  { href: "/sumber-daya", label: "Sumber Daya" },
];

const EASE = [0.16, 1, 0.3, 1] as const;

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/30">
        <ShieldCheck aria-hidden="true" className="size-5 text-primary" />
      </span>
      <span className="text-lg font-bold tracking-wide text-foreground">GARDU</span>
    </Link>
  );
}

/**
 * Navbar tetap di atas (struktur dari referensi Diayu, gaya mengikuti token gardu-design):
 * transparan di puncak halaman, kaca buram setelah digulir, menu tumpuk di layar kecil.
 */
export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        scrolled || open ? "border-b border-border bg-background/80 backdrop-blur-xl" : "bg-transparent"
      )}
    >
      <nav aria-label="Navigasi utama" className="container-x flex h-16 items-center justify-between">
        <Logo />
        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative rounded-full px-4 py-2 text-sm transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 -z-10 rounded-full bg-primary/10 ring-1 ring-primary/25"
                    transition={{ duration: 0.3, ease: EASE }}
                  />
                )}
                {link.label}
              </Link>
            );
          })}
          {/* Moderasi: tombol outline terpisah, bukan bagian LINKS publik (REQ-NF-123) */}
          <Link
            href="/admin"
            className={cn(
              "ml-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground",
              "transition-colors hover:border-primary/40 hover:text-primary",
              pathname === "/admin" && "border-primary/40 text-primary"
            )}
          >
            Moderasi
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded-lg p-2 text-foreground md:hidden"
          aria-label={open ? "Tutup menu" : "Buka menu"}
          aria-expanded={open}
        >
          {open ? <X aria-hidden="true" className="size-6" /> : <Menu aria-hidden="true" className="size-6" />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="border-b border-border bg-background/95 backdrop-blur-xl md:hidden"
          >
            <div className="space-y-1 px-5 py-4">
              {[...LINKS, { href: "/admin", label: "Moderasi" }].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  aria-current={pathname === link.href ? "page" : undefined}
                  className={cn(
                    "block rounded-lg px-4 py-3 text-sm",
                    pathname === link.href ? "bg-primary/10 text-primary" : "text-foreground"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
