CREATE TABLE IF NOT EXISTS channel_scalp_shadow_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT,
  timeframe TEXT,
  detected INTEGER,
  direction TEXT,
  side TEXT,
  confidence REAL,
  quality_score REAL,
  price_position REAL,
  breakout_risk TEXT,
  rr REAL,
  decision TEXT,
  reason TEXT,
  payload_json TEXT,
  created_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_channel_scalp_shadow_symbol_time
ON channel_scalp_shadow_logs(symbol, timeframe, created_at);

CREATE INDEX IF NOT EXISTS idx_channel_scalp_shadow_detected
ON channel_scalp_shadow_logs(detected, symbol, created_at);
