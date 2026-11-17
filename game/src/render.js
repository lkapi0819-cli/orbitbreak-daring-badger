// Drawing only: the world state and current screen go in, pixels come out. The 1280x720
// playfield is scaled to fit the window and centred. A starfield and polar grid give the
// radial arena depth; glows are cheap layered circles, so no asset files are needed.

import { FIELD, CORE, GUARD, ENEMY, PICKUP, PALETTE, FONT } from './config.js';
import { SCREEN } from './world.js';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const stars = [];
  for (let i = 0; i < 90; i++) {
    stars.push({
      x: Math.random() * FIELD.width,
      y: Math.random() * FIELD.height,
      r: Math.random() * 1.4 + 0.3,
      a: Math.random() * 0.5 + 0.2,
    });
  }

  function glow(x, y, radius, color) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function background(t) {
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    const g = ctx.createRadialGradient(FIELD.cx, FIELD.cy, 40, FIELD.cx, FIELD.cy, 620);
    g.addColorStop(0, PALETTE.sky);
    g.addColorStop(1, PALETTE.backdrop);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);

    for (const s of stars) {
      ctx.globalAlpha = s.a;
      ctx.fillStyle = PALETTE.star;
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }
    ctx.globalAlpha = 1;

    // Polar grid: concentric rings and spokes around the core.
    ctx.strokeStyle = PALETTE.grid;
    ctx.lineWidth = 1;
    for (let r = 90; r <= 340; r += 62) {
      ctx.beginPath();
      ctx.arc(FIELD.cx, FIELD.cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + t * 0.03;
      ctx.beginPath();
      ctx.moveTo(FIELD.cx + Math.cos(a) * 70, FIELD.cy + Math.sin(a) * 70);
      ctx.lineTo(FIELD.cx + Math.cos(a) * 360, FIELD.cy + Math.sin(a) * 360);
      ctx.stroke();
    }
  }

  function drawCore(w) {
    const hit = w.invuln > 0 && Math.floor(w.time * 14) % 2 === 0;
    const color = hit ? PALETTE.coreHit : PALETTE.core;
    glow(FIELD.cx, FIELD.cy, 74, hit ? 'rgba(255,93,93,0.5)' : 'rgba(255,177,61,0.42)');
    ctx.beginPath();
    ctx.arc(FIELD.cx, FIELD.cy, CORE.radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(FIELD.cx, FIELD.cy, CORE.radius - 9, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fill();

    // Shield pips ring the core.
    for (let i = 0; i < CORE.shieldMax; i++) {
      const a = -Math.PI / 2 + (i / CORE.shieldMax) * Math.PI * 2;
      const x = FIELD.cx + Math.cos(a) * 52;
      const y = FIELD.cy + Math.sin(a) * 52;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = i < w.shields ? PALETTE.core : 'rgba(120,140,170,0.25)';
      ctx.fill();
    }
  }

  function drawGuard(w) {
    const gx = FIELD.cx + Math.cos(w.guardAngle) * GUARD.orbit;
    const gy = FIELD.cy + Math.sin(w.guardAngle) * GUARD.orbit;
    // Orbit rail.
    ctx.beginPath();
    ctx.arc(FIELD.cx, FIELD.cy, GUARD.orbit, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(56,240,224,0.16)';
    ctx.lineWidth = 2;
    ctx.stroke();
    glow(gx, gy, 30, 'rgba(56,240,224,0.45)');
    ctx.save();
    ctx.translate(gx, gy);
    ctx.rotate(w.guardAngle + Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(10, 10);
    ctx.lineTo(0, 5);
    ctx.lineTo(-10, 10);
    ctx.closePath();
    ctx.fillStyle = PALETTE.guard;
    ctx.fill();
    ctx.restore();
  }

  function drawEnemies(w) {
    for (const e of w.enemies) {
      const x = FIELD.cx + Math.cos(e.angle) * e.radius;
      const y = FIELD.cy + Math.sin(e.angle) * e.radius;
      const base = e.alt ? PALETTE.enemyAlt : PALETTE.enemy;
      glow(x, y, 26, e.alt ? 'rgba(255,138,61,0.4)' : 'rgba(255,61,127,0.45)');
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(e.angle + w.time * e.spin);
      ctx.beginPath();
      const r = ENEMY.radius;
      ctx.moveTo(0, -r);
      ctx.lineTo(r, 0);
      ctx.lineTo(0, r);
      ctx.lineTo(-r, 0);
      ctx.closePath();
      ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : base;
      ctx.fill();
      if (e.hp > 1) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawBullets(w) {
    ctx.fillStyle = PALETTE.bullet;
    for (const b of w.bullets) {
      glow(b.x, b.y, 12, 'rgba(139,255,224,0.5)');
      ctx.beginPath();
      ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPickups(w) {
    for (const p of w.pickups) {
      const color = p.kind === 'heal' ? PALETTE.pickupHeal
        : p.kind === 'spread' ? PALETTE.pickupSpread : PALETTE.pickupSlow;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.spin);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(-8, -8, 16, 16);
      ctx.fillStyle = color;
      ctx.font = 'bold 13px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.kind === 'heal' ? '+' : p.kind === 'spread' ? '3' : '~', 0, 1);
      ctx.restore();
    }
  }

  function drawParticles(w) {
    for (const q of w.particles) {
      ctx.globalAlpha = Math.max(0, q.life / q.maxLife);
      ctx.fillStyle = q.color;
      ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size);
    }
    ctx.globalAlpha = 1;
  }

  function text(str, x, y, size, color, align) {
    ctx.font = `600 ${size}px ${FONT}`;
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(str, x, y);
  }

  function hud(w) {
    text('SCORE', 30, 44, 16, PALETTE.muted);
    text(String(w.score).padStart(6, '0'), 30, 78, 34, PALETTE.text);
    text('BEST', 250, 44, 16, PALETTE.muted);
    text(String(Math.max(w.best, w.score)).padStart(6, '0'), 250, 74, 24, PALETTE.core);

    text('WAVE', FIELD.width - 30, 44, 16, PALETTE.muted, 'right');
    text(String(w.wave).padStart(2, '0'), FIELD.width - 30, 82, 34, PALETTE.text, 'right');

    if (w.combo >= 4) {
      text(`COMBO x${Math.min(8, 1 + Math.floor(w.combo / 4))}`, FIELD.cx, 60, 26, PALETTE.guard, 'center');
    }
    if (w.slow > 0) text('SLOW', FIELD.cx, FIELD.height - 26, 16, PALETTE.pickupSlow, 'center');
    if (w.spread > 0) text('TRIPLE SHOT', FIELD.cx, FIELD.height - 48, 16, PALETTE.pickupSpread, 'center');
  }

  function panel(title, subtitle, lines) {
    ctx.fillStyle = 'rgba(4,8,18,0.78)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    text(title, FIELD.cx, 250, 74, PALETTE.guard, 'center');
    text(subtitle, FIELD.cx, 300, 24, PALETTE.text, 'center');
    let y = 380;
    for (const line of lines) {
      text(line, FIELD.cx, y, 20, PALETTE.muted, 'center');
      y += 38;
    }
  }

  function titleScreen(w) {
    glow(FIELD.cx, 250, 260, 'rgba(56,240,224,0.12)');
    text('ORBIT', FIELD.cx, 210, 92, PALETTE.guard, 'center');
    text('BREAK', FIELD.cx, 300, 92, PALETTE.enemy, 'center');
    text('A RADIAL RICOCHET DEFENCE', FIELD.cx, 350, 20, PALETTE.muted, 'center');
    text('A / D  or  MOUSE  to orbit     ·     FIRE is automatic', FIELD.cx, 470, 20, PALETTE.text, 'center');
    text('Bolts ricochet off the walls. Catch green to heal,', FIELD.cx, 506, 18, PALETTE.muted, 'center');
    text('yellow for triple shot, cyan to slow time.', FIELD.cx, 532, 18, PALETTE.muted, 'center');
    const pulse = 0.55 + Math.sin(w.time * 4) * 0.45;
    ctx.globalAlpha = pulse;
    text('PRESS SPACE TO LAUNCH', FIELD.cx, 620, 26, PALETTE.core, 'center');
    ctx.globalAlpha = 1;
  }

  function overScreen(w) {
    panel('CORE LOST', `Survived ${w.wave} wave${w.wave === 1 ? '' : 's'}`, [
      `SCORE  ${w.score}`,
      `BEST   ${Math.max(w.best, w.score)}`,
      `${w.kills} invaders destroyed`,
      'PRESS SPACE TO TRY AGAIN',
    ]);
  }

  function pauseScreen(w) {
    panel('PAUSED', 'The orbit holds', ['PRESS P TO RESUME']);
  }

  return {
    resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = FIELD.width * dpr;
      canvas.height = FIELD.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    },
    draw(w) {
      const sx = w.shake > 0 ? (Math.random() - 0.5) * w.shake : 0;
      const sy = w.shake > 0 ? (Math.random() - 0.5) * w.shake : 0;
      ctx.save();
      ctx.translate(sx, sy);
      background(w.time);
      drawPickups(w);
      drawCore(w);
      drawGuard(w);
      drawEnemies(w);
      drawBullets(w);
      drawParticles(w);
      ctx.restore();

      if (w.screen === SCREEN.PLAY || w.screen === SCREEN.PAUSED) hud(w);
      if (w.flash > 0) {
        ctx.globalAlpha = Math.min(0.5, w.flash);
        ctx.fillStyle = w.screen === SCREEN.PLAY ? '#ff5d5d' : PALETTE.guard;
        ctx.fillRect(0, 0, FIELD.width, FIELD.height);
        ctx.globalAlpha = 1;
      }
      if (w.screen === SCREEN.TITLE) titleScreen(w);
      else if (w.screen === SCREEN.PAUSED) pauseScreen(w);
      else if (w.screen === SCREEN.OVER) overScreen(w);
    },
  };
}
