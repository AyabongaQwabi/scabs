"use client";

import type { ReactNode } from "react";

import { Collapsible } from "@base-ui/react/collapsible";
import { ChevronDownIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function CollapsibleTableSection({
  title,
  defaultOpen = true,
  className,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card className={cn("gap-0 py-0", className)}>
      <Collapsible.Root defaultOpen={defaultOpen} className="flex flex-col">
        <Collapsible.Trigger
          className={cn(
            "group flex w-full items-center justify-between gap-2 border-b px-4 py-3 text-left text-sm font-medium outline-none",
            "hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
            "data-disabled:pointer-events-none data-disabled:opacity-50",
          )}
        >
          <span>{title}</span>
          <ChevronDownIcon
            aria-hidden
            className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[panel-open]:rotate-180"
          />
        </Collapsible.Trigger>
        <Collapsible.Panel
          keepMounted
          className="flex flex-col overflow-hidden data-ending-style:pointer-events-none"
        >
          {children}
        </Collapsible.Panel>
      </Collapsible.Root>
    </Card>
  );
}
