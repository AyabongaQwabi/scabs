"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readDriverApiJson } from "@/lib/driver/read-driver-api";
import { enqueue } from "@/lib/offline-queue/idb";

export function StartShiftClient({
  shiftActive,
}: {
  shiftActive: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [startKm, setStartKm] = useState("");
  const [goalAmount, setGoalAmount] = useState("");

  if (shiftActive) return null;

  return (
    <div className="mt-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="startKm">Start km</Label>
          <Input
            id="startKm"
            value={startKm}
            onChange={(e) => setStartKm(e.target.value)}
            inputMode="numeric"
            placeholder="e.g. 120345"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="goalAmount">Goal (R)</Label>
          <Input
            id="goalAmount"
            value={goalAmount}
            onChange={(e) => setGoalAmount(e.target.value)}
            inputMode="numeric"
            placeholder="500"
          />
        </div>
      </div>
      <Button
        className="h-12 w-full"
        size="lg"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const payload = {
              startKm: startKm.trim() ? Number(startKm) : null,
              goalAmount: goalAmount.trim() ? Number(goalAmount) : null,
            };

            if (!navigator.onLine) {
              await enqueue("startShift", payload);
              toast.message("Saved offline. Will sync when you're back online.");
              return;
            }

            try {
              const res = await fetch("/api/driver/start-shift", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(payload),
                credentials: "same-origin",
              });
              await readDriverApiJson<{ ok: boolean }>(res);
              router.refresh();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Could not start shift.");
            }
          });
        }}
      >
        START SHIFT
      </Button>
    </div>
  );
}

