type Mode = 'cond' | 'conv' | 'rad' | 'all';
type Regime = 'steady' | 'transient';
interface Material { name: string; k: number; eps: number; alpha: number; rho: number; cp: number }
interface Params {
  mat: Material; Th: number; Tc: number; L: number; D: number; h: number; Tinf: number;
  speedExp: number; exagExp: number; mode: Mode; regime: Regime;
}
type NumKey = 'Th' | 'Tc' | 'L' | 'D' | 'h' | 'Tinf' | 'speedExp' | 'exagExp';
interface SliderDef { key: NumKey; label: string; min: number; max: number; step: number; scale?: number; show: (v: number) => string }
interface Series { xs: ArrayLike<number>; ys: ArrayLike<number>; color: string; dash?: number[]; width?: number }

const SIGMA = 5.670374e-8, T_REF = 20, N = 81;
const C = { bg: '#0D0F12', line: '#262B33', hot: '#FF5500', cold: '#00A3FF', tx: '#F0F2F5', mut: '#8A94A6', grid: '#1b1f26' };
const MONO = '"JetBrains Mono","Fira Code",monospace';

const MATERIALS: Material[] = [
  { name: 'Aço Inox 304', k: 16.2, eps: 0.35, alpha: 17.3e-6, rho: 8000, cp: 500 },
  { name: 'Alumínio 6061', k: 167, eps: 0.1, alpha: 23.6e-6, rho: 2700, cp: 896 },
  { name: 'Cobre', k: 401, eps: 0.05, alpha: 16.5e-6, rho: 8960, cp: 385 },
  { name: 'Vidro Borossilicato', k: 1.14, eps: 0.9, alpha: 3.3e-6, rho: 2230, cp: 830 },
  { name: 'Concreto', k: 1.4, eps: 0.9, alpha: 10e-6, rho: 2300, cp: 880 },
];
const P: Params = {
  mat: { ...MATERIALS[1] }, Th: 300, Tc: 25, L: 0.5, D: 0.02, h: 25, Tinf: 20,
  speedExp: 3, exagExp: 3, mode: 'all', regime: 'steady',
};
const SLIDERS: SliderDef[] = [
  { key: 'Th', label: 'T quente (x = 0)', min: 20, max: 600, step: 1, show: v => `${v.toFixed(0)} °C` },
  { key: 'Tc', label: 'T fria (x = L)', min: -20, max: 300, step: 1, show: v => `${v.toFixed(0)} °C` },
  { key: 'L', label: 'Comprimento', min: 0.1, max: 2, step: 0.01, show: v => `${v.toFixed(2)} m` },
  { key: 'D', label: 'Diâmetro', min: 5, max: 50, step: 1, scale: 1e-3, show: v => `${v.toFixed(0)} mm` },
  { key: 'h', label: 'Coef. convecção h', min: 2, max: 200, step: 1, show: v => `${v.toFixed(0)} W/m²K` },
  { key: 'Tinf', label: 'T ambiente T∞', min: -20, max: 60, step: 1, show: v => `${v.toFixed(0)} °C` },
  { key: 'speedExp', label: 'Velocidade (transiente)', min: 0, max: 5, step: 0.1, show: v => `×${Math.round(10 ** v)}` },
  { key: 'exagExp', label: 'Exagero de ΔL', min: 1, max: 5, step: 0.1, show: v => `×${Math.round(10 ** v)}` },
];
const EQ: Record<Mode, string> = {
  cond: "q″ = −k · dT/dx  (Fourier, sem perdas laterais)",
  conv: "q″ = h · (T − T∞)  (Newton, perda lateral)",
  rad: "q″ = ε σ · (T⁴ − T∞⁴)  (Stefan–Boltzmann, perda lateral)",
  all: "q″ = q″cond + q″conv + q″rad  (balanço combinado)",
};

// ---------- Presets: exemplos prontos para a apresentação ----------
// mat = índice em MATERIALS (0 Aço, 1 Alumínio, 2 Cobre, 3 Vidro, 4 Concreto) · D em metros · speedExp e exagExp = log10 do fator
interface Preset { label: string; mat: number; mode: Mode; regime: Regime; Th: number; Tc: number; L: number; D: number; h: number; Tinf: number; speedExp: number; exagExp: number }
const PRESETS: Preset[] = [
  { label: '1 · Cobre (condução)',   mat: 2, mode: 'cond', regime: 'steady',    Th: 200, Tc: 20,  L: 1,   D: 0.02, h: 25,  Tinf: 20, speedExp: 3, exagExp: 2 },
  { label: '2 · Alumínio (convecção)',  mat: 1, mode: 'conv', regime: 'steady',    Th: 100, Tc: 20,  L: 0.5, D: 0.01, h: 25,  Tinf: 20, speedExp: 3, exagExp: 2.5 },
  { label: '3 · Aço Inox (radiação)',   mat: 0, mode: 'rad',  regime: 'steady',    Th: 600, Tc: 300, L: 0.3, D: 0.03, h: 5,   Tinf: 20, speedExp: 3, exagExp: 1.7 },
];

const $ = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
const opt = (id: string) => document.getElementById(id); // elemento opcional: pode não existir no HTML
const setText = (id: string, s: string) => { const el = opt(id); if (el) el.textContent = s; };
const hideEl = (el: Element | null | undefined, on: boolean) => { if (!el) return; const e = el as HTMLElement; e.hidden = on; e.style.display = on ? 'none' : ''; };
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const fmt = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2));
const useConv = () => P.mode === 'conv' || P.mode === 'all';
const useRad = () => P.mode === 'rad' || P.mode === 'all';
const hRad = (T: number) => { const a = T + 273.15, b = P.Tinf + 273.15; return P.mat.eps * SIGMA * (a * a + b * b) * (a + b); };

// ---------- Solver: 1D, diferenças finitas, Euler implícito (incondicionalmente estável) ----------
const sa = new Float64Array(N), sb = new Float64Array(N), sc = new Float64Array(N), sd = new Float64Array(N), sx = new Float64Array(N);
function solve(Told: Float64Array | null, dt: number, guess: Float64Array): Float64Array {
  const dx = P.L / (N - 1), kdx = P.mat.k / (dx * dx), a0 = Told ? (P.mat.rho * P.mat.cp) / dt : 0, m = 4 / P.D;
  const Tg = Float64Array.from(guess);
  for (let it = 0; it < (useRad() ? 8 : 1); it++) {
    for (let i = 0; i < N; i++) {
      if (i === 0 || i === N - 1) { sa[i] = 0; sc[i] = 0; sb[i] = 1; sd[i] = i === 0 ? P.Th : P.Tc; continue; }
      const hT = m * ((useConv() ? P.h : 0) + (useRad() ? hRad(Tg[i]) : 0));
      sa[i] = -kdx; sc[i] = -kdx; sb[i] = a0 + 2 * kdx + hT; sd[i] = (Told ? a0 * Told[i] : 0) + hT * P.Tinf;
    }
    for (let i = 1; i < N; i++) { const w = sa[i] / sb[i - 1]; sb[i] -= w * sc[i - 1]; sd[i] -= w * sd[i - 1]; }
    sx[N - 1] = sd[N - 1] / sb[N - 1];
    for (let i = N - 2; i >= 0; i--) sx[i] = (sd[i] - sc[i] * sx[i + 1]) / sb[i];
    Tg.set(sx);
  }
  return Tg;
}

// ---------- Estado ----------
let T: Float64Array = new Float64Array(N).fill(P.Tinf), simTime = 0, playing = true;
const resetT = () => { T.fill(P.Tinf); simTime = 0; };

// ---------- Canvas helpers ----------
function fit(cv: HTMLCanvasElement) {
  const r = cv.getBoundingClientRect(), d = window.devicePixelRatio || 1;
  const w = Math.round(r.width * d), h = Math.round(r.height * d);
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  const g = cv.getContext('2d')!;
  g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, r.width, r.height);
  return { g, w: r.width, h: r.height };
}
const STOPS: [number, number, number][] = [[0, 163, 255], [138, 148, 166], [255, 85, 0]];
function heat(t: number): string {
  const u = clamp(t, 0, 1) * 2, i = Math.min(1, Math.floor(u)), f = u - i;
  const c = STOPS[i].map((v, k) => Math.round(v + (STOPS[i + 1][k] - v) * f));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function chart(cv: HTMLCanvasElement, xr: [number, number], yr: [number, number], xl: string, yl: string,
  series: Series[], marker?: { x: number; y: number }, tags?: { x: number; y: number; t: string; c: string }[]) {
  const { g, w, h } = fit(cv);
  const ml = 54, mr = 16, mt = 22, mb = 32, pw = w - ml - mr, ph = h - mt - mb;
  const X = (v: number) => ml + ((v - xr[0]) / (xr[1] - xr[0] || 1)) * pw;
  const Y = (v: number) => mt + ph - ((v - yr[0]) / (yr[1] - yr[0] || 1)) * ph;
  g.font = `10px ${MONO}`; g.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const vx = xr[0] + ((xr[1] - xr[0]) * i) / 5, vy = yr[0] + ((yr[1] - yr[0]) * i) / 5;
    g.strokeStyle = C.grid; g.beginPath();
    g.moveTo(X(vx), mt); g.lineTo(X(vx), mt + ph); g.moveTo(ml, Y(vy)); g.lineTo(ml + pw, Y(vy)); g.stroke();
    g.fillStyle = C.mut; g.textAlign = 'center'; g.fillText(fmt(vx), X(vx), mt + ph + 14);
    g.textAlign = 'right'; g.fillText(fmt(vy), ml - 6, Y(vy) + 3);
  }
  g.strokeStyle = C.line; g.strokeRect(ml, mt, pw, ph);
  g.fillStyle = C.mut; g.textAlign = 'center'; g.fillText(xl, ml + pw / 2, h - 4);
  g.textAlign = 'left'; g.fillText(yl, ml, 12);
  for (const s of series) {
    g.strokeStyle = s.color; g.lineWidth = s.width ?? 1.5; g.setLineDash(s.dash ?? []); g.beginPath();
    for (let i = 0; i < s.xs.length; i++) (i ? g.lineTo : g.moveTo).call(g, X(s.xs[i]), Y(s.ys[i]));
    g.stroke();
  }
  g.setLineDash([]);
  for (const t of tags ?? []) { g.fillStyle = t.c; g.textAlign = 'right'; g.fillText(t.t, X(t.x) - 4, Y(t.y) - 4); }
  if (marker) { g.fillStyle = C.hot; g.beginPath(); g.arc(X(marker.x), Y(marker.y), 4, 0, 7); g.fill(); }
}

// ---------- Barra esquemática ----------
function drawBar(prof: Float64Array, dL: number, lo: number, hi: number) {
  const { g, w, h } = fit($<HTMLCanvasElement>('bar'));
  g.strokeStyle = C.grid; g.lineWidth = 1; g.beginPath();
  for (let x = 0; x < w; x += 24) { g.moveTo(x, 0); g.lineTo(x, h); }
  for (let y = 0; y < h; y += 24) { g.moveTo(0, y); g.lineTo(w, y); }
  g.stroke();
  const mx = 56, usable = w - 2 * mx, Lpx = usable * 0.78, maxExt = usable - Lpx, th = 52, y0 = h / 2 - th / 2 - 14;
  const rel = dL / P.L, want = rel * Lpx * 10 ** P.exagExp, ext = clamp(want, -maxExt, maxExt);
  const eff = rel ? ext / (rel * Lpx) : 10 ** P.exagExp;
  const x1 = mx + Lpx + ext, sw = (Lpx + ext) / (N - 1);
  for (let i = 0; i < N - 1; i++) {
    g.fillStyle = heat(((prof[i] + prof[i + 1]) / 2 - lo) / (hi - lo || 1));
    g.fillRect(mx + i * sw, y0, sw + 0.8, th);
  }
  g.strokeStyle = '#3a414c'; g.strokeRect(mx, y0, Lpx + ext, th);
  g.fillStyle = C.line; g.fillRect(mx - 10, y0 - 8, 10, th + 16); g.fillRect(x1, y0 - 8, 10, th + 16);
  g.setLineDash([4, 3]); g.strokeStyle = C.mut; g.strokeRect(mx, y0, Lpx, th); g.setLineDash([]);
  g.font = `11px ${MONO}`; g.textAlign = 'left'; g.fillStyle = C.hot; g.fillText(`T_H ${P.Th.toFixed(0)} °C`, mx, y0 - 16);
  g.textAlign = 'right'; g.fillStyle = C.cold; g.fillText(`T_C ${P.Tc.toFixed(0)} °C`, x1, y0 - 16);
  const xa = mx + Lpx, yd = y0 + th + 30;
  g.strokeStyle = C.tx; g.beginPath();
  g.moveTo(xa, y0 + th + 4); g.lineTo(xa, yd + 6); g.moveTo(x1, y0 + th + 4); g.lineTo(x1, yd + 6);
  g.moveTo(xa, yd); g.lineTo(x1, yd);
  if (Math.abs(ext) > 8) { const s = Math.sign(ext) * 6; g.moveTo(xa, yd); g.lineTo(xa + s, yd - 3); g.moveTo(xa, yd); g.lineTo(xa + s, yd + 3); g.moveTo(x1, yd); g.lineTo(x1 - s, yd - 3); g.moveTo(x1, yd); g.lineTo(x1 - s, yd + 3); }
  g.stroke();
  g.fillStyle = C.tx; g.textAlign = 'center';
  g.fillText(`ΔL = ${(dL * 1e6).toFixed(2)} µm (real)  ·  desenhado ×${eff.toFixed(0)}`, clamp((xa + x1) / 2, 150, w - 150), yd + 24);
  const gx = mx, gy = h - 22;
  for (let i = 0; i < 120; i++) { g.fillStyle = heat(i / 119); g.fillRect(gx + i, gy, 1.5, 6); }
  g.fillStyle = C.mut; g.textAlign = 'right'; g.fillText(`${fmt(lo)} °C`, gx - 6, gy + 7);
  g.textAlign = 'left'; g.fillText(`${fmt(hi)} °C`, gx + 128, gy + 7);
}

// ---------- Leituras ----------
function readouts(dL: number, mean: number) {
  setText('r_dl', `${(dL * 1e6).toFixed(2)} µm`);
  setText('r_tm', `${mean.toFixed(1)} °C`);
  setText('r_t', P.regime === 'steady' ? 'estacionário' : simTime < 3600 ? `${simTime.toFixed(0)} s` : `${(simTime / 3600).toFixed(2)} h`);
  setText('r_hr', `${hRad(mean).toFixed(1)} W/m²K`);
}

// ---------- Cálculo passo a passo ----------
const CALC_DEF: [string, string, string][] = [
  ['cond', 'Condução · Fourier', 'O calor atravessa a barra do quente para o frio, proporcional ao gradiente de temperatura. É a única parcela sem perda lateral. O gradiente é medido no primeiro intervalo da malha.'],
  ['conv', 'Convecção · Newton', 'O ar leva calor da superfície lateral, proporcional à diferença entre a temperatura da barra e a do ambiente. Usa a T média da barra.'],
  ['rad', 'Radiação · Stefan–Boltzmann', 'A superfície emite calor proporcional a T⁴ (em kelvin). Linearizando, vira um h_r equivalente, comparável ao h da convecção. Usa a T média da barra; como a radiação não é linear em T, o valor ponto a ponto pode diferir um pouco.'],
  ['dil', 'Dilatação térmica', 'A barra cresce proporcional ao α, ao comprimento e ao quanto a T média passou da referência de 20 °C. A deformação ε é a razão ΔL/L.'],
];
function calc(prof: Float64Array, dL: number, mean: number) {
  const dx = P.L / (N - 1), { k, eps, alpha } = P.mat, A = (Math.PI * P.D ** 2) / 4, S = Math.PI * P.D * P.L;
  const tk = mean + 273.15, ik = P.Tinf + 273.15, g = (prof[1] - prof[0]) / dx, qd = -k * g;
  const qv = P.h * (mean - P.Tinf), qr = eps * SIGMA * (tk ** 4 - ik ** 4), dT = mean - T_REF;
  const set = (id: string, lines: string[]) => { $(`calc_${id}_t`).textContent = lines.join('\n'); };
  set('cond', [
    `dT/dx ≈ (T₁ − T₀)/Δx = (${prof[1].toFixed(2)} − ${prof[0].toFixed(2)}) / ${dx.toFixed(4)} = ${g.toFixed(1)} K/m`,
    `q″ = −k · dT/dx = −${k} × (${g.toFixed(1)}) = ${qd.toFixed(1)} W/m²`,
    `Q = q″ · A = ${qd.toFixed(1)} × ${A.toExponential(2)} m² = ${(qd * A).toFixed(3)} W`,
  ]);
  set('conv', [
    `q″ = h · (T̄ − T∞) = ${P.h} × (${mean.toFixed(1)} − ${P.Tinf.toFixed(1)}) = ${qv.toFixed(1)} W/m²`,
    `Q = q″ · S = ${qv.toFixed(1)} × ${S.toFixed(4)} m² = ${(qv * S).toFixed(2)} W   (S = π·D·L)`,
  ]);
  set('rad', [
    `T̄ = ${tk.toFixed(1)} K · T∞ = ${ik.toFixed(1)} K`,
    `q″ = ε · σ · (T̄⁴ − T∞⁴) = ${eps} × 5.67e-8 × (${(tk ** 4).toExponential(2)} − ${(ik ** 4).toExponential(2)}) = ${qr.toFixed(1)} W/m²`,
    `h_r = ε · σ · (T̄² + T∞²)(T̄ + T∞) = ${hRad(mean).toFixed(2)} W/m²K  →  q″ = h_r · (T̄ − T∞)`,
    `Q = q″ · S = ${qr.toFixed(1)} × ${S.toFixed(4)} m² = ${(qr * S).toFixed(2)} W`,
  ]);
  set('dil', [
    `ΔT = T̄ − T_ref = ${mean.toFixed(1)} − ${T_REF} = ${dT.toFixed(1)} K`,
    `ΔL = α · L · ΔT = ${(alpha * 1e6).toFixed(2)}e-6 × ${P.L.toFixed(2)} × ${dT.toFixed(1)} = ${(dL * 1e6).toFixed(2)} µm`,
    `ε = ΔL / L = ${(dL / P.L).toExponential(2)}`,
  ]);
}

// ---------- Loop ----------
let last = performance.now();
function step(now: number) {
  const dt = Math.min((now - last) / 1000, 0.05); last = now;
  const lin = Float64Array.from({ length: N }, (_, i) => P.Th + ((P.Tc - P.Th) * i) / (N - 1));
  const steady = solve(null, 0, lin);
  let prof = steady;
  if (P.regime === 'transient') {
    if (playing) { const ds = 10 ** P.speedExp * dt; simTime += ds; for (let s = 0; s < 4; s++) T = solve(T, ds / 4, T); }
    prof = T;
  }
  const dx = P.L / (N - 1);
  let mean = 0;
  for (let i = 0; i < N; i++) mean += prof[i] * (i === 0 || i === N - 1 ? 0.5 : 1);
  mean /= N - 1;
  const dL = P.mat.alpha * (mean - T_REF) * P.L;
  const bounds = [P.Th, P.Tc, P.Tinf], pad = (Math.max(...bounds) - Math.min(...bounds)) * 0.06 + 1;
  const lo = Math.min(...bounds), hi = Math.max(...bounds);
  drawBar(prof, dL, lo, hi);
  readouts(dL, mean);
  calc(prof, dL, mean);
  const xs = Float64Array.from({ length: N }, (_, i) => i * dx);
  const ser: Series[] = [{ xs, ys: prof, color: C.hot, width: 2 }];
  if (P.regime === 'transient') ser.unshift({ xs, ys: steady, color: C.mut, dash: [4, 3] });
  chart($<HTMLCanvasElement>('c1'), [0, P.L], [lo - pad, hi + pad], 'x [m]', 'T [°C]', ser);
  const dTs = [0, P.Th - T_REF, P.Tc - T_REF, P.Tinf - T_REF, mean - T_REF], xr: [number, number] = [Math.min(...dTs), Math.max(...dTs, 1)];
  const lines: Series[] = MATERIALS.map(m => ({ xs: xr, ys: xr.map(d => m.alpha * P.L * d * 1e6), color: '#3a414c', width: 1 }));
  lines.push({ xs: xr, ys: xr.map(d => P.mat.alpha * P.L * d * 1e6), color: C.hot, width: 2 });
  const tags = MATERIALS.map(m => ({ x: xr[1], y: m.alpha * P.L * xr[1] * 1e6, t: m.name.split(' ')[0], c: C.mut }));
  const ymax = Math.max(...MATERIALS.map(m => m.alpha)) * P.L * xr[1] * 1e6, ymin = Math.min(0, Math.max(...MATERIALS.map(m => m.alpha)) * P.L * xr[0] * 1e6);
  chart($<HTMLCanvasElement>('c2'), xr, [ymin, ymax * 1.05], 'ΔT = T − 20 °C', 'ΔL [µm]', lines, { x: mean - T_REF, y: dL * 1e6 }, tags);
}
let warned = false;
function frame(now: number) {
  try { step(now); } catch (e) { if (!warned) { warned = true; console.error('ThermoLab:', e); } }
  requestAnimationFrame(frame);
}

// ---------- UI ----------
function syncMat() {
  const m = P.mat;
  $<HTMLInputElement>('k').value = String(m.k); $<HTMLInputElement>('eps').value = String(m.eps);
  $<HTMLInputElement>('alpha').value = String(+(m.alpha * 1e6).toFixed(2));
  $<HTMLInputElement>('rho').value = String(m.rho); $<HTMLInputElement>('cp').value = String(m.cp);
}
function syncMode() {
  document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === P.mode));
  document.querySelectorAll<HTMLButtonElement>('[data-regime]').forEach(b => b.classList.toggle('on', b.dataset.regime === P.regime));
  $('eq').textContent = EQ[P.mode];
  $('row_h').style.opacity = useConv() ? '1' : '0.35';
  hideEl(opt('r_hr')?.parentElement, !useRad()); // card «h radiação»
  const on: Record<string, boolean> = { cond: true, conv: useConv(), rad: useRad(), dil: true };
  for (const id in on) $('calc_' + id).hidden = !on[id];
  document.querySelectorAll<HTMLElement>('.tr').forEach(e => (e.hidden = P.regime !== 'transient'));
}
function syncSliders() {
  for (const s of SLIDERS) {
    const v = P[s.key] / (s.scale ?? 1);
    $<HTMLInputElement>('s_' + s.key).value = String(v);
    $('v_' + s.key).textContent = s.show(v);
  }
}
function applyPreset(p: Preset) {
  P.mat = { ...MATERIALS[p.mat] };
  Object.assign(P, { mode: p.mode, regime: p.regime, Th: p.Th, Tc: p.Tc, L: p.L, D: p.D, h: p.h, Tinf: p.Tinf, speedExp: p.speedExp, exagExp: p.exagExp });
  $<HTMLSelectElement>('mat').value = String(p.mat);
  playing = true; setText('play', 'Pausar');
  resetT(); syncMat(); syncSliders(); syncMode();
}
// Extras: nada aqui pode impedir o simulador de funcionar (roda depois do núcleo e dentro de try/catch)
function initExtras() {
  let box = opt('presets');
  if (!box) { // HTML sem o bloco «Exemplos»: cria antes do grupo de botões de fenômeno
    const grid = document.querySelector('[data-mode]')?.parentElement;
    if (grid?.parentElement) {
      const h = document.createElement('h3'); h.textContent = 'Exemplos';
      box = document.createElement('div'); box.id = 'presets'; box.className = 'button-grid';
      const ref = grid.previousElementSibling?.tagName === 'H3' ? grid.previousElementSibling : grid;
      grid.parentElement.insertBefore(h, ref); grid.parentElement.insertBefore(box, ref);
    }
  }
  if (box) {
    box.innerHTML = PRESETS.map((p, i) => `<button type="button" data-preset="${i}">${p.label}</button>`).join('');
    box.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach(b => b.addEventListener('click', () => applyPreset(PRESETS[+b.dataset.preset!])));
  }
  // painel de fluxos e Biot saíram do app: se ainda existirem no HTML, ficam escondidos
  hideEl(opt('fluxes')?.closest('section') ?? opt('fluxes'), true);
  hideEl(opt('r_bi')?.parentElement, true);
}
function init() {
  $('sliders').innerHTML = SLIDERS.map(s => `<label class="row${s.key === 'speedExp' ? ' tr' : ''}" id="row_${s.key}"><span class="lbl">${s.label}<b id="v_${s.key}"></b></span>
    <input type="range" id="s_${s.key}" min="${s.min}" max="${s.max}" step="${s.step}"></label>`).join('');
  $('row_h').id = 'row_h';
  for (const s of SLIDERS) {
    const el = $<HTMLInputElement>('s_' + s.key), sc = s.scale ?? 1;
    el.value = String(P[s.key] / sc);
    const upd = () => { P[s.key] = parseFloat(el.value) * sc; $('v_' + s.key).textContent = s.show(parseFloat(el.value)); };
    el.addEventListener('input', upd); upd();
  }
  const sel = $<HTMLSelectElement>('mat');
  sel.innerHTML = MATERIALS.map((m, i) => `<option value="${i}"${i === 1 ? ' selected' : ''}>${m.name}</option>`).join('');
  sel.addEventListener('change', () => { P.mat = { ...MATERIALS[+sel.value] }; syncMat(); });
  (['k', 'eps', 'alpha', 'rho', 'cp'] as const).forEach(id => $<HTMLInputElement>(id).addEventListener('input', e => {
    const v = parseFloat((e.target as HTMLInputElement).value);
    if (v > 0) P.mat[id] = id === 'alpha' ? v * 1e-6 : v;
  }));
  document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b => b.addEventListener('click', () => { P.mode = b.dataset.mode as Mode; syncMode(); }));
  document.querySelectorAll<HTMLButtonElement>('[data-regime]').forEach(b => b.addEventListener('click', () => {
    P.regime = b.dataset.regime as Regime; if (P.regime === 'transient') resetT(); syncMode();
  }));
  $('play').addEventListener('click', () => { playing = !playing; $('play').textContent = playing ? 'Pausar' : 'Retomar'; });
  $('reset').addEventListener('click', resetT);
  $('calc').innerHTML = CALC_DEF.map(([id, t, d]) => `<section id="calc_${id}"><h3>${t}</h3><p>${d}</p><pre id="calc_${id}_t"></pre></section>`).join('');
  syncMat(); syncMode(); requestAnimationFrame(frame);
  try { initExtras(); } catch (e) { console.error('ThermoLab (extras):', e); }
}
init();
