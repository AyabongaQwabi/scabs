"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function RealtimeRefresh() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const trips = supabase
      .channel("admin-trips")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trips" },
        () => router.refresh()
      )
      .subscribe();

    const shifts = supabase
      .channel("admin-shifts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shifts" },
        () => router.refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(trips);
      supabase.removeChannel(shifts);
    };
  }, [router]);

  return null;
}

