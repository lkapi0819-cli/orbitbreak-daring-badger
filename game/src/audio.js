// Sound synthesised with the Web Audio API: no audio files, everything is generated at runtime.
// Each cue is a short oscillator envelope. Audio starts only after the first user gesture, which
// the browser requires; in a headless screenshot run there is no gesture and audio stays silent.

import { STEP } from './config.js';

export function createAudio() {
  let ac = null;
  let muted = false;

  function ensure() {
    if (ac) return ac;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      ac = new AudioCtx();
    } catch {
      return null;
    }
    return ac;
  }

  function tone(freq, dur, type, gain, slideTo) {
    if (muted) return;
    const a = ensure();
    if (!a) return;
    const osc = a.createOscillator();
    const vol = a.createGain();
    osc.type = type || 'sine';
    const now = a.currentTime;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + dur);
    vol.gain.setValueAtTime(gain, now);
    vol.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(vol);
    vol.connect(a.destination);
    osc.start(now);
    osc.stop(now + dur + 0.01);
  }

  const cues = {
    shoot: () => tone(680, 0.07, 'triangle', 0.045, 420),
    bounce: () => tone(520, 0.05, 'square', 0.02, 700),
    hit: () => tone(300, 0.08, 'sawtooth', 0.05, 180),
    kill: () => { tone(180, 0.16, 'sawtooth', 0.07, 60); tone(900, 0.08, 'sine', 0.04, 400); },
    hurt: () => tone(140, 0.35, 'sawtooth', 0.09, 48),
    heal: () => { tone(520, 0.1, 'sine', 0.05, 780); tone(780, 0.12, 'sine', 0.04, 1040); },
    power: () => { tone(440, 0.09, 'triangle', 0.05, 880); },
    wave: () => { tone(330, 0.2, 'triangle', 0.06, 660); },
    over: () => { tone(220, 0.6, 'sawtooth', 0.08, 55); },
  };

  return {
    unlock() {
      const a = ensure();
      if (a && a.state === 'suspended') a.resume();
    },
    play(name) {
      const fn = cues[name];
      if (fn) fn();
    },
    toggle() {
      muted = !muted;
      return muted;
    },
  };
}
