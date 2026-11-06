// Effets et animations communs à tous les sites de coachs.
// Désactivés automatiquement si le visiteur a demandé moins d'animations. Si ce script échoue, le site reste lisible.
(function () {
  "use strict";
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const root = document.documentElement;
  root.classList.add("js-motion");

  // --- 1. Apparition au défilement (avec léger décalage entre éléments voisins) ---
  const SEL = [
    ".section .eyebrow", ".section .h2", ".section .lead", ".coach__portrait", ".coach__body > p", ".coach__body > blockquote", ".coach__grid > div", ".chips",
    ".svc", ".loc", ".stage", ".quote", ".gal-item", ".rating-head", ".contact .wrap > *", ".booking-section .panel", ".footer .wrap > *",
  ].join(",");
  const io = "IntersectionObserver" in window ? new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add("in");
      io.unobserve(e.target);
    }
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }) : null;
  function watch(scope) {
    (scope || document).querySelectorAll(SEL).forEach((el) => {
      if (el.dataset.mo) return;
      el.dataset.mo = "1";
      if (!io) return;
      const sib = el.parentElement ? [...el.parentElement.children].filter((c) => c.dataset && c.dataset.mo).indexOf(el) : 0;
      el.style.setProperty("--mo-delay", Math.min(Math.max(sib, 0), 6) * 70 + "ms");
      el.classList.add("reveal");
      // déjà visible au chargement : pas d'attente
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight * 0.9 && r.bottom > 0) requestAnimationFrame(() => el.classList.add("in"));
      else io.observe(el);
    });
  }
  watch();
  // Les contenus (prestations, avis, galerie…) arrivent après le chargement : on les prend au vol.
  const main = document.getElementById("main");
  if (main && "MutationObserver" in window) {
    let t = 0;
    new MutationObserver(() => { clearTimeout(t); t = setTimeout(() => { watch(); countUps(); }, 60); }).observe(main, { childList: true, subtree: true });
  }
  // Filet de sécurité : rien ne reste caché.
  setTimeout(() => document.querySelectorAll(".reveal:not(.in)").forEach((el) => { const r = el.getBoundingClientRect(); if (r.top < innerHeight * 1.5) el.classList.add("in"); }), 3500);

  // --- 2. Bandeau : les lignes du terrain se dessinent, la photo entre en douceur ---
  document.querySelectorAll(".hero__lines rect, .hero__lines line:not(.hero__net)").forEach((el, i) => {
    el.setAttribute("pathLength", "1");
    el.style.setProperty("--mo-i", i);
  });

  // --- 3. Chiffres clés : compteur animé (ex. 150+, 3 ans) ---
  const done = new WeakSet();
  function countUps() {
    if (root.classList.contains("boot")) return;
    document.querySelectorAll(".stats dd").forEach((dd) => {
      if (done.has(dd) || dd.dataset.moText === dd.textContent) return;
      const m = /^(\d{1,5})(.*)$/.exec(dd.textContent.trim());
      if (!m) return;
      done.add(dd);
      dd.dataset.moText = dd.textContent;
      const end = Number(m[1]), tail = m[2], t0 = performance.now(), dur = 1100;
      if (end < 2) return;
      const step = (now) => {
        const k = Math.min(1, (now - t0) / dur), v = Math.round(end * (1 - Math.pow(1 - k, 3)));
        dd.textContent = v + tail;
        if (k < 1) requestAnimationFrame(step); else dd.dataset.moText = dd.textContent;
      };
      dd.textContent = "0" + tail;
      requestAnimationFrame(step);
    });
  }
  countUps();
  new MutationObserver(() => { if (!root.classList.contains("boot")) countUps(); }).observe(root, { attributes: true, attributeFilter: ["class"] });

  // --- 4. En-tête (ombre au défilement), barre de progression, léger parallaxe de la photo ---
  const top = document.querySelector(".topbar");
  const bar = document.createElement("div");
  bar.className = "scroll-progress"; bar.setAttribute("aria-hidden", "true");
  document.body.appendChild(bar);
  const media = document.querySelector(".hero__media");
  let tick = false;
  function onScroll() {
    if (tick) return;
    tick = true;
    requestAnimationFrame(() => {
      tick = false;
      const y = window.scrollY, h = document.documentElement.scrollHeight - innerHeight;
      if (top) top.classList.toggle("is-scrolled", y > 8);
      bar.style.transform = "scaleX(" + (h > 0 ? Math.min(1, y / h) : 0) + ")";
      if (media && y < innerHeight && innerWidth > 860) media.style.setProperty("--par", (y * 0.06).toFixed(1) + "px");
    });
  }
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();
