import Link from "next/link";

import "leaflet/dist/leaflet.css";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const nav = [
  { href: "/admin/overview", label: "Overview" },
  { href: "/admin/drivers", label: "Drivers" },
  { href: "/admin/trips", label: "Trips" },
  { href: "/admin/driver-losses", label: "Pre-trip losses" },
  { href: "/admin/locations-pricing", label: "Locations & Pricing" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/marketing/whatsapp", label: "WhatsApp campaign" },
  { href: "/admin/goals", label: "Goals" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-xl border bg-card p-4 text-card-foreground lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
          <div className="space-y-1">
            <div className="text-sm font-semibold">Sunshine Cabs</div>
            <div className="text-xs text-muted-foreground">Admin</div>
          </div>
          <Separator className="my-4" />
          <nav className="space-y-1">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className="block">
                <Button variant="ghost" className="w-full justify-start">
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}

