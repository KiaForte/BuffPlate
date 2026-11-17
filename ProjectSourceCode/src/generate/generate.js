
const halls = require('../config/menus');

const MACROS = ['calories', 'protein', 'carbs', 'fat'];

const WEIGHTS = {
  calories: 1,
  protein: 1.5,
  carbs: 0.5,
  fat: 0.5
};

const SERVINGS = [0.5, 1, 1.5, 2];
const MIN_CALORIES = 15;
const SAME_STATION_BONUS = 0.02;

const SKIP_SECTION =
  /condiment|dressing|topping|cheeses|dessert|ice cream|\bbreads?\b|tortilla|leafy greens|deli bar/i;

const SKIP_NAME =
  /sauce|dressing|syrup|sprinkle|gravy|salsa|ketchup|mustard|mayo|aioli|vinaigrette|cookie|\bcake|brownie/i;

const MAIN_SECTION =
  /entree|protein|grill|pizza|flatbread|pasta/i;

// Check whether a food is available for the selected meal.
function servesMeal(item, meal) {
  if (!meal) return true;

  const hall = halls.find(h => h.id === item.hall);
  if (!hall || !hall.stations) return true;

  const station = hall.stations.find(
    s => s.label === item.station
  );

  if (!station || !station.mealTimes) return true;

  return station.mealTimes.includes(meal);
}

// Classify a food as a main dish or side.
function roleOf(item) {
  if (Number(item.protein) >= 10) return 'main';

  if (
    MAIN_SECTION.test(item.section || '') &&
    Number(item.calories) >= 100
  ) {
    return 'main';
  }

  return 'side';
}

// Remove foods that should not be recommended.
function eligibleItems(menuItems, request = {}) {
  const targets = request.targets || {};
  const seen = new Set();
  const pool = [];

  for (const item of menuItems || []) {
    const calories = Number(item.calories);

    if (!Number.isFinite(calories)) continue;
    if (calories < MIN_CALORIES) continue;

    if (
      targets.calories &&
      calories > Number(targets.calories) * 1.5
    ) {
      continue;
    }

    if (SKIP_SECTION.test(item.section || '')) continue;
    if (SKIP_NAME.test(item.name || '')) continue;
    if (!servesMeal(item, request.meal)) continue;

    const name = String(item.name || '').toLowerCase().trim();
    if (!name || seen.has(name)) continue;

    const excludedTags = request.excludeTags || [];
    const tags = (item.tags || []).map(t =>
      String(t).toLowerCase()
    );

    if (
      excludedTags.some(tag =>
        tags.some(t => t.includes(String(tag).toLowerCase()))
      )
    ) {
      continue;
    }

    seen.add(name);

    pool.push({
      ...item,
      calories,
      protein: Number(item.protein) || 0,
      carbs: Number(item.carbs) || 0,
      fat: Number(item.fat) || 0,
      role: roleOf(item)
    });
  }

  return pool;
}

// Calculate the nutrition for a chosen portion.
function portionNutrition(item, servings) {
  const result = {
    ...item,
    servings
  };

  for (const macro of MACROS) {
    result[macro] =
      Math.round((Number(item[macro]) || 0) * servings * 10) / 10;
  }

  return result;
}

// Add up the nutrition for an entire meal.
function calculateTotals(items) {
  const totals = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  };

  for (const item of items) {
    for (const macro of MACROS) {
      totals[macro] += Number(item[macro]) || 0;
    }
  }

  for (const macro of MACROS) {
    totals[macro] = Math.round(totals[macro] * 10) / 10;
  }

  return totals;
}

// Calculate how closely a meal matches the user's targets.
function scoreMeal(items, targets) {
  const totals = calculateTotals(items);
  let score = 0;

  for (const macro of MACROS) {
    const target = Number(targets[macro]);

    if (!Number.isFinite(target) || target <= 0) continue;

    const difference =
      Math.abs(totals[macro] - target) / target;

    score += difference * WEIGHTS[macro];
  }

  // Slight preference for foods from the same station.
  const stations = new Set(
    items.map(item => `${item.hall}:${item.station}`)
  );

  if (stations.size === 1) {
    score -= SAME_STATION_BONUS;
  }

  return score;
}

// Generate a meal with one main and up to two sides.
function generateMeal(menuItems, request = {}) {
  const targets = request.targets || {};

  if (
    !Number.isFinite(Number(targets.calories)) ||
    Number(targets.calories) <= 0
  ) {
    throw new Error('A positive calorie target is required.');
  }

  const pool = eligibleItems(menuItems, request);

  if (pool.length === 0) {
    return null;
  }

  const mains = pool.filter(item => item.role === 'main');
  const sides = pool.filter(item => item.role === 'side');

  if (mains.length === 0) {
    return null;
  }

  let bestMeal = null;
  let bestScore = Infinity;

  // Keep the search reasonably small.
  const mainOptions = mains.slice(0, 40);
  const sideOptions = sides.slice(0, 60);

  for (const main of mainOptions) {
    for (const mainServings of SERVINGS) {
      const mainPortion = portionNutrition(main, mainServings);

      // Test the main dish alone.
      const mainOnly = [mainPortion];
      const mainScore = scoreMeal(mainOnly, targets);

      if (mainScore < bestScore) {
        bestScore = mainScore;
        bestMeal = mainOnly;
      }

      // Test one side.
      for (const side of sideOptions) {
        for (const sideServings of SERVINGS) {
          const sidePortion = portionNutrition(
            side,
            sideServings
          );

          const meal = [mainPortion, sidePortion];
          const score = scoreMeal(meal, targets);

          if (score < bestScore) {
            bestScore = score;
            bestMeal = meal;
          }
        }
      }
    }
  }

  // Try adding a second side to the best two-item meal.
  if (bestMeal && bestMeal.length === 2) {
    const currentMeal = bestMeal;

    for (const side of sideOptions) {
      if (
        currentMeal.some(
          item => item.name === side.name
        )
      ) {
        continue;
      }

      for (const servings of SERVINGS) {
        const portion = portionNutrition(side, servings);

        const meal = [...currentMeal, portion];
        const score = scoreMeal(meal, targets);

        if (score < bestScore) {
          bestScore = score;
          bestMeal = meal;
        }
      }
    }
  }

  if (!bestMeal) return null;

  return {
    items: bestMeal,
    totals: calculateTotals(bestMeal),
    targets,
    score: Math.round(bestScore * 1000) / 1000
  };
}

module.exports = {
  generateMeal,
  eligibleItems,
  servesMeal,
  roleOf,
  portionNutrition,
  calculateTotals,
  scoreMeal
};
