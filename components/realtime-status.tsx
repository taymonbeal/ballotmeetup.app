"use client";

import { cn } from "@/lib/utils";

export type ConnectionStatus = "connecting" | "live" | "offline";

/**
 * Whether this screen is still following the meetup. Worth showing: someone
 * whose connection dropped would otherwise sit on a stale candidate without
 * knowing it.
 */
export function RealtimeStatus({ status }: { status: ConnectionStatus }) {
  const label =
    status === "live"
      ? "Live"
      : status === "connecting"
        ? "Connecting…"
        : "Not connected";

  return (
    <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
      <span
        aria-hidden
        className={cn(
          "size-2 rounded-full",
          status === "live" && "bg-green-500",
          status === "connecting" && "bg-yellow-500",
          status === "offline" && "bg-red-500",
        )}
      />
      {label}
    </span>
  );
}

export function statusFromChannel(state: string): ConnectionStatus {
  if (state === "SUBSCRIBED") return "live";
  if (state === "CLOSED" || state === "CHANNEL_ERROR" || state === "TIMED_OUT") {
    return "offline";
  }
  return "connecting";
}
