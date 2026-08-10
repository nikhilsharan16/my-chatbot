import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

// POST /api/stats/load  { rows: [{ player, eco, opening_name, total_games, wins, draws, losses, white_games, win_pct }, ...] }
router.post("/load", async (req, res) => {
  const { rows } = req.body;
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: "rows array is required" });
  }

  try {
    let inserted = 0;
    for (const r of rows) {
      await pool.query(
        `INSERT INTO opening_stats
          (player, eco, opening_name, total_games, wins, draws, losses, white_games, win_pct)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [r.player, r.eco, r.opening_name, r.total_games, r.wins, r.draws, r.losses, r.white_games, r.win_pct]
      );
      inserted++;
    }
    res.json({ inserted });
  } catch (err) {
    console.error("Stats load error:", err);
    res.status(500).json({ error: "Failed to load stats" });
  }
});

export default router;