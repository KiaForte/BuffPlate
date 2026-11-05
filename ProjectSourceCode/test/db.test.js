const assert = require('node:assert/strict');
const db = require('../src/db');

after(() => db.end());

describe('database', () => {
  it('connects to the test database and finds the menu_items table', async () => {
    const { rows } = await db.query(
      "SELECT current_database() AS database, to_regclass('public.menu_items') AS menu_table"
    );

    assert.strictEqual(rows[0].database, process.env.POSTGRES_DB);
    assert.strictEqual(rows[0].menu_table, 'menu_items');
  });
});