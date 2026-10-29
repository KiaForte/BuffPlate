const path  = require('path');
const fs    = require('fs');
const db    = require('../db');
const halls = require('../config/menus');

const API_BASE  = 'https://colorado-diningmenus.api.nutrislice.com/menu/api/weeks/school';
const CACHE_TTL = 60 * 60 * 1000;

// ── Pure parsing ──────────────────────────────────────────────────────────────

function parseItems(days, targetDate, { hallId, stationLabel }) {
  const day = days.find(d => d.date === targetDate);
  if (!day) return [];

  const items = [];
  let section = null;

  for (const item of day.menu_items ?? []) {
    if (item.is_section_title) {
      section = item.text ?? null;
      continue;
    }
    const food = item.food;
    if (!food) continue;

    const n = food.rounded_nutrition_info ?? {};
    const s = food.serving_size_info     ?? {};

    // icons may be an array of strings/objects, or { food_icons: [...] }
    const rawIcons = Array.isArray(food.icons)
      ? food.icons
      : Array.isArray(food.icons?.food_icons)
        ? food.icons.food_icons
        : [];

    items.push({
      date:        targetDate,
      hall:        hallId,
      station:     stationLabel,
      section,
      name:        food.name,
      calories:    n.calories  ?? null,
      protein:     n.g_protein ?? null,
      carbs:       n.g_carbs   ?? null,
      fat:         n.g_fat     ?? null,
      servingText: s.serving_size_amount && s.serving_size_unit
                     ? `${s.serving_size_amount} ${s.serving_size_unit}`
                     : null,
      tags: rawIcons.map(t => (typeof t === 'string' ? t : (t.name ?? ''))).filter(Boolean),
    });
  }

  return items;
}

// ── Cache helpers ─────────────────────────────────────────────────────────────

async function isCacheFresh(hallId, menuType, isoDate) {
  const { rows } = await db.query(
    `SELECT MAX(fetched_at) AS latest FROM menu_items
     WHERE hall = $1 AND station_type = $2 AND date = $3`,
    [hallId, menuType, isoDate]
  );
  const latest = rows[0]?.latest;
  return latest != null && Date.now() - new Date(latest).getTime() < CACHE_TTL;
}

async function readCache(hallId, menuType, isoDate) {
  const { rows } = await db.query(
    `SELECT hall, station, section, name, calories, protein, carbs, fat, serving_text, tags
     FROM menu_items WHERE hall = $1 AND station_type = $2 AND date = $3 ORDER BY id`,
    [hallId, menuType, isoDate]
  );
  return rows.map(r => ({
    date:        isoDate,
    hall:        r.hall,
    station:     r.station,
    section:     r.section,
    name:        r.name,
    calories:    r.calories,
    protein:     r.protein,
    carbs:       r.carbs,
    fat:         r.fat,
    servingText: r.serving_text,
    tags:        r.tags ?? [],
  }));
}

async function writeCache(items, menuType) {
  if (!items.length) return;
  const { hall, date } = items[0];
  await db.query(
    'DELETE FROM menu_items WHERE hall = $1 AND station_type = $2 AND date = $3',
    [hall, menuType, date]
  );
  const now = new Date();
  for (const item of items) {
    await db.query(
      `INSERT INTO menu_items
         (date, hall, station_type, station, section, name, calories, protein, carbs, fat, serving_text, tags, fetched_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [item.date, item.hall, menuType, item.station, item.section,
       item.name, item.calories, item.protein, item.carbs, item.fat,
       item.servingText, item.tags, now]
    );
  }
}

// ── Fixture fallback ──────────────────────────────────────────────────────────

function loadFixture(hallId, stationLabel) {
  const p    = path.join(__dirname, '../init_data/menu_fixture.json');
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  return parseItems(data.days, data.days[0]?.date ?? '', { hallId, stationLabel });
}

// ── Public API ────────────────────────────────────────────────────────────────

async function fetchStation(hallId, menuType, date) {
  const hall = halls.find(h => h.id === hallId);
  if (!hall) throw new Error(`Unknown hall: ${hallId}`);

  const stationCfg  = hall.stations?.find(s => s.menuType === menuType);
  const stationLabel = stationCfg?.label ?? menuType;

  const d    = new Date(date);
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  const iso  = `${yyyy}-${mm}-${dd}`;

  if (await isCacheFresh(hallId, menuType, iso)) {
    return readCache(hallId, menuType, iso);
  }

  try {
    const url = `${API_BASE}/${hall.slug}/menu-type/${menuType}/${yyyy}/${mm}/${dd}?format=json`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BuffPlate/1.0)' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data  = await res.json();
    const items = parseItems(data.days ?? [], iso, { hallId, stationLabel });

    if (items.length > 0) {
      await writeCache(items, menuType);
      return items;
    }
  } catch (err) {
    console.error(`[menu] ${hallId}/${menuType} fetch failed:`, err.message);
  }

  const stale = await readCache(hallId, menuType, iso);
  if (stale.length > 0) return stale;

  return loadFixture(hallId, stationLabel);
}

async function fetchHallMenu(hallId, date) {
  const hall = halls.find(h => h.id === hallId);
  if (!hall?.live) throw new Error(`Hall not available: ${hallId}`);

  const results = await Promise.allSettled(
    hall.stations.map(s => fetchStation(hallId, s.menuType, date))
  );

  return results.flatMap(r => (r.status === 'fulfilled' ? r.value : []));
}

module.exports = { fetchStation, fetchHallMenu, parseItems };
