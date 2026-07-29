import { Router } from "express";
import { pool } from "../db.js";
import { embedText } from "../gemini.js";

const router = Router();

function chunkText(text, chunkSize = 800, overlap = 100) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
  }
  return chunks;
}


router.post("/", async (req, res) => {
  const { source, text } = req.body;
  if (!text) return res.status(400).json({ error: "text is required" });

  try {
    const chunks = chunkText(text);
    let inserted = 0;

    for (const chunk of chunks) {
      const embedding = await embedText(chunk);
      await pool.query(
        `INSERT INTO documents (source, content, embedding) VALUES ($1, $2, $3)`,
        [source || null, chunk, JSON.stringify(embedding)]
      );
      inserted++;
    }

    res.json({ inserted });
  } catch (err) {
    console.error("Ingest error:", err);
    res.status(500).json({ error: "Failed to ingest document" });
  }
});

export default router;