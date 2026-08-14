/**
 * Shared email layout — every TruthLoop email wraps its body in this
 * shell. Matches the Gumroad design tokens used on the web:
 *   - off-white background (#f4f4f0)
 *   - 1px black borders, no box-shadows
 *   - hot-pink accent (#ff90e8) on the primary CTA
 *   - sans-serif stack: Inter (free fallback for ABC Favorit)
 *
 * Why a custom layout instead of `@react-email/components`' `Html`?
 *   We render the table-based fallback inside the React Email `Html` so
 *   Outlook/older clients still see something sensible, but we control
 *   the wrapper itself — headers, footers, the "Manage notifications"
 *   link all live in one place.
 */

import * as React from 'react';
import {
  Body as EmailBody,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

export interface EmailShellProps {
  /** Preheader text — shown in inbox list previews. ~50-90 chars ideal. */
  preview: string;
  /** Short subtitle shown in the header bar (e.g. "Weekly blind-spot report"). */
  eyebrow: string;
  /** Used for "Manage notifications" link in the footer. */
  settingsUrl: string;
  children: React.ReactNode;
}

const FONT_STACK =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

const styles = {
  body: {
    backgroundColor: '#f4f4f0',
    fontFamily: FONT_STACK,
    margin: 0,
    padding: 0,
    color: '#0f0f0f',
  },
  container: {
    margin: '0 auto',
    padding: '24px 16px 40px',
    maxWidth: '560px',
  },
  header: {
    backgroundColor: '#0f0f0f',
    color: '#f4f4f0',
    padding: '14px 20px',
    border: '1px solid #0f0f0f',
    borderRadius: '12px 12px 0 0',
  },
  headerWordmark: {
    fontSize: '18px',
    fontWeight: 700,
    letterSpacing: '-0.01em',
    margin: 0,
  },
  headerEyebrow: {
    fontSize: '11px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.14em',
    color: '#ff90e8',
    margin: '4px 0 0',
    fontWeight: 600,
  },
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #0f0f0f',
    borderTop: 'none',
    borderRadius: '0 0 12px 12px',
    padding: '28px 24px',
  },
  hr: {
    border: 'none',
    borderTop: '1px solid #0f0f0f',
    margin: '24px 0 12px',
    opacity: 0.12,
  },
  footer: {
    padding: '16px 4px 0',
    textAlign: 'center' as const,
  },
  footerText: {
    fontSize: '12px',
    color: '#525252',
    lineHeight: '18px',
    margin: '4px 0',
  },
  footerLink: {
    color: '#0f0f0f',
    textDecoration: 'underline',
    fontWeight: 600,
  },
} satisfies Record<string, React.CSSProperties>;

export function EmailShell({
  preview,
  eyebrow,
  settingsUrl,
  children,
}: EmailShellProps) {
  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{preview}</Preview>
      <EmailBody style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Text style={styles.headerWordmark}>TruthLoop</Text>
            <Text style={styles.headerEyebrow}>{eyebrow}</Text>
          </Section>
          <Section style={styles.card}>{children}</Section>
          <Hr style={styles.hr} />
          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              You're getting this because you opted on to TruthLoop emails.
            </Text>
            <Text style={styles.footerText}>
              <Link href={settingsUrl} style={styles.footerLink}>
                Manage notifications
              </Link>{' '}
              · TruthLoop · Built for the UNESCO MIL Hackathon
            </Text>
          </Section>
        </Container>
      </EmailBody>
    </Html>
  );
}

/* ── Re-usable building blocks shared across templates ────────────── */

/** Pill-shaped category chip used inside the weekly report and digest. */
export function Chip({
  label,
  tone = 'accent',
}: {
  label: string;
  tone?: 'accent' | 'neutral' | 'success' | 'danger';
}) {
  const palette = {
    accent: { bg: '#ff90e8', fg: '#0f0f0f' },
    neutral: { bg: '#e6e6e0', fg: '#0f0f0f' },
    success: { bg: '#b8e8b0', fg: '#0a3d05' },
    danger: { bg: '#ffb4a8', fg: '#4d0d04' },
  }[tone];
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: '999px',
        border: '1px solid #0f0f0f',
        backgroundColor: palette.bg,
        color: palette.fg,
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </span>
  );
}

/** Severity stripe + badge pair used in forecast templates. */
export function SeverityStripe({ severity }: { severity: 'low' | 'medium' | 'high' }) {
  const color =
    severity === 'high' ? '#ff4d4d' : severity === 'medium' ? '#f5b400' : '#7ad36b';
  return (
    <div
      aria-hidden
      style={{
        height: '6px',
        width: '100%',
        backgroundColor: color,
        borderRadius: '999px',
        marginBottom: '12px',
      }}
    />
  );
}

/** Outlined CTA pill — black border, hot-pink fill, offset on hover is not
 *  possible in email so we keep it static but visually loud. */
export function PrimaryCta({ href, label }: { href: string; label: string }) {
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} border={0} style={{ margin: '16px 0 8px' }}>
      <tr>
        <td
          align="center"
          style={{
            backgroundColor: '#ff90e8',
            border: '1px solid #0f0f0f',
            borderRadius: '999px',
            padding: 0,
          }}
        >
          <Link
            href={href}
            style={{
              display: 'inline-block',
              padding: '10px 20px',
              color: '#0f0f0f',
              fontWeight: 700,
              fontSize: '13px',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              textDecoration: 'none',
            }}
          >
            {label}
          </Link>
        </td>
      </tr>
    </table>
  );
}

/** Section heading inside a card body. */
export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        fontSize: '11px',
        textTransform: 'uppercase',
        letterSpacing: '0.16em',
        fontWeight: 700,
        color: '#525252',
        margin: '0 0 8px',
      }}
    >
      {children}
    </Text>
  );
}

/** Body paragraph with consistent typography. */
export function Body({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        fontSize: '15px',
        lineHeight: '22px',
        margin: '0 0 12px',
        color: '#0f0f0f',
      }}
    >
      {children}
    </Text>
  );
}