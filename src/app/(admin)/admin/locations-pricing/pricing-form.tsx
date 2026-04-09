"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableMultiSelect, SearchableSelect } from "@/components/ui/searchable-select";
import { haversineKm as greatCircleKm } from "@/lib/distance/haversine";
import { normalizeLatLngSouthernAfrica } from "@/lib/distance/latlng-normalize";

import { lookupRouteDistancePreview, upsertPriceFormAction } from "./actions";
import {
  BASELINE_ZAR_PER_KM,
  PricingDistanceOkPanel,
} from "./pricing-distance-baseline-panel";

export type LocationOpt = {
  id: string;
  name: string;
  lat: number | string | null;
  lng: number | string | null;
};

function toNum(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Default From = first location; To = [second] when available. */
function initialFromTo(locs: LocationOpt[]) {
  if (!locs.length) return { from: "", toIds: [] as string[] };
  const from = locs[0]!.id;
  const toIds = locs.length > 1 ? [locs[1]!.id] : [];
  return { from, toIds };
}

function routePairKey(fromId: string, toId: string) {
  return `${fromId}:${toId}`;
}

function dedupeIds(ids: string[]) {
  return [...new Set(ids)];
}

export function PricingForm({
  locations,
  existingRoutePairKeys = [],
}: {
  locations: LocationOpt[];
  /** `fromId:toId` for each existing travel_routes row (from server). */
  existingRoutePairKeys?: readonly string[];
}) {
  const selectItems = useMemo(
    () => locations.map((l) => ({ value: l.id, label: l.name })),
    [locations],
  );
  const existingPairs = useMemo(() => new Set(existingRoutePairKeys), [existingRoutePairKeys]);
  const locById = useMemo(() => {
    const m = new Map<string, LocationOpt>();
    for (const l of locations) m.set(l.id, l);
    return m;
  }, [locations]);

  const [fromId, setFromId] = useState(() => initialFromTo(locations).from);
  const [toIds, setToIds] = useState<string[]>(() => initialFromTo(locations).toIds);
  const [recommended, setRecommended] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [saveState, saveAction, savePending] = useActionState(upsertPriceFormAction, null);
  const locationsRef = useRef(locations);
  locationsRef.current = locations;

  useEffect(() => {
    if (!saveState?.ok) return;
    const { from, toIds: nextTo } = initialFromTo(locationsRef.current);
    setFromId(from);
    setToIds(nextTo);
    setRecommended("");
    setMinPrice("");
    setMaxPrice("");
  }, [saveState]);

  const previewToId = useMemo(() => {
    if (toIds.length === 0) return "";
    return toIds.find((t) => t !== fromId) ?? toIds[0]!;
  }, [fromId, toIds]);

  const conflictingToIds = useMemo(
    () => toIds.filter((tid) => existingPairs.has(routePairKey(fromId, tid))),
    [toIds, fromId, existingPairs],
  );

  const pricingHelper = useMemo(() => {
    if (!fromId || !previewToId) {
      return {
        kind: "need_selection" as const,
        reason: "incomplete" as const,
      };
    }
    if (fromId === previewToId) {
      const a = locById.get(fromId);
      if (!a) return { kind: "need_selection" as const, reason: "incomplete" as const };
      return {
        kind: "local" as const,
        placeName: a.name,
      };
    }
    const a = locById.get(fromId);
    const b = locById.get(previewToId);
    if (!a || !b) {
      return { kind: "need_selection" as const, reason: "incomplete" as const };
    }
    const alat = toNum(a.lat);
    const alng = toNum(a.lng);
    const blat = toNum(b.lat);
    const blng = toNum(b.lng);
    if (alat == null || alng == null || blat == null || blng == null) {
      const missingNames: string[] = [];
      if (alat == null || alng == null) missingNames.push(a.name);
      if (blat == null || blng == null) missingNames.push(b.name);
      return {
        kind: "missing_coords" as const,
        names: [...new Set(missingNames)],
      };
    }
    const pa = normalizeLatLngSouthernAfrica(alat, alng);
    const pb = normalizeLatLngSouthernAfrica(blat, blng);
    const haversineKm = greatCircleKm(pa, pb);
    return {
      kind: "ok" as const,
      haversineKm,
      oLat: pa.lat,
      oLng: pa.lng,
      dLat: pb.lat,
      dLng: pb.lng,
      fromName: a.name,
      toName: b.name,
    };
  }, [fromId, previewToId, locById]);

  const [drivingPreview, setDrivingPreview] = useState<{ km: number | null; loading: boolean }>({
    km: null,
    loading: false,
  });

  useEffect(() => {
    if (pricingHelper.kind !== "ok") {
      setDrivingPreview({ km: null, loading: false });
      return;
    }
    let cancelled = false;
    setDrivingPreview({ km: null, loading: true });
    lookupRouteDistancePreview({
      fromLat: pricingHelper.oLat,
      fromLng: pricingHelper.oLng,
      toLat: pricingHelper.dLat,
      toLng: pricingHelper.dLng,
    })
      .then(({ drivingKm }) => {
        if (cancelled) return;
        setDrivingPreview({ km: drivingKm, loading: false });
      })
      .catch(() => {
        if (cancelled) return;
        setDrivingPreview({ km: null, loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, [pricingHelper]);

  const setToIdsDeduped = (next: string[]) => setToIds(dedupeIds(next));

  return (
    <form action={saveAction} className="mt-4 space-y-3">
      <input type="hidden" name="fromId" value={fromId} />
      {toIds.map((id) => (
        <input key={id} type="hidden" name="toId" value={id} />
      ))}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="pricing-from">From</Label>
          <SearchableSelect
            inputId="pricing-from"
            options={selectItems}
            value={fromId}
            onChange={setFromId}
            placeholder="From location"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="pricing-to">To (destinations)</Label>
          <SearchableMultiSelect
            inputId="pricing-to"
            options={selectItems}
            value={toIds}
            onChange={setToIdsDeduped}
            placeholder="Select one or more destinations…"
          />
          <p className="text-xs text-muted-foreground">
            Each selection creates a route from <span className="font-medium">From</span> to that place with
            the same price; return legs are added automatically when From and To differ.
          </p>
        </div>
      </div>

      <div className="rounded-xl border-2 border-primary/25 bg-primary/5 px-4 py-3 text-sm shadow-sm">
        <div className="text-xs font-medium uppercase tracking-wide text-primary">Distance & baseline</div>
        {pricingHelper.kind === "need_selection" ? (
          <p className="mt-2 text-muted-foreground">
            Select From and at least one destination to see distance and pricing baseline.
          </p>
        ) : pricingHelper.kind === "local" ? (
          <p className="mt-2 text-muted-foreground">
            Local route at <span className="font-medium text-foreground">{pricingHelper.placeName}</span>{" "}
            (same pickup and drop-off area). Set recommended, min, and max manually — no distance baseline
            applies. Saving creates one directed route per selected destination; the opposite direction is only
            added when From and To differ.
          </p>
        ) : pricingHelper.kind === "missing_coords" ? (
          <p className="mt-2 text-muted-foreground">
            Add latitude and longitude for:{" "}
            <span className="font-medium text-foreground">{pricingHelper.names.join(", ")}</span>. Then
            you’ll see distance and baseline (R{BASELINE_ZAR_PER_KM}/km) using Mapbox road km when{" "}
            <code className="text-xs">MAPBOX_ACCESS_TOKEN</code> is set, otherwise straight-line.
          </p>
        ) : (
          <>
            {toIds.length > 1 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Preview uses <span className="font-medium text-foreground">From → {pricingHelper.toName}</span>{" "}
                (first leg used for distance). The same prices apply to all {toIds.length} destinations.
              </p>
            ) : null}
            <PricingDistanceOkPanel
              fromName={pricingHelper.fromName}
              toName={pricingHelper.toName}
              haversineKm={pricingHelper.haversineKm}
              drivingPreview={drivingPreview}
              baselineZarPerKm={BASELINE_ZAR_PER_KM}
              onApplyBaseline={(rec, minV, maxV) => {
                setRecommended(String(rec));
                setMinPrice(String(minV));
                setMaxPrice(String(maxV));
              }}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label htmlFor="recommended">Recommended (R)</Label>
          <Input
            id="recommended"
            name="recommended"
            inputMode="numeric"
            placeholder="250"
            value={recommended}
            onChange={(e) => setRecommended(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="min">Min (R)</Label>
          <Input
            id="min"
            name="min"
            inputMode="numeric"
            placeholder="220"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="max">Max (R)</Label>
          <Input
            id="max"
            name="max"
            inputMode="numeric"
            placeholder="300"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
        </div>
      </div>

      {conflictingToIds.length > 0 ? (
        <p className="text-sm text-amber-600 dark:text-amber-500" role="status">
          {conflictingToIds.length === toIds.length
            ? "Every selected destination already has a route from this origin. Edit them in Travel Routes below or change the selection."
            : "Some selected destinations already have a route from this origin. Remove those rows from the list or edit them in Travel Routes."}
        </p>
      ) : null}

      {saveState?.error ? (
        <p className="text-sm text-destructive" role="alert">
          {saveState.error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={!fromId || toIds.length === 0 || conflictingToIds.length > 0 || savePending}
      >
        {savePending ? "Saving…" : toIds.length > 1 ? `Add ${toIds.length} routes` : "Add route"}
      </Button>
    </form>
  );
}
