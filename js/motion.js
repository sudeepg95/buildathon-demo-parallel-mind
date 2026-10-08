// Motion layer: per-slide entrances ported from demo/index.html, using the Web Animations API.
// Watches the deck runtime's data-off attribute and runs the entrance named by the active
// section's data-motion attribute. Everything a slide starts is undone when it is left.
(function () {
  var D = document, R = D.documentElement;
  var REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var EASE = "cubic-bezier(0.25, 1, 0.5, 1)";
  var POP = "cubic-bezier(0.34, 1.56, 0.64, 1)";
  var HOOK_LINES = ["…the Collected Works, vol. 1", "…letters to a disciple, 1931", "…speeches, the Salt March",
    "…on truth, on fear, on courage", "…ingesting. no sleep. day 3."];
  var sections = [].slice.call(D.querySelectorAll("section.deck-slide"));
  var bar = D.getElementById("motion-bar"), notes = D.getElementById("motion-notes");
  var running = [], timers = [], cleanups = [], current = -1;

  /* primitives */
  function anim(el, frames, opts) {
    if (!el || typeof el.animate !== "function") return null;
    var a = el.animate(frames, Object.assign({ fill: "backwards" }, opts));
    running.push(a);
    return a;
  }
  function rise(els, o) {
    o = o || {};
    var dx = o.x || 0, dy = o.y === undefined ? 40 : o.y, step = o.stagger === undefined ? 120 : o.stagger;
    els.forEach(function (el, i) {
      anim(el, [{ opacity: 0, transform: "translate(" + dx + "px," + dy + "px)" }, { opacity: 1, transform: "none" }],
        { duration: o.dur || 700, delay: (o.delay || 0) + i * step, easing: EASE });
    });
  }
  function pop(els, o) {
    els.forEach(function (el, i) {
      anim(el, [{ opacity: 0, transform: "scale(.5)" }, { opacity: 1, transform: "none" }],
        { duration: 600, delay: (o.delay || 0) + i * (o.stagger || 150), easing: POP });
    });
  }
  function fadeIn(el, delay) { anim(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 800, delay: delay || 0 }); }
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function frame(s, id) { return s.querySelector('[data-frame-id="' + id + '"]'); }
  function inner(s, id) { var f = frame(s, id); return f ? f.firstElementChild : null; }
  function kids(el) { return el ? [].slice.call(el.children) : []; }
  function at(root, paths) {
    if (!root) return [];
    return paths.map(function (p) { return root.querySelector('[data-node-path="' + p + '"]'); }).filter(Boolean);
  }
  function inject(parent, el) { parent.appendChild(el); cleanups.push(function () { el.remove(); }); return el; }
  function listen(target, type, fn) {
    target.addEventListener(type, fn, true);
    cleanups.push(function () { target.removeEventListener(type, fn, true); });
  }

  function countUp(el, delay, dur) {
    if (!el) return;
    var orig = el.textContent, m = /^(\D*)(\d+)([\s\S]*)$/.exec(orig);
    if (!m) return;
    var target = Number(m[2]), t0 = performance.now() + delay, raf = 0;
    el.textContent = m[1] + "0" + m[3];
    function step(t) {
      var k = Math.min(1, Math.max(0, (t - t0) / dur));
      el.textContent = m[1] + Math.round(target * (1 - Math.pow(1 - k, 3))) + m[3];
      if (k < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    cleanups.push(function () { cancelAnimationFrame(raf); el.textContent = orig; });
  }

  /* video: rewind and play on entry, pause on exit */
  function playFromStart(video) {
    cleanups.push(function () { video.pause(); });
    try { video.currentTime = 0; } catch (err) { /* metadata not loaded yet; play() starts at 0 anyway */ }
    return video.play();
  }

  // Browsers refuse audible autoplay before the viewer has interacted with the page. When that
  // happens, show a prompt and let the first click or key press start the video instead of
  // advancing the deck.
  function playWithSound(s, video) {
    video.muted = false;
    playFromStart(video).catch(function (err) {
      if (err.name !== "NotAllowedError") {
        console.error("Intro video could not play:", err);
        return;
      }
      var gate = frame(s, "intro-gate");
      gate.hidden = false;
      cleanups.push(function () { gate.hidden = true; });
      var start = function (e) {
        if (e.type === "keydown" && (e.metaKey || e.ctrlKey || e.altKey)) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        gate.hidden = true;
        window.removeEventListener("keydown", start, true);
        window.removeEventListener("click", start, true);
        video.play().catch(function (playErr) { console.error("Intro video could not play:", playErr); });
      };
      listen(window, "keydown", start);
      listen(window, "click", start);
    });
  }

  /* per-slide entrances, keyed by section[data-motion] */
  var enter = {
    intro: function (s) {
      playWithSound(s, s.querySelector("video"));
    },
    hook: function (s) {
      var clip = frame(s, "e0-v85dsa").querySelector("video");
      clip.muted = true;
      playFromStart(clip).catch(function (err) { console.error("Hook video could not play:", err); });
      rise([inner(s, "e3-v85dsa")]);
      var box = D.createElement("div");
      box.className = "hook-stream";
      inject(s.querySelector(".slide"), box);
      HOOK_LINES.forEach(function (line, i) {
        later(function () {
          var d = D.createElement("div");
          d.textContent = line;
          box.appendChild(d);
          anim(d, [{ opacity: 0, transform: "translateX(-24px)" }, { opacity: 1, transform: "none" }], { duration: 500, easing: EASE });
        }, 400 + i * 700);
      });
      var reveal = 400 + HOOK_LINES.length * 700 + 300;
      rise([inner(s, "e4-v85dsa")], { delay: reveal, dur: 1000 });
      anim(box, [{ opacity: 1 }, { opacity: .35 }], { duration: 1000, delay: reveal, fill: "forwards" });
    },
    title: function (s) {
      rise(at(inner(s, "e1-1ftwghs"), ["0", "1", "2", "3"]), { stagger: 150 });
      var orb = frame(s, "e0-1ftwghs");
      anim(orb.firstElementChild, [{ opacity: 0, transform: "scale(.7)" }, { opacity: 1, transform: "none" }], { duration: 1200, easing: EASE });
      anim(orb, [{ transform: "scale(1)" }, { transform: "scale(1.08)" }],
        { duration: 2400, iterations: Infinity, direction: "alternate", easing: "ease-in-out", fill: "none" });
    },
    story: function (s) {
      var f = inner(s, "e0-1dx3rjf");
      rise(at(f, ["0.0.0", "0.0.1", "0.0.2"]));
      anim(at(f, ["0.1"])[0], [{ opacity: 0, transform: "translateX(60px) scale(.96)" }, { opacity: 1, transform: "none" }],
        { duration: 900, delay: 300, easing: EASE });
      rise(at(f, ["1.0", "1.1", "1.2"]), { delay: 600, stagger: 150 });
    },
    problem: function (s) {
      var f = inner(s, "e0-1gp23mk");
      rise(at(f, ["0.0", "0.1"]));
      rise(at(f, ["1.0", "1.1", "1.2", "1.3"]), { y: -40, delay: 300, stagger: 200 });
      ["1.0.0", "1.1.0", "1.2.0", "1.3.0"].forEach(function (p, i) { countUp(at(f, [p])[0], 300 + i * 200, 900); });
      rise(at(f, ["2"]), { delay: 1400 });
    },
    demo: function (s) {
      var f = inner(s, "e1-1cjx0s6");
      rise(at(f, ["0.0", "0.1"]));
      rise(at(f, ["1.0", "1.1", "1.2"]), { x: -48, y: 0, delay: 400, stagger: 200 });
      var wave = frame(s, "e0-1cjx0s6"), img = wave.querySelector("img");
      img.style.visibility = "hidden";
      cleanups.push(function () { img.style.visibility = ""; });
      var bars = inject(wave, D.createElement("div"));
      bars.className = "wave-bars";
      for (var i = 0; i < 19; i++) {
        var b = bars.appendChild(D.createElement("b"));
        anim(b, [{ height: "15%" }, { height: (25 + Math.random() * 75) + "%" }],
          { duration: 400 + Math.random() * 400, delay: Math.random() * 300, iterations: Infinity, direction: "alternate", easing: "ease-in-out", fill: "none" });
      }
    },
    built: function (s) {
      var f = inner(s, "e1-1du28hf");
      rise(at(f, ["0.0", "0.1"]));
      fadeIn(frame(s, "e0-1du28hf"), 200);
      rise(at(f, ["1.0", "1.1.0", "1.1.1"]), { delay: 300, stagger: 150 });
      rise(at(f, ["2.0", "2.1.0", "2.1.1", "2.1.2", "2.1.3"]), { delay: 750, stagger: 120 });
      rise(at(f, ["3"]), { delay: 1500 });
      at(f, ["2.1.3.1.0", "2.1.3.1.1", "2.1.3.1.2"]).forEach(function (row, i) {
        var tick = row.querySelector("font");
        if (!tick) return;
        tick.style.display = "inline-block";
        pop([tick], { delay: 1600 + i * 250 });
      });
      at(f, ["1.1.0", "1.1.1", "2.1.0", "2.1.1", "2.1.2", "2.1.3"]).forEach(function (card, i) {
        anim(card, [
          { boxShadow: "0 0 0 0 rgba(255,179,138,0)", transform: "none" },
          { boxShadow: "0 0 0 1px #ffb38a, 0 0 48px rgba(255,179,138,.35)", transform: "translateY(-8px)", offset: .4 },
          { boxShadow: "0 0 0 0 rgba(255,179,138,0)", transform: "none" }
        ], { duration: 900, delay: 2400 + i * 500, easing: "ease-in-out", fill: "none" });
      });
    },
    learned: function (s) {
      rise(kids(inner(s, "p767a0a8b78fer0-2a0aff9c")));
      ["ec865242", "4b0b906b", "p767a0a8b78fer1_1-2a0aff9c"].forEach(function (id, i) {
        rise([inner(s, id)], { delay: 300 + i * 200 });
      });
    },
    imagine: function (s) {
      rise(kids(inner(s, "p50b4b1b02e67r0-7355433f")));
      pop([].slice.call(frame(s, "e2-1z3jlj").querySelectorAll("img")), { delay: 300, stagger: 180 });
      rise(kids(inner(s, "p50b4b1b02e67r1-7355433f")), { delay: 800, stagger: 150 });
      rise([inner(s, "p50b4b1b02e67r2-7355433f")], { delay: 1500 });
      fadeIn(inner(s, "1f98ffaa"), 1700);
    }
  };

  /* lifecycle */
  function stop() {
    running.forEach(function (a) { a.cancel(); });
    timers.forEach(clearTimeout);
    cleanups.forEach(function (fn) { fn(); });
    running = []; timers = []; cleanups = [];
  }
  function activeIndex() {
    for (var i = 0; i < sections.length; i++) {
      if (!sections[i].hasAttribute("data-off") && !sections[i].hasAttribute("data-leaving")) return i;
    }
    return -1;
  }
  function sync() {
    var staged = R.classList.contains("deck-stage");
    bar.style.display = staged ? "" : "none";
    var i = staged ? activeIndex() : -1;
    if (i === current) return;
    stop();
    current = i;
    if (i < 0) { notes.classList.remove("on"); return; }
    var s = sections[i], run = enter[s.getAttribute("data-motion")];
    bar.style.width = ((i + 1) / sections.length * 100) + "%";
    notes.textContent = s.getAttribute("data-speaker-notes") || "";
    if (!run) return;
    // Videos are content, not decoration: with reduced motion on they still play, without the entrances.
    if (REDUCE && s.getAttribute("data-motion") !== "intro") {
      var clip = s.querySelector("video");
      if (clip) playFromStart(clip).catch(function (err) { console.error("Video could not play:", err); });
      return;
    }
    try {
      run(s);
    } catch (err) {
      stop();
      console.error("Slide " + (i + 1) + " animation skipped:", err);
    }
  }

  addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "n" || e.key === "N") notes.classList.toggle("on");
  });
  var watch = new MutationObserver(sync);
  watch.observe(D.querySelector("main"), { subtree: true, attributes: true, attributeFilter: ["data-off", "data-leaving"] });
  watch.observe(R, { attributes: true, attributeFilter: ["class"] });
  if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", sync); else sync();
})();
