// Emberwok: Harbor Kitchen Rush — game state and rules.
// This module owns the whole simulation and never touches the canvas:
// render.js reads the state, input.js calls the action functions, and
// every action answers with event strings the sound layer can play.

import {
  DAY_SECONDS, WIN_COINS, START_HEARTS,
  COOK_SECONDS, PERFECT_WINDOW, BURN_SECONDS,
  PATIENCE, PATIENCE_LATE_SCALE, SPAWN,
  COMBO_WINDOW, COMBO_BONUS_PER, COMBO_BONUS_CAP, TIP_FRACTION, PERFECT_BONUS,
  INGREDIENTS, RECIPES, ingredientById, recipeById, ticketRect,
} from './config.js';
import { createRng, pick, range } from './random.js';

export const EVENT_SERVE = 'serve';
export const EVENT_PLACE = 'place';
export const EVENT_GRILL_START = 'grill-start';
export const EVENT_COLLECT = 'collect';
export const EVENT_PERFECT = 'perfect';
export const EVENT_BURN = 'burn';
export const EVENT_EXPIRE = 'expire';
export const EVENT_TRASH = 'trash';
export const EVENT_REFUSE = 'refuse';
export const EVENT_SELECT = 'select';
export const EVENT_WIN = 'win';
export const EVENT_LOSE = 'lose';

const MAX_PLATE = 5; // the largest recipe has five ingredients
const FLOATER_LIFE = 1.15;

export function createWorld(seed) {
  return {
    screen: 'title', // 'title' | 'play' | 'over'
    result: null, // 'win' | 'lose' once the day ends
    rng: createRng(seed),
    animTime: 0,
    timeLeft: DAY_SECONDS,
    elapsed: 0,
    coins: 0,
    served: 0,
    missed: 0,
    hearts: START_HEARTS,
    combo: 0,
    bestCombo: 0,
    comboTimer: 0,
    orders: [], // { id, recipeId, patience, patienceMax }
    nextOrderId: 1,
    selectedOrderId: null,
    plate: [], // { id, quality: 'fresh' | 'perfect' | 'cooked' }
    grill: [null, null], // null | { id, t, burned }
    pass: null, // null | { recipeId, coins, t }
    floaters: [], // { x, y, text, color, t, life }
    spawnTimer: SPAWN.firstDelay,
  };
}

export function startDay(state) {
  const fresh = createWorld(0);
  const rng = state.rng; // keep the same stream so restarts differ
  Object.assign(state, fresh, { rng, screen: 'play' });
  spawnOrder(state);
  spawnOrder(state);
  return [EVENT_SELECT];
}

export function dayProgress(state) {
  return Math.min(1, state.elapsed / DAY_SECONDS);
}

export function spawnOrder(state) {
  if (state.orders.length >= SPAWN.maxOrders) return null;
  const recipe = pick(state.rng, RECIPES);
  const scale = 1 - (1 - PATIENCE_LATE_SCALE) * dayProgress(state);
  const patienceMax = range(state.rng, PATIENCE.min, PATIENCE.max) * scale;
  const order = {
    id: state.nextOrderId++,
    recipeId: recipe.id,
    patience: patienceMax,
    patienceMax,
  };
  state.orders.push(order);
  if (state.selectedOrderId === null) state.selectedOrderId = order.id;
  return order;
}

export function selectedOrder(state) {
  return state.orders.find((order) => order.id === state.selectedOrderId) ?? null;
}

export function selectedRecipe(state) {
  const order = selectedOrder(state);
  return order ? recipeById(order.recipeId) : null;
}

export function selectOrder(state, orderId) {
  if (!state.orders.some((order) => order.id === orderId)) return [];
  if (state.selectedOrderId === orderId) return [];
  state.selectedOrderId = orderId;
  return [EVENT_SELECT];
}

export function grillState(slot) {
  if (!slot) return 'empty';
  if (slot.t >= BURN_SECONDS) return 'burnt';
  if (slot.t >= COOK_SECONDS + PERFECT_WINDOW) return 'cooked';
  if (slot.t >= COOK_SECONDS) return 'perfect';
  return 'raw';
}

export function plateHas(state, ingredientId) {
  return state.plate.some((item) => item.id === ingredientId);
}

export function addIngredient(state, ingredientId) {
  if (state.screen !== 'play') return [];
  const ingredient = ingredientById(ingredientId);
  if (!ingredient) return [EVENT_REFUSE];

  if (ingredient.grill) {
    const free = state.grill.findIndex((slot) => slot === null);
    if (free === -1) return [EVENT_REFUSE];
    if (state.grill.some((slot) => slot && slot.id === ingredientId)) return [EVENT_REFUSE];
    state.grill[free] = { id: ingredientId, t: 0, burned: false };
    return [EVENT_GRILL_START];
  }

  if (plateHas(state, ingredientId)) return [EVENT_REFUSE];
  if (state.plate.length >= MAX_PLATE) return [EVENT_REFUSE];
  state.plate.push({ id: ingredientId, quality: 'fresh' });
  return [EVENT_PLACE];
}

export function collectGrill(state, slotIndex) {
  if (state.screen !== 'play') return [];
  const slot = state.grill[slotIndex];
  if (!slot) return [];
  const quality = grillState(slot);
  if (quality === 'raw') return [EVENT_REFUSE];
  if (quality === 'burnt') {
    state.grill[slotIndex] = null;
    addFloater(state, 1054, 380, 'Burnt!', '#ef5350');
    return [EVENT_BURN];
  }
  if (plateHas(state, slot.id) || state.plate.length >= MAX_PLATE) return [EVENT_REFUSE];
  state.plate.push({ id: slot.id, quality: quality === 'perfect' ? 'perfect' : 'cooked' });
  state.grill[slotIndex] = null;
  return quality === 'perfect' ? [EVENT_COLLECT, EVENT_PERFECT] : [EVENT_COLLECT];
}

export function trashPlate(state) {
  if (state.screen !== 'play' || state.plate.length === 0) return [];
  state.plate = [];
  return [EVENT_TRASH];
}

export function plateMatchesRecipe(state, recipe) {
  if (!recipe || state.plate.length !== recipe.ingredients.length) return false;
  return recipe.ingredients.every((id) => plateHas(state, id));
}

export function serveSelected(state) {
  if (state.screen !== 'play') return [];
  const order = selectedOrder(state);
  const recipe = selectedRecipe(state);
  if (!order || !recipe || !plateMatchesRecipe(state, recipe)) return [EVENT_REFUSE];

  const patienceFrac = Math.max(0, order.patience / order.patienceMax);
  const tip = Math.round(recipe.price * TIP_FRACTION * patienceFrac);
  state.combo = state.comboTimer > 0 ? state.combo + 1 : 1;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  state.comboTimer = COMBO_WINDOW;
  const comboBonus = Math.min(COMBO_BONUS_CAP, (state.combo - 1) * COMBO_BONUS_PER);
  const perfectBonus = state.plate.some((item) => item.quality === 'perfect') ? PERFECT_BONUS : 0;
  const total = recipe.price + tip + comboBonus + perfectBonus;

  state.coins += total;
  state.served += 1;
  state.pass = { recipeId: recipe.id, coins: total, t: 0 };
  addFloater(state, 1054, 400, `+${total}`, '#ffd54f');
  state.orders = state.orders.filter((o) => o.id !== order.id);
  state.plate = [];
  state.selectedOrderId = state.orders.length ? state.orders[0].id : null;
  return [EVENT_SERVE];
}

export function addFloater(state, x, y, text, color) {
  state.floaters.push({ x, y, text, color, t: 0, life: FLOATER_LIFE });
}

function endDay(state, events) {
  state.screen = 'over';
  if (state.hearts <= 0) {
    state.result = 'lose';
    events.push(EVENT_LOSE);
  } else if (state.coins >= WIN_COINS) {
    state.result = 'win';
    events.push(EVENT_WIN);
  } else {
    state.result = 'lose';
    events.push(EVENT_LOSE);
  }
}

export function step(state, dt) {
  const events = [];
  state.animTime += dt;
  for (const floater of state.floaters) floater.t += dt;
  state.floaters = state.floaters.filter((f) => f.t < f.life);
  if (state.pass) state.pass.t += dt;
  if (state.screen !== 'play') return events;

  state.elapsed += dt;
  state.timeLeft = Math.max(0, DAY_SECONDS - state.elapsed);

  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) state.combo = 0;
  }

  // New tickets arrive faster as the day goes on.
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    if (spawnOrder(state)) {
      const interval = SPAWN.startInterval
        + (SPAWN.endInterval - SPAWN.startInterval) * dayProgress(state);
      state.spawnTimer = interval * range(state.rng, 0.85, 1.15);
    } else {
      state.spawnTimer = 0.6;
    }
  }

  // Grill pans keep cooking; crossing into burnt is a one-time event.
  for (const slot of state.grill) {
    if (!slot) continue;
    slot.t += dt;
    if (!slot.burned && slot.t >= BURN_SECONDS) {
      slot.burned = true;
      events.push(EVENT_BURN);
    }
  }

  // Patience runs out: the customer walks and it costs a heart.
  const expired = [];
  for (const order of state.orders) {
    order.patience -= dt;
    if (order.patience <= 0) expired.push(order);
  }
  for (const order of expired) {
    const index = state.orders.indexOf(order);
    state.orders.splice(index, 1);
    state.missed += 1;
    state.hearts -= 1;
    const rect = ticketRect(index);
    addFloater(state, rect.x + rect.w / 2, rect.y + 40, 'Walked out!', '#ef5350');
    events.push(EVENT_EXPIRE);
    if (state.selectedOrderId === order.id) {
      state.selectedOrderId = state.orders.length ? state.orders[0].id : null;
    }
  }

  if (state.hearts <= 0 || state.timeLeft <= 0) endDay(state, events);
  return events;
}

// Re-exported so render/input can share the lookup tables via world too.
export { INGREDIENTS, RECIPES, ingredientById, recipeById };
