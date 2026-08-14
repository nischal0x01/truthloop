/**
 * Daily digest email — one per user per day at 08:00 UTC (cron) or on-demand
 * (manual trigger / future "send a digest now" button).
 *
 * Sections:
 *   1. Yesterday's leaderboard position (if the user has votes today)
 *   2. Today's scam forecast (1-3 items from `scam_forecast_items` for today)
 *   3. This week's blind-spot callout (only on Sundays)
 *
 * All data is pre-loaded by `sendDigest()` in `send.ts` and passed in as
 * props. The template never queries the DB itself — keeps it pure and
 * trivially testable.
 */

import * as React from 'react';
import { Heading, Link, Text } from '@react-email/components';
import {
  Body,
  Chip,
  EmailShell,
  PrimaryCta,
  SectionHeading,
} from './_layout';

export interface DigestForecastItem {
  id: string;
  severity: 'low' | 'medium' | 'high';
  title: string;
  summary: string;
  recommendedAction: string | null;
  sourceUrl: string | null;
  sourceTitle: string | null;
}

export interface DigestLeaderboardEntry {
  rank: number;
  displayName: string;
  pointsToday: number;
}

export interface DigestBlindSpotCallout {
  category: string;
  narrative: string;
  weekStarting: string;
}

export interface DigestProps {
  /** Used for the "Manage notifications" CTA + "Open TruthLoop" links. */
  settingsUrl: string;
  forecastUrl: string;
  feedUrl: string;
  /** Render date — used in the hero "Good morning" greeting. */
  displayDate: string;
  /** "User got Nth place with M points" or `null` if user hasn't voted today. */
  leaderboard: DigestLeaderboardEntry | null;
  /** 0-3 forecast items (the daily Scam Forecast for today). */
  forecastItems: DigestForecastItem[];
  /** Weekly blind-spot callout. Only surfaced on Sundays — otherwise null. */
  blindSpot: DigestBlindSpotCallout | null;
}

function severityTone(s: 'low' | 'medium' | 'high') {
  if (s === 'high') return 'danger' as const;
  if (s === 'medium') return 'accent' as const;
  return 'neutral' as const;
}

function severityLabel(s: 'low' | 'medium' | 'high') {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function DigestEmail(props: DigestProps) {
  const {
    settingsUrl,
    forecastUrl,
    feedUrl,
    displayDate,
    leaderboard,
    forecastItems,
    blindSpot,
  } = props;

  return (
    <EmailShell
      preview={
        blindSpot
          ? `Your blind spot is ${blindSpot.category} — open today's digest`
          : forecastItems.length > 0
            ? `Today's Scam Forecast: ${forecastItems.length} pattern${forecastItems.length === 1 ? '' : 's'} to know`
            : "Today's TruthLoop digest"
      }
      eyebrow="Daily digest"
      settingsUrl={settingsUrl}
    >
      <Heading
        as="h1"
        style={{
          fontSize: '24px',
          lineHeight: '30px',
          margin: '0 0 6px',
          fontWeight: 800,
          letterSpacing: '-0.01em',
          color: '#0f0f0f',
        }}
      >
        Good morning.
      </Heading>
      <Text
        style={{
          fontSize: '13px',
          color: '#525252',
          margin: '0 0 24px',
        }}
      >
        {displayDate}
      </Text>

      {/* ── Leaderboard ── */}
      {leaderboard && (
        <>
          <SectionHeading>Yesterday on the leaderboard</SectionHeading>
          <div
            style={{
              border: '1px solid #0f0f0f',
              borderRadius: '12px',
              padding: '14px 16px',
              backgroundColor: '#fff7d6',
              marginBottom: '20px',
            }}
          >
            <Text
              style={{
                fontSize: '22px',
                fontWeight: 800,
                margin: 0,
                color: '#0f0f0f',
              }}
            >
              #{leaderboard.rank}{' '}
              <span style={{ fontWeight: 500, color: '#525252', fontSize: '14px' }}>
                · {leaderboard.pointsToday} pts
              </span>
            </Text>
          </div>
        </>
      )}

      {/* ── Today's forecast ── */}
      {forecastItems.length > 0 && (
        <>
          <SectionHeading>Today's Scam Forecast</SectionHeading>
          {forecastItems.map((item) => (
            <div
              key={item.id}
              style={{
                border: '1px solid #0f0f0f',
                borderRadius: '12px',
                padding: '14px 16px',
                marginBottom: '12px',
                backgroundColor: '#ffffff',
              }}
            >
              <div style={{ marginBottom: '8px' }}>
                <Chip label={severityLabel(item.severity)} tone={severityTone(item.severity)} />
              </div>
              <Text
                style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  margin: '0 0 6px',
                  color: '#0f0f0f',
                }}
              >
                {item.title}
              </Text>
              <Body>{item.summary}</Body>
              {item.recommendedAction && (
                <Text
                  style={{
                    fontSize: '13px',
                    margin: '8px 0 0',
                    paddingLeft: '12px',
                    borderLeft: '3px solid #ff90e8',
                    color: '#0f0f0f',
                  }}
                >
                  <strong>What to do:</strong> {item.recommendedAction}
                </Text>
              )}
              {item.sourceUrl && (
                <Text style={{ fontSize: '11px', margin: '8px 0 0', color: '#525252' }}>
                  Source:{' '}
                  <Link href={item.sourceUrl} style={{ color: '#0f0f0f' }}>
                    {item.sourceTitle ?? item.sourceUrl}
                  </Link>
                </Text>
              )}
            </div>
          ))}
          <PrimaryCta href={forecastUrl} label="Vote on today's forecast" />
        </>
      )}

      {/* ── Sunday blind-spot callout ── */}
      {blindSpot && (
        <>
          <div style={{ height: '8px' }} />
          <SectionHeading>This week's blind spot</SectionHeading>
          <div
            style={{
              border: '1px solid #0f0f0f',
              borderRadius: '12px',
              padding: '16px',
              backgroundColor: '#0f0f0f',
              color: '#f4f4f0',
              marginBottom: '12px',
            }}
          >
            <Text
              style={{
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                color: '#ff90e8',
                margin: '0 0 6px',
                fontWeight: 700,
              }}
            >
              {blindSpot.category.replace(/_/g, ' ')}
            </Text>
            <Text
              style={{
                fontSize: '16px',
                lineHeight: '22px',
                margin: 0,
                fontWeight: 600,
                color: '#f4f4f0',
              }}
            >
              {blindSpot.narrative}
            </Text>
          </div>
          <Text style={{ fontSize: '13px', color: '#525252', margin: '0 0 8px' }}>
            Week starting {blindSpot.weekStarting}. Your full blind-spot report is on the site.
          </Text>
        </>
      )}

      {/* ── Fallback greeting when the digest has nothing in it ── */}
      {!leaderboard && forecastItems.length === 0 && !blindSpot && (
        <Body>No new claims today — but your streak is safe. Pop in and vote when you have a moment.</Body>
      )}

      <div style={{ height: '16px' }} />
      <Text style={{ fontSize: '12px', color: '#525252', margin: 0 }}>
        <Link href={feedUrl} style={{ color: '#0f0f0f', textDecoration: 'underline', fontWeight: 600 }}>
          Open the feed
        </Link>{' '}
        ·{' '}
        <Link href={settingsUrl} style={{ color: '#0f0f0f', textDecoration: 'underline', fontWeight: 600 }}>
          Manage notifications
        </Link>
      </Text>
    </EmailShell>
  );
}

export default DigestEmail;