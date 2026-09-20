import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Client Supabase sisi browser, pakai anon key (dibatasi RLS).
 * Hanya untuk pembacaan data publik (mis. skor kerawanan, peta)
 * dan autentikasi panel moderasi.
 *
 * Penulisan laporan warga WAJIB lewat backend FastAPI agar tervalidasi
 * dan tidak menyentuh Supabase langsung dari client.
 *
 * `null` bila env vars belum dikonfigurasi — komponen harus memeriksa
 * sebelum memakai (tidak melempar error saat build agar next build berjalan
 * meski .env.local tidak ada di CI).
 */
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;
