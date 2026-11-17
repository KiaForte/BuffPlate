
Feature 1:

Scope: API Pull
Acceptance Criteria: The website successfully pulls menu information (macros included) from Nutrislice.
Environment: Docker (Node 20 / Postgres 15), localhost:3001
Testers: Benji Phipps
Test cases:
  1. Log in and navigate to /menu — page loads with today's menu items from Nutrislice
  2. Each item displays name, calories, protein, carbs, and fat
  3. Items are grouped by station (Meal of the Day, Toast, Curry Road, etc.)
  4. If Nutrislice is unreachable, page shows an error banner instead of crashing
  5. Refreshing within 1 hour serves cached data without re-fetching
Results Fields: All 5 test cases passed on 2026-11-16. Live data confirmed by comparing
items on screen to colorado-diningmenus.nutrislice.com. Error banner verified by
clearing the Postgres cache volume. Cache confirmed via docker logs showing no
re-fetch on second load within the hour.

Feature 2:

Scope: Student Profile
Acceptance Criteria: 
    Users can create a personal profile.
    Users can enter their height, weight, and age.
    Users can select dietary restrictions such as vegetarian, vegan, gluten-free, or food allergies.
    Users can enter their daily nutritional goals, including calories, protein, carbohydrates, and fats.
    Users can save their profile information.
    Users can edit and update their profile information at any time.
    The application stores profile information securely and uses it to personalize meal recommendations.
Environment: Not run
Testers: Not run
Test cases: Not run
Results Fields: Not run

Feature 3:

Scope: Saving Meals
Acceptance Criteria: 
    Users can save meals from the dining hall menu or generated meal recommendations.
    Users can view all their saved meals in a dedicated section of their profile.
    Users can view the nutritional information of each saved meal, including calories, protein, carbohydrates, and fats.
    Users can remove meals from their saved meals list.
    Users can save multiple meals at once.
    Saved meals remain available when users close and reopen the application.
    Users can select a previously saved meal to view its details.
Environment: Not run
Testers: Not run
Test cases: Not run
Results Fields: Not run