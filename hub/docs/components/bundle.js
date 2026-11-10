/* Feedwrk Docs 1.0.0. Behaviour for work documents. Vanilla, no dependencies.
   Load in <head> without defer: the theme is set before first paint, the rest runs on DOMContentLoaded.
   Every part acts only when its markup is present. API: window.FeedwrkDocs.init(root). */
(function () {
  "use strict";
  var doc = document;
  var html = doc.documentElement;
  var THEME_KEY = "fd-theme";
  var MOBILE = "(max-width: 1023px)";
  var READY = "fdReady";

  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch (e) { /* storage blocked: the page still works, the choice is not kept */ }
    return null;
  }
  function all(root, sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }
  function el(tag, cls, text) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function once(node, name) {
    if (node.dataset[READY + name]) return false;
    node.dataset[READY + name] = "1";
    return true;
  }
  function hashId(hash) {
    var raw = String(hash || "").replace(/^#/, "");
    try { return decodeURIComponent(raw); } catch (e) { return raw; }
  }
  function closestPage(node) { return node && node.closest ? node.closest(".fd-page[id]") : null; }

  /* ---- Theme: runs now, before first paint ---- */
  var media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  var authored = html.getAttribute("data-theme");
  var picked = null; // the last button choice, kept here too in case storage is blocked
  function choice() {
    var c = picked || store(THEME_KEY);
    return c === "light" || c === "dark" || c === "device" ? c : "device";
  }
  // A data-theme already on <html> (the hub sets one on its previews) is left alone until a theme button is used.
  function applyTheme() {
    var c = choice();
    html.setAttribute("data-theme", c === "device" ? (media && media.matches ? "dark" : "light") : c);
  }
  if (!authored) applyTheme();
  if (media) {
    var follow = function () { if (choice() === "device" && !authored) applyTheme(); };
    if (media.addEventListener) media.addEventListener("change", follow);
    else if (media.addListener) media.addListener(follow);
  }
  var THEME_LABEL = { light: "Light", dark: "Dark", device: "Device" };
  function paintThemeButtons(root) {
    all(root || doc, "[data-fd-theme]").forEach(function (b) {
      var c = choice();
      var t = b.querySelector(".t");
      if (t) t.textContent = THEME_LABEL[c];
      else b.textContent = "Theme: " + THEME_LABEL[c];
      b.setAttribute("aria-label", "Theme: " + THEME_LABEL[c] + ". Change theme");
    });
  }

  /* ---- Pages, nav, crumbs, pager ---- */
  function pages(root) { return all(root, ".fd-doc .fd-page[id]"); }

  function setupPages(root) {
    var list = pages(root);
    if (!list.length) return;
    html.classList.add("fd-js");
    list.forEach(function (p, i) {
      var t = p.querySelector(".fd-title");
      if (t && !t.hasAttribute("tabindex")) t.setAttribute("tabindex", "-1");
      if (!once(p, "Pager")) return;
      var prev = list[i - 1];
      var next = list[i + 1];
      if (!prev && !next) return;
      var nav = el("nav", "fd-pager");
      nav.setAttribute("aria-label", "Pages");
      [[prev, "prev", "Previous"], [next, "next", "Next"]].forEach(function (x) {
        if (!x[0]) return;
        var a = el("a", x[1]);
        a.href = "#" + x[0].id;
        a.appendChild(el("small", null, x[2]));
        a.appendChild(el("b", null, x[0].getAttribute("data-title") || x[0].id));
        nav.appendChild(a);
      });
      p.appendChild(nav);
    });
  }

  function currentPage() { return doc.querySelector(".fd-doc .fd-page.is-current"); }

  function showPage(hash, opts) {
    opts = opts || {};
    var list = pages(doc);
    if (!list.length) return null;
    var id = hashId(hash);
    var target = id ? doc.getElementById(id) : null;
    var page = target && target.matches(".fd-page[id]") ? target : closestPage(target);
    if (!page || list.indexOf(page) < 0) page = list[0];
    var changed = currentPage() !== page;
    list.forEach(function (p) { p.classList.toggle("is-current", p === page); });

    all(doc, "a.fd-navlink").forEach(function (a) {
      if (a.getAttribute("href") === "#" + page.id) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    all(doc, "[data-fd-crumbs]").forEach(function (c) {
      c.textContent = "";
      var g = page.getAttribute("data-group");
      if (g && g !== page.getAttribute("data-title")) {
        c.appendChild(el("span", null, g));
        var s = el("span", "sep", "›");
        s.setAttribute("aria-hidden", "true");
        c.appendChild(s);
      }
      var cur = el("span", null, page.getAttribute("data-title") || page.id);
      cur.setAttribute("aria-current", "page");
      c.appendChild(cur);
    });
    if (opts.title !== false && page.getAttribute("data-title")) {
      var base = doc.body.getAttribute("data-fd-doc-title");
      if (base == null) { base = doc.title; doc.body.setAttribute("data-fd-doc-title", base); }
      doc.title = page.getAttribute("data-title") + " · " + base;
    }

    var inner = target && target !== page ? target : null;
    if (inner) {
      if (inner.matches("details")) inner.open = true;
      var host = inner.parentElement && inner.parentElement.closest("details:not([open])");
      while (host) { host.open = true; host = host.parentElement && host.parentElement.closest("details:not([open])"); }
      inner.scrollIntoView({ block: "start" });
      if (opts.flash) flash(inner);
      if (opts.focus) {
        if (!inner.hasAttribute("tabindex") && !/^(A|BUTTON|INPUT|SUMMARY|DETAILS)$/.test(inner.tagName)) inner.setAttribute("tabindex", "-1");
        inner.focus({ preventScroll: true });
      }
    } else if (changed || opts.top) {
      window.scrollTo(0, 0);
      if (opts.focus) {
        var t = page.querySelector(".fd-title");
        if (t) t.focus({ preventScroll: true });
      }
    }
    closeDrawer();
    return page;
  }

  function flash(node) {
    node.classList.remove("fd-flash");
    void node.offsetWidth;
    node.classList.add("fd-flash");
    setTimeout(function () { node.classList.remove("fd-flash"); }, 1700);
  }

  function onHashLink(e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var href = a.getAttribute("href");
    if (href === "#") return;
    var id = hashId(href);
    var target = doc.getElementById(id);
    if (!target) return;
    if (!pages(doc).length) {
      if (a.classList.contains("fd-drill")) {
        e.preventDefault();
        if (target.matches("details")) target.open = true;
        target.scrollIntoView({ block: "start", behavior: "smooth" });
        flash(target);
      }
      return;
    }
    e.preventDefault();
    try { history.pushState(null, "", href); } catch (err) { location.hash = href; return; }
    var isPage = target.matches(".fd-page[id]");
    showPage(href, { focus: true, flash: !isPage, top: isPage });
  }

  /* ---- Phone drawer ---- */
  var lastMenu = null;
  function closeDrawer() {
    var side = doc.querySelector(".fd-side.is-open");
    if (!side) return;
    side.classList.remove("is-open");
    var scrim = doc.querySelector(".fd-scrim");
    if (scrim) scrim.hidden = true;
    all(doc, "[data-fd-menu]").forEach(function (m) { m.setAttribute("aria-expanded", "false"); });
    if (lastMenu && side.contains(doc.activeElement)) lastMenu.focus();
  }
  function setupMenu(root) {
    all(root, "[data-fd-menu]").forEach(function (btn) {
      if (!once(btn, "Menu")) return;
      var side = doc.getElementById(btn.getAttribute("aria-controls")) || doc.querySelector(".fd-side");
      if (!side) return;
      var scrim = doc.querySelector(".fd-scrim");
      if (!scrim) {
        scrim = el("div", "fd-scrim");
        scrim.hidden = true;
        scrim.addEventListener("click", closeDrawer);
        doc.body.appendChild(scrim);
      }
      btn.addEventListener("click", function () {
        var open = !side.classList.contains("is-open");
        if (!open) return closeDrawer();
        side.classList.add("is-open");
        scrim.hidden = false;
        btn.setAttribute("aria-expanded", "true");
        lastMenu = btn;
        var cur = side.querySelector('[aria-current="page"]') || side.querySelector("a, button");
        if (cur) cur.focus();
      });
    });
    if (window.matchMedia && once(doc.body, "MenuMedia")) {
      var mq = window.matchMedia(MOBILE);
      var reset = function () { if (!mq.matches) closeDrawer(); };
      if (mq.addEventListener) mq.addEventListener("change", reset);
    }
  }

  /* ---- Version switcher ---- */
  function setupVersions(root) {
    all(root, "[data-fd-versions]").forEach(function (box) {
      if (!once(box, "Versions")) return;
      var btn = box.querySelector(".fd-versions-btn");
      var list = box.querySelector(".fd-versions-list");
      if (!btn || !list) return;
      function set(open) {
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        list.hidden = !open;
      }
      btn.addEventListener("click", function () { set(list.hidden); });
      doc.addEventListener("click", function (e) { if (!box.contains(e.target)) set(false); });
      box.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && !list.hidden) { set(false); btn.focus(); e.stopPropagation(); }
      });
    });
  }

  /* ---- Decisions and the answer bar ---- */
  function decisionsIn(root) { return all(root, ".fd-decision"); }

  function setupDecisions(root) {
    decisionsIn(root).forEach(function (d) {
      var state = d.getAttribute("data-state");
      var inputs = all(d, ".fd-option input[type=radio]");
      if (state === "answered") {
        var ans = d.getAttribute("data-answer");
        inputs.forEach(function (i) {
          i.checked = i.value === ans;
          i.disabled = true;
          i.closest(".fd-option").classList.toggle("is-picked", i.checked);
        });
        return;
      }
      if (!once(d, "Decision")) return;
      inputs.forEach(function (i) {
        i.closest(".fd-option").classList.toggle("is-picked", i.checked);
        i.addEventListener("change", function () {
          inputs.forEach(function (x) { x.closest(".fd-option").classList.toggle("is-picked", x.checked); });
          renderAnswers();
        });
      });
    });
    renderAnswers();
    setupCounts();
  }

  function replyLine() {
    var parts = [];
    var open = decisionsIn(doc).filter(function (d) { return d.getAttribute("data-state") === "open"; });
    open.forEach(function (d) {
      var picked = d.querySelector(".fd-option input:checked");
      if (picked) parts.push((d.getAttribute("data-code") || d.id) + " " + picked.value);
    });
    return { text: parts.join(", "), open: open.length, picked: parts.length };
  }

  function renderAnswers() {
    var r = replyLine();
    all(doc, "[data-fd-answers]").forEach(function (bar) {
      var out = bar.querySelector("output");
      var none = bar.querySelector("[data-fd-none]");
      var copy = bar.querySelector("[data-fd-copy]");
      var label = bar.querySelector(".fd-answerbar-t");
      var live = r.open > 0;
      bar.classList.toggle("is-live", live);
      if (none) none.hidden = live;
      if (out) {
        out.hidden = !live;
        out.textContent = r.picked ? r.text : "Pick an option in each open decision";
        out.classList.toggle("is-blank", !r.picked);
      }
      if (label) label.hidden = !live;
      if (copy) { copy.hidden = !live; copy.disabled = !r.picked; }
      if (!once(bar, "Bar") || !copy) return;
      var note = bar.querySelector("[aria-live]");
      var timer;
      copy.addEventListener("click", function () {
        var text = replyLine().text;
        if (!text) return;
        function done(msg) {
          if (!note) return;
          note.textContent = msg;
          clearTimeout(timer);
          timer = setTimeout(function () { note.textContent = ""; }, 2000);
        }
        function fallback() {
          var ta = el("textarea");
          ta.value = text;
          ta.setAttribute("readonly", "");
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          doc.body.appendChild(ta);
          ta.select();
          var ok = false;
          try { ok = doc.execCommand("copy"); } catch (e) { ok = false; }
          doc.body.removeChild(ta);
          done(ok ? "Copied" : "Select the line and copy it");
        }
        try {
          if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(function () { done("Copied"); }, fallback);
          else fallback();
        } catch (e) { fallback(); }
      });
    });
  }

  function setupCounts() {
    all(doc, "a.fd-navlink[href^='#']").forEach(function (a) {
      var page = doc.getElementById(a.getAttribute("href").slice(1));
      var old = a.querySelector(".fd-count");
      if (old) old.remove();
      if (!page) return;
      var n = all(page, '.fd-decision[data-state="open"]').length;
      if (!n) return;
      var c = el("span", "fd-count", String(n));
      c.setAttribute("aria-label", n + (n === 1 ? " decision waits on you" : " decisions wait on you"));
      a.appendChild(c);
    });
  }

  /* ---- Check lists ---- */
  var KINDS = [["new", "New", "wait"], ["changed", "Changed", "move"], ["existing", "Existing", "ok"]];
  var RESULTS = [["pass", "Passing", "ok"], ["fail", "Failed", "bad"], ["todo", "Not run", "todo"]];

  function setupChecks(root) {
    all(root, "[data-fd-checks]").forEach(function (box) {
      if (!once(box, "Checks")) return;
      var rows = all(box, ".fd-checklist > li");
      if (!rows.length) return;
      var bar = el("div", "fd-filters");
      bar.setAttribute("role", "group");
      bar.setAttribute("aria-label", "Show checks");
      var empty = el("p", "fd-empty");
      empty.hidden = true;
      empty.appendChild(el("b", null, "No check matches this filter."));
      var reset = el("button", null, "Show all checks");
      reset.type = "button";
      empty.appendChild(reset);
      var active = { attr: null, value: null };
      var buttons = [];

      function add(label, attr, value, meaning, n) {
        var b = el("button", "fd-filter");
        b.type = "button";
        if (meaning) b.setAttribute("data-meaning", meaning);
        b.appendChild(doc.createTextNode(label + " "));
        b.appendChild(el("span", "n", String(n)));
        b.setAttribute("aria-pressed", attr === null ? "true" : "false");
        b.addEventListener("click", function () { apply(attr, value, b); });
        buttons.push(b);
        bar.appendChild(b);
      }
      function apply(attr, value, btn) {
        active = { attr: attr, value: value };
        buttons.forEach(function (x) { x.setAttribute("aria-pressed", x === btn ? "true" : "false"); });
        var shown = 0;
        rows.forEach(function (r) {
          var hide = attr !== null && r.getAttribute(attr) !== value;
          r.hidden = hide;
          if (!hide) shown++;
        });
        empty.hidden = shown > 0;
      }
      function count(attr, value) { return rows.filter(function (r) { return r.getAttribute(attr) === value; }).length; }

      add("All", null, null, null, rows.length);
      KINDS.forEach(function (k) { var n = count("data-kind", k[0]); if (n) add(k[1], "data-kind", k[0], k[2], n); });
      var hasResults = RESULTS.some(function (k) { return count("data-result", k[0]); });
      if (hasResults) {
        var sep = el("span", "sep");
        sep.setAttribute("aria-hidden", "true");
        bar.appendChild(sep);
        RESULTS.forEach(function (k) { var n = count("data-result", k[0]); if (n) add(k[1], "data-result", k[0], k[2], n); });
      }
      reset.addEventListener("click", function () { apply(null, null, buttons[0]); buttons[0].focus(); });
      box.insertBefore(bar, box.firstChild);
      box.appendChild(empty);
    });
  }

  /* ---- Tabs ---- */
  function setupTabs(root) {
    all(root, "[data-fd-tabs]").forEach(function (box) {
      if (!once(box, "Tabs")) return;
      var tabs = all(box, '[role="tab"]').filter(function (t) { return t.closest("[data-fd-tabs]") === box; });
      function select(tab, focus) {
        tabs.forEach(function (t) {
          var on = t === tab;
          t.setAttribute("aria-selected", on ? "true" : "false");
          t.tabIndex = on ? 0 : -1;
          var panel = doc.getElementById(t.getAttribute("aria-controls"));
          if (panel) panel.hidden = !on;
        });
        if (focus) tab.focus();
      }
      tabs.forEach(function (t, i) {
        t.addEventListener("click", function () { select(t, false); });
        t.addEventListener("keydown", function (e) {
          var j = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
          if (j === undefined) return;
          e.preventDefault();
          select(tabs[(j + tabs.length) % tabs.length], true);
        });
      });
      var first = tabs.filter(function (t) { return t.getAttribute("aria-selected") === "true"; })[0] || tabs[0];
      if (first) select(first, false);
    });
  }

  /* ---- Terms and codes with a definition: one shared popover ---- */
  var pop = null;
  var popFor = null;
  function popover() {
    if (pop) return pop;
    pop = el("div", "fd-pop");
    pop.id = "fd-pop";
    pop.setAttribute("role", "tooltip");
    pop.hidden = true;
    doc.body.appendChild(pop);
    return pop;
  }
  function showDef(node) {
    var def = node.getAttribute("data-def");
    if (!def) return;
    var p = popover();
    p.textContent = "";
    var cut = def.indexOf(" · ");
    if (node.classList.contains("fd-code") && cut > 0) {
      p.appendChild(el("b", null, def.slice(0, cut)));
      p.appendChild(el("span", null, def.slice(cut + 3)));
    } else {
      p.appendChild(el("span", null, def));
    }
    p.hidden = false;
    popFor = node;
    node.setAttribute("aria-describedby", "fd-pop");
    var r = node.getBoundingClientRect();
    var vw = html.clientWidth;
    var vh = window.innerHeight;
    var w = p.offsetWidth;
    var h = p.offsetHeight;
    var gap = 8;
    var left = Math.max(8, Math.min(r.left, vw - w - 8));
    var top = r.bottom + gap;
    if (top + h > vh - 8 && r.top - gap - h >= 8) top = r.top - gap - h;
    p.style.left = left + "px";
    p.style.top = top + "px";
  }
  function hideDef() {
    if (!pop || pop.hidden) return;
    pop.hidden = true;
    if (popFor) popFor.removeAttribute("aria-describedby");
    popFor = null;
  }
  function setupDefs(root) {
    // Every definition is reachable by keyboard, not only the terms whose markup says so.
    all(root, "[data-def]").forEach(function (n) {
      if (!n.hasAttribute("tabindex") && !/^(A|BUTTON|INPUT|SUMMARY)$/.test(n.tagName)) n.setAttribute("tabindex", "0");
    });
    if (!once(doc.body, "Defs")) return;
    function defOf(e) { return e.target.closest ? e.target.closest("[data-def]") : null; }
    // A tap fires mouseover, focus and click in turn: only a click on a definition that was already open closes it.
    var openedAt = 0;
    function open(n) { if (popFor !== n || !pop || pop.hidden) openedAt = Date.now(); showDef(n); }
    doc.addEventListener("mouseover", function (e) { var n = defOf(e); if (n) open(n); });
    doc.addEventListener("mouseout", function (e) {
      var n = defOf(e);
      if (n && !(e.relatedTarget && n.contains(e.relatedTarget)) && doc.activeElement !== n) hideDef();
    });
    doc.addEventListener("focusin", function (e) { var n = defOf(e); if (n) open(n); else hideDef(); });
    doc.addEventListener("focusout", function (e) { if (defOf(e)) hideDef(); });
    doc.addEventListener("click", function (e) {
      var n = defOf(e);
      if (n && n.tagName !== "A") { if (popFor === n && pop && !pop.hidden && Date.now() - openedAt > 400) hideDef(); else open(n); }
      else if (!n) hideDef();
    });
    window.addEventListener("scroll", hideDef, { passive: true });
    window.addEventListener("resize", hideDef);
  }

  /* ---- Drills inside Facts float under their tile: keep them on screen, close them like a popover ---- */
  function setupFactDrills(root) {
    all(root, ".fd-facts details.fd-drill").forEach(function (d) {
      if (!once(d, "FactDrill")) return;
      d.addEventListener("toggle", function () {
        var body = d.querySelector(".fd-drill-body");
        if (!body || !d.open) return;
        all(doc, ".fd-facts details.fd-drill[open]").forEach(function (o) { if (o !== d) o.open = false; });
        body.classList.remove("is-flip");
        if (body.getBoundingClientRect().right > html.clientWidth - 8) body.classList.add("is-flip");
      });
    });
  }
  function closeFactDrills(except) {
    all(doc, ".fd-facts details.fd-drill[open]").forEach(function (d) { if (!except || !d.contains(except)) d.open = false; });
  }

  /* ---- Figure zoom ---- */
  function setupZoom(root) {
    all(root, ".fd-figure [data-fd-zoom]").forEach(function (btn) {
      if (!once(btn, "Zoom")) return;
      btn.addEventListener("click", function () {
        var fig = btn.closest(".fd-figure");
        var svg = fig && fig.querySelector("svg:not(.fd-icon)");
        if (!svg) return;
        var label = fig.querySelector(".fd-figure-head .fd-label");
        var dlg = el("dialog", "fd-zoom");
        dlg.setAttribute("aria-label", label ? label.textContent : "Figure");
        var head = el("div", "fd-zoom-head");
        head.appendChild(el("span", "fd-label", label ? label.textContent : ""));
        var close = el("button", "fd-btn fd-btn--quiet", "Close");
        close.type = "button";
        head.appendChild(close);
        var body = el("div", "fd-zoom-body");
        var copy = svg.cloneNode(true);
        all(copy, "[id]").forEach(function (n) { n.id = n.id + "-zoom"; });
        all(copy, "[marker-end], [marker-start], [aria-labelledby]").forEach(function (n) {
          ["marker-end", "marker-start"].forEach(function (a) {
            var v = n.getAttribute(a);
            if (v) n.setAttribute(a, v.replace(/url\(#([^)]+)\)/, "url(#$1-zoom)"));
          });
          var l = n.getAttribute("aria-labelledby");
          if (l) n.setAttribute("aria-labelledby", l.split(/\s+/).map(function (x) { return x + "-zoom"; }).join(" "));
        });
        copy.removeAttribute("width");
        copy.removeAttribute("height");
        body.appendChild(copy);
        dlg.appendChild(head);
        dlg.appendChild(body);
        doc.body.appendChild(dlg);
        function done() { if (dlg.open) dlg.close(); }
        close.addEventListener("click", done);
        dlg.addEventListener("click", function (e) { if (e.target === body) done(); });
        dlg.addEventListener("close", function () { dlg.remove(); btn.focus(); });
        if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
        close.focus();
      });
    });
  }

  /* ---- Theme buttons ---- */
  function setupThemeButtons(root) {
    all(root, "[data-fd-theme]").forEach(function (b) {
      if (!once(b, "Theme")) return;
      b.addEventListener("click", function () {
        var order = ["light", "dark", "device"];
        var next = order[(order.indexOf(choice()) + 1) % 3];
        picked = next;
        store(THEME_KEY, next === "device" ? null : next);
        authored = null;
        applyTheme();
        paintThemeButtons();
      });
    });
    paintThemeButtons(root);
  }

  /* ---- Print: open every detail so nothing is hidden on paper ---- */
  var printOpened = [];
  window.addEventListener("beforeprint", function () {
    printOpened = all(doc, "details.fd-more:not([open]), details.fd-drill:not([open])");
    printOpened.forEach(function (d) { d.open = true; });
  });
  window.addEventListener("afterprint", function () {
    printOpened.forEach(function (d) { d.open = false; });
    printOpened = [];
  });

  function init(root) {
    root = root || doc;
    setupPages(root);
    setupMenu(root);
    setupVersions(root);
    setupDecisions(root);
    setupChecks(root);
    setupTabs(root);
    setupZoom(root);
    setupFactDrills(root);
    setupThemeButtons(root);
    setupDefs(root);
    if (once(doc.body, "Global")) {
      doc.addEventListener("click", onHashLink);
      var popped = false;
      window.addEventListener("popstate", function () { popped = true; showPage(location.hash, { flash: false }); });
      // Back fires popstate then hashchange: the page is already shown, so only a typed or linked hash flashes.
      window.addEventListener("hashchange", function () { if (popped) { popped = false; return; } showPage(location.hash, { flash: true }); });
      doc.addEventListener("click", function (e) { closeFactDrills(e.target); });
      doc.addEventListener("keydown", function (e) {
        if (e.key !== "Escape") return;
        hideDef();
        closeDrawer();
        var open = doc.querySelector(".fd-facts details.fd-drill[open]");
        if (open) { open.open = false; open.querySelector("summary").focus(); }
      });
    }
    if (pages(doc).length) showPage(location.hash, { title: true });
    else if (location.hash) {
      var t = doc.getElementById(hashId(location.hash));
      if (t && t.matches("details")) t.open = true;
    }
  }

  window.FeedwrkDocs = { init: init, version: "1.0.0" };
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", function () { init(doc); });
  else init(doc);
})();
