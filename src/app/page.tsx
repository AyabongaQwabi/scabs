import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center px-5 py-12">
      <div className="w-full max-w-4xl space-y-6">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Queenstown (Komani), South Africa</p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            Sunshine Cabs
          </h1>
          <p className="text-pretty text-muted-foreground">
            Driver-first trip logging with recommended pricing, goals, fuel tracking, and a real-time
            admin dashboard.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-5">
            <div className="space-y-3">
              <div className="text-sm font-medium">Driver</div>
              <div className="text-sm text-muted-foreground">
                No password. Select your name and start your shift.
              </div>
              <Link href="/driver/select" className="block">
                <Button className="w-full">Open Driver App</Button>
              </Link>
            </div>
          </Card>

          <Card className="p-5">
            <div className="space-y-3">
              <div className="text-sm font-medium">Admin</div>
              <div className="text-sm text-muted-foreground">
                Login to manage drivers, locations, pricing, and view analytics.
              </div>
              <Link href="/admin/login" className="block">
                <Button variant="secondary" className="w-full">
                  Open Admin Dashboard
                </Button>
              </Link>
            </div>
          </Card>
        </div>

        <p className="text-xs text-muted-foreground">
          Dark mode is enabled by default. Drivers are mobile-first; admins are desktop-first.
        </p>
      </div>
    </div>
  );
}
