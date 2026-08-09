# Project Context: TruthLoop (working title)

### Gamified Media & Information Literacy App — UNESCO MIL Hackathon

> Replace "TruthLoop" with your final name. This is written for Claude Code to scaffold directly. Scope is deliberately minimal — this is what should exist by demo time, nothing more.

---

## 1. The One-Sentence Idea

Users guess real-vs-fake on controversial claims, get the AI-verified truth immediately after, and at the end of the week get a **personalized report showing exactly what kind of misinformation fools them** — turning a quiz into self-knowledge.

**Focus Area:** AI and MIL
**Category:** Application/Website

---

## 2. Why This Wins (keep this framing in your pitch, don't drift from it)

Fake-vs-real news quiz games already exist (Factitious, Bad News, etc.) — a judge who's seen a few MIL hackathons will recognize the format instantly. **Your quiz mechanic is not the innovation. Say this out loud in your pitch, then pivot immediately to what is:**

> "Most MIL tools tell everyone the same advice. We show each person their own blind spot."

The weekly personalized report — "you got fooled by manipulated statistics 3 times this week, but you're great at spotting fake quotes" — is the actual differentiator. It's the difference between a fitness app that just logs workouts vs. one that tells you _your_ specific weakness. Everything you build should protect time and attention for making this one feature excellent. Do not let scope creep dilute it.

---

## 3. Core Loop (this is the entire product — resist adding more)

```
1. User sees a claim (headline/snippet), no verdict shown
2. User guesses: Real / Fake
3. Reveal: verdict + 2-3 sentence explanation + source link
4. Correct/incorrect recorded silently, next claim shown
5. Repeat for 5-10 claims per session
   ↓
End of week → Personalized Report (see Section 5) — THE hero feature
```

No streaks, no leaderboards, no badges, no ranks, no confidence sliders. Every one of those is a real feature in a mature product and a distraction in a 24-48 hour build. Points are the only gamification element you need — they're enough to make it feel like a game, and they feed nothing but the report.

---

## 4. What NOT to Build (say no to these, even if they sound cool mid-hackathon)

- ❌ Live news scraping / real-time ingestion — use a pre-written claim set
- ❌ Full RAG pipeline over the live web — pre-verify your claims by hand, write the explanations yourself, it'll be more accurate and reliable than live retrieval anyway
- ❌ Leaderboards, ranks, badges, streaks
- ❌ Multi-language support
- ❌ Mobile app
- ❌ User-submitted claims
- ❌ Social sharing infrastructure

Every one of these is a legitimate v2 idea. Mention them as "roadmap" in your pitch deck — judges like seeing you know where it could go, but building none of them protects you from a broken demo.

---

## 5. The Weekly Report — spend most of your design time here

This is your entire pitch. Everything else exists to generate data for this screen.

**Content (keep to exactly these 3 parts):**

1. **Accuracy** — "You got 12/16 right this week"
2. **Your blind spot** — one sentence naming the category of claim they got wrong most, e.g. "You're most often fooled by misleading statistics" (computed from a `category` tag on each claim)
3. **One replay** — show the single claim they got most confidently/clearly wrong again, with its explanation, as the memorable takeaway

That's it. No comparison charts, no trend graphs, no multi-week history for MVP — a clean, well-designed single card is more impressive live than a half-built analytics dashboard.

For the hackathon demo, **pre-seed one full example report** for a demo account so judges see the finished feature even if a real user hasn't played a full week yet.

---

## 6. Data You Need to Collect (minimum viable)

```
Claim
 - id, text, verdict (real/fake), category (e.g. "manipulated stat",
   "out-of-context quote", "satire mistaken as real", "old news resurfacing"),
   explanation, source_url

Guess
 - id, user_id, claim_id, user_answer, is_correct, timestamp
```

That's the whole schema. The category tag on each claim is the single most important field — it's what makes the weekly report personal instead of generic. Spend your claim-writing time making sure each claim has an honest category label.

---

## 7. Tech Stack (fastest path, not "best" path)

| Layer              | Choice                                                               | Why                                                                                                                                                    |
| ------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Frontend + Backend | Next.js (single repo)                                                | One codebase, fast to deploy, no separate backend to stand up                                                                                          |
| Auth + DB          | Supabase (Postgres + Auth)                                           | Auth working in minutes, generous free tier                                                                                                            |
| Report generation  | Simple aggregation query + Claude API for the one-sentence narrative | No need for a scheduled job — generate on-demand when user visits the report page and 7 days have passed (or just always show "this week so far" live) |
| Styling            | Tailwind                                                             | Fast, looks clean by default                                                                                                                           |
| Hosting            | Vercel                                                               | One-command deploy, reliable for live demo                                                                                                             |

---

## 8. Claim Dataset (build this first, before any code)

Write **15-20 claims by hand** before touching the app:

- Mix real and fake roughly 50/50
- Tag each with a category (see Section 6)
- Write your own 2-3 sentence explanation + one real source link for each — don't rely on an LLM to fact-check live during the hackathon, pre-verify everything yourselves so the demo is never wrong
- Pick claims your audience will recognize (skew toward Nepal/South Asia + globally well-known controversies) so the "aha, I remember that one" moment lands with judges too

This is the highest-leverage 2 hours of the entire hackathon. A great claim set with mediocre code beats a great app with a lazy claim set.

---

## 9. Build Order (in priority order — stop anywhere and still have a demo)

1. Claim dataset (Section 8) — do this first, by hand
2. Static guess → reveal flow, no auth, no database (hardcoded claims array) — get the core loop _feeling good_ first
3. Add Supabase auth + save guesses to DB
4. Build the weekly report screen off real (or seeded) guess data
5. Visual polish pass — this is what judges remember
6. (Only if time remains) anything from the "what not to build" list

If you run out of time at step 3 or 4, you still have a demoable product. Never let polish or extra features come before the core loop and the report both working end-to-end.

---

## 10. Pitch Structure (60-90 seconds)

1. **Hook**: "Everyone gets the same MIL advice. But you and I are fooled by different things." (10s)
2. **Demo the core loop live** — 2 claims, guess, reveal (20s)
3. **Demo the weekly report** — this is the moment to slow down (20s)
4. **The insight**: name-drop that this mirrors how real MIL trainers work with individuals, not generic checklists (10s)
5. **Be honest about AI limits** — "we hand-verified our claims for reliability; a production version would need a hardened verification pipeline" (10s) — judges reward honesty about scope over overclaiming
6. **Roadmap in one sentence**: live news ingestion, community/classroom mode, multi-language (10s)

---

## 11. Open Questions for the Team

- [ ] Final project name
- [ ] Who writes the 15-20 claim dataset (do this first, tonight)
- [ ] Who owns core loop UI vs. weekly report UI vs. Supabase setup
- [ ] Confirm demo account will have a pre-seeded full week of guesses so the report always looks complete
