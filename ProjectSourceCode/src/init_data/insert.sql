-- Seed a demo user (password: "buffalo")
-- Hash generated with bcrypt rounds=10
await db.query(
  `INSERT INTO users
   (username, email, password, height_in, weight_lbs, gender)
   VALUES ($1, $2, $3, $4, $5, $6)`,
  [username, email, hash, height, weight, gender || null]
);