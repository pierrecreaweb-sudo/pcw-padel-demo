// Site public du coach : stages (avec inscription) et packs de séances.
// Chargé après site.js. Chaque bloc reste caché tant que le coach n'a rien publié.
(function () {
  "use strict";
  const P = window.PCW;
  const $ = (s) => document.querySelector(s);
  const esc = P.esc;
  const safeHref = (u) => (/^https:\/\//i.test(String(u || "")) ? u : "");
  const x = { api: null, slug: null, tz: "Europe/Paris", data: null, openStage: null, openPack: null, doneP: {}, done: {}, busy: false, err: "" };

  // ---------------------------------------------------------------- stages ---
  function when(s) {
    const a = P.fmtDate(s.starts_at, x.tz, "short"), b = P.fmtDate(s.ends_at, x.tz, "short");
    const ta = P.fmtTime(s.starts_at, x.tz), tb = P.fmtTime(s.ends_at, x.tz);
    return a === b ? `${a}, ${ta} à ${tb}` : `Du ${a} (${ta}) au ${b} (${tb})`;
  }
  function stageCard(s) {
    const full = s.places_left <= 0, closed = !s.registration_open;
    const loc = s.location ? `${esc(s.location.name)}${s.location.address ? ", " + esc(s.location.address) : ""}` : "";
    const done = x.done[s.id];
    let action;
    if (done) action = `<p class="alert alert--ok" role="status">Merci ${esc(done.first_name)} ! Votre inscription est confirmée : votre place est réservée. Un email de confirmation vous a été envoyé.</p>`;
    else if (closed) action = `<p class="muted">Inscriptions fermées : <a href="#contact">contactez le coach</a>.</p>`;
    else if (full) action = `<p class="muted"><strong>Complet.</strong> <a href="#contact">Contactez le coach</a> pour la liste d'attente.</p>`;
    else if (x.openStage === s.id) action = stageForm(s);
    else action = `<button type="button" class="btn btn--ball" data-stage-open="${esc(s.id)}">S'inscrire</button>`;
    return `<article class="stage" id="stage-${esc(s.id)}">
      <div class="stage__top"><h3 class="stage__title">${esc(s.title)}</h3>
        <span class="svc__price">${s.price_cents ? esc(P.fmtPrice(s.price_cents)) : "Sur demande"}</span></div>
      <p class="stage__when">${esc(when(s))}</p>
      <div class="svc__meta">
        ${loc ? `<span class="tag">${loc}</span>` : ""}
        ${s.level ? `<span class="tag">${esc(s.level)}</span>` : ""}
        <span class="tag">${full ? "Complet" : `${s.places_left} place${s.places_left > 1 ? "s" : ""} restante${s.places_left > 1 ? "s" : ""}`}</span>
      </div>
      ${s.description ? `<p class="stage__desc">${esc(s.description)}</p>` : ""}
      <div class="stage__action">${action}</div></article>`;
  }
  function stageForm(s) {
    const max = Math.max(1, Math.min(6, s.places_left));
    return `<form class="stage-form" data-stage-form="${esc(s.id)}" novalidate>
      <div class="contact-form__grid">
        <div class="field"><label for="sf-fn-${esc(s.id)}">Prénom</label><input id="sf-fn-${esc(s.id)}" name="first_name" autocomplete="given-name" maxlength="80" required></div>
        <div class="field"><label for="sf-ln-${esc(s.id)}">Nom</label><input id="sf-ln-${esc(s.id)}" name="last_name" autocomplete="family-name" maxlength="80"></div>
        <div class="field"><label for="sf-em-${esc(s.id)}">Email</label><input id="sf-em-${esc(s.id)}" name="email" type="email" autocomplete="email" maxlength="200" required></div>
        <div class="field"><label for="sf-ph-${esc(s.id)}">Téléphone</label><input id="sf-ph-${esc(s.id)}" name="phone" type="tel" autocomplete="tel" maxlength="30" required></div>
        <div class="field"><label for="sf-ps-${esc(s.id)}">Nombre de personnes</label><select id="sf-ps-${esc(s.id)}" name="party_size">${Array.from({ length: max }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join("")}</select></div>
        <div class="field full"><label for="sf-ms-${esc(s.id)}">Message <span class="opt">(facultatif)</span></label><textarea id="sf-ms-${esc(s.id)}" name="message" maxlength="1000" rows="2" placeholder="Votre niveau, une question…"></textarea></div>
      </div>
      <label class="check"><input type="checkbox" name="accept" required> J'accepte que mes coordonnées soient transmises au coach pour traiter cette inscription (voir la page <a href="conditions.html" target="_blank" rel="noopener">Conditions</a>).</label>
      ${x.err ? `<p class="alert alert--err" role="alert">${esc(x.err)}</p>` : ""}
      <div class="stage-form__bar"><button type="button" class="btn btn--ghost" data-stage-cancel>Annuler</button>
        <button type="submit" class="btn btn--ball" ${x.busy ? "disabled" : ""}>${x.busy ? "Envoi…" : "Confirmer mon inscription"}</button></div>
      <p class="muted stage-form__note">Aucun paiement maintenant. Paiement en ligne : prochainement disponible.</p></form>`;
  }
  function renderStages() {
    const list = x.data.stages || [];
    const sec = $("#stages");
    if (!sec) return;
    sec.hidden = !list.length;
    if (!list.length) return;
    $("#stages-list").innerHTML = list.map(stageCard).join("");
  }

  // ----------------------------------------------------------------- packs ---
  function packAction(k) {
    const d = x.doneP[k.id];
    if (d) return `<p class="alert alert--ok" role="status">Merci ${esc(d.first_name)} ! Votre pack est enregistr\u00e9 : il est r\u00e9serv\u00e9 \u00e0 votre nom et votre coach vous contacte pour le r\u00e8glement. Vous le retrouverez dans votre <a href="mon-espace.html${x.slug ? "?c=" + encodeURIComponent(x.slug) : ""}">espace joueur</a> d\u00e8s votre premier cours.</p>`;
    if (x.openPack !== k.id) return `<button type="button" class="btn btn--ball" data-pack-open="${esc(k.id)}">Prendre ce pack</button>`;
    const i = esc(k.id);
    return `<form class="stage-form" data-pack-form="${i}" novalidate>
      <div class="contact-form__grid">
        <div class="field"><label for="pf-fn-${i}">Pr\u00e9nom</label><input id="pf-fn-${i}" name="first_name" autocomplete="given-name" maxlength="80" required></div>
        <div class="field"><label for="pf-ln-${i}">Nom</label><input id="pf-ln-${i}" name="last_name" autocomplete="family-name" maxlength="80"></div>
        <div class="field"><label for="pf-em-${i}">Email</label><input id="pf-em-${i}" name="email" type="email" autocomplete="email" maxlength="200" required></div>
        <div class="field"><label for="pf-ph-${i}">T\u00e9l\u00e9phone</label><input id="pf-ph-${i}" name="phone" type="tel" autocomplete="tel" maxlength="30" required></div>
      </div>
      <label class="check"><input type="checkbox" name="accept" required> J'accepte que mes coordonn\u00e9es soient transmises au coach pour traiter cette commande (voir la page <a href="conditions.html" target="_blank" rel="noopener">Conditions</a>).</label>
      ${x.err ? `<p class="alert alert--err" role="alert">${esc(x.err)}</p>` : ""}
      <div class="stage-form__bar"><button type="button" class="btn btn--ghost" data-pack-cancel>Annuler</button>
        <button type="submit" class="btn btn--ball" ${x.busy ? "disabled" : ""}>${x.busy ? "Envoi\u2026" : "Valider ma commande"}</button></div>
      <p class="muted stage-form__note">Aucun paiement maintenant : votre coach vous indique comment r\u00e9gler. Paiement en ligne : prochainement disponible.</p></form>`;
  }
  function renderPacks() {
    const list = x.data.packs || [];
    const sec = $("#packs");
    if (!sec) return;
    sec.hidden = !list.length;
    if (!list.length) return;
    $("#packs-list").innerHTML = list.map((k) => {
      const per = k.price_cents && k.sessions_count ? P.fmtPrice(Math.round(k.price_cents / k.sessions_count)) : "";
      return `<article class="svc pack">
        <div class="svc__top"><h3 class="svc__name">${esc(k.name)}</h3><span class="svc__price">${k.price_cents ? esc(P.fmtPrice(k.price_cents)) : "Sur demande"}</span></div>
        <div class="svc__meta"><span class="tag">${k.sessions_count} séances</span>
          ${per ? `<span class="tag">soit ${esc(per)} la séance</span>` : ""}
          ${k.valid_days ? `<span class="tag">valable ${k.valid_days >= 60 ? Math.round(k.valid_days / 30) + " mois" : k.valid_days + " jours"}</span>` : ""}
          ${k.service_name ? `<span class="tag">${esc(k.service_name)}</span>` : ""}</div>
        ${k.description ? `<p>${esc(k.description)}</p>` : ""}
        <div class="stage__action">${packAction(k)}</div></article>`;
    }).join("");
  }

  // Le lien « Mon espace » ne dépend d'aucune donnée : il est ajouté dès le chargement.
  function addSpaceLink() {
    const nav = document.querySelector(".nav");
    if (!nav || nav.querySelector(".nav__space")) return;
    const q = new URLSearchParams(location.search).get("c");
    const a = document.createElement("a");
    a.className = "nav__space"; a.textContent = "Mon espace";
    a.href = "mon-espace.html" + (q ? "?c=" + encodeURIComponent(q) : "");
    nav.appendChild(a);
    buildMenu();
  }

  // Menu mobile (burger) : reprend les liens du menu, y compris Stages, Packs et Mon espace.
  function buildMenu() {
    const nav = document.querySelector(".nav"), bar = document.querySelector(".topbar__in");
    if (!nav || !bar) return;
    let btn = bar.querySelector(".burger"), panel = document.getElementById("mobile-menu");
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button"; btn.className = "burger"; btn.setAttribute("aria-label", "Ouvrir le menu"); btn.setAttribute("aria-expanded", "false"); btn.setAttribute("aria-controls", "mobile-menu");
      btn.innerHTML = '<span></span><span></span><span></span>';
      bar.appendChild(btn);
      panel = document.createElement("nav");
      panel.id = "mobile-menu"; panel.className = "mobile-menu"; panel.hidden = true; panel.setAttribute("aria-label", "Menu");
      document.querySelector(".topbar").appendChild(panel);
      const close = () => { panel.hidden = true; btn.setAttribute("aria-expanded", "false"); };
      btn.addEventListener("click", () => { panel.hidden = !panel.hidden; btn.setAttribute("aria-expanded", String(!panel.hidden)); });
      panel.addEventListener("click", (e) => { if (e.target.closest("a")) close(); });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    }
    panel.innerHTML = [...nav.querySelectorAll("a")].map((a) => `<a href="${esc(a.getAttribute("href"))}">${esc(a.textContent)}</a>`).join("");
  }

  function addNavLinks() {
    const nav = document.querySelector(".nav");
    if (!nav) return;
    const add = (id, label, has) => { if (has && !nav.querySelector(`a[href="#${id}"]`)) { const a = document.createElement("a"); a.href = `#${id}`; a.textContent = label; nav.insertBefore(a, nav.querySelector('a[href="#lieux"]')); } };
    add("stages", "Stages", (x.data.stages || []).length);
    add("packs", "Packs", (x.data.packs || []).length);
    buildMenu();
  }

  function bind() {
    $("#packs-list").addEventListener("click", (e) => {
      const o = e.target.closest("[data-pack-open]");
      if (o) { x.openPack = o.dataset.packOpen; x.err = ""; renderPacks(); const f = document.querySelector(`[data-pack-form="${x.openPack}"] input`); if (f) f.focus(); return; }
      if (e.target.closest("[data-pack-cancel]")) { x.openPack = null; x.err = ""; renderPacks(); }
    });
    $("#packs-list").addEventListener("submit", async (e) => {
      const form = e.target.closest("[data-pack-form]");
      if (!form) return;
      e.preventDefault();
      if (x.busy) return;
      const fd = new FormData(form), id = form.dataset.packForm;
      if (!fd.get("accept")) { x.err = "Cochez la case pour continuer."; renderPacks(); return; }
      x.busy = true; x.err = ""; renderPacks();
      try {
        await x.api.requestPack(x.slug, { pack_id: id, first_name: fd.get("first_name"), last_name: fd.get("last_name"), email: fd.get("email"), phone: fd.get("phone") });
        x.doneP[id] = { first_name: String(fd.get("first_name")).trim() };
        x.openPack = null;
      } catch (err) { x.err = err.message || "Une erreur est survenue."; }
      x.busy = false; renderPacks();
    });
    $("#stages-list").addEventListener("click", (e) => {
      const o = e.target.closest("[data-stage-open]");
      if (o) { x.openStage = o.dataset.stageOpen; x.err = ""; renderStages(); const f = document.querySelector(`[data-stage-form="${x.openStage}"] input`); if (f) f.focus(); return; }
      if (e.target.closest("[data-stage-cancel]")) { x.openStage = null; x.err = ""; renderStages(); }
    });
    $("#stages-list").addEventListener("submit", async (e) => {
      const form = e.target.closest("[data-stage-form]");
      if (!form) return;
      e.preventDefault();
      if (x.busy) return;
      const fd = new FormData(form), id = form.dataset.stageForm;
      if (!fd.get("accept")) { x.err = "Cochez la case pour continuer."; renderStages(); return; }
      x.busy = true; x.err = ""; renderStages();
      try {
        await x.api.registerStage(x.slug, { stage_id: id, first_name: fd.get("first_name"), last_name: fd.get("last_name"), email: fd.get("email"), phone: fd.get("phone"), party_size: Number(fd.get("party_size")) || 1, message: fd.get("message") });
        x.done[id] = { first_name: String(fd.get("first_name")).trim() };
        x.openStage = null;
        x.data = await x.api.getExtras(x.slug) || x.data;
      } catch (err) { x.err = err.message || "Une erreur est survenue."; }
      x.busy = false; renderStages();
    });
  }

  async function init() {
    addSpaceLink();
    if (!$("#stages-list")) return;
    try {
      x.api = await P.backend();
      x.slug = P.currentSlug();
      if (!x.api.getExtras) return;
      x.data = await x.api.getExtras(x.slug);
    } catch { return; }       // les blocs restent cachés : le reste du site n'est jamais affecté
    if (!x.data) return;
    const site = await x.api.getSite(x.slug).catch(() => null);
    x.tz = (site && site.coach && site.coach.timezone) || "Europe/Paris";
    bind(); renderStages(); renderPacks(); addNavLinks();
  }
  init();
})();
