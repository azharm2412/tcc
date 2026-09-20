'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

import { RiskPoint } from '@/lib/types';

type HeatLayer = L.Layer & {
  setLatLngs: (
    latlngs: Array<[number, number, number]>,
  ) => void;
};

type LeafletWithHeat = typeof L & {
  heatLayer: (
    latlngs: Array<[number, number, number]>,
    options?: {
      radius?: number;
      blur?: number;
      maxZoom?: number;
      max?: number;
      gradient?: Record<number, string>;
    },
  ) => HeatLayer;
};

export default function RiskMap({
  points,
}: {
  points: RiskPoint[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const heatLayerRef = useRef<HeatLayer | null>(null);

  // ==========================================
  // INIT MAP
  // ==========================================

  useEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    if (mapRef.current) return;

    const map = L.map(container, {
      center: [-7.7956, 110.3695],
      zoom: 10,
      zoomControl: true,
    });

    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution:
          '&copy; OpenStreetMap contributors',
      },
    ).addTo(map);

    mapRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 300);

    return () => {
      map.remove();

      mapRef.current = null;
      heatLayerRef.current = null;
    };
  }, []);

  // ==========================================
  // UPDATE HEATMAP
  // ==========================================

  useEffect(() => {
    const map = mapRef.current;

    if (!map) return;

    // --------------------------------------
    // Hapus heatmap sebelumnya
    // --------------------------------------

    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    // --------------------------------------
    // Validasi data
    // --------------------------------------

    if (!points || points.length === 0) {
      return;
    }

    const validPoints = points.filter(
      (point) =>
        Number.isFinite(point.lat) &&
        Number.isFinite(point.lng) &&
        Number.isFinite(point.score),
    );

    if (validPoints.length === 0) {
      return;
    }

    // ======================================
    // NORMALISASI SCORE
    // 0   = risiko rendah
    // 100 = risiko tinggi
    // ======================================

    const heatData = validPoints.map(
      (point) => [
        point.lat,
        point.lng,
        Math.max(
          0,
          Math.min(1, point.score / 100),
        ),
      ] as [number, number, number],
    );

    // ======================================
    // CREATE HEATMAP
    // ======================================

    const leafletWithHeat = L as LeafletWithHeat;

    const heatLayer =
      leafletWithHeat.heatLayer(
        heatData,
        {
          // Semakin besar = area panas semakin luas
          radius: 70,

          // Semakin besar = transisi semakin halus
          blur: 50,

          // Heatmap mengikuti zoom
          maxZoom: 10,

          // Score maksimum
          max: 1,

          // =================================
          // GRADIENT RISIKO
          // =================================
          gradient: {
            0.00: '#0e682f',
            0.10: '#089c3e',
            0.20: '#8ad118',
            0.40: '#facc15',
            0.60: '#fb923c',
            0.80: '#ef4444',
            0.90: '#dc2626',
            1.00: '#7f1d1d',
          },
        },
      );

    heatLayer.addTo(map);

    heatLayerRef.current = heatLayer;

    // ======================================
    // FOCUS MAP
    // ======================================

    if (validPoints.length === 1) {
      const point = validPoints[0];

      map.setView(
        [point.lat, point.lng],
        13,
      );
    } else {
      const bounds = L.latLngBounds(
        validPoints.map(
          (point) =>
            [
              point.lat,
              point.lng,
            ] as [number, number],
        ),
      );

      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [60, 60],
          maxZoom: 13,
        });
      }
    }

    // ======================================
    // FIX MAP SIZE
    // ======================================

    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }, [points]);

  return (
    <div
      ref={containerRef}
      className="
        h-[540px]
        w-full
        overflow-hidden
        rounded-3xl
        border
        border-line
        shadow-glow
      "
    />
  );
}