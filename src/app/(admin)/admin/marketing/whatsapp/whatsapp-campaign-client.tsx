"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  fetchWhatsappCampaignAction,
  prepareWhatsappRecipientsAction,
  sendNextWhatsappMessageAction,
  startWhatsappCampaignAction,
  type WhatsappRecipientPreview,
  type WhatsappRecipientRow,
} from "./actions";

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

const PLACEHOLDER_HELP =
  "Placeholders: {{lastLocation}}, {{totalTrips}}, {{tripsUntil25}}, {{loyaltyLine}} — loyaltyLine is filled automatically from trip counts and your 25% rule.";

type Props = { defaultTemplate: string };

export function WhatsappCampaignClient({ defaultTemplate }: Props) {
  const [template, setTemplate] = useState(defaultTemplate);
  const [preview, setPreview] = useState<WhatsappRecipientPreview[] | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<WhatsappRecipientRow[] | null>(null);
  const [batchStatus, setBatchStatus] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [sending, setSending] = useState(false);
  const [prepareBusy, setPrepareBusy] = useState(false);
  const [startBusy, setStartBusy] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const refreshBatch = useCallback(async (id: string) => {
    try {
      const data = await fetchWhatsappCampaignAction(id);
      setRecipients(data.recipients);
      setBatchStatus(data.batch.status);
      setPendingCount(data.pendingCount);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load campaign");
    }
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const runSendLoop = useCallback(
    async (id: string, signal: AbortSignal) => {
      setSending(true);
      try {
        while (!signal.aborted) {
          const result = await sendNextWhatsappMessageAction(id);
          if (signal.aborted) break;

          if (!result.ok) {
            if ("rateLimited" in result && result.rateLimited) {
              const wait = Math.max(0, Math.ceil(result.retryAfterMs));
              toast.message(`Rate limit: waiting ${Math.round(wait / 1000)}s`);
              await sleep(wait);
              continue;
            }
            toast.error("error" in result ? result.error : "Send failed");
            break;
          }

          await refreshBatch(id);

          if (result.batchCompleted) {
            toast.success("Campaign finished — all messages processed.");
            break;
          }

          await sleep(60_000);
        }
      } finally {
        setSending(false);
      }
    },
    [refreshBatch],
  );

  async function handlePrepare() {
    setPrepareBusy(true);
    try {
      const { recipients: rows } = await prepareWhatsappRecipientsAction();
      setPreview(rows);
      toast.success(`${rows.length} customer(s) with trips (excludes 0 trips).`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Prepare failed");
    } finally {
      setPrepareBusy(false);
    }
  }

  async function handleStartCampaign() {
    setStartBusy(true);
    try {
      const { batchId: id } = await startWhatsappCampaignAction(template);
      setBatchId(id);
      await refreshBatch(id);
      toast.success("Campaign started. Sending first message now, then one per minute.");

      abortRef.current?.abort();
      abortRef.current = new AbortController();
      void runSendLoop(id, abortRef.current.signal);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Start failed");
    } finally {
      setStartBusy(false);
    }
  }

  function statusBadge(status: string) {
    if (status === "sent") return <Badge className="bg-emerald-600">Sent</Badge>;
    if (status === "failed") return <Badge variant="destructive">Failed</Badge>;
    if (status === "sending") return <Badge variant="secondary">Sending</Badge>;
    return <Badge variant="outline">Pending</Badge>;
  }

  const showTable = recipients && recipients.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">WhatsApp campaign</h1>
        <p className="text-sm text-muted-foreground">
          Thank-you blasts via Wasender — one API call per minute. Only customers with at least one
          completed trip are included.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="wa-template">Message template (English / isiXhosa)</Label>
        <Textarea
          id="wa-template"
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          rows={18}
          className="font-mono text-sm"
          disabled={sending || !!batchId}
        />
        <p className="text-xs text-muted-foreground">{PLACEHOLDER_HELP}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => void handlePrepare()}
          disabled={prepareBusy || sending || !!batchId}
        >
          {prepareBusy ? "Loading…" : "Preview recipients"}
        </Button>
        <Button
          type="button"
          onClick={() => void handleStartCampaign()}
          disabled={startBusy || sending || !!batchId || !template.trim()}
        >
          {startBusy ? "Starting…" : "Start campaign & send"}
        </Button>
      </div>

      {preview && !batchId ? (
        <p className="text-sm text-muted-foreground">
          Preview: <span className="font-medium text-foreground">{preview.length}</span> recipient(s).
          Edit the template above, then start the campaign.
        </p>
      ) : null}

      {batchId ? (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span>
            Batch: <code className="rounded bg-muted px-1">{batchId}</code>
          </span>
          {batchStatus ? <span>Status: {batchStatus}</span> : null}
          <span>
            Pending: <strong>{pendingCount}</strong>
          </span>
          {sending ? <span className="text-amber-600">Sending in progress…</span> : null}
        </div>
      ) : null}

      {showTable ? (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phone</TableHead>
                <TableHead>Last trip to</TableHead>
                <TableHead className="text-right">Trips</TableHead>
                <TableHead className="text-right">Until 25%</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent at</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recipients!.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.customer_phone}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm">{r.last_location_label}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.total_trips}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.trips_until_25}</TableCell>
                  <TableCell>{statusBadge(r.status)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.sent_at ? new Date(r.sent_at).toLocaleString() : "—"}
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate text-xs text-destructive">
                    {r.error ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  );
}
