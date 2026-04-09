"use client";

import { useId, useMemo } from "react";
import ReactSelect, { type StylesConfig } from "react-select";

import { cn } from "@/lib/utils";

export type SelectOption = { value: string; label: string };

export type SearchableSelectProps = {
  options: readonly SelectOption[];
  /** Controlled id (uuid or empty string). */
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  isLoading?: boolean;
  isDisabled?: boolean;
  isClearable?: boolean;
  isSearchable?: boolean;
  /** `lg` matches driver large buttons / trip form (48px). */
  size?: "default" | "lg";
  className?: string;
  id?: string;
  inputId?: string;
  "aria-invalid"?: boolean;
  loadingMessage?: (obj: { inputValue: string }) => string;
  noOptionsMessage?: (obj: { inputValue: string }) => string;
};

function getStyles({
  size,
  ariaInvalid,
}: {
  size: "default" | "lg";
  ariaInvalid: boolean;
}): StylesConfig<SelectOption, false> {
  const minH = size === "lg" ? 48 : 36;
  return {
    container: (base) => ({
      ...base,
      width: "100%",
    }),
    control: (base, state) => ({
      ...base,
      minHeight: minH,
      borderRadius: "var(--radius-lg)",
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: ariaInvalid
        ? "var(--destructive)"
        : state.isFocused
          ? "var(--ring)"
          : "var(--border)",
      backgroundColor: state.isDisabled
        ? "color-mix(in oklch, var(--muted) 50%, transparent)"
        : "var(--background)",
      boxShadow:
        state.isFocused && !ariaInvalid
          ? "0 0 0 3px color-mix(in oklch, var(--ring) 35%, transparent)"
          : undefined,
      cursor: state.isDisabled ? "not-allowed" : "default",
      outline: "none",
    }),
    valueContainer: (base) => ({
      ...base,
      paddingLeft: 12,
      paddingRight: 8,
    }),
    placeholder: (base) => ({
      ...base,
      color: "var(--muted-foreground)",
      margin: 0,
    }),
    singleValue: (base) => ({
      ...base,
      color: "var(--foreground)",
      margin: 0,
    }),
    input: (base) => ({
      ...base,
      margin: 0,
      color: "var(--foreground)",
    }),
    indicatorsContainer: (base) => ({
      ...base,
      gap: 2,
    }),
    dropdownIndicator: (base, state) => ({
      ...base,
      padding: 8,
      color: "var(--muted-foreground)",
      opacity: state.isDisabled ? 0.5 : 1,
    }),
    clearIndicator: (base) => ({
      ...base,
      padding: 8,
      color: "var(--muted-foreground)",
    }),
    indicatorSeparator: (base) => ({
      ...base,
      backgroundColor: "var(--border)",
    }),
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
    menuList: (base) => ({
      ...base,
      padding: 4,
      maxHeight: 280,
    }),
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
    loadingIndicator: (base) => ({
      ...base,
      color: "var(--muted-foreground)",
      padding: 8,
    }),
  };
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  isLoading = false,
  isDisabled = false,
  isClearable = true,
  isSearchable = true,
  size = "default",
  className,
  id,
  inputId,
  "aria-invalid": ariaInvalid,
  loadingMessage,
  noOptionsMessage,
}: SearchableSelectProps) {
  const uid = useId().replace(/:/g, "");
  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value],
  );

  const styles = useMemo(
    () => getStyles({ size, ariaInvalid: !!ariaInvalid }),
    [size, ariaInvalid],
  );

  return (
    <ReactSelect<SelectOption, false>
      instanceId={uid}
      inputId={inputId ?? id}
      options={[...options]}
      value={selected}
      onChange={(opt) => onChange(opt?.value ?? "")}
      placeholder={placeholder}
      isClearable={isClearable}
      isSearchable={isSearchable}
      isLoading={isLoading}
      isDisabled={isDisabled}
      menuPortalTarget={typeof document !== "undefined" ? document.body : null}
      menuPosition="fixed"
      styles={styles}
      className={cn(className)}
      loadingMessage={loadingMessage ?? (() => "Loading options…")}
      noOptionsMessage={noOptionsMessage ?? (() => "No matches")}
      closeMenuOnSelect
      blurInputOnSelect
    />
  );
}

const multiSelectStyles: StylesConfig<SelectOption, true> = {
  container: (base) => ({ ...base, width: "100%" }),
  control: (base, state) => ({
    ...base,
    minHeight: 36,
    borderRadius: "var(--radius-lg)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: state.isFocused ? "var(--ring)" : "var(--border)",
    backgroundColor: state.isDisabled
      ? "color-mix(in oklch, var(--muted) 50%, transparent)"
      : "var(--background)",
    boxShadow:
      state.isFocused
        ? "0 0 0 3px color-mix(in oklch, var(--ring) 35%, transparent)"
        : undefined,
    cursor: state.isDisabled ? "not-allowed" : "default",
    outline: "none",
  }),
  valueContainer: (base) => ({
    ...base,
    paddingLeft: 12,
    paddingRight: 8,
    gap: 4,
  }),
  placeholder: (base) => ({
    ...base,
    color: "var(--muted-foreground)",
    margin: 0,
  }),
  multiValue: (base) => ({
    ...base,
    borderRadius: "calc(var(--radius-lg) - 2px)",
    backgroundColor: "color-mix(in oklch, var(--primary) 18%, transparent)",
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: "var(--foreground)",
    fontSize: "0.8125rem",
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: "var(--muted-foreground)",
    ":hover": { backgroundColor: "color-mix(in oklch, var(--destructive) 15%, transparent)" },
  }),
  input: (base) => ({
    ...base,
    margin: 0,
    color: "var(--foreground)",
  }),
  indicatorsContainer: (base) => ({ ...base, gap: 2 }),
  dropdownIndicator: (base) => ({
    ...base,
    padding: 8,
    color: "var(--muted-foreground)",
  }),
  clearIndicator: (base) => ({
    ...base,
    padding: 8,
    color: "var(--muted-foreground)",
  }),
  indicatorSeparator: (base) => ({
    ...base,
    backgroundColor: "var(--border)",
  }),
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
};

export type SearchableMultiSelectProps = {
  options: readonly SelectOption[];
  value: readonly string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  isLoading?: boolean;
  isDisabled?: boolean;
  inputId?: string;
  className?: string;
};

/** Multi-select variant for picking several locations (e.g. bulk route creation). */
export function SearchableMultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select one or more…",
  isLoading = false,
  isDisabled = false,
  inputId,
  className,
}: SearchableMultiSelectProps) {
  const uid = useId().replace(/:/g, "");
  const selected = useMemo(
    () => options.filter((o) => value.includes(o.value)),
    [options, value],
  );

  return (
    <ReactSelect<SelectOption, true>
      instanceId={uid}
      inputId={inputId}
      isMulti
      options={[...options]}
      value={selected}
      onChange={(opts) => onChange((opts ?? []).map((o) => o.value))}
      placeholder={placeholder}
      isClearable
      isSearchable
      isLoading={isLoading}
      isDisabled={isDisabled}
      hideSelectedOptions={false}
      closeMenuOnSelect={false}
      menuPortalTarget={typeof document !== "undefined" ? document.body : null}
      menuPosition="fixed"
      styles={multiSelectStyles}
      className={cn(className)}
      loadingMessage={() => "Loading options…"}
      noOptionsMessage={() => "No matches"}
    />
  );
}
