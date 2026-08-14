/**
 * Instant alert email — sent when a HIGH-severity scam forecast item is
 * generated (per spec §7.2). One email per user per item, not a digest.
 * The whole template is one card; it should feel urgent but not alarming.
 */

import * as React from 'react';
import { Heading, Link, Text } from '@react-email/components';
import {
  Body,
  Chip,
  EmailShell,
  PrimaryCta,
  SeverityStripe,
} from './_layout';

export interface InstantAlertProps {
  settingsUrl: string;
  forecastUrl: string;
  displayDate: string;
  item: {
    severity: 'high';
    title: string;
    summary: string;
    recommendedAction: string | null;
    sourceUrl: string | null;
    sourceTitle: string | null;
  };
}

export function InstantAlertEmail({ settingsUrl, forecastUrl, displayDate, item }: InstantAlertProps) {
  return (
    <EmailShell
      preview={`High-risk scam pattern today: ${item.title}`}
      eyebrow={`High-risk alert · ${displayDate}`}
      settingsUrl={settingsUrl}
    >
      <Heading
        as="h1"
        style={{
          fontSize: '22px',
          lineHeight: '28px',
          margin: '0 0 6px',
          fontWeight: 800,
          letterSpacing: '-0.01em',
        }}
      >
        Scam Forecast flagged this as high risk.
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

      <div
        style={{
          border: '1px solid #0f0f0f',
          borderRadius: '12px',
          padding: '16px',
          backgroundColor: '#ffffff',
          marginBottom: '12px',
        }}
      >
        <SeverityStripe severity="high" />
        <div style={{ marginBottom: '10px' }}>
          <Chip label="High severity" tone="danger" />
        </div>
        <Text
          style={{
            fontSize: '18px',
            fontWeight: 700,
            lineHeight: '24px',
            margin: '0 0 10px',
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
              borderLeft: '3px solid #ff4d4d',
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

      <PrimaryCta href={forecastUrl} label="See full forecast" />

      <Text
        style={{
          fontSize: '11px',
          color: '#525252',
          margin: '20px 0 0',
          textAlign: 'center',
        }}
      >
        You're getting this because instant alerts are on. You can turn them off anytime in{' '}
        <Link href={settingsUrl} style={{ color: '#0f0f0f', textDecoration: 'underline' }}>
          Settings
        </Link>
        .
      </Text>
    </EmailShell>
  );
}

export default InstantAlertEmail;