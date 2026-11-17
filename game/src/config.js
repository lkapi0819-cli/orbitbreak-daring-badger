// ORBITBREAK — tuning numbers and colours for a radial arcade shooter.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the window.

export const FIELD = { width: 1280, height: 720, cx: 640, cy: 360 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display rate. */
export const STEP = 1 / 60;

export const CORE = {
  radius: 30,
  shieldMax: 5,
  invulnerable: 1.2,
};

export const GUARD = {
  radius: 9,
  orbit: 150,
  speed: 3.1,
  fireCooldown: 0.16,
};

export const BULLET = {
  speed: 780,
  radius: 5,
  life: 1.8,
  bounces: 3,
};

export const ENEMY = {
  radius: 13,
  baseSpeed: 62,
  speedPerWave: 12,
  spin: 0.6,
  interval: 1.15,
  intervalScale: 0.9,
  minInterval: 0.3,
  score: 100,
};

export const PICKUP = {
  radius: 12,
  chance: 0.16,
  life: 8,
  fallSpeed: 46,
  slowFactor: 0.35,
  slowTime: 5,
  spreadTime: 8,
};

/** Seconds of play per wave, and the last wave. */
export const WAVE = { seconds: 16, max: 12 };

export const POOL_SIZE = 128;

export const PALETTE = {
  backdrop: '#050812',
  sky: '#0a1120',
  grid: 'rgba(64, 112, 176, 0.10)',
  star: 'rgba(150, 200, 255, 0.7)',
  guard: '#38f0e0',
  bullet: '#8bffe0',
  enemy: '#ff3d7f',
  enemyAlt: '#ff8a3d',
  core: '#ffb13d',
  coreHit: '#ff5d5d',
  pickupHeal: '#6dff8a',
  pickupSpread: '#ffe14d',
  pickupSlow: '#4dd8ff',
  panel: '#0d1626',
  text: '#e8f4ff',
  muted: '#8398b4',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const BEST_KEY = 'orbitbreak.best';
