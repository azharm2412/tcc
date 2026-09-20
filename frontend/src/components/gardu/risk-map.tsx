"use client";

import { useEffect, useRef } from "react";
import type { GeoJSONSource, Map as MapboxMap } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { RiskCell } from "@/lib/api";

type RiskMapProps = {
  cells: RiskCell[];
  selectedAreaName: string | null;
  onSelect: (cell: RiskCell) => void;
  /** Dipanggil kalau peta tidak bisa dipakai (WebGL/token/jaringan) -> dasbor menampilkan daftar (REQ-NF-111). */
  onUnavailable: (reason: string) => void;
};

const YOGYAKARTA_CENTER: [number, number] = [110.3695, -7.7956];
// Sedikit lebih luas dari DIY supaya pengguna tidak "tersesat" jauh dari area data.
const MAX_BOUNDS: [[number, number], [number, number]] = [
  [109.9, -8.35],
  [110.95, -7.4],
];
const LOAD_TIMEOUT_MS = 10_000; // REQ-NF-101: peta harus termuat <= 5 dtk; lewat 10 dtk dianggap tidak tersedia.

// Ekspresi cat Mapbox tidak bisa membaca variabel CSS, jadi nilai token gardu-design
// (--risk-low/medium/high, --accent, --foreground di globals.css) dicerminkan di sini.
const RISK_COLORS = { rendah: "#4c8c6b", sedang: "#d4a24c", tinggi: "#b85c4c" } as const;
const ACCENT_COLOR = "#e8a33d";
const FOREGROUND_COLOR = "#e8e6e1";

const SOURCE_ID = "risk-cells";
const HEAT_LAYER = "risk-heat";
const CIRCLE_LAYER = "risk-circles";
const SELECTED_LAYER = "risk-selected";

const COOPERATIVE_GESTURE_MESSAGES = {
  "ScrollZoomBlocker.CtrlMessage": "Tekan Ctrl + gulir untuk memperbesar peta",
  "ScrollZoomBlocker.CmdMessage": "Tekan ⌘ + gulir untuk memperbesar peta",
  "TouchPanBlocker.Message": "Gunakan dua jari untuk menggeser peta",
};

function toGeoJson(cells: RiskCell[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: cells.map((cell) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [cell.longitude, cell.latitude] },
      properties: {
        area_name: cell.area_name,
        risk_score: cell.risk_score,
        risk_level: cell.risk_level,
      },
    })),
  };
}

/** Pas-kan pandangan peta ke sebaran sel (tidak berbuat apa-apa kalau tidak ada sel). */
function fitToCells(map: MapboxMap, cells: RiskCell[], animate: boolean) {
  if (cells.length === 0) return;
  const lons = cells.map((cell) => cell.longitude);
  const lats = cells.map((cell) => cell.latitude);
  map.fitBounds(
    [
      [Math.min(...lons), Math.min(...lats)],
      [Math.max(...lons), Math.max(...lats)],
    ],
    { padding: 80, maxZoom: 12, duration: animate ? 600 : 0 }
  );
}

function supportsWebGl(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Peta interaktif Mapbox GL JS dengan lapisan heatmap kerawanan (REQ-F-040).
 * Warna heatmap mengikuti skor tiap sel (hijau lumut -> kuning tanah -> merah bata,
 * token risk-* gardu-design), titik sel bisa diklik untuk membuka detail. Hanya
 * menampilkan sel grid publik — tanpa data individu (REQ-F-042).
 */
export function RiskMap({ cells, selectedAreaName, onSelect, onUnavailable }: RiskMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  // Nilai terbaru untuk handler peta yang dibuat sekali (menghindari inisialisasi ulang peta).
  const cellsRef = useRef(cells);
  const selectedRef = useRef(selectedAreaName);
  const onSelectRef = useRef(onSelect);
  const onUnavailableRef = useRef(onUnavailable);

  useEffect(() => {
    cellsRef.current = cells;
    selectedRef.current = selectedAreaName;
    onSelectRef.current = onSelect;
    onUnavailableRef.current = onUnavailable;
  });

  // Inisialisasi peta SEKALI. mapbox-gl diimpor dinamis (butuh window/document, tidak bisa di SSR).
  useEffect(() => {
    let cancelled = false;
    let loaded = false;
    let loadTimer: number | undefined;
    let map: MapboxMap | null = null;

    const fail = (reason: string) => {
      if (cancelled || loaded) return;
      onUnavailableRef.current(reason);
    };

    async function init() {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      if (!token) return fail("Token peta belum dikonfigurasi.");
      if (!supportsWebGl()) return fail("Peramban ini tidak mendukung WebGL yang dibutuhkan peta.");

      try {
        const mapboxgl = (await import("mapbox-gl")).default;
        if (cancelled || !containerRef.current) return;

        mapboxgl.accessToken = token;
        map = new mapboxgl.Map({
          container: containerRef.current,
          style: "mapbox://styles/mapbox/dark-v11", // gelap: selaras palet "malam" gardu-design
          center: YOGYAKARTA_CENTER,
          zoom: 10.8,
          maxBounds: MAX_BOUNDS,
          cooperativeGestures: true, // halaman punya konten di bawah peta: jangan "menjebak" gulir
          locale: COOPERATIVE_GESTURE_MESSAGES,
          dragRotate: false,
          attributionControl: true,
        });
        map.touchZoomRotate.disableRotation();
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
        mapRef.current = map;

        loadTimer = window.setTimeout(() => fail("Peta terlalu lama dimuat."), LOAD_TIMEOUT_MS);

        map.on("error", (event) => {
          const status = (event.error as { status?: number } | undefined)?.status;
          if (status === 401 || status === 403) fail("Token peta ditolak oleh Mapbox.");
        });

        map.on("load", () => {
          if (!map) return;
          loaded = true;
          window.clearTimeout(loadTimer);

          map.addSource(SOURCE_ID, { type: "geojson", data: toGeoJson(cellsRef.current) });

          // Heatmap: bobot = skor/10, jadi sel bertingkat tinggi lebih pekat dan merah.
          map.addLayer({
            id: HEAT_LAYER,
            type: "heatmap",
            source: SOURCE_ID,
            paint: {
              "heatmap-weight": ["interpolate", ["linear"], ["get", "risk_score"], 0, 0, 10, 1],
              // Intensitas cukup tinggi supaya PUNCAK tiap titik mencerminkan skornya: sedang ~kuning,
              // tinggi ~merah bata. Hijau hanya untuk tepi/skor rendah (halo tepi tidak boleh
              // tampak "aman" untuk titik bertingkat sedang).
              "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 9, 3.5, 14, 6],
              "heatmap-color": [
                "interpolate",
                ["linear"],
                ["heatmap-density"],
                0, "rgba(212,162,76,0)",
                0.1, "rgba(76,140,107,0.35)",
                0.3, "rgba(212,162,76,0.65)",
                0.6, "rgba(212,162,76,0.85)",
                0.85, "rgba(184,92,76,0.9)",
                1, "rgba(184,92,76,0.95)",
              ],
              "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 9, 30, 12, 60, 15, 120],
              "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 13, 0.9, 16, 0.4],
            },
          });

          // Titik sel: target klik + penanda tingkat (teks tingkat ada di panel detail/daftar).
          map.addLayer({
            id: CIRCLE_LAYER,
            type: "circle",
            source: SOURCE_ID,
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 5, 14, 10, 17, 16],
              "circle-color": [
                "match",
                ["get", "risk_level"],
                "tinggi", RISK_COLORS.tinggi,
                "sedang", RISK_COLORS.sedang,
                RISK_COLORS.rendah,
              ],
              "circle-stroke-color": FOREGROUND_COLOR,
              "circle-stroke-width": 1.5,
              "circle-opacity": 0.95,
            },
          });

          // Cincin sorot untuk sel terpilih (aksen lentera: hanya untuk sorotan penting).
          map.addLayer({
            id: SELECTED_LAYER,
            type: "circle",
            source: SOURCE_ID,
            filter: ["==", ["get", "area_name"], selectedRef.current ?? ""],
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 11, 14, 17, 17, 24],
              "circle-color": "rgba(0,0,0,0)",
              "circle-stroke-color": ACCENT_COLOR,
              "circle-stroke-width": 3,
            },
          });

          map.on("click", CIRCLE_LAYER, (event) => {
            const areaName = event.features?.[0]?.properties?.area_name;
            const cell = cellsRef.current.find((item) => item.area_name === areaName);
            if (cell) onSelectRef.current(cell);
          });
          map.on("mouseenter", CIRCLE_LAYER, () => {
            if (map) map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", CIRCLE_LAYER, () => {
            if (map) map.getCanvas().style.cursor = "";
          });

          // Arahkan pandangan ke sebaran data pada pemuatan pertama.
          fitToCells(map, cellsRef.current, false);
        });
      } catch {
        fail("Peta gagal dimuat.");
      }
    }

    void init();

    return () => {
      cancelled = true;
      window.clearTimeout(loadTimer);
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  // Ganti data heatmap saat bucket jam berubah, lalu sesuaikan pandangan ke sebaran data baru
  // (tanpa animasi kalau pengguna meminta reduced motion).
  useEffect(() => {
    const map = mapRef.current;
    const source = map?.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    if (!map || !source) return;
    source.setData(toGeoJson(cells));
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    fitToCells(map, cells, !reduceMotion);
  }, [cells]);

  // Sorot & pusatkan sel terpilih (tanpa animasi kalau pengguna meminta reduced motion).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer(SELECTED_LAYER)) return;
    map.setFilter(SELECTED_LAYER, ["==", ["get", "area_name"], selectedAreaName ?? ""]);

    const cell = cells.find((item) => item.area_name === selectedAreaName);
    if (!cell) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    map.flyTo({
      center: [cell.longitude, cell.latitude],
      zoom: Math.max(map.getZoom(), 12.5),
      duration: reduceMotion ? 0 : 700,
    });
  }, [selectedAreaName, cells]);

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Peta kerawanan Yogyakarta"
      className="h-full w-full"
    />
  );
}
