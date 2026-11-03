const halls = require('../config/menus');

const MACROS = ['calories', 'protein', 'carbs', 'fat'];
const WEIGHTS = { calories: 1, protein: 1.5, carbs: 0.5, fat: 0.5 };
const SERVINGS = [1, 2];
const MIN_CALORIES = 15;
const SAME_STATION_BONUS = 0.02;

const SKIP_SECTION = /condiment|dressing|topping|cheeses|dessert|ice cream|\bbreads?\b|tortilla|leafy greens|deli bar/i;
const SKIP_NAME = /sauce|dressing|syrup|sprinkle|gravy|salsa|ketchup|mustard|mayo|aioli|vinaigrette|cookie|\bcake|brownie/i;
const MAIN_SECTION = /entree|protein|grill|pizza|flatbread|pasta/i;

function servesMeal(item, meal) {
  if (!meal) return true;
  const hall = halls.find(h => h.id === item.hall);
  if (!hall || !hall.stations) return true;
  const station = hall.stations.find(s => s.label === item.station);
  if (!station || !station.mealTimes) return true;
  return station.mealTimes.includes(meal);
}

function roleOf(item) {
  if (item.protein >= 10) return 'main';
  if (MAIN_SECTION.test(item.section || '') && item.calories >= 100) return 'main';
  return 'side';
}

function eligibleItems(menuItems, request = {}) {
  const targets = request.targets || {};
  const seen = [];
  const pool = [];

  for (const item of menuItems) {
    if (item.calories == null || item.calories < MIN_CALORIES) continue;
    if (targets.calories && item.calories > targets.calories) continue;
    if (SKIP_SECTION.test(item.section || '') || SKIP_NAME.test(item.name)) continue;
    if (!servesMeal(item, request.meal)) continue;

    const name = item.name.toLowerCase();
    if (seen.includes(name)) continue;
    seen.push(name);

    pool.push({ ...item, role: roleOf(item) });
  }
  return pool;
}