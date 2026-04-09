"use client";

import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";

type Pin = {
  id: string;
  lat: number;
  lng: number;
  label: string;
};

export function ActiveDriversMap({ pins }: { pins: Pin[] }) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  const center = useMemo(() => {
    if (pins.length) return { lat: pins[0]!.lat, lng: pins[0]!.lng };
    // Komani / Queenstown approx
    return { lat: -31.89756, lng: 26.87533 };
  }, [pins]);

  useEffect(() => {
    if (!elRef.current || mapRef.current) return;

    const map = L.map(elRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([center.lat, center.lng], 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    }).addTo(map);

    const layer = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerRef.current = layer;

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, [center.lat, center.lng]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    const bounds: L.LatLngBoundsExpression[] = [];

    for (const p of pins) {
      const m = L.circleMarker([p.lat, p.lng], {
        radius: 8,
        color: "hsl(var(--primary))",
        fillColor: "hsl(var(--primary))",
        fillOpacity: 0.9,
        weight: 2,
      }).bindPopup(p.label);

      m.addTo(layer);
      bounds.push([p.lat, p.lng] as any);
    }

    if (pins.length >= 2) {
      map.fitBounds(bounds as any, { padding: [20, 20] });
    } else if (pins.length === 1) {
      map.setView([pins[0]!.lat, pins[0]!.lng], 13);
    }
  }, [pins]);

  return <div ref={elRef} className="h-64 w-full overflow-hidden rounded-lg" />;
}

