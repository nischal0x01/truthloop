/**
 * Footer — editorial statement.
 * Built for the UNESCO MIL Hackathon.
 *
 * Visual upgrade:
 *  - Staggered column reveals on scroll
 *  - Hover underline grow-from-left on every nav link
 *  - Larger wordmark
 */
import { motion } from 'motion/react';

const EASE = [0.32, 0.72, 0, 1] as const;

const groups = [
  {
    title: 'Product',
    links: [
      { label: 'How it works', href: '#loop' },
      { label: 'Blind spot', href: '#blind-spot' },
      { label: 'Forecast', href: '#forecast' },
    ],
  },
  {
    title: 'Build',
    links: [
      { label: 'Source', href: 'https://github.com' },
      { label: 'Architecture', href: '#' },
    ],
  },
  {
    title: 'Hackathon',
    links: [
      { label: 'Demo account', href: '#' },
      { label: 'Pitch deck', href: '#' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-background">
      <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        <div className="grid gap-10 md:grid-cols-12">
          <motion.div
            className="md:col-span-6"
            initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
            whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, ease: EASE }}
          >
            <p className="font-display text-display-medium text-foreground">TruthLoop.</p>
            <p
              className="mt-3 max-w-md text-body text-foreground/70"
              style={{ minWidth: 0, overflowWrap: 'anywhere' }}
            >
              A gamified misinformation-literacy platform built for the UNESCO MIL Hackathon.
              Hand-verified claims, AI moderation, personal weekly reports.
            </p>
          </motion.div>

          <motion.nav
            aria-label="Footer"
            className="grid gap-8 md:col-span-6 md:grid-cols-3"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
            }}
          >
            {groups.map((group) => (
              <motion.div
                key={group.title}
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  show: { opacity: 1, y: 0 },
                }}
                transition={{ duration: 0.6, ease: EASE }}
              >
                <p className="text-label-small font-semibold uppercase tracking-[0.08em] text-foreground">
                  {group.title}
                </p>
                <ul className="mt-3 flex flex-col gap-2">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="group relative inline-block text-body text-foreground"
                      >
                        <span>{link.label}</span>
                        <span
                          aria-hidden
                          className="absolute bottom-0 left-0 h-0.5 w-full origin-left scale-x-0 bg-foreground transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-x-100"
                        />
                      </a>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.nav>
        </div>

        <motion.div
          className="mt-12 flex flex-col gap-2 border-t-2 border-black pt-6 text-label-small text-foreground/60 md:flex-row md:items-center md:justify-between"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.3 }}
        >
          <p>© 2026 TruthLoop · Built for the UNESCO MIL Hackathon</p>
          <p>UNESCO MIL Hackathon · AI + MIL category</p>
        </motion.div>
      </div>
    </footer>
  );
}