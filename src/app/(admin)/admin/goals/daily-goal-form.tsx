"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";

type DriverOpt = { id: string; name: string };

export function DailyGoalForm({
  drivers,
  today,
  action,
}: {
  drivers: DriverOpt[];
  today: string;
  action: (formData: FormData) => void;
}) {
  const first = useMemo(() => drivers[0]?.id ?? "", [drivers]);
  const selectItems = useMemo(
    () => drivers.map((d) => ({ value: d.id, label: d.name })),
    [drivers],
  );
  const [driverId, setDriverId] = useState(first);

  return (
    <form action={action} className="mt-4 grid gap-3 sm:grid-cols-4">
      <input type="hidden" name="driverId" value={driverId} />

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="daily-goal-driver">Driver</Label>
        <SearchableSelect
          inputId="daily-goal-driver"
          options={selectItems}
          value={driverId}
          onChange={setDriverId}
          placeholder="Pick driver"
        />
        <div className="text-xs text-muted-foreground">
          Applied when drivers start a shift (if they don’t override).
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <Input id="date" name="date" defaultValue={today} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="targetAmount">Target (R)</Label>
        <Input id="targetAmount" name="targetAmount" defaultValue="500" inputMode="numeric" />
      </div>
      <div className="sm:col-span-4">
        <Button type="submit" disabled={!driverId}>
          Save daily goal
        </Button>
      </div>
    </form>
  );
}

