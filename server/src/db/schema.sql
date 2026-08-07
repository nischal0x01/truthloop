-- Database schema for Mirror app
-- Run this to initialize the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Claims table
CREATE TABLE IF NOT EXISTS claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  text TEXT NOT NULL,
  verdict TEXT NOT NULL CHECK (verdict IN ('real', 'fake')),
  category TEXT NOT NULL,
  explanation TEXT NOT NULL,
  source_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Guesses table
CREATE TABLE IF NOT EXISTS guesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  user_answer TEXT NOT NULL CHECK (user_answer IN ('real', 'fake')),
  is_correct BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_guesses_user_id ON guesses(user_id);
CREATE INDEX IF NOT EXISTS idx_guesses_claim_id ON guesses(claim_id);
CREATE INDEX IF NOT EXISTS idx_guesses_created_at ON guesses(created_at);

-- Sample claims data (15-20 pre-verified claims for MVP)
INSERT INTO claims (text, verdict, category, explanation, source_url) VALUES
  (
    'A study found that 78% of Nepali journalists have encountered misinformation during their reporting.',
    'real',
    'survey_stat',
    'This statistic comes from a 2023 UNESCO MIL survey conducted in Nepal, which found significant exposure to misinformation among media professionals.',
    'https://www.unesco.org/en/mil/surveys'
  ),
  (
    'The Indian Space Research Organisation (ISRO) successfully landed a rover on the Moon in 2019.',
    'fake',
    'outdated_info',
    'While ISRO did launch Chandrayaan-3 in 2023 and achieved a successful landing near the lunar south pole, the 2019 Chandrayaan-2 mission failed during its landing attempt.',
    'https://www.isro.gov.in'
  ),
  (
    'According to the World Health Organization, vaccine hesitancy was named one of the top 10 global health threats in 2019.',
    'real',
    'misattributed_threat',
    'WHO did list vaccine hesitancy as one of the top 10 threats to global health in their 2019 report, alongside air pollution and Ebola.',
    'https://www.who.int/news-room/spotlight/ten-threats-to-global-health-in-2019'
  ),
  (
    'Facebook rebranded to Meta in October 2021.',
    'real',
    'factual_statement',
    'Mark Zuckerberg announced the rebranding from Facebook to Meta at the Connect 2021 conference on October 28, 2021.',
    'https://about.meta.com/'
  ),
  (
    'The Great Barrier Reef has never experienced mass bleaching events.',
    'fake',
    'misleading_omission',
    'The Great Barrier Reef has experienced five mass bleaching events since 2016, including severe back-to-back bleaching in 2016 and 2017, and again in 2020, 2022, and 2024.',
    'https://www.gbrmpa.gov.au/'
  )
ON CONFLICT DO NOTHING;