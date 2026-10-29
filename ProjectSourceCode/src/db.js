require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  user:     process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  port:     parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
