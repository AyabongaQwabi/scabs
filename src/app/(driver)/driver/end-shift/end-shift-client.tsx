"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readDriverApiJson } from "@/lib/driver/read-driver-api";
import { enqueue } from "@/lib/offline-queue/idb";

export function EndShiftClient({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [endKm, setEndKm] = useState("");

  if (disabled) {
    return <div className="text-sm text-muted-foreground">No active shift found for today.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="endKm">End km</Label>
        <Input id="endKm" value={endKm} onChange={(e) => setEndKm(e.target.value)} inputMode="numeric" />
      </div>
      <Button
        className="h-12 w-full"
        size="lg"
        variant="destructive"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            try {
              const payload = { endKm: endKm.trim() ? Number(endKm) : null };
              if (!navigator.onLine) {
                await enqueue("endShift", payload);
                toast.message("Saved offline. Will sync when you're back online.");
                router.push("/driver/home");
                return;
              }
              const res = await fetch("/api/driver/end-shift", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(payload),
                credentials: "same-origin",
              });
              await readDriverApiJson<{ ok: boolean }>(res);
              router.push("/driver/home");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Could not end shift.");
            }
          });
        }}
      >
        END SHIFT
      </Button>
    </div>
  );
}

