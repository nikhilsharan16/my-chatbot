import { Router } from "express";
import { pool } from "../db.js";
import { embedText, generateWithContext } from "../gemini.js";

const router = Router();

router.post("/", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "message is required" });

  try {
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
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Failed to generate response" });
  }
});

export default router;