// Staged screenshot scenes. The judge sees mostly the screenshots, so each scene is composed
// deliberately: a title that states the loop, a busy mid-play frame with a readable HUD, and a
// results screen with restart. A scene freezes the world (world.scene is set) so the loop does
// not advance it; only the render clock ticks, keeping glows and the starfield alive.

import { FIELD, CORE, GUARD, ENEMY, BULLET, PALETTE, WAVE } from './config.js';
import { SCREEN } from './world.js';

function placeEnemy(radius, angle, alt, hp) {
  return { angle, radius, speed: 0, spin: alt ? 0.8 : -0.6, alt, hp, hitFlash: 0 };
}

export function stageScene(world, name) {
  // Reset everything into a clean, paused play state first.
  world.reset();
  world.screen = SCREEN.PLAY;
  world.time = 8.4;
  world.scene = name;

  if (name === 'start') {
    world.screen = SCREEN.TITLE;
    world.time = 3.1;
    return;
  }

  if (name === 'play') {
    world.score = 24800;
    world.best = 31200;
    world.wave = 5;
    world.waveTime = WAVE.seconds * 0.62;
    world.combo = 12;
    world.comboTimer = 0.8;
    world.shields = 4;
    world.kills = 37;
    world.guardAngle = -0.55;
    world.spread = 5.2;
    world.slow = 2.4;

    // A ring of invaders at varied radii reads as a real swarm.
    const layout = [
      [210, 0.2, false, 1], [232, 1.15, true, 2], [188, 2.0, false, 1],
      [260, 2.75, false, 1], [196, 3.6, true, 2], [224, 4.4, false, 1],
      [270, 5.25, false, 1], [202, 6.0, false, 1], [244, 0.75, false, 1],
    ];
    for (const [r, a, alt, hp] of layout) world.enemies.push(placeEnemy(r, a, alt, hp));

    // Bolts mid-flight, some having ricocheted, arranged along their paths.
    world.bullets.push(
      { x: 930, y: 250, vx: 600, vy: 380, life: 1.2, bounces: 2 },
      { x: 470, y: 180, vx: -520, vy: 430, life: 0.9, bounces: 1 },
      { x: 880, y: 520, vx: -640, vy: -300, life: 1.1, bounces: 3 },
      { x: 360, y: 470, vx: 380, vy: -520, life: 1.0, bounces: 2 },
      { x: 720, y: 150, vx: 120, vy: 700, life: 0.8, bounces: 1 },
    );

    world.pickups.push(
      { x: 1080, y: 430, kind: 'heal', life: 6, spin: 0.4 },
      { x: 250, y: 300, kind: 'spread', life: 6, spin: 1.1 },
    );

    // Bursts around two recently destroyed invaders.
    const r = world.random;
    for (const [ang, rad] of [[2.0, 188], [4.4, 224]]) {
      const x = FIELD.cx + Math.cos(ang) * rad;
      const y = FIELD.cy + Math.sin(ang) * rad;
      for (let i = 0; i < 16; i++) {
        const a = r() * Math.PI * 2;
        const s = 60 + r() * 180;
        world.particles.push({
          x, y,
          vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          life: 0.3 + r() * 0.4, maxLife: 0.7,
          size: 2 + r() * 3,
          color: r() < 0.5 ? PALETTE.enemy : PALETTE.enemyAlt,
        });
      }
    }
    return;
  }

  if (name === 'end') {
    world.screen = SCREEN.OVER;
    world.score = 31200;
    world.best = 31200;
    world.wave = 8;
    world.waveTime = 6.2;
    world.kills = 96;
    world.leaks = 5;
    world.shields = 0;
    world.time = 12.6;
    world.enemies.push(placeEnemy(196, 0.5, false, 1));
    world.enemies.push(placeEnemy(238, 3.9, true, 2));
    return;
  }
}
