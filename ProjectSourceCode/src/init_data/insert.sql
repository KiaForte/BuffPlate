-- Seed a demo user (password: "buffalo")
-- Hash generated with bcrypt rounds=10
INSERT INTO users (username, email, password)
VALUES ('demo', 'demo@colorado.edu', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lihO')
ON CONFLICT DO NOTHING;
