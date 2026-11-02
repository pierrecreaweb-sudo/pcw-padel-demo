// Site public du coach : rendu du contenu et tunnel de réservation en 3 étapes.
(function () {
  "use strict";
  const P = window.PCW;
  const $ = (s) => document.querySelector(s);
  const esc = P.esc;
  // Seuls les liens https et les images https/data:image sont acceptés (contenus saisis par le coach).
  const safeHref = (u) => (/^https:\/\//i.test(String(u || "")) ? u : "");
  const safeImg = (u) => (/^(https:\/\/|data:image\/)/i.test(String(u || "")) ? u : "");

  const state = {
    api: null, slug: null, site: null, tz: "Europe/Paris",
    step: 1, service: null, slots: [], byDay: new Map(), day: null, slot: null, party: 1,
    loadingSlots: false, error: "", submitting: false, result: null,
    form: { first_name: "", last_name: "", email: "", phone: "", level: "", message: "", accept: false },
  };

  // ------------------------------------------------------------- thème ---
  function applyTheme(theme) {
    const root = document.documentElement.style;
    const primary = P.hexToRgb(theme.primary) ? theme.primary : "#0E2A52";
    const accent = P.hexToRgb(theme.accent) ? theme.accent : "#E4F55B";
    root.setProperty("--brand", primary);
    root.setProperty("--brand-2", P.mix(primary, "#4F8EF7", 0.35));
    root.setProperty("--ball", accent);
    root.setProperty("--on-brand", P.readableOn(primary));
    root.setProperty("--on-brand-muted", P.readableOn(primary) === "#FFFFFF" ? "rgba(255,255,255,.74)" : "rgba(11,24,48,.7)");
    root.setProperty("--ink", P.mix(primary, "#000000", 0.55));
    if (P.hexToRgb(theme.surface)) root.setProperty("--surface", theme.surface);
    if (theme.font_display) root.setProperty("--f-display", `"${theme.font_display}", "Arial Narrow", system-ui, sans-serif`);
    if (theme.font_body) root.setProperty("--f-body", `"${theme.font_body}", system-ui, -apple-system, "Segoe UI", sans-serif`);
    const link = $("#font-link");
    const url = P.fontsUrl(theme.font_display, theme.font_body);
    if (link && link.href !== url) link.href = url;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = primary;
  }


  // ---------------------------------------------------------------- avis ---
  // Avis vérifiés (laissés après une séance) avec la note de coaching ; à défaut, les témoignages du coach.
  const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"/></svg>';
  const starRow = (n) => `<span class="stars" role="img" aria-label="${n.toLocaleString("fr-FR")} sur 5">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= Math.round(n) ? "on" : ""}">${STAR}</i>`).join("")}</span>`;
  const fmtNote = (n) => n.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  let reviewsShown = 6;
  function renderReviews(testimonials) {
    const rating = state.site.rating || { count: 0 }, reviews = state.site.reviews || [];
    const name = state.site.coach.display_name;
    const hr = $("#hero-rating");
    if (rating.count >= 3 && rating.average != null) {
      hr.innerHTML = `${starRow(rating.average)}<b>${fmtNote(rating.average)}/5</b><span>${rating.count} avis d'élèves vérifiés</span>`;
      hr.hidden = false;
    } else hr.hidden = true;
    if (reviews.length) {
      $("#avis-title").textContent = "L'avis de mes élèves";
      $("#rating-head").innerHTML = `<div class="rating-head__score"><span class="rating-head__value">${fmtNote(rating.average)}</span><span class="rating-head__max">/ 5</span></div>
        <div>${starRow(rating.average)}<p><b>Note de coaching</b> · ${rating.count} avis</p>
        <p class="muted">Avis vérifiés : laissés uniquement par des élèves après une séance réservée sur ce site.</p></div>`;
      $("#rating-head").hidden = false;
      const list = reviews.slice(0, reviewsShown);
      $("#testimonials").innerHTML = list.map((r) => `<figure class="quote quote--review">${starRow(r.rating)}
        ${r.comment ? `<p>${esc(r.comment)}</p>` : `<p class="muted quote__empty">Note sans commentaire</p>`}
        <footer>${esc(r.author)}<small>${esc([r.service_name, r.date ? P.fmtYmd(r.date) : ""].filter(Boolean).join(" · "))}</small></footer>
        ${r.reply ? `<blockquote class="quote__reply"><b>Réponse de ${esc(name)}</b>${esc(r.reply)}</blockquote>` : ""}</figure>`).join("");
      $("#reviews-more").hidden = reviews.length <= reviewsShown;
      $("#avis").hidden = false;
      return;
    }
    $("#rating-head").hidden = true;
    $("#reviews-more").hidden = true;
    $("#testimonials").innerHTML = testimonials.map((t) => `
      <figure class="quote">${t.rating ? `<span class="stars stars--text" aria-label="${t.rating} sur 5">${"★".repeat(t.rating)}</span>` : ""}
      <p>${esc(t.text)}</p><footer>${esc(t.author)}</footer></figure>`).join("");
    $("#avis").hidden = !testimonials.length;
  }

  // Garde le coach affiché (?c=slug) quand on passe d'une page à l'autre.
  function withSlug(href) {
    const q = new URLSearchParams(location.search).get("c");
    if (!q) return href;
    const [path, hash] = href.split("#");
    return `${path}${path.includes("?") ? "&" : "?"}c=${encodeURIComponent(q)}${hash ? "#" + hash : ""}`;
  }
  function fixLinks() {
    document.querySelectorAll("a[data-keep-slug]").forEach((a) => { a.href = withSlug(a.getAttribute("href")); });
  }

  // ------------------------------------------------------------ contact ---
  async function sendContact() {
    const form = $("#contact-form"), alert = $("#contact-alert"), btn = form.querySelector("button[type=submit]");
    const fd = new FormData(form);
    const m = Object.fromEntries([...fd.entries()].map(([k, v]) => [k, String(v).trim()]));
    const fail = (msg, id) => { alert.innerHTML = `<p class="alert alert--err" style="margin:0">${esc(msg)}</p>`; if (id) document.getElementById(id).focus(); };
    if (!m.name) return fail("Indiquez votre nom.", "m-name");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m.email)) return fail("Vérifiez votre adresse email.", "m-email");
    if (m.message.length < 5) return fail("Écrivez votre message.", "m-message");
    btn.disabled = true; btn.textContent = "Envoi…"; alert.innerHTML = "";
    try {
      await state.api.sendMessage(state.slug, m);
      form.innerHTML = `<div class="contact-sent"><div class="booked__icon" aria-hidden="true">✓</div><h3>Message envoyé</h3>
        <p>${esc(state.site.coach.display_name)} vous répondra très vite à l'adresse ${esc(m.email)}.</p></div>`;
    } catch (e) {
      fail(e.message); btn.disabled = false; btn.textContent = "Envoyer le message";
    }
  }

  function setMeta(site) {
    const c = site.content || {};
    document.title = c.seo_title || `${site.coach.display_name}, coach de padel`;
    let d = document.querySelector('meta[name="description"]');
    if (d && c.seo_description) d.content = c.seo_description;
    const meta = (prop, val) => {
      if (!val) return;
      let el = document.head.querySelector(`meta[property="${prop}"]`);
      if (!el) { el = document.createElement("meta"); el.setAttribute("property", prop); document.head.appendChild(el); }
      el.content = val;
    };
    // Une adresse canonique écrite au déploiement (domaine du coach) prime sur celle calculée ici.
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = Object.assign(document.createElement("link"), { rel: "canonical" });
      canonical.href = location.origin + location.pathname + (new URLSearchParams(location.search).get("c") ? `?c=${encodeURIComponent(state.slug)}` : "");
      document.head.appendChild(canonical);
    }
    const theme = site.theme || {};
    meta("og:type", "website"); meta("og:locale", "fr_FR"); meta("og:title", document.title);
    meta("og:description", c.seo_description || c.hero_subtitle); meta("og:url", canonical.href);
    meta("og:image", /^https:\/\//.test(theme.hero_image || "") ? theme.hero_image : (/^https:\/\//.test(theme.portrait_image || "") ? theme.portrait_image : ""));
    const loc = (site.locations || [])[0];
    const ld = {
      "@context": "https://schema.org", "@type": "LocalBusiness",
      name: site.coach.display_name, description: c.seo_description || c.hero_subtitle,
      telephone: c.phone || undefined, email: c.email || undefined, url: location.href.split("#")[0],
      areaServed: site.coach.city || undefined,
      address: loc ? { "@type": "PostalAddress", streetAddress: loc.address, addressLocality: site.coach.city } : undefined,
      makesOffer: (site.services || []).map((s) => ({ "@type": "Offer", name: s.name, price: (s.price_cents / 100).toFixed(2), priceCurrency: "EUR" })),
    };
    const tag = document.createElement("script");
    tag.type = "application/ld+json";
    tag.textContent = JSON.stringify(ld);
    document.head.appendChild(tag);
  }

  // --------------------------------------------------------- contenus ---
  function initials(name) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase(); }


  // ------------------------------------------------------------ photos ---
  const isDemo = () => state.api && state.api.mode === "demo";
  const CAMERA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';
  const COURT = '<svg class="ph__court" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><rect x="6" y="6" width="88" height="88"/><line x1="6" y1="50" x2="94" y2="50" stroke-dasharray="2 2"/><line x1="6" y1="22" x2="94" y2="22"/><line x1="6" y1="78" x2="94" y2="78"/><line x1="50" y1="22" x2="50" y2="78"/></svg>';
  // Emplacement stylisé : en démo, il annonce la photo attendue ; sur un vrai site sans photo, il montre les initiales.
  function placeholder(label, { mono } = {}) {
    if (mono) return `<div class="ph" role="img" aria-label="${esc(state.site.coach.display_name)}">${COURT}<div class="ph__inner"><span class="ph__mono">${esc(initials(state.site.coach.display_name))}</span></div></div>`;
    return `<div class="ph" role="img" aria-label="${esc(label)}">${COURT}<div class="ph__inner"><span class="ph__icon">${CAMERA}</span>
      <span class="ph__label">${esc(label)}</span>${isDemo() ? '<span class="ph__tag">Emplacement photo</span>' : ""}</div></div>`;
  }

  function renderHeroMedia() {
    const { coach, theme = {}, content: c = {} } = state.site;
    const main = safeImg(theme.hero_image), inset = safeImg(theme.hero_image_2);
    const crops = theme.crops || {};
    const badgeTitle = (c.achievements || [])[0] || (c.diplomas || [])[0] || "";
    const badgeSub = (c.diplomas || [])[0] && badgeTitle !== c.diplomas[0] ? c.diplomas[0] : "";
    $("#hero-media").innerHTML = `
      <figure class="shot shot--main">${main ? `<img src="${esc(main)}" alt="${esc(coach.display_name)}, coach de padel" fetchpriority="high"${P.cropStyle(crops.hero_image)}>`
        : placeholder("Photo du coach sur le terrain", { mono: !isDemo() })}</figure>
      ${inset || isDemo() ? `<figure class="shot shot--inset">${inset ? `<img src="${esc(inset)}" alt="${esc(coach.display_name)} pendant un cours" loading="lazy"${P.cropStyle(crops.hero_image_2)}>`
        : placeholder("Photo en cours")}</figure>` : ""}
      ${badgeTitle ? `<div class="hero-badge"><span class="hero-badge__ball" aria-hidden="true"></span><span>${esc(badgeTitle)}${badgeSub ? `<small>${esc(badgeSub)}</small>` : ""}</span></div>` : ""}`;
  }

  const GAL_PREVIEW = 10;
  // Taille de chaque case pour que la mosaïque n'ait jamais de trou.
  function tileClasses(n) {
    const out = [];
    const full = Math.floor(n / 5) * 5;
    for (let i = 0; i < full; i++) out.push(i % 5 === 0 ? "g-big" : "");
    const k = n - full;
    const tail = { 1: ["g-pano"], 2: ["g-wide", "g-wide"], 3: ["g-big", "g-wide", "g-wide"], 4: ["g-big", "", "", "g-wide"] }[k] || [];
    return out.concat(tail);
  }
  function renderGallery() {
    const items = (state.site.gallery || []).filter((g) => safeImg(g.url) || (isDemo() && !g.url));
    $("#galerie").hidden = !items.length;
    document.querySelectorAll('a[href="#galerie"]').forEach((a) => { a.hidden = !items.length; });
    if (!items.length) return;
    state.gallery = items;
    const shown = items.slice(0, GAL_PREVIEW);
    $("#gal-count").textContent = `${items.length} photo${items.length > 1 ? "s" : ""}`;
    const cls = tileClasses(shown.length);
    $("#gallery").innerHTML = shown.map((g, i) => `
      <button type="button" class="gal-item ${cls[i]}" data-photo="${i}" aria-label="Agrandir : ${esc(g.caption || "photo " + (i + 1))}">
        ${g.url ? `<img src="${esc(g.url)}" alt="${esc(g.caption || "")}" loading="lazy"${P.cropStyle(g.crop)}>` : placeholder(g.caption || "Photo de cours")}
        ${g.url && g.caption ? `<span class="gal-item__cap">${esc(g.caption)}</span>` : ""}
      </button>`).join("");
    $("#gal-more").innerHTML = items.length > GAL_PREVIEW
      ? `<button type="button" class="btn btn--ghost-light" data-photo="${GAL_PREVIEW}">Voir toutes les photos (${items.length})</button>` : "";
  }

  // Plein écran : flèches, clavier et glissement au doigt.
  let lbIndex = 0, lbOpener = null;
  function lbShow(i) {
    const items = state.gallery || [];
    lbIndex = (i + items.length) % items.length;
    const g = items[lbIndex];
    $("#lb-img").innerHTML = g.url ? `<img src="${esc(g.url)}" alt="${esc(g.caption || "")}">` : placeholder(g.caption || "Photo de cours");
    $("#lb-caption").textContent = g.caption || "";
    $("#lb-count").textContent = `${lbIndex + 1} / ${items.length}`;
    const one = items.length < 2;
    $("#lb-prev").hidden = one; $("#lb-next").hidden = one;
  }
  function lbOpen(i, opener) {
    lbOpener = opener || null;
    $("#lightbox").hidden = false;
    document.body.style.overflow = "hidden";
    lbShow(i);
    $("#lb-close").focus();
  }
  function lbClose() {
    $("#lightbox").hidden = true;
    document.body.style.overflow = "";
    if (lbOpener) lbOpener.focus();
  }
  function bindLightbox() {
    $("#lb-close").addEventListener("click", lbClose);
    $("#lb-prev").addEventListener("click", () => lbShow(lbIndex - 1));
    $("#lb-next").addEventListener("click", () => lbShow(lbIndex + 1));
    $("#lightbox").addEventListener("click", (e) => { if (e.target.id === "lightbox" || e.target.id === "lb-img") lbClose(); });
    document.addEventListener("keydown", (e) => {
      if ($("#lightbox").hidden) return;
      if (e.key === "Escape") lbClose();
      if (e.key === "ArrowRight") lbShow(lbIndex + 1);
      if (e.key === "ArrowLeft") lbShow(lbIndex - 1);
    });
    let x0 = null;
    const stage = $("#lb-stage");
    stage.addEventListener("pointerdown", (e) => { x0 = e.clientX; });
    stage.addEventListener("pointerup", (e) => {
      if (x0 === null) return;
      const dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) lbShow(lbIndex + (dx < 0 ? 1 : -1));
    });
  }

  function renderStatic() {
    const { coach, content: c = {}, theme = {}, services = [], locations = [], testimonials = [] } = state.site;
    $("#brand-text").textContent = theme.logo_text || coach.display_name.toUpperCase();
    if (safeImg(theme.logo_url)) $("#brand").innerHTML = `<img src="${esc(theme.logo_url)}" alt="${esc(coach.display_name)}">`;
    $("#hero-eyebrow").textContent = [coach.display_name, coach.city].filter(Boolean).join(" · ");
    $("#hero-title").textContent = c.hero_title || `Coach de padel${coach.city ? " à " + coach.city : ""}`;
    $("#hero-sub").textContent = c.hero_subtitle || "";
    $("#stats").innerHTML = (c.stats || []).map((s) => `<div><dt>${esc(s.label)}</dt><dd>${esc(s.value)}</dd></div>`).join("");
    renderHeroMedia();
    renderGallery();

    $("#portrait").innerHTML = safeImg(theme.portrait_image)
      ? `<img src="${esc(theme.portrait_image)}" alt="Portrait de ${esc(coach.display_name)}"${P.cropStyle((theme.crops || {}).portrait_image)}>`
      : placeholder("Portrait du coach", { mono: !isDemo() });
    $("#coach-title").textContent = c.intro_title || coach.display_name;
    $("#coach-intro").textContent = c.intro || "";
    $("#coach-bio").textContent = c.bio || "";
    const philo = $("#coach-philo");
    philo.textContent = c.philosophy || "";
    philo.hidden = !c.philosophy;
    const list = (el, arr) => { $(el).innerHTML = (arr || []).map((x) => `<li>${esc(x)}</li>`).join(""); $(el).parentElement.hidden = !(arr || []).length; };
    list("#diplomas", c.diplomas);
    list("#achievements", c.achievements);
    $("#specialties").innerHTML = (c.specialties || []).map((x) => `<li>${esc(x)}</li>`).join("");

    const locName = (id) => (locations.find((l) => l.id === id) || {}).name;
    $("#services").innerHTML = services.map((s) => `
      <article class="svc">
        <div class="svc__top"><h3 class="svc__name">${esc(s.name)}</h3><span class="svc__price">${P.fmtPrice(s.price_cents)}</span></div>
        <div class="svc__meta">
          <span class="tag">${P.fmtDuration(s.duration_minutes)}</span>
          <span class="tag">${s.capacity > 1 ? `Jusqu'à ${s.capacity} joueurs` : "1 joueur"}</span>
          ${s.level ? `<span class="tag">${esc(s.level)}</span>` : ""}
          ${s.location_id && locName(s.location_id) ? `<span class="tag">${esc(locName(s.location_id))}</span>` : ""}
        </div>
        <p>${esc(s.description || "")}</p>
        <button type="button" class="btn btn--brand btn--sm" data-book="${esc(s.id)}">Réserver</button>
      </article>`).join("") || `<p class="muted">Les prestations seront bientôt en ligne.</p>`;

    $("#locations").innerHTML = locations.map((l) => `
      <article class="loc"><h3>${esc(l.name)}</h3>${l.address ? `<p>${esc(l.address)}</p>` : ""}
      ${safeHref(l.maps_url) ? `<a href="${esc(l.maps_url)}" target="_blank" rel="noopener">Itinéraire</a>` : ""}</article>`).join("");
    $("#lieux").hidden = !locations.length;

    renderReviews(testimonials);

    const rows = [];
    if (c.phone) rows.push(["Téléphone", c.phone, `tel:${c.phone.replace(/\s/g, "")}`, "Appeler"]);
    if (c.whatsapp) rows.push(["WhatsApp", "+" + c.whatsapp.replace(/^\+/, ""), `https://wa.me/${c.whatsapp.replace(/\D/g, "")}`, "Écrire"]);
    if (c.email) rows.push(["Email", c.email, `mailto:${c.email}`, "Écrire"]);
    if (safeHref(c.instagram)) rows.push(["Instagram", c.instagram.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""), c.instagram, "Voir"]);
    $("#contact-list").innerHTML = rows.map(([k, v, href, label]) => `
      <li><div><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div><a href="${esc(href)}" target="_blank" rel="noopener">${label}</a></li>`).join("");
    if (c.whatsapp) {
      const w = $("#whatsapp");
      w.href = `https://wa.me/${c.whatsapp.replace(/\D/g, "")}`;
      w.hidden = false;
    }

    $("#footer-name").textContent = `© ${new Date().getFullYear()} ${coach.display_name}`;
    // Badge PCW : lien de parrainage et version claire ou sombre selon la couleur du pied de page.
    const badge = document.getElementById("pcw-badge");
    if (badge) {
      badge.href = `https://pcwpadel.fr/?ref=${encodeURIComponent(coach.slug)}`;
      const bg = getComputedStyle(badge.closest("footer") || document.body).backgroundColor.match(/\d+(\.\d+)?/g) || [255, 255, 255];
      const lum = (0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2]) / 255;
      // Fond sombre : badge clair qui ressort ; fond clair : badge marine.
      badge.classList.toggle("pcw-badge--dark", lum > 0.5);
    }
  }

  // ------------------------------------------------------- réservation ---
  const services = () => state.site.services || [];
  const locById = (id) => (state.site.locations || []).find((l) => l.id === id);

  function stepsHtml() {
    const labels = ["Prestation", "Créneau", "Coordonnées"];
    return `<ol class="steps">${labels.map((l, i) => {
      const n = i + 1;
      const cls = state.step > n ? "done" : "";
      return `<li class="${cls}" ${state.step === n ? 'aria-current="step"' : ""}><span>${l}</span></li>`;
    }).join("")}</ol>`;
  }

  function summaryHtml() {
    const s = state.service, sl = state.slot, coach = state.site.coach;
    const loc = sl ? locById(sl.location_id) : null;
    const row = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
    return `<aside class="panel summary" aria-label="Récapitulatif">
      <h3>Votre séance</h3>
      <dl>
        ${row("Prestation", s ? esc(s.name) : "<span class='muted'>À choisir</span>")}
        ${row("Date", sl ? esc(P.fmtDate(sl.starts_at, state.tz)) : "<span class='muted'>À choisir</span>")}
        ${sl ? row("Horaire", `${P.fmtTime(sl.starts_at, state.tz)} – ${P.fmtTime(sl.ends_at, state.tz)}`) : ""}
        ${loc ? row("Lieu", esc(loc.name)) : ""}
        ${s && s.capacity > 1 ? row("Joueurs", String(state.party)) : ""}
        ${s ? row("Tarif", `${P.fmtPrice(s.price_cents)} <span class="muted" style="font-weight:500">à régler sur place</span>`) : ""}
      </dl>
      <p class="note">Annulation gratuite en ligne jusqu'à ${coach.cancel_hours} h avant la séance.${coach.auto_confirm ? "" : " Votre demande sera validée par le coach."}</p>
    </aside>`;
  }

  function step1() {
    return `<h3 class="h3">Choisissez votre prestation</h3>
      <div class="choice-list" role="list">${services().map((s) => `
        <button type="button" class="choice" role="listitem" data-service="${esc(s.id)}" aria-pressed="${!!(state.service && state.service.id === s.id)}">
          <span class="choice__dot" style="background:${esc(s.color || "var(--brand)")}"></span>
          <span><span class="choice__name">${esc(s.name)}</span><br>
          <span class="choice__meta">${P.fmtDuration(s.duration_minutes)} · ${s.capacity > 1 ? `jusqu'à ${s.capacity} joueurs` : "1 joueur"}${s.level ? " · " + esc(s.level) : ""}</span></span>
          <span class="choice__price">${P.fmtPrice(s.price_cents)}</span>
        </button>`).join("")}</div>`;
  }

  function step2() {
    if (state.loadingSlots) {
      return `<h3 class="h3">Choisissez votre créneau</h3><div class="skeleton" style="height:76px"></div><div class="skeleton" style="height:120px;margin-top:16px"></div>`;
    }
    const today = P.localYmd(new Date(), state.tz);
    const days = [];
    for (let i = 0; i <= state.site.coach.max_advance_days; i++) days.push(P.addDays(today, i));
    const total = state.slots.length;
    if (!total) {
      return `<h3 class="h3">Choisissez votre créneau</h3>
        <div class="empty">Aucun créneau libre pour « ${esc(state.service.name)} » dans les ${state.site.coach.max_advance_days} prochains jours.<br>
        Contactez directement le coach pour trouver un horaire.</div>
        <div class="actions"><button type="button" class="btn btn--ghost" data-go="1">Changer de prestation</button>
        <a class="btn btn--brand" href="#contact">Contacter le coach</a></div>`;
    }
    const daySlots = state.byDay.get(state.day) || [];
    const groups = [["Matin", (h) => h < 12], ["Après-midi", (h) => h >= 12 && h < 17], ["Soir", (h) => h >= 17]];
    const [y, m] = state.day.split("-").map(Number);
    const monthLabel = `${P.cap(P.MONTHS[m - 1])} ${y}`;
    const selLoc = state.slot ? locById(state.slot.location_id) : null;
    return `<h3 class="h3">Choisissez votre créneau</h3>
      <div class="day-nav"><span>${monthLabel}</span><span class="muted" style="font-weight:500;font-size:14px">${total} créneau${total > 1 ? "x" : ""} libre${total > 1 ? "s" : ""}</span></div>
      <div class="days" id="days">${days.map((d) => {
        const n = (state.byDay.get(d) || []).length;
        const [, , dd] = d.split("-").map(Number);
        return `<button type="button" class="day" data-day="${d}" aria-pressed="${d === state.day}" ${n ? "" : "disabled"} aria-label="${P.fmtYmd(d)}, ${n} créneaux">
          <small>${P.DAYS_SHORT[P.isoWeekday(d) - 1]}</small><strong>${dd}</strong><i>${n ? n + (n > 1 ? " libres" : " libre") : "complet"}</i></button>`;
      }).join("")}</div>
      ${groups.map(([label, test]) => {
        const list = daySlots.filter((s) => test(P.tzParts(new Date(s.starts_at), state.tz).h));
        if (!list.length) return "";
        return `<div class="slot-group"><h4>${label}</h4><div class="slots">${list.map((s) =>
          `<button type="button" class="slot" data-slot="${esc(s.starts_at)}" aria-pressed="${!!(state.slot && state.slot.starts_at === s.starts_at)}">${P.fmtTime(s.starts_at, state.tz)}</button>`).join("")}</div></div>`;
      }).join("")}
      ${selLoc ? `<p class="slot-loc">Lieu : <strong>${esc(selLoc.name)}</strong>${selLoc.address ? ", " + esc(selLoc.address) : ""}</p>` : ""}
      ${state.error ? `<p class="alert alert--err" role="alert">${esc(state.error)}</p>` : ""}
      <div class="actions"><button type="button" class="btn btn--ghost" data-go="1">Retour</button>
      <button type="button" class="btn btn--brand" data-go="3" ${state.slot ? "" : "disabled"}>Continuer</button></div>`;
  }

  function step3() {
    const f = state.form, s = state.service;
    const levels = ["Débutant", "P25", "P50", "P100", "P250", "P500", "P1000 et plus", "Je ne sais pas"];
    return `<h3 class="h3">Vos coordonnées</h3>
      <form class="form" id="book-form" novalidate>
        <div class="field"><label for="f-first">Prénom</label><input id="f-first" name="first_name" autocomplete="given-name" required value="${esc(f.first_name)}"></div>
        <div class="field"><label for="f-last">Nom</label><input id="f-last" name="last_name" autocomplete="family-name" value="${esc(f.last_name)}"></div>
        <div class="field"><label for="f-email">Email</label><input id="f-email" name="email" type="email" autocomplete="email" required value="${esc(f.email)}" placeholder="vous@exemple.fr"></div>
        <div class="field"><label for="f-phone">Téléphone</label><input id="f-phone" name="phone" type="tel" autocomplete="tel" required value="${esc(f.phone)}" placeholder="06 12 34 56 78"></div>
        <div class="field"><label for="f-level">Votre niveau</label><select id="f-level" name="level">
          <option value="">Choisir</option>${levels.map((l) => `<option ${f.level === l ? "selected" : ""}>${l}</option>`).join("")}</select></div>
        ${s.capacity > 1 ? `<div class="field"><label for="f-party">Nombre de joueurs</label><select id="f-party" name="party">
          ${Array.from({ length: s.capacity }, (_, i) => `<option value="${i + 1}" ${state.party === i + 1 ? "selected" : ""}>${i + 1}</option>`).join("")}</select></div>` : ""}
        <div class="field full"><label for="f-msg">Un objectif pour cette séance ? <span class="muted" style="font-weight:500">(facultatif)</span></label>
          <textarea id="f-msg" name="message" maxlength="1000" placeholder="Ex. : travailler la sortie de vitre, préparer un tournoi…">${esc(f.message)}</textarea></div>
        <label class="check full"><input type="checkbox" id="f-accept" name="accept" ${f.accept ? "checked" : ""}>
          <span>J'accepte les <a href="${esc(withSlug("conditions.html"))}" target="_blank" rel="noopener">conditions de réservation</a> (annulation gratuite jusqu'à ${state.site.coach.cancel_hours} h avant) et l'utilisation de mes coordonnées pour organiser la séance.</span></label>
        ${state.error ? `<p class="alert alert--err full" role="alert">${esc(state.error)}</p>` : ""}
        <div class="actions full"><button type="button" class="btn btn--ghost" data-go="2">Retour</button>
          <button type="submit" class="btn btn--ball" ${state.submitting ? "disabled" : ""}>${state.submitting ? "Réservation…" : state.site.coach.auto_confirm ? "Confirmer la réservation" : "Envoyer ma demande"}</button></div>
      </form>`;
  }

  function doneHtml() {
    const r = state.result, s = state.service, loc = locById(state.slot.location_id);
    const confirmed = r.status === "confirmed";
    const manage = `reservation.html?t=${encodeURIComponent(r.token)}&c=${encodeURIComponent(state.slug)}`;
    const gcal = P.googleCalendarUrl({
      title: `${s.name} avec ${state.site.coach.display_name}`, start: r.starts_at, end: r.ends_at,
      location: loc ? [loc.name, loc.address].filter(Boolean).join(", ") : "", details: "Séance de padel",
    });
    return `<div class="panel booked">
      <div class="booked__icon" aria-hidden="true">✓</div>
      <h3>${confirmed ? "Séance confirmée" : "Demande envoyée"}</h3>
      <p class="muted">${esc(P.fmtDate(r.starts_at, state.tz))}, ${P.fmtTime(r.starts_at, state.tz)} – ${P.fmtTime(r.ends_at, state.tz)}${loc ? " · " + esc(loc.name) : ""}</p>
      <p>${confirmed ? "Un email de confirmation vient de vous être envoyé avec le lien pour gérer votre réservation."
        : "Le coach va valider votre demande. Vous recevrez un email dès qu'elle sera confirmée."}</p>
      <div class="actions">
        <a class="btn btn--brand" href="${esc(gcal)}" target="_blank" rel="noopener">Ajouter à Google Agenda</a>
        <a class="btn btn--ghost" href="${esc(manage)}">Gérer ma réservation</a>
        <button type="button" class="btn btn--ghost" data-restart>Réserver une autre séance</button>
      </div></div>`;
  }

  function renderBooking() {
    const el = $("#booking");
    if (state.step === 4) { el.innerHTML = doneHtml(); el.style.gridTemplateColumns = "1fr"; return; }
    el.style.gridTemplateColumns = "";
    const body = state.step === 1 ? step1() : state.step === 2 ? step2() : step3();
    el.innerHTML = `<div class="panel">${stepsHtml()}${body}</div>${summaryHtml()}`;
    if (state.step === 2) {
      const sel = el.querySelector('.day[aria-pressed="true"]');
      if (sel) sel.scrollIntoView({ block: "nearest", inline: "center" });
    }
  }

  async function loadSlots() {
    state.loadingSlots = true;
    state.slot = null;
    renderBooking();
    const today = P.localYmd(new Date(), state.tz);
    const to = P.addDays(today, state.site.coach.max_advance_days);
    try {
      state.slots = await state.api.getSlots(state.slug, state.service.id, today, to);
    } catch (e) {
      state.slots = [];
      state.error = e.message;
    }
    state.byDay = new Map();
    for (const s of state.slots) {
      const d = P.localYmd(new Date(s.starts_at), state.tz);
      if (!state.byDay.has(d)) state.byDay.set(d, []);
      state.byDay.get(d).push(s);
    }
    if (!state.byDay.has(state.day)) state.day = state.byDay.keys().next().value || today;
    state.loadingSlots = false;
    renderBooking();
  }

  function selectService(id, scroll) {
    state.service = services().find((s) => s.id === id) || null;
    if (!state.service) return;
    state.party = 1;
    state.error = "";
    state.step = 2;
    loadSlots();
    if (scroll) $("#reserver").scrollIntoView({ behavior: "smooth" });
  }

  function readForm() {
    const fd = new FormData($("#book-form"));
    Object.assign(state.form, {
      first_name: (fd.get("first_name") || "").trim(), last_name: (fd.get("last_name") || "").trim(),
      email: (fd.get("email") || "").trim(), phone: (fd.get("phone") || "").trim(), level: fd.get("level") || "",
      message: (fd.get("message") || "").trim(), accept: fd.get("accept") === "on",
    });
    if (fd.get("party")) state.party = Number(fd.get("party"));
  }
  function validate() {
    const f = state.form;
    if (!f.first_name) return ["f-first", "Indiquez votre prénom."];
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) return ["f-email", "Vérifiez votre adresse email."];
    if (!/^\+?[0-9]{9,15}$/.test(f.phone.replace(/[^0-9+]/g, ""))) return ["f-phone", "Vérifiez votre numéro de téléphone (ex. 06 12 34 56 78)."];
    if (!f.accept) return ["f-accept", "Cochez la case pour accepter les conditions de réservation."];
    return null;
  }

  async function submit() {
    readForm();
    const bad = validate();
    if (bad) { state.error = bad[1]; renderBooking(); const el = document.getElementById(bad[0]); if (el) el.focus(); return; }
    state.error = "";
    state.submitting = true;
    renderBooking();
    try {
      state.result = await state.api.book(state.slug, {
        service_id: state.service.id, starts_at: state.slot.starts_at, party_size: state.party, ...state.form,
      });
      state.step = 4;
    } catch (e) {
      state.error = e.message;
      if (e.code === "SLOT_TAKEN") { state.step = 2; state.submitting = false; await loadSlots(); state.error = e.message; }
    }
    state.submitting = false;
    renderBooking();
    $("#reserver").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function bindEvents() {
    document.addEventListener("click", (ev) => {
      const t = ev.target.closest("button, a");
      if (!t) return;
      if (t.dataset.photo !== undefined) { lbOpen(Number(t.dataset.photo), t); return; }
      if (t.dataset.book) { ev.preventDefault(); selectService(t.dataset.book, true); }
      else if (t.dataset.service) selectService(t.dataset.service, false);
      else if (t.dataset.day) { state.day = t.dataset.day; state.slot = null; state.error = ""; renderBooking(); }
      else if (t.dataset.slot) {
        state.slot = (state.byDay.get(state.day) || []).find((s) => s.starts_at === t.dataset.slot);
        state.error = "";
        renderBooking();
      } else if (t.dataset.go) {
        if (state.step === 3) readForm();
        state.error = "";
        state.step = Number(t.dataset.go);
        if (state.step === 2 && !state.slots.length && state.service) loadSlots(); else renderBooking();
        if (state.step === 3) setTimeout(() => { const f = $("#f-first"); if (f) f.focus(); }, 0);
      } else if ("restart" in t.dataset) {
        Object.assign(state, { step: 1, service: null, slot: null, result: null, error: "" });
        renderBooking();
      }
    });
    document.addEventListener("submit", (ev) => { if (ev.target.id === "book-form") { ev.preventDefault(); submit(); } });
    document.addEventListener("change", (ev) => {
      if (ev.target.id === "f-party") { state.party = Number(ev.target.value); readForm(); renderBooking(); }
    });
    $("#contact-form").addEventListener("submit", (e) => { e.preventDefault(); sendContact(); });
    $("#reviews-more-btn").addEventListener("click", () => { reviewsShown += 6; renderReviews(state.site.testimonials || []); });
    $("#contact-form").addEventListener("input", () => { const a = $("#contact-alert"); if (a && a.innerHTML) a.innerHTML = ""; });
  }

  async function init() {
    bindEvents();
    bindLightbox();
    $("#booking").innerHTML = `<div class="panel"><div class="skeleton"></div><div class="skeleton" style="margin-top:12px;width:60%"></div></div>`;
    try {
      state.api = await P.backend();
      state.slug = P.currentSlug();
      state.site = await state.api.getSite(state.slug);
    } catch (e) {
      $("#booking").innerHTML = `<div class="panel"><p class="alert alert--err">${esc(e.message)}</p></div>`;
      return;
    }
    if (!state.site) {
      document.getElementById("main").innerHTML = `<section class="section"><div class="wrap"><h1 class="h2">Site introuvable</h1>
        <p class="muted">Ce site de coach n'existe pas ou n'est pas encore en ligne.</p></div></section>`;
      return;
    }
    state.tz = state.site.coach.timezone || "Europe/Paris";
    $("#demo-ribbon").hidden = state.api.mode !== "demo";
    applyTheme(state.site.theme || {});
    setMeta(state.site);
    renderStatic();
    fixLinks();
    const c = state.site.coach;
    $("#book-rules").textContent = `Réservation ouverte jusqu'à ${c.max_advance_days} jours à l'avance, au plus tard ${c.min_notice_hours} h avant la séance. Règlement sur place.`;
    const pre = new URLSearchParams(location.search).get("service");
    if (pre && services().some((s) => s.id === pre)) selectService(pre, false); else renderBooking();
  }

  init();
})();
