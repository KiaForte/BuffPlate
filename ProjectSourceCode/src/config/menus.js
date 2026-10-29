module.exports = [
  {
    id: 'c5',
    displayName: 'C5',
    slug: 'village-center-dining',
    live: true,
    stations: [
      { label: 'Meal of the Day', menuType: 'vc-meal-of-the-day', mealTimes: ['lunch', 'dinner'] },
      { label: 'Toast',            menuType: 'vc_toast',           mealTimes: ['breakfast'] },
      { label: 'Curry Road',       menuType: 'vc_curryroad',       mealTimes: ['lunch', 'dinner'] },
      { label: 'Middleterranean',  menuType: 'vc_middleterranean', mealTimes: ['lunch', 'dinner'] },
      { label: 'Salad & Deli Bar', menuType: 'vc_vc-salad-deli-bar', mealTimes: ['lunch', 'dinner'] },
      { label: 'Hearth',           menuType: 'hearth',             mealTimes: ['lunch', 'dinner'] },
      { label: 'Peaks',            menuType: 'vc_peaks',           mealTimes: ['breakfast', 'lunch'] },
      { label: 'Grange',           menuType: 'vc_grange',          mealTimes: ['lunch', 'dinner'] },
    ],
  },
  { id: 'sewall', displayName: 'Sewall Hall',          live: false },
  { id: 'c4c',   displayName: 'Center for Community', live: false },
  { id: 'kitt',  displayName: 'Kitt Salad',            live: false },
];
