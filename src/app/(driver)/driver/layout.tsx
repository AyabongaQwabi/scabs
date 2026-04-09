"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CarTaxiFront, Fuel, Home, MapPinned, UserRound } from "lucide-react";

import { cn } from "@/lib/utils";
import { OfflineSync } from "./offline-sync";

const nav = [
  { href: "/driver/home", label: "Home", icon: Home },
  { href: "/driver/trips/new", label: "Trip", icon: CarTaxiFront },
  { href: "/driver/fuel", label: "Fuel", icon: Fuel },
  { href: "/driver/end-shift", label: "End", icon: MapPinned },
  { href: "/driver/select", label: "Driver", icon: UserRound },
];

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <OfflineSync />
      <div className="mx-auto w-full max-w-md px-4 pb-20 pt-4">{children}</div>

      <nav className="fixed inset-x-0 bottom-0 border-t bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-md items-center justify-between px-2 py-2">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname?.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex w-full flex-col items-center gap-1 rounded-lg px-2 py-2 text-xs text-muted-foreground",
                  active && "bg-accent text-accent-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="leading-none">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

