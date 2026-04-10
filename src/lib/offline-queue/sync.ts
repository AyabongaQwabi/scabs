"use client";

import { listQueue, removeFromQueue } from "./idb";

async function postJson(path: string, payload: unknown) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "same-origin",
  });
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    let msg = text.slice(0, 200) || `Request failed: ${res.status}`;
    try {
      const j = text ? JSON.parse(text) : null;
      if (
        j &&
        typeof j === "object" &&
        typeof (j as { error?: unknown }).error === "string"
      ) {
        msg = (j as { error: string }).error;
      }
    } catch {
      // keep msg
    }
    throw new Error(msg);
  }
}

export async function syncQueueOnce() {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  const items = await listQueue();
  for (const item of items) {
    switch (item.type) {
      case "startShift":
        await postJson("/api/driver/start-shift", item.payload);
        break;
      case "endShift":
        await postJson("/api/driver/end-shift", item.payload);
        break;
      case "fuelFillup":
        await postJson("/api/driver/fuel-fillup", item.payload);
        break;
      case "startTrip":
        await postJson("/api/driver/start-trip", item.payload);
        break;
      case "endTrip":
        await postJson("/api/driver/end-trip", item.payload);
        break;
      default:
        // Unknown item type; drop it to prevent infinite retry loops.
        break;
    }
    await removeFromQueue(item.id);
  }
}

