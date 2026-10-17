/* Feedwrk Design System — components/bundle.js
   ProcessMap: draws any process as a map, from data. Optional live mode shows
   where a run is and asks the user for an action at the step that needs them.

   No code:
     <figure class="fw-pm" data-fw-pm>
       <script type="application/json">{ "nodes": [...], "links": [...] }<\/script>
     </figure>
   (Written <\/script> here so this file can be inlined into a page.)

   Code:
     var map = FeedwrkProcessMap.render(element, data);
     map.update({ state: {...} });          // live mode: change statuses and the action
     element.addEventListener("fw-pm-action", function (e) { e.detail.node; e.detail.action; });

   Data
     title       one sentence: what the map shows (screen readers). Required
     caption     optional, one or two sentences under the map
     direction   "right" (default) or "down": which way the process reads. A "right" map that would
                 shrink below 80% to fit turns "down" by itself (fit:false keeps it); the map never scrolls
                 sideways, and a map that would shrink below 60% shows as the list (as on a phone)
     legend      false hides it; legendLabels renames a kind
     groups      [{ id, label }]  nodes join with node.group. (Fixed layout: { label, cols:[a,b], rows:[a,b] })
     nodes       [{ id, role, name, detail?, icon?, group?, badges? }]
                 Give col/row (and span) on every node to place them yourself; leave them out and
                 the map lays itself out from the links.
     links       [{ from, to, kind:"hand"|"key"|"watch"|"fail", label?, route? }]
                 A link that goes back (a retry or a failure) is found by itself and drawn
                 under the map (down: to the right). route:"loop" forces the outer lane.
     state       live mode, see README: { steps: { id: { status, text, progress } }, action: {...} }
                 progress 0..1 draws a bar in the step; dots travel along the line into a running step
                 status: "todo" | "running" | "action" | "done" | "failed" | "skipped"            */
(function () {
  "use strict";
  // Steps 200 x 80. Gaps: 56 across (wider where a label needs it), 48 down (64 with groups).
  var W = 200, H = 80, GX = 56, GY = 48, GYG = 64, GT = 36, GP = 12, M = 16, R = 8, END = 6;
  function gapY(data) { return (data.groups || []).length ? GYG : GY; }
  function labelW(t) { return String(t || "").length * 6.8; }
  // Column x positions from the gaps after each column.
  function axis(n, gaps) { var x = [M]; for (var i = 1; i < n; i++) x[i] = x[i - 1] + W + (gaps[i - 1] || GX); return x; }
  // Lucide 0.575 (the version the prototype ships), copied from lucide-static: never hand-drawn.
  var ICONS = {
    "download": '<path d="M12 15V3" /><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" />',
    "boxes": '<path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z" /><path d="m7 16.5-4.74-2.85" /><path d="m7 16.5 5-3" /><path d="M7 16.5v5.17" /><path d="M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z" /><path d="m17 16.5-5-3" /><path d="m17 16.5 4.74-2.85" /><path d="M17 16.5v5.17" /><path d="M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z" /><path d="M12 8 7.26 5.15" /><path d="m12 8 4.74-2.85" /><path d="M12 13.5V8" />',
    "share-2": '<circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" x2="15.42" y1="13.51" y2="17.49" /><line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />',
    "house": '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" /><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />',
    "settings": '<path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" /><circle cx="12" cy="12" r="3" />',
    "git-pull-request": '<circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><path d="M13 6h3a2 2 0 0 1 2 2v7" /><line x1="6" x2="6" y1="9" y2="21" />',
    "git-merge": '<circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><path d="M6 21V9a9 9 0 0 0 9 9" />',
    "database": '<ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5V19A9 3 0 0 0 21 19V5" /><path d="M3 12A9 3 0 0 0 21 12" />',
    "mouse-pointer-click": '<path d="M14 4.1 12 6" /><path d="m5.1 8-2.9-.8" /><path d="m6 12-1.9 2" /><path d="M7.2 2.2 8 5.1" /><path d="M9.037 9.69a.498.498 0 0 1 .653-.653l11 4.5a.5.5 0 0 1-.074.949l-4.349 1.041a1 1 0 0 0-.74.739l-1.04 4.35a.5.5 0 0 1-.95.074z" />',
    "user": '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />',
    "sparkles": '<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" /><path d="M20 2v4" /><path d="M22 4h-4" /><circle cx="4" cy="20" r="2" />',
    "store": '<path d="M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5" /><path d="M17.774 10.31a1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.451 0 1.12 1.12 0 0 0-1.548 0 2.5 2.5 0 0 1-3.452 0 1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.77-3.248l2.889-4.184A2 2 0 0 1 7 2h10a2 2 0 0 1 1.653.873l2.895 4.192a2.5 2.5 0 0 1-3.774 3.244" /><path d="M4 10.95V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.05" />',
    "monitor": '<rect width="20" height="14" x="2" y="3" rx="2" /><line x1="8" x2="16" y1="21" y2="21" /><line x1="12" x2="12" y1="17" y2="21" />',
    "check": '<path d="M20 6 9 17l-5-5" />',
    "list-checks": '<path d="M13 5h8" /><path d="M13 12h8" /><path d="M13 19h8" /><path d="m3 17 2 2 4-4" /><path d="m3 7 2 2 4-4" />',
    "send": '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" /><path d="m21.854 2.147-10.94 10.939" />',
    "plug": '<path d="M12 22v-5" /><path d="M15 8V2" /><path d="M17 8a1 1 0 0 1 1 1v4a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1z" /><path d="M9 8V2" />',
    "columns": '<rect width="18" height="18" x="3" y="3" rx="2" /><path d="M12 3v18" />',
    "mail": '<path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" /><rect x="2" y="4" width="20" height="16" rx="2" />',
    "file-text": '<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" /><path d="M14 2v5a1 1 0 0 0 1 1h5" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" />'
  };

  var STATUS_WORD = { todo: "Not started", running: "Running", action: "Needs you", done: "Done", failed: "Failed", skipped: "Skipped" };
  var KIND_LABEL = { hand: "Hands work on", key: "The main path", watch: "Watches or retries", fail: "A failure goes back" };
  var KINDS = ["hand", "key", "watch", "fail"];

  function reduced() { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ---------- layout ---------- */

  // Fixed layout: every node says where it goes.
  function fixedLayout(data) {
    var gy = gapY(data), top = M + ((data.groups || []).length ? GT : 0), box = {}, gaps = [], cols = 1, byId = {};
    data.nodes.forEach(function (n) { byId[n.id] = n; cols = Math.max(cols, n.col + (n.span || 1)); });
    (data.links || []).forEach(function (L) { // a label between two steps side by side widens that gap
      var a = byId[L.from], b = byId[L.to];
      if (!L.label || !a || !b || a.row !== b.row) return;
      var left = a.col < b.col ? a : b, right = left === a ? b : a, c = left.col + (left.span || 1) - 1;
      if (right.col === c + 1) gaps[c] = Math.max(gaps[c] || GX, labelW(L.label) + 40);
    });
    var cx = axis(cols, gaps);
    data.nodes.forEach(function (n) {
      var span = n.span || 1, x = cx[n.col], x2 = cx[n.col + span - 1] + W;
      box[n.id] = { x: x, y: top + n.row * (H + gy), w: x2 - x, h: H, n: n };
    });
    return { box: box, auto: false, top: top, gy: gy, colX: cx };
  }

  // Auto layout: ranks from the links (longest path), back links found by a depth-first walk,
  // long links get placeholder cells so they never run through a node, rows ordered to keep lines straight.
  function autoLayout(data) {
    var nodes = data.nodes, links = data.links || [], down = data.direction === "down";
    var idx = {}, out = {}, back = {};
    nodes.forEach(function (n, i) { idx[n.id] = i; out[n.id] = []; });
    links.forEach(function (L, i) { if (idx[L.from] != null && idx[L.to] != null) out[L.from].push(i); });
    // 1. Ranks from the main links (hand, key) first; a cycle among them is broken by a depth-first walk.
    // 2. A watch or fail link goes back when it points to an earlier or equal rank; otherwise it counts too.
    var soft = function (i) { return links[i].kind === "watch" || links[i].kind === "fail"; };
    function ranks(use) {
      var seen = {}, stack = {}, cut = {};
      function dfs(id) {
        seen[id] = 1; stack[id] = 1;
        out[id].forEach(function (i) {
          if (!use(i)) return;
          var t = links[i].to;
          if (stack[t] || t === id) cut[i] = 1; else if (!seen[t]) dfs(t);
        });
        stack[id] = 0;
      }
      nodes.forEach(function (n) { if (!seen[n.id]) dfs(n.id); });
      var rank = {}, indeg = {};
      nodes.forEach(function (n) { rank[n.id] = 0; indeg[n.id] = 0; });
      links.forEach(function (L, i) { if (use(i) && !cut[i] && idx[L.from] != null && idx[L.to] != null) indeg[L.to]++; });
      var q = nodes.filter(function (n) { return !indeg[n.id]; }).map(function (n) { return n.id; });
      while (q.length) {
        var id = q.shift();
        out[id].forEach(function (i) {
          if (!use(i) || cut[i]) return;
          var t = links[i].to;
          rank[t] = Math.max(rank[t], rank[id] + 1);
          if (--indeg[t] === 0) q.push(t);
        });
      }
      return { rank: rank, cut: cut };
    }
    var main = function (i) { return !soft(i) && links[i].route !== "loop"; };
    var first = ranks(main);
    function reaches(from, to) { // is there a path of main links from `from` to `to`?
      var seen = {}, st = [from];
      while (st.length) {
        var id = st.pop(); if (id === to) return true; if (seen[id]) continue; seen[id] = 1;
        out[id].forEach(function (i) { if (main(i) && !first.cut[i]) st.push(links[i].to); });
      }
      return false;
    }
    links.forEach(function (L, i) {
      if (idx[L.from] == null || idx[L.to] == null) return;
      if (L.route === "loop" || first.cut[i] || L.from === L.to || (soft(i) && reaches(L.to, L.from))) back[i] = 1;
    });
    var second = ranks(function (i) { return !back[i]; });
    var rank = second.rank;
    Object.keys(second.cut).forEach(function (i) { back[i] = 1; });
    // keep a group's nodes in their own ranks where possible: no change needed, groups follow the flow
    var layers = [], cells = {}, chains = {};
    function put(key, r, order) { (layers[r] = layers[r] || []).push({ key: key, order: order }); }
    nodes.forEach(function (n, i) { put(n.id, rank[n.id], i); });
    links.forEach(function (L, i) {
      if (back[i] || idx[L.from] == null || idx[L.to] == null) return;
      var c = [L.from];
      for (var r = rank[L.from] + 1; r < rank[L.to]; r++) { var k = "~" + i + "_" + r; put(k, r, idx[L.from] + 0.5); c.push(k); }
      c.push(L.to); chains[i] = c;
    });
    // neighbours (previous layer) for ordering
    var prev = {}, next = {};
    Object.keys(chains).forEach(function (i) {
      var c = chains[i];
      for (var j = 1; j < c.length; j++) { (prev[c[j]] = prev[c[j]] || []).push(c[j - 1]); (next[c[j - 1]] = next[c[j - 1]] || []).push(c[j]); }
    });
    var pos = {};
    function index() { layers.forEach(function (l) { l.forEach(function (c, i) { pos[c.key] = i; }); }); }
    var gi = {};
    (data.groups || []).forEach(function (g, i) { gi[g.id || g.label] = i; });
    var grp = function (key) { var n = nodes[idx[key]]; return n && n.group != null && gi[n.group] != null ? gi[n.group] : -1; };
    layers.forEach(function (l) { l.sort(function (a, b) { return a.order - b.order; }); });
    index();
    for (var pass = 0; pass < 4; pass++) {
      var range = pass % 2 ? layers.slice().reverse() : layers;
      range.forEach(function (l) {
        l.forEach(function (c) {
          var nb = (pass % 2 ? next : prev)[c.key] || [];
          c.bc = nb.length ? nb.reduce(function (s, k) { return s + pos[k]; }, 0) / nb.length : pos[c.key];
        });
        l.sort(function (a, b) { var ga = grp(a.key), gb = grp(b.key); return (ga !== gb && ga >= 0 && gb >= 0 ? ga - gb : 0) || a.bc - b.bc || a.order - b.order; });
        l.forEach(function (c, i) { pos[c.key] = i; });
      });
    }
    // The spine: the longest run of main links (key counts double) from a first step.
    // It is drawn as one straight row; every other step sits below it.
    var spine = {}, best = {}, nxt = {};
    var order = nodes.map(function (n) { return n.id; }).sort(function (a, b) { return rank[b] - rank[a]; });
    order.forEach(function (id) {
      best[id] = 0;
      out[id].forEach(function (i) {
        var L = links[i];
        if (back[i] || soft(i) || idx[L.to] == null) return;
        var v = best[L.to] + (L.kind === "key" ? 2 : 1);
        if (v > best[id]) { best[id] = v; nxt[id] = i; }
      });
    });
    var start = null;
    nodes.forEach(function (n) { if (rank[n.id] === 0 && (start === null || best[n.id] > best[start])) start = n.id; });
    for (var at = start; at != null;) {
      spine[at] = 1;
      var li = nxt[at];
      if (li == null) break;
      (chains[li] || []).forEach(function (k) { spine[k] = 1; });
      at = links[li].to;
    }
    layers.forEach(function (l) {
      l.sort(function (a, b) { return (spine[b.key] ? 1 : 0) - (spine[a.key] ? 1 : 0); });
    });
    // rows: the spine on row 0, the rest line up with their first neighbour before, never two in one slot
    var slot = {};
    layers.forEach(function (l) {
      var last = -1;
      l.forEach(function (c) {
        if (spine[c.key]) { slot[c.key] = 0; last = 0; return; }
        var nb = prev[c.key] || [];
        var want = nb.length ? Math.min.apply(null, nb.map(function (k) { return slot[k]; })) : 0;
        if (nb.length > 1) want = Math.round(nb.reduce(function (s, k) { return s + slot[k]; }, 0) / nb.length);
        slot[c.key] = Math.max(want, last + 1); last = slot[c.key];
      });
    });
    var gy = gapY(data), top = M + ((data.groups || []).length ? GT : 0), box = {}, gaps = [];
    if (!down) links.forEach(function (L, i) { // a label in the gap after a rank widens it
      if (L.label && !back[i] && rank[L.to] === rank[L.from] + 1) gaps[rank[L.from]] = Math.max(gaps[rank[L.from]] || GX, labelW(L.label) + 40);
    });
    var cx = axis(layers.length, gaps);
    // Left to right: rows sit 24 apart; 64 where two groups stack, 48 where a line runs back under a row.
    var rowGap = [], rowY = [];
    if (!down) {
      layers.forEach(function (l) {
        l.forEach(function (c) {
          l.forEach(function (d) {
            if (slot[d.key] !== slot[c.key] + 1) return;
            var gc = nodes[idx[c.key]] && nodes[idx[c.key]].group, gd = nodes[idx[d.key]] && nodes[idx[d.key]].group;
            var split = (data.groups || []).length && idx[c.key] != null && idx[d.key] != null && gc !== gd;
            rowGap[slot[c.key]] = Math.max(rowGap[slot[c.key]] || 24, split ? GYG : 24);
          });
        });
      });
      links.forEach(function (L, i) {
        if (!back[i] || L.route === "loop" || idx[L.from] == null || idx[L.to] == null) return;
        var sl = Math.max(slot[L.from], slot[L.to]);
        rowGap[sl] = Math.max(rowGap[sl] || 24, GY);
      });
      var maxSlot = 0; Object.keys(slot).forEach(function (k) { maxSlot = Math.max(maxSlot, slot[k]); });
      rowY[0] = top; for (var q = 1; q <= maxSlot; q++) rowY[q] = rowY[q - 1] + H + (rowGap[q - 1] || 24);
    }
    function cell(r, s) {
      return down ? { x: M + s * (W + GX), y: top + r * (H + gy), w: W, h: H, r: r, s: s } : { x: cx[r], y: rowY[s], w: W, h: H, r: r, s: s };
    }
    layers.forEach(function (l, r) { l.forEach(function (c) { var b = cell(r, slot[c.key]); if (idx[c.key] != null) b.n = nodes[idx[c.key]]; cells[c.key] = b; if (b.n) box[c.key] = b; }); });
    return { box: box, cells: cells, chains: chains, back: back, auto: true, down: down, top: top, gy: gy, rowGap: down ? null : rowGap };
  }

  /* ---------- lines ---------- */

  function pathOf(p) {
    var d = "M" + p[0][0] + " " + p[0][1];
    for (var i = 1; i < p.length - 1; i++) {
      var t1 = toward(p[i], p[i - 1]), t2 = toward(p[i], p[i + 1]);
      d += " L" + t1[0] + " " + t1[1] + " Q" + p[i][0] + " " + p[i][1] + " " + t2[0] + " " + t2[1];
    }
    return d + " L" + p[p.length - 1][0] + " " + p[p.length - 1][1];
  }
  function toward(a, b) {
    var dx = b[0] - a[0], dy = b[1] - a[1], L = Math.max(Math.abs(dx), Math.abs(dy)), r = Math.min(R, L / 2);
    return L ? [a[0] + dx / L * r, a[1] + dy / L * r] : a;
  }
  function clean(p) { // drop points that sit on a straight run
    return p.filter(function (q, i) {
      if (i === 0 || i === p.length - 1) return true;
      var a = p[i - 1], b = p[i + 1];
      return !((a[0] === q[0] && q[0] === b[0]) || (a[1] === q[1] && q[1] === b[1]));
    });
  }

  // Auto layout: through the cells of the chain, bending only in the gap before a cell.
  function chainRoute(chain, cells, down, gy) {
    var a = cells[chain[0]], t = cells[chain[chain.length - 1]];
    var p = down ? [[a.x + a.w / 2, a.y + a.h]] : [[a.x + a.w, a.y + a.h / 2]];
    var cur = down ? p[0][0] : p[0][1];
    for (var j = 1; j < chain.length; j++) {
      var b = cells[chain[j]], want = down ? b.x + b.w / 2 : b.y + b.h / 2;
      if (want !== cur) {
        var before = cells[chain[j - 1]];
        if (down) { var y = b.y - gy / 2; p.push([cur, y], [want, y]); }
        else { var x = before.x + before.w + 16; p.push([x, cur], [x, want]); }
        cur = want;
      }
    }
    p.push(down ? [cur, t.y - END] : [t.x - END, cur]);
    return clean(p);
  }
  // A link that goes back: under the two nodes (down: to their right), in its own lane.
  function backRoute(a, b, lane, down, outer, ext, gy) {
    if (down) {
      var x = (outer ? ext.right + 28 : Math.max(a.x + a.w, b.x + b.w) + GX / 2) + lane * 14;
      return [[a.x + a.w, a.y + a.h / 2 + 10], [x, a.y + a.h / 2 + 10], [x, b.y + b.h / 2 + 10], [b.x + b.w + END, b.y + b.h / 2 + 10]];
    }
    var y = (outer ? ext.bottom + 24 : Math.max(a.y + a.h, b.y + b.h) + gy / 2) + lane * 12;
    return [[a.x + a.w / 2 + 12, a.y + a.h], [a.x + a.w / 2 + 12, y], [b.x + b.w / 2 + 12, y], [b.x + b.w / 2 + 12, b.y + b.h + END]];
  }

  // Fixed layout routes (from 1.6.0): straight, one bend, fork, loop.
  function overlap(a, b) { return Math.max(a.x, b.x) < Math.min(a.x + a.w, b.x + b.w); }
  function sharedX(a, b) {
    var ca = a.x + a.w / 2, cb = b.x + b.w / 2;
    if (a.w <= W && b.x <= ca && ca <= b.x + b.w) return ca;
    if (b.w <= W && a.x <= cb && cb <= a.x + a.w) return cb;
    return (Math.max(a.x, b.x) + Math.min(a.x + a.w, b.x + b.w)) / 2;
  }
  function fixedRoute(L, a, b, loopY, gy) {
    var off = L.offset || 0, r = L.route || "auto";
    var amy = a.y + a.h / 2, bmy = b.y + b.h / 2, acx = a.x + a.w / 2 + off, bcx = b.x + b.w / 2 + off, down = b.y > a.y;
    if (r === "loop") return [[acx, a.y + a.h], [acx, loopY], [bcx, loopY], [bcx, b.y + b.h + END]];
    if (r === "fork") { var fy = b.y - gy / 2 + (down ? 0 : gy); return [[acx, a.y + a.h], [acx, fy], [bcx, fy], [bcx, b.y - END]]; }
    if (r === "auto" && a.y === b.y) return b.x > a.x ? [[a.x + a.w, amy + off], [b.x - END, amy + off]] : [[a.x, amy + off], [b.x + b.w + END, amy + off]];
    if (r === "auto" && overlap(a, b)) { var x = sharedX(a, b) + off; return down ? [[x, a.y + a.h], [x, b.y - END]] : [[x, a.y], [x, b.y + b.h + END]]; }
    if (r === "hv") { var sx = b.x > a.x ? a.x + a.w : a.x; return [[sx, amy], [bcx, amy], [bcx, down ? b.y - END : b.y + b.h + END]]; }
    var sy = down ? a.y + a.h : a.y, ex = b.x > a.x ? b.x - END : b.x + b.w + END;
    return [[acx, sy], [acx, bmy], [ex, bmy]];
  }

  function labelSvg(L, pts, cls, down) {
    var best = 0, len = -1;
    for (var pass = 0; pass < 2 && len < 0; pass++) {
      for (var i = 0; i < pts.length - 1; i++) {
        var horiz = pts[i][1] === pts[i + 1][1];
        if (pass === 0 && horiz === !!down) continue; // first look for the preferred direction
        var l = Math.abs(pts[i + 1][0] - pts[i][0]) + Math.abs(pts[i + 1][1] - pts[i][1]);
        if (l > len && l >= 24) { len = l; best = i; }
      }
    }
    if (len < 0) best = 0;
    var p = pts[best], q = pts[best + 1], mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
    var at = L.labelAt || (p[1] === q[1] ? "above" : "right"), c = 'class="fw-pm-lbl ' + cls + '"', t = esc(L.label), lw = String(L.label).length * 6.8;
    labelSvg.right = at === "right" ? mx + 8 + lw : at === "left" ? mx : mx + lw / 2;
    if (at === "left") return "<text " + c + ' x="' + (mx - 8) + '" y="' + (my + 4) + '" text-anchor="end">' + t + "</text>";
    if (at === "right") return "<text " + c + ' x="' + (mx + 8) + '" y="' + (my + 4) + '">' + t + "</text>";
    if (at === "below") return "<text " + c + ' x="' + mx + '" y="' + (my + 18) + '" text-anchor="middle">' + t + "</text>";
    return "<text " + c + ' x="' + mx + '" y="' + (my - 8) + '" text-anchor="middle">' + t + "</text>";
  }

  /* ---------- live state ---------- */

  function stepOf(data, id) {
    var s = data.state && data.state.steps && data.state.steps[id];
    if (!data.state) return null;
    if (typeof s === "string") return { status: s };
    return s || { status: "todo" };
  }
  function statusIcon(st, x, y) {
    if (st === "done") return '<g class="fw-pm-st done"><circle cx="' + x + '" cy="' + y + '" r="9"/><path d="M' + (x - 3.5) + " " + y + " l2.5 2.5 4.5 -5\"/></g>";
    if (st === "failed") return '<g class="fw-pm-st failed"><circle cx="' + x + '" cy="' + y + '" r="8"/><path d="M' + (x - 3) + " " + (y - 3) + " l6 6 M" + (x + 3) + " " + (y - 3) + ' l-6 6"/></g>';
    if (st === "action") return '<g class="fw-pm-st action"><circle cx="' + x + '" cy="' + y + '" r="8"/><path d="M' + x + " " + (y - 4) + " v4.5 M" + x + " " + (y + 3.5) + ' v.5"/></g>';
    if (st === "running") return '<g class="fw-pm-st running"><circle class="halo" cx="' + x + '" cy="' + y + '" r="7"/><circle cx="' + x + '" cy="' + y + '" r="4"/></g>';
    return "";
  }

  /* ---------- drawing ---------- */

  // Shorten text to fit a width (approximate glyph widths per style); the full text stays in a <title>.
  function fitText(t, px, per) {
    t = String(t || ""); var max = Math.floor(px / per);
    return t.length > max ? t.slice(0, Math.max(1, max - 1)).replace(/\s+$/, "") + "…" : t;
  }
  // A step: role (eyebrow), then the name with a 14px icon before it, as in the sidebar
  // (Lucide, 1.5px, muted-foreground), then one detail line. Status mark top right;
  // badges at the right of the name row; progress bar under the text.
  function nodeSvg(b, data) {
    var n = b.n, x = b.x, y = b.y, step = stepOf(data, n.id), st = step ? step.status : "";
    var act = data.state && data.state.action && data.state.action.node === n.id;
    var hasIcon = n.icon && ICONS[n.icon], tx = x + 16, nx = tx + (hasIcon ? 20 : 0), right = x + b.w - 16;
    var s = '<g class="fw-pm-node' + (st ? " is-" + st : "") + '" data-node="' + esc(n.id) + '"' +
      (act ? ' tabindex="0" role="button" aria-label="' + esc(n.name + ": " + (data.state.action.title || "action needed")) + '"' : "") +
      '><title>' + esc(n.role + " · " + n.name + (n.detail ? " · " + n.detail : "")) + '</title><rect x="' + x + '" y="' + y + '" width="' + b.w + '" height="' + b.h + '" rx="8"/>';
    if (hasIcon) s += '<svg class="fw-pm-ico" x="' + tx + '" y="' + (y + 34) + '" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">' + ICONS[n.icon] + "</svg>";
    var mark = st && st !== "todo" && st !== "skipped", roleRight = right - (mark ? 24 : 0);
    s += '<text class="fw-pm-role" x="' + tx + '" y="' + (y + 25) + '">' + esc(fitText(n.role, roleRight - tx, 7.6)) + "</text>";
    if (st) s += statusIcon(st, x + b.w - 22, y + 21);
    var badges = !step ? (n.badges || []) : [], bw = 0, bs = "";
    if (badges.length) {
      var bx = right;
      badges.slice().reverse().forEach(function (bd) {
        var w = Math.round(String(bd.text).length * 6.4 + 26); bx -= w;
        bs += '<g class="fw-pm-badge ' + esc(bd.tone || "") + '"><rect x="' + bx + '" y="' + (y + 32) + '" width="' + w + '" height="20" rx="10"/><circle cx="' + (bx + 13) + '" cy="' + (y + 42) + '" r="3"/><text x="' + (bx + 21) + '" y="' + (y + 46) + '">' + esc(bd.text) + "</text></g>";
        bx -= 6;
      });
      bw = right - bx + 4;
    }
    s += '<text class="fw-pm-name" x="' + nx + '" y="' + (y + 46) + '">' + esc(fitText(n.name, right - nx - bw, 7.6)) + "</text>" + bs;
    var detail = step ? (step.text || STATUS_WORD[st] || "") : n.detail;
    if (detail) s += '<text class="fw-pm-detail' + (st ? " st-" + st : "") + '" x="' + tx + '" y="' + (y + 64) + '">' + esc(fitText(detail, right - tx, 6.1)) + "</text>";
    if (step && typeof step.progress === "number") {
      var pw = right - tx, pv = Math.max(0, Math.min(1, step.progress));
      s += '<rect class="fw-pm-prog-track" x="' + tx + '" y="' + (y + b.h - 8) + '" width="' + pw + '" height="3" rx="1.5"/>' +
        '<rect class="fw-pm-prog-bar" x="' + tx + '" y="' + (y + b.h - 8) + '" width="' + Math.round(pw * pv) + '" height="3" rx="1.5"/>';
    }
    return s + "</g>";
  }

  function build(data, uid) {
    var fixed = data.nodes.every(function (n) { return n.col != null && n.row != null; });
    var lay = fixed ? fixedLayout(data) : autoLayout(data);
    var box = lay.box, live = !!data.state, out = [], labels = [], flows = [];
    // extent of the nodes, for lanes
    var ext = { right: 0, bottom: 0 };
    Object.keys(box).forEach(function (k) { ext.right = Math.max(ext.right, box[k].x + box[k].w); ext.bottom = Math.max(ext.bottom, box[k].y + box[k].h); });
    // groups
    var gbox = [];
    (data.groups || []).forEach(function (g) {
      var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      if (fixed && g.cols) {
        x0 = lay.colX[g.cols[0]]; x1 = lay.colX[g.cols[1]] + W; y0 = lay.top + g.rows[0] * (H + lay.gy); y1 = lay.top + g.rows[1] * (H + lay.gy) + H;
      } else {
        data.nodes.forEach(function (n) { if (n.group === (g.id || g.label) && box[n.id]) { var b = box[n.id]; x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h); } });
      }
      if (x0 > x1) return;
      gbox.push({ x: x0 - GP, y: y0 - GT, w: x1 - x0 + GP * 2, h: y1 - y0 + GT + GP, label: g.label });
      ext.bottom = Math.max(ext.bottom, y1 + GP); ext.right = Math.max(ext.right, x1 + GP);
    });
    // Groups side by side share one band (same top and bottom); stacked groups keep their own.
    var across = !lay.down, clash = false;
    gbox.forEach(function (a, i) { gbox.forEach(function (b, j) {
      if (i < j && (across ? Math.max(a.x, b.x) < Math.min(a.x + a.w, b.x + b.w) : Math.max(a.y, b.y) < Math.min(a.y + a.h, b.y + b.h))) clash = true;
    }); });
    if (gbox.length > 1 && !clash) {
      if (across) {
        var t0 = Math.min.apply(null, gbox.map(function (g) { return g.y; })), t1 = Math.max.apply(null, gbox.map(function (g) { return g.y + g.h; }));
        gbox.forEach(function (g) { g.y = t0; g.h = t1 - t0; });
      } else {
        var l0 = Math.min.apply(null, gbox.map(function (g) { return g.x; })), l1 = Math.max.apply(null, gbox.map(function (g) { return g.x + g.w; }));
        gbox.forEach(function (g) { g.x = l0; g.w = l1 - l0; });
      }
    }
    gbox.forEach(function (g) {
      out.push('<g class="fw-pm-group"><rect x="' + g.x + '" y="' + g.y + '" width="' + g.w + '" height="' + g.h + '" rx="10"/><text class="fw-pm-role" x="' + (g.x + 14) + '" y="' + (g.y + 23) + '">' + esc(g.label) + "</text></g>");
    });
    // lines
    var lanes = {}, maxX = ext.right, maxY = ext.bottom;
    (data.links || []).forEach(function (L, i) {
      var a = box[L.from], b = box[L.to];
      if (!a || !b) { if (window.console) console.warn("ProcessMap: unknown node in link", L); return; }
      var pts;
      if (!fixed && lay.back[i]) {
        var outer = L.route === "loop", key = outer ? "outer" : "in" + Math.max(lay.down ? a.x + a.w : a.y + a.h, lay.down ? b.x + b.w : b.y + b.h);
        lanes[key] = (lanes[key] || 0); pts = backRoute(a, b, lanes[key]++, lay.down, outer, ext, lay.rowGap ? (lay.rowGap[Math.max(a.s, b.s)] || GY) : lay.gy);
      } else if (!fixed) pts = chainRoute(lay.chains[i], lay.cells, lay.down, lay.gy);
      else {
        var lane = 0;
        if (L.route === "loop") { lane = lanes.outer || 0; lanes.outer = lane + 1; }
        pts = fixedRoute(L, a, b, ext.bottom + 24 + lane * 12, lay.gy);
      }
      pts.forEach(function (p) { maxX = Math.max(maxX, p[0]); maxY = Math.max(maxY, p[1]); });
      var k = KINDS.indexOf(L.kind) >= 0 ? L.kind : "hand", cls = k;
      if (live) {
        var sa = stepOf(data, L.from).status, sb = stepOf(data, L.to).status;
        var on = (sa === "done" || sa === "skipped") && sb !== "todo";
        if (k === "fail") on = sa === "failed";
        cls = k + (on ? " is-on" : " is-off");
      }
      var mk = live ? (k === "fail" ? (cls.indexOf("is-on") > 0 ? "fail" : "off") : (cls.indexOf("is-on") > 0 ? "on" : "off")) : k;
      var pid = uid + "-l" + i, flow = live && k !== "fail" && cls.indexOf("is-on") > 0 && stepOf(data, L.to).status === "running";
      out.push('<path id="' + pid + '" class="fw-pm-ln ' + cls + (flow ? " is-flow" : "") + '" d="' + pathOf(pts) + '" marker-end="url(#' + uid + "-" + mk + ')"/>');
      if (flow && !reduced()) {
        var len = 0; for (var j = 1; j < pts.length; j++) len += Math.abs(pts[j][0] - pts[j - 1][0]) + Math.abs(pts[j][1] - pts[j - 1][1]);
        var dur = Math.max(1.4, len / 110).toFixed(2);
        flows.push('<g class="fw-pm-flow" aria-hidden="true">' + [0, 1, 2].map(function (q) {
          return '<circle r="3"><animateMotion dur="' + dur + 's" begin="-' + (q * dur / 3).toFixed(2) + 's" repeatCount="indefinite" keyPoints="0;0.94" keyTimes="0;1" calcMode="linear"><mpath href="#' + pid + '"/></animateMotion></circle>';
        }).join("") + "</g>");
      }
      if (L.label) {
        labels.push(labelSvg(L, pts, cls, lay.down));
        maxX = Math.max(maxX, labelSvg.right);
      }
    });
    out = out.concat(flows);
    Object.keys(box).forEach(function (id) { out.push(nodeSvg(box[id], data)); });
    var width = Math.ceil(Math.max(maxX, ext.right) + M), height = Math.ceil(maxY + M);
    var grid = '<g class="fw-pm-grid" aria-hidden="true">';
    var colsX = {}, rowsY = {};
    Object.keys(box).forEach(function (k) { colsX[box[k].x] = 1; rowsY[box[k].y] = 1; });
    Object.keys(colsX).forEach(function (x) { grid += '<rect x="' + x + '" y="0" width="' + W + '" height="' + height + '"/>'; });
    Object.keys(rowsY).forEach(function (y) { var yy = +y; grid += '<line x1="0" x2="' + width + '" y1="' + yy + '" y2="' + yy + '"/><line x1="0" x2="' + width + '" y1="' + (yy + H) + '" y2="' + (yy + H) + '"/>'; });
    grid += "</g>";
    var defs = "<defs>" + ["hand", "key", "watch", "fail", "on", "off"].map(function (k) {
      return '<marker id="' + uid + "-" + k + '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path class="fw-pm-mk ' + k + '" d="M1 1 8 5 1 9"/></marker>';
    }).join("") + "</defs>";
    var svg = '<svg class="fw-pm-svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + " " + height + '" role="img" aria-labelledby="' + uid + '-t"><title id="' + uid + '-t">' + esc(data.title || "Process map") + "</title>" + defs + grid + out.join("") + labels.join("") + "</svg>";
    return { svg: svg, width: width, height: height, box: box };
  }

  function actionCard(a, cls, stepName) {
    var p = a.primary, s = a.secondary;
    return '<div class="fw-pm-action ' + (cls || "") + (a.tone === "bad" ? " is-bad" : "") + '" role="group" aria-label="' + esc(a.title) + '">' +
      '<div class="fw-pm-action-head"><span class="fw-pm-action-dot"></span>' + esc(a.eyebrow || "Action needed") + (stepName ? '<span class="fw-pm-action-step">' + esc(stepName) + "</span>" : "") + "</div>" +
      '<div class="fw-pm-action-title">' + esc(a.title) + "</div>" +
      (a.text ? '<div class="fw-pm-action-text">' + esc(a.text) + "</div>" : "") +
      '<div class="fw-pm-action-btns">' +
      (p ? '<button type="button" class="fw-btn default sm" data-pm-action="' + esc(p.id) + '">' + esc(p.label) + "</button>" : "") +
      (s ? '<button type="button" class="fw-btn ghost sm" data-pm-action="' + esc(s.id) + '">' + esc(s.label) + "</button>" : "") +
      "</div></div>";
  }

  // Under 640px: groups stack, each node lists its lines and its status; the action card sits under its step.
  function narrow(data, lay) {
    var byId = {}, nodes = data.nodes.slice();
    nodes.forEach(function (n) { byId[n.id] = n; });
    nodes.sort(function (a, b) { var A = lay.box[a.id], B = lay.box[b.id]; return (A.x - B.x) || (A.y - B.y); });
    if (data.direction === "down" || lay.down) nodes.sort(function (a, b) { var A = lay.box[a.id], B = lay.box[b.id]; return (A.y - B.y) || (A.x - B.x); });
    var groups = data.groups || [], act = data.state && data.state.action;
    function inGroup(n, g) {
      if (g.cols) return n.col >= g.cols[0] && n.col <= g.cols[1] && n.row >= g.rows[0] && n.row <= g.rows[1];
      return n.group === (g.id || g.label);
    }
    var buckets = groups.map(function (g) { return { g: g, items: [] }; }), loose = { g: null, items: [] };
    nodes.forEach(function (n) {
      for (var i = 0; i < groups.length; i++) if (inGroup(n, groups[i])) { buckets[i].items.push(n); return; }
      loose.items.push(n);
    });
    var all = buckets.concat(loose.items.length ? [loose] : []);
    all.sort(function (a, b) { return a.items.length && b.items.length ? nodes.indexOf(a.items[0]) - nodes.indexOf(b.items[0]) : 0; });
    var html = '<div class="fw-pmn">';
    all.forEach(function (bk) {
      if (!bk.items.length) return;
      html += '<div class="fw-pmn-group">' + (bk.g ? '<div class="fw-eyebrow">' + esc(bk.g.label) + "</div>" : "");
      bk.items.forEach(function (n) {
        var step = stepOf(data, n.id), st = step ? step.status : "";
        html += '<div class="fw-pmn-node' + (st ? " is-" + st : "") + '"><div class="fw-pmn-top"><span class="fw-eyebrow">' + esc(n.role) + "</span>" +
          (st ? '<span class="fw-pmn-st ' + st + '">' + esc(STATUS_WORD[st]) + "</span>" : "") + '</div><div class="nm">' +
          (n.icon && ICONS[n.icon] ? '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[n.icon] + "</svg>" : "") + esc(n.name) + "</div>" +
          (!step && (n.badges || []).length ? '<div class="fw-pmn-badges">' + n.badges.map(function (b) { return '<span class="fw-status ' + esc(b.tone || "") + '">' + esc(b.text) + "</span>"; }).join("") + "</div>" : "");
        var detail = step ? step.text : n.detail;
        if (detail) html += '<div class="dt' + (st ? " st-" + st : "") + '">' + esc(detail) + "</div>";
        if (step && typeof step.progress === "number") html += '<div class="fw-pmn-prog"><i style="width:' + Math.round(Math.max(0, Math.min(1, step.progress)) * 100) + '%"></i></div>';
        (data.links || []).filter(function (L) { return L.from === n.id; }).forEach(function (L) {
          var t = byId[L.to];
          html += '<div class="fw-pmn-link ' + esc(L.kind || "hand") + '"><i></i>' + (L.label ? "<span>" + esc(L.label) + "</span>" : "") + "<b>" + esc(t ? t.name : L.to) + "</b></div>";
        });
        if (act && act.node === n.id && act.open !== false) html += actionCard(act, "is-inline");
        html += "</div>";
      });
      html += "</div>";
    });
    return html + "</div>";
  }

  function legend(data) {
    if (data.legend === false) return "";
    if (data.state) {
      return '<div class="fw-pm-legend"><span><i class="fw-pm-sw on"></i>Done so far</span><span><i class="fw-pm-sw off"></i>Still to come</span>' +
        '<span><i class="fw-pm-dot running"></i>Running</span><span><i class="fw-pm-dot action"></i>Needs you</span><span><i class="fw-pm-dot failed"></i>Failed</span></div>';
    }
    var seen = [];
    (data.links || []).forEach(function (L) { var k = KINDS.indexOf(L.kind) >= 0 ? L.kind : "hand"; if (seen.indexOf(k) < 0) seen.push(k); });
    seen.sort(function (a, b) { return KINDS.indexOf(a) - KINDS.indexOf(b); });
    var names = data.legendLabels || {};
    return '<div class="fw-pm-legend">' + seen.map(function (k) { return '<span><i class="fw-pm-sw ' + k + '"></i>' + esc(names[k] || KIND_LABEL[k]) + "</span>"; }).join("") + "</div>";
  }

  /* ---------- the instance ---------- */

  var count = 0;
  function render(el, data) {
    var uid = "fwpm" + (++count), inst = { el: el, data: data };
    el.classList.add("fw-pm");
    // Fit the page: a left-to-right map that would shrink below 80% turns top to bottom; the rest scales down.
    function avail() {
      var cs = window.getComputedStyle ? getComputedStyle(el) : null;
      var w = el.clientWidth - (cs ? parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) : 0);
      return w > 0 ? w : Infinity;
    }
    function fit(d) {
      var auto = !d.nodes.every(function (n) { return n.col != null && n.row != null; });
      var b = build(d, uid);
      inst.turned = false;
      if (auto && d.direction !== "down" && d.fit !== false && b.width * 0.8 > avail()) {
        b = build(Object.assign({}, d, { direction: "down" }), uid);
        inst.turned = true;
      }
      return b;
    }
    function draw(scrollToAction) {
      var d = inst.data, b = fit(d), act = d.state && d.state.action, open = act && act.open !== false && b.box[act.node];
      inst.width = b.width; inst.box = b.box;
      el.classList.toggle("fw-pm-list", b.width * 0.6 > avail()); // too small to read: show the list instead
      el.classList.toggle("is-live", !!d.state);
      el.classList.toggle("has-action", !!open);
      var stage = '<div class="fw-pm-stage" style="width:' + b.width + 'px">' + b.svg;
      if (open) stage += '<div class="fw-pm-pop" data-for="' + esc(act.node) + '">' + actionCard(act, "", b.box[act.node].n.name) + "</div>";
      stage += "</div>";
      var lay = { box: b.box, down: inst.turned };
      el.innerHTML = '<div class="fw-pm-wide">' + stage + "</div>" + narrow(d, lay) + legend(d) +
        '<div class="fw-pm-sr" role="status" aria-live="polite">' + (open ? esc((act.eyebrow || "Action needed") + ": " + act.title) : "") + "</div>" +
        (d.caption ? '<figcaption class="fw-pm-caption">' + esc(d.caption) + "</figcaption>" : "");
      if (open) place();
    }
    // Keep the card inside the map's width, and make room when it reaches past the top or bottom.
    // Put the card where it covers no step: below, above, right or left of its step, inside the map.
    // If there is no such place, it sits under the map, lined up with its step.
    function place() {
      var pop = el.querySelector(".fw-pm-pop"), stage = el.querySelector(".fw-pm-stage");
      if (!pop || !stage || !inst.box) return;
      stage.style.marginBottom = stage.style.marginTop = "0px";
      pop.className = "fw-pm-pop"; pop.style.left = pop.style.top = "0px";
      var st = stage.getBoundingClientRect(), card = pop.firstChild.getBoundingClientRect();
      if (!st.width || !card.width) return;
      var k = st.width / inst.width, cw = card.width, ch = card.height, GAP = 12;
      var px = function (b) { return { x: b.x * k, y: b.y * k, w: b.w * k, h: b.h * k }; };
      var nb = px(inst.box[pop.getAttribute("data-for")]), others = [];
      Object.keys(inst.box).forEach(function (id) { if (id !== pop.getAttribute("data-for")) others.push(px(inst.box[id])); });
      var W2 = st.width, H2 = st.height;
      function free(r, side) { // below may reach past the map's bottom and above past its top: the map makes room
        if (r.x < 0 || r.x + r.w > W2) return false;
        if (side !== "below" && r.y + r.h > H2) return false;
        if (side !== "above" && r.y < 0) return false;
        return !others.some(function (o) { return r.x < o.x + o.w + 4 && o.x < r.x + r.w + 4 && r.y < o.y + o.h + 4 && o.y < r.y + r.h + 4; });
      }
      var cx = Math.min(Math.max(nb.x + nb.w / 2 - cw / 2, 0), W2 - cw), cy = Math.min(Math.max(nb.y + nb.h / 2 - ch / 2, 0), H2 - ch);
      var lx = Math.max(0, Math.min(nb.x, W2 - cw)), rx = Math.max(0, Math.min(nb.x + nb.w - cw, W2 - cw));
      var by = nb.y + nb.h + GAP, ay = nb.y - GAP - ch;
      var tries = [
        ["below", cx, by], ["below", rx, by], ["below", lx, by],
        ["above", cx, ay], ["above", rx, ay], ["above", lx, ay],
        ["right", nb.x + nb.w + GAP, cy], ["left", nb.x - GAP - cw, cy]
      ];
      var pick = null;
      for (var i = 0; i < tries.length && !pick; i++) if (free({ x: tries[i][1], y: tries[i][2], w: cw, h: ch }, tries[i][0])) pick = tries[i];
      if (!pick) pick = ["dock", cx, H2 + GAP];
      stage.style.marginTop = pick[2] < 0 ? Math.ceil(-pick[2] + 4) + "px" : "0px";
      if (pick[2] + ch > H2) stage.style.marginBottom = Math.ceil(pick[2] + ch - H2 + 4) + "px";
      pop.className = "fw-pm-pop " + pick[0];
      pop.style.left = pick[1] + "px"; pop.style.top = pick[2] + "px";
      var arrow = pick[0] === "below" || pick[0] === "above" ? nb.x + nb.w / 2 - pick[1] : nb.y + nb.h / 2 - pick[2];
      pop.style.setProperty("--pm-arrow", Math.round(arrow) + "px");
    }
    el.addEventListener("click", function (e) {
      var btn = e.target.closest && e.target.closest("[data-pm-action]");
      if (btn) {
        var a = inst.data.state && inst.data.state.action;
        el.dispatchEvent(new CustomEvent("fw-pm-action", { bubbles: true, detail: { node: a && a.node, action: btn.getAttribute("data-pm-action") } }));
        return;
      }
      var n = e.target.closest && e.target.closest('.fw-pm-node[role="button"]');
      if (n) inst.open();
    });
    el.addEventListener("keydown", function (e) {
      var n = e.target.closest && e.target.closest('.fw-pm-node[role="button"]');
      if (n && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); inst.open(); }
    });
    var rt, lastW = avail();
    function refit() {
      var w = avail();
      if (w === lastW) return; lastW = w;
      el.classList.toggle("fw-pm-list", (inst.width || 0) * 0.6 > w);
      var d = inst.data, auto = !d.nodes.every(function (n) { return n.col != null && n.row != null; });
      if (auto && d.direction !== "down" && d.fit !== false) {
        var wide = build(d, uid).width * 0.8 > w;
        if (wide !== !!inst.turned) { draw(false); return; }
      }
      place();
    }
    if (window.ResizeObserver) new ResizeObserver(function () { clearTimeout(rt); rt = setTimeout(refit, 80); }).observe(el);
    else window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(refit, 80); });
    inst.update = function (patch) {
      var prevAct = inst.data.state && inst.data.state.action;
      inst.data = Object.assign({}, inst.data, patch);
      var a = inst.data.state && inst.data.state.action;
      draw(!!a && (!prevAct || prevAct.node !== a.node || prevAct.title !== a.title));
      return inst;
    };
    inst.close = function () { var a = inst.data.state && inst.data.state.action; if (a) { a.open = false; draw(false); } return inst; };
    inst.open = function () { var a = inst.data.state && inst.data.state.action; if (a) { a.open = true; draw(true); var b = el.querySelector(".fw-pm-pop [data-pm-action]"); if (b) b.focus({ preventScroll: true }); } return inst; };
    draw(true);
    el.__fwpm = inst;
    return inst;
  }
  function boot() {
    var els = document.querySelectorAll("[data-fw-pm]");
    for (var i = 0; i < els.length; i++) {
      if (els[i].__fwpm) continue;
      var s = els[i].querySelector('script[type="application/json"]');
      if (!s) continue;
      try { render(els[i], JSON.parse(s.textContent)); } catch (e) { if (window.console) console.error("ProcessMap: bad data", e); }
    }
  }
  window.FeedwrkProcessMap = { render: render, boot: boot, statuses: Object.keys(STATUS_WORD), icons: Object.keys(ICONS), grid: { node: [W, H], gapAcross: GX, gapDown: GY } };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
