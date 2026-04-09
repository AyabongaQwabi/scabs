"use client";

import { useActionState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { createDriverAction } from "./actions";

async function createDriverFormAction(
  _prev: { ok?: boolean; error?: string } | null,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await createDriverAction(formData);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not create driver." };
  }
}

export function AddDriverForm() {
  const [state, formAction, pending] = useActionState(createDriverFormAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state?.ok) return;
    formRef.current?.reset();
  }, [state?.ok]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="driver-name">Name</Label>
        <Input id="driver-name" name="name" placeholder="e.g. Thabo Mokoena" required disabled={pending} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="driver-vehicle">Vehicle registration (optional)</Label>
        <Input
          id="driver-vehicle"
          name="vehicle_reg"
          placeholder="e.g. CA 123-456"
          disabled={pending}
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="driver-active"
          name="is_active"
          defaultChecked
          className="h-4 w-4 rounded border-input"
          disabled={pending}
        />
        <Label htmlFor="driver-active" className="text-sm font-normal cursor-pointer">
          Active (can sign in on driver app)
        </Label>
      </div>
      {state?.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p className="text-sm text-muted-foreground" role="status">
          Driver created. They can be selected on the driver login page.
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create driver"}
      </Button>
    </form>
  );
}
