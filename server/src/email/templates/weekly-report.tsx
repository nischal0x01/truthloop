/**
 * Weekly blind-spot report email — mirrors the in-app `/reports/weekly`
 * hero so the email and the web feel like one product.
 *
 * Three sections (per spec §6.2):
 *   1. Accuracy — X/Y right (Z%)
 *   2. Blind spot — category chip + 1-sentence AI narrative
 *   3. Replay — single most-missed claim with its verdict + explanation
 *
 * Data is pre-loaded by `sendWeeklyReportEmail()` — template never
 * queries the DB.
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

export interface WeeklyReportReplay {
  id: string;
  text: string;
  verdict: 'real' | 'fake';
  explanation: string | null;
  sourceUrl: string | null;
  sourceTitle: string | null;
}

export interface WeeklyReportEmailProps {
  settingsUrl: string;
  /** Link to the full report on the web. */
  reportUrl: string;
  weekStarting: string;
  totalGuesses: number;
  correctGuesses: number;
  accuracyPct: number;
  globalAveragePct: number | null;
  blindSpotCategory: string | null;
  blindSpotCategoryLabel: string | null;
  blindSpotNarrative: string | null;
  replay: WeeklyReportReplay | null;
}

export function WeeklyReportEmail(props: WeeklyReportEmailProps) {
  const {
    settingsUrl,
    reportUrl,
    weekStarting,
    totalGuesses,
    correctGuesses,
    accuracyPct,
    globalAveragePct,
    blindSpotCategory,
    blindSpotCategoryLabel,
    blindSpotNarrative,
    replay,
  } = props;

  return (
    <EmailShell
      preview={`Week of ${weekStarting}: ${accuracyPct}% accuracy. Your blind spot is ${blindSpotCategoryLabel ?? 'unknown'}.`}
      eyebrow="Weekly blind-spot report"
      settingsUrl={settingsUrl}
    >
      <Heading
        as="h1"
        style={{
          fontSize: '26px',
          lineHeight: '32px',
          margin: '0 0 6px',
          fontWeight: 800,
          letterSpacing: '-0.01em',
        }}
      >
        Your week in Truth.
      </Heading>
      <Text
        style={{
          fontSize: '13px',
          color: '#525252',
          margin: '0 0 24px',
        }}
      >
        Week starting {weekStarting}
      </Text>

      {/* ── Accuracy tile ── */}
      <div
        style={{
          border: '1px solid #0f0f0f',
          borderRadius: '12px',
          padding: '20px',
          backgroundColor: '#0f0f0f',
          color: '#f4f4f0',
          marginBottom: '24px',
        }}
      >
        <Text
          style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: '#ff90e8',
            margin: '0 0 8px',
            fontWeight: 700,
          }}
        >
          Accuracy
        </Text>
        <Text
          style={{
            fontSize: '44px',
            fontWeight: 800,
            lineHeight: '1',
            margin: '0 0 4px',
            color: '#ff90e8',
          }}
        >
          {accuracyPct}%
        </Text>
        <Text
          style={{
            fontSize: '14px',
            color: '#f4f4f0',
            margin: 0,
            opacity: 0.8,
          }}
        >
          {correctGuesses}/{totalGuesses} correct
          {globalAveragePct !== null && (
            <>
              {' · '}Global average: {globalAveragePct}%
            </>
          )}
        </Text>
      </div>

      {/* ── Blind spot ── */}
      {blindSpotCategory && (
        <>
          <SectionHeading>Your blind spot</SectionHeading>
          <div style={{ marginBottom: '6px' }}>
            <Chip
              label={blindSpotCategoryLabel ?? blindSpotCategory.replace(/_/g, ' ')}
              tone="accent"
            />
          </div>
          {blindSpotNarrative && (
            <Body>{blindSpotNarrative}</Body>
          )}
        </>
      )}

      {!blindSpotCategory && totalGuesses === 0 && (
        <Body>You didn't vote on any claims this week — your blind spot is the empty set. Pop in and we'll have one ready next Sunday.</Body>
      )}

      {!blindSpotCategory && totalGuesses > 0 && (
        <Body>Perfect week — your blind spot is the empty set. Keep it up.</Body>
      )}

      {/* ── Replay ── */}
      {replay && (
        <>
          <div style={{ height: '8px' }} />
          <SectionHeading>The claim worth a second look</SectionHeading>
          <div
            style={{
              border: '1px solid #0f0f0f',
              borderRadius: '12px',
              padding: '16px',
              backgroundColor: '#ffffff',
              marginBottom: '12px',
            }}
          >
            <div style={{ marginBottom: '10px' }}>
              <Chip
                label={replay.verdict === 'real' ? 'Real' : 'Fake'}
                tone={replay.verdict === 'real' ? 'success' : 'danger'}
              />
            </div>
            <Text
              style={{
                fontSize: '15px',
                fontWeight: 700,
                lineHeight: '21px',
                margin: '0 0 10px',
                color: '#0f0f0f',
              }}
            >
              "{replay.text}"
            </Text>
            {replay.explanation && <Body>{replay.explanation}</Body>}
            {replay.sourceUrl && (
              <Text style={{ fontSize: '11px', margin: '4px 0 0', color: '#525252' }}>
                Source:{' '}
                <Link href={replay.sourceUrl} style={{ color: '#0f0f0f' }}>
                  {replay.sourceTitle ?? replay.sourceUrl}
                </Link>
              </Text>
            )}
          </div>
        </>
      )}

      <PrimaryCta href={reportUrl} label="See the full report" />

      <Text
        style={{
          fontSize: '12px',
          color: '#525252',
          margin: '16px 0 0',
          textAlign: 'center',
        }}
      >
        Full breakdown, trend chart, and category breakdown on the site.
      </Text>
    </EmailShell>
  );
}

export default WeeklyReportEmail;