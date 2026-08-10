import "dotenv/config";
import express from "express";
import cors from "cors";
import ingestRouter from "./src/routes/ingest.js";
import chatRouter from "./src/routes/chat.js";
import statsRouter from "./src/routes/stats.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "5mb" })); // raise if ingesting large docs

app.use("/api/ingest", ingestRouter);
app.use("/api/chat", chatRouter);
app.use("/api/stats", statsRouter);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});