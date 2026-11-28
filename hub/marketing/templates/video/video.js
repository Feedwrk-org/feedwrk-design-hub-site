/* Feedwrk video kit: one engine for walkthroughs and feature films.
   A video is a STORY object: a title card, steps, an end card. Every frame is a pure function of time,
   so the same story renders the same video every time (play live in a browser, or record frame by frame).

   FeedwrkVideo.run(STORY)   -> builds the timeline, mounts the motion background, starts the player.
   window.__T                -> total length in seconds
   window.__render(t)        -> draws the frame at t seconds (used by record.py)
   window.__vo()             -> the voiceover lines with their start and end times
   Add #rec to the page URL to switch off the player for recording. */
(function () {
  "use strict";
  var $ = function (s, root) { return (root || document).querySelector(s); };
  var $$ = function (s, root) { return Array.prototype.slice.call((root || document).querySelectorAll(s)); };
  function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function lin(t, a, b) { return b === a ? (t >= a ? 1 : 0) : clamp((t - a) / (b - a)); }
  function ease(x) { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function eo(x) { x = clamp(x); return 1 - Math.pow(1 - x, 3); }
  function fmt(v, f) {
    if (f === "pct") return Math.round(v) + "%";
    if (f === "dec1") return v.toFixed(1);
    return Math.round(v).toLocaleString("en-US");
  }

  function run(S) {
    var stage = $("#stage"), W = (S.size || [1920, 1080])[0], H = (S.size || [1920, 1080])[1];
    stage.style.width = W + "px"; stage.style.height = H + "px";
    stage.setAttribute("data-theme", S.theme || "dark");
    /* A walkthrough is a draft until its truth table is checked against the app and the backend (see 15-walkthroughs.md). */
    if (S.note) { var nn = document.createElement("div"); nn.className = "v-note"; nn.textContent = S.note; stage.appendChild(nn); }
    if (S.kind === "walkthrough" && !(S.truth && S.truth.verified)) { var nt = document.createElement("div"); nt.className = "v-note v-draft";
      nt.textContent = "Draft · not checked against the app"; stage.appendChild(nt); }

    var TITLE = S.title ? (S.title.dur || 3.6) : 0, END = S.end ? (S.end.dur || 2.6) : 0;
    var APP = S.app || { w: 1440, h: 900, scale: 1.2, top: 272 };
    var win = $(".v-win"), app = $(".v-app");
    if (win) { win.style.width = APP.w + "px"; win.style.height = APP.h + "px"; win.style.top = APP.top + "px"; app.style.width = APP.w + "px"; app.style.height = APP.h + "px"; }
    var VIS_H = (H - APP.top) / APP.scale;               // app pixels visible above the bottom edge

    /* ---- timeline: absolute start/end for each step ---- */
    var t0 = TITLE, steps = S.steps.map(function (st, i) {
      var o = { i: i, s: st, a: t0, b: t0 + st.dur, kind: st.screen ? "win" : "scene" }; t0 += st.dur; return o; });
    var T = t0 + END;

    /* ---- snapshot the starting state of everything an action touches ---- */
    var touched = new Map();
    function snap(el) { if (el && !touched.has(el)) touched.set(el, { text: el.textContent, cls: el.className.baseVal !== undefined ? el.getAttribute("class") : el.className, style: el.getAttribute("style") || "" }); }
    function restore() { touched.forEach(function (v, el) {
      if (el.textContent !== v.text) el.textContent = v.text;
      if (el.className.baseVal !== undefined) el.setAttribute("class", v.cls || ""); else el.className = v.cls;
      el.setAttribute("style", v.style); }); }
    var ACTS = [];
    steps.forEach(function (st) { (st.s.actions || []).forEach(function (a) {
      var A = Object.assign({}, a, { T: st.a + (a.at || 0), step: st });
      if (A.target) { A.els = $$(A.target); A.els.forEach(snap); if (!A.els.length) console.warn("[video] no element for", A.target); }
      if (A.do === "each") { A.els = $$(A.targets); A.els.forEach(snap); }
      ACTS.push(A); }); });
    $$(".v-screen,.v-scene").forEach(snap);

    /* ---- positions inside the app (unscaled) ---- */
    function pos(sel) { var el = typeof sel === "string" ? $(sel) : sel; if (!el) return [APP.w / 2, VIS_H / 2];
      var x = 0, y = 0, w = el.offsetWidth, h = el.offsetHeight;
      if (el instanceof SVGElement) { var r = el.getBoundingClientRect(), ar = app.getBoundingClientRect(), k = ar.width / APP.w; return [(r.left - ar.left) / k + r.width / k / 2, (r.top - ar.top) / k + r.height / k / 2]; }
      while (el && el !== app) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; }
      return [x + w / 2, y + h / 2]; }
    var CUR = [], ZOOM = [], CLICKS = [];
    function build() {
      var p = [APP.w * 0.66, VIS_H * 0.8], z = [1, APP.w / 2, VIS_H / 2];
      CUR = [[0, p[0], p[1]]]; ZOOM = [[0, z[0], z[1], z[2]]]; CLICKS = [];
      ACTS.forEach(function (A) {
        if (A.do === "move") { var q = pos(A.to); var d = A.dur || 0.9;
          CUR.push([A.T, p[0], p[1]]); p = [q[0] + (A.dx || 0), q[1] + (A.dy || 4)]; CUR.push([A.T + d, p[0], p[1]]); }
        if (A.do === "click") CLICKS.push(A.T);
        if (A.do === "zoom") { var f = A.to ? pos(A.to) : [APP.w / 2, VIS_H / 2], d2 = A.dur || 1;
          ZOOM.push([A.T, z[0], z[1], z[2]]); z = [A.z || 1, f[0] + (A.fx || 0), f[1] + (A.fy || 0)]; ZOOM.push([A.T + d2, z[0], z[1], z[2]]); }
      });
      CUR.sort(function (a, b) { return a[0] - b[0]; }); ZOOM.sort(function (a, b) { return a[0] - b[0]; });
    }
    function keyAt(K, t) { if (t <= K[0][0]) return K[0].slice(1);
      for (var i = 0; i < K.length - 1; i++) { var a = K[i], b = K[i + 1]; if (t <= b[0]) { var k = ease(lin(t, a[0], b[0])); return a.slice(1).map(function (v, j) { return v + (b[j + 1] - v) * k; }); } }
      return K[K.length - 1].slice(1); }

    var motion = null;
    if (S.motion && window.FeedwrkPresentations && FeedwrkPresentations.motion) motion = FeedwrkPresentations.motion.mount($("#bg"), Object.assign({ theme: S.theme || "dark" }, S.motion));

    function op(el, v) { if (el) el.style.opacity = v.toFixed(3); }

    function render(t) {
      if (motion) motion.renderAt(t);
      restore();
      /* steps marked plain: true fade the motion ground out, so a chart sits on a quiet page */
      var plainV = 0; steps.forEach(function (s) { if (!s.s.plain) return; var p = steps[s.i - 1], n = steps[s.i + 1];
        var a = p && p.s.plain ? 1 : eo(lin(t, s.a - 0.2, s.a + 0.4)), b = n && n.s.plain ? 1 : 1 - ease(lin(t, s.b - 0.4, s.b + 0.2));
        if (t >= s.a - 0.2 && t < s.b + 0.2) plainV = Math.max(plainV, Math.min(a, b)); });
      var bgc = $("#bg"); if (bgc) bgc.style.opacity = (1 - 0.94 * plainV).toFixed(3);

      /* title, end card, footer */
      op($(".v-title"), S.title ? Math.min(eo(lin(t, 0, 0.5)), 1 - ease(lin(t, TITLE - 0.7, TITLE))) : 0);
      op($(".v-end"), S.end ? eo(lin(t, T - END, T - END + 0.8)) : 0);
      var anyWin = steps.some(function (s) { return s.kind === "win"; });
      op($(".v-foot"), Math.max(1 - eo(lin(t, TITLE - 0.6, TITLE)), eo(lin(t, T - END, T - END + 0.8))));

      /* the step at t, and its neighbours */
      var cur = null; steps.forEach(function (s) { if (t >= s.a && t < s.b) cur = s; });

      /* captions: fade in at a step's start, out at its end unless the next step keeps the same words */
      var cap = $(".v-cap");
      if (cur && cur.s.caption) {
        var prev = steps[cur.i - 1], next = steps[cur.i + 1], same = function (o) { return o && o.s.caption && o.s.caption.h === cur.s.caption.h; };
        var a = same(prev) ? 1 : eo(lin(t, cur.a, cur.a + 0.5)), b = same(next) ? 1 : 1 - ease(lin(t, cur.b - 0.35, cur.b));
        $(".v-cap .v-k").textContent = cur.s.caption.k || ""; $(".v-cap .v-h").textContent = cur.s.caption.h;
        op(cap, Math.min(a, b)); cap.style.transform = "translateY(" + ((1 - (same(prev) ? 1 : eo(lin(t, cur.a, cur.a + 0.5)))) * 12).toFixed(1) + "px)";
      } else op(cap, 0);

      /* screens and scenes: sequential fades, no fade when the next step keeps the same one */
      function vis(key, id) { var v = 0; steps.forEach(function (s) { if (s.s[key] !== id) return;
        var p = steps[s.i - 1], n = steps[s.i + 1];
        var inA = p && p.s[key] === id ? 1 : eo(lin(t, s.a, s.a + 0.3)), outB = n && n.s[key] === id ? 1 : 1 - ease(lin(t, s.b - 0.25, s.b));
        if (t >= s.a - 0.001 && t < s.b) v = Math.max(v, Math.min(inA, outB)); }); return v; }
      $$(".v-screen").forEach(function (el) { op(el, vis("screen", el.dataset.screen)); });
      $$(".v-scene").forEach(function (el) { op(el, vis("scene", el.dataset.scene)); });

      /* window: rises with the first app step of a run, sinks after the last */
      if (win) { var w = 0, dy = 0; steps.forEach(function (s) { if (s.kind !== "win") return;
          var p = steps[s.i - 1], n = steps[s.i + 1], first = !p || p.kind !== "win", last = !n || n.kind !== "win";
          if (t >= s.a - (first ? 1.2 : 0) && t < s.b + (last ? 0.8 : 0)) {
            var up = first ? ease(lin(t, s.a - 1.2, s.a)) : 1, dn = last ? ease(lin(t, s.b, s.b + 0.8)) : 0;
            w = up * (1 - dn); dy = (1 - up) * 820 + dn * 820; } });
        win.style.opacity = w.toFixed(3); win.style.transform = "translateY(" + dy.toFixed(1) + "px) scale(" + APP.scale + ")"; }

      /* actions, in order */
      ACTS.forEach(function (A) {
        var k = A.dur ? clamp((t - A.T) / A.dur) : (t >= A.T ? 1 : 0); if (t < A.T) return;
        switch (A.do) {
          case "text": A.els.forEach(function (el) { el.textContent = A.text; }); break;
          case "class": A.els.forEach(function (el) { if (A.add) A.add.split(" ").forEach(function (c) { el.classList.add(c); });
                                                       if (A.remove) A.remove.split(" ").forEach(function (c) { el.classList.remove(c); }); }); break;
          case "type": A.els.forEach(function (el) { el.textContent = A.text.slice(0, Math.floor(A.text.length * k)); }); break;
          case "count": A.els.forEach(function (el) { el.textContent = (A.prefix || "") + fmt(A.from + (A.to - A.from) * eo(k), A.format) + (A.suffix || ""); }); break;
          case "grow": A.els.forEach(function (el) { el.style[A.prop || "width"] = (A.from + (A.to - A.from) * eo(k)) + (A.unit || "%"); }); break;
          case "show": A.els.forEach(function (el) { el.style.opacity = eo(k).toFixed(3); el.style.transform = "translateY(" + ((1 - eo(k)) * (A.rise || 0)).toFixed(1) + "px)"; }); break;
          case "hide": A.els.forEach(function (el) { el.style.opacity = (1 - ease(k)).toFixed(3); }); break;
          case "draw": A.els.forEach(function (el) { var L = el.getTotalLength(); el.style.strokeDasharray = L; el.style.strokeDashoffset = (L * (1 - ease(k))).toFixed(1); }); break;
          case "each": A.els.forEach(function (el, i) { if (t < A.T + i * (A.every || 0.4)) return;
              if (A.text !== undefined) el.textContent = A.text; if (el.dataset.after !== undefined) el.textContent = el.dataset.after;
              if (A.add) A.add.split(" ").forEach(function (c) { el.classList.add(c); }); if (A.remove) A.remove.split(" ").forEach(function (c) { el.classList.remove(c); }); }); break;
        }
      });
      /* hidden-until-shown elements start transparent */
      ACTS.forEach(function (A) { if (A.do === "show" && t < A.T) A.els.forEach(function (el) { el.style.opacity = 0; }); });
      ACTS.forEach(function (A) { if (A.do === "draw" && t < A.T) A.els.forEach(function (el) { var L = el.getTotalLength(); el.style.strokeDasharray = L; el.style.strokeDashoffset = L; }); });

      /* zoom, cursor, click ripple (inside the app, so they zoom with it) */
      if (app) {
        var z = keyAt(ZOOM, t), zz = z[0], cx = APP.w / 2, cy = VIS_H / 2;
        var tx = Math.min(0, Math.max(APP.w - APP.w * zz, cx - z[1] * zz)), ty = Math.min(0, Math.max(VIS_H - APP.h * zz, cy - z[2] * zz));
        app.style.transform = "translate(" + tx.toFixed(1) + "px," + ty.toFixed(1) + "px) scale(" + zz.toFixed(4) + ")";
        var c = keyAt(CUR, t), press = 0, rv = 0, rs = 1;
        CLICKS.forEach(function (ct) { var d = t - ct; if (d > -0.12 && d < 0.12) press = 1 - Math.abs(d) / 0.12; if (d >= 0 && d < 0.5) { rv = 1 - d / 0.5; rs = 0.4 + d * 2.2; } });
        var cu = $(".v-cursor"), rp = $(".v-ripple");
        cu.style.transform = "translate(" + (c[0] - 3).toFixed(1) + "px," + (c[1] - 2).toFixed(1) + "px) scale(" + (1 - 0.14 * press).toFixed(3) + ")";
        op(cu, cur && cur.kind === "win" && cur.s.cursor !== false ? Math.min(eo(lin(t, cur.a, cur.a + 0.3)), 1) : 0);
        rp.style.transform = "translate(" + c[0].toFixed(1) + "px," + c[1].toFixed(1) + "px) scale(" + rs.toFixed(3) + ")"; op(rp, rv * 0.9);
      }
    }

    /* voiceover: "vo" is what the viewer reads (subtitles), "say" is how the voice must say it (TTS spelling) */
    function vo() { var out = [];
      function add(start, end, o) { if (o && o.vo) out.push({ start: +start.toFixed(2), end: +end.toFixed(2), text: o.vo, say: o.say || o.vo }); }
      if (S.title) add(S.title.voAt || 0.35, TITLE, S.title);
      steps.forEach(function (s) { add(s.a + (s.s.voAt !== undefined ? s.s.voAt : 0.5), s.b, s.s); });
      if (S.end) add(T - END + (S.end.voAt || 0.3), T, S.end); return out; }

    /* fit the stage to the window */
    function fit() { var s = Math.min(innerWidth / W, innerHeight / H), f = $("#fit");
      stage.style.transform = "scale(" + s + ")"; f.style.width = W * s + "px"; f.style.height = H * s + "px";
      f.style.left = (innerWidth - W * s) / 2 + "px"; f.style.top = (innerHeight - H * s) / 2 + "px"; }
    addEventListener("resize", fit); fit();

    build(); if (document.fonts) document.fonts.ready.then(function () { build(); });
    window.__T = T; window.__render = render; window.__rebuild = build; window.__vo = vo;

    if (location.hash === "#rec") { document.documentElement.classList.add("v-rec"); render(0); return; }
    var ctl = document.createElement("div"); ctl.id = "v-ctl";
    ctl.innerHTML = '<button type="button">Pause</button><button type="button">Restart</button><span>0.0 s</span>'; document.body.appendChild(ctl);
    var bP = ctl.children[0], bR = ctl.children[1], tc = ctl.children[2];
    var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches, playing = !reduce, start = performance.now(), at = reduce ? (S.poster || TITLE + 2) : 0;
    function loop(now) { if (playing) at = ((now - start) / 1000) % T; render(at); tc.textContent = at.toFixed(1) + " s"; requestAnimationFrame(loop); }
    bP.onclick = function () { playing = !playing; if (playing) start = performance.now() - at * 1000; bP.textContent = playing ? "Pause" : "Play"; };
    bR.onclick = function () { start = performance.now(); at = 0; if (!playing) { playing = true; bP.textContent = "Pause"; } };
    if (reduce) bP.textContent = "Play";
    requestAnimationFrame(loop);
  }

  window.FeedwrkVideo = { run: run };
})();
