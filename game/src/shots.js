// Emberwok: Harbor Kitchen Rush — staged scenes for screenshots.
// stageShot(name, world) composes a deterministic mid-game state by
// hand (never by random play), then steps the world a few fixed ticks
// so floaters, steam and timers settle into a live-looking frame.

import { COOK_SECONDS, BURN_SECONDS, DAY_SECONDS } from './config.js';
import { step, addFloater } from './world.js';

function addOrder(state, recipeId, patience, patienceMax) {
  const order = { id: state.nextOrderId++, recipeId, patience, patienceMax };
  state.orders.push(order);
  return order;
}

function stageStart(state) {
  state.screen = 'title';
  addOrder(state, 'wok-noodle', 38, 38);
  addOrder(state, 'garden-noodle', 36, 36);
  state.selectedOrderId = state.orders[0].id;
}

function stagePlay(state) {
  state.screen = 'play';
  state.elapsed = DAY_SECONDS - 95;
  state.timeLeft = 95;
  state.coins = 235;
  state.served = 5;
  state.hearts = 3;
  state.combo = 3;
  state.bestCombo = 4;
  state.comboTimer = 8;
  state.spawnTimer = 6;

  const first = addOrder(state, 'wok-noodle', 30, 38);
  addOrder(state, 'beef-rice-bowl', 22, 34);
  addOrder(state, 'garden-noodle', 27, 36);
  state.selectedOrderId = first.id;

  // Two of the Wok Noodle's four ingredients are already plated.
  state.plate = [
    { id: 'noodle', quality: 'fresh' },
    { id: 'chicken', quality: 'perfect' },
  ];
  // Pan 0 sits in the PERFECT window; pan 1 is mid-cook.
  state.grill = [
    { id: 'beef', t: COOK_SECONDS + 1.2, burned: false },
    { id: 'chicken', t: 2.2, burned: false },
  ];
  state.pass = { recipeId: 'beef-rice-bowl', coins: 52, t: 0.4 };
  addFloater(state, 1054, 400, '+52', '#ffd54f');
  state.floaters[0].t = 0.25;
}

function stageRush(state) {
  state.screen = 'play';
  state.elapsed = DAY_SECONDS - 41;
  state.timeLeft = 41;
  state.coins = 470;
  state.served = 9;
  state.hearts = 2;
  state.combo = 5;
  state.bestCombo = 6;
  state.comboTimer = 9;
  state.spawnTimer = 3;

  const first = addOrder(state, 'ember-chicken-rice', 3.5, 34); // nearly out!
  addOrder(state, 'wok-noodle', 18, 36);
  addOrder(state, 'royal-harbor-platter', 26, 38);
  state.selectedOrderId = first.id;

  // Three of the Ember Chicken Rice's four ingredients are plated.
  state.plate = [
    { id: 'rice', quality: 'fresh' },
    { id: 'chicken', quality: 'cooked' },
    { id: 'tomato', quality: 'fresh' },
  ];
  // One pan PERFECT, the other seconds from burnt.
  state.grill = [
    { id: 'chicken', t: COOK_SECONDS + 0.8, burned: false },
    { id: 'beef', t: BURN_SECONDS - 0.4, burned: false },
  ];
  state.pass = { recipeId: 'wok-noodle', coins: 58, t: 0.3 };
  addFloater(state, 1054, 400, '+58', '#ffd54f');
  state.floaters[0].t = 0.2;
  addFloater(state, 172, 70, 'HURRY!', '#ef5350');
  state.floaters[1].t = 0.1;
}

function stageEnd(state) {
  state.screen = 'over';
  state.result = 'win';
  state.elapsed = DAY_SECONDS;
  state.timeLeft = 0;
  state.coins = 685;
  state.served = 14;
  state.missed = 1;
  state.hearts = 2;
  state.combo = 0;
  state.bestCombo = 7;
  state.pass = { recipeId: 'royal-harbor-platter', coins: 88, t: 0.5 };
}

const STAGERS = {
  start: stageStart,
  play: stagePlay,
  rush: stageRush,
  end: stageEnd,
};

export function stageShot(name, state) {
  const stage = STAGERS[name];
  if (!stage) return state;
  stage(state);
  // A few fixed steps so animations and particles settle into place.
  for (let i = 0; i < 3; i++) step(state, 1 / 60);
  return state;
}
