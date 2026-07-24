import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format an AUM value (in $B) as a human-readable string.
 *  $0.02B → "$20M", $0.5B → "$500M", $12.5B → "$12.5B". */
export function formatAum(b: number): string {
  if (b >= 1) return `$${b.toFixed(1)}B`;
  return `$${Math.round(b * 1000)}M`;
}
