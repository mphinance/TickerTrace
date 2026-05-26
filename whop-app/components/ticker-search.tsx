"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

/**
 * Quick ticker jump. Lives at the top of the experience view so any
 * tab can be left behind for a one-ticker deep dive. Uppercases input,
 * trims it, and routes to /experiences/[id]/ticker/[ticker].
 *
 * No validation against a known-ticker list — the ticker page itself
 * handles "not found" gracefully.
 */
export function TickerSearchForm({ experienceId }: { experienceId: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const ticker = value.trim().toUpperCase();
        if (!ticker) return;
        router.push(
          `/experiences/${experienceId}/ticker/${encodeURIComponent(ticker)}`,
        );
      }}
      className="flex w-full gap-2"
    >
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Jump to a ticker (e.g. TSLA, NVDA)"
        aria-label="Ticker"
        className="flex-1"
      />
      <Button type="submit" variant="default" size="default" className="gap-1">
        <Search className="size-4" aria-hidden />
        <span className="hidden sm:inline">Search</span>
      </Button>
    </form>
  );
}
