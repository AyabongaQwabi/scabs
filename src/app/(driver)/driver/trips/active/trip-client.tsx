"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { haversineKm } from "@/lib/distance/haversine";
import { enqueue } from "@/lib/offline-queue/idb";

export function ActiveTripClient({
  tripId,
  startLat,
  startLng,
  customerPhone,
  recommendedTotal,
}: {
  tripId: string;
  startLat: number | null;
  startLng: number | null;
  customerPhone: string | null;
  recommendedTotal: number | null;
}) {
  const router = useRouter();
  const [km, setKm] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const [price, setPrice] = useState<string>("");
  const [discountAmount, setDiscountAmount] = useState<string>("0");
  const [discountReason, setDiscountReason] = useState<string>("");

  const startPoint = useMemo(() => {
    if (startLat == null || startLng == null) return null;
    return { lat: startLat, lng: startLng };
  }, [startLat, startLng]);

  useEffect(() => {
    if (!startPoint || !navigator.geolocation) return;

    let cancelled = false;

    const tick = async () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (cancelled) return;
          const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setKm(haversineKm(startPoint, here));
        },
        () => {
          if (cancelled) return;
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 15000 }
      );
    };

    tick();
    const id = window.setInterval(tick, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [startPoint]);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-muted-foreground">Distance so far</div>
            <div className="mt-1 text-2xl font-semibold">{km != null ? `${km.toFixed(1)} km` : "—"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Customer</div>
            <div className="mt-1 text-sm font-medium">{customerPhone ?? "—"}</div>
          </div>
        </div>
      </Card>

      <Dialog>
        <DialogTrigger
          render={
            <Button className="h-12 w-full" size="lg" variant="destructive" disabled={pending} />
          }
        >
          END TRIP
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>End trip</DialogTitle>
            <DialogDescription>Confirm the final price (and optional discount).</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {recommendedTotal != null ? (
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => setPrice(String(Math.round(recommendedTotal)))}
              >
                Use recommended total (R{recommendedTotal.toFixed(0)})
              </Button>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="actualPrice">Actual price (R)</Label>
              <Input
                id="actualPrice"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                inputMode="numeric"
                placeholder="e.g. 250"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="discountAmount">Discount (R)</Label>
                <Input
                  id="discountAmount"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discountReason">Reason</Label>
                <Input
                  id="discountReason"
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  placeholder="e.g. repeat rider"
                />
              </div>
            </div>

            <Button
              className="h-12 w-full"
              size="lg"
              disabled={pending || !price.trim()}
              onClick={() => {
                startTransition(async () => {
                  if (!navigator.geolocation) throw new Error("GPS not available on this device.");
                  const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                      enableHighAccuracy: true,
                      timeout: 10000,
                      maximumAge: 5000,
                    });
                  });

                  const actualPrice = Number(price);
                  const disc = Number(discountAmount || "0");
                  if (!Number.isFinite(actualPrice) || actualPrice < 0) throw new Error("Invalid price.");
                  if (!Number.isFinite(disc) || disc < 0) throw new Error("Invalid discount.");

                  const payload = {
                    tripId,
                    endLat: pos.coords.latitude,
                    endLng: pos.coords.longitude,
                    actualPrice,
                    discountAmount: disc,
                    discountReason: discountReason.trim() || null,
                  };

                  if (!navigator.onLine) {
                    await enqueue("endTrip", payload);
                    toast.message("Saved offline. Will sync when you’re back online.");
                    router.push("/driver/home");
                    return;
                  }

                  const res = await fetch("/api/driver/end-trip", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify(payload),
                  });
                  if (!res.ok) throw new Error(await res.text());
                  router.push("/driver/home");
                });
              }}
            >
              Save trip
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

