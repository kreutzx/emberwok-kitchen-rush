// Emberwok: Harbor Kitchen Rush — shared constants and layout.
// Every other module reads its numbers from here so the rules, the
// drawing and the input hit-testing never disagree with each other.

export const FIELD = { width: 1280, height: 960 };

export const DAY_SECONDS = 150;
export const WIN_COINS = 600;
export const START_HEARTS = 3;

// Grill timing, in seconds a protein spends on the pan.
export const COOK_SECONDS = 4;     // raw -> cooked
export const PERFECT_WINDOW = 2.5; // golden window right after cooking
export const BURN_SECONDS = COOK_SECONDS + PERFECT_WINDOW + 4; // past this: burnt

// Ticket patience (seconds) and how it shrinks as the day wears on.
export const PATIENCE = { min: 26, max: 40 };
export const PATIENCE_LATE_SCALE = 0.7;

// Order spawning: the first ticket lands fast, then the pace tightens.
export const SPAWN = { firstDelay: 0.8, startInterval: 7.5, endInterval: 3.8, maxOrders: 4 };

// Scoring.
export const COMBO_WINDOW = 12;    // seconds without a serve before the combo resets
export const COMBO_BONUS_PER = 2;  // coins per combo step above the first
export const COMBO_BONUS_CAP = 20;
export const TIP_FRACTION = 0.4;   // share of the price paid as tip at full patience
export const PERFECT_BONUS = 5;    // extra coins when the plate holds a perfect protein

export const INGREDIENTS = [
  { id: 'noodle',  name: 'Noodles', key: '1', color: '#f2c14e', grill: false },
  { id: 'rice',    name: 'Rice',    key: '2', color: '#f7f1de', grill: false },
  { id: 'chicken', name: 'Chicken', key: '3', color: '#e8833a', grill: true },
  { id: 'beef',    name: 'Beef',    key: '4', color: '#a63d2e', grill: true },
  { id: 'egg',     name: 'Egg',     key: '5', color: '#ffd94d', grill: false },
  { id: 'greens',  name: 'Greens',  key: '6', color: '#58b368', grill: false },
  { id: 'tomato',  name: 'Tomato',  key: '7', color: '#e5484d', grill: false },
  { id: 'sauce',   name: 'Sauce',   key: '8', color: '#c1440e', grill: false },
];

export const RECIPES = [
  { id: 'wok-noodle',           name: 'Wok Noodle',           price: 45, ingredients: ['noodle', 'chicken', 'greens', 'sauce'] },
  { id: 'beef-rice-bowl',       name: 'Beef Rice Bowl',       price: 40, ingredients: ['rice', 'beef', 'egg'] },
  { id: 'garden-noodle',        name: 'Garden Noodle',        price: 35, ingredients: ['noodle', 'greens', 'tomato', 'egg'] },
  { id: 'ember-chicken-rice',   name: 'Ember Chicken Rice',   price: 50, ingredients: ['rice', 'chicken', 'tomato', 'sauce'] },
  { id: 'royal-harbor-platter', name: 'Royal Harbor Platter', price: 70, ingredients: ['rice', 'beef', 'chicken', 'egg'] },
];

export function ingredientById(id) {
  return INGREDIENTS.find((ing) => ing.id === id) ?? null;
}

export function recipeById(id) {
  return RECIPES.find((recipe) => recipe.id === id) ?? null;
}

// Shared layout: render.js draws into these rects, input.js hit-tests them.
export const LAYOUT = {
  hud: { x: 0, y: 0, w: 1280, h: 64 },
  ticket: { x: 24, y: 84, w: 296, h: 204, gap: 16 },
  grillArea: { x: 24, y: 330, w: 420, h: 268 },
  pans: [
    { x: 48, y: 402, w: 176, h: 176 },
    { x: 244, y: 402, w: 176, h: 176 },
  ],
  plateArea: { x: 468, y: 330, w: 360, h: 268 },
  plate: { cx: 648, cy: 452, r: 118 },
  pass: { x: 852, y: 330, w: 404, h: 268 },
  grillNote: { x: 24, y: 622, w: 420, h: 76 },
  trashBtn: { x: 468, y: 622, w: 360, h: 76 },
  serveBtn: { x: 852, y: 622, w: 404, h: 76 },
  counter: { x: 0, y: 736, w: 1280, h: 224 },
  ingredientBtn: { x: 38, y: 776, w: 140, h: 140, gap: 12 },
  startBtn: { x: 440, y: 612, w: 400, h: 84 },
  restartBtn: { x: 440, y: 648, w: 400, h: 84 },
};

export function ticketRect(index) {
  const t = LAYOUT.ticket;
  return { x: t.x + index * (t.w + t.gap), y: t.y, w: t.w, h: t.h };
}

export function ingredientRect(index) {
  const b = LAYOUT.ingredientBtn;
  return { x: b.x + index * (b.w + b.gap), y: b.y, w: b.w, h: b.h };
}
