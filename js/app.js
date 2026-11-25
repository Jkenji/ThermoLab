(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };

  // src/app.ts
  var require_app = __commonJS({
    "src/app.ts"() {
      var SIGMA = 5670374e-14;
      var T_REF = 20;
      var N = 81;
      var C = { bg: "#0D0F12", line: "#262B33", hot: "#FF5500", cold: "#00A3FF", tx: "#F0F2F5", mut: "#8A94A6", grid: "#1b1f26" };
      var MONO = '"JetBrains Mono","Fira Code",monospace';
      var MATERIALS = [
        { name: "A\xE7o Inox 304", k: 16.2, eps: 0.35, alpha: 173e-7, rho: 8e3, cp: 500 },
        { name: "Alum\xEDnio 6061", k: 167, eps: 0.1, alpha: 236e-7, rho: 2700, cp: 896 },
        { name: "Cobre", k: 401, eps: 0.05, alpha: 165e-7, rho: 8960, cp: 385 },
        { name: "Vidro Borossilicato", k: 1.14, eps: 0.9, alpha: 33e-7, rho: 2230, cp: 830 },
        { name: "Concreto", k: 1.4, eps: 0.9, alpha: 1e-5, rho: 2300, cp: 880 }
      ];
      var P = {
        mat: { ...MATERIALS[1] },
        Th: 300,
        Tc: 25,
        L: 0.5,
        D: 0.02,
        h: 25,
        Tinf: 20,
        speedExp: 3,
        exagExp: 3,
        mode: "all",
        regime: "steady"
      };
      var SLIDERS = [
        { key: "Th", label: "T quente (x = 0)", min: 20, max: 600, step: 1, show: (v) => `${v.toFixed(0)} \xB0C` },
        { key: "Tc", label: "T fria (x = L)", min: -20, max: 300, step: 1, show: (v) => `${v.toFixed(0)} \xB0C` },
        { key: "L", label: "Comprimento", min: 0.1, max: 2, step: 0.01, show: (v) => `${v.toFixed(2)} m` },
        { key: "D", label: "Di\xE2metro", min: 5, max: 50, step: 1, scale: 1e-3, show: (v) => `${v.toFixed(0)} mm` },
        { key: "h", label: "Coef. convec\xE7\xE3o h", min: 2, max: 200, step: 1, show: (v) => `${v.toFixed(0)} W/m\xB2K` },
        { key: "Tinf", label: "T ambiente T\u221E", min: -20, max: 60, step: 1, show: (v) => `${v.toFixed(0)} \xB0C` },
        { key: "speedExp", label: "Velocidade (transiente)", min: 0, max: 5, step: 0.1, show: (v) => `\xD7${Math.round(10 ** v)}` },
        { key: "exagExp", label: "Exagero de \u0394L", min: 1, max: 5, step: 0.1, show: (v) => `\xD7${Math.round(10 ** v)}` }
      ];
      var EQ = {
        cond: "q\u2033 = \u2212k \xB7 dT/dx  (Fourier, sem perdas laterais)",
        conv: "q\u2033 = h \xB7 (T \u2212 T\u221E)  (Newton, perda lateral)",
        rad: "q\u2033 = \u03B5 \u03C3 \xB7 (T\u2074 \u2212 T\u221E\u2074)  (Stefan\u2013Boltzmann, perda lateral)",
        all: "q\u2033 = q\u2033cond + q\u2033conv + q\u2033rad  (balan\xE7o combinado)"
      };
      var PRESETS = [
        { label: "1 \xB7 Cobre (condu\xE7\xE3o)", mat: 2, mode: "cond", regime: "steady", Th: 200, Tc: 20, L: 1, D: 0.02, h: 25, Tinf: 20, speedExp: 3, exagExp: 2 },
        { label: "2 \xB7 Alum\xEDnio (convec\xE7\xE3o)", mat: 1, mode: "conv", regime: "steady", Th: 100, Tc: 20, L: 0.5, D: 0.01, h: 25, Tinf: 20, speedExp: 3, exagExp: 2.5 },
        { label: "3 \xB7 A\xE7o Inox (radia\xE7\xE3o)", mat: 0, mode: "rad", regime: "steady", Th: 600, Tc: 300, L: 0.3, D: 0.03, h: 5, Tinf: 20, speedExp: 3, exagExp: 1.7 }
      ];
      var $ = (id) => document.getElementById(id);
      var opt = (id) => document.getElementById(id);
      var setText = (id, s) => {
        const el = opt(id);
        if (el) el.textContent = s;
      };
      var hideEl = (el, on) => {
        if (!el) return;
        const e = el;
        e.hidden = on;
        e.style.display = on ? "none" : "";
      };
      var clamp = (v, a, b) => Math.min(b, Math.max(a, v));
      var fmt = (v) => Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2);
      var useConv = () => P.mode === "conv" || P.mode === "all";
      var useRad = () => P.mode === "rad" || P.mode === "all";
      var hRad = (T2) => {
        const a = T2 + 273.15, b = P.Tinf + 273.15;
        return P.mat.eps * SIGMA * (a * a + b * b) * (a + b);
      };
      var sa = new Float64Array(N);
      var sb = new Float64Array(N);
      var sc = new Float64Array(N);
      var sd = new Float64Array(N);
      var sx = new Float64Array(N);
      function solve(Told, dt, guess) {
        const dx = P.L / (N - 1), kdx = P.mat.k / (dx * dx), a0 = Told ? P.mat.rho * P.mat.cp / dt : 0, m = 4 / P.D;
        const Tg = Float64Array.from(guess);
        for (let it = 0; it < (useRad() ? 8 : 1); it++) {
          for (let i = 0; i < N; i++) {
            if (i === 0 || i === N - 1) {
              sa[i] = 0;
              sc[i] = 0;
              sb[i] = 1;
              sd[i] = i === 0 ? P.Th : P.Tc;
              continue;
            }
            const hT = m * ((useConv() ? P.h : 0) + (useRad() ? hRad(Tg[i]) : 0));
            sa[i] = -kdx;
            sc[i] = -kdx;
            sb[i] = a0 + 2 * kdx + hT;
            sd[i] = (Told ? a0 * Told[i] : 0) + hT * P.Tinf;
          }
          for (let i = 1; i < N; i++) {
            const w = sa[i] / sb[i - 1];
            sb[i] -= w * sc[i - 1];
            sd[i] -= w * sd[i - 1];
          }
          sx[N - 1] = sd[N - 1] / sb[N - 1];
          for (let i = N - 2; i >= 0; i--) sx[i] = (sd[i] - sc[i] * sx[i + 1]) / sb[i];
          Tg.set(sx);
        }
        return Tg;
      }
      var T = new Float64Array(N).fill(P.Tinf);
      var simTime = 0;
      var playing = true;
      var resetT = () => {
        T.fill(P.Tinf);
        simTime = 0;
      };
      function fit(cv) {
        const r = cv.getBoundingClientRect(), d = window.devicePixelRatio || 1;
        const w = Math.round(r.width * d), h = Math.round(r.height * d);
        if (cv.width !== w || cv.height !== h) {
          cv.width = w;
          cv.height = h;
        }
        const g = cv.getContext("2d");
        g.setTransform(d, 0, 0, d, 0, 0);
        g.clearRect(0, 0, r.width, r.height);
        return { g, w: r.width, h: r.height };
      }
      var STOPS = [[0, 163, 255], [138, 148, 166], [255, 85, 0]];
      function heat(t) {
        const u = clamp(t, 0, 1) * 2, i = Math.min(1, Math.floor(u)), f = u - i;
        const c = STOPS[i].map((v, k) => Math.round(v + (STOPS[i + 1][k] - v) * f));
        return `rgb(${c[0]},${c[1]},${c[2]})`;
      }
      function chart(cv, xr, yr, xl, yl, series, marker, tags) {
        const { g, w, h } = fit(cv);
        const ml = 54, mr = 16, mt = 22, mb = 32, pw = w - ml - mr, ph = h - mt - mb;
        const X = (v) => ml + (v - xr[0]) / (xr[1] - xr[0] || 1) * pw;
        const Y = (v) => mt + ph - (v - yr[0]) / (yr[1] - yr[0] || 1) * ph;
        g.font = `10px ${MONO}`;
        g.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
          const vx = xr[0] + (xr[1] - xr[0]) * i / 5, vy = yr[0] + (yr[1] - yr[0]) * i / 5;
          g.strokeStyle = C.grid;
          g.beginPath();
          g.moveTo(X(vx), mt);
          g.lineTo(X(vx), mt + ph);
          g.moveTo(ml, Y(vy));
          g.lineTo(ml + pw, Y(vy));
          g.stroke();
          g.fillStyle = C.mut;
          g.textAlign = "center";
          g.fillText(fmt(vx), X(vx), mt + ph + 14);
          g.textAlign = "right";
          g.fillText(fmt(vy), ml - 6, Y(vy) + 3);
        }
        g.strokeStyle = C.line;
        g.strokeRect(ml, mt, pw, ph);
        g.fillStyle = C.mut;
        g.textAlign = "center";
        g.fillText(xl, ml + pw / 2, h - 4);
        g.textAlign = "left";
        g.fillText(yl, ml, 12);
        for (const s of series) {
          g.strokeStyle = s.color;
          g.lineWidth = s.width ?? 1.5;
          g.setLineDash(s.dash ?? []);
          g.beginPath();
          for (let i = 0; i < s.xs.length; i++) (i ? g.lineTo : g.moveTo).call(g, X(s.xs[i]), Y(s.ys[i]));
          g.stroke();
        }
        g.setLineDash([]);
        for (const t of tags ?? []) {
          g.fillStyle = t.c;
          g.textAlign = "right";
          g.fillText(t.t, X(t.x) - 4, Y(t.y) - 4);
        }
        if (marker) {
          g.fillStyle = C.hot;
          g.beginPath();
          g.arc(X(marker.x), Y(marker.y), 4, 0, 7);
          g.fill();
        }
      }
      function drawBar(prof, dL, lo, hi) {
        const { g, w, h } = fit($("bar"));
        g.strokeStyle = C.grid;
        g.lineWidth = 1;
        g.beginPath();
        for (let x = 0; x < w; x += 24) {
          g.moveTo(x, 0);
          g.lineTo(x, h);
        }
        for (let y = 0; y < h; y += 24) {
          g.moveTo(0, y);
          g.lineTo(w, y);
        }
        g.stroke();
        const mx = 56, usable = w - 2 * mx, Lpx = usable * 0.78, maxExt = usable - Lpx, th = 52, y0 = h / 2 - th / 2 - 14;
        const rel = dL / P.L, want = rel * Lpx * 10 ** P.exagExp, ext = clamp(want, -maxExt, maxExt);
        const eff = rel ? ext / (rel * Lpx) : 10 ** P.exagExp;
        const x1 = mx + Lpx + ext, sw = (Lpx + ext) / (N - 1);
        for (let i = 0; i < N - 1; i++) {
          g.fillStyle = heat(((prof[i] + prof[i + 1]) / 2 - lo) / (hi - lo || 1));
          g.fillRect(mx + i * sw, y0, sw + 0.8, th);
        }
        g.strokeStyle = "#3a414c";
        g.strokeRect(mx, y0, Lpx + ext, th);
        g.fillStyle = C.line;
        g.fillRect(mx - 10, y0 - 8, 10, th + 16);
        g.fillRect(x1, y0 - 8, 10, th + 16);
        g.setLineDash([4, 3]);
        g.strokeStyle = C.mut;
        g.strokeRect(mx, y0, Lpx, th);
        g.setLineDash([]);
        g.font = `11px ${MONO}`;
        g.textAlign = "left";
        g.fillStyle = C.hot;
        g.fillText(`T_H ${P.Th.toFixed(0)} \xB0C`, mx, y0 - 16);
        g.textAlign = "right";
        g.fillStyle = C.cold;
        g.fillText(`T_C ${P.Tc.toFixed(0)} \xB0C`, x1, y0 - 16);
        const xa = mx + Lpx, yd = y0 + th + 30;
        g.strokeStyle = C.tx;
        g.beginPath();
        g.moveTo(xa, y0 + th + 4);
        g.lineTo(xa, yd + 6);
        g.moveTo(x1, y0 + th + 4);
        g.lineTo(x1, yd + 6);
        g.moveTo(xa, yd);
        g.lineTo(x1, yd);
        if (Math.abs(ext) > 8) {
          const s = Math.sign(ext) * 6;
          g.moveTo(xa, yd);
          g.lineTo(xa + s, yd - 3);
          g.moveTo(xa, yd);
          g.lineTo(xa + s, yd + 3);
          g.moveTo(x1, yd);
          g.lineTo(x1 - s, yd - 3);
          g.moveTo(x1, yd);
          g.lineTo(x1 - s, yd + 3);
        }
        g.stroke();
        g.fillStyle = C.tx;
        g.textAlign = "center";
        g.fillText(`\u0394L = ${(dL * 1e6).toFixed(2)} \xB5m (real)  \xB7  desenhado \xD7${eff.toFixed(0)}`, clamp((xa + x1) / 2, 150, w - 150), yd + 24);
        const gx = mx, gy = h - 22;
        for (let i = 0; i < 120; i++) {
          g.fillStyle = heat(i / 119);
          g.fillRect(gx + i, gy, 1.5, 6);
        }
        g.fillStyle = C.mut;
        g.textAlign = "right";
        g.fillText(`${fmt(lo)} \xB0C`, gx - 6, gy + 7);
        g.textAlign = "left";
        g.fillText(`${fmt(hi)} \xB0C`, gx + 128, gy + 7);
      }
      function readouts(dL, mean) {
        setText("r_dl", `${(dL * 1e6).toFixed(2)} \xB5m`);
        setText("r_tm", `${mean.toFixed(1)} \xB0C`);
        setText("r_t", P.regime === "steady" ? "estacion\xE1rio" : simTime < 3600 ? `${simTime.toFixed(0)} s` : `${(simTime / 3600).toFixed(2)} h`);
        setText("r_hr", `${hRad(mean).toFixed(1)} W/m\xB2K`);
      }
      var CALC_DEF = [
        ["cond", "Condu\xE7\xE3o \xB7 Fourier", "O calor atravessa a barra do quente para o frio, proporcional ao gradiente de temperatura. \xC9 a \xFAnica parcela sem perda lateral. O gradiente \xE9 medido no primeiro intervalo da malha."],
        ["conv", "Convec\xE7\xE3o \xB7 Newton", "O ar leva calor da superf\xEDcie lateral, proporcional \xE0 diferen\xE7a entre a temperatura da barra e a do ambiente. Usa a T m\xE9dia da barra."],
        ["rad", "Radia\xE7\xE3o \xB7 Stefan\u2013Boltzmann", "A superf\xEDcie emite calor proporcional a T\u2074 (em kelvin). Linearizando, vira um h_r equivalente, compar\xE1vel ao h da convec\xE7\xE3o. Usa a T m\xE9dia da barra; como a radia\xE7\xE3o n\xE3o \xE9 linear em T, o valor ponto a ponto pode diferir um pouco."],
        ["dil", "Dilata\xE7\xE3o t\xE9rmica", "A barra cresce proporcional ao \u03B1, ao comprimento e ao quanto a T m\xE9dia passou da refer\xEAncia de 20 \xB0C. A deforma\xE7\xE3o \u03B5 \xE9 a raz\xE3o \u0394L/L."]
      ];
      function calc(prof, dL, mean) {
        const dx = P.L / (N - 1), { k, eps, alpha } = P.mat, A = Math.PI * P.D ** 2 / 4, S = Math.PI * P.D * P.L;
        const tk = mean + 273.15, ik = P.Tinf + 273.15, g = (prof[1] - prof[0]) / dx, qd = -k * g;
        const qv = P.h * (mean - P.Tinf), qr = eps * SIGMA * (tk ** 4 - ik ** 4), dT = mean - T_REF;
        const set = (id, lines) => {
          $(`calc_${id}_t`).textContent = lines.join("\n");
        };
        set("cond", [
          `dT/dx \u2248 (T\u2081 \u2212 T\u2080)/\u0394x = (${prof[1].toFixed(2)} \u2212 ${prof[0].toFixed(2)}) / ${dx.toFixed(4)} = ${g.toFixed(1)} K/m`,
          `q\u2033 = \u2212k \xB7 dT/dx = \u2212${k} \xD7 (${g.toFixed(1)}) = ${qd.toFixed(1)} W/m\xB2`,
          `Q = q\u2033 \xB7 A = ${qd.toFixed(1)} \xD7 ${A.toExponential(2)} m\xB2 = ${(qd * A).toFixed(3)} W`
        ]);
        set("conv", [
          `q\u2033 = h \xB7 (T\u0304 \u2212 T\u221E) = ${P.h} \xD7 (${mean.toFixed(1)} \u2212 ${P.Tinf.toFixed(1)}) = ${qv.toFixed(1)} W/m\xB2`,
          `Q = q\u2033 \xB7 S = ${qv.toFixed(1)} \xD7 ${S.toFixed(4)} m\xB2 = ${(qv * S).toFixed(2)} W   (S = \u03C0\xB7D\xB7L)`
        ]);
        set("rad", [
          `T\u0304 = ${tk.toFixed(1)} K \xB7 T\u221E = ${ik.toFixed(1)} K`,
          `q\u2033 = \u03B5 \xB7 \u03C3 \xB7 (T\u0304\u2074 \u2212 T\u221E\u2074) = ${eps} \xD7 5.67e-8 \xD7 (${(tk ** 4).toExponential(2)} \u2212 ${(ik ** 4).toExponential(2)}) = ${qr.toFixed(1)} W/m\xB2`,
          `h_r = \u03B5 \xB7 \u03C3 \xB7 (T\u0304\xB2 + T\u221E\xB2)(T\u0304 + T\u221E) = ${hRad(mean).toFixed(2)} W/m\xB2K  \u2192  q\u2033 = h_r \xB7 (T\u0304 \u2212 T\u221E)`,
          `Q = q\u2033 \xB7 S = ${qr.toFixed(1)} \xD7 ${S.toFixed(4)} m\xB2 = ${(qr * S).toFixed(2)} W`
        ]);
        set("dil", [
          `\u0394T = T\u0304 \u2212 T_ref = ${mean.toFixed(1)} \u2212 ${T_REF} = ${dT.toFixed(1)} K`,
          `\u0394L = \u03B1 \xB7 L \xB7 \u0394T = ${(alpha * 1e6).toFixed(2)}e-6 \xD7 ${P.L.toFixed(2)} \xD7 ${dT.toFixed(1)} = ${(dL * 1e6).toFixed(2)} \xB5m`,
          `\u03B5 = \u0394L / L = ${(dL / P.L).toExponential(2)}`
        ]);
      }
      var last = performance.now();
      function step(now) {
        const dt = Math.min((now - last) / 1e3, 0.05);
        last = now;
        const lin = Float64Array.from({ length: N }, (_, i) => P.Th + (P.Tc - P.Th) * i / (N - 1));
        const steady = solve(null, 0, lin);
        let prof = steady;
        if (P.regime === "transient") {
          if (playing) {
            const ds = 10 ** P.speedExp * dt;
            simTime += ds;
            for (let s = 0; s < 4; s++) T = solve(T, ds / 4, T);
          }
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
        const ser = [{ xs, ys: prof, color: C.hot, width: 2 }];
        if (P.regime === "transient") ser.unshift({ xs, ys: steady, color: C.mut, dash: [4, 3] });
        chart($("c1"), [0, P.L], [lo - pad, hi + pad], "x [m]", "T [\xB0C]", ser);
        const dTs = [0, P.Th - T_REF, P.Tc - T_REF, P.Tinf - T_REF, mean - T_REF], xr = [Math.min(...dTs), Math.max(...dTs, 1)];
        const lines = MATERIALS.map((m) => ({ xs: xr, ys: xr.map((d) => m.alpha * P.L * d * 1e6), color: "#3a414c", width: 1 }));
        lines.push({ xs: xr, ys: xr.map((d) => P.mat.alpha * P.L * d * 1e6), color: C.hot, width: 2 });
        const tags = MATERIALS.map((m) => ({ x: xr[1], y: m.alpha * P.L * xr[1] * 1e6, t: m.name.split(" ")[0], c: C.mut }));
        const ymax = Math.max(...MATERIALS.map((m) => m.alpha)) * P.L * xr[1] * 1e6, ymin = Math.min(0, Math.max(...MATERIALS.map((m) => m.alpha)) * P.L * xr[0] * 1e6);
        chart($("c2"), xr, [ymin, ymax * 1.05], "\u0394T = T \u2212 20 \xB0C", "\u0394L [\xB5m]", lines, { x: mean - T_REF, y: dL * 1e6 }, tags);
      }
      var warned = false;
      function frame(now) {
        try {
          step(now);
        } catch (e) {
          if (!warned) {
            warned = true;
            console.error("ThermoLab:", e);
          }
        }
        requestAnimationFrame(frame);
      }
      function syncMat() {
        const m = P.mat;
        $("k").value = String(m.k);
        $("eps").value = String(m.eps);
        $("alpha").value = String(+(m.alpha * 1e6).toFixed(2));
        $("rho").value = String(m.rho);
        $("cp").value = String(m.cp);
      }
      function syncMode() {
        document.querySelectorAll("[data-mode]").forEach((b) => b.classList.toggle("on", b.dataset.mode === P.mode));
        document.querySelectorAll("[data-regime]").forEach((b) => b.classList.toggle("on", b.dataset.regime === P.regime));
        $("eq").textContent = EQ[P.mode];
        $("row_h").style.opacity = useConv() ? "1" : "0.35";
        hideEl(opt("r_hr")?.parentElement, !useRad());
        const on = { cond: true, conv: useConv(), rad: useRad(), dil: true };
        for (const id in on) $("calc_" + id).hidden = !on[id];
        document.querySelectorAll(".tr").forEach((e) => e.hidden = P.regime !== "transient");
      }
      function syncSliders() {
        for (const s of SLIDERS) {
          const v = P[s.key] / (s.scale ?? 1);
          $("s_" + s.key).value = String(v);
          $("v_" + s.key).textContent = s.show(v);
        }
      }
      function applyPreset(p) {
        P.mat = { ...MATERIALS[p.mat] };
        Object.assign(P, { mode: p.mode, regime: p.regime, Th: p.Th, Tc: p.Tc, L: p.L, D: p.D, h: p.h, Tinf: p.Tinf, speedExp: p.speedExp, exagExp: p.exagExp });
        $("mat").value = String(p.mat);
        playing = true;
        setText("play", "Pausar");
        resetT();
        syncMat();
        syncSliders();
        syncMode();
      }
      function initExtras() {
        let box = opt("presets");
        if (!box) {
          const grid = document.querySelector("[data-mode]")?.parentElement;
          if (grid?.parentElement) {
            const h = document.createElement("h3");
            h.textContent = "Exemplos";
            box = document.createElement("div");
            box.id = "presets";
            box.className = "button-grid";
            const ref = grid.previousElementSibling?.tagName === "H3" ? grid.previousElementSibling : grid;
            grid.parentElement.insertBefore(h, ref);
            grid.parentElement.insertBefore(box, ref);
          }
        }
        if (box) {
          box.innerHTML = PRESETS.map((p, i) => `<button type="button" data-preset="${i}">${p.label}</button>`).join("");
          box.querySelectorAll("[data-preset]").forEach((b) => b.addEventListener("click", () => applyPreset(PRESETS[+b.dataset.preset])));
        }
        hideEl(opt("fluxes")?.closest("section") ?? opt("fluxes"), true);
        hideEl(opt("r_bi")?.parentElement, true);
      }
      function init() {
        $("sliders").innerHTML = SLIDERS.map((s) => `<label class="row${s.key === "speedExp" ? " tr" : ""}" id="row_${s.key}"><span class="lbl">${s.label}<b id="v_${s.key}"></b></span>
    <input type="range" id="s_${s.key}" min="${s.min}" max="${s.max}" step="${s.step}"></label>`).join("");
        $("row_h").id = "row_h";
        for (const s of SLIDERS) {
          const el = $("s_" + s.key), sc2 = s.scale ?? 1;
          el.value = String(P[s.key] / sc2);
          const upd = () => {
            P[s.key] = parseFloat(el.value) * sc2;
            $("v_" + s.key).textContent = s.show(parseFloat(el.value));
          };
          el.addEventListener("input", upd);
          upd();
        }
        const sel = $("mat");
        sel.innerHTML = MATERIALS.map((m, i) => `<option value="${i}"${i === 1 ? " selected" : ""}>${m.name}</option>`).join("");
        sel.addEventListener("change", () => {
          P.mat = { ...MATERIALS[+sel.value] };
          syncMat();
        });
        ["k", "eps", "alpha", "rho", "cp"].forEach((id) => $(id).addEventListener("input", (e) => {
          const v = parseFloat(e.target.value);
          if (v > 0) P.mat[id] = id === "alpha" ? v * 1e-6 : v;
        }));
        document.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => {
          P.mode = b.dataset.mode;
          syncMode();
        }));
        document.querySelectorAll("[data-regime]").forEach((b) => b.addEventListener("click", () => {
          P.regime = b.dataset.regime;
          if (P.regime === "transient") resetT();
          syncMode();
        }));
        $("play").addEventListener("click", () => {
          playing = !playing;
          $("play").textContent = playing ? "Pausar" : "Retomar";
        });
        $("reset").addEventListener("click", resetT);
        $("calc").innerHTML = CALC_DEF.map(([id, t, d]) => `<section id="calc_${id}"><h3>${t}</h3><p>${d}</p><pre id="calc_${id}_t"></pre></section>`).join("");
        syncMat();
        syncMode();
        requestAnimationFrame(frame);
        try {
          initExtras();
        } catch (e) {
          console.error("ThermoLab (extras):", e);
        }
      }
      init();
    }
  });
  require_app();
})();
