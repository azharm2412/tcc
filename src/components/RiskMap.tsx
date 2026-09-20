'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { RiskPoint } from '@/lib/types';

const STYLE_URL =
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

type RiskProperties = {
  score: number;
  area: string;
};

type RiskFeatureCollection = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties: RiskProperties;
    geometry: {
      type: 'Point';
      coordinates: [number, number];
    };
  }>;
};

function toGeoJSON(points: RiskPoint[]): RiskFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: points.map((p) => ({
      type: 'Feature',
      properties: {
        score: p.score,
        area: p.area_name,
      },
      geometry: {
        type: 'Point',
        coordinates: [p.lng, p.lat],
      },
    })),
  };
}

function MapInner({ points }: { points: RiskPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let map: maplibregl.Map | null = null;

    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: STYLE_URL,
        center: [110.3695, -7.7956],
        zoom: 10.4,
        attributionControl: {
          compact: true,
        },
      });

      map.addControl(
        new maplibregl.NavigationControl({
          visualizePitch: true,
        }),
        'bottom-right',
      );

      mapRef.current = map;

      map.on('error', () => {
        setFailed(true);
      });

      map.on('load', () => {
        if (!map) return;

        const activeMap = map;

        map.addSource('risk', {
          type: 'geojson',
          data: toGeoJSON(points),
        });

        map.addLayer({
          id: 'risk-heat',
          type: 'heatmap',
          source: 'risk',
          maxzoom: 14,
          paint: {
            'heatmap-weight': [
              'interpolate',
              ['linear'],
              ['get', 'score'],
              0,
              0,
              100,
              1,
            ],
            'heatmap-intensity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              10,
              1,
              14,
              2.4,
            ],
            'heatmap-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              10,
              22,
              14,
              46,
            ],
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0,
              'rgba(16, 185, 129, 0)',
              0.3,
              'rgba(251, 191, 36, 0.45)',
              0.65,
              'rgba(249, 115, 22, 0.65)',
              1,
              'rgba(239, 68, 68, 0.85)',
            ],
            'heatmap-opacity': 0.9,
          },
        });

        map.addLayer({
          id: 'risk-point',
          type: 'circle',
          source: 'risk',
          minzoom: 10.5,
          paint: {
            'circle-radius': 7,
            'circle-color': [
              'interpolate',
              ['linear'],
              ['get', 'score'],
              0,
              '#34d399',
              40,
              '#fbbf24',
              70,
              '#ef4444',
            ],
            'circle-opacity': 0.85,
            'circle-stroke-width': 1.5,
            'circle-stroke-color': 'rgba(255,255,255,0.35)',
          },
        });

        const popup = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 14,
          className: 'gardu-popup',
        });

        map.on(
          'mousemove',
          'risk-point',
          (
            e: maplibregl.MapMouseEvent & {
              features?: maplibregl.MapGeoJSONFeature[];
            },
          ) => {
            const feature = e.features?.[0];

            if (!feature) return;

            const geometry = feature.geometry;

            if (geometry.type !== 'Point') return;

            const coords = geometry.coordinates as [number, number];

            popup
              .setLngLat(coords)
              .setHTML(
                `<div style="font-family:system-ui">
                  <div style="font-weight:700;color:#e4e4e7">
                    ${feature.properties?.area ?? ''}
                  </div>
                  <div style="color:#a1a1aa;font-size:12px">
                    Skor kerawanan:
                    <b style="color:#fbbf24">
                      ${Number(feature.properties?.score).toFixed(1)}
                    </b>
                    / 100
                  </div>
                </div>`,
              )
              .addTo(activeMap);
          },
        );

        map.on('mouseleave', 'risk-point', () => {
          popup.remove();
        });
      });
    } catch {
      setTimeout(() => setFailed(true), 0);
    }

    return () => {
      if (map) {
        map.remove();
      }

      mapRef.current = null;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const source = mapRef.current?.getSource(
      'risk',
    ) as maplibregl.GeoJSONSource | undefined;

    if (source) {
      source.setData(toGeoJSON(points));
    }
  }, [points]);

  if (failed) {
    return (
      <div className="overflow-hidden rounded-3xl border border-line">
        <div className="border-b border-line bg-panel px-4 py-3 text-xs text-zinc-500">
          Peta tidak dapat dimuat — menampilkan data dalam bentuk tabel.
        </div>

        <table className="w-full text-sm">
          <thead className="bg-panel text-left text-zinc-400">
            <tr>
              <th className="px-4 py-3">Area</th>
              <th className="px-4 py-3">Skor</th>
              <th className="px-4 py-3">Level</th>
            </tr>
          </thead>

          <tbody>
            {[...points]
              .sort((a, b) => b.score - a.score)
              .map((p) => (
                <tr
                  key={p.area_name}
                  className="border-t border-line"
                >
                  <td className="px-4 py-3 text-zinc-200">
                    {p.area_name}
                  </td>

                  <td className="px-4 py-3 font-mono text-amber-300">
                    {p.score.toFixed(1)}
                  </td>

                  <td className="px-4 py-3 capitalize text-zinc-400">
                    {p.level}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-[540px] w-full overflow-hidden rounded-3xl border border-line shadow-glow"
    />
  );
}

const RiskMap = dynamic(() => Promise.resolve(MapInner), {
  ssr: false,
});

export default RiskMap;