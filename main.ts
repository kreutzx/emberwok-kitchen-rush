// Emberwok: Harbor Kitchen Rush — make.fun hand-in program.
//
// Run with Node 22 (standard library only):
//   MAKEFUN_OUTPUT_DIR=/output node main.ts
//
// It copies the browser game (game/) and any screenshots (screenshots/)
// sitting beside this file into the output directory, then writes a
// dossier.json describing that tree via the vendored buildDossier, so
// the scorer sees exactly the bytes that were handed in.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });

const screenshotsDir = join(here, 'screenshots');
if (existsSync(screenshotsDir)) {
  cpSync(screenshotsDir, join(out, 'screenshots'), { recursive: true });
}

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
