// ORBITBREAK — hand-in program (Node 22, standard library only).
//
// The game itself lives in ./game as plain static files: game/index.html plus its ES modules,
// with no build step, no network requests and no vendored engine. The guardian rides a circular
// orbit around a fragile core, firing bolts that ricochet off the walls at invaders spiralling
// inward. This program copies game/ and screenshots/ to the output directory and writes a
// dossier.json through the kit's vendored builder, which is the summary the judge reads.
//
// The three screenshots show the whole loop: the title, live play with the HUD, and the results
// screen. They are real renders of the game's own canvas, captured headless at 1280x720.
//
// Serve locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// Guard the hand-in: the judge needs at least the title, play and results shots, and each file
// must stay under the scorer's 256 KiB per-image cap. Fail loudly here rather than ship a dossier
// the gate would reject for a missing or oversized screenshot.
const shotDir = join(out, 'screenshots');
const shots = readdirSync(shotDir).filter((name) => /\.(png|jpe?g)$/i.test(name));
if (shots.length < 3) throw new Error(`ORBITBREAK: need at least 3 screenshots, found ${shots.length}`);

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
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

console.log(`ORBITBREAK hand-in ready: ${shots.length} screenshots, dossier at ${join(out, 'dossier.json')}`);
