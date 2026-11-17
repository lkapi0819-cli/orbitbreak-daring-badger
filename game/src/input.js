// Keyboard and pointer input. Held keys steer the guardian around its orbit; one-shot presses
// (start, restart, pause) are queued as bit flags and consumed once by the loop, so a press
// between two frames is never lost and never counted twice.

export const ACTION_CONFIRM = 1;   // Space / Enter / click: start or restart
export const ACTION_PAUSE = 2;     // P / Escape
export const ACTION_LEFT = 4;      // A / ArrowLeft
export const ACTION_RIGHT = 8;     // D / ArrowRight

export function createInput(canvas) {
  let held = 0;
  let pressed = 0;
  let pointerAngle = null;

  function onKey(e, down) {
    const k = e.key.toLowerCase();
    let bit = 0;
    if (k === 'a' || k === 'arrowleft') bit = ACTION_LEFT;
    else if (k === 'd' || k === 'arrowright') bit = ACTION_RIGHT;

    if (down) {
      if (bit) held |= bit;
      if (k === ' ' || k === 'enter' || k === 'spacebar') pressed |= ACTION_CONFIRM;
      if (k === 'p' || k === 'escape') pressed |= ACTION_PAUSE;
      if (bit || k === ' ' || k === 'p') e.preventDefault();
    } else if (bit) {
      held &= ~bit;
    }
  }

  window.addEventListener('keydown', (e) => onKey(e, true));
  window.addEventListener('keyup', (e) => onKey(e, false));
  canvas.addEventListener('pointerdown', () => { pressed |= ACTION_CONFIRM; });
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    pointerAngle = Math.atan2(y - r.height / 2, x - r.width / 2);
  });
  canvas.addEventListener('pointerleave', () => { pointerAngle = null; });

  return {
    /** Direction along the orbit: -1 counter-clockwise, +1 clockwise, 0 idle. */
    steer() {
      let dir = 0;
      if (held & ACTION_LEFT) dir -= 1;
      if (held & ACTION_RIGHT) dir += 1;
      return dir;
    },
    /** Absolute pointer angle in radians, or null when the pointer is not over the canvas. */
    pointerAngle() {
      return pointerAngle;
    },
    /** Consume a one-shot action flag, returning true exactly once per press. */
    take(flag) {
      if (pressed & flag) {
        pressed &= ~flag;
        return true;
      }
      return false;
    },
    clear() {
      pressed = 0;
      held = 0;
      pointerAngle = null;
    },
  };
}
