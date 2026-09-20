import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PageLoader from '@/components/Loader';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const grotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-grotesk' });

export const metadata: Metadata = {
  title: 'Gardu - Peta Kerawanan & Rute Aman Yogyakarta',
  description:
    'Sistem Kesadaran Komunitas dan Rute Aman Warga terhadap Kejahatan Jalanan (Klitih) di Yogyakarta.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${inter.variable} ${grotesk.variable}`}>
      <body className="min-h-screen">
        <PageLoader />
        <Navbar />
        <main className="relative z-[2]">{children}</main>
        <Footer />
      </body>
    </html>
  );
}