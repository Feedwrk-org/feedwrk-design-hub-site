/* @ds-bundle: {"format":4,"namespace":"FeedwrkPresentations","components":[]} */
/* Feedwrk Marketing: slides are plain HTML and CSS (components/bundle.css).
   This script adds one thing: code motion. Canvas backgrounds drawn live, in the light or the dark ground,
   from one grammar: fine threads or particles, one movement, an exact loop, an empty zone for words.
   Use: <canvas class="pr-motion" data-pr-motion="river"></canvas> inside a positioned parent,
   or FeedwrkPresentations.motion.mount(canvas, { idea: "river", theme: "dark" }). */
(function () {
  "use strict";

  /* Palettes: the two grounds, taken from the tokens (pr-band-dark, pr-page, thread colours). */
  var PAL = {
    dark: { bg0: "#0c1a20", bg1: "#03080b", L: 82, alphaK: 1, blend: "lighter", glow: 0.10,
            vTop: "rgba(3,8,11,0.35)", vBot: "rgba(3,8,11,0.25)", node: "rgba(244,244,246,0.85)", key: "#3fa3fd" },
    light: { bg0: "#ffffff", bg1: "#f1f5f8", L: 40, alphaK: 1.35, blend: "source-over", glow: 0.05,
             vTop: "rgba(255,255,255,0)", vBot: "rgba(255,255,255,0)", node: "rgba(24,24,27,0.75)", key: "#0071c6" }
  };
  /* Thread hues: blue (204), lilac (262), sage (110), sand (36). */
  var HUE = { blue: [204, 55], lilac: [262, 45], sage: [110, 22], sand: [36, 40] };

  function rng(seed) { var s = seed % 2147483647; if (s <= 0) s += 2147483646; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function smooth(e0, e1, x) { var t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); }
  function col(pal, hue, a, dL) { var h = HUE[hue] || HUE.blue; return "hsla(" + h[0] + "," + h[1] + "%," + (pal.L + (dL || 0)) + "%," + Math.min(1, a * pal.alphaK).toFixed(3) + ")"; }

  function background(ctx, W, H, pal) {
    var g = ctx.createRadialGradient(W * 0.5, H * 0.55, H * 0.05, W * 0.5, H * 0.55, W * 0.75);
    g.addColorStop(0, pal.bg0); g.addColorStop(1, pal.bg1);
    ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  function vignette(ctx, W, H, pal) {
    ctx.globalCompositeOperation = "source-over";
    var v = ctx.createLinearGradient(0, 0, 0, H);
    v.addColorStop(0, pal.vTop); v.addColorStop(0.45, "rgba(0,0,0,0)"); v.addColorStop(1, pal.vBot);
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }
  /* One continuous wire: a soft glow pass, then the crisp line. */
  function wire(ctx, pts, pal, hue, a, lw) {
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
    for (var k = 2; k < pts.length - 2; k += 2) ctx.quadraticCurveTo(pts[k], pts[k + 1], (pts[k] + pts[k + 2]) / 2, (pts[k + 1] + pts[k + 3]) / 2);
    ctx.lineTo(pts[pts.length - 2], pts[pts.length - 1]);
    ctx.strokeStyle = col(pal, hue, a * pal.glow, -10); ctx.lineWidth = lw * 3.5; ctx.stroke();
    ctx.strokeStyle = col(pal, hue, a); ctx.lineWidth = lw; ctx.stroke();
  }

  /* ---------- Ideas. Each: setup(P, rnd) -> state; draw(ctx, W, H, ph, P, pal, st, lw). ph runs 0..2π once per loop. ---------- */
  var IDEAS = {};

  /* Mess to order: a tangle on the left turns slowly and settles into parallel lines on the right. */
  IDEAS.river = {
    defaults: { n: 150, mess: 0.7, wave: 0.35, rot: 1, baseY: 0.70, bright: 0.5 },
    setup: function (P, r) {
      var t = []; for (var i = 0; i < P.n; i++) t.push({ a: r() * 6.2832, r: 0.55 + r() * 0.45, k: 1 + Math.floor(r() * 2), f: 0.6 + r() * 1.1, p1: r() * 6.2832, p2: r() * 6.2832, lilac: r() < 0.16, o: (i + 0.5) / P.n });
      return t;
    },
    draw: function (ctx, W, H, ph, P, pal, st, lw) {
      var baseY = H * P.baseY, messR = H * 0.12 * P.mess / 0.55, bandH = H * 0.075, steps = 140, x0 = -W * 0.04, x1 = W * 1.04;
      for (var i = 0; i < st.length; i++) {
        var th = st[i], pts = [], depth = 0;
        for (var s = 0; s <= steps; s++) {
          var u = s / steps, x = x0 + (x1 - x0) * u, A = 1 - smooth(0.06, 0.62, u);
          var phi = th.a - ph * P.rot + u * 5 * A, rr = messR * th.r * (0.35 + 0.65 * A);
          var breathe = A * messR * 0.35 * Math.sin(th.f * u * 9 + th.p1 - ph * th.k);
          var sway = P.wave * H * 0.012 * Math.sin(u * 4.2 - ph) + P.wave * H * 0.006 * Math.sin(u * 9.1 - ph + th.p2 * 0.15);
          pts.push(x, baseY + (th.o - 0.5) * bandH * (1 - A) + (rr * Math.cos(phi) + breathe) * A + sway);
          depth += Math.sin(phi) * A;
        }
        depth /= steps + 1;
        wire(ctx, pts, pal, th.lilac ? "lilac" : "blue", P.bright * (0.16 + 0.22 * (0.5 + 0.5 * Math.tanh(depth * 3))), lw);
      }
    }
  };

  /* Sources: tinted streams flow in from the left and merge into one clean band. */
  IDEAS.merge = {
    defaults: { streams: 4, perStream: 26, baseY: 0.72, wave: 0.5, bright: 0.55 },
    setup: function (P, r) {
      var hues = ["blue", "sage", "sand", "lilac"], t = [];
      for (var s = 0; s < P.streams; s++) for (var i = 0; i < P.perStream; i++)
        t.push({ hue: hues[s % 4], y0: 0.5 + 0.32 * (s + 0.15 + 0.7 * (i / P.perStream)) / P.streams, o: (s * P.perStream + i + 0.5) / (P.streams * P.perStream), k: 1 + Math.floor(r() * 2), p: r() * 6.2832 });
      return t;
    },
    draw: function (ctx, W, H, ph, P, pal, st, lw) {
      var baseY = H * P.baseY, bandH = H * 0.06, steps = 120;
      for (var i = 0; i < st.length; i++) {
        var th = st[i], pts = [];
        for (var s = 0; s <= steps; s++) {
          var u = s / steps, x = -W * 0.04 + W * 1.08 * u, m = smooth(0.12, 0.62, u);
          var y = H * th.y0 * (1 - m) + (baseY + (th.o - 0.5) * bandH) * m;
          y += (1 - m) * P.wave * H * 0.018 * Math.sin(u * 7 - ph * th.k + th.p);
          pts.push(x, y);
        }
        wire(ctx, pts, pal, th.hue, P.bright * 0.32, lw);
      }
    }
  };

  /* Sales channels: one band from the left fans out to channel nodes; pulses travel the lines. */
  IDEAS.fanout = {
    defaults: { n: 90, ends: 5, baseY: 0.68, spread: 0.26, bright: 0.55, pulses: 1 },
    setup: function (P, r) {
      var t = []; for (var i = 0; i < P.n; i++) t.push({ e: i % P.ends, o: (i + 0.5) / P.n, d: (r() - 0.5) * 0.02, off: r(), lilac: r() < 0.14 });
      return t;
    },
    draw: function (ctx, W, H, ph, P, pal, st, lw) {
      var steps = 100, baseY = H * P.baseY, xs = W * 0.86;
      function endY(e) { return baseY + H * P.spread * (e / (P.ends - 1) - 0.5) * 2 * 0.5; }
      function path(th) {
        var pts = [];
        for (var s = 0; s <= steps; s++) {
          var u = s / steps, x = -W * 0.04 + (xs + W * 0.04) * u, m = smooth(0.38, 0.92, u);
          var y0 = baseY + (th.o - 0.5) * H * 0.05;
          pts.push(x, y0 * (1 - m) + (endY(th.e) + th.d * H) * m);
        }
        return pts;
      }
      for (var i = 0; i < st.length; i++) wire(ctx, path(st[i]), pal, st[i].lilac ? "lilac" : "blue", P.bright * 0.3, lw);
      ctx.globalCompositeOperation = pal.blend;
      for (var e = 0; e < P.ends; e++) {
        ctx.beginPath(); ctx.arc(xs, endY(e), H * 0.011, 0, 6.2832); ctx.fillStyle = pal.node; ctx.fill();
      }
      /* pulses: one dot per thread every loop, exact loop */
      for (i = 0; i < st.length; i += 3) {
        var th = st[i], q = ((ph / 6.2832) * P.pulses + th.off) % 1, pts = path(th), k = Math.floor(q * steps) * 2;
        var a = Math.sin(q * Math.PI);
        ctx.beginPath(); ctx.arc(pts[k], pts[k + 1], H * 0.0035, 0, 6.2832); ctx.fillStyle = col(pal, th.lilac ? "lilac" : "blue", a * 0.9, 6); ctx.fill();
      }
    }
  };

  /* Store Auditor: a field of glass cells; a scan line passes and each cell it crosses is checked. */
  IDEAS.scan = {
    defaults: { cols: 34, rows: 6, top: 0.58, bottom: 0.82, bright: 0.6, cloudy: 0.12 },
    setup: function (P, r) {
      var c = []; for (var y = 0; y < P.rows; y++) for (var x = 0; x < P.cols; x++) c.push({ x: x, y: y, bad: r() < P.cloudy });
      return c;
    },
    draw: function (ctx, W, H, ph, P, pal, st, lw) {
      var gw = W * 0.9, x0 = W * 0.05, cw = gw / P.cols, y0 = H * P.top, ch = (H * (P.bottom - P.top)) / P.rows, s = Math.min(cw, ch) * 0.62;
      var scanX = x0 - W * 0.06 + (gw + W * 0.12) * (ph / 6.2832);
      ctx.globalCompositeOperation = pal.blend;
      for (var i = 0; i < st.length; i++) {
        var c = st[i], cx = x0 + (c.x + 0.5) * cw, cy = y0 + (c.y + 0.5) * ch, passed = cx < scanX;
        var a = passed ? (c.bad ? 0.22 : 0.55) : 0.16;
        ctx.strokeStyle = col(pal, c.bad && passed ? "lilac" : "blue", P.bright * a); ctx.lineWidth = lw;
        ctx.strokeRect(cx - s / 2, cy - s / 2, s, s);
        if (passed && !c.bad) { ctx.fillStyle = col(pal, "blue", P.bright * 0.12); ctx.fillRect(cx - s / 2, cy - s / 2, s, s); }
      }
      ctx.strokeStyle = col(pal, "lilac", P.bright * 0.9, 4); ctx.lineWidth = lw * 1.6;
      ctx.beginPath(); ctx.moveTo(scanX, y0 - ch * 0.4); ctx.lineTo(scanX, H * P.bottom + ch * 0.1); ctx.stroke();
      ctx.strokeStyle = col(pal, "lilac", P.bright * 0.12, -6); ctx.lineWidth = lw * 10; ctx.stroke();
    }
  };

  /* Catalogue: loose particles drift in from the left and settle into an ordered lattice on the right. */
  IDEAS.settle = {
    defaults: { n: 260, cols: 26, rows: 8, top: 0.56, bottom: 0.82, bright: 0.65 },
    setup: function (P, r) {
      var p = []; for (var i = 0; i < P.n; i++) {
        var slot = i % (P.cols * P.rows);
        p.push({ sx: -0.05 - r() * 0.1, sy: P.top - 0.04 + r() * (P.bottom - P.top + 0.06), tx: 0.5 + 0.45 * ((slot % P.cols) + 0.5) / P.cols,
                 ty: P.top + (P.bottom - P.top) * (Math.floor(slot / P.cols) + 0.5) / P.rows, off: r(), w: r() * 6.2832, lilac: r() < 0.15 });
      }
      return p;
    },
    draw: function (ctx, W, H, ph, P, pal, st, lw) {
      ctx.globalCompositeOperation = pal.blend;
      var t = ph / 6.2832, rr = Math.max(1, H * 0.0028);
      for (var i = 0; i < st.length; i++) {
        var p = st[i], q = (t + p.off) % 1, m = smooth(0, 0.7, q);
        var x = (p.sx * (1 - m) + p.tx * m) * W, y = (p.sy * (1 - m) + p.ty * m) * H + (1 - m) * H * 0.02 * Math.sin(q * 12.566 + p.w);
        var a = q < 0.08 ? q / 0.08 : q > 0.92 ? (1 - q) / 0.08 : 1;
        ctx.beginPath(); ctx.arc(x, y, rr, 0, 6.2832); ctx.fillStyle = col(pal, p.lilac ? "lilac" : "blue", P.bright * a * (0.35 + 0.65 * m)); ctx.fill();
      }
      /* the lattice itself, faint */
      ctx.strokeStyle = col(pal, "blue", P.bright * 0.08); ctx.lineWidth = lw;
      for (var c = 0; c <= P.cols; c++) { var gx = (0.5 + 0.45 * c / P.cols) * W; ctx.beginPath(); ctx.moveTo(gx, P.top * H); ctx.lineTo(gx, P.bottom * H); ctx.stroke(); }
      for (var rw = 0; rw <= P.rows; rw++) { var gy = (P.top + (P.bottom - P.top) * rw / P.rows) * H; ctx.beginPath(); ctx.moveTo(0.5 * W, gy); ctx.lineTo(0.95 * W, gy); ctx.stroke(); }
    }
  };

  /* ---------- Engine ---------- */
  function themeOf(canvas, opt) {
    if (opt.theme === "light" || opt.theme === "dark") return opt.theme;
    var el = canvas.closest("[data-theme]");
    return el && el.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  function mount(canvas, options) {
    if (!canvas || canvas._prMotion) return canvas && canvas._prMotion;
    var opt = options || {}, idea = IDEAS[opt.idea] || IDEAS.river, P = {}, k;
    for (k in idea.defaults) P[k] = idea.defaults[k];
    for (k in opt) if (k in idea.defaults) P[k] = +opt[k];
    var loop = +opt.loop || 30, speed = +opt.speed || 1, seed = +opt.seed || 7;
    var pal = PAL[themeOf(canvas, opt)], ctx = canvas.getContext("2d"), host = canvas.parentElement;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var W = 1, H = 1, dpr = 1, lw = 1, st = idea.setup(P, rng(seed)), vt = loop * 0.3, last = performance.now(), visible = true, raf = 0;

    function resize() {
      var r = host.getBoundingClientRect(); dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, Math.round(r.width * dpr)); H = Math.max(1, Math.round(r.height * dpr));
      canvas.width = W; canvas.height = H; lw = Math.max(0.6, H / 1080 * 1.6);
    }
    function frame(t) {
      var ph = ((t % loop) / loop) * 6.2832;
      background(ctx, W, H, pal);
      ctx.globalCompositeOperation = pal.blend; ctx.lineCap = "round"; ctx.lineJoin = "round";
      idea.draw(ctx, W, H, ph, P, pal, st, lw);
      vignette(ctx, W, H, pal);
    }
    function tick(now) {
      var dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (visible && !document.hidden) { vt += dt * speed; frame(vt); }
      if (raf) raf = requestAnimationFrame(tick);
    }
    resize(); frame(vt);
    var ro = "ResizeObserver" in window ? new ResizeObserver(function () { resize(); frame(vt); }) : null;
    if (ro) ro.observe(host);
    var io = "IntersectionObserver" in window ? new IntersectionObserver(function (es) { visible = es[0].isIntersecting; last = performance.now(); }) : null;
    if (io) io.observe(host);
    if (!reduce) raf = requestAnimationFrame(tick);   // reduced motion: one still frame

    var api = {
      set: function (o) { for (var key in o) if (key in P) P[key] = +o[key]; if ("loop" in o) loop = +o.loop; if ("speed" in o) speed = +o.speed; st = idea.setup(P, rng(seed)); frame(vt); },
      theme: function (name) { pal = PAL[name] || pal; frame(vt); },
      /* Stop the clock and draw the frame at t seconds: for video export and stills. */
      renderAt: function (t) { if (raf) cancelAnimationFrame(raf); raf = 0; vt = t; frame(vt); },
      destroy: function () { cancelAnimationFrame(raf); if (ro) ro.disconnect(); if (io) io.disconnect(); canvas._prMotion = null; }
    };
    canvas._prMotion = api;
    return api;
  }

  function autoMount(root) {
    (root || document).querySelectorAll("canvas[data-pr-motion]").forEach(function (c) {
      var d = c.dataset, o = { idea: d.prMotion };
      for (var key in d) if (key !== "prMotion") o[key] = d[key];
      mount(c, o);
    });
  }

  window.FeedwrkPresentations = { version: 2, canvas: { width: 1920, height: 1080 },
    motion: { mount: mount, autoMount: autoMount, ideas: Object.keys(IDEAS), palettes: PAL, _ideas: IDEAS } };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { autoMount(); });
  else autoMount();
})();
