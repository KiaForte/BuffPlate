const path = require('path');
const fs   = require('fs');
const db   = require('../db');

const API_BASE   = 'https://colorado-diningmenus.api.nutrislice.com/menu/api/weeks/school/village-center-dining/menu-type/vc-meal-of-the-day';
const CACHE_TTL  = 60 * 60 * 1000; // 1 hour in ms

// ── Pure parsing ──────────────────────────────────────────────────────────────

/**
 * Parse one day's worth of menu items from the Nutrislice `days` array.
 * Exported so it can be unit-tested without a database.
 *
 * @param {object[]} days       Top-level `days` array from the API response.
 * @param {string}   targetDate ISO date string "YYYY-MM-DD".
 * @returns {{ date, station, name, calories, protein, carbs, fat, servingText, tags }[]}
 */
function parseItems(days, targetDate) {
  const day = days.find(d => d.date === targetDate);
  if (!day) return [];

  const items = [];
  let station = 'Other';

  for (const item of day.menu_items ?? []) {
    if (item.is_section_title) {
      station = item.text ?? 'Other';
      continue;
    }
    const food = item.food;
    if (!food) continue;

    const n = food.rounded_nutrition_info ?? {};
    const s = food.serving_size_info     ?? {};
    const rawTags = Array.isArray(food.icons) ? food.icons : [];

    items.push({
      date:        targetDate,
      station,
      name:        food.name,
      calories:    n.calories  ?? null,
      protein:     n.g_protein ?? null,
      carbs:       n.g_carbs   ?? null,
      fat:         n.g_fat     ?? null,
      servingText: s.serving_size_amount && s.serving_size_unit
                     ? `${s.serving_size_amount} ${s.serving_size_unit}`
                     : null,
      tags: rawTags.map(t => (typeof t === 'string' ? t : (t.name ?? ''))).filter(Boolean),
    });
  }

  return items;
}

// ── Cache helpers ─────────────────────────────────────────────────────────────

async function isCacheFresh(isoDate) {
  const { rows } = await db.query(
    `SELECT MAX(fetched_at) AS latest FROM menu_items WHERE date = $1`,
    [isoDate]
  );
  const latest = rows[0]?.latest;
  return latest != null && Date.now() - new Date(latest).getTime() < CACHE_TTL;
}

async function readCache(isoDate) {
  const { rows } = await db.query(
    `SELECT station, name, calories, protein, carbs, fat, serving_text, tags
     FROM menu_items WHERE date = $1 ORDER BY id`,
    [isoDate]
  );
  return rows.map(r => ({
    date:        isoDate,
    station:     r.station,
    name:        r.name,
    calories:    r.calories,
    protein:     r.protein,
    carbs:       r.carbs,
    fat:         r.fat,
    servingText: r.serving_text,
    tags:        r.tags ?? [],
  }));
}

async function writeCache(items) {
  if (!items.length) return;
  const now = new Date();
  await db.query('DELETE FROM menu_items WHERE date = $1', [items[0].date]);
  for (const item of items) {
    await db.query(
      `INSERT INTO menu_items (date, station, name, calories, protein, carbs, fat, serving_text, tags, fetched_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [item.date, item.station, item.name, item.calories, item.protein,
       item.carbs, item.fat, item.servingText, item.tags, now]
    );
  }
}

// ── Fixture fallback ──────────────────────────────────────────────────────────

function loadFixture() {
  const fixturePath = path.join(__dirname, '../init_data/menu_fixture.json');
  const data = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  return parseItems(data.days, data.days[0]?.date ?? '');
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Return menu items for the given date.
 * Hits the Postgres cache first; refreshes from Nutrislice at most once per hour.
 * Falls back to stale cache then fixture if the network call fails.
 *
 * @param {Date|string} date
 * @returns {Promise<object[]>}
 */
async function fetchMenu(date) {
  const d    = new Date(date);
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  const iso  = `${yyyy}-${mm}-${dd}`;

  if (await isCacheFresh(iso)) {
    return readCache(iso);
  }

  try {
    const url = `${API_BASE}/${yyyy}/${mm}/${dd}?format=json`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (BuffPlate/1.0; +https://github.com/KiaForte/BuffPlate)' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data  = await res.json();
    const items = parseItems(data.days ?? [], iso);

    if (items.length > 0) {
      await writeCache(items);
      return items;
    }
  } catch (err) {
    console.error('[menu] Nutrislice fetch failed:', err.message);
  }

  // Return stale cache if available, otherwise throw so the caller can show an error
  const stale = await readCache(iso);
  if (stale.length > 0) return stale;
  throw new Error('Menu unavailable — Nutrislice fetch failed and no cached data exists.');
}

module.exports = { fetchMenu, parseItems };
