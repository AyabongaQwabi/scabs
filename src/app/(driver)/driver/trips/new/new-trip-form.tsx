"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { normalizeCustomerPhone } from "@/lib/customers/phone";
import { haversineKm } from "@/lib/distance/haversine";
import { readDriverApiJson } from "@/lib/driver/read-driver-api";
import { enqueue } from "@/lib/offline-queue/idb";
import { DEADHEAD_ZAR_PER_KM } from "@/lib/pricing/deadhead";

import { CustomerPhoneField } from "./customer-phone-field";

type LocationOption = {
  id: string;
  name: string;
  lat: number | string | null;
  lng: number | string | null;
};

function coord(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

type Recommended = {
  totalRecommended: number | null;
  missingLegs: Array<{ fromLocationId: string; toLocationId: string }>;
};

function LocationPicker({
  id,
  value,
  onChange,
  locations,
  placeholder,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  locations: LocationOption[];
  placeholder: string;
}) {
  const options = useMemo(
    () => locations.map((l) => ({ value: l.id, label: l.name })),
    [locations],
  );
  return (
    <SearchableSelect
      inputId={id}
      size="lg"
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  );
}

export function NewTripForm({ locations }: { locations: LocationOption[] }) {
  const router = useRouter();
  const [preTripFrom, setPreTripFrom] = useState("");
  const [preTripTo, setPreTripTo] = useState("");
  const [startId, setStartId] = useState("");
  const [endId, setEndId] = useState("");
  const [stops, setStops] = useState<string[]>([]);
  const [customerPhone, setCustomerPhone] = useState("");
  const [recommended, setRecommended] = useState<Recommended | null>(null);
  const [isPending, startTransition] = useTransition();

  const locById = useMemo(() => {
    const m = new Map<string, LocationOption>();
    for (const l of locations) m.set(l.id, l);
    return m;
  }, [locations]);

  const deadheadCoords = useMemo(() => {
    if (!preTripFrom || !preTripTo || preTripFrom === preTripTo) return null;
    const a = locById.get(preTripFrom);
    const b = locById.get(preTripTo);
    if (!a || !b) return null;
    const alat = coord(a.lat);
    const alng = coord(a.lng);
    const blat = coord(b.lat);
    const blng = coord(b.lng);
    if (alat == null || alng == null || blat == null || blng == null) {
      return { kind: "no_coords" as const };
    }
    return { kind: "ok" as const, alat, alng, blat, blng };
  }, [preTripFrom, preTripTo, locById]);

  const [deadheadPreview, setDeadheadPreview] = useState<{
    km: number;
    source: "mapbox" | "straight";
    loss: number;
  } | null>(null);
  const [deadheadLoading, setDeadheadLoading] = useState(false);

  useEffect(() => {
    if (!deadheadCoords || deadheadCoords.kind !== "ok") {
      setDeadheadPreview(null);
      setDeadheadLoading(false);
      return;
    }
    const { alat, alng, blat, blng } = deadheadCoords;
    const fallback = haversineKm({ lat: alat, lng: alng }, { lat: blat, lng: blng });
    let cancelled = false;
    setDeadheadLoading(true);
    fetch("/api/pricing/deadhead-distance", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fromLat: alat,
        fromLng: alng,
        toLat: blat,
        toLng: blng,
      }),
    })
      .then((r) => r.json())
      .then((data: { drivingKm?: number | null }) => {
        if (cancelled) return;
        const dk = data.drivingKm;
        const useMapbox =
          dk != null && Number.isFinite(dk) && dk > 0;
        const km = useMapbox ? dk : fallback;
        const source = useMapbox ? "mapbox" : "straight";
        setDeadheadPreview({
          km,
          source,
          loss: Math.round(km * DEADHEAD_ZAR_PER_KM),
        });
        setDeadheadLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setDeadheadPreview({
          km: fallback,
          source: "straight",
          loss: Math.round(fallback * DEADHEAD_ZAR_PER_KM),
        });
        setDeadheadLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [deadheadCoords]);

  const locationIds = useMemo(() => {
    const ids = [startId, ...stops, endId]
      .map((id) => (typeof id === "string" ? id.trim() : id))
      .filter((id): id is string => Boolean(id));
    return ids;
  }, [startId, stops, endId]);

  useEffect(() => {
    if (locationIds.length < 2) {
      setRecommended(null);
      return;
    }

    let cancelled = false;
    startTransition(async () => {
      const res = await fetch("/api/pricing/recommended", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locationIds }),
      });
      const json = (await res.json()) as Recommended;
      if (!cancelled) setRecommended(json);
    });

    return () => {
      cancelled = true;
    };
  }, [locationIds]);

  const canStartTrip = Boolean(startId && endId);

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-primary/5 p-4">
        <div className="text-sm font-medium">Before pickup (unpaid)</div>
        <p className="mt-1 text-xs text-muted-foreground">
          Where you are now → rider pickup (map pins). Road distance via Mapbox when configured, otherwise
          straight-line. Estimated loss for the office: R{DEADHEAD_ZAR_PER_KM}/km.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pretrip-from">Your current area</Label>
            <LocationPicker
              id="pretrip-from"
              value={preTripFrom}
              onChange={setPreTripFrom}
              locations={locations}
              placeholder="Where you’re starting from"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-end justify-between gap-2">
              <Label htmlFor="pretrip-to">Rider / pickup point</Label>
              {startId ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto shrink-0 py-0 text-xs"
                  onClick={() => setPreTripTo(startId)}
                >
                  Same as trip start
                </Button>
              ) : null}
            </div>
            <LocationPicker
              id="pretrip-to"
              value={preTripTo}
              onChange={setPreTripTo}
              locations={locations}
              placeholder="Pickup location"
            />
          </div>
        </div>
        {deadheadCoords?.kind === "no_coords" ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Add coordinates to both locations in admin if you want distance and loss estimates here.
          </p>
        ) : deadheadCoords?.kind === "ok" && deadheadLoading ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading road distance…</p>
        ) : deadheadPreview ? (
          <div className="mt-3 rounded-lg border bg-background/80 px-3 py-2 text-sm">
            <span className="font-semibold tabular-nums">{deadheadPreview.km.toFixed(2)} km</span>
            <span className="text-muted-foreground">
              {" "}
              {deadheadPreview.source === "mapbox" ? "road (Mapbox) · " : "straight-line · "}
            </span>
            <span className="font-semibold tabular-nums text-foreground">
              ~R{deadheadPreview.loss.toLocaleString("en-ZA")}
            </span>
            <span className="text-muted-foreground"> unpaid ({DEADHEAD_ZAR_PER_KM}/km)</span>
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            Select two different locations to see km and estimated loss.
          </p>
        )}
      </Card>

      <Card className="p-4">
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Start</div>
            <LocationPicker
              id="trip-start-location"
              value={startId}
              onChange={setStartId}
              locations={locations}
              placeholder="Select start location"
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Stops</div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setStops((s) => [...s, ""])}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add stop
              </Button>
            </div>
            <div className="space-y-2">
              {stops.map((stopId, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="flex-1">
                    <LocationPicker
                      id={`trip-stop-${idx}`}
                      value={stopId}
                      onChange={(v) =>
                        setStops((s) => {
                          const next = [...s];
                          next[idx] = v;
                          return next;
                        })
                      }
                      locations={locations}
                      placeholder={`Stop ${idx + 1}`}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setStops((s) => s.filter((_, i) => i !== idx))}
                    aria-label="Remove stop"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {!stops.length ? (
                <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
                  No stops. Add one if you drop off / pick up along the way.
                </div>
              ) : null}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">End</div>
            <LocationPicker
              id="trip-end-location"
              value={endId}
              onChange={setEndId}
              locations={locations}
              placeholder="Select end location"
            />
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <CustomerPhoneField
          value={customerPhone}
          onChange={setCustomerPhone}
          disabled={isPending}
        />
      </Card>

      <Card className="p-4">
        <div className="text-xs text-muted-foreground">Recommended total</div>
        <div className={cn("mt-1 text-2xl font-semibold", isPending && "opacity-60")}>
          {recommended?.totalRecommended != null ? `R${recommended.totalRecommended.toFixed(0)}` : "—"}
        </div>
        {recommended?.missingLegs?.length ? (
          <div className="mt-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            Missing pricing for {recommended.missingLegs.length} leg(s). You’ll need to enter a manual
            final price when you end the trip.
          </div>
        ) : (
          <div className="mt-2 text-sm text-muted-foreground">
            We sum every leg (start → stop1 → … → end) into one total.
          </div>
        )}
      </Card>

      <Button
        className="h-12 w-full"
        size="lg"
        disabled={!canStartTrip || isPending}
        onClick={() => {
          startTransition(async () => {
            try {
            const startLoc = locById.get(startId);
            const fallbackLat = coord(startLoc?.lat);
            const fallbackLng = coord(startLoc?.lng);

            let startLat: number;
            let startLng: number;
            try {
              if (!navigator.geolocation) throw new Error("unavailable");
              const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                  enableHighAccuracy: true,
                  timeout: 10000,
                  maximumAge: 10000,
                });
              });
              startLat = pos.coords.latitude;
              startLng = pos.coords.longitude;
            } catch {
              if (fallbackLat != null && fallbackLng != null) {
                startLat = fallbackLat;
                startLng = fallbackLng;
                toast.message(
                  "GPS unavailable — using the pickup location's coordinates for this trip start.",
                );
              } else {
                toast.error(
                  "Could not read your location. Allow location access in the browser, or set coordinates on the start location in admin.",
                );
                return;
              }
            }

            const phoneRaw = customerPhone.trim();
            const payload = {
              startLocationId: startId,
              endLocationId: endId,
              stopLocationIds: stops.filter(Boolean),
              startLat,
              startLng,
              customerPhone: phoneRaw ? normalizeCustomerPhone(phoneRaw) : null,
              ...(preTripFrom &&
              preTripTo &&
              preTripFrom !== preTripTo && {
                preTripFromLocationId: preTripFrom,
                preTripToLocationId: preTripTo,
              }),
            };

            if (!navigator.onLine) {
              await enqueue("startTrip", payload);
              toast.message("Saved offline. Will sync when you're back online.");
              router.push("/driver/home");
              return;
            }

            const res = await fetch("/api/driver/start-trip", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(payload),
              credentials: "same-origin",
            });
            const json = await readDriverApiJson<{ tripId: string }>(res);
            router.push(`/driver/trips/active?tripId=${json.tripId}`);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Could not start trip.");
            }
          });
        }}
      >
        START TRIP
      </Button>
    </div>
  );
}

