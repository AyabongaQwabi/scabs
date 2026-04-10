"use client";

import { useActionState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { addCustomerAction } from "./actions";

async function addCustomerFormAction(
  _prev: { ok?: boolean; error?: string } | null,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await addCustomerAction(formData);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not add customer." };
  }
}

export function AddCustomerForm() {
  const [state, formAction, pending] = useActionState(addCustomerFormAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state?.ok) return;
    formRef.current?.reset();
  }, [state?.ok]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="customer-phone">Phone</Label>
        <Input
          id="customer-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          placeholder="+27712345678"
          required
          disabled={pending}
          autoComplete="tel"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="customer-trips">Trip count (optional)</Label>
          <Input
            id="customer-trips"
            name="total_trips"
            inputMode="numeric"
            placeholder="0"
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customer-tier">Loyalty tier</Label>
          <Input
            id="customer-tier"
            name="loyalty_tier"
            placeholder="bronze"
            disabled={pending}
          />
        </div>
      </div>
      {state?.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p className="text-sm text-muted-foreground" role="status">
          Customer added. They will appear in the table below.
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add customer"}
      </Button>
    </form>
  );
}
