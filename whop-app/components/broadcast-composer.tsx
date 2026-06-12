"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Megaphone,
  Send,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { broadcastBrief } from "@/app/experiences/[experienceId]/broadcast-action";

const MAX_NOTE = 160;

type Status =
  | { kind: "idle" }
  | { kind: "sent" }
  | { kind: "error"; message: string };

/**
 * Admin-only composer for broadcasting the daily brief to the whole
 * community. Shows the full brief the creator is alerting people about, lets
 * them add a short note that becomes the push body, and previews the exact
 * notification members will receive before they send it.
 *
 * The note is the only input; the action re-fetches fresh data and re-checks
 * admin access server-side at send time.
 */
export function BroadcastComposer({
  experienceId,
  briefText,
  pushTitle,
  pushSummary,
}: {
  experienceId: string;
  briefText: string;
  pushTitle: string;
  pushSummary: string;
}) {
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [pending, startTransition] = useTransition();

  const pushBody = note.trim().slice(0, MAX_NOTE) || pushSummary;

  function send() {
    setStatus({ kind: "idle" });
    startTransition(async () => {
      const result = await broadcastBrief(experienceId, note);
      if (result.ok) {
        setStatus({ kind: "sent" });
        setNote("");
      } else {
        setStatus({ kind: "error", message: result.error });
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Megaphone className="size-5 text-primary" />
            Broadcast today&apos;s brief
          </h2>
          <p className="text-sm text-muted-foreground">
            Push the institutional brief to everyone in your community. They get
            a notification that opens straight to the live signals. Admins only —
            members never see this tab.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Today&apos;s brief</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap rounded-md border border-border/60 bg-muted/30 p-3 font-mono text-xs leading-relaxed text-foreground/90">
            {briefText}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Add a note (optional)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, MAX_NOTE))}
            placeholder="Say something to your community — this becomes the notification text. Leave blank to use the auto-summary."
            rows={3}
            className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground"
          />
          <div className="text-right text-[11px] text-muted-foreground">
            {note.length}/{MAX_NOTE}
          </div>

          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Members will receive
            </p>
            <p className="mt-1 text-sm font-semibold">{pushTitle}</p>
            <p className="text-sm text-muted-foreground">{pushBody}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={send} disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Send className="size-4" />
                  Send to community
                </>
              )}
            </Button>

            {status.kind === "sent" ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="size-4" />
                Sent to your community.
              </span>
            ) : null}
            {status.kind === "error" ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-rose-700 dark:text-rose-300">
                <AlertCircle className="size-4" />
                {status.message}
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
