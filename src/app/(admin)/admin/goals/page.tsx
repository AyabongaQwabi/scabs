import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { setDailyGoalAction, setMonthlyTeamGoalAction } from "./actions";
import { DailyGoalForm } from "./daily-goal-form";

export const dynamic = "force-dynamic";

export default async function AdminGoalsPage() {
  const supabaseAdmin = getSupabaseAdmin();
  const today = new Date().toISOString().slice(0, 10);
  const year = new Date().getFullYear();
  const month = new Date().getMonth() + 1;

  const [{ data: drivers }, { data: teamGoal }] = await Promise.all([
    supabaseAdmin.from("drivers").select("id,name,is_active").eq("is_active", true).order("name"),
    supabaseAdmin
      .from("monthly_team_goals")
      .select("target_amount")
      .eq("year", year)
      .eq("month", month)
      .maybeSingle(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Goals</h1>
        <p className="text-sm text-muted-foreground">Daily per-driver goals and monthly team target.</p>
      </div>

      <Card className="p-4">
        <div className="text-sm font-medium">Monthly team goal</div>
        <form action={setMonthlyTeamGoalAction} className="mt-4 grid gap-3 sm:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="year">Year</Label>
            <Input id="year" name="year" defaultValue={String(year)} inputMode="numeric" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="month">Month</Label>
            <Input id="month" name="month" defaultValue={String(month)} inputMode="numeric" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="teamTarget">Target (R)</Label>
            <Input
              id="teamTarget"
              name="targetAmount"
              defaultValue={teamGoal?.target_amount != null ? String(teamGoal.target_amount) : "120000"}
              inputMode="numeric"
            />
          </div>
          <div className="sm:col-span-4">
            <Button type="submit" variant="secondary">
              Save team goal
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-4">
        <div className="text-sm font-medium">Set daily goal (per driver)</div>
        <DailyGoalForm
          drivers={(drivers ?? []).map((d) => ({ id: d.id, name: d.name }))}
          today={today}
          action={setDailyGoalAction}
        />
      </Card>
    </div>
  );
}

