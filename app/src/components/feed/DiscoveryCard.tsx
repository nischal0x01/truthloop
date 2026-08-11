/**
 * DiscoveryCard — a claim scraped from the web and run through the AI 3-filter pipeline.
 *
 * Shows the raw text, AI verdict + confidence, scam assessment, and source.
 * Styled to match ClaimCard — same border, shadow, and typography system.
 *
 * Variants:
 *   - default: standard card with shadow-hard
 *   - featured: high-severity scam — red accent ring + warning badge
 */

import { ExternalLink, Globe, ShieldAlert, AlertTriangle, Clock } from 'lucide-react';
import { type Discovery, decisionLabel, severityLabel, scamTypeLabel } from '@/lib/discoveries';
import { timeAgo } from '@/lib/claims';

interface DiscoveryCardProps {
  discovery: Discovery;
  /** Called when the user clicks to see full detail */
  onOpen?: () => void;
}

export function DiscoveryCard({ discovery, onOpen }: DiscoveryCardProps) {
  const isHighSeverity = discovery.scamSeverity === 'high';
  const isScam = discovery.decision === 'publish_as_scam';

  return (
    <article
      className={[
        'group relative rounded-lg border-2 border-black bg-card overflow-hidden transition-all',
        isHighSeverity
          ? 'shadow-hard ring-2 ring-danger'
          : 'shadow-hard',
        onOpen ? 'cursor-pointer hover:-translate-y-0.5' : '',
      ].join(' ')}
      onClick={onOpen}
      tabIndex={onOpen ? 0 : undefined}
      role={onOpen ? 'button' : undefined}
      onKeyDown={
        onOpen
          ? (e) => {
              if (e.target !== e.currentTarget) return;
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpen();
              }
            }
          : undefined
      }
    >
      {/* ── AI verdict banner ── */}
      <div
        className={[
          'flex items-center justify-between gap-3 border-b-2 border-black px-5 py-3',
          isHighSeverity ? 'bg-danger text-danger-foreground' :
          isScam       ? 'bg-warning text-warning-foreground' :
                          'bg-muted text-foreground/80',
        ].join(' ')}
      >
        <div className="flex items-center gap-2">
          {isHighSeverity ? (
            <ShieldAlert size={15} strokeWidth={2.5} aria-hidden="true" />
          ) : (
            <AlertTriangle size={15} strokeWidth={2.5} aria-hidden="true" />
          )}
          <span className="text-label-small font-bold uppercase tracking-wider">
            {decisionLabel(discovery.decision)}
          </span>
          {discovery.scamSeverity && (
            <span className="text-label-small font-semibold">
              {severityLabel(discovery.scamSeverity)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-label-small font-medium">
          <Clock size={12} aria-hidden="true" />
          <span>{timeAgo(discovery.processedAt)}</span>
        </div>
      </div>

      {/* ── Body: claim text + AI analysis ── */}
      <div className="px-5 py-5">
        {/* The scraped claim */}
        <blockquote className="font-display text-heading-2 font-medium leading-snug tracking-body text-foreground"
          style={{ overflowWrap: 'anywhere' }}>
          &ldquo;{discovery.text}&rdquo;
        </blockquote>

        {/* AI verdict + reason */}
        <div className="mt-4 rounded-md border-2 border-black bg-muted px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-md border-2 border-black bg-foreground px-2 py-0.5 text-label-small font-bold uppercase tracking-wider text-background">
                {discovery.aiVerdict}
              </span>
              {discovery.aiConfidence > 0 && (
                <span className="text-label-small font-semibold text-foreground/70">
                  {discovery.aiConfidence}% confident
                </span>
              )}
            </div>
            {discovery.scamType && (
              <span className="text-label-small font-medium text-foreground/70">
                {scamTypeLabel(discovery.scamType)}
              </span>
            )}
          </div>
          {discovery.aiReason && (
            <p className="mt-2 text-body-small text-foreground/80">
              {discovery.aiReason}
            </p>
          )}
        </div>

        {/* Scam-specific detail */}
        {discovery.isScam && discovery.scamExplanation && (
          <div className="mt-3 rounded-md border-2 border-danger/40 bg-danger/5 px-4 py-3">
            <p className="text-label-small font-semibold text-danger uppercase tracking-wider mb-1">
              How the scam works
            </p>
            <p className="text-body-small text-foreground/80">
              {discovery.scamExplanation}
            </p>
          </div>
        )}
      </div>

      {/* ── Footer: source ── */}
      <footer className="flex items-center justify-between gap-3 border-t-2 border-black bg-muted px-5 py-2.5">
        <div className="flex items-center gap-2 text-label-small font-medium text-foreground/70">
          <Globe size={13} aria-hidden="true" />
          <span>{discovery.sourceName}</span>
          {discovery.scrapedAt && (
            <>
              <span aria-hidden="true">·</span>
              <span>{timeAgo(discovery.scrapedAt)}</span>
            </>
          )}
        </div>
        {discovery.sourceUrl && (
          <a
            href={discovery.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-label-small font-medium text-foreground/70 hover:text-foreground"
            aria-label="Open source"
          >
            <ExternalLink size={12} aria-hidden="true" />
            <span>Source</span>
          </a>
        )}
      </footer>
    </article>
  );
}
