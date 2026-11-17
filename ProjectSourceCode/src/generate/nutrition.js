
const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9
};

const GOAL_ADJUSTMENTS = {
  lose: -300,
  maintain: 0,
  gain: 300
};

const MEAL_PERCENTAGES = {
  breakfast: 0.25,
  lunch: 0.30,
  dinner: 0.35,
  snacks: 0.10
};

function calculateNutrition(profile) {
  const weightLbs = Number(profile.weight_lbs);
  const heightIn = Number(profile.height_in);
  const age = Number(profile.age);

  const activity = profile.activity_level || 'moderate';
  const goal = profile.nutrition_goal || 'maintain';

  // Use an explicit calculation setting rather than
  // assuming it from the user's gender identity.
  const equation = profile.calorie_equation;

  if (
    !Number.isFinite(weightLbs) || weightLbs <= 0 ||
    !Number.isFinite(heightIn) || heightIn <= 0 ||
    !Number.isFinite(age) || age < 18 || age > 120
  ) {
    throw new Error('Valid weight, height, and adult age are required.');
  }

  if (!ACTIVITY_MULTIPLIERS[activity]) {
    throw new Error('Invalid activity level.');
  }

  if (!(goal in GOAL_ADJUSTMENTS)) {
    throw new Error('Invalid nutrition goal.');
  }

  if (!['male', 'female'].includes(equation)) {
    throw new Error(
      'Choose a calorie equation setting or enter a manual calorie target.'
    );
  }

  // Convert imperial measurements to metric.
  const weightKg = weightLbs * 0.45359237;
  const heightCm = heightIn * 2.54;

  // Mifflin-St Jeor resting metabolic rate estimate.
  let bmr =
    10 * weightKg +
    6.25 * heightCm -
    5 * age;

  if (equation === 'male') {
    bmr += 5;
  } else {
    bmr -= 161;
  }

  // Estimate daily energy expenditure.
  const maintenanceCalories =
    bmr * ACTIVITY_MULTIPLIERS[activity];

  // Adjust for the user's goal.
  const calculatedCalories =
    maintenanceCalories + GOAL_ADJUSTMENTS[goal];

  // Allow the user to override the estimate.
  const hasManualTarget =
    profile.daily_calorie_target !== undefined &&
    profile.daily_calorie_target !== null &&
    profile.daily_calorie_target !== '';

  const dailyCalories = hasManualTarget
    ? Number(profile.daily_calorie_target)
    : calculatedCalories;

  if (
    !Number.isFinite(dailyCalories) ||
    dailyCalories <= 0
  ) {
    throw new Error('Invalid daily calorie target.');
  }

  // Example macro split:
  // 25% protein, 50% carbohydrates, 25% fat.
  const dailyMacros = {
    calories: Math.round(dailyCalories),
    protein: Math.round((dailyCalories * 0.25) / 4),
    carbs: Math.round((dailyCalories * 0.50) / 4),
    fat: Math.round((dailyCalories * 0.25) / 9)
  };

  const meals = {};

  for (const [meal, percentage] of Object.entries(
    MEAL_PERCENTAGES
  )) {
    meals[meal] = {
      calories: Math.round(dailyMacros.calories * percentage),
      protein: Math.round(dailyMacros.protein * percentage),
      carbs: Math.round(dailyMacros.carbs * percentage),
      fat: Math.round(dailyMacros.fat * percentage)
    };
  }

  return {
    bmr: Math.round(bmr),
    maintenanceCalories: Math.round(maintenanceCalories),
    daily: dailyMacros,
    meals
  };
}

function getMealTargets(nutrition, meal) {
  if (!nutrition.meals[meal]) {
    throw new Error(`Unknown meal: ${meal}`);
  }

  return nutrition.meals[meal];
}

module.exports = {
  calculateNutrition,
  getMealTargets
};
