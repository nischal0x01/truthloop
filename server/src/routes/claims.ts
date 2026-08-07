import { Router } from 'express';
import { query } from '@/db';
import { AppError } from '@/middleware/errorHandler';

const router = Router();

interface Claim {
  id: string;
  text: string;
  verdict: 'real' | 'fake';
  category: string;
  explanation: string;
  source_url: string | null;
  created_at: Date;
}

interface Guess {
  id: string;
  user_id: string;
  claim_id: string;
  user_answer: 'real' | 'fake';
  is_correct: boolean;
  created_at: Date;
}

// GET /claims - Fetch all claims
router.get('/', async (_req, res) => {
  const result = await query<Claim>(
    'SELECT * FROM claims ORDER BY created_at DESC'
  );
  res.json({ claims: result.rows });
});

// GET /claims/:id - Fetch a single claim
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const result = await query<Claim>(
    'SELECT * FROM claims WHERE id = $1',
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError(404, 'Claim not found');
  }

  res.json({ claim: result.rows[0] });
});

// POST /claims/:id/guess - Record a guess
router.post('/:id/guess', async (req, res) => {
  const { id } = req.params;
  const { user_id, user_answer } = req.body;

  if (!user_id || !user_answer) {
    throw new AppError(400, 'user_id and user_answer are required');
  }

  if (!['real', 'fake'].includes(user_answer)) {
    throw new AppError(400, 'user_answer must be "real" or "fake"');
  }

  // Fetch the claim to check correctness
  const claimResult = await query<Claim>(
    'SELECT * FROM claims WHERE id = $1',
    [id]
  );

  if (claimResult.rows.length === 0) {
    throw new AppError(404, 'Claim not found');
  }

  const claim = claimResult.rows[0];
  const isCorrect = claim.verdict === user_answer;

  // Insert the guess
  const guessResult = await query<Guess>(
    `INSERT INTO guesses (user_id, claim_id, user_answer, is_correct)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [user_id, id, user_answer, isCorrect]
  );

  res.status(201).json({
    guess: guessResult.rows[0],
    correct: isCorrect,
    claim: {
      id: claim.id,
      text: claim.text,
      verdict: claim.verdict,
      explanation: claim.explanation,
      source_url: claim.source_url,
    },
  });
});

// GET /users/:userId/report - Get weekly report for a user
router.get('/users/:userId/report', async (req, res) => {
  const { userId } = req.params;

  // Get accuracy stats for the week
  const accuracyResult = await query<{ total: string; correct: string }>(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct
     FROM guesses
     WHERE user_id = $1
       AND created_at >= NOW() - INTERVAL '7 days'`,
    [userId]
  );

  const { total, correct } = accuracyResult.rows[0];
  const totalNum = parseInt(total, 10) || 0;
  const correctNum = parseInt(correct, 10) || 0;

  // Get blind spot (most missed category)
  const blindSpotResult = await query<{ category: string; wrong_count: string }>(
    `SELECT c.category, COUNT(*) as wrong_count
     FROM guesses g
     JOIN claims c ON g.claim_id = c.id
     WHERE g.user_id = $1
       AND g.is_correct = false
       AND g.created_at >= NOW() - INTERVAL '7 days'
     GROUP BY c.category
     ORDER BY wrong_count DESC
     LIMIT 1`,
    [userId]
  );

  const blindSpot = blindSpotResult.rows[0]?.category || null;

  // Get most confidently wrong claim
  const wrongClaimResult = await query<Claim & { user_answer: string }>(
    `SELECT c.*, g.user_answer
     FROM guesses g
     JOIN claims c ON g.claim_id = c.id
     WHERE g.user_id = $1
       AND g.is_correct = false
       AND g.created_at >= NOW() - INTERVAL '7 days'
     ORDER BY g.created_at DESC
     LIMIT 1`,
    [userId]
  );

  const replayClaim = wrongClaimResult.rows[0] || null;

  res.json({
    report: {
      accuracy: totalNum > 0 ? `${correctNum}/${totalNum}` : '0/0',
      blind_spot: blindSpot
        ? `You're most often fooled by ${blindSpot}`
        : null,
      replay_claim: replayClaim
        ? {
            text: replayClaim.text,
            explanation: replayClaim.explanation,
            source_url: replayClaim.source_url,
          }
        : null,
    },
  });
});

export default router;