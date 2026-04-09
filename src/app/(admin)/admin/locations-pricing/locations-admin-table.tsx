"use client";

import { useActionState, useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { deleteLocationAction, updateLocationAction } from "./actions";

export type LocationRow = {
  id: string;
  name: string;
  lat: number | string | null;
  lng: number | string | null;
};

function formatCoord(v: number | string | null | undefined) {
  if (v === null || v === undefined || v === "") return "";
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? String(n) : "";
}

function LocationEditForm({ loc, onDone }: { loc: LocationRow; onDone: () => void }) {
  const [state, formAction, pending] = useActionState(updateLocationAction, null);
  const latStr = formatCoord(loc.lat);
  const lngStr = formatCoord(loc.lng);

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state?.ok, onDone]);

  return (
    <TableRow>
      <TableCell colSpan={4} className="bg-muted/20 p-3 align-top">
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="id" value={loc.id} />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <div className="text-xs text-muted-foreground">Name</div>
              <Input name="name" defaultValue={loc.name} required disabled={pending} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <div className="text-xs text-muted-foreground">Lat</div>
              <Input
                name="lat"
                defaultValue={latStr}
                inputMode="decimal"
                disabled={pending}
                className="h-9"
                placeholder="Optional"
              />
            </div>
            <div className="space-y-1.5">
              <div className="text-xs text-muted-foreground">Lng</div>
              <Input
                name="lng"
                defaultValue={lngStr}
                inputMode="decimal"
                disabled={pending}
                className="h-9"
                placeholder="Optional"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onDone} disabled={pending}>
              Cancel
            </Button>
            {state?.error ? <span className="text-sm text-destructive">{state.error}</span> : null}
          </div>
        </form>
      </TableCell>
    </TableRow>
  );
}

function LocationViewRow({ loc, onEdit }: { loc: LocationRow; onEdit: () => void }) {
  const latDisp = formatCoord(loc.lat);
  const lngDisp = formatCoord(loc.lng);

  return (
    <TableRow>
      <TableCell className="font-medium">{loc.name}</TableCell>
      <TableCell className="tabular-nums text-muted-foreground">{latDisp || "—"}</TableCell>
      <TableCell className="tabular-nums text-muted-foreground">{lngDisp || "—"}</TableCell>
      <TableCell className="text-right">
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onEdit}>
            Edit
          </Button>
          <form
            action={deleteLocationAction}
            onSubmit={(e) => {
              if (
                !confirm(
                  `Delete “${loc.name}”? Pricing rows for this location will be removed. Past trips will keep their GPS but lose the location link.`,
                )
              ) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="id" value={loc.id} />
            <Button type="submit" variant="destructive" size="sm">
              Delete
            </Button>
          </form>
        </div>
      </TableCell>
    </TableRow>
  );
}

function RowWithEdit({ loc }: { loc: LocationRow }) {
  const [editing, setEditing] = useState(false);
  const stopEditing = useCallback(() => setEditing(false), []);
  const startEditing = useCallback(() => setEditing(true), []);
  if (editing) {
    return <LocationEditForm loc={loc} onDone={stopEditing} />;
  }
  return <LocationViewRow loc={loc} onEdit={startEditing} />;
}

export function LocationsAdminTable({ locations }: { locations: LocationRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Lat</TableHead>
          <TableHead>Lng</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {locations.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
              No locations yet. Add one above.
            </TableCell>
          </TableRow>
        ) : (
          locations.map((loc) => <RowWithEdit key={loc.id} loc={loc} />)
        )}
      </TableBody>
    </Table>
  );
}
