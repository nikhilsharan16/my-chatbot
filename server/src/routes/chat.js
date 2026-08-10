import { Router } from "express";
import { pool } from "../db.js";
import { embedText, generateWithContext, generateFromFacts } from "../gemini.js";

const router = Router();

const PLAYERS = [
  "Carlsen", "Caruana", "Erigaisi", "Firouzja", "Giri",
  "Gukesh", "Keymer", "Nakamura", "Praggnanandhaa", "Wei",
];

// Words that signal a ranking/aggregation question — these can't be answered
// by vector similarity, since retrieval only sees the top-k closest chunks,
// never "all of a player's data compared against each other".
const AGGREGATION_KEYWORDS = [
  "most", "least", "top", "best", "worst", "highest", "lowest",
  "favorite", "favourite", "prefers", "aggressive",
];

function detectPlayer(message) {
  const lower = message.toLowerCase();
  return PLAYERS.find((p) => lower.includes(p.toLowerCase())) || null;
}

function isAggregationQuery(message) {
  const lower = message.toLowerCase();
  return AGGREGATION_KEYWORDS.some((k) => lower.includes(k));
}

function detectMetric(message) {
  const lower = message.toLowerCase();
  if (lower.includes("win") || lower.includes("best") || lower.includes("success")) {
    return "win_pct";
  }
  return "total_games"; // default: "most played" style questions
}

// Handles "most/least/best/worst" style questions with a real SQL aggregate.
async function handleAggregationQuery(message, res) {
  const player = detectPlayer(message);
  if (!player) {
    return res.json({
      answer: "I can answer that if you name a specific player — try including their name in the question.",
      sources: [],
    });
  }

  const metric = detectMetric(message);
  const wantsLeast = /least|worst|lowest/i.test(message);
  const orderDirection = wantsLeast ? "ASC" : "DESC";

  const { rows } = await pool.query(
    `SELECT opening_name, eco, total_games, win_pct, white_games
     FROM opening_stats
     WHERE player = $1
     ORDER BY ${metric} ${orderDirection}
     LIMIT 3`,
    [player]
  );

  if (rows.length === 0) {
    return res.json({
      answer: `I don't have opening stats for ${player} yet.`,
      sources: [],
    });
  }

  const facts = rows
    .map((r) => `${player} — ${r.opening_name} (ECO ${r.eco}): ${r.total_games} games, ${r.win_pct}% win rate, played as White ${r.white_games}/${r.total_games} times`)
    .join("\n");

  console.log("Aggregation facts:", facts);
  const answer = await generateFromFacts(message, facts);

  res.json({
    answer,
    sources: rows.map((r) => `${player}-${r.eco}`),
  });
}

// Handles specific "how does X do with Y opening" style questions via
// vector similarity search against pre-written text chunks.
async function handleRetrievalQuery(message, res) {
  const queryEmbedding = await embedText(message);
  const topK = Number(process.env.TOP_K) || 5;
  const embeddingParam = JSON.stringify(queryEmbedding);

  const { rows } = await pool.query(
    `SELECT content, source, 1 - (embedding <=> $1::vector) AS similarity
     FROM documents
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    [embeddingParam, topK]
  );

  const answer = await generateWithContext(message, rows);

  res.json({ answer, sources: rows.map((r) => r.source).filter(Boolean) });
}

// POST /api/chat  { message: "..." }
router.post("/", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "message is required" });

  try {
    if (isAggregationQuery(message)) {
      await handleAggregationQuery(message, res);
    } else {
      await handleRetrievalQuery(message, res);
    }
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Failed to generate response" });
  }
});

export default router;