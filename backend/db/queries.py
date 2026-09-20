"""Query helper dasar untuk tabel Supabase Gardu.

Skema kolom mengikuti docs/contracts.md — jangan ubah tanpa update kontrak.
"""

from datetime import datetime, timezone
from typing import Optional

from backend.db.supabase_client import supabase


class DBQueryError(Exception):
    """Dilempar saat query ke Supabase gagal, dengan pesan yang jelas."""


def insert_report(data: dict) -> dict:
    """Insert satu baris ke tabel reports. `data` mengikuti kolom di
    docs/contracts.md (mis. description, location, lat, lng, reported_at).
    Jangan sertakan identitas pelapor (nama, no HP, akun medsos)."""
    try:
        response = supabase.table("reports").insert(data).execute()
    except Exception as exc:
        raise DBQueryError(f"Gagal insert ke tabel reports: {exc}") from exc

    if not response.data:
        raise DBQueryError(f"Insert ke tabel reports tidak mengembalikan data: {response}")

    return response.data[0]


def get_seed_data() -> list:
    """Ambil semua baris dari tabel seed_data."""
    try:
        response = supabase.table("seed_data").select("*").execute()
    except Exception as exc:
        raise DBQueryError(f"Gagal ambil data dari tabel seed_data: {exc}") from exc

    return response.data


def get_risk_score(area: str, time_slot: str) -> Optional[dict]:
    """Ambil skor risiko untuk satu area + time_slot dari tabel risk_scores.
    Return None kalau belum ada skor untuk kombinasi tersebut."""
    try:
        response = (
            supabase.table("risk_scores")
            .select("*")
            .eq("area", area)
            .eq("time_slot", time_slot)
            .execute()
        )
    except Exception as exc:
        raise DBQueryError(
            f"Gagal ambil risk score untuk area={area!r}, time_slot={time_slot!r}: {exc}"
        ) from exc

    if not response.data:
        return None

    return response.data[0]


def upsert_risk_score(area: str, time_slot: str, score: float) -> dict:
    """Simpan/update skor risiko untuk satu area + time_slot di tabel
    risk_scores. Primary key tabel ini adalah (area, time_slot), jadi
    dipanggil ulang untuk area/time_slot yang sama akan meng-update baris
    yang sudah ada, bukan bikin duplikat."""
    row = {
        "area": area,
        "time_slot": time_slot,
        "score": score,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        response = (
            supabase.table("risk_scores")
            .upsert(row, on_conflict="area,time_slot")
            .execute()
        )
    except Exception as exc:
        raise DBQueryError(
            f"Gagal upsert risk score untuk area={area!r}, time_slot={time_slot!r}: {exc}"
        ) from exc

    if not response.data:
        raise DBQueryError(f"Upsert ke tabel risk_scores tidak mengembalikan data: {response}")

    return response.data[0]
