(function () {
  "use strict";

  var start = function () { requestAnimationFrame(function () { setTimeout(init, 0); }); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
  function init() {
  var reduceMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduce = function () { return reduceMQ.matches; };
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  var toggle = document.getElementById("menu-toggle");
  var panel = document.getElementById("mobile-nav");
  if (toggle && panel) {
    var setOpen = function (open) {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.querySelector(".menu-toggle__label").textContent = open ? "Close" : "Menu";
      if (open) panel.removeAttribute("hidden"); else panel.setAttribute("hidden", "");
    };
    toggle.addEventListener("click", function () { setOpen(toggle.getAttribute("aria-expanded") !== "true"); });
    panel.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", function () { setOpen(false); }); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") { setOpen(false); toggle.focus(); }
    });
  }

  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var hours = [];
  try { hours = JSON.parse(document.body.getAttribute("data-hours") || "[]"); } catch (e) { hours = []; }
  var byDay = {};
  hours.forEach(function (h) { byDay[h.day] = h; });
  var torontoFmt = null;
  var torontoNow = function () {
    torontoFmt = torontoFmt || new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", weekday: "long", hour: "numeric", minute: "numeric", hourCycle: "h23" });
    var parts = torontoFmt.formatToParts(new Date());
    var o = {};
    parts.forEach(function (p) { o[p.type] = p.value; });
    return { day: o.weekday, mins: (parseInt(o.hour, 10) % 24) * 60 + parseInt(o.minute, 10) };
  };
  var toMins = function (hhmm) { var p = hhmm.split(":"); return +p[0] * 60 + +p[1]; };
  var fmt = function (m) {
    var h = Math.floor(m / 60), mm = m % 60, ap = h < 12 ? "a.m." : "p.m.";
    h = h % 12 || 12;
    return h + (mm ? ":" + (mm < 10 ? "0" : "") + mm : "") + " " + ap;
  };
  var computeStatus = function () {
    var now = torontoNow(), today = byDay[now.day];
    if (today && !today.closed && today.opens) {
      var o = toMins(today.opens), c = toMins(today.closes);
      if (now.mins >= o && now.mins < c) {
        return { state: c - now.mins <= 30 ? "closing" : "open", text: (c - now.mins <= 30 ? "Open now, closing soon at " : "Open now, closes ") + fmt(c) };
      }
      if (now.mins < o) return { state: "closed", text: "Closed now, opens today at " + fmt(o) };
    }
    var idx = DAYS.indexOf(now.day);
    for (var i = 1; i <= 7; i++) {
      var d = DAYS[(idx + i) % 7], h = byDay[d];
      if (h && !h.closed && h.opens) {
        return { state: "closed", text: "Closed now, opens " + (i === 1 ? "tomorrow" : d) + " at " + fmt(toMins(h.opens)) };
      }
    }
    return null;
  };
  var paintStatus = function () {
    var now = torontoNow(), s = computeStatus();
    if (!s) return;
    document.querySelectorAll("[data-status]").forEach(function (el) {
      var t = el.querySelector(".status__text");
      if (t.textContent === s.text && el.getAttribute("data-state") === s.state) return;
      if (reduce()) { t.textContent = s.text; el.setAttribute("data-state", s.state); return; }
      el.classList.add("is-updating");
      setTimeout(function () { t.textContent = s.text; el.setAttribute("data-state", s.state); el.classList.remove("is-updating"); }, 200);
    });
    document.querySelectorAll("[data-hours-table] tr").forEach(function (tr) {
      var isToday = tr.getAttribute("data-day") === now.day;
      tr.classList.toggle("is-today", isToday);
      var th = tr.querySelector("th"), tag = th.querySelector(".today-tag");
      if (isToday && !tag) { tag = document.createElement("span"); tag.className = "today-tag"; tag.textContent = "Today"; th.appendChild(tag); }
      if (!isToday && tag) tag.remove();
    });
  };
  try { paintStatus(); setInterval(paintStatus, 60000); } catch (e) {  }

  var revealEls = document.querySelectorAll(".reveal, [data-rail]");
  if ("IntersectionObserver" in window && !reduce()) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  }

  if ("IntersectionObserver" in window) {
    var loopIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.target.classList.toggle("is-offscreen", !en.isIntersecting); });
    });
    document.querySelectorAll(".cup, [data-status]").forEach(function (el) { loopIO.observe(el); });
  }

  var para = document.querySelector("[data-parallax] img");
  if (para && !reduce()) {
    var ticking = false;
    var onScroll = function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = Math.min(window.scrollY, 900);
        para.style.setProperty("--parallax", (y * 0.06).toFixed(1) + "px");
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  if (finePointer && !reduce()) {
    document.querySelectorAll("[data-tilt]").forEach(function (card) {
      var raf = 0;
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () {
          card.classList.add("is-tilting");
          card.style.setProperty("--ry", (x * 7).toFixed(2) + "deg");
          card.style.setProperty("--rx", (-y * 7).toFixed(2) + "deg");
        });
      });
      card.addEventListener("pointerleave", function () {
        cancelAnimationFrame(raf);
        card.classList.remove("is-tilting");
        card.style.removeProperty("--rx");
        card.style.removeProperty("--ry");
      });
    });
  }

  document.querySelectorAll("[data-carousel]").forEach(function (root) {
    var slides = [].slice.call(root.querySelectorAll("[data-slide]"));
    var dots = [].slice.call(root.querySelectorAll("[data-dot]"));
    var viewport = root.querySelector(".carousel__viewport");
    var pauseBtn = root.querySelector("[data-pause]");
    var pauseLabel = root.querySelector("[data-pause-label]");
    var current = 0, timer = null, userPaused = reduce(), hoverPause = false;
    var DELAY = 7000;
    var show = function (i) {
      current = (i + slides.length) % slides.length;
      slides.forEach(function (s, k) {
        s.classList.toggle("is-active", k === current);
        s.classList.toggle("is-before", k < current);
        s.setAttribute("aria-hidden", k === current ? "false" : "true");
      });
      dots.forEach(function (d, k) { if (k === current) d.setAttribute("aria-current", "true"); else d.removeAttribute("aria-current"); });
    };
    var running = function () { return !userPaused && !hoverPause && !reduce(); };
    var schedule = function () {
      clearTimeout(timer);
      viewport.setAttribute("aria-live", running() ? "off" : "polite");
      if (running()) timer = setTimeout(function () { show(current + 1); schedule(); }, DELAY);
    };
    var setPaused = function (p) {
      userPaused = p;
      pauseLabel.textContent = p ? "Play" : "Pause";
      pauseBtn.querySelector("svg").outerHTML = p
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M7 4.5v15l12-7.5z"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M8 5v14M16 5v14"/></svg>';
      schedule();
    };
    root.querySelector("[data-prev]").addEventListener("click", function () { show(current - 1); schedule(); });
    root.querySelector("[data-next]").addEventListener("click", function () { show(current + 1); schedule(); });
    dots.forEach(function (d) { d.addEventListener("click", function () { show(+d.getAttribute("data-dot")); schedule(); }); });
    pauseBtn.addEventListener("click", function () { setPaused(!userPaused); });
    root.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { show(current + 1); schedule(); e.preventDefault(); }
      else if (e.key === "ArrowLeft") { show(current - 1); schedule(); e.preventDefault(); }
    });

    root.addEventListener("mouseenter", function () { hoverPause = true; schedule(); });
    root.addEventListener("mouseleave", function () { hoverPause = false; schedule(); });
    root.addEventListener("focusin", function () { hoverPause = true; schedule(); });
    root.addEventListener("focusout", function (e) { if (!root.contains(e.relatedTarget)) { hoverPause = false; schedule(); } });

    var visible = false;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) schedule(); else clearTimeout(timer); }).observe(root);
    }
    document.addEventListener("visibilitychange", function () { if (document.hidden) clearTimeout(timer); else if (visible) schedule(); });
    reduceMQ.addEventListener && reduceMQ.addEventListener("change", function () { if (reduce()) { setPaused(true); pauseBtn.hidden = true; } });
    if (userPaused) { setPaused(true); pauseBtn.hidden = true; }
    show(0);
  });
  }
})();
