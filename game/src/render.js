// Emberwok: Harbor Kitchen Rush — all canvas drawing.
// One named draw function per thing on screen, plus a render()
// dispatcher. Big shapes and big text on purpose: the game is judged
// from screenshots, so everything must read at a glance.

import {
  FIELD, DAY_SECONDS, WIN_COINS, START_HEARTS,
  COOK_SECONDS, PERFECT_WINDOW, BURN_SECONDS,
  INGREDIENTS, ingredientById, recipeById,
  LAYOUT, ticketRect, ingredientRect,
} from './config.js';
import { grillState, plateHas, selectedOrder } from './world.js';

export { LAYOUT };
export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';

const FONT = 'system-ui, "Segoe UI", sans-serif';

// --- pop animations -------------------------------------------------
// input.js calls pop(key, state.animTime) after an action; render()
// turns a fresh pop into a brief scale bounce on that element.
const pops = new Map();

export function pop(key, t) {
  pops.set(key, t);
}

function popScale(key, now) {
  const t0 = pops.get(key);
  if (t0 === undefined) return 1;
  const k = (now - t0) / 0.18;
  if (k >= 1) {
    pops.delete(key);
    return 1;
  }
  return 1 + 0.2 * Math.sin(k * Math.PI);
}

// --- small helpers ----------------------------------------------------

function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function txt(ctx, text, x, y, { size = 24, color = '#fff', align = 'center', weight = 700 } = {}) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

function withPop(ctx, key, now, cx, cy, draw) {
  const s = popScale(key, now);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.translate(-cx, -cy);
  draw();
  ctx.restore();
}

// --- per-ingredient art -------------------------------------------------
// Each draws a distinct, appetizing vector shape centred on (cx, cy)
// with s as the rough half-size. Used on buttons, tickets and plates.

export function drawNoodle(ctx, cx, cy, s) {
  ctx.strokeStyle = '#e8a91c';
  ctx.lineWidth = s * 0.16;
  ctx.lineCap = 'round';
  for (let k = -1; k <= 1; k++) {
    ctx.beginPath();
    for (let i = 0; i <= 12; i++) {
      const x = cx - s + (i / 12) * 2 * s;
      const y = cy + k * s * 0.42 + Math.sin(i * 1.7 + k * 2.1) * s * 0.16;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

export function drawRice(ctx, cx, cy, s) {
  ctx.fillStyle = '#fbf7ea';
  ctx.strokeStyle = '#ddd3b8';
  ctx.lineWidth = 1.5;
  const grains = [
    [-0.5, 0.15, 0.4], [0, -0.25, -0.3], [0.5, 0.15, 0.9], [-0.25, -0.05, 1.2],
    [0.3, -0.05, 0.2], [0, 0.3, 0.7], [-0.55, -0.3, -0.8], [0.55, -0.3, 0.5],
  ];
  for (const [gx, gy, rot] of grains) {
    ctx.save();
    ctx.translate(cx + gx * s, cy + gy * s);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.34, s * 0.17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

export function drawChicken(ctx, cx, cy, s) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.5);
  const grad = ctx.createLinearGradient(0, -s, 0, s);
  grad.addColorStop(0, '#f09a4e');
  grad.addColorStop(1, '#c25e1e');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.95, s * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(90, 35, 5, 0.55)';
  ctx.lineWidth = s * 0.1;
  for (const off of [-0.35, 0, 0.35]) {
    ctx.beginPath();
    ctx.moveTo(s * off - s * 0.18, -s * 0.5);
    ctx.lineTo(s * off + s * 0.18, s * 0.5);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = '#fdf6ec';
  ctx.beginPath();
  ctx.arc(cx + s * 0.78, cy + s * 0.62, s * 0.2, 0, Math.PI * 2);
  ctx.arc(cx + s * 0.95, cy + s * 0.45, s * 0.18, 0, Math.PI * 2);
  ctx.fill();
}

export function drawBeef(ctx, cx, cy, s) {
  for (const [ox, oy, rot] of [[-0.28, 0.1, 0.25], [0.3, -0.12, -0.2]]) {
    ctx.save();
    ctx.translate(cx + ox * s, cy + oy * s);
    ctx.rotate(rot);
    const grad = ctx.createLinearGradient(0, -s * 0.5, 0, s * 0.5);
    grad.addColorStop(0, '#b34a38');
    grad.addColorStop(1, '#7e2a1e');
    ctx.fillStyle = grad;
    rr(ctx, -s * 0.62, -s * 0.42, s * 1.24, s * 0.84, s * 0.3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(60, 15, 8, 0.6)';
    ctx.lineWidth = s * 0.09;
    ctx.beginPath();
    ctx.moveTo(-s * 0.4, -s * 0.2);
    ctx.lineTo(s * 0.4, s * 0.2);
    ctx.moveTo(-s * 0.4, s * 0.2);
    ctx.lineTo(s * 0.4, -s * 0.2);
    ctx.stroke();
    ctx.restore();
  }
}

export function drawEgg(ctx, cx, cy, s) {
  ctx.fillStyle = '#fffdf4';
  ctx.beginPath();
  ctx.ellipse(cx, cy, s * 0.98, s * 0.78, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e8ddc4';
  ctx.lineWidth = 2;
  ctx.stroke();
  const grad = ctx.createRadialGradient(cx - s * 0.15, cy - s * 0.15, s * 0.1, cx, cy, s * 0.5);
  grad.addColorStop(0, '#ffe082');
  grad.addColorStop(1, '#ffb300');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.48, 0, Math.PI * 2);
  ctx.fill();
}

export function drawGreens(ctx, cx, cy, s) {
  for (const rot of [-0.7, 0, 0.7]) {
    ctx.save();
    ctx.translate(cx, cy + s * 0.25);
    ctx.rotate(rot);
    ctx.fillStyle = rot === 0 ? '#66bb6a' : '#4caf50';
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.4, s * 0.34, s * 0.68, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(20, 70, 25, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.2);
    ctx.lineTo(0, -s * 0.95);
    ctx.stroke();
    ctx.restore();
  }
}

export function drawTomato(ctx, cx, cy, s) {
  for (const [ox, oy] of [[-0.35, 0.12], [0.38, -0.1]]) {
    ctx.fillStyle = '#e5484d';
    ctx.beginPath();
    ctx.arc(cx + ox * s, cy + oy * s, s * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff8a80';
    ctx.beginPath();
    ctx.arc(cx + ox * s, cy + oy * s, s * 0.36, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffcdd2';
    ctx.lineWidth = 2;
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + ox;
      ctx.beginPath();
      ctx.moveTo(cx + ox * s, cy + oy * s);
      ctx.lineTo(cx + ox * s + Math.cos(a) * s * 0.34, cy + oy * s + Math.sin(a) * s * 0.34);
      ctx.stroke();
    }
  }
}

export function drawSauce(ctx, cx, cy, s) {
  ctx.strokeStyle = '#c1440e';
  ctx.lineWidth = s * 0.22;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  const rows = 3;
  for (let r = 0; r < rows; r++) {
    const y = cy - s * 0.5 + r * s * 0.5;
    const dir = r % 2 === 0 ? 1 : -1;
    for (let i = 0; i <= 8; i++) {
      const x = cx + dir * (-s * 0.8 + (i / 8) * s * 1.6);
      if (i === 0 && r === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y + Math.sin(i * 1.2) * s * 0.05);
    }
  }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 190, 150, 0.7)';
  ctx.lineWidth = s * 0.07;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.7, cy - s * 0.55);
  ctx.lineTo(cx + s * 0.5, cy - s * 0.55);
  ctx.stroke();
}

const INGREDIENT_ART = {
  noodle: drawNoodle, rice: drawRice, chicken: drawChicken, beef: drawBeef,
  egg: drawEgg, greens: drawGreens, tomato: drawTomato, sauce: drawSauce,
};

export function drawIngredientArt(ctx, id, cx, cy, s) {
  const art = INGREDIENT_ART[id];
  if (art) art(ctx, cx, cy, s);
}

export function drawFlame(ctx, cx, cy, s) {
  ctx.fillStyle = '#fb8c00';
  ctx.beginPath();
  ctx.moveTo(cx, cy - s);
  ctx.bezierCurveTo(cx + s * 0.75, cy - s * 0.1, cx + s * 0.55, cy + s * 0.8, cx, cy + s * 0.85);
  ctx.bezierCurveTo(cx - s * 0.55, cy + s * 0.8, cx - s * 0.75, cy - s * 0.1, cx, cy - s);
  ctx.fill();
  ctx.fillStyle = '#ffd54f';
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.25);
  ctx.bezierCurveTo(cx + s * 0.4, cy + s * 0.15, cx + s * 0.3, cy + s * 0.6, cx, cy + s * 0.65);
  ctx.bezierCurveTo(cx - s * 0.3, cy + s * 0.6, cx - s * 0.4, cy + s * 0.15, cx, cy - s * 0.25);
  ctx.fill();
}

function drawHeart(ctx, cx, cy, s, filled) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.9);
  ctx.bezierCurveTo(cx - s * 1.25, cy, cx - s * 0.7, cy - s, cx, cy - s * 0.3);
  ctx.bezierCurveTo(cx + s * 0.7, cy - s, cx + s * 1.25, cy, cx, cy + s * 0.9);
  ctx.closePath();
  ctx.fillStyle = filled ? '#ef5350' : 'rgba(255,255,255,0.16)';
  ctx.fill();
}

function drawCoin(ctx, cx, cy, r) {
  ctx.fillStyle = '#ffc107';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c79100';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  txt(ctx, 'c', cx, cy + 1, { size: r * 1.15, color: '#8d6e00', weight: 900 });
}

// --- the kitchen --------------------------------------------------------

export function drawKitchen(ctx, state) {
  // Teal tiled wall.
  const wall = ctx.createLinearGradient(0, 0, 0, FIELD.height);
  wall.addColorStop(0, '#2e8b80');
  wall.addColorStop(0.75, '#227066');
  wall.addColorStop(1, '#1a574e');
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 2;
  for (let x = 0; x <= FIELD.width; x += 64) {
    ctx.beginPath(); ctx.moveTo(x, 64); ctx.lineTo(x, 736); ctx.stroke();
  }
  for (let y = 64; y <= 736; y += 64) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(FIELD.width, y); ctx.stroke();
  }

  // Hanging lamps with warm glow.
  for (const lx of [210, 640, 1070]) {
    ctx.strokeStyle = '#263238';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(lx, 64); ctx.lineTo(lx, 108); ctx.stroke();
    const glow = ctx.createRadialGradient(lx, 128, 8, lx, 128, 95);
    glow.addColorStop(0, 'rgba(255, 213, 79, 0.5)');
    glow.addColorStop(1, 'rgba(255, 213, 79, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(lx, 128, 95, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#37474f';
    ctx.beginPath();
    ctx.moveTo(lx - 34, 140);
    ctx.lineTo(lx + 34, 140);
    ctx.lineTo(lx + 16, 106);
    ctx.lineTo(lx - 16, 106);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffe082';
    ctx.beginPath(); ctx.arc(lx, 138, 11, 0, Math.PI * 2); ctx.fill();
  }

  // Wooden work shelf behind grill / plate / pass.
  ctx.fillStyle = '#7a4e28';
  rr(ctx, 12, 318, 1256, 392, 18);
  ctx.fill();
  ctx.fillStyle = '#96682f';
  rr(ctx, 12, 318, 1256, 26, 13);
  ctx.fill();
  ctx.strokeStyle = 'rgba(60, 35, 10, 0.35)';
  ctx.lineWidth = 2;
  for (const y of [420, 520, 620]) {
    ctx.beginPath(); ctx.moveTo(20, y); ctx.lineTo(1260, y); ctx.stroke();
  }

  // Bottom ingredient counter.
  const c = LAYOUT.counter;
  ctx.fillStyle = '#8a5a33';
  ctx.fillRect(c.x, c.y, c.w, c.h);
  ctx.fillStyle = '#a9713d';
  ctx.fillRect(c.x, c.y, c.w, 18);
  ctx.strokeStyle = 'rgba(50, 30, 8, 0.4)';
  for (let x = 160; x < FIELD.width; x += 160) {
    ctx.beginPath(); ctx.moveTo(x, c.y + 18); ctx.lineTo(x, c.y + c.h); ctx.stroke();
  }
  txt(ctx, 'INGREDIENTS — click or press 1-8', 640, c.y + 34, { size: 22, color: '#ffe0b2' });
}

// --- order tickets ------------------------------------------------------

export function drawOrderBoard(ctx, state) {
  for (let i = 0; i < 4; i++) {
    const rect = ticketRect(i);
    const order = state.orders[i];
    if (!order) {
      ctx.save();
      ctx.setLineDash([10, 8]);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 3;
      rr(ctx, rect.x, rect.y, rect.w, rect.h, 14);
      ctx.stroke();
      ctx.restore();
      txt(ctx, 'waiting for', rect.x + rect.w / 2, rect.y + rect.h / 2 - 16, { size: 22, color: 'rgba(255,255,255,0.5)' });
      txt(ctx, 'customers…', rect.x + rect.w / 2, rect.y + rect.h / 2 + 16, { size: 22, color: 'rgba(255,255,255,0.5)' });
      continue;
    }

    const recipe = recipeById(order.recipeId);
    const selected = order.id === state.selectedOrderId;
    const frac = Math.max(0, order.patience / order.patienceMax);
    const urgent = frac < 0.25 && state.screen === SCREEN_PLAY;
    const flash = urgent && Math.sin(state.animTime * 10) > 0;

    ctx.fillStyle = selected ? '#fff8e1' : '#f5efe0';
    rr(ctx, rect.x, rect.y, rect.w, rect.h, 14);
    ctx.fill();
    ctx.lineWidth = selected ? 6 : 3;
    ctx.strokeStyle = flash ? '#ef5350' : selected ? '#ffc107' : '#bcaaa4';
    rr(ctx, rect.x, rect.y, rect.w, rect.h, 14);
    ctx.stroke();

    // Pin.
    ctx.fillStyle = '#e5484d';
    ctx.beginPath();
    ctx.arc(rect.x + rect.w / 2, rect.y + 14, 9, 0, Math.PI * 2);
    ctx.fill();

    txt(ctx, recipe.name, rect.x + rect.w / 2, rect.y + 44, { size: 27, color: '#3e2723', weight: 900 });
    if (selected) {
      ctx.fillStyle = '#ffc107';
      rr(ctx, rect.x + rect.w / 2 - 62, rect.y + 66, 124, 24, 12);
      ctx.fill();
      txt(ctx, 'SELECTED', rect.x + rect.w / 2, rect.y + 79, { size: 15, color: '#5d4037', weight: 900 });
    }

    // Ingredient icons, with a green check when the plate already has it.
    const n = recipe.ingredients.length;
    const stepX = Math.min(56, (rect.w - 48) / n);
    const startX = rect.x + rect.w / 2 - ((n - 1) * stepX) / 2;
    recipe.ingredients.forEach((id, k) => {
      const ix = startX + k * stepX;
      const iy = rect.y + 126;
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.beginPath(); ctx.arc(ix, iy, 24, 0, Math.PI * 2); ctx.fill();
      drawIngredientArt(ctx, id, ix, iy, 17);
      if (selected && plateHas(state, id)) {
        ctx.fillStyle = '#43a047';
        ctx.beginPath(); ctx.arc(ix + 16, iy - 16, 10, 0, Math.PI * 2); ctx.fill();
        txt(ctx, '✓', ix + 16, iy - 15, { size: 15, color: '#fff', weight: 900 });
      }
    });

    // Patience bar: green -> yellow -> red.
    const barW = rect.w - 88;
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    rr(ctx, rect.x + 16, rect.y + rect.h - 34, barW, 16, 8);
    ctx.fill();
    ctx.fillStyle = frac > 0.5 ? '#66bb6a' : frac > 0.25 ? '#ffa726' : '#ef5350';
    if (frac > 0) {
      rr(ctx, rect.x + 16, rect.y + rect.h - 34, Math.max(16, barW * frac), 16, 8);
      ctx.fill();
    }
    drawCoin(ctx, rect.x + rect.w - 42, rect.y + rect.h - 26, 17);
    txt(ctx, `${recipe.price}`, rect.x + rect.w - 42, rect.y + rect.h - 62, { size: 21, color: '#6d4c41', weight: 900 });
  }
}

// --- ingredient counter ---------------------------------------------------

export function drawIngredientCounter(ctx, state) {
  INGREDIENTS.forEach((ingredient, i) => {
    const rect = ingredientRect(i);
    withPop(ctx, `ing:${ingredient.id}`, state.animTime, rect.x + rect.w / 2, rect.y + rect.h / 2, () => {
      const grad = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
      grad.addColorStop(0, '#fff3e0');
      grad.addColorStop(1, '#ffe0b2');
      ctx.fillStyle = grad;
      rr(ctx, rect.x, rect.y, rect.w, rect.h, 16);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#8d6e63';
      rr(ctx, rect.x, rect.y, rect.w, rect.h, 16);
      ctx.stroke();
      drawIngredientArt(ctx, ingredient.id, rect.x + rect.w / 2, rect.y + 52, 30);
      txt(ctx, ingredient.name, rect.x + rect.w / 2, rect.y + 104, { size: 21, color: '#4e342e', weight: 800 });
      ctx.fillStyle = '#6d4c41';
      rr(ctx, rect.x + 8, rect.y + 8, 30, 30, 8);
      ctx.fill();
      txt(ctx, ingredient.key, rect.x + 23, rect.y + 24, { size: 19, color: '#fff', weight: 900 });
      if (ingredient.grill) drawFlame(ctx, rect.x + rect.w - 22, rect.y + 24, 13);
    });
  });
}

// --- the assembly plate ---------------------------------------------------

const PLATE_SLOTS = [
  { x: 0, y: -6 }, { x: -56, y: 22 }, { x: 56, y: 22 }, { x: -34, y: -52 }, { x: 34, y: -52 },
];

export function drawPlateStack(ctx, state) {
  const area = LAYOUT.plateArea;
  txt(ctx, 'ASSEMBLY PLATE', area.x + area.w / 2, area.y + 26, { size: 23, color: '#ffe0b2', weight: 900 });

  const { cx, cy, r } = LAYOUT.plate;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.82, r * 1.02, r * 0.28, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fafafa';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#eceff1';
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#b0bec5';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2); ctx.stroke();

  const recipe = (() => {
    const order = selectedOrder(state);
    return order ? recipeById(order.recipeId) : null;
  })();

  // Ghost slots: what the selected recipe still needs.
  if (recipe) {
    const missing = recipe.ingredients.filter((id) => !plateHas(state, id));
    missing.forEach((id, k) => {
      const slot = PLATE_SLOTS[state.plate.length + k];
      if (!slot) return;
      const gx = cx + slot.x;
      const gy = cy + slot.y;
      ctx.save();
      ctx.globalAlpha = 0.32;
      drawIngredientArt(ctx, id, gx, gy, 30);
      ctx.restore();
      ctx.save();
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = 'rgba(90, 60, 20, 0.55)';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(gx, gy, 38, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    });
  }

  // The food actually on the plate, layered in.
  state.plate.forEach((item, i) => {
    const slot = PLATE_SLOTS[i] ?? { x: 0, y: 0 };
    drawIngredientArt(ctx, item.id, cx + slot.x, cy + slot.y, 34);
    if (item.quality === 'perfect') {
      const sx = cx + slot.x + 26;
      const sy = cy + slot.y - 26;
      ctx.fillStyle = '#ffc107';
      txt(ctx, '★', sx, sy, { size: 26, color: '#ffc107', weight: 900 });
    }
  });

  if (state.plate.length === 0) {
    txt(ctx, recipe ? `Build: ${recipe.name}` : 'Click a ticket, then', cx, cy - 8, { size: 21, color: '#78909c', weight: 800 });
    if (!recipe) txt(ctx, 'add ingredients here', cx, cy + 20, { size: 21, color: '#78909c', weight: 800 });
  }

  // Trash + serve buttons.
  const trash = LAYOUT.trashBtn;
  ctx.fillStyle = state.plate.length ? '#b71c1c' : '#795548';
  rr(ctx, trash.x, trash.y, trash.w, trash.h, 14);
  ctx.fill();
  txt(ctx, '✕  TRASH PLATE  (X)', trash.x + trash.w / 2, trash.y + trash.h / 2, { size: 25, color: '#fff', weight: 900 });

  const serve = LAYOUT.serveBtn;
  withPop(ctx, 'serve', state.animTime, serve.x + serve.w / 2, serve.y + serve.h / 2, () => {
    ctx.fillStyle = '#2e7d32';
    rr(ctx, serve.x, serve.y, serve.w, serve.h, 14);
    ctx.fill();
    ctx.strokeStyle = '#a5d6a7';
    ctx.lineWidth = 3;
    rr(ctx, serve.x, serve.y, serve.w, serve.h, 14);
    ctx.stroke();
    txt(ctx, 'SERVE  ▶  (Space)', serve.x + serve.w / 2, serve.y + serve.h / 2, { size: 29, color: '#fff', weight: 900 });
  });
}

// --- the grill --------------------------------------------------------------

export function drawGrill(ctx, state) {
  const area = LAYOUT.grillArea;
  txt(ctx, 'GRILL — proteins cook here', area.x + area.w / 2, area.y + 26, { size: 23, color: '#ffe0b2', weight: 900 });
  txt(ctx, 'collect in the gold PERFECT ring!', area.x + area.w / 2, area.y + 54, { size: 19, color: '#ffccbc' });

  LAYOUT.pans.forEach((pan, i) => {
    const slot = state.grill[i];
    const pcx = pan.x + pan.w / 2;
    const pcy = pan.y + pan.h / 2;
    withPop(ctx, `pan:${i}`, state.animTime, pcx, pcy, () => {
      ctx.fillStyle = '#263238';
      ctx.beginPath(); ctx.arc(pcx, pcy, pan.w / 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#37474f';
      ctx.beginPath(); ctx.arc(pcx, pcy, pan.w / 2 - 12, 0, Math.PI * 2); ctx.fill();

      if (!slot) {
        txt(ctx, i === 0 ? 'Q' : 'W', pcx, pcy - 12, { size: 30, color: 'rgba(255,255,255,0.4)', weight: 900 });
        txt(ctx, 'empty pan', pcx, pcy + 22, { size: 18, color: 'rgba(255,255,255,0.4)' });
        return;
      }

      drawIngredientArt(ctx, slot.id, pcx, pcy, 44);
      const quality = grillState(slot);
      const frac = Math.min(1, slot.t / BURN_SECONDS);
      const color = quality === 'perfect' ? '#ffc107' : quality === 'cooked' ? '#fb8c00' : quality === 'burnt' ? '#212121' : '#90a4ae';
      ctx.lineWidth = 9;
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath(); ctx.arc(pcx, pcy, pan.w / 2 - 6, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.arc(pcx, pcy, pan.w / 2 - 6, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
      ctx.stroke();

      // Steam once it is cooking.
      if (quality !== 'raw') {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        for (let k = 0; k < 3; k++) {
          const rise = (state.animTime * 34 + k * 26 + i * 17) % 62;
          const sx = pcx + Math.sin(state.animTime * 2 + k * 2.4) * 16 + (k - 1) * 22;
          ctx.globalAlpha = 0.5 * (1 - rise / 62);
          ctx.beginPath();
          ctx.arc(sx, pcy - 48 - rise, 8 + rise * 0.12, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      const label = quality === 'perfect' ? '★ PERFECT — CLICK! ★'
        : quality === 'cooked' ? 'COOKED — click to plate'
        : quality === 'burnt' ? 'BURNT — click to toss' : 'cooking…';
      const labelColor = quality === 'perfect' && Math.sin(state.animTime * 8) > -0.3 ? '#ffd54f' : '#fff';
      txt(ctx, label, pcx, pan.y + pan.h + 24, { size: 19, color: labelColor, weight: 900 });
    });
  });
}

// --- the pass (last served dish) ---------------------------------------------

export function drawPass(ctx, state) {
  const area = LAYOUT.pass;
  txt(ctx, 'THE PASS — last served', area.x + area.w / 2, area.y + 26, { size: 23, color: '#ffe0b2', weight: 900 });
  const pcx = area.x + area.w / 2;
  const pcy = area.y + 148;
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath(); ctx.ellipse(pcx, pcy + 62, 118, 26, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fafafa';
  ctx.beginPath(); ctx.arc(pcx, pcy, 92, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#eceff1';
  ctx.beginPath(); ctx.arc(pcx, pcy, 70, 0, Math.PI * 2); ctx.fill();

  if (!state.pass) {
    txt(ctx, 'nothing yet —', pcx, pcy - 10, { size: 20, color: '#78909c', weight: 800 });
    txt(ctx, 'serve a dish!', pcx, pcy + 18, { size: 20, color: '#78909c', weight: 800 });
    return;
  }
  const recipe = recipeById(state.pass.recipeId);
  recipe.ingredients.forEach((id, i) => {
    const slot = PLATE_SLOTS[i] ?? { x: 0, y: 0 };
    drawIngredientArt(ctx, id, pcx + slot.x * 0.8, pcy + slot.y * 0.8, 27);
  });
  txt(ctx, recipe.name, pcx, area.y + area.h - 52, { size: 23, color: '#ffe0b2', weight: 900 });
  drawCoin(ctx, pcx - 34, area.y + area.h - 22, 13);
  txt(ctx, `+${state.pass.coins}`, pcx + 16, area.y + area.h - 22, { size: 23, color: '#ffd54f', weight: 900 });
}

// --- HUD -----------------------------------------------------------------------

export function drawHud(ctx, state) {
  const hud = LAYOUT.hud;
  ctx.fillStyle = '#2d1a10';
  ctx.fillRect(hud.x, hud.y, hud.w, hud.h);
  ctx.fillStyle = '#ffc107';
  ctx.fillRect(0, hud.h - 4, hud.w, 4);

  // Day clock.
  const timeFrac = Math.max(0, state.timeLeft / DAY_SECONDS);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  rr(ctx, 24, 18, 300, 28, 14);
  ctx.fill();
  ctx.fillStyle = timeFrac > 0.3 ? '#66bb6a' : '#ef5350';
  if (timeFrac > 0) {
    rr(ctx, 24, 18, Math.max(28, 300 * timeFrac), 28, 14);
    ctx.fill();
  }
  const secs = Math.ceil(state.timeLeft);
  txt(ctx, `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`, 174, 33, { size: 23, color: '#fff', weight: 900 });

  // Coins vs target.
  drawCoin(ctx, 420, 32, 16);
  txt(ctx, `${state.coins} / ${WIN_COINS}`, 520, 33, { size: 27, color: '#ffd54f', weight: 900 });

  // Combo flame.
  if (state.combo >= 2) {
    drawFlame(ctx, 726, 30, 17);
    txt(ctx, `COMBO ×${state.combo}`, 812, 33, { size: 24, color: '#ffb74d', weight: 900 });
  } else {
    txt(ctx, 'serve fast to build a combo', 800, 33, { size: 19, color: 'rgba(255,255,255,0.45)' });
  }

  // Hearts.
  for (let i = 0; i < START_HEARTS; i++) {
    drawHeart(ctx, 1150 + i * 44, 34, 15, i < state.hearts);
  }
  txt(ctx, `served ${state.served}`, 1002, 33, { size: 21, color: '#ffe0b2', weight: 800 });
}

// --- floaters ---------------------------------------------------------------------

export function drawFloaters(ctx, state) {
  for (const floater of state.floaters) {
    const k = floater.t / floater.life;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - k);
    ctx.font = `900 34px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(40, 20, 0, 0.8)';
    const y = floater.y - k * 46;
    ctx.strokeText(floater.text, floater.x, y);
    ctx.fillStyle = floater.color;
    ctx.fillText(floater.text, floater.x, y);
    ctx.restore();
  }
}

// --- title & end screens -------------------------------------------------------------

function dimKitchen(ctx) {
  ctx.fillStyle = 'rgba(24, 12, 4, 0.62)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
}

export function drawTitleScreen(ctx, state) {
  dimKitchen(ctx);
  const panel = { x: 240, y: 150, w: 800, h: 540 };
  ctx.fillStyle = '#fff8e1';
  rr(ctx, panel.x, panel.y, panel.w, panel.h, 24);
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#ffc107';
  rr(ctx, panel.x, panel.y, panel.w, panel.h, 24);
  ctx.stroke();

  drawFlame(ctx, 640, panel.y + 84, 40);
  txt(ctx, 'EMBERWOK', 640, panel.y + 168, { size: 96, color: '#bf360c', weight: 900 });
  txt(ctx, 'Harbor Kitchen Rush', 640, panel.y + 232, { size: 40, color: '#6d4c41', weight: 800 });
  txt(ctx, `One cook. One wok. A harbor full of hungry sailors.`, 640, panel.y + 292, { size: 24, color: '#4e342e' });
  txt(ctx, `Earn ${WIN_COINS} coins before the 150-second day ends —`, 640, panel.y + 330, { size: 24, color: '#4e342e' });
  txt(ctx, 'but three walked-out customers close the kitchen.', 640, panel.y + 362, { size: 24, color: '#4e342e' });
  txt(ctx, 'Click a ticket, build the plate, grill proteins to PERFECT, serve fast.', 640, panel.y + 416, { size: 22, color: '#6d4c41', weight: 800 });
  txt(ctx, 'Keys 1-8 ingredients · Q/W collect pans · Space serve · X trash', 640, panel.y + 452, { size: 22, color: '#6d4c41', weight: 800 });

  const btn = LAYOUT.startBtn;
  const pulse = 1 + Math.sin(state.animTime * 4) * 0.02;
  ctx.save();
  ctx.translate(btn.x + btn.w / 2, btn.y + btn.h / 2);
  ctx.scale(pulse, pulse);
  ctx.translate(-(btn.x + btn.w / 2), -(btn.y + btn.h / 2));
  ctx.fillStyle = '#2e7d32';
  rr(ctx, btn.x, btn.y, btn.w, btn.h, 16);
  ctx.fill();
  txt(ctx, '▶  START THE DAY  (Enter)', btn.x + btn.w / 2, btn.y + btn.h / 2, { size: 30, color: '#fff', weight: 900 });
  ctx.restore();
}

export function drawEndScreen(ctx, state) {
  dimKitchen(ctx);
  const win = state.result === 'win';
  const panel = { x: 290, y: 190, w: 700, h: 470 };
  ctx.fillStyle = '#fff8e1';
  rr(ctx, panel.x, panel.y, panel.w, panel.h, 24);
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = win ? '#66bb6a' : '#ef5350';
  rr(ctx, panel.x, panel.y, panel.w, panel.h, 24);
  ctx.stroke();

  txt(ctx, win ? '★ TARGET SMASHED! ★' : 'SERVICE OVER', 640, panel.y + 78, {
    size: 52, color: win ? '#2e7d32' : '#b71c1c', weight: 900,
  });
  const reason = win
    ? 'The harbor eats well tonight, chef.'
    : state.hearts <= 0
      ? 'Three customers walked out. The kitchen closes.'
      : `The day ended short of the ${WIN_COINS} coin target.`;
  txt(ctx, reason, 640, panel.y + 128, { size: 24, color: '#4e342e' });

  const rows = [
    ['Coins earned', `${state.coins} / ${WIN_COINS}`],
    ['Dishes served', `${state.served}`],
    ['Best combo', `×${state.bestCombo}`],
    ['Customers lost', `${state.missed}`],
  ];
  rows.forEach(([label, value], i) => {
    const y = panel.y + 196 + i * 52;
    txt(ctx, label, panel.x + 90, y, { size: 27, color: '#6d4c41', align: 'left', weight: 800 });
    txt(ctx, value, panel.x + panel.w - 90, y, { size: 27, color: '#3e2723', align: 'right', weight: 900 });
  });

  const btn = LAYOUT.restartBtn;
  ctx.fillStyle = '#2e7d32';
  rr(ctx, btn.x, btn.y, btn.w, btn.h, 16);
  ctx.fill();
  txt(ctx, '↻  COOK AGAIN  (Enter)', btn.x + btn.w / 2, btn.y + btn.h / 2, { size: 29, color: '#fff', weight: 900 });
}

// --- dispatcher -------------------------------------------------------------------------

export function render(ctx, state) {
  drawKitchen(ctx, state);
  drawOrderBoard(ctx, state);
  drawGrill(ctx, state);
  drawPlateStack(ctx, state);
  drawPass(ctx, state);
  drawIngredientCounter(ctx, state);
  drawHud(ctx, state);
  drawFloaters(ctx, state);
  if (state.screen === SCREEN_TITLE) drawTitleScreen(ctx, state);
  if (state.screen === SCREEN_OVER) drawEndScreen(ctx, state);
}
