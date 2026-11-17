// The simulation: state, rules and progression for ORBITBREAK. No drawing here.
// A guardian rides a circular orbit around a fragile core, firing ricocheting bolts at
// invaders that spiral inward. Hits build a combo; misses cost nothing, leaks cost a shield.
// Every update is one fixed STEP, so behaviour is identical at any display rate.

import { FIELD, STEP, CORE, GUARD, BULLET, ENEMY, PICKUP, WAVE, POOL_SIZE } from './config.js';
import { createRandom } from './random.js';

export const SCREEN = { TITLE: 0, PLAY: 1, PAUSED: 2, OVER: 3 };

export function createWorld(seed) {
  const random = createRandom(seed);

  const world = {
    seed,
    random,
    screen: SCREEN.TITLE,
    time: 0,
    score: 0,
    best: 0,
    wave: 1,
    waveTime: 0,
    combo: 0,
    comboTimer: 0,
    shields: CORE.shieldMax,
    invuln: 0,
    slow: 0,
    spread: 0,
    fireTimer: 0,
    guardAngle: -Math.PI / 2,
    shake: 0,
    flash: 0,
    kills: 0,
    leaks: 0,
    enemies: [],
    bullets: [],
    pickups: [],
    particles: [],
    spawnTimer: 0,
    events: [],       // one-shot sound cues consumed by main each frame
    scene: null,      // staged scene for screenshots; null during normal play
  };

  world.emit = function emit(name) {
    world.events.push(name);
  };

  world.reset = function reset() {
    world.screen = SCREEN.PLAY;
    world.time = 0;
    world.score = 0;
    world.wave = 1;
    world.waveTime = 0;
    world.combo = 0;
    world.comboTimer = 0;
    world.shields = CORE.shieldMax;
    world.invuln = 0;
    world.slow = 0;
    world.spread = 0;
    world.fireTimer = 0;
    world.guardAngle = -Math.PI / 2;
    world.shake = 0;
    world.flash = 0;
    world.kills = 0;
    world.leaks = 0;
    world.enemies.length = 0;
    world.bullets.length = 0;
    world.pickups.length = 0;
    world.particles.length = 0;
    world.spawnTimer = 0.6;
    world.scene = null;
    world.events.length = 0;
  };

  function pushParticle(x, y, color, speed, life, size) {
    if (world.particles.length >= POOL_SIZE) return;
    const a = random() * Math.PI * 2;
    const s = speed * (0.4 + random() * 0.6);
    world.particles.push({
      x, y, color,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life, maxLife: life,
      size: size * (0.6 + random() * 0.8),
    });
  }

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i++) pushParticle(x, y, color, speed, 0.4 + random() * 0.4, 3);
  }

  function fire() {
    const gx = FIELD.cx + Math.cos(world.guardAngle) * GUARD.orbit;
    const gy = FIELD.cy + Math.sin(world.guardAngle) * GUARD.orbit;
    const angles = world.spread > 0
      ? [world.guardAngle - 0.22, world.guardAngle, world.guardAngle + 0.22]
      : [world.guardAngle];
    for (const a of angles) {
      world.bullets.push({
        x: gx, y: gy,
        vx: Math.cos(a) * BULLET.speed,
        vy: Math.sin(a) * BULLET.speed,
        life: BULLET.life,
        bounces: BULLET.bounces,
      });
    }
    world.emit('shoot');
  }

  function spawnEnemy() {
    const a = random() * Math.PI * 2;
    const alt = random() < 0.28;
    const speed = (ENEMY.baseSpeed + (world.wave - 1) * ENEMY.speedPerWave) * (0.85 + random() * 0.35);
    world.enemies.push({
      angle: a,
      radius: GUARD.orbit + 90 + random() * 120,
      speed,
      spin: (random() < 0.5 ? -1 : 1) * ENEMY.spin * (0.5 + random()),
      alt,
      hp: alt && world.wave > 3 ? 2 : 1,
      hitFlash: 0,
    });
  }

  function dropPickup(x, y) {
    if (random() > PICKUP.chance) return;
    const r = random();
    const kind = r < 0.45 ? 'heal' : r < 0.75 ? 'spread' : 'slow';
    world.pickups.push({ x, y, kind, life: PICKUP.life, spin: random() * Math.PI * 2 });
  }

  function damageCore() {
    if (world.invuln > 0) return;
    world.shields -= 1;
    world.invuln = CORE.invulnerable;
    world.shake = 14;
    world.flash = 0.35;
    world.combo = 0;
    world.emit('hurt');
    burst(FIELD.cx, FIELD.cy, '#ff5d5d', 22, 260);
    if (world.shields <= 0) {
      world.screen = SCREEN.OVER;
      if (world.score > world.best) world.best = world.score;
      world.emit('over');
    }
  }

  function advance(dt, steerDir, pointerAngle) {
    world.time += dt;
    if (world.invuln > 0) world.invuln = Math.max(0, world.invuln - dt);
    if (world.slow > 0) world.slow = Math.max(0, world.slow - dt);
    if (world.spread > 0) world.spread = Math.max(0, world.spread - dt);
    if (world.comboTimer > 0) {
      world.comboTimer -= dt;
      if (world.comboTimer <= 0) world.combo = 0;
    }
    if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 34);
    if (world.flash > 0) world.flash = Math.max(0, world.flash - dt * 1.6);

    // Steering: pointer takes priority when present, otherwise left/right keys.
    if (pointerAngle !== null && Number.isFinite(pointerAngle)) {
      world.guardAngle = pointerAngle;
    } else {
      world.guardAngle += steerDir * GUARD.speed * dt * (world.slow > 0 ? 1 : 1);
    }

    // Firing is automatic while the guardian is alive.
    world.fireTimer -= dt;
    if (world.fireTimer <= 0) {
      fire();
      world.fireTimer = GUARD.fireCooldown;
    }

    const slowFactor = world.slow > 0 ? PICKUP.slowFactor : 1;

    // Invaders spiral toward the core.
    for (let i = world.enemies.length - 1; i >= 0; i--) {
      const e = world.enemies[i];
      e.radius -= e.speed * slowFactor * dt;
      e.angle += e.spin * slowFactor * dt;
      if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt * 6);
      if (e.radius <= CORE.radius + ENEMY.radius) {
        world.enemies.splice(i, 1);
        world.leaks += 1;
        damageCore();
      }
    }

    // Bolts travel, ricochet off the field edge, expire, and hit invaders.
    for (let i = world.bullets.length - 1; i >= 0; i--) {
      const b = world.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      const margin = BULLET.radius;
      if (b.x < margin && b.vx < 0) { b.vx = -b.vx; b.bounces--; world.emit('bounce'); }
      else if (b.x > FIELD.width - margin && b.vx > 0) { b.vx = -b.vx; b.bounces--; world.emit('bounce'); }
      if (b.y < margin && b.vy < 0) { b.vy = -b.vy; b.bounces--; world.emit('bounce'); }
      else if (b.y > FIELD.height - margin && b.vy > 0) { b.vy = -b.vy; b.bounces--; world.emit('bounce'); }

      let consumed = false;
      if (b.life <= 0 || b.bounces < 0) {
        world.bullets.splice(i, 1);
        continue;
      }
      for (let j = world.enemies.length - 1; j >= 0; j--) {
        const e = world.enemies[j];
        const ex = FIELD.cx + Math.cos(e.angle) * e.radius;
        const ey = FIELD.cy + Math.sin(e.angle) * e.radius;
        const dx = b.x - ex;
        const dy = b.y - ey;
        const hitR = ENEMY.radius + BULLET.radius;
        if (dx * dx + dy * dy <= hitR * hitR) {
          e.hp -= 1;
          e.hitFlash = 1;
          if (e.hp <= 0) {
            world.enemies.splice(j, 1);
            world.kills += 1;
            world.combo += 1;
            world.comboTimer = 1.2;
            world.score += ENEMY.score * Math.min(8, 1 + Math.floor(world.combo / 4));
            burst(ex, ey, e.alt ? '#ff8a3d' : '#ff3d7f', 14, 220);
            dropPickup(ex, ey);
            world.emit('kill');
          } else {
            burst(ex, ey, '#ffd07a', 6, 160);
            world.emit('hit');
          }
          consumed = true;
          break;
        }
      }
      if (consumed) world.bullets.splice(i, 1);
    }

    // Pickups drift toward the core and are collected by the guardian's orbit band.
    for (let i = world.pickups.length - 1; i >= 0; i--) {
      const p = world.pickups[i];
      p.life -= dt;
      p.spin += dt * 2.4;
      p.y += PICKUP.fallSpeed * slowFactor * dt;
      const gx = FIELD.cx + Math.cos(world.guardAngle) * GUARD.orbit;
      const gy = FIELD.cy + Math.sin(world.guardAngle) * GUARD.orbit;
      const dx = p.x - gx;
      const dy = p.y - gy;
      if (dx * dx + dy * dy <= (GUARD.radius + PICKUP.radius + 6) ** 2) {
        if (p.kind === 'heal') {
          world.shields = Math.min(CORE.shieldMax, world.shields + 1);
          world.emit('heal');
        } else if (p.kind === 'spread') {
          world.spread = PICKUP.spreadTime;
          world.emit('power');
        } else {
          world.slow = PICKUP.slowTime;
          world.emit('power');
        }
        burst(p.x, p.y, '#ffffff', 10, 180);
        world.pickups.splice(i, 1);
        continue;
      }
      if (p.life <= 0 || p.y > FIELD.height + 30) world.pickups.splice(i, 1);
    }

    // Particles.
    for (let i = world.particles.length - 1; i >= 0; i--) {
      const q = world.particles[i];
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.vx *= 0.96;
      q.vy *= 0.96;
      q.life -= dt;
      if (q.life <= 0) world.particles.splice(i, 1);
    }

    // Spawning and wave progression.
    world.spawnTimer -= dt;
    if (world.spawnTimer <= 0 && world.enemies.length < 60) {
      spawnEnemy();
      const base = Math.max(ENEMY.minInterval, ENEMY.interval * Math.pow(ENEMY.intervalScale, world.wave - 1));
      world.spawnTimer = base * (0.75 + random() * 0.5);
    }
    world.waveTime += dt;
    if (world.waveTime >= WAVE.seconds && world.wave < WAVE.max) {
      world.wave += 1;
      world.waveTime = 0;
      world.emit('wave');
      world.flash = 0.2;
    }
  }

  world.update = function update(steerDir, pointerAngle) {
    if (world.screen === SCREEN.PLAY && !world.scene) advance(STEP, steerDir, pointerAngle);
  };

  world.start = function start() {
    world.reset();
  };

  world.togglePause = function togglePause() {
    if (world.screen === SCREEN.PLAY) world.screen = SCREEN.PAUSED;
    else if (world.screen === SCREEN.PAUSED) world.screen = SCREEN.PLAY;
  };

  return world;
}
