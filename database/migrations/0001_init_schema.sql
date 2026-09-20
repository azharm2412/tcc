-- Gardu — initial schema
-- Sesuai docs/contracts.md (jangan ubah tanpa diskusi tim, lihat CLAUDE.md aturan #1-2)

create extension if not exists vector;
create extension if not exists pgcrypto; -- untuk gen_random_uuid()

-- 1. reports
-- Tidak menyimpan identitas pelapor (nama, no HP, akun medsos) — CLAUDE.md aturan #4
create table if not exists reports (
    id           uuid primary key default gen_random_uuid(),
    description  text not null,
    location     text not null,
    lat          float8,
    lng          float8,
    reported_at  timestamptz,
    status       text not null default 'menunggu_verifikasi'
                 check (status in ('menunggu_verifikasi', 'terverifikasi', 'ditandai')),
    embedding    vector(1536), -- diisi Verification Agent, bukan frontend
    created_at   timestamptz not null default now()
);

-- 2. seed_data
create table if not exists seed_data (
    id             uuid primary key default gen_random_uuid(),
    location       text,
    time_period    text,
    incident_type  text,
    source_url     text not null -- wajib diisi, link berita/JPW (docs/skills/data.md)
);

-- 3. risk_scores
create table if not exists risk_scores (
    area        text not null,
    time_slot   text not null,
    score       float8 not null check (score >= 0 and score <= 100),
    updated_at  timestamptz not null default now(),
    primary key (area, time_slot)
);
