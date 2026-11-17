// Boot and the single loop. Input is read every frame; the world advances in fixed 1/60 s
// steps; the renderer paints the result. ?seed=N fixes the random stream, and
// ?shot=start|play|end stages that scene for the screenshots. A staged scene freezes the
// simulation but keeps the render clock running so glows and the starfield stay alive.

import { STEP, BEST_KEY } from './config.js';
import { createWorld, SCREEN } from './world.js';
import { createInput, ACTION_CONFIRM, ACTION_PAUSE } from './input.js';
import { createRenderer } from './render.js';
import { createAudio } from './audio.js';
import { stageScene } from './shots.js';

const canvas = document.getElementById('game');
const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed')) || 20261117;
const shot = params.get('shot');

window.addEventListener('error', (e) => { document.title = 'ERR:' + e.message + ' @' + e.lineno; });

const world = createWorld(seed);
const input = createInput(canvas);
const renderer = createRenderer(canvas);
const audio = createAudio();

try {
  world.best = Number(localStorage.getItem(BEST_KEY)) || 0;
} catch {
  world.best = 0;
}

if (shot) {
  stageScene(world, shot);
}

function writeBest() {
  if (world.score > world.best) world.best = world.score;
  try {
    localStorage.setItem(BEST_KEY, String(world.best));
  } catch {
    // Storage may be disabled; the run still works.
  }
}

let last = performance.now();
let acc = 0;

function frame(now) {
  let elapsed = (now - last) / 1000;
  last = now;
  if (elapsed > 0.25) elapsed = 0.25;   // clamp after a background-tab pause
  acc += elapsed;

  if (!shot) {
    if (input.take(ACTION_CONFIRM)) {
      audio.unlock();
      if (world.screen === SCREEN.TITLE || world.screen === SCREEN.OVER) {
        world.start();
      }
    }
    if (input.take(ACTION_PAUSE)) {
      world.togglePause();
    }

    const prevScreen = world.screen;
    while (acc >= STEP) {
      world.update(input.steer(), input.pointerAngle());
      acc -= STEP;
    }
    if (prevScreen === SCREEN.PLAY && world.screen === SCREEN.OVER) writeBest();
  } else {
    // Staged scenes only advance the display clock.
    world.time += Math.min(elapsed, STEP);
    acc = 0;
  }

  // Consume sound cues emitted by the simulation.
  for (const cue of world.events) audio.play(cue);
  world.events.length = 0;

  renderer.resize();
  renderer.draw(world);
  requestAnimationFrame(frame);
}

renderer.resize();
requestAnimationFrame(frame);

// Expose a tiny hook for screenshot tooling and debugging without affecting play.
window.__orbitbreak = { world, stageScene };
