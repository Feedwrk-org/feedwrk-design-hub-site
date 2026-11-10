/* @ds-bundle: {"format":4,"namespace":"FeedwrkLanding","components":[]} */
/* Feedwrk Landing motion helper, from design/landing-kit/feedwrk-landing.js. */
(function () {
  function init() {
  "use strict";
  var root = document.documentElement;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
  root.classList.add("lp-js");
  document.querySelectorAll("[data-lp-stagger]").forEach(function (g) {
    Array.prototype.forEach.call(g.querySelectorAll(":scope > .lp-reveal"), function (el, i) { el.style.setProperty("--lp-i", i); });
  });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -12% 0px" });
  document.querySelectorAll(".lp-reveal").forEach(function (el) {
    var r = el.getBoundingClientRect();
    if (r.top < innerHeight * 0.88) el.classList.add("is-in"); else io.observe(el);   // already on screen: show at once
  });

  // figures: draw once (is-in → is-done), ambient only while on screen (is-live)
  function draw(svg) {
    svg.classList.remove("is-in", "is-done");
    var m = svg.getScreenCTM(); if (!m) return;
    var k = Math.hypot(m.a, m.b), last = 0;
    svg.querySelectorAll("[data-draw]").forEach(function (p) {
      p.style.setProperty("--lp-len", (p.getTotalLength() * k + 2).toFixed(1) + "px");
      var d = parseFloat(getComputedStyle(p).transitionDelay) || 0; if (d > last) last = d;
    });
    svg.getBoundingClientRect();
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      svg.classList.add("is-in");
      var cs = getComputedStyle(root), dur = parseFloat(cs.getPropertyValue("--lp-dur-draw")) || 1200;
      var stag = parseFloat(cs.getPropertyValue("--lp-stagger")) || 60;
      clearTimeout(svg._lpT); svg._lpT = setTimeout(function () { svg.classList.add("is-done"); }, dur + 12 * stag + 100);
    }); });
  }
  var figs = document.querySelectorAll("svg.lp-fig");
  var fo = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var t = e.target;
      if (e.isIntersecting && !t._lpDrawn) { t._lpDrawn = true; draw(t); }
      t.classList.toggle("is-live", e.isIntersecting);
    });
  }, { rootMargin: "0px 0px -10% 0px" });
  figs.forEach(function (svg) { fo.observe(svg); });
  window.lpReplay = function (scope) {   // used by the kit sheet only
    (scope || document).querySelectorAll("svg.lp-fig").forEach(draw);
  };
})();

/* Sections: nav stuck state; menus close on outside click and Esc. */
(function () {
  "use strict";
  var nav = document.querySelector(".lp-nav");
  if (nav) { var onS = function () { nav.classList.toggle("is-stuck", window.scrollY > 4); }; window.addEventListener("scroll", onS, { passive: true }); onS(); }
  /* close with the roll-up animation: .is-closing plays it, then the drawer really closes */
  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function shut(d) {
    if (!d.open || d.classList.contains("is-closing")) return;
    var panel = d.querySelector(".lp-mega, .lp-burger-panel");
    if (still || !panel) { d.open = false; return; }
    d.classList.add("is-closing");
    var done = function () { clearTimeout(t); panel.removeEventListener("animationend", onEnd); d.classList.remove("is-closing"); d.open = false; };
    var onEnd = function (e) { if (e.target === panel) done(); };
    var t = setTimeout(done, 320);
    panel.addEventListener("animationend", onEnd);
  }
  document.querySelectorAll("details.lp-menu > summary, details.lp-burger > summary").forEach(function (s) {
    s.addEventListener("click", function (e) { var d = s.parentElement; if (d.open) { e.preventDefault(); shut(d); } });
  });
  document.addEventListener("click", function (e) {
    document.querySelectorAll("details.lp-menu[open], details.lp-burger[open]").forEach(function (d) { if (!d.contains(e.target)) shut(d); });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    document.querySelectorAll("details.lp-menu[open], details.lp-burger[open]").forEach(function (d) { shut(d); var s = d.querySelector("summary"); if (s) s.focus(); });
  });
  document.querySelectorAll("details.lp-burger").forEach(function (d) { d.addEventListener("toggle", function () { document.documentElement.style.overflow = d.open ? "hidden" : ""; }); });
})();

/* Pricing: monthly / yearly switch. Prices live in data-month / data-year on .lp-price b. */
(function () {
  "use strict";
  document.querySelectorAll("[data-lp-billing]").forEach(function (seg) {
    var scope = seg.closest("section") || document;
    seg.querySelectorAll("button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var yearly = btn.getAttribute("data-period") === "year";
        seg.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
        scope.querySelectorAll(".lp-price b").forEach(function (b) { b.textContent = yearly ? b.getAttribute("data-year") : b.getAttribute("data-month"); });
        scope.querySelectorAll(".lp-price-note").forEach(function (n) { n.textContent = yearly ? n.getAttribute("data-year") : n.getAttribute("data-month"); });
      });
    });
  });
})();

/* FAQ: smooth open and close. The details element animates its own height; the answer fades in.
   Native details still works without script, and with reduced motion it opens at once. */
(function () {
  "use strict";
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || !Element.prototype.animate) return;
  document.querySelectorAll(".lp-faq details").forEach(function (d) {
    var s = d.querySelector("summary"), anim = null;
    s.addEventListener("click", function (e) {
      e.preventDefault();
      if (anim) anim.cancel();
      var start = d.offsetHeight, opening = !d.open || d.classList.contains("is-closing");
      d.style.overflow = "hidden";
      if (opening) { d.classList.remove("is-closing"); d.open = true; }
      else { d.classList.add("is-closing"); }
      var end = opening ? d.scrollHeight : s.offsetHeight;
      anim = d.animate({ height: [start + "px", end + "px"] }, { duration: opening ? 320 : 260, easing: "cubic-bezier(.4, 0, .2, 1)" });
      anim.onfinish = function () {
        anim = null; d.style.overflow = "";
        if (!opening) { d.open = false; d.classList.remove("is-closing"); }
      };
    });
  });
})();

/* ---- Thread River (supplied by Kaspars, unchanged below) ---- */
/*
 * Feedwrk Thread River — hero background
 * Drop-in, no dependencies. Draws unbroken wires that slowly turn from a tangle
 * (left) into an ordered band (right). Seamless loop, runs at screen refresh rate.
 *
 * Usage:
 *   <div class="hero">
 *     <canvas class="thread-river" aria-hidden="true"></canvas>
 *     ...hero text...
 *   </div>
 *   <script src="thread-river.js" defer><\/script>
 *   <script>
 *     document.addEventListener('DOMContentLoaded', function () {
 *       ThreadRiver.mount(document.querySelector('.thread-river'), { speed: 0.5 });
 *     });
 *   <\/script>
 *
 * The canvas fills its parent; give the parent position: relative and a size.
 */
(function (global) {
  'use strict';

  // ---- Settings: paste your values from "Copy settings" here ----
  var DEFAULTS = {
    speed: 1,        // playback speed multiplier (0.1–3)
    loop: 40,        // seconds for one full motion cycle
    rot: 1,          // bundle turns per loop (0, 1 or 2)
    mess: 0.7,       // size of the tangle (0.2–1)
    wave: 0.35,      // gentle sway of the whole river (0–1)
    n: 150,          // number of threads
    bright: 0.45,    // wire brightness (0.2–1)
    baseY: 0.70,     // vertical position of the river (0 top – 1 bottom); 0.74 on portrait screens
    background: true // false = transparent canvas, use your own CSS background
  };

  function smooth(e0, e1, x) { var t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); }

  function mount(canvas, options) {
    if (!canvas) return null;
    var P = {}, k;
    for (k in DEFAULTS) P[k] = DEFAULTS[k];
    for (k in (options || {})) P[k] = options[k];

    var ctx = canvas.getContext('2d');
    var parent = canvas.parentElement;
    var reduce = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var W = 0, H = 0, dpr = 1, threads = [], vt = 0, last = performance.now();
    var visible = true, raf = 0;

    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.pointerEvents = 'none';

    // seeded random: same bundle on every load
    var seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    function makeThreads() {
      seed = 7; threads = [];
      for (var i = 0; i < P.n; i++) {
        threads.push({
          a: rnd() * Math.PI * 2, r: 0.55 + rnd() * 0.45, k: 1 + Math.floor(rnd() * 2),
          f: 0.6 + rnd() * 1.1, p1: rnd() * Math.PI * 2, p2: rnd() * Math.PI * 2,
          lilac: rnd() < 0.16, o: (i + 0.5) / P.n
        });
      }
    }

    function resize() {
      var r = parent.getBoundingClientRect();
      dpr = Math.min(global.devicePixelRatio || 1, 2);
      W = Math.max(1, Math.round(r.width * dpr));
      H = Math.max(1, Math.round(r.height * dpr));
      canvas.width = W; canvas.height = H;
    }

    function draw(tSec) {
      var ph = (tSec % P.loop) / P.loop * Math.PI * 2;
      ctx.globalCompositeOperation = 'source-over';
      if (P.background) {
        var bg = ctx.createRadialGradient(W * 0.5, H * 0.55, H * 0.05, W * 0.5, H * 0.55, W * 0.75);
        bg.addColorStop(0, '#0c1a20'); bg.addColorStop(1, '#05090c');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      } else {
        ctx.clearRect(0, 0, W, H);
      }

      var baseY = H * (W / H < 1 ? Math.max(P.baseY, 0.74) : P.baseY);
      var messR = H * 0.12 * P.mess / 0.55;
      var bandH = H * 0.075;
      var steps = 140, x0 = -W * 0.04, x1 = W * 1.04;
      var lw = Math.max(0.6, 0.85 * dpr);
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';

      for (var i = 0; i < threads.length; i++) {
        var th = threads[i];
        var hue = th.lilac ? 262 : 204, sat = th.lilac ? 45 : 55;
        var pts = [], depthSum = 0;
        for (var s = 0; s <= steps; s++) {
          var u = s / steps;
          var x = x0 + (x1 - x0) * u;
          var A = 1 - smooth(0.06, 0.62, u);
          var phi = th.a - ph * P.rot + u * 5.0 * A;
          var rr = messR * th.r * (0.35 + 0.65 * A);
          var breathe = A * messR * 0.35 * Math.sin(th.f * u * 9.0 + th.p1 - ph * th.k);
          var orderY = (th.o - 0.5) * bandH;
          var sway = P.wave * H * 0.012 * Math.sin(u * 4.2 - ph) + P.wave * H * 0.006 * Math.sin(u * 9.1 - ph + th.p2 * 0.15);
          pts.push(x, baseY + orderY * (1 - A) + (rr * Math.cos(phi) + breathe) * A + sway);
          depthSum += Math.sin(phi) * A;
        }
        var depth = depthSum / (steps + 1);
        var alpha = P.bright * (0.16 + 0.22 * (0.5 + 0.5 * Math.tanh(depth * 3)));
        ctx.beginPath();
        ctx.moveTo(pts[0], pts[1]);
        for (var q = 2; q < pts.length - 2; q += 2) {
          ctx.quadraticCurveTo(pts[q], pts[q + 1], (pts[q] + pts[q + 2]) / 2, (pts[q + 1] + pts[q + 3]) / 2);
        }
        ctx.lineTo(pts[pts.length - 2], pts[pts.length - 1]);
        ctx.strokeStyle = 'hsla(' + hue + ',' + sat + '%,72%,' + (alpha * 0.10).toFixed(3) + ')';
        ctx.lineWidth = lw * 3.5; ctx.stroke();
        ctx.strokeStyle = 'hsla(' + hue + ',' + sat + '%,82%,' + alpha.toFixed(3) + ')';
        ctx.lineWidth = lw; ctx.stroke();
      }

      if (P.background) {
        ctx.globalCompositeOperation = 'source-over';
        var vg = ctx.createLinearGradient(0, 0, 0, H);
        vg.addColorStop(0, 'rgba(5,9,12,.35)'); vg.addColorStop(0.45, 'rgba(5,9,12,0)'); vg.addColorStop(1, 'rgba(5,9,12,.25)');
        ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      }
    }

    function tick(now) {
      var dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (visible && !document.hidden) { vt += dt * P.speed; draw(vt); }
      raf = global.requestAnimationFrame(tick);
    }

    makeThreads(); resize(); draw(0);

    var ro = new ResizeObserver(function () { resize(); draw(vt); });
    ro.observe(parent);

    // pause when the hero scrolls out of view
    var io = new IntersectionObserver(function (es) { visible = es[0].isIntersecting; last = performance.now(); });
    io.observe(parent);

    // visitors who prefer reduced motion get a still frame
    if (!reduce) raf = global.requestAnimationFrame(tick);

    return {
      set: function (opts) {
        for (var key in opts) P[key] = opts[key];
        if ('n' in opts) makeThreads();
        draw(vt);
      },
      destroy: function () { global.cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); }
    };
  }

  global.ThreadRiver = { mount: mount, defaults: DEFAULTS };
})(window);
/* Hero: mount Thread River on canvas.lp-river with its own background (deep teal glow and soft vignette,
   so it reads like video); the river sits under the words, its centre halfway down the free space below them. */
(function () {
  "use strict";
  function start() {
    if (!window.ThreadRiver) return;
    document.querySelectorAll("canvas.lp-river").forEach(function (cv) {
      var host = cv.parentElement, zone = host.querySelector(".lp-heroimg-text") || host.querySelector(".lp-onimg-text") || host.querySelector(".lp-zone");   // the words themselves
      var MESS = 1;   // settings from Kaspars, 13 Oct (below)
      function fit() {
        var h = host.getBoundingClientRect(), z = zone ? zone.getBoundingClientRect() : null;
        var free = z && h.height ? (z.bottom - h.top) / h.height : 0.35;
        var y = Math.min(0.8, Math.max(0.55, free + (1 - free) * 0.5));
        if (h.width < h.height) y = Math.max(y, 0.74);                       // the river forces this on portrait blocks
        // the tangle reaches about 0.29 x height x mess above its centre: keep it under the words
        var room = Math.max(0.05, y - free - 0.03), mess = Math.min(MESS, room / 0.29);
        return { baseY: y, mess: mess };
      }
      var f0 = fit();
      var river = window.ThreadRiver.mount(cv, { speed: 0.15, loop: 30, rot: 1, mess: f0.mess, wave: 0.85, n: 150, bright: 0.5, background: true, baseY: f0.baseY });
      if (river && "ResizeObserver" in window) new ResizeObserver(function () { river.set(fit()); }).observe(host);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();

/* Store Auditor page: the scan runs on test data (the demo store's result). Pressing Run the scan, or arriving
   from Home with ?url=, shows the real scan steps, then the result with the store name and time. */
(function () {
  "use strict";
  var form = document.querySelector("form[data-audit]"), live = document.querySelector("[data-audit-live]");
  if (!form || !live) return;
  var input = form.querySelector("input"), btn = form.querySelector("button");
  var scan = live.querySelector("[data-scan]"), result = live.querySelector("[data-result]");
  var steps = scan ? scan.querySelectorAll(".lp-steps li") : [];
  var still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // before a scan: a light panel says where the result will appear, so the two dark sections never touch
  var title = scan.querySelector("[data-scan-title]"), titleScan = title.innerHTML;
  result.hidden = true; scan.hidden = false; title.textContent = "Your result appears here";
  function clean(v) { v = (v || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[\/?#]/)[0]; return v || "aster-home.com"; }
  function stamp() { var d = new Date(), m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; function p(n) { return (n < 10 ? "0" : "") + n; } return d.getDate() + " " + m[d.getMonth()] + " " + d.getFullYear() + ", " + p(d.getHours()) + ":" + p(d.getMinutes()); }
  var timer = 0;
  function run() {
    var store = clean(input.value);
    input.value = store;
    clearTimeout(timer);
    result.hidden = true; scan.hidden = false; title.innerHTML = titleScan;
    live.querySelectorAll("[data-scan-store], [data-result-store]").forEach(function (el) { el.textContent = store; });
    steps.forEach(function (li) { li.className = ""; });
    btn.disabled = true;
    live.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
    var i = 0, gap = still ? 120 : 650;
    (function next() {
      if (i > 0) steps[i - 1].className = "done";
      if (i < steps.length) { steps[i].className = "now"; i++; timer = setTimeout(next, gap); return; }
      timer = setTimeout(function () {
        scan.hidden = true; result.hidden = false; btn.disabled = false;
        var t = live.querySelector("[data-result-time]"); if (t) t.textContent = stamp();
        // replay the bars and figures in the result
        live.querySelectorAll(".lp-reveal").forEach(function (el) { el.classList.add("is-in"); });
        var head = live.querySelector("[data-result-head]"); if (head) head.focus({ preventScroll: true });
      }, gap / 2);
    })();
  }
  form.addEventListener("submit", function (e) { e.preventDefault(); run(); });
  var q = new URLSearchParams(location.search).get("url");
  if (q) { input.value = q; run(); }
})();

/* Store Auditor page: the full-review request (test mode) confirms in place; nothing is sent yet. */
(function () {
  "use strict";
  var live = document.querySelector("[data-audit-live]"); if (!live) return;
  var panel = live.querySelector("#auditor-next"), form = panel && panel.querySelector("form"); if (!form) return;
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var mail = form.querySelector('input[type="email"]');
    if (mail && !mail.value.trim()) { mail.focus(); return; }
    var p = document.createElement("p");
    p.className = "lp-body"; p.setAttribute("role", "status"); p.tabIndex = -1;
    p.textContent = "Thanks. We'll send the full review to " + (mail ? mail.value.trim() : "you") + " within one working day.";
    var consent = panel.querySelector(".lp-consent"); if (consent) consent.remove();
    form.replaceWith(p); p.focus();
  });
  }
  window.FeedwrkLanding = { init: init, replay: function (scope) { if (window.lpReplay) window.lpReplay(scope); } };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
