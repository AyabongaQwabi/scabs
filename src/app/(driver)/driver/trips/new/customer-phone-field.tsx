"use client";

import { useCallback, useId, useMemo, useRef, useState } from "react";
import AsyncCreatableSelect from "react-select/async-creatable";
import type { GroupBase, SingleValue, StylesConfig } from "react-select";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { normalizeCustomerPhone } from "@/lib/customers/phone";
import { readDriverApiJson } from "@/lib/driver/read-driver-api";

type Opt = { value: string; label: string };

function getStyles(): StylesConfig<Opt, false, GroupBase<Opt>> {
  const minH = 48;
  return {
    container: (base) => ({ ...base, width: "100%" }),
    control: (base, state) => ({
      ...base,
      minHeight: minH,
      borderRadius: "var(--radius-lg)",
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: state.isFocused ? "var(--ring)" : "var(--border)",
      backgroundColor: state.isDisabled
        ? "color-mix(in oklch, var(--muted) 50%, transparent)"
        : "var(--background)",
      boxShadow: state.isFocused
        ? "0 0 0 3px color-mix(in oklch, var(--ring) 35%, transparent)"
        : undefined,
      cursor: state.isDisabled ? "not-allowed" : "default",
      outline: "none",
    }),
    valueContainer: (base) => ({ ...base, paddingLeft: 12, paddingRight: 8 }),
    placeholder: (base) => ({ ...base, color: "var(--muted-foreground)", margin: 0 }),
    singleValue: (base) => ({ ...base, color: "var(--foreground)", margin: 0 }),
    input: (base) => ({ ...base, margin: 0, color: "var(--foreground)" }),
    indicatorsContainer: (base) => ({ ...base, gap: 2 }),
    dropdownIndicator: (base, state) => ({
      ...base,
      padding: 8,
      color: "var(--muted-foreground)",
      opacity: state.isDisabled ? 0.5 : 1,
    }),
    clearIndicator: (base) => ({ ...base, padding: 8, color: "var(--muted-foreground)" }),
    indicatorSeparator: (base) => ({ ...base, backgroundColor: "var(--border)" }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    menu: (base) => ({
      ...base,
      backgroundColor: "var(--popover)",
      borderRadius: "var(--radius-lg)",
      border: "1px solid var(--border)",
      boxShadow: "0 10px 40px color-mix(in oklch, var(--foreground) 12%, transparent)",
      overflow: "hidden",
      marginTop: 4,
    }),
    menuList: (base) => ({ ...base, padding: 4, maxHeight: 280 }),
    option: (base, state) => ({
      ...base,
      cursor: "pointer",
      borderRadius: "calc(var(--radius-lg) - 4px)",
      padding: "8px 10px",
      fontSize: "0.875rem",
      lineHeight: 1.25,
      backgroundColor: state.isSelected
        ? "var(--primary)"
        : state.isFocused
          ? "var(--accent)"
          : "transparent",
      color: state.isSelected ? "var(--primary-foreground)" : "var(--foreground)",
    }),
    loadingMessage: (base) => ({
      ...base,
      color: "var(--muted-foreground)",
      padding: "10px 12px",
      fontSize: "0.875rem",
    }),
    noOptionsMessage: (base) => ({
      ...base,
      color: "var(--muted-foreground)",
      padding: "10px 12px",
      fontSize: "0.875rem",
    }),
    loadingIndicator: (base) => ({ ...base, color: "var(--muted-foreground)", padding: 8 }),
  };
}

export function CustomerPhoneField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const styles = useMemo(() => getStyles(), []);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saving, setSaving] = useState(false);

  const loadOptions = useCallback((inputValue: string): Promise<Opt[]> => {
    return new Promise((resolve) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        debounceRef.current = null;
        const q = inputValue.trim();
        if (q.length < 2) {
          resolve([]);
          return;
        }
        try {
          const res = await fetch(
            `/api/driver/customers?search=${encodeURIComponent(q)}`,
            { credentials: "same-origin" },
          );
          if (!res.ok) {
            resolve([]);
            return;
          }
          const json = (await res.json()) as { customers?: { phone: string }[] };
          const opts = (json.customers ?? []).map((c) => ({
            value: c.phone,
            label: c.phone,
          }));
          resolve(opts);
        } catch {
          resolve([]);
        }
      }, 250);
    });
  }, []);

  const selected: Opt | null = useMemo(() => {
    const p = value.trim();
    if (!p) return null;
    return { value: p, label: p };
  }, [value]);

  const handleChange = (opt: SingleValue<Opt>) => {
    if (!opt) {
      onChange("");
      return;
    }
    onChange(normalizeCustomerPhone(opt.value));
  };

  const normalized = value.trim() ? normalizeCustomerPhone(value) : "";
  const canSave = normalized.length >= 8;

  const saveContact = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/driver/customers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ phone: normalized }),
      });
      await readDriverApiJson<{ ok: boolean; existing?: boolean }>(res);
      toast.success("Contact saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save contact.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="customerPhone">Customer phone (optional)</Label>
      <AsyncCreatableSelect<Opt, false, GroupBase<Opt>>
        instanceId={uid}
        inputId="customerPhone"
        cacheOptions
        defaultOptions={false}
        loadOptions={loadOptions}
        value={selected}
        onChange={handleChange}
        placeholder="Search contacts or type a number…"
        isClearable
        isDisabled={disabled}
        formatCreateLabel={(inputValue) => `Use "${inputValue.trim()}"`}
        isValidNewOption={(inputValue) => normalizeCustomerPhone(inputValue).length >= 8}
        menuPortalTarget={typeof document !== "undefined" ? document.body : null}
        menuPosition="fixed"
        styles={styles}
        loadingMessage={() => "Searching…"}
        noOptionsMessage={({ inputValue }) =>
          inputValue.trim().length < 2 ? "Type at least 2 characters to search" : "No saved contacts"
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9"
          disabled={!canSave || saving || disabled}
          onClick={() => void saveContact()}
        >
          {saving ? "Saving…" : "Save contact"}
        </Button>
        <span className="text-xs text-muted-foreground">
          Saves this number to your contact list for quicker search next time.
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        Search saved customers or enter a new phone. Pick “Use …” to confirm a new number.
      </p>
    </div>
  );
}
