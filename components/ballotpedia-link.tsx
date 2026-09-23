import { ExternalLink as ExternalLinkIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A small "look this up" link, for a race, a ballot question, or a
 * candidate. Renders nothing if there's no URL, which is common — most
 * candidates don't have a campaign site or Facebook page on file, and not
 * every race or candidate has a Ballotpedia page (county-level races in
 * particular often aren't covered).
 */
export function ExternalLink({
  url,
  label,
  className,
}: {
  url: string | null;
  label: string;
  className?: string;
}) {
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline",
        className,
      )}
    >
      {label}
      <ExternalLinkIcon className="size-3" aria-hidden />
    </a>
  );
}

export function BallotpediaLink({
  url,
  className,
}: {
  url: string | null;
  className?: string;
}) {
  return <ExternalLink url={url} label="Ballotpedia" className={className} />;
}
