// "Hear the transit": a steady tone stands for the star's light. When the planet crosses the star the light
// dips, so the tone gets quieter and lower. The size of the real dip is mapped (and exaggerated) onto pitch.
let ctx = null, stopFn = null;

export function stopTransit() { if (stopFn) { stopFn(); stopFn = null; } }

export function playTransit(depth, onEnd) {
  stopTransit();
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) { if (onEnd) onEnd(); return; }
  ctx = ctx || new AC();
  if (ctx.state === 'suspended') ctx.resume();
  // 0..1: how deep the dip is, on a log scale between a 0.001% and a 3% dip
  const e = Math.max(0.12, Math.min(1, Math.log10(Math.max(depth, 1e-5) / 1e-5) / Math.log10(0.03 / 1e-5)));
  const base = 392, low = base * (1 - 0.45 * e), t0 = ctx.currentTime + 0.05;
  const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
  o1.type = 'sine'; o2.type = 'triangle'; o2.detune.value = 6;
  lp.type = 'lowpass'; lp.frequency.value = 1800;
  o1.connect(g); o2.connect(g); g.connect(lp); lp.connect(ctx.destination);
  const vol = 0.16, dip = vol * (1 - 0.55 * e);
  const T = { flat: 1.2, down: 0.55, hold: 1.5, up: 0.55 };
  const tDown = t0 + T.flat, tHold = tDown + T.down, tUp = tHold + T.hold, tEnd = tUp + T.up + T.flat;
  for (const o of [o1, o2]) {
    o.frequency.setValueAtTime(base, t0); o.frequency.setValueAtTime(base, tDown);
    o.frequency.linearRampToValueAtTime(low, tHold); o.frequency.setValueAtTime(low, tUp);
    o.frequency.linearRampToValueAtTime(base, tUp + T.up);
  }
  g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.12);
  g.gain.setValueAtTime(vol, tDown); g.gain.linearRampToValueAtTime(dip, tHold);
  g.gain.setValueAtTime(dip, tUp); g.gain.linearRampToValueAtTime(vol, tUp + T.up);
  g.gain.setValueAtTime(vol, tEnd - 0.2); g.gain.linearRampToValueAtTime(0.0001, tEnd);
  o1.start(t0); o2.start(t0); o1.stop(tEnd + 0.05); o2.stop(tEnd + 0.05);
  const timer = setTimeout(() => { stopFn = null; if (onEnd) onEnd(); }, (tEnd - ctx.currentTime) * 1000 + 80);
  stopFn = () => { clearTimeout(timer); try { g.gain.cancelScheduledValues(ctx.currentTime); g.gain.setValueAtTime(g.gain.value, ctx.currentTime); g.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.08); o1.stop(ctx.currentTime + 0.1); o2.stop(ctx.currentTime + 0.1); } catch { /* already stopped */ } };
}
