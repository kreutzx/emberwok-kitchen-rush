// Emberwok: Harbor Kitchen Rush — boot and main loop.
// Parses ?shot= / ?seed= from the URL: with a shot name it stages a
// frozen scene for screenshots, otherwise it runs the real game.

import { FIELD, WIN_COINS } from './config.js';
import { createWorld, step } from './world.js';
import { render } from './render.js';
import { attachInput, playEvents } from './input.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

const params = new URLSearchParams(window.location.search);
const parsedSeed = Number.parseInt(params.get('seed') ?? '1', 10);
const seed = Number.isNaN(parsedSeed) ? 1 : parsedSeed;
const shot = params.get('shot');

const state = createWorld(seed);
if (shot) stageShot(shot, state);

function resize() {
  const scale = Math.min(window.innerWidth / FIELD.width, window.innerHeight / FIELD.height);
  const w = Math.floor(FIELD.width * scale);
  const h = Math.floor(FIELD.height * scale);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  canvas.style.left = `${Math.floor((window.innerWidth - w) / 2)}px`;
  canvas.style.top = `${Math.floor((window.innerHeight - h) / 2)}px`;
}
window.addEventListener('resize', resize);
resize();

attachInput(canvas, state);

function statusText() {
  if (state.screen === 'title') return 'Emberwok: Harbor Kitchen Rush — title screen. Press Enter to start the day.';
  if (state.screen === 'over') {
    return state.result === 'win'
      ? `Day complete: you earned ${state.coins} coins and beat the ${WIN_COINS} target. Press Enter to cook again.`
      : `Day over: ${state.coins} of ${WIN_COINS} coins earned. Press Enter to try again.`;
  }
  return `Day in progress: ${state.coins} coins, ${state.served} dishes served, ${state.hearts} hearts left, ${Math.ceil(state.timeLeft)} seconds to go.`;
}

let last = performance.now();
let lastStatus = '';

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (shot) {
    // Frozen staged scene: keep the steam and glows alive, never tick rules.
    state.animTime += dt;
  } else {
    const events = step(state, dt);
    if (events.length) playEvents(events);
  }
  render(ctx, state);
  const text = statusText();
  if (text !== lastStatus) {
    statusEl.textContent = text;
    lastStatus = text;
  }
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
