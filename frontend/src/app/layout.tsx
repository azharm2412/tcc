import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { MotionConfig } from "motion/react";
import { Footer } from "@/components/gardu/footer";
import { Navbar } from "@/components/gardu/navbar";
import "./globals.css";

// Satu keluarga font untuk heading & body (skill gardu-design bagian 4).
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gardu",
  description:
    "Kesadaran komunitas & rute aman warga terhadap kejahatan jalanan (klitih) di Yogyakarta",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {/* reducedMotion="user": matikan animasi transform kalau OS user aktifkan prefers-reduced-motion */}
        <MotionConfig reducedMotion="user">
          <Navbar />
          {/* pt-16 = tinggi Navbar tetap; halaman yang punya hero menambah padding sendiri */}
          <main className="flex flex-1 flex-col pt-16">{children}</main>
          <Footer />
        </MotionConfig>
      </body>
    </html>
  );
}
