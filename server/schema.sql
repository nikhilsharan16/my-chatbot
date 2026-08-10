

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  source TEXT,               
  content TEXT NOT NULL,     
  embedding vector(768),     
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS opening_stats (
  id SERIAL PRIMARY KEY,
  player TEXT NOT NULL,
  eco TEXT NOT NULL,
  opening_name TEXT NOT NULL,
  total_games INT NOT NULL,
  wins INT NOT NULL,
  draws INT NOT NULL,
  losses INT NOT NULL,
  white_games INT NOT NULL,
  win_pct NUMERIC(5,1) NOT NULL
);

CREATE INDEX IF NOT EXISTS opening_stats_player_idx ON opening_stats (player);


CREATE INDEX IF NOT EXISTS documents_embedding_idx
  ON documents USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);