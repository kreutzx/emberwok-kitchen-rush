// Emberwok: Harbor Kitchen Rush — input and sound.
// Mouse clicks are hit-tested against the same LAYOUT rects render.js
// draws; the keyboard mirrors every action. Every world event becomes
// a tiny WebAudio blip, and clicks trigger render pop animations.

import { FIELD, INGREDIENTS, LAYOUT, ticketRect, ingredientRect } from './config.js';
import {
  addIngredient, collectGrill, serveSelected, trashPlate, selectOrder, startDay,
  EVENT_SERVE, EVENT_PLACE, EVENT_GRILL_START, EVENT_COLLECT, EVENT_PERFECT,
  EVENT_BURN, EVENT_EXPIRE, EVENT_TRASH, EVENT_REFUSE, EVENT_SELECT,
  EVENT_WIN, EVENT_LOSE,
} from './world.js';
import { pop } from './render.js';

// --- tiny WebAudio blips ------------------------------------------------

let audioCtx = null;

function audio() {
  try {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

function tone(freq, dur, { type = 'sine', vol = 0.16, delay = 0, slideTo = null } = {}) {
  const ac = audio();
  if (!ac) return;
  try {
    const t0 = ac.currentTime + delay;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  } catch {
    // Sound is decoration; never let it break the game.
  }
}

export function blip(kind) {
  switch (kind) {
    case 'serve':
      tone(880, 0.1, { type: 'sine', vol: 0.2 });
      tone(1318, 0.16, { type: 'sine', vol: 0.2, delay: 0.09 });
      break;
    case 'place':
      tone(320, 0.07, { type: 'triangle', vol: 0.22 });
      break;
    case 'grill':
      tone(150, 0.2, { type: 'sawtooth', vol: 0.07 });
      tone(190, 0.16, { type: 'sawtooth', vol: 0.05, delay: 0.05 });
      break;
    case 'collect':
      tone(660, 0.08, { type: 'square', vol: 0.1 });
      break;
    case 'perfect':
      tone(1046, 0.09, { vol: 0.16 });
      tone(1318, 0.09, { vol: 0.16, delay: 0.07 });
      tone(1568, 0.14, { vol: 0.16, delay: 0.14 });
      break;
    case 'error':
      tone(130, 0.16, { type: 'sawtooth', vol: 0.14 });
      break;
    case 'burn':
      tone(95, 0.25, { type: 'sawtooth', vol: 0.12, slideTo: 60 });
      break;
    case 'expire':
      tone(392, 0.3, { vol: 0.16, slideTo: 196 });
      break;
    case 'trash':
      tone(220, 0.13, { type: 'sawtooth', vol: 0.1, slideTo: 110 });
      break;
    case 'select':
      tone(520, 0.05, { vol: 0.12 });
      break;
    case 'win':
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, { vol: 0.18, delay: i * 0.11 }));
      break;
    case 'lose':
      [392, 330, 262, 196].forEach((f, i) => tone(f, 0.18, { vol: 0.16, delay: i * 0.13 }));
      break;
    default:
      break;
  }
}

const EVENT_SOUNDS = {
  [EVENT_SERVE]: 'serve',
  [EVENT_PLACE]: 'place',
  [EVENT_GRILL_START]: 'grill',
  [EVENT_COLLECT]: 'collect',
  [EVENT_PERFECT]: 'perfect',
  [EVENT_BURN]: 'burn',
  [EVENT_EXPIRE]: 'expire',
  [EVENT_TRASH]: 'trash',
  [EVENT_REFUSE]: 'error',
  [EVENT_SELECT]: 'select',
  [EVENT_WIN]: 'win',
  [EVENT_LOSE]: 'lose',
};

export function playEvents(events) {
  for (const event of events) {
    const kind = EVENT_SOUNDS[event];
    if (kind) blip(kind);
  }
}

// --- hit testing ----------------------------------------------------------

function inside(p, r) {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

function toGameCoords(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * FIELD.width,
    y: ((event.clientY - rect.top) / rect.height) * FIELD.height,
  };
}

function handleClick(state, p) {
  if (state.screen === 'title') {
    if (inside(p, LAYOUT.startBtn)) playEvents(startDay(state));
    return;
  }
  if (state.screen === 'over') {
    if (inside(p, LAYOUT.restartBtn)) playEvents(startDay(state));
    return;
  }
  if (state.screen !== 'play') return;

  if (inside(p, LAYOUT.serveBtn)) {
    playEvents(serveSelected(state));
    pop('serve', state.animTime);
    return;
  }
  if (inside(p, LAYOUT.trashBtn)) {
    playEvents(trashPlate(state));
    return;
  }
  for (let i = 0; i < LAYOUT.pans.length; i++) {
    if (inside(p, LAYOUT.pans[i])) {
      playEvents(collectGrill(state, i));
      pop(`pan:${i}`, state.animTime);
      return;
    }
  }
  for (let i = 0; i < state.orders.length; i++) {
    if (inside(p, ticketRect(i))) {
      playEvents(selectOrder(state, state.orders[i].id));
      return;
    }
  }
  INGREDIENTS.forEach((ingredient, i) => {
    if (inside(p, ingredientRect(i))) {
      playEvents(addIngredient(state, ingredient.id));
      pop(`ing:${ingredient.id}`, state.animTime);
    }
  });
}

function handleKey(state, event) {
  const key = event.key;
  if (state.screen === 'title' || state.screen === 'over') {
    if (key === 'Enter' || key.toLowerCase() === 'r') {
      event.preventDefault();
      playEvents(startDay(state));
    }
    return;
  }
  if (state.screen !== 'play') return;

  const ingredient = INGREDIENTS.find((ing) => ing.key === key);
  if (ingredient) {
    playEvents(addIngredient(state, ingredient.id));
    pop(`ing:${ingredient.id}`, state.animTime);
    return;
  }
  switch (key.toLowerCase()) {
    case 'q':
      playEvents(collectGrill(state, 0));
      pop('pan:0', state.animTime);
      break;
    case 'w':
      playEvents(collectGrill(state, 1));
      pop('pan:1', state.animTime);
      break;
    case ' ':
      event.preventDefault();
      playEvents(serveSelected(state));
      pop('serve', state.animTime);
      break;
    case 'x':
      playEvents(trashPlate(state));
      break;
    case 'r':
      playEvents(startDay(state));
      break;
    default:
      break;
  }
}

export function attachInput(canvas, state) {
  canvas.addEventListener('pointerdown', (event) => {
    audio(); // unlock the AudioContext on the first real gesture
    handleClick(state, toGameCoords(canvas, event));
  });
  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    audio();
    handleKey(state, event);
  });
}
