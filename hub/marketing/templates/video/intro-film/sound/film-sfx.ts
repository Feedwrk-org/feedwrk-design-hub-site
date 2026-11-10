/* Feedwrk intro film — sound layer.
   One AudioProcessor (an instrument: output only) owns the voice bus and a small room reverb.
   Every cue is a method that takes an absolute time, so the cue sheet below can mirror the film's
   STORY timeline (feedwrk-intro-film.html + video.js easing) exactly. Rendered offline to WAV. */
import { AudioProcessor, renderOffline, type SchedulableParam } from "@audiorective/core";
import { Convolver, Filter } from "@audiorective/effects";

/* ---- the film's own easing (video.js) ---- */
const clamp = (x: number) => Math.min(1, Math.max(0, x));
const eo = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
const ease = (x: number) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
/** time fraction at which an easing curve reaches y */
const inv = (f: (x: number) => number, y: number) => { let lo = 0, hi = 1; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; f(m) < y ? (lo = m) : (hi = m); } return hi; };
const curve = (f: (x: number) => number, a: number, b: number, n = 256) => { const c = new Float32Array(n); for (let i = 0; i < n; i++) c[i] = a + (b - a) * f(i / (n - 1)); return c; };

/* seeded noise, like the motion engine (seed 7) */
function rng(seed: number) { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

function noiseBuffer(ctx: BaseAudioContext, seconds: number, seed: number) {
  const r = rng(seed), b = ctx.createBuffer(2, Math.ceil(seconds * ctx.sampleRate), ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1; }
  return b;
}
/** a soft, short "glass room" impulse response: decaying stereo noise, darkened over time */
function roomIR(ctx: BaseAudioContext, seconds = 1.6) {
  const r = rng(11), b = ctx.createBuffer(2, Math.ceil(seconds * ctx.sampleRate), ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c); let lp = 0;
    for (let i = 0; i < d.length; i++) { const t = i / ctx.sampleRate, k = 0.35 + 0.6 * Math.exp(-t * 3); lp += k * ((r() * 2 - 1) - lp); d[i] = lp * Math.exp(-t * 3.2); }
  }
  return b;
}

export class FilmSfx extends AudioProcessor<{ level: SchedulableParam; reverb: SchedulableParam }> {
  private readonly _bus: GainNode;
  private readonly _out: GainNode;
  private readonly _noise: AudioBuffer;

  constructor(ctx: BaseAudioContext) {
    const bus = new GainNode(ctx);
    const out = new GainNode(ctx, { gain: 1 });
    const send = new GainNode(ctx, { gain: 0.32 });
    const tone = new Filter(ctx, { type: "highpass", frequency: 70 });       // keep rumble off the voice
    const room = new Convolver(ctx, { buffer: roomIR(ctx), normalize: true });

    super(ctx, ({ param }) => ({
      params: {
        level: param({ default: 1, bind: out.gain }),
        reverb: param({ default: 0.32, bind: send.gain }),
      },
      latency: 0,
    }));

    this._bus = bus;
    this._out = out;
    this._noise = noiseBuffer(ctx, 4, 7);

    this.defineGraph(() => [
      [bus, tone],
      [tone, out],
      [tone, send],
      [send, room],
      [room, out],
    ]);
  }

  get output() { return this._out; }

  /* ---- voices: short-lived leaf sources that feed the bus ---- */
  private noise(when: number, dur: number, offset = 0) {
    const s = new AudioBufferSourceNode(this.context, { buffer: this._noise, loop: true });
    s.start(when, offset % 3, dur + 0.05); return s;
  }
  private env(when: number, attack: number, hold: number, release: number, peak: number) {
    const g = new GainNode(this.context, { gain: 0 }), p = g.gain;
    p.setValueAtTime(0, when);
    p.linearRampToValueAtTime(peak, when + attack);
    p.setValueAtTime(peak, when + attack + hold);
    p.setTargetAtTime(0, when + attack + hold, release / 4);
    return g;
  }
  private pan(when: number, dur: number, from: number, to: number) {
    const p = new StereoPannerNode(this.context, { pan: from });
    p.pan.setValueAtTime(from, when); p.pan.linearRampToValueAtTime(to, when + dur); return p;
  }

  /** a data particle: a 4 ms click of high, airy noise. No pitch, no body. */
  particle(when: number, freq: number, level: number, pan = 0) {
    const n = this.noise(when, 0.03, when * 0.731);
    const hp = new BiquadFilterNode(this.context, { type: "highpass", frequency: freq, Q: 0.5 });
    const lp = new BiquadFilterNode(this.context, { type: "lowpass", frequency: freq * 3, Q: 0.5 });
    const e = this.env(when, 0.0008, 0.002, 0.018, level * 2.0);
    n.connect(hp).connect(lp).connect(e).connect(new StereoPannerNode(this.context, { pan })).connect(this._bus);
  }

  /** a data stream that follows a motion: wide, low-Q filtered noise that opens a little along the
      motion's own curve. No oscillators, so nothing glides in pitch. */
  stream(when: number, dur: number, f0: number, f1: number, shape: (x: number) => number, level: number, panFrom = -0.2, panTo = 0.2) {
    const n = this.noise(when, dur + 0.5, when);
    const hp = new BiquadFilterNode(this.context, { type: "highpass", frequency: 400, Q: 0.5 });
    const lp = new BiquadFilterNode(this.context, { type: "lowpass", Q: 0.5 });
    lp.frequency.setValueCurveAtTime(curve(shape, f0, f1), when, dur);
    const e = this.env(when, dur * 0.35, dur * 0.3, 0.5, level);
    n.connect(hp).connect(lp).connect(e).connect(this.pan(when, dur, panFrom, panTo)).connect(this._bus);
  }

  /** a scene change: a breath of air that crosses the stereo field as the old scene fades out */
  breath(when: number, level = 0.06, panFrom = -0.5, panTo = 0.5) {
    const d = 0.8, n = this.noise(when, d, when * 1.3);
    const bp = new BiquadFilterNode(this.context, { type: "bandpass", Q: 0.6 });
    bp.frequency.setValueAtTime(3800, when); bp.frequency.exponentialRampToValueAtTime(1400, when + d);
    const e = this.env(when, d * 0.4, 0.05, d * 0.5, level);
    n.connect(bp).connect(e).connect(this.pan(when, d, panFrom, panTo)).connect(this._bus);
  }

  /** the River ground: a slow, wide band of air that drifts like the threads, under everything */
  river(when: number, dur: number, level: number) {
    const n = this.noise(when, dur, 1.9);
    const lp = new BiquadFilterNode(this.context, { type: "bandpass", Q: 0.8 });
    const pts = new Float32Array(64); for (let i = 0; i < 64; i++) pts[i] = 600 + 260 * Math.sin((i / 63) * Math.PI * 2 * (dur / 12));
    lp.frequency.setValueCurveAtTime(pts, when, dur);
    const e = this.env(when, Math.min(1.5, dur * 0.3), dur - Math.min(1.5, dur * 0.3) - 1.2, 1.4, level);
    n.connect(lp).connect(e).connect(this._bus);
  }

  /** a quiet resolve for the end card: low, soft air that swells and fades with the film. No notes. */
  resolve(when: number, dur: number, _notes: number[], level: number) {
    const n = this.noise(when, dur, 2.3);
    const lp = new BiquadFilterNode(this.context, { type: "lowpass", Q: 0.5, frequency: 300 });
    lp.frequency.setValueAtTime(300, when); lp.frequency.linearRampToValueAtTime(900, when + dur * 0.4); lp.frequency.linearRampToValueAtTime(350, when + dur);
    const e = this.env(when, 1.2, dur - 1.2 - 2.4, 2.4, level);
    n.connect(lp).connect(e).connect(this._bus);
  }

  /* ---- composite cues mirroring the film's actions ---- */
  /** count action (ease-out): particles at even value steps, so they slow as the number settles */
  count(when: number, dur: number, steps: number, f0: number, f1: number, level: number, pan = 0) {
    for (let j = 1; j <= steps; j++) this.particle(when + dur * inv(eo, (j / steps) * 0.999), f0 * (j % 2 ? 1 : 1.12), level, pan);
  }
}

/* ---- cue sheet: feedwrk-intro-film.html STORY (title 5 s, six 7 s steps, end 6 s = 53 s) ---- */
export function cueSheet(s: FilmSfx) {
  // Title on the River ground (0–5) and the River's return (40–53)
  s.river(0, 5.4, 0.05);
  s.river(39.8, 13.2, 0.045);

  // One breath per scene change, alternating direction like a page turning
  [5, 12, 19, 26, 33, 40, 47].forEach((t, i) => s.breath(t - 0.3, 0.055, i % 2 ? 0.5 : -0.5, i % 2 ? -0.5 : 0.5));

  // Step 1 · line draws 5.6 s for 2.6 s (ease in-out): a stream that rises with the line,
  //          a particle as it passes each of the 7 yearly points
  s.stream(5.6, 2.6, 1200, 3200, ease, 0.05, -0.6, 0.6);
  for (let i = 1; i <= 6; i++) s.particle(5.6 + 2.6 * inv(ease, i / 6), 3500, 0.04, -0.6 + 0.2 * i);

  // Step 2 · +693% counts 12.4 s for 1.6 s (ease-out)
  s.count(12.4, 1.6, 10, 3500, 3500, 0.04);

  // Step 3 · two bars grow 19.4 s and 19.6 s for 1.2 s (ease-out), left to right like the fill
  s.stream(19.4, 1.2, 1000, 2600, eo, 0.045, -0.7, 0.1);
  s.stream(19.6, 1.2, 1000, 2600, eo, 0.045, -0.7, 0.3);

  // Step 4 · 76% counts 26.4 s for 1.6 s
  s.count(26.4, 1.6, 9, 3500, 3500, 0.04);

  // Step 5 · three results count 33.3 / 33.6 / 33.9 s for 1.4 s, each from its own column
  s.count(33.3, 1.4, 6, 3500, 3500, 0.035, -0.5);
  s.count(33.6, 1.4, 6, 3500, 3500, 0.035, 0);
  s.count(33.9, 1.4, 6, 3500, 3500, 0.035, 0.5);

  // Step 6 · Feedwrk: the tangle settles into lines — a long stream that rises and settles (ease in-out)
  s.stream(40.4, 5.5, 700, 1800, ease, 0.035, -0.4, 0.4);

  // End card 47–53: low, soft air that fades with the film
  s.resolve(47.0, 6.0, [], 0.06);
}

/* ---- offline render, called from the page ---- */
export async function render(seconds = 53) {
  const buf = await renderOffline({ seconds, channels: 2, sampleRate: 44100 }, async (ctx) => {
    const sfx = new FilmSfx(ctx);
    sfx.output.connect(ctx.destination);
    cueSheet(sfx);
  });
  const L = buf.getChannelData(0), R = buf.getChannelData(1), pcm = new Int16Array(L.length * 2);
  let peak = 0;
  for (let i = 0; i < L.length; i++) { peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); pcm[2 * i] = Math.max(-1, Math.min(1, L[i])) * 32767; pcm[2 * i + 1] = Math.max(-1, Math.min(1, R[i])) * 32767; }
  const bytes = new Uint8Array(pcm.buffer); let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return { b64: btoa(bin), peak, frames: L.length };
}
(window as any).renderFilmSfx = render;
