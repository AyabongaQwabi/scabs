import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { adminLogoutAction } from "../login/actions";

export const dynamic = "force-dynamic";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Admin account actions.</p>
      </div>

      <Card className="p-4">
        <form action={adminLogoutAction}>
          <Button type="submit" variant="secondary">
            Logout
          </Button>
        </form>
      </Card>
    </div>
  );
}

