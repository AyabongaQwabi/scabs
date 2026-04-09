"use client";

import { Button } from "@/components/ui/button";

/** Baseline rand total per km (road or straight-line) for suggested prices. */
export const BASELINE_ZAR_PER_KM = 15;

export function PricingDistanceOkPanel({
  fromName,
  toName,
  haversineKm,
  drivingPreview,
  baselineZarPerKm,
  onApplyBaseline,
}: {
  fromName: string;
  toName: string;
  haversineKm: number;
  drivingPreview: { km: number | null; loading: boolean };
  baselineZarPerKm: number;
  onApplyBaseline: (recommended: number, minRand: number, maxRand: number) => void;
}) {
  const kmForBaseline = drivingPreview.km ?? haversineKm;
  const recommendedRand = Math.max(0, Math.round(kmForBaseline * baselineZarPerKm));
  const minRand = Math.max(0, Math.round(recommendedRand * 0.9));
  const maxRand = Math.max(recommendedRand, Math.round(recommendedRand * 1.1));

  const displayKm = drivingPreview.loading ? haversineKm : drivingPreview.km ?? haversineKm;
  const usingMapboxRoadKm = !drivingPreview.loading && drivingPreview.km != null;

  return (
    <div className="mt-3 space-y-3">
      <div className="text-xs text-muted-foreground">
        {fromName} → {toName}
        <span className="block mt-0.5">
          {usingMapboxRoadKm
            ? "Approximate driving distance from Mapbox Matrix (road network; see docs.mapbox.com/api/navigation/matrix/)."
            : drivingPreview.loading
              ? "Fetching road distance…"
              : "Road distance unavailable (set MAPBOX_ACCESS_TOKEN for Mapbox Matrix, or check coordinates). Showing straight-line km as fallback."}
        </span>
      </div>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
        <div>
          <div className="text-xs text-muted-foreground">Distance</div>
          <div className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
            {displayKm.toFixed(1)}
            <span className="ml-1 text-base font-medium text-muted-foreground">km</span>
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Baseline (R{baselineZarPerKm} × km)</div>
          <div className="text-2xl font-semibold tracking-tight text-foreground">
            R{recommendedRand.toLocaleString("en-ZA")}
          </div>
        </div>
        <div className="text-xs text-muted-foreground pb-1">
          Suggested band: min ~R{minRand} · max ~R{maxRand}
        </div>
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => onApplyBaseline(recommendedRand, minRand, maxRand)}
      >
        Apply baseline to price fields
      </Button>
    </div>
  );
}
