import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminLoginAction } from "./actions";

export default function AdminLoginPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center px-6">
      <Card className="w-full p-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Admin login</h1>
          <p className="text-sm text-muted-foreground">
            Sign in with your Sunshine Cabs admin account.
          </p>
        </div>

        <form action={adminLoginAction} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="admin@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" placeholder="••••••••" />
          </div>
          <Button className="w-full" type="submit">
            Sign in
          </Button>
        </form>

        <div className="mt-4 text-center text-xs text-muted-foreground">
          <Link className="underline underline-offset-4" href="/">
            Back to home
          </Link>
        </div>
      </Card>
    </div>
  );
}

