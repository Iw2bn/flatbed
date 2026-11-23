// Test harness for edge detection. Loaded into flatbed.html during development only.
(function(){
  let seed = 1; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const R = (a, b) => a + (b - a) * rnd();

  function paperContent(PW, PH){
    const p = mkCanvas(PW, PH); const x = p.getContext("2d");
    x.fillStyle = "#f5f3ee"; x.fillRect(0, 0, PW, PH);
    x.fillStyle = "#222"; x.font = `700 ${PW * 0.05}px Georgia`; x.fillText("Quarterly statement", PW * .08, PH * .09);
    for (let i = 0; i < 26; i++) { const y = PH * (.15 + i * .03); x.fillStyle = i % 7 === 0 ? "#333" : "#555"; x.fillRect(PW * .08, y, PW * (.6 + .24 * rnd()), PH * .009); }
    x.fillStyle = "#1f4fbf"; x.fillRect(PW * .08, PH * .93, PW * .3, PH * .012);
    return p;
  }
  function background(x, W, H, kind){
    const fills = { wood: ["#5a3b26", "#3b2517"], light: ["#d9d3c7", "#c9c2b4"], white: ["#ecebe7", "#e2e0da"], gray: ["#7b7d82", "#5d5f64"], clutter: ["#6d4e37", "#4a3323"] };
    const [a, b] = fills[kind]; const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, a); g.addColorStop(1, b); x.fillStyle = g; x.fillRect(0, 0, W, H);
    if (kind === "wood" || kind === "clutter") for (let i = 0; i < 120; i++) { x.strokeStyle = `rgba(${i % 2 ? "20,10,4" : "130,90,60"},${.05 + rnd() * .1})`; x.lineWidth = 2 + rnd() * 6; x.beginPath(); const y = rnd() * H; x.moveTo(0, y); x.bezierCurveTo(W * .3, y + 30, W * .7, y - 30, W, y + 10); x.stroke(); }
    if (kind === "light" || kind === "gray") for (let i = 0; i < 3000; i++) { x.fillStyle = `rgba(${rnd() < .5 ? "0,0,0" : "255,255,255"},${rnd() * .08})`; x.fillRect(rnd() * W, rnd() * H, 3 + rnd() * 6, 3 + rnd() * 6); }
    if (kind === "clutter") {
      const cols = ["#c0392b", "#2c3e50", "#e6dfcf", "#27ae60", "#f1c40f", "#ddd"];
      for (let i = 0; i < 7; i++) { x.save(); x.translate(rnd() * W, rnd() * H); x.rotate(R(-.6, .6)); x.fillStyle = cols[i % cols.length]; x.fillRect(-R(80, 260), -R(60, 200), R(160, 520), R(120, 400)); x.restore(); }
    }
  }
  function project(x, paper, quad, W, H){
    const PW = paper.width, PH = paper.height; const h = homography(quad, [[0, 0], [PW, 0], [PW, PH], [0, PH]]);
    const pd = paper.getContext("2d").getImageData(0, 0, PW, PH).data;
    const img = x.getImageData(0, 0, W, H); const d = img.data;
    const xs = quad.map(p => p[0]), ys = quad.map(p => p[1]);
    const x0 = Math.max(0, Math.floor(Math.min(...xs))), x1 = Math.min(W, Math.ceil(Math.max(...xs))), y0 = Math.max(0, Math.floor(Math.min(...ys))), y1 = Math.min(H, Math.ceil(Math.max(...ys)));
    for (let Y = y0; Y < y1; Y++) for (let X = x0; X < x1; X++) {
      const w = h[6] * X + h[7] * Y + 1; const u = (h[0] * X + h[1] * Y + h[2]) / w, v = (h[3] * X + h[4] * Y + h[5]) / w;
      if (u < 0 || v < 0 || u >= PW - 1 || v >= PH - 1) continue;
      const si = ((v | 0) * PW + (u | 0)) * 4, di = (Y * W + X) * 4; d[di] = pd[si]; d[di + 1] = pd[si + 1]; d[di + 2] = pd[si + 2];
    }
    x.putImageData(img, 0, 0);
  }
  function scene(o){
    seed = o.seed || 1; const W = o.W || 1500, H = o.H || 2000; const c = mkCanvas(W, H); const x = c.getContext("2d");
    background(x, W, H, o.bg);
    // perspective quad: a rectangle of the paper's ratio, scaled, then each corner jittered
    const ratio = 297 / 210; const s = o.size || R(.55, .85);
    let pw = W * s, ph = pw * ratio; if (ph > H * s) { ph = H * s; pw = ph / ratio; }
    const cx = W / 2 + R(-.08, .08) * W + (o.shiftX || 0) * W, cy = H / 2 + R(-.06, .06) * H + (o.shiftY || 0) * H;
    const top = o.persp ?? R(.0, .15);
    let quad = [[cx - pw / 2 * (1 - top), cy - ph / 2], [cx + pw / 2 * (1 - top), cy - ph / 2], [cx + pw / 2, cy + ph / 2], [cx - pw / 2, cy + ph / 2]];
    const rot = o.rot ?? R(-.2, .2); quad = quad.map(([X, Y]) => { const dx = X - cx, dy = Y - cy; return [cx + dx * Math.cos(rot) - dy * Math.sin(rot) + R(-15, 15), cy + dx * Math.sin(rot) + dy * Math.cos(rot) + R(-15, 15)]; });
    x.save(); x.shadowColor = "rgba(0,0,0,.45)"; x.shadowBlur = 40; x.shadowOffsetY = 12; x.fillStyle = "#eee";
    x.beginPath(); quad.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.closePath(); x.fill(); x.restore();
    project(x, paperContent(900, 1273), quad, W, H);
    if (o.thumb) { x.fillStyle = "#d29b7a"; x.beginPath(); const [a, b] = quad[3]; const [e, f] = quad[2]; x.ellipse(a + (e - a) * .35, b + (f - b) * .35 + 40, 70, 150, 0.2, 0, Math.PI * 2); x.fill(); }
    x.globalCompositeOperation = "multiply";
    const lg = x.createRadialGradient(W * R(.2, .8), H * R(.1, .4), 50, W / 2, H / 2, W * 1.2); lg.addColorStop(0, "#fff"); lg.addColorStop(1, `rgb(${o.dark ? "90,85,80" : "170,160,150"})`); x.fillStyle = lg; x.fillRect(0, 0, W, H);
    if (o.shadow) { const sg = x.createRadialGradient(W * .3, H, 50, W * .3, H, H * .55); sg.addColorStop(0, "rgb(110,110,120)"); sg.addColorStop(1, "#fff"); x.fillStyle = sg; x.fillRect(0, 0, W, H); }
    x.globalCompositeOperation = "source-over";
    const img = x.getImageData(0, 0, W, H); const d = img.data; const n = o.noise ?? 6;
    for (let i = 0; i < d.length; i += 4) { const v = (rnd() - .5) * 2 * n; d[i] += v; d[i + 1] += v; d[i + 2] += v; }
    x.putImageData(img, 0, 0);
    const out = mkCanvas(W, H); const ox = out.getContext("2d"); ox.filter = "blur(1.2px)"; ox.drawImage(c, 0, 0);
    return { canvas: out, truth: quad.map(([a, b]) => [Math.min(1, Math.max(0, a / W)), Math.min(1, Math.max(0, b / H))]) };
  }
  const CASES = [];
  const bgs = ["wood", "light", "white", "gray", "clutter"];
  let k = 0;
  for (const bg of bgs) for (const extra of [{}, { shadow: 1 }, { thumb: 1 }, { size: .9, shiftY: .02 }, { dark: 1, persp: .2 }])
    CASES.push({ name: bg + " " + (Object.keys(extra).join("+") || "plain"), bg, seed: 11 + k++, ...extra });

  function err(q, t, W, H){ if (!q) return Infinity; const D = Math.hypot(W, H); return Math.max(...q.map((p, i) => Math.hypot((p[0] - t[i][0]) * W, (p[1] - t[i][1]) * H))) / D * 100; }
  window.runDetectTests = function(fns){
    const rows = [];
    for (const cs of CASES) {
      const { canvas, truth } = scene(cs); const row = { case: cs.name };
      for (const [name, fn] of Object.entries(fns)) { const t0 = performance.now(); const q = fn(canvas); row[name] = +err(q, truth, canvas.width, canvas.height).toFixed(2); row[name + "_ms"] = Math.round(performance.now() - t0); }
      free(canvas); rows.push(row);
    }
    const summary = {};
    for (const name of Object.keys(fns)) { const v = rows.map(r => r[name]); summary[name] = { ok_under_1pct: v.filter(e => e < 1).length, ok_under_2_5pct: v.filter(e => e < 2.5).length, total: v.length, median: v.slice().sort((a, b) => a - b)[v.length >> 1] }; }
    return { summary, rows };
  };
  window.testScene = scene; window.TEST_CASES = CASES;
})();
