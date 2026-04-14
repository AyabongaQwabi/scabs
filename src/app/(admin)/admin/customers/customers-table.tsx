"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { EditCustomerDialog, type CustomerEditRow } from "./edit-customer-dialog";

export type CustomerTableRow = {
  phone: string;
  total_trips: number | null;
  last_trip_date: string | null;
  loyalty_tier: string | null;
  lifetime_revenue_zar: number;
  lifetime_discounts_zar: number;
  lifetime_km: number;
};

type Props = { customers: CustomerTableRow[] };

export function CustomersTable({ customers }: Props) {
  const [editing, setEditing] = useState<CustomerEditRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);

  const openEdit = (c: CustomerTableRow) => {
    setEditing({
      phone: c.phone,
      total_trips: c.total_trips ?? 0,
      loyalty_tier: c.loyalty_tier ?? "bronze",
      last_trip_date: c.last_trip_date,
    });
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  };

  return (
    <>
      <EditCustomerDialog
        key={dialogKey}
        customer={editing}
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditing(null);
        }}
      />
      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]"> </TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Trips</TableHead>
              <TableHead className="text-right">Revenue (R)</TableHead>
              <TableHead className="text-right">Discounts (R)</TableHead>
              <TableHead className="text-right">Distance (km)</TableHead>
              <TableHead>Last trip</TableHead>
              <TableHead>Tier</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((c) => (
              <TableRow key={c.phone}>
                <TableCell>
                  <Button type="button" variant="outline" size="sm" onClick={() => openEdit(c)}>
                    Edit
                  </Button>
                </TableCell>
                <TableCell className="font-medium">{c.phone}</TableCell>
                <TableCell className="text-right">{c.total_trips ?? 0}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {Number(c.lifetime_revenue_zar ?? 0).toLocaleString("en-ZA", {
                    maximumFractionDigits: 0,
                  })}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {Number(c.lifetime_discounts_zar ?? 0).toLocaleString("en-ZA", {
                    maximumFractionDigits: 0,
                  })}
                </TableCell>
                <TableCell className="text-right tabular-nums">{c.lifetime_km.toFixed(1)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {c.last_trip_date ? new Date(c.last_trip_date).toLocaleString() : "—"}
                </TableCell>
                <TableCell className="text-sm">{c.loyalty_tier ?? "bronze"}</TableCell>
              </TableRow>
            ))}
            {!customers.length ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                  No customers yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
