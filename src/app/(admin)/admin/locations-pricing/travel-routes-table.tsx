"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchableSelect } from "@/components/ui/searchable-select";

import { haversineKm as greatCircleKm } from "@/lib/distance/haversine";
import { normalizeLatLngSouthernAfrica } from "@/lib/distance/latlng-normalize";

import {
  deleteTravelRouteFormAction,
  lookupRouteDistancePreview,
  updateTravelRoutePricesFormAction,
} from "./actions";
import {
  BASELINE_ZAR_PER_KM,
  PricingDistanceOkPanel,
} from "./pricing-distance-baseline-panel";
import type { LocationOpt } from "./pricing-form";

function toNum(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Same km as used for the Approx. distance cell: driving when available, else straight-line. */
function effectiveDistanceKmForRow(
  drivingKm: number | undefined,
  approxKm: number | null,
): number | null {
  const hasDriving = drivingKm != null && Number.isFinite(drivingKm);
  if (hasDriving) return drivingKm!;
  if (approxKm != null && Number.isFinite(approxKm)) return approxKm;
  return null;
}

function formatPricePerKm(
  recommendedPrice: number | string,
  drivingKm: number | undefined,
  approxKm: number | null,
): { text: string; basis: "driving" | "straight" | null } {
  const price = Number(recommendedPrice);
  if (!Number.isFinite(price) || price < 0) return { text: "—", basis: null };
  const km = effectiveDistanceKmForRow(drivingKm, approxKm);
  if (km == null || km <= 0) return { text: "—", basis: null };
  const per = price / km;
  const hasDriving = drivingKm != null && Number.isFinite(drivingKm);
  return {
    text: `R${per.toFixed(2)}/km`,
    basis: hasDriving ? "driving" : "straight",
  };
}

function approximateKmBetween(
  fromId: string,
  toId: string,
  locById: Map<string, LocationOpt>,
): number | null {
  if (fromId === toId) return 0;
  const a = locById.get(fromId);
  const b = locById.get(toId);
  if (!a || !b) return null;
  const alat = toNum(a.lat);
  const alng = toNum(a.lng);
  const blat = toNum(b.lat);
  const blng = toNum(b.lng);
  if (alat == null || alng == null || blat == null || blng == null) return null;
  const pa = normalizeLatLngSouthernAfrica(alat, alng);
  const pb = normalizeLatLngSouthernAfrica(blat, blng);
  return greatCircleKm(pa, pb);
}

export type TravelRouteRow = {
  id: string;
  from_location_id: string;
  to_location_id: string;
  recommended_price: number | string;
  min_price: number | string;
  max_price: number | string;
};

type PairDistanceMeta =
  | { kind: "local"; placeName: string }
  | { kind: "missing_coords"; names: string[] }
  | { kind: "incomplete" }
  | {
      kind: "ok";
      haversineKm: number;
      oLat: number;
      oLng: number;
      dLat: number;
      dLng: number;
      fromName: string;
      toName: string;
    };

function pairDistanceMetaForRoute(
  route: TravelRouteRow,
  fromName: string,
  toName: string,
  locById: Map<string, LocationOpt>,
): PairDistanceMeta {
  const fromId = route.from_location_id;
  const toId = route.to_location_id;
  if (fromId === toId) {
    return { kind: "local", placeName: fromName };
  }
  const a = locById.get(fromId);
  const b = locById.get(toId);
  if (!a || !b) return { kind: "incomplete" };
  const alat = toNum(a.lat);
  const alng = toNum(a.lng);
  const blat = toNum(b.lat);
  const blng = toNum(b.lng);
  if (alat == null || alng == null || blat == null || blng == null) {
    const names: string[] = [];
    if (alat == null || alng == null) names.push(a.name);
    if (blat == null || blng == null) names.push(b.name);
    return { kind: "missing_coords", names: [...new Set(names)] };
  }
  const pa = normalizeLatLngSouthernAfrica(alat, alng);
  const pb = normalizeLatLngSouthernAfrica(blat, blng);
  return {
    kind: "ok",
    haversineKm: greatCircleKm(pa, pb),
    oLat: pa.lat,
    oLng: pa.lng,
    dLat: pb.lat,
    dLng: pb.lng,
    fromName,
    toName,
  };
}

function RouteTableRow({
  route,
  fromName,
  toName,
  approxKm,
  drivingKm,
  locById,
}: {
  route: TravelRouteRow;
  fromName: string;
  toName: string;
  approxKm: number | null;
  /** Driving km from Mapbox Matrix when `MAPBOX_ACCESS_TOKEN` is set and lookup succeeded. */
  drivingKm?: number;
  locById: Map<string, LocationOpt>;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [rec, setRec] = useState(String(route.recommended_price));
  const [minP, setMinP] = useState(String(route.min_price));
  const [maxP, setMaxP] = useState(String(route.max_price));

  const [updateState, updateAction, updatePending] = useActionState(
    updateTravelRoutePricesFormAction,
    null,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteTravelRouteFormAction,
    null,
  );

  const pairMeta = useMemo(
    () => pairDistanceMetaForRoute(route, fromName, toName, locById),
    [route, fromName, toName, locById],
  );

  const [drivingPreview, setDrivingPreview] = useState<{
    km: number | null;
    loading: boolean;
  }>({ km: null, loading: false });

  useEffect(() => {
    if (!editOpen || pairMeta.kind !== "ok") {
      setDrivingPreview({ km: null, loading: false });
      return;
    }
    let cancelled = false;
    setDrivingPreview({ km: null, loading: true });
    lookupRouteDistancePreview({
      fromLat: pairMeta.oLat,
      fromLng: pairMeta.oLng,
      toLat: pairMeta.dLat,
      toLng: pairMeta.dLng,
    })
      .then(({ drivingKm: km }) => {
        if (cancelled) return;
        setDrivingPreview({ km, loading: false });
      })
      .catch(() => {
        if (cancelled) return;
        setDrivingPreview({ km: null, loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, [editOpen, pairMeta]);

  useEffect(() => {
    setRec(String(route.recommended_price));
    setMinP(String(route.min_price));
    setMaxP(String(route.max_price));
  }, [route.recommended_price, route.min_price, route.max_price, route.id]);

  useEffect(() => {
    if (!editOpen) return;
    setRec(String(route.recommended_price));
    setMinP(String(route.min_price));
    setMaxP(String(route.max_price));
  }, [editOpen, route.max_price, route.min_price, route.recommended_price]);

  useEffect(() => {
    if (!updateState?.ok && !deleteState?.ok) return;
    router.refresh();
    if (updateState?.ok) setEditOpen(false);
  }, [deleteState?.ok, router, updateState?.ok]);

  const displayPrice = Number(route.recommended_price);
  const priceLabel = Number.isFinite(displayPrice) ? `R${displayPrice.toFixed(0)}` : "—";

  const hasDriving = drivingKm != null && Number.isFinite(drivingKm);
  const pricePerKm = formatPricePerKm(route.recommended_price, drivingKm, approxKm);

  return (
    <TableRow>
      <TableCell className="font-medium">{fromName}</TableCell>
      <TableCell className="font-medium">{toName}</TableCell>
      <TableCell className="text-right tabular-nums align-top">
        {hasDriving ? (
          <div>
            <div className="text-foreground">{drivingKm!.toFixed(1)} km</div>
            <div className="text-[10px] font-normal text-muted-foreground">Driving (Mapbox)</div>
          </div>
        ) : approxKm == null ? (
          "—"
        ) : (
          <div>
            <div className="text-muted-foreground">{approxKm.toFixed(1)} km</div>
            <div className="text-[10px] font-normal text-muted-foreground">Straight-line</div>
          </div>
        )}
      </TableCell>
      <TableCell className="tabular-nums text-right">{priceLabel}</TableCell>
      <TableCell className="text-right tabular-nums align-top">
        {pricePerKm.text === "—" ? (
          "—"
        ) : (
          <div>
            <div className="text-foreground">{pricePerKm.text}</div>
            {pricePerKm.basis ? (
              <div className="text-[10px] font-normal text-muted-foreground">
                {pricePerKm.basis === "driving" ? "Using driving km" : "Using straight-line km"}
              </div>
            ) : null}
          </div>
        )}
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap items-center gap-2">
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <Button type="button" size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              Edit
            </Button>
            <DialogContent className="sm:max-w-lg" showCloseButton>
              <DialogHeader>
                <DialogTitle>Edit route pricing</DialogTitle>
                <DialogDescription>
                  {fromName} → {toName}
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-xl border-2 border-primary/25 bg-primary/5 px-4 py-3 text-sm shadow-sm">
                <div className="text-xs font-medium uppercase tracking-wide text-primary">
                  Distance & baseline
                </div>
                {pairMeta.kind === "local" ? (
                  <p className="mt-2 text-muted-foreground">
                    Local route at{" "}
                    <span className="font-medium text-foreground">{pairMeta.placeName}</span>. Set prices
                    manually — no distance baseline applies.
                  </p>
                ) : pairMeta.kind === "missing_coords" ? (
                  <p className="mt-2 text-muted-foreground">
                    Add latitude and longitude for:{" "}
                    <span className="font-medium text-foreground">{pairMeta.names.join(", ")}</span> to see
                    distance and suggested prices (Mapbox when{" "}
                    <code className="text-[11px]">MAPBOX_ACCESS_TOKEN</code> is set).
                  </p>
                ) : pairMeta.kind === "incomplete" ? (
                  <p className="mt-2 text-muted-foreground">Location data incomplete for this route.</p>
                ) : (
                  <PricingDistanceOkPanel
                    fromName={pairMeta.fromName}
                    toName={pairMeta.toName}
                    haversineKm={pairMeta.haversineKm}
                    drivingPreview={drivingPreview}
                    baselineZarPerKm={BASELINE_ZAR_PER_KM}
                    onApplyBaseline={(r, minV, maxV) => {
                      setRec(String(r));
                      setMinP(String(minV));
                      setMaxP(String(maxV));
                    }}
                  />
                )}
              </div>

              <form action={updateAction} className="space-y-4">
                <input type="hidden" name="id" value={route.id} />

                <div className="space-y-2">
                  <Label htmlFor={`route-${route.id}-rec`}>Price (R)</Label>
                  <Input
                    id={`route-${route.id}-rec`}
                    name="recommended"
                    inputMode="decimal"
                    value={rec}
                    onChange={(e) => setRec(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor={`route-${route.id}-min`}>Min (R)</Label>
                    <Input
                      id={`route-${route.id}-min`}
                      name="min"
                      inputMode="decimal"
                      value={minP}
                      onChange={(e) => setMinP(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`route-${route.id}-max`}>Max (R)</Label>
                    <Input
                      id={`route-${route.id}-max`}
                      name="max"
                      inputMode="decimal"
                      value={maxP}
                      onChange={(e) => setMaxP(e.target.value)}
                    />
                  </div>
                </div>

                {updateState?.error ? (
                  <p className="text-sm text-destructive" role="alert">
                    {updateState.error}
                  </p>
                ) : null}

                <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
                  <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updatePending}>
                    {updatePending ? "Saving…" : "Save"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <form
            action={deleteAction}
            className="inline"
            onSubmit={(e) => {
              if (!confirm("Delete this route? The opposite direction is not removed automatically.")) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="id" value={route.id} />
            <Button type="submit" size="sm" variant="destructive" disabled={deletePending}>
              {deletePending ? "…" : "Delete"}
            </Button>
            {deleteState?.error ? (
              <span className="block text-xs text-destructive mt-1">{deleteState.error}</span>
            ) : null}
          </form>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function TravelRoutesTable({
  routes,
  locations,
  drivingKmByRouteId = {},
  maxMatrixRouteLookups = 400,
}: {
  routes: TravelRouteRow[];
  locations: LocationOpt[];
  /** From server: Mapbox driving km per route id when token is configured. */
  drivingKmByRouteId?: Record<string, number>;
  /** Resolved on server from `MAPBOX_ADMIN_MAX_ROUTE_LOOKUPS` for display only. */
  maxMatrixRouteLookups?: number;
}) {
  const selectItems = useMemo(
    () => locations.map((l) => ({ value: l.id, label: l.name })),
    [locations],
  );
  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of locations) m.set(l.id, l.name);
    return m;
  }, [locations]);

  const locById = useMemo(() => {
    const m = new Map<string, LocationOpt>();
    for (const l of locations) m.set(l.id, l);
    return m;
  }, [locations]);

  const [filterFromId, setFilterFromId] = useState("");
  const [filterToId, setFilterToId] = useState("");

  const filtered = useMemo(() => {
    return routes.filter((r) => {
      if (filterFromId && r.from_location_id !== filterFromId) return false;
      if (filterToId && r.to_location_id !== filterToId) return false;
      return true;
    });
  }, [filterFromId, filterToId, routes]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 max-w-2xl">
        <div className="space-y-2">
          <Label htmlFor="filter-from">Filter by from</Label>
          <SearchableSelect
            inputId="filter-from"
            options={selectItems}
            value={filterFromId}
            onChange={setFilterFromId}
            placeholder="All origins"
            isClearable
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="filter-to">Filter by to</Label>
          <SearchableSelect
            inputId="filter-to"
            options={selectItems}
            value={filterToId}
            onChange={setFilterToId}
            placeholder="All destinations"
            isClearable
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Distance shows <span className="font-medium text-foreground">driving km (Mapbox)</span> when{" "}
        <code className="text-[11px]">MAPBOX_ACCESS_TOKEN</code> is set (
        <a
          href="https://docs.mapbox.com/api/navigation/matrix/"
          className="underline underline-offset-2 hover:text-foreground"
          target="_blank"
          rel="noreferrer"
        >
          Matrix API
        </a>
        ); otherwise straight-line between saved coordinates. Up to{" "}
        <span className="tabular-nums">{maxMatrixRouteLookups}</span> rows call Mapbox per page load (
        <code className="text-[11px]">MAPBOX_ADMIN_MAX_ROUTE_LOOKUPS</code>).{" "}
        <span className="font-medium text-foreground">Price per km</span> is Price ÷ that same distance
        (recommended price divided by km).
      </p>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead className="text-right">Approx. distance</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Price per km</TableHead>
              <TableHead className="w-[180px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => (
              <RouteTableRow
                key={p.id}
                route={p}
                fromName={nameById.get(p.from_location_id) ?? "—"}
                toName={nameById.get(p.to_location_id) ?? "—"}
                approxKm={approximateKmBetween(p.from_location_id, p.to_location_id, locById)}
                drivingKm={drivingKmByRouteId[p.id]}
                locById={locById}
              />
            ))}
            {!filtered.length ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  {routes.length ? "No routes match these filters." : "No travel routes yet."}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
