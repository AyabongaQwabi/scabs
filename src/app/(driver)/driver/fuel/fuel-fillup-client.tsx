"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readDriverApiJson } from "@/lib/driver/read-driver-api";
import { enqueue } from "@/lib/offline-queue/idb";

export function FuelFillupClient({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [litres, setLitres] = useState("");
  const [randAmount, setRandAmount] = useState("");
  const [odometerKm, setOdometerKm] = useState("");

  if (disabled) {
    return <div className="text-sm text-muted-foreground">Start a shift first to log fill-ups.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="litres">Litres</Label>
          <Input id="litres" value={litres} onChange={(e) => setLitres(e.target.value)} inputMode="decimal" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="randAmount">Rand amount</Label>
          <Input
            id="randAmount"
            value={randAmount}
            onChange={(e) => setRandAmount(e.target.value)}
            inputMode="decimal"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="odometerKm">Odometer km (optional)</Label>
        <Input
          id="odometerKm"
          value={odometerKm}
          onChange={(e) => setOdometerKm(e.target.value)}
          inputMode="numeric"
        />
      </div>
      <Button
        className="h-12 w-full"
        size="lg"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            try {
              const payload = {
                litres: Number(litres),
                randAmount: Number(randAmount),
                odometerKm: odometerKm.trim() ? Number(odometerKm) : null,
              };

              if (!navigator.onLine) {
                await enqueue("fuelFillup", payload);
                toast.message("Saved offline. Will sync when you're back online.");
                return;
              }

              const res = await fetch("/api/driver/fuel-fillup", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(payload),
                credentials: "same-origin",
              });
              await readDriverApiJson<{ ok: boolean }>(res);
              setLitres("");
              setRandAmount("");
              setOdometerKm("");
              router.refresh();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Could not save fill-up.");
            }
          });
        }}
      >
        Add fill-up
      </Button>
    </div>
  );
}

