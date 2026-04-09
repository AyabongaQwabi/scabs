"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";

type DriverOption = {
  id: string;
  name: string;
  vehicle_reg: string | null;
};

export function DriverSelectForm({
  drivers,
  action,
}: {
  drivers: DriverOption[];
  action: (formData: FormData) => void;
}) {
  const first = useMemo(() => drivers[0]?.id ?? "", [drivers]);
  const selectItems = useMemo(
    () =>
      drivers.map((d) => ({
        value: d.id,
        label: d.vehicle_reg ? `${d.name} (${d.vehicle_reg})` : d.name,
      })),
    [drivers],
  );
  const [driverId, setDriverId] = useState<string>(first);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="driverId" value={driverId} />

      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">Active drivers</div>
        <SearchableSelect
          inputId="driver-login-select"
          size="lg"
          options={selectItems}
          value={driverId}
          onChange={setDriverId}
          placeholder="Choose your name"
        />
      </div>

      <Button className="h-12 w-full" size="lg" type="submit" disabled={!driverId}>
        Continue
      </Button>
    </form>
  );
}

