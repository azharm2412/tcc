"""Script manual: populate tabel risk_scores dari seed_data yang sudah ada.

Dijalankan sekali secara manual dari terminal (BUKAN endpoint API, BUKAN
dijadwalkan otomatis) - lihat instruksi run di bagian bawah file ini.

Pendekatan area sengaja SEDERHANA (bukan NLP): cocokkan kolom `location` di
seed_data terhadap daftar nama kabupaten/kota & kapanewon/kemantren resmi di
DIY (substring match, case-insensitive). Ini bukan pengenalan lokasi yang
canggih, cuma daftar statis nama wilayah administratif nyata.

Kombinasi area x time_period yang skornya 0 (tidak ada entri seed_data yang
cocok) SENGAJA tidak disimpan ke risk_scores, supaya tabel tidak penuh noise
(sesuai instruksi task).
"""

from backend.agents.risk_prediction import calculate_risk_score
from backend.db.queries import get_all_risk_scores, get_seed_data, upsert_risk_score

# Kabupaten/kota + kapanewon/kemantren resmi di DIY. Daftar statis, bukan
# NLP - kalau ada nama wilayah baru yang perlu dicek, tinggal ditambah di
# sini.
DIY_AREAS = [
    # Kabupaten/kota
    "Kota Yogyakarta",
    "Sleman",
    "Bantul",
    "Kulon Progo",
    "Gunungkidul",
    # Kemantren di Kota Yogyakarta
    "Danurejan",
    "Gedongtengen",
    "Gondokusuman",
    "Gondomanan",
    "Jetis",
    "Kotagede",
    "Kraton",
    "Mantrijeron",
    "Mergangsan",
    "Ngampilan",
    "Pakualaman",
    "Tegalrejo",
    "Umbulharjo",
    "Wirobrajan",
    # Kapanewon di Kabupaten Sleman
    "Berbah",
    "Cangkringan",
    "Depok",
    "Gamping",
    "Godean",
    "Kalasan",
    "Minggir",
    "Mlati",
    "Moyudan",
    "Ngaglik",
    "Ngemplak",
    "Pakem",
    "Prambanan",
    "Seyegan",
    "Tempel",
    "Turi",
    # Kapanewon di Kabupaten Bantul
    "Bambanglipuro",
    "Banguntapan",
    "Dlingo",
    "Imogiri",
    "Kasihan",
    "Kretek",
    "Pajangan",
    "Pandak",
    "Piyungan",
    "Pleret",
    "Pundong",
    "Sanden",
    "Sedayu",
    "Sewon",
    "Srandakan",
    # Kapanewon di Kabupaten Kulon Progo
    "Galur",
    "Girimulyo",
    "Kalibawang",
    "Kokap",
    "Lendah",
    "Nanggulan",
    "Panjatan",
    "Pengasih",
    "Samigaluh",
    "Sentolo",
    "Temon",
    "Wates",
    # Kapanewon di Kabupaten Gunungkidul
    "Girisubo",
    "Gedangsari",
    "Karangmojo",
    "Ngawen",
    "Nglipar",
    "Paliyan",
    "Panggang",
    "Patuk",
    "Playen",
    "Ponjong",
    "Purwosari",
    "Rongkop",
    "Saptosari",
    "Semanu",
    "Semin",
    "Tanjungsari",
    "Tepus",
    "Wonosari",
]


def _extract_unique_time_periods(seed_rows: list) -> list:
    return sorted({row["time_period"] for row in seed_rows if row.get("time_period")})


def populate_risk_scores() -> None:
    seed_rows = get_seed_data()
    time_periods = _extract_unique_time_periods(seed_rows)

    print(f"Seed data: {len(seed_rows)} baris, time_period yang ada: {time_periods}")
    print(f"Mengecek {len(DIY_AREAS)} area x {len(time_periods)} time_period...")
    print()

    saved = 0
    skipped = 0

    for area in DIY_AREAS:
        for time_slot in time_periods:
            result = calculate_risk_score(area, time_slot)
            score = result["score"]

            if score <= 0:
                skipped += 1
                continue

            upsert_risk_score(area, time_slot, score)
            saved += 1
            print(f"[OK]   {area} / {time_slot} -> score={score}")

    print()
    print(f"Selesai. {saved} kombinasi disimpan, {skipped} kombinasi dilewati (skor 0).")


def print_verification() -> None:
    """Query verifikasi: total baris & sebaran area di risk_scores sekarang."""
    all_scores = get_all_risk_scores()

    print()
    print("=== Verifikasi risk_scores ===")
    print(f"Total baris: {len(all_scores)}")
    print()
    print(f"{'area':<20} {'time_slot':<12} score")
    print("-" * 45)
    for row in all_scores:
        print(f"{row['area']:<20} {row['time_slot']:<12} {row['score']}")


if __name__ == "__main__":
    populate_risk_scores()
    print_verification()
