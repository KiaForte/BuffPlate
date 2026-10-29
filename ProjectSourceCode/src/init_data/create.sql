CREATE TABLE IF NOT EXISTS users (
  id       SERIAL PRIMARY KEY,
  username VARCHAR(50)  UNIQUE NOT NULL,
  email    VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS menu_items (
  id           SERIAL PRIMARY KEY,
  date         DATE         NOT NULL,
  hall         VARCHAR(50)  NOT NULL DEFAULT 'c5',
  station_type VARCHAR(100) NOT NULL DEFAULT 'vc-meal-of-the-day',
  station      VARCHAR(255) NOT NULL DEFAULT 'Other',
  section      VARCHAR(255),
  name         VARCHAR(255) NOT NULL,
  calories     REAL,
  protein      REAL,
  carbs        REAL,
  fat          REAL,
  serving_text VARCHAR(100),
  tags         TEXT[],
  fetched_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Idempotent additions for databases created before this schema version
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS hall         VARCHAR(50)  NOT NULL DEFAULT 'c5';
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS station_type VARCHAR(100) NOT NULL DEFAULT 'vc-meal-of-the-day';
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS section      VARCHAR(255);
