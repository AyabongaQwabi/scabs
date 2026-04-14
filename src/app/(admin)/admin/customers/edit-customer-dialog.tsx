"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { updateCustomerAction } from "./actions";

export type CustomerEditRow = {
  phone: string;
  total_trips: number;
  loyalty_tier: string;
  last_trip_date: string | null;
};

async function updateCustomerFormAction(
  _prev: { ok?: boolean; error?: string } | null,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await updateCustomerAction(formData);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not update customer." };
  }
}

type Props = {
  customer: CustomerEditRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EditCustomerDialog({ customer, open, onOpenChange }: Props) {
  const router = useRouter();
  const formId = useId();
  const [state, formAction, pending] = useActionState(updateCustomerFormAction, null);

  useEffect(() => {
    if (!state?.ok) return;
    router.refresh();
    onOpenChange(false);
  }, [state?.ok, onOpenChange, router]);

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle>Edit customer</DialogTitle>
          <DialogDescription>
            Update loyalty fields. Changing the phone re-links all trips with the old number to the new
            number.
          </DialogDescription>
        </DialogHeader>
        <form id={formId} action={formAction} className="grid gap-3">
          <input type="hidden" name="original_phone" value={customer.phone} />
          <div className="space-y-2">
            <Label htmlFor={`${formId}-phone`}>Phone</Label>
            <Input
              id={`${formId}-phone`}
              name="phone"
              type="tel"
              inputMode="tel"
              defaultValue={customer.phone}
              required
              disabled={pending}
              autoComplete="tel"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${formId}-trips`}>Trip count</Label>
              <Input
                id={`${formId}-trips`}
                name="total_trips"
                inputMode="numeric"
                defaultValue={String(customer.total_trips)}
                required
                disabled={pending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${formId}-tier`}>Loyalty tier</Label>
              <Input
                id={`${formId}-tier`}
                name="loyalty_tier"
                defaultValue={customer.loyalty_tier}
                required
                disabled={pending}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${formId}-last`}>Last trip (optional)</Label>
            <Input
              id={`${formId}-last`}
              name="last_trip_date"
              type="datetime-local"
              defaultValue={toDatetimeLocalValue(customer.last_trip_date)}
              disabled={pending}
            />
            <p className="text-xs text-muted-foreground">Clear the field and save to set last trip to empty.</p>
          </div>
          {state?.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
