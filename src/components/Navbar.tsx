'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const LINKS = [
  { href: '/', label: 'Beranda' },
  { href: '/lapor', label: 'Lapor' },
  { href: '/peta', label: 'Peta Kerawanan' },
  { href: '/rute', label: 'Cek Rute' },
  { href: '/sumber-daya', label: 'Sumber Daya' },
];

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10 ring-1 ring-emerald-400/30">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 2l7 3v5c0 5-3.2 8.6-7 10-3.8-1.4-7-5-7-10V5l7-3z" stroke="#34d399" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M8.5 12l2.4 2.4L15.7 9.6" stroke="#a7f3d0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="font-display text-lg font-bold tracking-wide text-white">GARDU</span>
    </Link>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled || open ? 'border-b border-line bg-ink/80 backdrop-blur-xl' : 'bg-transparent'
      }`}
    >
      <nav className="container-x flex h-16 items-center justify-between">
        <Logo />
        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`relative rounded-full px-4 py-2 text-sm transition-colors ${
                  active ? 'text-emerald-300' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 -z-10 rounded-full bg-emerald-400/10 ring-1 ring-emerald-400/25"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
                {l.label}
              </Link>
            );
          })}
          <Link
            href="/admin"
            className="ml-2 rounded-full border border-line px-4 py-2 text-sm text-zinc-400 transition hover:border-emerald-400/40 hover:text-emerald-300"
          >
            Moderasi
          </Link>
        </div>
        <button onClick={() => setOpen(!open)} className="p-2 text-zinc-300 md:hidden" aria-label="Menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-b border-line bg-ink/95 backdrop-blur-xl md:hidden"
          >
            <div className="space-y-1 px-5 py-4">
              {[...LINKS, { href: '/admin', label: 'Moderasi' }].map((l, i) => (
                <motion.div
                  key={l.href}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    href={l.href}
                    className={`block rounded-xl px-4 py-3 text-sm ${
                      pathname === l.href ? 'bg-emerald-400/10 text-emerald-300' : 'text-zinc-300'
                    }`}
                  >
                    {l.label}
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}