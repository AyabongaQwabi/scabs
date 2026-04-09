"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { syncQueueOnce } from "@/lib/offline-queue/sync";

export function OfflineSync() {
  useEffect(() => {
    let running = false;

    const run = async () => {
      if (running) return;
      running = true;
      try {
        await syncQueueOnce();
      } catch {
        // keep queued, retry later
      } finally {
        running = false;
      }
    };

    const onOnline = async () => {
      toast.success("Back online. Syncing…");
      await run();
    };

    run();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  return null;
}

