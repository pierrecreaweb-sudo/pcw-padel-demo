// Back-office coach : tableau de bord, réservations, agenda, prestations, joueurs, site, réglages.
(function () {
  "use strict";
  const P = window.PCW;
  const esc = P.esc;
  const app = document.getElementById("app");

  // =================================================================== état ===
  const S = {
    api: null, user: null, coaches: [], coach: null, loading: false,
    services: [], locations: [], rules: [], media: [], messages: [], timeOff: [], players: [], testimonials: [], site: null, bookings: [],
    isAdmin: false,
    ui: { resFilter: "upcoming", resQuery: "", playerQuery: "", weekStart: null },
    recovery: false,
  };
  const tz = () => (S.coach && S.coach.timezone) || "Europe/Paris";
  const todayYmd = () => P.localYmd(new Date(), tz());

  // ================================================================= icônes ===
  const I = {
    home: '<path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
    tag: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    brush: '<path d="M4 20c4 0 5-2 5-4a3 3 0 0 0-3-3c-2 0-3 2-2 7zM9.5 13.5 20 3l1 1L10.5 14.5"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    more: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    up: '<path d="m6 15 6-6 6 6"/>', down: '<path d="m6 9 6 6 6-6"/>',
    left: '<path d="m15 6-6 6 6 6"/>', right: '<path d="m9 6 6 6-6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', ext: '<path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
    out: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l-4-4 4-4M6 12h11"/>',
  };
  const icon = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;

  // ================================================================ outils ===
  let toastTimer;
  function toast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
  }
  const svcById = (id) => S.services.find((s) => s.id === id);
  const locById = (id) => S.locations.find((l) => l.id === id);
  const playerById = (id) => S.players.find((p) => p.id === id);
  const fullName = (p) => p ? `${p.first_name || ""} ${p.last_name || ""}`.trim() : "Joueur supprimé";
  const svcColor = (b) => (svcById(b.service_id) || {}).color || "#5A6780";
  const isActive = (b) => b.status === "pending" || b.status === "confirmed";
  const STATUS = { confirmed: "Confirmée", pending: "À valider", cancelled: "Annulée", completed: "Terminée", no_show: "Absent" };
  const PAY = { paid: "Payée", unpaid: "À encaisser", refunded: "Remboursée" };
  const pill = (cls, label) => `<span class="pill pill--${cls}">${esc(label)}</span>`;
  const hm = (iso) => P.fmtTime(iso, tz());
  const dayOf = (iso) => P.localYmd(new Date(iso), tz());
  const minutes = (b) => (new Date(b.ends_at) - new Date(b.starts_at)) / 6e4;
  const isPast = (b) => new Date(b.ends_at) < new Date();
  const euros = (c) => P.fmtPrice(c || 0);
  function errMsg(e) { return (e && e.message) || "Une erreur est survenue."; }
  function withPlayer(b) { return { ...b, player: b.player || playerById(b.player_id) || null, location: b.location || locById(b.location_id) || null }; }
  function sum(arr, f) { return arr.reduce((a, x) => a + f(x), 0); }

  // ============================================================== tiroir ===
  let drawerClose = null;
  function openDrawer({ title, body, foot = "", onMount, wide }) {
    const root = document.getElementById("drawer-root");
    root.innerHTML = `<div class="drawer-backdrop" data-close-drawer>
      <section class="drawer" role="dialog" aria-modal="true" aria-label="${esc(title)}" ${wide ? 'style="width:min(640px,100%)"' : ""}>
        <header class="drawer__head"><h2>${esc(title)}</h2><button type="button" class="icon-btn" data-close-drawer aria-label="Fermer">${icon("x")}</button></header>
        <div class="drawer__body">${body}</div>
        ${foot ? `<footer class="drawer__foot">${foot}</footer>` : ""}
      </section></div>`;
    const el = root.querySelector(".drawer");
    drawerClose = () => { root.innerHTML = ""; drawerClose = null; };
    root.querySelector(".drawer-backdrop").addEventListener("click", (e) => {
      if (e.target.hasAttribute("data-close-drawer") || e.target.closest("button[data-close-drawer]")) closeDrawer();
    });
    if (onMount) onMount(el);
    const first = el.querySelector("input, select, textarea, button:not([data-close-drawer])");
    if (first && window.innerWidth > 560) first.focus();
    return el;
  }
  function closeDrawer() { if (drawerClose) drawerClose(); }
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDrawer(); });

  // ============================================================ données ===
  async function loadAll() {
    const id = S.coach.id;
    const [services, locations, rules, timeOff, players, testimonials, site, media, messages] = await Promise.all([
      S.api.list("services", id, "position,name"), S.api.list("locations", id, "position,name"),
      S.api.list("availability_rules", id, "weekday,start_time"), S.api.list("time_off", id, "starts_at"),
      S.api.list("players", id, "first_name,last_name"), S.api.list("testimonials", id, "position"),
      S.api.getSiteContent(id), S.api.list("media", id, "position,created_at"),
      S.api.list("contact_messages", id, "created_at").catch(() => []),
    ]);
    Object.assign(S, { services, locations, rules, timeOff, players, testimonials, site, media, messages: messages.reverse() });
    await loadBookings();
  }
  async function loadBookings() {
    const from = new Date(Date.now() - 120 * 864e5).toISOString();
    const to = new Date(Date.now() + 200 * 864e5).toISOString();
    S.bookings = (await S.api.bookings(S.coach.id, { from, to })).map(withPlayer);
  }
  async function reloadPlayers() { S.players = await S.api.list("players", S.coach.id, "first_name,last_name"); }

  // ============================================================= routage ===
  const VIEWS = {
    dashboard: { label: "Accueil", icon: "home", render: viewDashboard },
    reservations: { label: "Réservations", icon: "list", render: viewReservations },
    agenda: { label: "Agenda", icon: "cal", render: viewAgenda },
    joueurs: { label: "Joueurs", icon: "users", render: viewPlayers },
    messages: { label: "Messages", icon: "mail", render: viewMessages },
    prestations: { label: "Prestations et lieux", short: "Prestations", icon: "tag", render: viewServices },
    "mon-site": { label: "Mon site", icon: "brush", render: viewSite },
    reglages: { label: "Réglages", icon: "gear", render: viewSettings },
  };
  const currentView = () => { const h = location.hash.replace("#", ""); return VIEWS[h] ? h : "dashboard"; };
  window.addEventListener("hashchange", () => { closeDrawer(); render(); window.scrollTo(0, 0); });


  // ============================================================= messages ===
  function messageRow(m) {
    const d = new Date(m.created_at);
    const when = dayOf(m.created_at) === todayYmd() ? hm(m.created_at) : P.fmtDate(d, tz(), "short");
    return `<button type="button" class="row" style="grid-template-columns:minmax(0,1fr) auto" data-message="${m.id}">
      <span class="row__main"><span class="row__title">${m.status === "new" ? "● " : ""}${esc(m.name)}${m.subject ? ` <span class="muted" style="font-weight:500">· ${esc(m.subject)}</span>` : ""}</span>
        <span class="row__sub">${esc(m.message)}</span></span>
      <span class="row__end"><span class="muted num" style="font-size:13px">${esc(when)}</span>${m.status === "new" ? pill("pending", "Nouveau") : ""}</span></button>`;
  }
  function viewMessages() {
    const f = S.ui.msgFilter || "inbox";
    const list = S.messages.filter((m) => f === "archived" ? m.status === "archived" : m.status !== "archived");
    const unread = S.messages.filter((m) => m.status === "new").length;
    return `<div class="page__head"><div><h1>Messages</h1><p>Envoyés depuis le formulaire de contact de votre site${unread ? ` · ${unread} non lu${unread > 1 ? "s" : ""}` : ""}</p></div></div>
      <div class="toolbar"><div class="seg" role="group" aria-label="Filtrer">
        <button type="button" data-msg-filter="inbox" aria-pressed="${f === "inbox"}">Boîte de réception</button>
        <button type="button" data-msg-filter="archived" aria-pressed="${f === "archived"}">Archivés</button></div></div>
      <section class="card">${list.length ? `<div class="rows">${list.map(messageRow).join("")}</div>`
        : `<div class="empty">${f === "archived" ? "Aucun message archivé." : "Aucun message pour l'instant. Ils arriveront ici et par email."}</div>`}</section>`;
  }
  async function messageDrawer(id, confirmDelete) {
    const m = S.messages.find((x) => x.id === id);
    if (!m) return;
    if (m.status === "new") {
      try { await S.api.update("contact_messages", id, { status: "read" }); m.status = "read"; render(); } catch { /* lecture seule possible */ }
    }
    const tel = String(m.phone || "").replace(/[^0-9+]/g, "");
    const wa = tel ? tel.replace(/^0/, "33").replace(/^\+/, "") : "";
    const subject = encodeURIComponent(`Re: ${m.subject || "votre message"}`);
    openDrawer({
      title: m.name,
      body: `${confirmDelete ? `<div class="confirm-box">Supprimer définitivement ce message ?
          <div class="btn-row"><button class="btn" data-message="${m.id}">Non</button><button class="btn btn--dark" data-action="msg-delete" data-id="${m.id}">Supprimer</button></div></div>` : ""}
        <dl class="kv">
          <dt>Reçu le</dt><dd>${esc(P.fmtDate(m.created_at, tz()))} à ${hm(m.created_at)}</dd>
          ${m.subject ? `<dt>Objet</dt><dd>${esc(m.subject)}</dd>` : ""}
          <dt>Email</dt><dd style="user-select:all">${esc(m.email)}</dd>
          ${m.phone ? `<dt>Téléphone</dt><dd style="user-select:all">${esc(m.phone)}</dd>` : ""}
        </dl>
        <div class="card" style="padding:16px;white-space:pre-wrap;line-height:1.55">${esc(m.message)}</div>
        <div class="btn-row">
          <a class="btn btn--primary" href="mailto:${esc(m.email)}?subject=${subject}">Répondre par email</a>
          ${tel ? `<a class="btn" href="tel:${esc(tel)}">Appeler</a><a class="btn" href="https://wa.me/${esc(wa)}" target="_blank" rel="noopener">WhatsApp</a>` : ""}
        </div>`,
      foot: `${m.status === "archived" ? `<button class="btn" data-action="msg-status" data-status="read" data-id="${m.id}">Remettre dans la boîte</button>`
        : `<button class="btn" data-action="msg-status" data-status="archived" data-id="${m.id}">Archiver</button>`}
        <button class="btn" data-action="msg-status" data-status="new" data-id="${m.id}">Marquer non lu</button>
        <button class="btn btn--danger" data-action="msg-ask-delete" data-id="${m.id}">Supprimer</button>`,
    });
  }

  // ============================================================== rendu ===
  function render() {
    if (!S.api) return;
    if (S.recovery) return renderRecovery();
    if (!S.user) return renderLogin();
    if (!S.coach) {
      app.innerHTML = `<div class="login"><div class="login__card"><h1>Aucun site rattaché</h1>
        <p>Votre compte n'est relié à aucun site de coach pour le moment. Contactez Pierre Créa Web.</p>
        <button class="btn" data-action="sign-out">Se déconnecter</button></div></div>`;
      return;
    }
    const v = currentView();
    const pending = S.bookings.filter((b) => b.status === "pending" && !isPast(b)).length;
    const unread = S.messages.filter((m) => m.status === "new").length;
    const badgeFor = (key) => key === "reservations" && pending ? `<span class="badge">${pending}</span>` : key === "messages" && unread ? `<span class="badge">${unread}</span>` : "";
    const navItem = (key) => `<a class="navlink" href="#${key}" ${v === key ? 'aria-current="page"' : ""}>${icon(VIEWS[key].icon)}<span>${VIEWS[key].label}</span>
      ${badgeFor(key)}</a>`;
    const tabKeys = ["dashboard", "reservations", "agenda", "joueurs"];
    const siteUrl = `../index.html?c=${encodeURIComponent(S.coach.slug)}`;
    app.innerHTML = `<div class="shell">
      <aside class="side">
        <div class="side__brand"><span class="dot"></span><span>${esc(S.coach.display_name.toUpperCase())}</span></div>
        ${S.coaches.length > 1 ? `<select class="coach-switch" id="coach-switch" aria-label="Changer de coach">${S.coaches.map((c) =>
          `<option value="${c.id}" ${c.id === S.coach.id ? "selected" : ""}>${esc(c.display_name)}</option>`).join("")}</select>` : ""}
        <nav aria-label="Menu">${Object.keys(VIEWS).map(navItem).join("")}</nav>
        <div class="side__foot">
          <a href="${siteUrl}" target="_blank" rel="noopener">Voir mon site ↗</a>
          <button type="button" data-action="sign-out">Se déconnecter</button>
        </div>
      </aside>
      <main class="main"><div class="page" id="page"></div></main>
      <nav class="tabbar" aria-label="Menu">
        ${tabKeys.map((k) => `<a class="tab" href="#${k}" ${v === k ? 'aria-current="page"' : ""}>${icon(VIEWS[k].icon)}<span>${VIEWS[k].short || VIEWS[k].label}</span>
          ${k === "reservations" && pending ? `<span class="badge">${pending}</span>` : ""}</a>`).join("")}
        <button type="button" class="tab" data-action="more" ${["messages", "prestations", "mon-site", "reglages"].includes(v) ? 'aria-current="page"' : ""}>${icon("more")}<span>Plus</span>${unread ? `<span class="badge">${unread}</span>` : ""}</button>
      </nav>
    </div>`;
    const page = document.getElementById("page");
    page.innerHTML = (S.api.mode === "demo" ? `<div class="demo-note"><span>Démo : données fictives, enregistrées uniquement dans votre navigateur.</span>
      <button type="button" data-action="reset-demo">Réinitialiser la démo</button></div>` : "") + VIEWS[v].render();
    const after = AFTER[v];
    if (after) after(page);
    const sw = document.getElementById("coach-switch");
    if (sw) sw.addEventListener("change", async () => { await selectCoach(sw.value); });
  }
  const AFTER = {};

  // ============================================================ connexion ===
  function renderLogin(msg = "", kind = "err") {
    const demo = S.api.mode === "demo";
    app.innerHTML = `<div class="login"><div class="login__card">
      <div class="login__brand"><span class="dot"></span>ESPACE COACH</div>
      <h1>Connexion</h1>
      <p>${demo ? "Démo : cliquez sur « Se connecter », aucun mot de passe n'est demandé." : "Gérez vos réservations, votre agenda et votre site."}</p>
      <form id="login-form" novalidate>
        <label class="field"><span>Email</span><input type="email" id="l-email" autocomplete="email" required value="${demo ? "coach@exemple.fr" : ""}"></label>
        <label class="field"><span>Mot de passe</span><input type="password" id="l-pass" autocomplete="current-password" ${demo ? 'placeholder="Pas nécessaire en démo"' : "required"}></label>
        ${msg ? `<div class="alert alert--${kind}" role="alert">${esc(msg)}</div>` : ""}
        <button type="submit" class="btn btn--primary btn--block">Se connecter</button>
        <div class="links">
          <button type="button" class="btn btn--sm" data-action="magic-link">Recevoir un lien par email</button>
          <button type="button" class="btn btn--sm" data-action="forgot">Mot de passe oublié</button>
        </div>
      </form></div></div>`;
    document.getElementById("login-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("l-email").value.trim();
      const pass = document.getElementById("l-pass").value;
      const btn = e.target.querySelector("button[type=submit]");
      btn.disabled = true; btn.textContent = "Connexion…";
      try { await S.api.signIn(email, pass); await afterSignIn(); }
      catch (err) { renderLogin(/invalid/i.test(errMsg(err)) ? "Email ou mot de passe incorrect." : errMsg(err)); }
    });
  }
  function renderRecovery(msg = "") {
    app.innerHTML = `<div class="login"><div class="login__card"><div class="login__brand"><span class="dot"></span>ESPACE COACH</div>
      <h1>Nouveau mot de passe</h1><p>Choisissez un mot de passe d'au moins 8 caractères.</p>
      <form id="pw-form"><label class="field"><span>Mot de passe</span><input type="password" id="pw1" autocomplete="new-password" minlength="8" required></label>
      ${msg ? `<div class="alert alert--err">${esc(msg)}</div>` : ""}
      <button class="btn btn--primary btn--block" type="submit">Enregistrer</button></form></div></div>`;
    document.getElementById("pw-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const v = document.getElementById("pw1").value;
      if (v.length < 8) return renderRecovery("8 caractères minimum.");
      try { await S.api.updatePassword(v); S.recovery = false; toast("Mot de passe enregistré"); await afterSignIn(); }
      catch (err) { renderRecovery(errMsg(err)); }
    });
  }
  async function afterSignIn() {
    S.user = await S.api.getUser();
    if (!S.user) return render();
    S.coaches = await S.api.myCoaches();
    try { S.isAdmin = await S.api.isPlatformAdmin(); } catch { S.isAdmin = false; }
    let saved = null;
    try { saved = localStorage.getItem("pcw-coach-id"); } catch { saved = null; }
    const pick = S.coaches.find((c) => c.id === saved) || S.coaches[0];
    if (pick) await selectCoach(pick.id); else { S.coach = null; render(); }
  }
  async function selectCoach(id) {
    S.coach = S.coaches.find((c) => c.id === id);
    try { localStorage.setItem("pcw-coach-id", id); } catch { /* ignore */ }
    app.innerHTML = `<div class="boot"><span class="ball"></span>Chargement de vos données…</div>`;
    S.ui.weekStart = P.mondayOf(todayYmd());
    try { await loadAll(); } catch (e) { app.innerHTML = `<div class="boot"><div class="alert alert--err">${esc(errMsg(e))}</div></div>`; return; }
    render();
  }

  // ======================================================= tableau de bord ===
  function bookingRow(b, opts = {}) {
    const p = b.player;
    const loc = b.location;
    const status = b.status === "pending" ? pill("pending", STATUS.pending)
      : b.status === "cancelled" ? pill("cancelled", "Annulée")
      : b.status === "no_show" ? pill("no_show", "Absent")
      : isPast(b) ? pill(b.payment_status, PAY[b.payment_status]) : "";
    return `<button type="button" class="row ${b.status === "cancelled" ? "row--cancelled" : ""}" data-booking="${b.id}">
      <span class="row__time">${hm(b.starts_at)}<small>${P.fmtDuration(minutes(b))}</small></span>
      <span class="row__bar" style="background:${esc(svcColor(b))}"></span>
      <span class="row__main"><span class="row__title">${esc(fullName(p))}${b.party_size > 1 ? ` <span class="muted">+${b.party_size - 1}</span>` : ""}</span>
        <span class="row__sub">${esc(b.service_name)}${loc ? " · " + esc(loc.name) : ""}${opts.showDate ? " · " + esc(P.fmtDate(b.starts_at, tz(), "short")) : ""}</span></span>
      <span class="row__end">${status}${b.source === "manual" && !opts.compact ? "" : ""}</span>
    </button>`;
  }
  function groupByDay(list, emptyMsg) {
    if (!list.length) return `<div class="empty">${emptyMsg}</div>`;
    const groups = new Map();
    for (const b of list) { const d = dayOf(b.starts_at); if (!groups.has(d)) groups.set(d, []); groups.get(d).push(b); }
    const t = todayYmd();
    return [...groups].map(([d, arr]) => {
      const label = d === t ? "Aujourd'hui" : d === P.addDays(t, 1) ? "Demain" : d === P.addDays(t, -1) ? "Hier" : P.fmtYmd(d);
      const active = arr.filter((b) => b.status !== "cancelled");
      return `<div class="day-head"><span>${label}</span><span>${active.length} séance${active.length > 1 ? "s" : ""}</span></div><div class="rows">${arr.map((b) => bookingRow(b)).join("")}</div>`;
    }).join("");
  }

  function weekStats(mondayYmd) {
    const sunday = P.addDays(mondayYmd, 7);
    const inWeek = S.bookings.filter((b) => { const d = dayOf(b.starts_at); return d >= mondayYmd && d < sunday && b.status !== "cancelled"; });
    let avail = 0;
    for (let i = 0; i < 7; i++) {
      const d = P.addDays(mondayYmd, i), wd = P.isoWeekday(d);
      for (const r of S.rules.filter((r) => r.weekday === wd)) {
        const [h0, m0] = r.start_time.split(":").map(Number), [h1, m1] = r.end_time.split(":").map(Number);
        avail += (h1 * 60 + m1) - (h0 * 60 + m0);
      }
    }
    const booked = sum(inWeek, minutes);
    return { count: inWeek.length, hours: booked / 60, fill: avail ? Math.min(100, Math.round((booked / avail) * 100)) : 0 };
  }

  function viewDashboard() {
    const t = todayYmd();
    const now = new Date();
    const today = S.bookings.filter((b) => dayOf(b.starts_at) === t && b.status !== "cancelled");
    const pending = S.bookings.filter((b) => b.status === "pending" && !isPast(b));
    const wk = weekStats(P.mondayOf(t));
    const ym = t.slice(0, 7);
    const month = S.bookings.filter((b) => dayOf(b.starts_at).slice(0, 7) === ym);
    const paid = sum(month.filter((b) => b.payment_status === "paid"), (b) => b.price_cents);
    const toCollect = sum(month.filter((b) => b.payment_status === "unpaid" && isPast(b) && (b.status === "completed" || b.status === "confirmed")), (b) => b.price_cents);
    const planned = sum(month.filter((b) => isActive(b) && !isPast(b)), (b) => b.price_cents);
    const newPlayers = S.players.filter((p) => p.created_at && P.localYmd(new Date(p.created_at), tz()).slice(0, 7) === ym).length;
    const upcoming = S.bookings.filter((b) => isActive(b) && new Date(b.starts_at) > now && dayOf(b.starts_at) > t && dayOf(b.starts_at) <= P.addDays(t, 7));
    const first = (S.user.email || "").split("@")[0];
    const coachFirst = S.coach.display_name.split(" ")[0] || first;
    const dateLabel = P.fmtYmd(t);
    return `<div class="page__head"><div><h1>Bonjour ${esc(coachFirst)}</h1><p>${dateLabel}</p></div>
        <button type="button" class="btn btn--primary" data-action="new-booking">${icon("plus")} Nouvelle réservation</button></div>
      <div class="kpis">
        <div class="kpi"><span class="kpi__label">Aujourd'hui</span><span class="kpi__value">${today.length}</span><span class="kpi__sub">séance${today.length > 1 ? "s" : ""}</span></div>
        <div class="kpi"><span class="kpi__label">Cette semaine</span><span class="kpi__value">${wk.count}</span>
          <span class="kpi__sub">${wk.hours.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} h · ${wk.fill} % rempli</span><span class="meter" aria-hidden="true"><i style="width:${wk.fill}%"></i></span></div>
        <a class="kpi ${pending.length ? "kpi--alert" : ""}" href="#reservations" data-filter="pending" style="text-decoration:none;color:inherit"><span class="kpi__label">À valider</span><span class="kpi__value">${pending.length}</span><span class="kpi__sub">${pending.length ? "demande" + (pending.length > 1 ? "s" : "") + " en attente" : "rien en attente"}</span></a>
        <div class="kpi"><span class="kpi__label">Encaissé ce mois</span><span class="kpi__value">${euros(paid)}</span><span class="kpi__sub">${euros(toCollect)} à encaisser · ${euros(planned)} prévus</span></div>
      </div>
      <div class="grid grid--main">
        <div class="grid">
          ${pending.length ? `<section class="card"><h2>À valider <small>${pending.length}</small></h2><div class="rows">${pending.slice(0, 5).map((b) => `
            <div class="row" style="cursor:default;grid-template-columns:64px 4px minmax(0,1fr)">
              <span class="row__time">${hm(b.starts_at)}<small>${esc(P.fmtDate(b.starts_at, tz(), "short"))}</small></span>
              <span class="row__bar" style="background:${esc(svcColor(b))}"></span>
              <span class="row__main"><span class="row__title">${esc(fullName(b.player))}</span><span class="row__sub">${esc(b.service_name)}</span>
                <span class="btn-row" style="margin-top:8px"><button class="btn btn--sm btn--ok" data-action="confirm" data-id="${b.id}">Valider</button>
                <button class="btn btn--sm btn--danger" data-action="refuse" data-id="${b.id}">Refuser</button>
                <button class="btn btn--sm" data-booking="${b.id}">Détails</button></span></span>
            </div>`).join("")}</div></section>` : ""}
          <section class="card"><h2>Aujourd'hui <small>${esc(dateLabel)}</small></h2>
            ${today.length ? `<div class="rows">${today.map((b) => bookingRow(b)).join("")}</div>` : `<div class="empty">Aucune séance aujourd'hui.</div>`}</section>
          <section class="card"><h2>7 prochains jours <small>${upcoming.length} séance${upcoming.length > 1 ? "s" : ""}</small></h2>${groupByDay(upcoming, "Aucune séance prévue dans les 7 prochains jours.")}</section>
        </div>
        <div class="grid">
          ${S.messages.some((m) => m.status === "new") ? `<section class="card"><h2>Nouveaux messages <small>${S.messages.filter((m) => m.status === "new").length}</small></h2>
            <div class="rows">${S.messages.filter((m) => m.status === "new").slice(0, 3).map(messageRow).join("")}</div>
            <a class="btn btn--sm" href="#messages" style="margin-top:10px">Tous les messages</a></section>` : ""}
          <section class="card"><h2>Ce mois-ci</h2><dl class="kv">
            <dt>Séances</dt><dd class="num">${month.filter((b) => b.status !== "cancelled").length}</dd>
            <dt>Annulations</dt><dd class="num">${month.filter((b) => b.status === "cancelled").length}</dd>
            <dt>Nouveaux joueurs</dt><dd class="num">${newPlayers}</dd>
            <dt>Joueurs suivis</dt><dd class="num">${S.players.length}</dd>
          </dl></section>
          <section class="card"><h2>Mon site</h2>
            <p class="muted" style="margin:0 0 12px">Vos joueurs réservent sur votre site. Partagez ce lien sur Instagram et WhatsApp.</p>
            <div class="btn-row"><a class="btn" href="../index.html?c=${encodeURIComponent(S.coach.slug)}" target="_blank" rel="noopener">${icon("ext")} Ouvrir mon site</a>
            <button type="button" class="btn" data-action="copy-site">Copier le lien</button></div>
          </section>
        </div>
      </div>`;
  }

  // ======================================================== réservations ===
  function viewReservations() {
    const f = S.ui.resFilter, q = S.ui.resQuery.trim().toLowerCase();
    const now = new Date();
    let list = S.bookings;
    if (f === "upcoming") list = list.filter((b) => isActive(b) && new Date(b.ends_at) >= now);
    if (f === "pending") list = list.filter((b) => b.status === "pending");
    if (f === "past") list = list.filter((b) => new Date(b.ends_at) < now && b.status !== "cancelled").reverse();
    if (f === "unpaid") list = list.filter((b) => new Date(b.ends_at) < now && b.payment_status === "unpaid" && (b.status === "completed" || b.status === "confirmed")).reverse();
    if (f === "cancelled") list = list.filter((b) => b.status === "cancelled").reverse();
    if (q) list = list.filter((b) => `${fullName(b.player)} ${b.service_name} ${(b.player || {}).phone || ""}`.toLowerCase().includes(q));
    const counts = {
      pending: S.bookings.filter((b) => b.status === "pending").length,
      unpaid: S.bookings.filter((b) => new Date(b.ends_at) < now && b.payment_status === "unpaid" && (b.status === "completed" || b.status === "confirmed")).length,
    };
    const tabs = [["upcoming", "À venir"], ["pending", `À valider${counts.pending ? ` (${counts.pending})` : ""}`], ["past", "Passées"],
      ["unpaid", `À encaisser${counts.unpaid ? ` (${counts.unpaid})` : ""}`], ["cancelled", "Annulées"]];
    const shown = list.slice(0, 200);
    return `<div class="page__head"><div><h1>Réservations</h1><p>${list.length} résultat${list.length > 1 ? "s" : ""}</p></div>
        <button type="button" class="btn btn--primary" data-action="new-booking">${icon("plus")} Nouvelle réservation</button></div>
      <div class="toolbar">
        <div class="seg" role="group" aria-label="Filtrer">${tabs.map(([k, l]) => `<button type="button" data-res-filter="${k}" aria-pressed="${f === k}">${l}</button>`).join("")}</div>
        <input type="search" class="search" id="res-search" placeholder="Rechercher un joueur, une prestation…" value="${esc(S.ui.resQuery)}" aria-label="Rechercher">
      </div>
      <section class="card" id="res-list">${groupByDay(shown, f === "pending" ? "Aucune demande à valider." : "Aucune réservation.")}</section>`;
  }
  AFTER.reservations = () => {
    const s = document.getElementById("res-search");
    s.addEventListener("input", () => {
      S.ui.resQuery = s.value;
      const pos = s.selectionStart;
      render();
      const n = document.getElementById("res-search"); n.focus(); n.setSelectionRange(pos, pos);
    });
  };

  async function patchBooking(id, patch, okMsg) {
    try {
      const updated = await S.api.updateBooking(id, patch);
      const i = S.bookings.findIndex((b) => b.id === id);
      if (i >= 0) S.bookings[i] = withPlayer(updated);
      toast(okMsg);
      return S.bookings[i];
    } catch (e) { toast(errMsg(e)); throw e; }
  }

  function bookingDrawer(id, opts = {}) {
    const b = S.bookings.find((x) => x.id === id);
    if (!b) return;
    const p = b.player || {};
    const loc = b.location;
    const past = isPast(b);
    const future = !past;
    const statusPill = pill(b.status, STATUS[b.status]);
    let actions = "";
    if (b.status === "pending") actions = `<button class="btn btn--primary" data-action="confirm" data-id="${b.id}">Valider la demande</button><button class="btn btn--danger" data-action="ask-cancel" data-id="${b.id}">Refuser</button>`;
    else if (b.status === "confirmed" && future) actions = `<button class="btn" data-action="move" data-id="${b.id}">Déplacer</button><button class="btn btn--danger" data-action="ask-cancel" data-id="${b.id}">Annuler la séance</button>`;
    else if ((b.status === "confirmed" || b.status === "completed") && past) actions = `${b.payment_status === "paid"
      ? `<button class="btn" data-action="pay" data-pay="unpaid" data-id="${b.id}">Marquer non payée</button>`
      : `<button class="btn btn--primary" data-action="pay" data-pay="paid" data-id="${b.id}">Marquer payée</button>`}
      <button class="btn btn--danger" data-action="no-show" data-id="${b.id}">Absent</button>`;
    else if (b.status === "no_show") actions = `<button class="btn" data-action="undo-no-show" data-id="${b.id}">Annuler « absent »</button>`;
    const confirmBox = opts.confirmCancel ? `<div class="confirm-box">${b.status === "pending" ? "Refuser cette demande ?" : "Annuler cette séance ?"} Le joueur est prévenu par email et le créneau redevient disponible.
      <div class="btn-row"><button class="btn" data-booking="${b.id}">Non, garder</button><button class="btn btn--dark" data-action="cancel" data-id="${b.id}">${b.status === "pending" ? "Oui, refuser" : "Oui, annuler"}</button></div></div>` : "";
    openDrawer({
      title: b.service_name,
      body: `<div class="btn-row">${statusPill}${past && b.status !== "cancelled" ? pill(b.payment_status, PAY[b.payment_status]) : ""}${b.source === "manual" ? pill("neutral", "Saisie manuelle") : pill("neutral", "Réservée en ligne")}</div>
        ${confirmBox}
        <dl class="kv">
          <dt>Date</dt><dd>${esc(P.fmtDate(b.starts_at, tz()))}</dd>
          <dt>Horaire</dt><dd class="num">${hm(b.starts_at)} – ${hm(b.ends_at)} (${P.fmtDuration(minutes(b))})</dd>
          <dt>Lieu</dt><dd>${loc ? esc(loc.name) : "<span class='muted'>Non précisé</span>"}</dd>
          ${b.party_size > 1 ? `<dt>Joueurs</dt><dd>${b.party_size}</dd>` : ""}
          <dt>Tarif</dt><dd>${euros(b.price_cents)}</dd>
        </dl>
        <section class="card" style="padding:14px"><h2 style="font-size:15px;margin-bottom:8px">${esc(fullName(p))} ${p.level ? `<small>${esc(p.level)}</small>` : ""}</h2>
          <dl class="kv">${p.phone ? `<dt>Téléphone</dt><dd><span style="user-select:all">${esc(p.phone)}</span> · <a href="tel:${esc(String(p.phone).replace(/\s/g, ""))}">Appeler</a></dd>` : ""}
          ${p.email ? `<dt>Email</dt><dd style="user-select:all">${esc(p.email)}</dd>` : ""}</dl>
          ${p.id ? `<button class="btn btn--sm" style="margin-top:10px" data-player="${p.id}">Fiche joueur</button>` : ""}
        </section>
        ${b.player_message ? `<div><div class="muted" style="font-size:13px;font-weight:700;margin-bottom:4px">Message du joueur</div><p style="margin:0">${esc(b.player_message)}</p></div>` : ""}
        <label class="field"><span>Notes privées</span><textarea id="b-notes" placeholder="Visible par vous seul : exercices travaillés, objectifs…">${esc(b.coach_notes || "")}</textarea></label>
        <div id="move-zone"></div>`,
      foot: `${actions}<button class="btn" data-action="save-notes" data-id="${b.id}">Enregistrer les notes</button>`,
    });
  }

  async function moveZone(id) {
    const b = S.bookings.find((x) => x.id === id);
    const zone = document.getElementById("move-zone");
    if (!zone) return;
    const day = dayOf(b.starts_at);
    zone.innerHTML = `<section class="card" style="padding:14px"><h2 style="font-size:15px">Déplacer la séance</h2>
      <div class="form-grid"><label class="field"><span>Nouvelle date</span><input type="date" id="mv-date" value="${day}"></label>
      <label class="field"><span>Heure libre</span><input type="time" id="mv-time" step="900"></label></div>
      <div style="margin-top:10px"><div class="muted" style="font-size:13px;margin-bottom:6px">Créneaux libres selon vos disponibilités</div><div class="chips" id="mv-slots"><span class="muted">Chargement…</span></div></div>
      <div class="btn-row" style="margin-top:12px"><button class="btn btn--primary" data-action="do-move" data-id="${b.id}">Déplacer</button></div></section>`;
    const loadSlotChips = async () => {
      const d = document.getElementById("mv-date").value;
      const el = document.getElementById("mv-slots");
      if (!d || !b.service_id) { el.innerHTML = `<span class="muted">Choisissez une date.</span>`; return; }
      try {
        const slots = await S.api.coachSlots(S.coach, b.service_id, d, d);
        el.innerHTML = slots.length ? slots.map((s) => `<button type="button" class="chip" data-mv-slot="${P.localHm(new Date(s.starts_at), tz())}">${hm(s.starts_at)}</button>`).join("")
          : `<span class="muted">Aucun créneau libre ce jour-là. Indiquez une heure libre si besoin.</span>`;
      } catch (e) { el.innerHTML = `<span class="muted">${esc(errMsg(e))}</span>`; }
    };
    document.getElementById("mv-date").addEventListener("change", loadSlotChips);
    zone.addEventListener("click", (e) => {
      const c = e.target.closest("[data-mv-slot]");
      if (!c) return;
      document.getElementById("mv-time").value = c.dataset.mvSlot;
      zone.querySelectorAll("[data-mv-slot]").forEach((x) => x.setAttribute("aria-pressed", String(x === c)));
    });
    await loadSlotChips();
    zone.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // ------------------------------------------------- nouvelle réservation ---
  function newBookingDrawer(prefill = {}) {
    const svcs = S.services.filter((s) => s.active);
    if (!svcs.length) { toast("Créez d'abord une prestation."); location.hash = "prestations"; return; }
    const day = prefill.day || todayYmd();
    openDrawer({
      title: "Nouvelle réservation",
      body: `<p class="muted" style="margin:0">Pour une séance convenue par téléphone ou WhatsApp. Le créneau est bloqué sur votre site.</p>
        <div class="form-grid">
          <label class="field full"><span>Joueur</span><select id="nb-player"><option value="">Choisir un joueur</option><option value="__new">+ Nouveau joueur</option>
            ${S.players.map((p) => `<option value="${p.id}" ${prefill.player_id === p.id ? "selected" : ""}>${esc(fullName(p))}${p.phone ? " · " + esc(p.phone) : ""}</option>`).join("")}</select></label>
          <div class="full form-grid" id="nb-newplayer" hidden>
            <label class="field"><span>Prénom</span><input type="text" id="nb-first" autocomplete="off"></label>
            <label class="field"><span>Nom</span><input type="text" id="nb-last" autocomplete="off"></label>
            <label class="field"><span>Téléphone</span><input type="tel" id="nb-phone" autocomplete="off"></label>
            <label class="field"><span>Email <small>(pour la confirmation)</small></span><input type="email" id="nb-email" autocomplete="off"></label>
          </div>
          <label class="field full"><span>Prestation</span><select id="nb-svc">${svcs.map((s) => `<option value="${s.id}">${esc(s.name)} · ${P.fmtDuration(s.duration_minutes)} · ${euros(s.price_cents)}</option>`).join("")}</select></label>
          <label class="field"><span>Date</span><input type="date" id="nb-date" value="${day}"></label>
          <label class="field"><span>Heure</span><input type="time" id="nb-time" step="900" value="${prefill.time || ""}"></label>
          <div class="full"><div class="muted" style="font-size:13px;margin-bottom:6px">Créneaux libres</div><div class="chips" id="nb-slots"></div></div>
          <label class="field"><span>Lieu</span><select id="nb-loc"><option value="">Non précisé</option>${S.locations.map((l) => `<option value="${l.id}">${esc(l.name)}</option>`).join("")}</select></label>
          <label class="field"><span>Joueurs</span><select id="nb-party"></select></label>
          <label class="field full"><span>Notes privées</span><textarea id="nb-notes"></textarea></label>
        </div><div id="nb-err"></div>`,
      foot: `<button class="btn btn--primary" data-action="create-booking">Créer la réservation</button><button class="btn" data-close-drawer>Annuler</button>`,
      onMount: (el) => {
        const $ = (id) => el.querySelector("#" + id);
        const refreshParty = () => {
          const s = svcById($("nb-svc").value);
          $("nb-party").innerHTML = Array.from({ length: s.capacity }, (_, i) => `<option>${i + 1}</option>`).join("");
          if (s.location_id) $("nb-loc").value = s.location_id;
        };
        const slotsChips = async () => {
          const d = $("nb-date").value, sid = $("nb-svc").value;
          const box = $("nb-slots");
          if (!d) { box.innerHTML = ""; return; }
          box.innerHTML = `<span class="muted">Chargement…</span>`;
          try {
            const slots = await S.api.coachSlots(S.coach, sid, d, d);
            box.innerHTML = slots.length ? slots.map((s) => `<button type="button" class="chip" data-nb-slot="${P.localHm(new Date(s.starts_at), tz())}" data-loc="${s.location_id || ""}">${hm(s.starts_at)}</button>`).join("")
              : `<span class="muted">Aucun créneau libre selon vos disponibilités. Vous pouvez saisir une heure.</span>`;
          } catch (e) { box.innerHTML = `<span class="muted">${esc(errMsg(e))}</span>`; }
        };
        $("nb-player").addEventListener("change", () => { $("nb-newplayer").hidden = $("nb-player").value !== "__new"; });
        $("nb-svc").addEventListener("change", () => { refreshParty(); slotsChips(); });
        $("nb-date").addEventListener("change", slotsChips);
        $("nb-slots").addEventListener("click", (e) => {
          const c = e.target.closest("[data-nb-slot]");
          if (!c) return;
          $("nb-time").value = c.dataset.nbSlot;
          if (c.dataset.loc) $("nb-loc").value = c.dataset.loc;
          $("nb-slots").querySelectorAll(".chip").forEach((x) => x.setAttribute("aria-pressed", String(x === c)));
        });
        refreshParty();
        slotsChips();
      },
    });
  }

  async function createBookingFromDrawer(btn) {
    const v = (id) => (document.getElementById(id) || {}).value || "";
    const err = (m) => { document.getElementById("nb-err").innerHTML = `<div class="alert alert--err" role="alert">${esc(m)}</div>`; };
    let playerId = v("nb-player");
    if (!playerId) return err("Choisissez un joueur ou créez-en un.");
    if (!v("nb-date") || !v("nb-time")) return err("Indiquez la date et l'heure.");
    const s = svcById(v("nb-svc"));
    const start = P.zonedToUtc(v("nb-date"), v("nb-time"), tz());
    const end = new Date(start.getTime() + s.duration_minutes * 6e4);
    btn.disabled = true;
    try {
      if (playerId === "__new") {
        if (!v("nb-first").trim()) { btn.disabled = false; return err("Indiquez au moins le prénom du joueur."); }
        const p = await S.api.insert("players", { coach_id: S.coach.id, first_name: v("nb-first").trim(), last_name: v("nb-last").trim(),
          phone: v("nb-phone").trim() || null, email: v("nb-email").trim().toLowerCase() || null });
        S.players.push(p);
        playerId = p.id;
      }
      const row = await S.api.createBooking({
        coach_id: S.coach.id, service_id: s.id, player_id: playerId, location_id: v("nb-loc") || null, service_name: s.name,
        starts_at: start.toISOString(), ends_at: end.toISOString(), status: "confirmed", price_cents: s.price_cents,
        party_size: Number(v("nb-party")) || 1, coach_notes: v("nb-notes").trim() || null, source: "manual",
      });
      S.bookings.push(withPlayer(row));
      S.bookings.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
      closeDrawer();
      toast("Réservation créée");
      render();
    } catch (e) { btn.disabled = false; err(errMsg(e)); }
  }

  // =============================================================== agenda ===
  function viewAgenda() {
    const ws = S.ui.weekStart || P.mondayOf(todayYmd());
    const days = Array.from({ length: 7 }, (_, i) => P.addDays(ws, i));
    const t = todayYmd();
    // Plage horaire affichée : couvre disponibilités et séances de la semaine.
    let h0 = 8, h1 = 21;
    for (const r of S.rules) { h0 = Math.min(h0, +r.start_time.slice(0, 2)); h1 = Math.max(h1, Math.ceil(+r.end_time.slice(0, 2) + +r.end_time.slice(3, 5) / 60)); }
    const weekB = S.bookings.filter((b) => days.includes(dayOf(b.starts_at)) && b.status !== "cancelled");
    for (const b of weekB) {
      const p0 = P.tzParts(new Date(b.starts_at), tz()), p1 = P.tzParts(new Date(b.ends_at), tz());
      h0 = Math.min(h0, p0.h); h1 = Math.max(h1, p1.h + (p1.mi ? 1 : 0));
    }
    const HH = 46;
    const y = (h, m) => ((h - h0) * 60 + m) / 60 * HH;
    const end = P.addDays(ws, 6);
    const [, m1, d1] = ws.split("-").map(Number), [y2, m2, d2] = end.split("-").map(Number);
    const title = m1 === m2 ? `${d1} – ${d2} ${P.MONTHS[m2 - 1]} ${y2}` : `${d1} ${P.MONTHS[m1 - 1]} – ${d2} ${P.MONTHS[m2 - 1]} ${y2}`;
    const wk = weekStats(ws);

    const cols = days.map((d) => {
      const wd = P.isoWeekday(d);
      const avail = S.rules.filter((r) => r.weekday === wd).map((r) => {
        const [a, b] = r.start_time.split(":").map(Number), [c, e] = r.end_time.split(":").map(Number);
        return `<div class="cal__avail" style="top:${y(a, b)}px;height:${y(c, e) - y(a, b)}px"></div>`;
      }).join("");
      const dayStart = +P.zonedToUtc(d, "00:00", tz()), dayEnd = +P.zonedToUtc(P.addDays(d, 1), "00:00", tz());
      const offs = S.timeOff.filter((o) => +new Date(o.starts_at) < dayEnd && +new Date(o.ends_at) > dayStart).map((o) => {
        const s = Math.max(+new Date(o.starts_at), dayStart), e = Math.min(+new Date(o.ends_at), dayEnd);
        const ps = P.tzParts(new Date(s), tz());
        const top = Math.max(0, y(ps.h, ps.mi));
        const bottom = e >= dayEnd ? y(h1, 0) : (() => { const pe = P.tzParts(new Date(e), tz()); return y(pe.h, pe.mi); })();
        return `<div class="cal__off" style="top:${top}px;height:${Math.max(18, Math.min(bottom, y(h1, 0)) - top)}px">${esc(o.reason || "Indisponible")}</div>`;
      }).join("");
      const evs = weekB.filter((b) => dayOf(b.starts_at) === d).map((b) => {
        const ps = P.tzParts(new Date(b.starts_at), tz());
        const top = y(ps.h, ps.mi), h = minutes(b) / 60 * HH;
        return `<button type="button" class="cal__ev ${b.status === "pending" ? "cal__ev--pending" : ""}" data-booking="${b.id}"
          style="top:${top + 1}px;height:${h - 2}px;background:${esc(svcColor(b))}"
          aria-label="${esc(`${hm(b.starts_at)} ${b.service_name} ${fullName(b.player)}`)}">
          <b>${hm(b.starts_at)} ${esc(fullName(b.player))}</b>${h > 40 ? esc(b.service_name) : ""}</button>`;
      }).join("");
      let nowLine = "";
      if (d === t) { const pn = P.tzParts(new Date(), tz()); if (pn.h >= h0 && pn.h < h1) nowLine = `<div class="cal__now" style="top:${y(pn.h, pn.mi)}px"></div>`; }
      return `<div class="cal__col" data-day="${d}">${avail}${offs}${evs}${nowLine}</div>`;
    }).join("");

    const hours = Array.from({ length: h1 - h0 }, (_, i) => `<div class="cal__hour">${h0 + i}h</div>`).join("");
    const heads = days.map((d) => `<div class="cal__dayhead ${d === t ? "today" : ""}">${P.DAYS_SHORT[P.isoWeekday(d) - 1]}<b>${+d.slice(8)}</b></div>`).join("");

    const upcomingOff = S.timeOff.filter((o) => new Date(o.ends_at) > new Date()).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    return `<div class="page__head"><div><h1>Agenda</h1><p>${wk.count} séance${wk.count > 1 ? "s" : ""} · ${wk.fill} % de vos disponibilités remplies</p></div>
        <div class="week-nav"><button class="icon-btn" data-action="week" data-delta="-7" aria-label="Semaine précédente">${icon("left")}</button>
        <button class="btn btn--sm" data-action="week" data-delta="0">Aujourd'hui</button>
        <button class="icon-btn" data-action="week" data-delta="7" aria-label="Semaine suivante">${icon("right")}</button>
        <strong>${title}</strong></div></div>
      <div class="cal-wrap"><div class="cal" style="--hh:${HH}px">
        <div class="cal__corner"></div>${heads}
        <div class="cal__hours" style="padding-top:0">${hours}</div>${cols}
      </div></div>
      <div class="legend"><span><i style="background:var(--slot-bg)"></i>Disponible à la réservation</span>
        <span><i style="background:repeating-linear-gradient(45deg,var(--hatch) 0 4px,transparent 4px 8px);border:1px solid var(--muted)"></i>Absence</span>
        <span><i style="border:2px dashed var(--warn)"></i>À valider</span>
        ${S.services.filter((s) => s.active).map((s) => `<span><i style="background:${esc(s.color || "#5A6780")}"></i>${esc(s.name)}</span>`).join("")}</div>

      <div class="grid grid--2" style="margin-top:20px">
        <section class="card"><h2>Disponibilités de la semaine type <small>répétées chaque semaine</small></h2>
          <div class="weekday-rules">${[1, 2, 3, 4, 5, 6, 7].map((wd) => {
            const rs = S.rules.filter((r) => r.weekday === wd);
            return `<div class="wd"><div class="wd__name">${P.cap(P.DAYS[wd - 1])}</div><div class="wd__ranges">${rs.length ? rs.map((r) => `
              <span class="range">${P.hmLabel(r.start_time.slice(0, 5))} – ${P.hmLabel(r.end_time.slice(0, 5))}${r.location_id && locById(r.location_id) ? ` <span class="muted" style="font-weight:500">· ${esc(locById(r.location_id).name)}</span>` : ""}
              <button type="button" data-action="del-rule" data-id="${r.id}" aria-label="Supprimer cette plage">${icon("x")}</button></span>`).join("") : `<span class="muted">Fermé</span>`}</div></div>`;
          }).join("")}</div>
          <form class="inline-form" id="rule-form" style="margin-top:14px">
            <label class="field"><span>Jour</span><select id="r-wd">${P.DAYS.map((d, i) => `<option value="${i + 1}">${P.cap(d)}</option>`).join("")}</select></label>
            <label class="field"><span>De</span><input type="time" id="r-start" value="09:00" step="900"></label>
            <label class="field"><span>À</span><input type="time" id="r-end" value="12:00" step="900"></label>
            ${S.locations.length ? `<label class="field"><span>Lieu</span><select id="r-loc"><option value="">Tous</option>${S.locations.map((l) => `<option value="${l.id}">${esc(l.name)}</option>`).join("")}</select></label>` : ""}
            <button class="btn btn--dark" type="submit">Ajouter</button>
          </form></section>
        <section class="card"><h2>Absences et créneaux bloqués</h2>
          ${upcomingOff.length ? `<div class="rows">${upcomingOff.map((o) => `<div class="row" style="cursor:default;grid-template-columns:minmax(0,1fr) auto">
            <span class="row__main"><span class="row__title">${esc(o.reason || "Indisponible")}</span>
            <span class="row__sub">${esc(P.fmtDate(o.starts_at, tz(), "short"))} ${hm(o.starts_at)} → ${esc(P.fmtDate(o.ends_at, tz(), "short"))} ${hm(o.ends_at)}</span></span>
            <button class="icon-btn" data-action="del-off" data-id="${o.id}" aria-label="Supprimer">${icon("x")}</button></div>`).join("")}</div>`
            : `<div class="empty" style="padding:12px">Aucune absence prévue.</div>`}
          <form class="form-grid" id="off-form" style="margin-top:14px">
            <label class="field"><span>Du</span><input type="datetime-local" id="o-start" step="900" value="${P.addDays(todayYmd(), 1)}T08:00"></label>
            <label class="field"><span>Au</span><input type="datetime-local" id="o-end" step="900" value="${P.addDays(todayYmd(), 1)}T20:00"></label>
            <label class="field full"><span>Motif <small>(visible par vous seul)</small></span><input type="text" id="o-reason" placeholder="Vacances, tournoi, formation…"></label>
            <div class="full"><button class="btn btn--dark" type="submit">Bloquer cette période</button></div>
          </form></section>
      </div>`;
  }
  AFTER.agenda = (page) => {
    page.querySelector("#rule-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const wd = +page.querySelector("#r-wd").value, s = page.querySelector("#r-start").value, en = page.querySelector("#r-end").value;
      const loc = page.querySelector("#r-loc") ? page.querySelector("#r-loc").value || null : null;
      if (!s || !en || en <= s) return toast("L'heure de fin doit être après l'heure de début.");
      const clash = S.rules.some((r) => r.weekday === wd && s < r.end_time.slice(0, 5) && r.start_time.slice(0, 5) < en);
      if (clash) return toast("Cette plage chevauche une plage existante ce jour-là.");
      try {
        const r = await S.api.insert("availability_rules", { coach_id: S.coach.id, weekday: wd, start_time: s + ":00", end_time: en + ":00", location_id: loc });
        S.rules.push(r); S.rules.sort((a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time));
        toast("Disponibilité ajoutée"); render();
      } catch (err) { toast(errMsg(err)); }
    });
    page.querySelector("#off-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const a = page.querySelector("#o-start").value, b = page.querySelector("#o-end").value;
      if (!a || !b) return toast("Indiquez le début et la fin.");
      const s = P.zonedToUtc(a.slice(0, 10), a.slice(11, 16), tz()), en = P.zonedToUtc(b.slice(0, 10), b.slice(11, 16), tz());
      if (en <= s) return toast("La fin doit être après le début.");
      const clash = S.bookings.filter((x) => isActive(x) && new Date(x.starts_at) < en && new Date(x.ends_at) > s);
      try {
        const r = await S.api.insert("time_off", { coach_id: S.coach.id, starts_at: s.toISOString(), ends_at: en.toISOString(), reason: page.querySelector("#o-reason").value.trim() || null });
        S.timeOff.push(r);
        toast(clash.length ? `Période bloquée. Attention : ${clash.length} séance${clash.length > 1 ? "s" : ""} déjà réservée${clash.length > 1 ? "s" : ""} sur cette période.` : "Période bloquée");
        render();
      } catch (err) { toast(errMsg(err)); }
    });
  };

  // ========================================================== prestations ===
  function viewServices() {
    const svcs = [...S.services].sort((a, b) => a.position - b.position);
    return `<div class="page__head"><div><h1>Prestations et lieux</h1><p>Ce que vos joueurs peuvent réserver, et où.</p></div></div>
      <div class="grid grid--main">
        <section class="card"><h2>Prestations <button class="btn btn--sm btn--primary" data-action="edit-service">${icon("plus")} Ajouter</button></h2>
          <div class="svc-list">${svcs.map((s, i) => `<div class="svc-item ${s.active ? "" : "svc-item--off"}">
            <span class="svc-item__dot" style="background:${esc(s.color || "#5A6780")}"></span>
            <div style="min-width:0"><div class="row__title">${esc(s.name)} ${s.active ? "" : pill("neutral", "Masquée")}</div>
              <div class="row__sub">${P.fmtDuration(s.duration_minutes)} · ${euros(s.price_cents)} · ${s.capacity > 1 ? `jusqu'à ${s.capacity} joueurs` : "1 joueur"}${s.location_id && locById(s.location_id) ? " · " + esc(locById(s.location_id).name) : ""}</div></div>
            <div class="btn-row">
              <button class="icon-btn" data-action="move-service" data-id="${s.id}" data-dir="-1" ${i === 0 ? "disabled" : ""} aria-label="Monter">${icon("up")}</button>
              <button class="icon-btn" data-action="move-service" data-id="${s.id}" data-dir="1" ${i === svcs.length - 1 ? "disabled" : ""} aria-label="Descendre">${icon("down")}</button>
              <button class="btn btn--sm" data-action="edit-service" data-id="${s.id}">Modifier</button></div>
          </div>`).join("") || `<div class="empty">Aucune prestation. Ajoutez-en une pour ouvrir les réservations.</div>`}</div></section>
        <section class="card"><h2>Lieux <button class="btn btn--sm" data-action="edit-location">${icon("plus")} Ajouter</button></h2>
          <div class="rows">${S.locations.map((l) => `<button type="button" class="row" style="grid-template-columns:minmax(0,1fr) auto" data-action="edit-location" data-id="${l.id}">
            <span class="row__main"><span class="row__title">${esc(l.name)}</span><span class="row__sub">${esc(l.address || "Adresse non renseignée")}</span></span>
            <span class="muted">Modifier</span></button>`).join("") || `<div class="empty">Ajoutez les clubs où vous donnez vos cours.</div>`}</div></section>
      </div>`;
  }

  function serviceDrawer(id, confirmDelete) {
    const s = id ? svcById(id) : { name: "", description: "", duration_minutes: 60, price_cents: 5000, capacity: 1, level: "", location_id: null, color: "#1F6FEB", active: true };
    const durations = [30, 45, 60, 75, 90, 105, 120, 150, 180, 240];
    openDrawer({
      title: id ? "Modifier la prestation" : "Nouvelle prestation",
      body: `${confirmDelete ? `<div class="confirm-box">Supprimer « ${esc(s.name)} » ? Les réservations passées sont conservées. Pour la retirer temporairement, décochez plutôt « Visible ».
          <div class="btn-row"><button class="btn" data-action="edit-service" data-id="${id}">Non, garder</button><button class="btn btn--dark" data-action="delete-service" data-id="${id}">Oui, supprimer</button></div></div>` : ""}
        <form class="form-grid" id="svc-form">
        <label class="field full"><span>Nom</span><input type="text" id="sv-name" required maxlength="80" value="${esc(s.name)}" placeholder="Coaching individuel"></label>
        <label class="field full"><span>Description</span><textarea id="sv-desc" maxlength="400">${esc(s.description || "")}</textarea></label>
        <label class="field"><span>Durée</span><select id="sv-dur">${durations.map((d) => `<option value="${d}" ${d === s.duration_minutes ? "selected" : ""}>${P.fmtDuration(d)}</option>`).join("")}</select></label>
        <label class="field"><span>Prix (€)</span><input type="number" id="sv-price" min="0" step="1" inputmode="decimal" value="${(s.price_cents / 100).toString()}"></label>
        <label class="field"><span>Joueurs maximum</span><input type="number" id="sv-cap" min="1" max="12" value="${s.capacity}"></label>
        <label class="field"><span>Niveau</span><input type="text" id="sv-level" maxlength="40" value="${esc(s.level || "")}" placeholder="Tous niveaux"></label>
        <label class="field"><span>Lieu</span><select id="sv-loc"><option value="">Selon mes disponibilités</option>${S.locations.map((l) => `<option value="${l.id}" ${l.id === s.location_id ? "selected" : ""}>${esc(l.name)}</option>`).join("")}</select></label>
        <label class="field"><span>Couleur dans l'agenda</span><span class="color-row"><input type="color" id="sv-color" value="${esc(s.color || "#1F6FEB")}"></span></label>
        <label class="switch full"><span><b>Visible sur le site</b><small>Décochez pour la masquer sans la supprimer.</small></span><input type="checkbox" id="sv-active" ${s.active ? "checked" : ""}></label>
      </form>`,
      foot: `<button class="btn btn--primary" data-action="save-service" data-id="${id || ""}">Enregistrer</button>${id ? `<button class="btn btn--danger" data-action="ask-delete-service" data-id="${id}">Supprimer</button>` : ""}`,
    });
  }
  async function saveService(id) {
    const v = (x) => document.getElementById(x);
    const name = v("sv-name").value.trim();
    if (!name) return toast("Donnez un nom à la prestation.");
    const price = Math.round(parseFloat(String(v("sv-price").value).replace(",", ".")) * 100);
    if (!(price >= 0)) return toast("Prix invalide.");
    const cap = Math.min(12, Math.max(1, parseInt(v("sv-cap").value, 10) || 1));
    const row = { name, description: v("sv-desc").value.trim() || null, duration_minutes: +v("sv-dur").value, price_cents: price,
      capacity: cap, level: v("sv-level").value.trim() || null, location_id: v("sv-loc").value || null, color: v("sv-color").value, active: v("sv-active").checked };
    try {
      if (id) { const r = await S.api.update("services", id, row); S.services[S.services.findIndex((s) => s.id === id)] = r; }
      else { const r = await S.api.insert("services", { ...row, coach_id: S.coach.id, position: S.services.length }); S.services.push(r); }
      closeDrawer(); toast("Prestation enregistrée"); render();
    } catch (e) { toast(errMsg(e)); }
  }
  async function moveService(id, dir) {
    const list = [...S.services].sort((a, b) => a.position - b.position);
    const i = list.findIndex((s) => s.id === id), j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    try {
      await Promise.all(list.map((s, k) => s.position === k ? null : S.api.update("services", s.id, { position: k })));
      list.forEach((s, k) => { s.position = k; });
      S.services = list;
      render();
    } catch (e) { toast(errMsg(e)); }
  }
  function locationDrawer(id, confirmDelete) {
    const l = id ? locById(id) : { name: "", address: "", maps_url: "" };
    openDrawer({
      title: id ? "Modifier le lieu" : "Nouveau lieu",
      body: `${confirmDelete ? `<div class="confirm-box">Supprimer « ${esc(l.name)} » ? Les disponibilités et prestations liées resteront, sans lieu précisé.
          <div class="btn-row"><button class="btn" data-action="edit-location" data-id="${id}">Non, garder</button><button class="btn btn--dark" data-action="delete-location" data-id="${id}">Oui, supprimer</button></div></div>` : ""}
        <div class="form-grid">
        <label class="field full"><span>Nom du club</span><input type="text" id="lo-name" maxlength="80" value="${esc(l.name)}" placeholder="Padel Club Garonne"></label>
        <label class="field full"><span>Adresse</span><input type="text" id="lo-addr" maxlength="160" value="${esc(l.address || "")}"></label>
        <label class="field full"><span>Lien Google Maps <small>(facultatif)</small></span><input type="url" id="lo-maps" value="${esc(l.maps_url || "")}" placeholder="https://maps.app.goo.gl/…"></label></div>`,
      foot: `<button class="btn btn--primary" data-action="save-location" data-id="${id || ""}">Enregistrer</button>${id ? `<button class="btn btn--danger" data-action="ask-delete-location" data-id="${id}">Supprimer</button>` : ""}`,
    });
  }
  async function saveLocation(id) {
    const name = document.getElementById("lo-name").value.trim();
    if (!name) return toast("Indiquez le nom du lieu.");
    const maps = document.getElementById("lo-maps").value.trim();
    if (maps && !/^https:\/\//.test(maps)) return toast("Le lien Maps doit commencer par https://");
    const row = { name, address: document.getElementById("lo-addr").value.trim() || null, maps_url: maps || null };
    try {
      if (id) { const r = await S.api.update("locations", id, row); S.locations[S.locations.findIndex((x) => x.id === id)] = r; }
      else { S.locations.push(await S.api.insert("locations", { ...row, coach_id: S.coach.id, position: S.locations.length })); }
      closeDrawer(); toast("Lieu enregistré"); render();
    } catch (e) { toast(errMsg(e)); }
  }

  // ============================================================== joueurs ===
  function playerStats(p) {
    const bs = S.bookings.filter((b) => b.player_id === p.id);
    const done = bs.filter((b) => b.status === "completed" || (b.status === "confirmed" && isPast(b)));
    const next = bs.filter((b) => isActive(b) && !isPast(b));
    const last = done.length ? done[done.length - 1] : null;
    return { total: done.length, next: next[0] || null, last, spent: sum(bs.filter((b) => b.payment_status === "paid"), (b) => b.price_cents), all: bs };
  }
  function viewPlayers() {
    const q = S.ui.playerQuery.trim().toLowerCase();
    const list = S.players.filter((p) => !q || `${fullName(p)} ${p.email || ""} ${p.phone || ""} ${p.level || ""}`.toLowerCase().includes(q));
    return `<div class="page__head"><div><h1>Joueurs</h1><p>${S.players.length} joueur${S.players.length > 1 ? "s" : ""} · fiches créées automatiquement à chaque réservation</p></div>
        <div class="btn-row"><button class="btn" data-action="export-csv">Exporter (CSV)</button><button class="btn btn--primary" data-action="edit-player">${icon("plus")} Ajouter</button></div></div>
      <div class="toolbar"><input type="search" class="search" id="pl-search" placeholder="Rechercher par nom, téléphone, niveau…" value="${esc(S.ui.playerQuery)}" aria-label="Rechercher un joueur"></div>
      <section class="card" style="padding:6px 6px 0"><div class="table-wrap"><table>
        <thead><tr><th>Joueur</th><th>Niveau</th><th>Téléphone</th><th class="num">Séances</th><th>Dernière</th><th>Prochaine</th></tr></thead>
        <tbody>${list.map((p) => { const st = playerStats(p); return `<tr class="clickable" data-player="${p.id}" tabindex="0">
          <td><b>${esc(fullName(p))}</b></td><td>${esc(p.level || "")}</td><td class="num" style="text-align:left">${esc(p.phone || "")}</td>
          <td class="num">${st.total}</td><td>${st.last ? esc(P.fmtDate(st.last.starts_at, tz(), "short")) : "<span class='muted'>–</span>"}</td>
          <td>${st.next ? esc(P.fmtDate(st.next.starts_at, tz(), "short")) : "<span class='muted'>–</span>"}</td></tr>`; }).join("")
          || `<tr><td colspan="6"><div class="empty">Aucun joueur trouvé.</div></td></tr>`}</tbody></table></div></section>`;
  }
  AFTER.joueurs = () => {
    const s = document.getElementById("pl-search");
    s.addEventListener("input", () => { S.ui.playerQuery = s.value; const pos = s.selectionStart; render(); const n = document.getElementById("pl-search"); n.focus(); n.setSelectionRange(pos, pos); });
  };
  function playerDrawer(id, confirmDelete) {
    const p = id ? playerById(id) : { first_name: "", last_name: "", email: "", phone: "", level: "", notes: "" };
    if (!p) return;
    const st = id ? playerStats(p) : null;
    openDrawer({
      title: id ? fullName(p) : "Nouveau joueur",
      body: `${confirmDelete ? `<div class="confirm-box">Supprimer la fiche de ${esc(fullName(p))} ? Ses réservations restent dans l'historique, sans nom.
          <div class="btn-row"><button class="btn" data-player="${id}">Non, garder</button><button class="btn btn--dark" data-action="delete-player" data-id="${id}">Oui, supprimer</button></div></div>` : ""}
        ${st ? `<div class="kpis" style="grid-template-columns:repeat(3,minmax(0,1fr));margin:0">
          <div class="kpi"><span class="kpi__label">Séances</span><span class="kpi__value">${st.total}</span></div>
          <div class="kpi"><span class="kpi__label">Réglé</span><span class="kpi__value" style="font-size:20px">${euros(st.spent)}</span></div>
          <div class="kpi"><span class="kpi__label">Prochaine</span><span class="kpi__value" style="font-size:15px">${st.next ? esc(P.fmtDate(st.next.starts_at, tz(), "short")) : "–"}</span></div></div>` : ""}
        <div class="form-grid">
          <label class="field"><span>Prénom</span><input type="text" id="pl-first" value="${esc(p.first_name)}" maxlength="80"></label>
          <label class="field"><span>Nom</span><input type="text" id="pl-last" value="${esc(p.last_name || "")}" maxlength="80"></label>
          <label class="field"><span>Téléphone</span><input type="tel" id="pl-phone" value="${esc(p.phone || "")}"></label>
          <label class="field"><span>Email</span><input type="email" id="pl-email" value="${esc(p.email || "")}"></label>
          <label class="field"><span>Niveau</span><input type="text" id="pl-level" value="${esc(p.level || "")}" placeholder="P100"></label>
          <label class="field full"><span>Notes privées</span><textarea id="pl-notes" placeholder="Points forts, axes de travail, objectifs…">${esc(p.notes || "")}</textarea></label>
        </div>
        ${st && st.all.length ? `<div><div class="day-head">Historique</div><div class="rows">${[...st.all].reverse().slice(0, 30).map((b) => bookingRow(b, { showDate: true })).join("")}</div></div>` : ""}`,
      foot: `<button class="btn btn--primary" data-action="save-player" data-id="${id || ""}">Enregistrer</button>
        ${id ? `<button class="btn" data-action="new-booking" data-player-id="${id}">Réserver une séance</button><button class="btn btn--danger" data-action="ask-delete-player" data-id="${id}">Supprimer</button>` : ""}`,
    });
  }
  async function savePlayer(id) {
    const v = (x) => document.getElementById(x).value.trim();
    if (!v("pl-first")) return toast("Indiquez le prénom.");
    const email = v("pl-email").toLowerCase();
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast("Email invalide.");
    const row = { first_name: v("pl-first"), last_name: v("pl-last"), phone: v("pl-phone") || null, email: email || null, level: v("pl-level") || null, notes: v("pl-notes") || null };
    try {
      if (id) { const r = await S.api.update("players", id, row); S.players[S.players.findIndex((p) => p.id === id)] = r; S.bookings = S.bookings.map((b) => b.player_id === id ? { ...b, player: r } : b); }
      else S.players.push(await S.api.insert("players", { ...row, coach_id: S.coach.id }));
      S.players.sort((a, b) => fullName(a).localeCompare(fullName(b), "fr"));
      closeDrawer(); toast("Fiche enregistrée"); render();
    } catch (e) { toast(errMsg(e)); }
  }
  function exportCsv() {
    const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [["Prénom", "Nom", "Email", "Téléphone", "Niveau", "Séances", "Dernière séance", "Notes"].map(q).join(";")];
    for (const p of S.players) {
      const st = playerStats(p);
      lines.push([p.first_name, p.last_name, p.email, p.phone, p.level, st.total, st.last ? dayOf(st.last.starts_at) : "", p.notes].map(q).join(";"));
    }
    const csv = "﻿" + lines.join("\r\n");
    try {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      a.download = `joueurs-${S.coach.slug}-${todayYmd()}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
    } catch { /* téléchargement bloqué : on propose la copie */ }
    openDrawer({
      title: "Export des joueurs",
      body: `<p class="muted" style="margin:0">Le fichier CSV s'ouvre dans Excel, Numbers ou Google Sheets. Si le téléchargement n'a pas démarré, copiez le contenu ci-dessous.</p>
        <textarea id="csv-text" readonly style="min-height:260px;font-family:ui-monospace,monospace;font-size:12px">${esc(lines.join("\n"))}</textarea>`,
      foot: `<button class="btn btn--primary" data-action="copy-csv">Copier</button>`,
    });
  }

  // ============================================================== mon site ===
  function viewSite() {
    const th = (S.site && S.site.theme) || {}, c = (S.site && S.site.content) || {};
    const lines = (a) => esc((a || []).join("\n"));
    const stats = c.stats || [];
    const fontOpts = (sel) => Object.keys(P.FONTS).map((f) => `<option ${f === sel ? "selected" : ""}>${f}</option>`).join("");
    const upload = (key, label, val) => `<div class="field"><span>${label}</span><div class="upload">
      <span class="upload__thumb" id="th-${key}" style="${val ? `background-image:url('${esc(val)}')` : ""}"></span>
      <div class="btn-row"><label class="btn btn--sm">Choisir une image<input type="file" accept="image/*" data-upload="${key}" hidden></label>
      ${val ? `<button type="button" class="btn btn--sm btn--danger" data-clear-upload="${key}">Retirer</button>` : ""}</div>
      <input type="hidden" id="img-${key}" value="${esc(val || "")}"></div></div>`;
    const sec = (id, title, body) => `<section class="card" id="${id}"><h2>${title}</h2>${body}</section>`;
    return `<div class="page__head"><div><h1>Mon site</h1><p>Textes, photos et couleurs de votre site. Les changements sont en ligne dès l'enregistrement.</p></div>
        <a class="btn" href="../index.html?c=${encodeURIComponent(S.coach.slug)}" target="_blank" rel="noopener">${icon("ext")} Voir mon site</a></div>
      <div class="site-layout">
        <nav class="site-toc" aria-label="Sections"><a href="#s-identite" data-scroll>Identité</a><a href="#s-accueil" data-scroll>Accueil</a><a href="#s-coach" data-scroll>Présentation</a><a href="#s-photos" data-scroll>Galerie photos</a>
          <a href="#s-avis" data-scroll>Témoignages</a><a href="#s-contact" data-scroll>Contact</a><a href="#s-seo" data-scroll>Référencement</a></nav>
        <form class="site-sections" id="site-form" novalidate>
          ${sec("s-identite", "Identité visuelle", `<div class="form-grid">
            <label class="field"><span>Nom affiché en logo</span><input type="text" id="t-logo" maxlength="40" value="${esc(th.logo_text || "")}"></label>
            ${upload("logo_url", "Logo <small>(remplace le texte)</small>", th.logo_url)}
            <label class="field"><span>Couleur principale</span><span class="color-row"><input type="color" id="t-primary" value="${esc(th.primary || "#0E2A52")}"><input type="text" id="t-primary-hex" value="${esc(th.primary || "#0E2A52")}" maxlength="7"></span></label>
            <label class="field"><span>Couleur d'action</span><span class="color-row"><input type="color" id="t-accent" value="${esc(th.accent || "#E4F55B")}"><input type="text" id="t-accent-hex" value="${esc(th.accent || "#E4F55B")}" maxlength="7"></span></label>
            <label class="field"><span>Police des titres</span><select id="t-fdisp">${fontOpts(th.font_display || "Archivo")}</select></label>
            <label class="field"><span>Police du texte</span><select id="t-fbody">${fontOpts(th.font_body || "Hanken Grotesk")}</select></label>
            <div class="full preview-swatch" id="swatch"></div></div>`)}
          ${sec("s-accueil", "Page d'accueil", `<div class="form-grid">
            <label class="field full"><span>Titre principal</span><input type="text" id="c-hero" maxlength="70" value="${esc(c.hero_title || "")}"></label>
            <label class="field full"><span>Sous-titre</span><textarea id="c-sub" maxlength="220">${esc(c.hero_subtitle || "")}</textarea></label>
            ${upload("hero_image", "Photo principale <small>(vous, en grand, format portrait)</small>", th.hero_image)}
            ${upload("hero_image_2", "Photo d'action <small>(en incrustation, format paysage)</small>", th.hero_image_2)}
            <div class="field full"><span>Chiffres clés</span>${[0, 1, 2].map((i) => `<div class="form-grid" style="margin-top:6px">
              <input type="text" id="st-v${i}" placeholder="7 ans" maxlength="12" value="${esc((stats[i] || {}).value || "")}" aria-label="Chiffre ${i + 1}">
              <input type="text" id="st-l${i}" placeholder="de coaching" maxlength="30" value="${esc((stats[i] || {}).label || "")}" aria-label="Légende ${i + 1}"></div>`).join("")}</div></div>`)}
          ${sec("s-coach", "Présentation du coach", `<div class="form-grid">
            ${upload("portrait_image", "Portrait", th.portrait_image)}
            <label class="field full"><span>Accroche</span><input type="text" id="c-introt" maxlength="90" value="${esc(c.intro_title || "")}"></label>
            <label class="field full"><span>Introduction</span><textarea id="c-intro" maxlength="500">${esc(c.intro || "")}</textarea></label>
            <label class="field full"><span>Parcours</span><textarea id="c-bio" maxlength="800">${esc(c.bio || "")}</textarea></label>
            <label class="field full"><span>Philosophie <small>(citation mise en avant)</small></span><textarea id="c-philo" maxlength="300">${esc(c.philosophy || "")}</textarea></label>
            <label class="field"><span>Diplômes <small>(un par ligne)</small></span><textarea id="c-dipl">${lines(c.diplomas)}</textarea></label>
            <label class="field"><span>Résultats <small>(un par ligne)</small></span><textarea id="c-ach">${lines(c.achievements)}</textarea></label>
            <label class="field full"><span>Spécialités <small>(une par ligne)</small></span><textarea id="c-spec">${lines(c.specialties)}</textarea></label></div>`)}
          ${galleryCard()}
          <section class="card" id="s-avis"><h2>Témoignages <button type="button" class="btn btn--sm" data-action="edit-testimonial">${icon("plus")} Ajouter</button></h2>
            <div class="rows">${S.testimonials.map((t) => `<button type="button" class="row" style="grid-template-columns:minmax(0,1fr) auto" data-action="edit-testimonial" data-id="${t.id}">
              <span class="row__main"><span class="row__title">${esc(t.author)}</span><span class="row__sub">${esc(t.text)}</span></span>
              ${t.visible ? pill("confirmed", "Affiché") : pill("neutral", "Masqué")}</button>`).join("") || `<div class="empty">Ajoutez les retours de vos joueurs.</div>`}</div></section>
          ${sec("s-contact", "Contact et mentions", `<div class="form-grid">
            <label class="field"><span>Téléphone</span><input type="tel" id="c-phone" value="${esc(c.phone || "")}"></label>
            <label class="field"><span>Email public</span><input type="email" id="c-email" value="${esc(c.email || "")}"></label>
            <label class="field"><span>WhatsApp <small>(format international, ex. 33612345678)</small></span><input type="tel" id="c-wa" value="${esc(c.whatsapp || "")}"></label>
            <label class="field"><span>Instagram <small>(lien du profil)</small></span><input type="url" id="c-insta" value="${esc(c.instagram || "")}"></label>
            <label class="field"><span>Nom légal</span><input type="text" id="c-legal" value="${esc(c.legal_name || "")}" placeholder="Prénom Nom EI"></label>
            <label class="field"><span>SIRET</span><input type="text" id="c-siret" value="${esc(c.siret || "")}"></label>
            <label class="field full"><span>Conditions particulières <small>(absence, retard, météo… affichées sur la page « Conditions de réservation »)</small></span>
              <textarea id="c-cond" maxlength="800">${esc(c.conditions_extra || "")}</textarea></label>
            <p class="full muted" style="margin:0;font-size:13px">La page de conditions reprend automatiquement vos règles de réservation, vos mentions légales et les informations sur les données personnelles. <a href="../conditions.html?c=${encodeURIComponent(S.coach.slug)}" target="_blank" rel="noopener">Voir la page</a></p></div>`)}
          ${sec("s-seo", "Référencement Google", `<div class="form-grid">
            <label class="field full"><span>Titre de la page</span><input type="text" id="c-seot" maxlength="80" value="${esc(c.seo_title || "")}"><span class="counter" data-count="c-seot" data-max="60"></span></label>
            <label class="field full"><span>Description</span><textarea id="c-seod" maxlength="220">${esc(c.seo_description || "")}</textarea><span class="counter" data-count="c-seod" data-max="155"></span></label>
            <p class="full muted" style="margin:0;font-size:13px">Conseil : mentionnez votre ville et vos prestations (« coach de padel à Toulouse, cours individuels »). Google affiche environ 60 caractères de titre et 155 de description.</p></div>`)}
          <div class="savebar"><span>Pensez à enregistrer vos modifications.</span><button type="submit" class="btn btn--primary">Enregistrer</button></div>
        </form>
      </div>`;
  }
  AFTER["mon-site"] = (page) => {
    const sync = (a, b) => {
      const c = page.querySelector(a), t = page.querySelector(b);
      c.addEventListener("input", () => { t.value = c.value.toUpperCase(); swatch(); });
      t.addEventListener("input", () => { if (/^#[0-9a-f]{6}$/i.test(t.value)) { c.value = t.value; swatch(); } });
    };
    const swatch = () => {
      const pr = page.querySelector("#t-primary").value, ac = page.querySelector("#t-accent").value;
      const el = page.querySelector("#swatch");
      el.style.background = pr; el.style.color = P.readableOn(pr);
      el.innerHTML = `Aperçu des couleurs <span style="background:${ac};color:${P.readableOn(ac)}">Réserver</span>`;
    };
    sync("#t-primary", "#t-primary-hex"); sync("#t-accent", "#t-accent-hex"); swatch();
    const counters = () => page.querySelectorAll("[data-count]").forEach((c) => {
      const n = page.querySelector("#" + c.dataset.count).value.length, max = +c.dataset.max;
      c.textContent = `${n} / ${max}`; c.classList.toggle("counter--over", n > max);
    });
    page.querySelectorAll("#c-seot, #c-seod").forEach((x) => x.addEventListener("input", counters)); counters();
    page.querySelectorAll("[data-scroll]").forEach((a) => a.addEventListener("click", (e) => {
      e.preventDefault(); page.querySelector(a.getAttribute("href")).scrollIntoView({ behavior: "smooth", block: "start" });
    }));
    page.addEventListener("change", async (e) => {
      const inp = e.target.closest("[data-upload]");
      if (!inp || !inp.files[0]) return;
      const key = inp.dataset.upload;
      if (!/^image\//.test(inp.files[0].type)) return toast("Choisissez une image (JPG, PNG ou WebP).");
      toast("Envoi de l'image…");
      try {
        // Le logo garde sa transparence ; les photos sont réduites pour un site rapide.
        const file = key === "logo_url" ? inp.files[0] : await compressImage(inp.files[0]);
        if (file.size > 5e6) { toast("Image trop lourde : 5 Mo maximum."); return; }
        const url = await S.api.upload(S.coach.id, file);
        page.querySelector("#img-" + key).value = url;
        page.querySelector("#th-" + key).style.backgroundImage = `url('${url}')`;
        toast("Image prête. Enregistrez pour la publier.");
      } catch (err) { toast(errMsg(err)); }
    });
    page.addEventListener("click", (e) => {
      const b = e.target.closest("[data-clear-upload]");
      if (!b) return;
      const key = b.dataset.clearUpload;
      page.querySelector("#img-" + key).value = "";
      page.querySelector("#th-" + key).style.backgroundImage = "";
      b.remove();
    });
    page.querySelector("#site-form").addEventListener("submit", saveSite);
    page.addEventListener("change", onGalleryChange);
  };

  // ---------------------------------------------------------- galerie ---
  // Réduit une photo (côté le plus long, qualité JPEG) avant l'envoi : pages plus rapides, stockage économisé.
  function compressImage(file, maxSide = S.api.mode === "demo" ? 1100 : 1800, quality = S.api.mode === "demo" ? 0.72 : 0.82) {
    return new Promise((resolve) => {
      if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) return resolve(file);
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement("canvas");
        c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob((b) => resolve(b && b.size < file.size ? new File([b], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file), "image/jpeg", quality);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }
  function galleryCard(confirmId) {
    const list = [...S.media].sort((a, b) => a.position - b.position);
    const visible = list.filter((m) => m.visible).length;
    return `<section class="card" id="s-photos"><h2>Galerie photos <small>${visible} affichée${visible > 1 ? "s" : ""} sur le site</small></h2>
      <p class="muted" style="margin:0 0 12px;font-size:14px">Photos de cours, de stages, de vos joueurs (avec leur accord). Les 10 premières s'affichent en mosaïque ; un clic les ouvre en plein écran.</p>
      <label class="dropzone" id="gal-drop"><input type="file" accept="image/*" multiple data-gallery-upload class="sr-only">
        ${icon("plus")}<span><b>Ajouter des photos</b><br><small>Plusieurs à la fois · JPG, PNG ou WebP · réduites automatiquement</small></span></label>
      <div class="media-grid">${list.map((m, i) => `<div class="media-tile ${m.visible ? "" : "media-tile--off"}">
        <div class="media-tile__img" ${m.url ? `style="background-image:url('${esc(m.url)}')"` : ""}>${m.url ? "" : `<span>Emplacement</span>`}</div>
        ${confirmId === m.id ? `<div class="confirm-box" style="margin:8px">Supprimer cette photo ?<div class="btn-row">
            <button type="button" class="btn btn--sm" data-action="media-cancel">Non</button><button type="button" class="btn btn--sm btn--dark" data-action="media-delete" data-id="${m.id}">Supprimer</button></div></div>`
          : `<input type="text" class="media-tile__cap" data-media-caption="${m.id}" maxlength="140" value="${esc(m.caption || "")}" placeholder="Légende (facultatif)" aria-label="Légende de la photo ${i + 1}">
        <div class="media-tile__bar">
          <label class="media-tile__vis"><input type="checkbox" data-media-visible="${m.id}" ${m.visible ? "checked" : ""}> Affichée</label>
          <span class="btn-row" style="flex-wrap:nowrap">
            <button type="button" class="icon-btn" data-action="media-move" data-id="${m.id}" data-dir="-1" ${i === 0 ? "disabled" : ""} aria-label="Avancer">${icon("left")}</button>
            <button type="button" class="icon-btn" data-action="media-move" data-id="${m.id}" data-dir="1" ${i === list.length - 1 ? "disabled" : ""} aria-label="Reculer">${icon("right")}</button>
            <button type="button" class="icon-btn" data-action="media-ask-delete" data-id="${m.id}" aria-label="Supprimer">${icon("x")}</button></span>
        </div>`}</div>`).join("")}</div>
      ${list.length ? "" : `<div class="empty">Aucune photo pour l'instant.</div>`}
    </section>`;
  }
  // Met à jour la seule carte galerie, sans effacer les champs du formulaire en cours de saisie.
  function refreshGallery(confirmId) {
    const el = document.getElementById("s-photos");
    if (el) el.outerHTML = galleryCard(confirmId);
  }
  async function onGalleryChange(e) {
    const t = e.target;
    if (t.matches("[data-gallery-upload]")) {
      const files = [...t.files].filter((f) => /^image\//.test(f.type));
      if (!files.length) return toast("Choisissez des images (JPG, PNG ou WebP).");
      let pos = S.media.reduce((m, x) => Math.max(m, x.position), -1);
      let done = 0;
      for (const f of files) {
        toast(`Envoi ${done + 1} / ${files.length}…`);
        try {
          const file = await compressImage(f);
          if (file.size > 5e6) { toast(`« ${f.name} » dépasse 5 Mo après réduction.`); continue; }
          const url = await S.api.upload(S.coach.id, file);
          S.media.push(await S.api.insert("media", { coach_id: S.coach.id, url, caption: null, visible: true, position: ++pos }));
          done++;
          refreshGallery();
        } catch (err) { toast(errMsg(err)); break; }
      }
      if (done) toast(`${done} photo${done > 1 ? "s" : ""} ajoutée${done > 1 ? "s" : ""} au site`);
      return;
    }
    if (t.dataset.mediaCaption) {
      try { await S.api.update("media", t.dataset.mediaCaption, { caption: t.value.trim() || null });
        S.media.find((m) => m.id === t.dataset.mediaCaption).caption = t.value.trim() || null; toast("Légende enregistrée"); }
      catch (err) { toast(errMsg(err)); }
      return;
    }
    if (t.dataset.mediaVisible) {
      try { await S.api.update("media", t.dataset.mediaVisible, { visible: t.checked });
        S.media.find((m) => m.id === t.dataset.mediaVisible).visible = t.checked; refreshGallery(); toast(t.checked ? "Photo affichée" : "Photo masquée"); }
      catch (err) { toast(errMsg(err)); }
    }
  }
  async function moveMedia(id, dir) {
    const list = [...S.media].sort((a, b) => a.position - b.position);
    const i = list.findIndex((m) => m.id === id), j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    try {
      await Promise.all(list.map((m, k) => m.position === k ? null : S.api.update("media", m.id, { position: k })));
      list.forEach((m, k) => { m.position = k; });
      S.media = list;
      refreshGallery();
    } catch (err) { toast(errMsg(err)); }
  }
  async function saveSite(e) {
    e.preventDefault();
    const v = (id) => (document.getElementById(id).value || "").trim();
    const lines = (id) => v(id).split("\n").map((x) => x.trim()).filter(Boolean);
    const hex = (id, fb) => /^#[0-9a-f]{6}$/i.test(v(id)) ? v(id).toUpperCase() : fb;
    const theme = {
      ...(S.site.theme || {}), logo_text: v("t-logo") || S.coach.display_name.toUpperCase(),
      primary: hex("t-primary-hex", "#0E2A52"), accent: hex("t-accent-hex", "#E4F55B"),
      font_display: v("t-fdisp"), font_body: v("t-fbody"),
      logo_url: v("img-logo_url") || null, hero_image: v("img-hero_image") || null, hero_image_2: v("img-hero_image_2") || null, portrait_image: v("img-portrait_image") || null,
    };
    const wa = v("c-wa").replace(/[^0-9]/g, "");
    const insta = v("c-insta");
    if (insta && !/^https:\/\//.test(insta)) return toast("Le lien Instagram doit commencer par https://");
    const content = {
      ...(S.site.content || {}),
      hero_title: v("c-hero"), hero_subtitle: v("c-sub"), intro_title: v("c-introt"), intro: v("c-intro"), bio: v("c-bio"), philosophy: v("c-philo"),
      diplomas: lines("c-dipl"), achievements: lines("c-ach"), specialties: lines("c-spec"),
      stats: [0, 1, 2].map((i) => ({ value: v("st-v" + i), label: v("st-l" + i) })).filter((s) => s.value),
      phone: v("c-phone") || null, email: v("c-email") || null, whatsapp: wa || null, instagram: insta || null,
      legal_name: v("c-legal") || null, siret: v("c-siret") || null, conditions_extra: v("c-cond") || null, seo_title: v("c-seot"), seo_description: v("c-seod"),
    };
    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "Enregistrement…";
    try { S.site = await S.api.saveSiteContent(S.coach.id, { theme, content }); toast("Site mis à jour"); }
    catch (err) { toast(errMsg(err)); }
    btn.disabled = false; btn.textContent = "Enregistrer";
  }
  function testimonialDrawer(id, confirmDelete) {
    const t = id ? S.testimonials.find((x) => x.id === id) : { author: "", text: "", rating: 5, visible: true };
    openDrawer({
      title: id ? "Modifier le témoignage" : "Nouveau témoignage",
      body: `${confirmDelete ? `<div class="confirm-box">Supprimer ce témoignage ?<div class="btn-row"><button class="btn" data-action="edit-testimonial" data-id="${id}">Non</button>
          <button class="btn btn--dark" data-action="delete-testimonial" data-id="${id}">Oui, supprimer</button></div></div>` : ""}
        <div class="form-grid"><label class="field full"><span>Auteur</span><input type="text" id="te-author" maxlength="60" value="${esc(t.author)}" placeholder="Camille, joueuse P250"></label>
        <label class="field full"><span>Témoignage</span><textarea id="te-text" maxlength="400">${esc(t.text)}</textarea></label>
        <label class="field"><span>Note</span><select id="te-rating">${[5, 4, 3].map((n) => `<option value="${n}" ${t.rating === n ? "selected" : ""}>${"★".repeat(n)}</option>`).join("")}<option value="" ${!t.rating ? "selected" : ""}>Sans note</option></select></label>
        <label class="switch"><span><b>Afficher sur le site</b></span><input type="checkbox" id="te-visible" ${t.visible ? "checked" : ""}></label></div>
        <p class="muted" style="margin:0;font-size:13px">Publiez uniquement de vrais retours de joueurs, avec leur accord.</p>`,
      foot: `<button class="btn btn--primary" data-action="save-testimonial" data-id="${id || ""}">Enregistrer</button>${id ? `<button class="btn btn--danger" data-action="ask-delete-testimonial" data-id="${id}">Supprimer</button>` : ""}`,
    });
  }
  async function saveTestimonial(id) {
    const author = document.getElementById("te-author").value.trim(), text = document.getElementById("te-text").value.trim();
    if (!author || !text) return toast("Indiquez l'auteur et le texte.");
    const row = { author, text, rating: +document.getElementById("te-rating").value || null, visible: document.getElementById("te-visible").checked };
    try {
      if (id) S.testimonials[S.testimonials.findIndex((x) => x.id === id)] = await S.api.update("testimonials", id, row);
      else S.testimonials.push(await S.api.insert("testimonials", { ...row, coach_id: S.coach.id, position: S.testimonials.length }));
      closeDrawer(); toast("Témoignage enregistré"); render();
    } catch (e) { toast(errMsg(e)); }
  }

  // ============================================================ réglages ===
  function viewSettings() {
    const c = S.coach;
    const sel = (id, opts, val, fmt) => `<select id="${id}">${opts.map((o) => `<option value="${o}" ${String(o) === String(val) ? "selected" : ""}>${fmt(o)}</option>`).join("")}</select>`;
    const ical = S.api.icalUrl(c);
    const siteUrl = new URL(`../index.html?c=${encodeURIComponent(c.slug)}`, location.href).href;
    return `<div class="page__head"><div><h1>Réglages</h1><p>Règles de réservation, notifications et agenda.</p></div></div>
      <div class="grid grid--2">
        <section class="card"><h2>Règles de réservation</h2><form id="rules-form">
          <label class="switch"><span><b>Délai de prévenance</b><small>Réservation en ligne au plus tard… avant la séance</small></span>${sel("s-notice", [0, 1, 2, 3, 6, 12, 24, 48], c.min_notice_hours, (h) => h ? `${h} h` : "Aucun")}</label>
          <label class="switch"><span><b>Ouverture des réservations</b><small>Jusqu'à combien de jours à l'avance</small></span>${sel("s-adv", [7, 14, 21, 30, 45, 60, 90], c.max_advance_days, (d) => `${d} jours`)}</label>
          <label class="switch"><span><b>Annulation gratuite</b><small>Le joueur peut annuler en ligne jusqu'à…</small></span>${sel("s-cancel", [0, 2, 6, 12, 24, 48, 72], c.cancel_hours, (h) => h ? `${h} h avant` : "Jusqu'au début")}</label>
          <label class="switch"><span><b>Validation automatique</b><small>Décochez pour accepter chaque demande vous-même</small></span><input type="checkbox" id="s-auto" ${c.auto_confirm ? "checked" : ""}></label>
          <label class="switch"><span><b>Temps entre deux séances</b><small>Pour changer de terrain ou souffler</small></span>${sel("s-buffer", [0, 5, 10, 15, 30], c.buffer_minutes, (m) => m ? `${m} min` : "Aucun")}</label>
          <label class="switch"><span><b>Intervalle des créneaux</b><small>Heures de début proposées</small></span>${sel("s-step", [15, 30, 60], c.slot_step_minutes, (m) => m === 60 ? "Toutes les heures" : `Toutes les ${m} min`)}</label>
          <label class="switch"><span><b>Séances maximum par jour</b><small>Au-delà, la journée affiche complet</small></span>${sel("s-max", ["", 2, 3, 4, 5, 6, 8, 10], c.max_bookings_per_day || "", (n) => n ? `${n}` : "Illimité")}</label>
          <div style="margin-top:14px"><button class="btn btn--primary" type="submit">Enregistrer les règles</button></div>
        </form></section>
        <div class="grid">
          <section class="card"><h2>Notifications</h2><form id="notif-form" class="grid" style="gap:10px">
            <label class="field"><span>Email qui reçoit les nouvelles réservations</span><input type="email" id="s-notify" value="${esc(c.notify_email || "")}"></label>
            <p class="muted" style="margin:0;font-size:13px">Vos joueurs reçoivent automatiquement : confirmation avec fichier agenda, rappel la veille, et un email si vous déplacez ou annulez.</p>
            <div><button class="btn" type="submit">Enregistrer</button></div></form></section>
          <section class="card"><h2>Synchroniser mon agenda</h2>
            <p class="muted" style="margin:0 0 10px">Retrouvez vos séances dans Google Agenda ou le Calendrier de l'iPhone, mises à jour automatiquement.</p>
            ${ical ? `<div class="field"><span>Lien privé (ne le partagez pas)</span><input type="text" id="ical-url" readonly value="${esc(ical)}"></div>
              <div class="btn-row" style="margin-top:8px"><button class="btn btn--sm" data-action="copy" data-target="ical-url">Copier le lien</button></div>
              <details style="margin-top:10px"><summary style="cursor:pointer;font-weight:700">Comment l'ajouter ?</summary>
              <p style="margin:8px 0 0;font-size:14px"><b>Google Agenda</b> (sur ordinateur) : Autres agendas, +, À partir de l'URL, collez le lien.<br>
              <b>iPhone</b> : Réglages, Calendrier, Comptes, Ajouter un compte, Autre, Ajouter un calendrier avec abonnement, collez le lien.</p></details>`
              : `<p class="muted">Lien disponible une fois le service d'agenda activé par Pierre Créa Web.</p>`}
          </section>
          <section class="card"><h2>Mon site</h2>
            <div class="field"><span>Adresse de votre site</span><input type="text" id="site-url" readonly value="${esc(c.custom_domain ? "https://" + c.custom_domain : siteUrl)}"></div>
            <div class="btn-row" style="margin-top:8px"><button class="btn btn--sm" data-action="copy" data-target="site-url">Copier</button>
            ${pill(c.status === "live" ? "confirmed" : "pending", c.status === "live" ? "En ligne" : c.status === "draft" ? "Brouillon" : "Suspendu")}</div></section>
          ${S.isAdmin ? `<section class="card" style="border-color:var(--accent)"><h2>Plateforme PCW <small>visible par l'équipe PCW seulement</small></h2>
            <div class="switch"><span><b>Statut de ce site</b><small>${c.status === "live" ? "Visible et ouvert aux réservations" : "Invisible du public tant qu'il n'est pas en ligne"}</small></span>
              ${c.status === "live" ? `<button type="button" class="btn btn--sm" data-action="set-status" data-status="draft">Repasser en brouillon</button>`
                : `<button type="button" class="btn btn--sm btn--primary" data-action="set-status" data-status="live">Mettre en ligne</button>`}</div>
            <form id="new-coach-form" class="form-grid" style="margin-top:12px">
              <p class="full muted" style="margin:0;font-size:13px">Nouveau client : son site est créé en brouillon à partir du modèle (textes, couleurs, prestations, règles), puis il reçoit un email pour choisir son mot de passe.</p>
              <label class="field"><span>Nom du coach</span><input type="text" id="nc-name" maxlength="60" placeholder="Emma Roux"></label>
              <label class="field"><span>Ville</span><input type="text" id="nc-city" maxlength="60" placeholder="Albi"></label>
              <label class="field"><span>Adresse du site</span><input type="text" id="nc-slug" maxlength="40" placeholder="emma-roux" autocapitalize="off"></label>
              <label class="field"><span>Email du coach</span><input type="email" id="nc-email" placeholder="emma@exemple.fr"></label>
              <div class="full"><button type="submit" class="btn btn--dark">Créer le coach</button></div>
            </form></section>` : ""}
          <section class="card"><h2>Compte</h2><p class="muted" style="margin:0 0 10px">Connecté avec ${esc(S.user.email || "")}</p>
            <div class="btn-row">${S.api.mode !== "demo" ? `<button class="btn" data-action="change-password">Changer de mot de passe</button>` : `<button class="btn" data-action="reset-demo">Réinitialiser la démo</button>`}
            <button class="btn btn--danger" data-action="sign-out">Se déconnecter</button></div></section>
        </div>
      </div>`;
  }
  AFTER.reglages = (page) => {
    page.querySelector("#rules-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const g = (id) => page.querySelector("#" + id).value;
      const patch = { min_notice_hours: +g("s-notice"), max_advance_days: +g("s-adv"), cancel_hours: +g("s-cancel"),
        auto_confirm: page.querySelector("#s-auto").checked, buffer_minutes: +g("s-buffer"), slot_step_minutes: +g("s-step"),
        max_bookings_per_day: g("s-max") ? +g("s-max") : null };
      try { Object.assign(S.coach, await S.api.updateCoach(S.coach.id, patch)); toast("Règles enregistrées"); }
      catch (err) { toast(errMsg(err)); }
    });
    const nc = page.querySelector("#new-coach-form");
    if (nc) {
      const name = nc.querySelector("#nc-name"), slug = nc.querySelector("#nc-slug");
      name.addEventListener("input", () => {
        if (slug.dataset.touched) return;
        slug.value = name.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
      });
      slug.addEventListener("input", () => { slug.dataset.touched = "1"; });
      nc.addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = nc.querySelector("button[type=submit]");
        btn.disabled = true; btn.textContent = "Création…";
        try {
          const r = await S.api.createCoach({ display_name: name.value.trim(), city: nc.querySelector("#nc-city").value.trim(),
            slug: slug.value.trim(), email: nc.querySelector("#nc-email").value.trim() });
          S.coaches = await S.api.myCoaches();
          toast(r.invited ? "Coach créé, invitation envoyée" : "Coach créé en brouillon");
          await selectCoach(r.coach_id);
          location.hash = "mon-site";
        } catch (err) { toast(errMsg(err)); btn.disabled = false; btn.textContent = "Créer le coach"; }
      });
    }
    page.querySelector("#notif-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const v = page.querySelector("#s-notify").value.trim().toLowerCase();
      if (v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return toast("Email invalide.");
      try { Object.assign(S.coach, await S.api.updateCoach(S.coach.id, { notify_email: v || null })); toast("Email enregistré"); }
      catch (err) { toast(errMsg(err)); }
    });
  };

  // ================================================== actions (délégation) ===
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); toast("Copié"); }
    catch { toast("Sélectionnez le texte puis copiez-le."); }
  }
  const ACTIONS = {
    "sign-out": async () => { await S.api.signOut(); S.user = null; S.coach = null; closeDrawer(); render(); },
    "reset-demo": async () => { S.api.reset(); await afterSignIn(); toast("Démo réinitialisée"); },
    "magic-link": async () => {
      const email = (document.getElementById("l-email") || {}).value || "";
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return renderLogin("Indiquez d'abord votre email.");
      try { await S.api.sendMagicLink(email.trim()); renderLogin("Lien envoyé : ouvrez l'email reçu sur cet appareil.", "ok"); }
      catch (e) { renderLogin(errMsg(e)); }
    },
    forgot: async () => {
      const email = (document.getElementById("l-email") || {}).value || "";
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return renderLogin("Indiquez d'abord votre email.");
      try { await S.api.resetPassword(email.trim()); renderLogin("Email envoyé : suivez le lien pour choisir un nouveau mot de passe.", "ok"); }
      catch (e) { renderLogin(errMsg(e)); }
    },
    "change-password": () => { S.recovery = true; render(); },
    more: () => openDrawer({
      title: "Plus",
      body: `<div class="sheet-menu">
        <a href="#messages">${icon("mail")} Messages${S.messages.some((m) => m.status === "new") ? ` <span class="badge" style="margin-left:auto">${S.messages.filter((m) => m.status === "new").length}</span>` : ""}</a>
        <a href="#prestations">${icon("tag")} Prestations et lieux</a><a href="#mon-site">${icon("brush")} Mon site</a><a href="#reglages">${icon("gear")} Réglages</a>
        <a href="../index.html?c=${encodeURIComponent(S.coach.slug)}" target="_blank" rel="noopener">${icon("ext")} Voir mon site</a>
        <button type="button" data-action="sign-out">${icon("out")} Se déconnecter</button></div>`,
    }),
    "new-booking": (el) => newBookingDrawer({ player_id: el.dataset.playerId }),
    "create-booking": (el) => createBookingFromDrawer(el),
    confirm: async (el) => { await patchBooking(el.dataset.id, { status: "confirmed" }, "Réservation validée, le joueur est prévenu"); closeDrawer(); render(); },
    refuse: (el) => bookingDrawer(el.dataset.id, { confirmCancel: true }),
    "ask-cancel": (el) => bookingDrawer(el.dataset.id, { confirmCancel: true }),
    cancel: async (el) => { await patchBooking(el.dataset.id, { status: "cancelled", cancelled_by: "coach" }, "Séance annulée, le joueur est prévenu"); closeDrawer(); render(); },
    pay: async (el) => { await patchBooking(el.dataset.id, { payment_status: el.dataset.pay, ...(el.dataset.pay === "paid" ? { status: "completed" } : {}) }, el.dataset.pay === "paid" ? "Marquée payée" : "Marquée non payée"); render(); bookingDrawer(el.dataset.id); },
    "no-show": async (el) => { await patchBooking(el.dataset.id, { status: "no_show" }, "Absence notée"); render(); bookingDrawer(el.dataset.id); },
    "undo-no-show": async (el) => { await patchBooking(el.dataset.id, { status: "completed" }, "Séance marquée terminée"); render(); bookingDrawer(el.dataset.id); },
    "save-notes": async (el) => { await patchBooking(el.dataset.id, { coach_notes: document.getElementById("b-notes").value.trim() || null }, "Notes enregistrées"); },
    move: (el) => moveZone(el.dataset.id),
    "do-move": async (el) => {
      const b = S.bookings.find((x) => x.id === el.dataset.id);
      const d = document.getElementById("mv-date").value, t = document.getElementById("mv-time").value;
      if (!d || !t) return toast("Choisissez une date et une heure.");
      const start = P.zonedToUtc(d, t, tz());
      const end = new Date(start.getTime() + minutes(b) * 6e4);
      try { await patchBooking(b.id, { starts_at: start.toISOString(), ends_at: end.toISOString() }, "Séance déplacée, le joueur est prévenu"); closeDrawer(); render(); }
      catch { /* message déjà affiché */ }
    },
    week: (el) => { const d = +el.dataset.delta; S.ui.weekStart = d === 0 ? P.mondayOf(todayYmd()) : P.addDays(S.ui.weekStart, d); render(); },
    "del-rule": async (el) => { try { await S.api.remove("availability_rules", el.dataset.id); S.rules = S.rules.filter((r) => r.id !== el.dataset.id); toast("Plage supprimée"); render(); } catch (e) { toast(errMsg(e)); } },
    "del-off": async (el) => { try { await S.api.remove("time_off", el.dataset.id); S.timeOff = S.timeOff.filter((r) => r.id !== el.dataset.id); toast("Absence supprimée"); render(); } catch (e) { toast(errMsg(e)); } },
    "edit-service": (el) => serviceDrawer(el.dataset.id),
    "save-service": (el) => saveService(el.dataset.id),
    "ask-delete-service": (el) => serviceDrawer(el.dataset.id, true),
    "delete-service": async (el) => { try { await S.api.remove("services", el.dataset.id); S.services = S.services.filter((s) => s.id !== el.dataset.id); closeDrawer(); toast("Prestation supprimée"); render(); } catch (e) { toast(errMsg(e)); } },
    "move-service": (el) => moveService(el.dataset.id, +el.dataset.dir),
    "edit-location": (el) => locationDrawer(el.dataset.id),
    "save-location": (el) => saveLocation(el.dataset.id),
    "ask-delete-location": (el) => locationDrawer(el.dataset.id, true),
    "delete-location": async (el) => { try { await S.api.remove("locations", el.dataset.id); S.locations = S.locations.filter((l) => l.id !== el.dataset.id); closeDrawer(); toast("Lieu supprimé"); render(); } catch (e) { toast(errMsg(e)); } },
    "edit-player": (el) => playerDrawer(el.dataset.id),
    "save-player": (el) => savePlayer(el.dataset.id),
    "ask-delete-player": (el) => playerDrawer(el.dataset.id, true),
    "delete-player": async (el) => {
      try { await S.api.remove("players", el.dataset.id); S.players = S.players.filter((p) => p.id !== el.dataset.id);
        S.bookings = S.bookings.map((b) => b.player_id === el.dataset.id ? { ...b, player_id: null, player: null } : b); closeDrawer(); toast("Fiche supprimée"); render(); }
      catch (e) { toast(errMsg(e)); }
    },
    "export-csv": exportCsv,
    "msg-status": async (el) => {
      try {
        await S.api.update("contact_messages", el.dataset.id, { status: el.dataset.status });
        S.messages.find((m) => m.id === el.dataset.id).status = el.dataset.status;
        closeDrawer(); render();
        toast({ archived: "Message archivé", new: "Marqué non lu", read: "Remis dans la boîte de réception" }[el.dataset.status]);
      } catch (e) { toast(errMsg(e)); }
    },
    "msg-ask-delete": (el) => messageDrawer(el.dataset.id, true),
    "msg-delete": async (el) => {
      try { await S.api.remove("contact_messages", el.dataset.id); S.messages = S.messages.filter((m) => m.id !== el.dataset.id); closeDrawer(); render(); toast("Message supprimé"); }
      catch (e) { toast(errMsg(e)); }
    },
    "media-move": (el) => moveMedia(el.dataset.id, +el.dataset.dir),
    "media-ask-delete": (el) => refreshGallery(el.dataset.id),
    "media-cancel": () => refreshGallery(),
    "media-delete": async (el) => {
      try { await S.api.remove("media", el.dataset.id); S.media = S.media.filter((m) => m.id !== el.dataset.id); refreshGallery(); toast("Photo supprimée"); }
      catch (e) { toast(errMsg(e)); }
    },
    "set-status": async (el) => {
      try {
        Object.assign(S.coach, await S.api.updateCoach(S.coach.id, { status: el.dataset.status }));
        toast(el.dataset.status === "live" ? "Site en ligne" : "Site repassé en brouillon"); render();
      } catch (e) { toast(errMsg(e)); }
    },
    "copy-csv": () => copyText(document.getElementById("csv-text").value),
    "edit-testimonial": (el) => testimonialDrawer(el.dataset.id),
    "save-testimonial": (el) => saveTestimonial(el.dataset.id),
    "ask-delete-testimonial": (el) => testimonialDrawer(el.dataset.id, true),
    "delete-testimonial": async (el) => { try { await S.api.remove("testimonials", el.dataset.id); S.testimonials = S.testimonials.filter((t) => t.id !== el.dataset.id); closeDrawer(); toast("Témoignage supprimé"); render(); } catch (e) { toast(errMsg(e)); } },
    copy: (el) => copyText(document.getElementById(el.dataset.target).value),
    "copy-site": () => copyText(new URL(`../index.html?c=${encodeURIComponent(S.coach.slug)}`, location.href).href),
  };

  document.addEventListener("click", async (e) => {
    const t = e.target.closest("[data-action], [data-booking], [data-player], [data-res-filter], [data-filter], [data-message], [data-msg-filter]");
    if (!t) return;
    if (t.dataset.filter) { S.ui.resFilter = t.dataset.filter; return; }
    if (t.dataset.resFilter) { S.ui.resFilter = t.dataset.resFilter; render(); return; }
    if (t.dataset.msgFilter) { S.ui.msgFilter = t.dataset.msgFilter; render(); return; }
    if (t.dataset.message && !t.dataset.action) { messageDrawer(t.dataset.message); return; }
    if (t.dataset.booking && !t.dataset.action) { bookingDrawer(t.dataset.booking); return; }
    if (t.dataset.player && !t.dataset.action) { playerDrawer(t.dataset.player); return; }
    const fn = ACTIONS[t.dataset.action];
    if (fn) { e.preventDefault(); try { await fn(t); } catch (err) { console.error(err); } }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.matches("tr[data-player]")) playerDrawer(e.target.dataset.player);
  });

  // ============================================================ démarrage ===
  (async function boot() {
    try {
      S.api = await P.backend();
    } catch (e) {
      app.innerHTML = `<div class="boot"><div class="alert alert--err">${esc(errMsg(e))}</div></div>`;
      return;
    }
    // Lien "mot de passe oublié" : Supabase ouvre la page avec une session de récupération.
    S.api.onAuthChange((evt, user) => {
      if (evt === "PASSWORD_RECOVERY") { S.recovery = true; S.user = user; render(); }
    });
    await afterSignIn();
    if ("serviceWorker" in navigator && location.protocol === "https:" && S.api.mode !== "demo") {
      navigator.serviceWorker.register("sw.js").catch(() => { /* facultatif */ });
    }
  })();
})();
