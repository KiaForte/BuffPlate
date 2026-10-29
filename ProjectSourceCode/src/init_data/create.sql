CREATE TABLE IF NOT EXISTS users (
  id       SERIAL PRIMARY KEY,
  username VARCHAR(50)  UNIQUE NOT NULL,
  email    VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS menu_items (
  id           SERIAL PRIMARY KEY,
  date         DATE         NOT NULL,
  station      VARCHAR(255) NOT NULL DEFAULT 'Other',
  name         VARCHAR(255) NOT NULL,
  calories     REAL,
  protein      REAL,
  carbs        REAL,
  fat          REAL,
  serving_text VARCHAR(100),
  tags         TEXT[],
  fetched_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);
