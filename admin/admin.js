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
    reviews: [], busy: [], calImport: null, allBookings: null, allLoadedAt: 0,
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
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z"/>',
    share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5"/>',
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
    S.reviews = await S.api.list("reviews", id, "created_at").catch(() => []);
    await reloadCalendar();
    S.allBookings = null;
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
    statistiques: { label: "Statistiques", short: "Stats", icon: "chart", render: viewStats },
    avis: { label: "Avis", icon: "star", render: viewReviews },
    partager: { label: "Partager ma page", short: "Partager", icon: "share", render: viewShare },
    messages: { label: "Messages", icon: "mail", render: viewMessages },
    prestations: { label: "Prestations et lieux", short: "Prestations", icon: "tag", render: viewServices },
    "mon-site": { label: "Mon site", icon: "brush", render: viewSite },
    reglages: { label: "Réglages", icon: "gear", render: viewSettings },
  };
  // Menu groupé dans l'ordre d'usage : le quotidien d'abord, puis le suivi de l'activité,
  // puis la vitrine (site et partage), enfin les réglages.
  const NAV_GROUPS = [
    { title: null, keys: ["dashboard"] },
    { title: "Au quotidien", keys: ["reservations", "agenda", "messages", "joueurs"] },
    { title: "Mon activité", keys: ["statistiques", "avis"] },
    { title: "Ma vitrine", keys: ["partager", "mon-site", "prestations"] },
    { title: "Compte", keys: ["reglages"] },
  ];
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
    const siteUrl = `../index.html?c=${encodeURIComponent(S.coach.slug)}`;
    const tab = (k) => `<a class="tab" href="#${k}" ${v === k ? 'aria-current="page"' : ""}>${icon(VIEWS[k].icon)}<span>${VIEWS[k].short || VIEWS[k].label}</span>${badgeFor(k)}</a>`;
    const inMore = !["dashboard", "reservations", "agenda", "messages"].includes(v);
    app.innerHTML = `<div class="shell">
      <aside class="side">
        <div class="side__brand"><span class="dot"></span><span>${esc(S.coach.display_name.toUpperCase())}</span></div>
        ${S.coaches.length > 1 ? `<select class="coach-switch" id="coach-switch" aria-label="Changer de coach">${S.coaches.map((c) =>
          `<option value="${c.id}" ${c.id === S.coach.id ? "selected" : ""}>${esc(c.display_name)}</option>`).join("")}</select>` : ""}
        <nav aria-label="Menu">${NAV_GROUPS.map((g) => `${g.title ? `<span class="nav-group">${g.title}</span>` : ""}${g.keys.map(navItem).join("")}`).join("")}</nav>
        <div class="side__foot">
          <a href="${siteUrl}" target="_blank" rel="noopener">Voir mon site ↗</a>
          <button type="button" data-action="sign-out">Se déconnecter</button>
        </div>
      </aside>
      <main class="main"><div class="page" id="page"></div></main>
      <nav class="tabbar" aria-label="Menu">
        ${tab("dashboard")}${tab("reservations")}
        <a class="tab tab--center" href="#agenda" ${v === "agenda" ? 'aria-current="page"' : ""}><span class="tab__bubble">${icon(VIEWS.agenda.icon)}</span><span>Agenda</span></a>
        ${tab("messages")}
        <button type="button" class="tab" data-action="more" ${inMore ? 'aria-current="page"' : ""}>${icon("more")}<span>Plus</span></button>
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
          ${(() => { const r = ratingSummary(); return `<a class="card score-mini" href="#avis"><span class="kpi__label">Ma note de coaching</span>
            <span class="score-mini__row"><b class="num">${r.label}</b><span class="muted">/ 5</span>${r.count ? stars(r.avg, 16) : ""}</span>
            <span class="muted" style="font-size:13px">${r.count ? `${r.count} avis vérifiés` : "Pas encore d'avis"}${S.reviews.some((x) => !x.reply && x.rating <= 3 && x.status === "published") ? " · un avis attend votre réponse" : ""}</span></a>`; })()}
          <section class="card"><h2>Partager ma page</h2>
            <p class="muted" style="margin:0 0 12px">Envoyez votre lien de réservation à vos élèves ou affichez votre QR code au club.</p>
            <div class="btn-row"><a class="btn btn--primary" href="#partager">${icon("share")} Partager</a>
            <button type="button" class="btn" data-action="copy-booking-link">Copier le lien</button>
            <a class="btn" href="../index.html?c=${encodeURIComponent(S.coach.slug)}" target="_blank" rel="noopener">${icon("ext")} Voir mon site</a></div>
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
      const busy = S.busy.filter((o) => +new Date(o.starts_at) < dayEnd && +new Date(o.ends_at) > dayStart).map((o) => {
        const s = Math.max(+new Date(o.starts_at), dayStart), e = Math.min(+new Date(o.ends_at), dayEnd);
        const ps = P.tzParts(new Date(s), tz()), pe = P.tzParts(new Date(e), tz());
        const top = Math.max(0, y(ps.h, ps.mi)), bottom = e >= dayEnd ? y(h1, 0) : y(pe.h, pe.mi);
        return `<div class="cal__busy" style="top:${top}px;height:${Math.max(18, Math.min(bottom, y(h1, 0)) - top)}px" title="Rendez-vous de votre agenda Google">Occupé · Google</div>`;
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
      return `<div class="cal__col" data-day="${d}">${avail}${offs}${busy}${evs}${nowLine}</div>`;
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
        ${S.calImport && S.calImport.ics_url ? `<span><i class="legend-busy"></i>Agenda Google</span>` : `<span><a href="#reglages" data-action="goto-google">Connecter Google Agenda</a></span>`}
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
            <span class="row__main"><span class="row__title">${esc(l.name)}</span><span class="row__sub">${esc(l.address || "Adresse non renseignée")}</span><span class="row__sub">Rétrocession : ${esc(retroLabel(l))}</span></span>
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
        <label class="field full"><span>Lien Google Maps <small>(facultatif)</small></span><input type="url" id="lo-maps" value="${esc(l.maps_url || "")}" placeholder="https://maps.app.goo.gl/…"></label>
        <fieldset class="full retro-box"><legend>Rétrocession au club</legend>
          <p class="muted" style="margin:0 0 10px;font-size:13px">Ce que le club vous facture pour ses terrains. Sert au calcul de vos statistiques, jamais affiché aux élèves.</p>
          <div class="form-grid">
          <label class="field"><span>Mode</span><select id="lo-rmode">${Object.entries(RETRO).map(([k, v]) => `<option value="${k}" ${(l.retro_mode || "none") === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
          <label class="field" id="lo-rval-wrap" ${(l.retro_mode || "none") === "none" ? "hidden" : ""}><span id="lo-rval-label">Montant</span>
            <input type="number" id="lo-rval" min="0" step="0.5" inputmode="decimal" value="${esc(l.retro_value || "")}"></label></div></fieldset></div>`,
      onMount: (el) => {
        const sel = el.querySelector("#lo-rmode"), wrap = el.querySelector("#lo-rval-wrap"), lab = el.querySelector("#lo-rval-label");
        const upd = () => { wrap.hidden = sel.value === "none"; lab.textContent = { percent: "Pourcentage (%)", per_hour: "Montant par heure (€)", per_session: "Montant par séance (€)", monthly: "Forfait par mois (€)" }[sel.value] || "Montant"; };
        sel.addEventListener("change", upd); upd();
      },
      foot: `<button class="btn btn--primary" data-action="save-location" data-id="${id || ""}">Enregistrer</button>${id ? `<button class="btn btn--danger" data-action="ask-delete-location" data-id="${id}">Supprimer</button>` : ""}`,
    });
  }
  async function saveLocation(id) {
    const name = document.getElementById("lo-name").value.trim();
    if (!name) return toast("Indiquez le nom du lieu.");
    const maps = document.getElementById("lo-maps").value.trim();
    if (maps && !/^https:\/\//.test(maps)) return toast("Le lien Maps doit commencer par https://");
    const rmode = document.getElementById("lo-rmode").value, rval = rmode === "none" ? 0 : Number(String(document.getElementById("lo-rval").value).replace(",", "."));
    if (rmode !== "none" && (!(rval >= 0) || !isFinite(rval))) return toast("Indiquez le montant de la rétrocession.");
    if (rmode === "percent" && rval > 100) return toast("Le pourcentage ne peut pas dépasser 100.");
    const row = { name, address: document.getElementById("lo-addr").value.trim() || null, maps_url: maps || null, retro_mode: rmode, retro_value: rval };
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
          ${calendarCard()}
          <section class="card"><h2>Mon site</h2>
            <div class="field"><span>Adresse de votre site</span><input type="text" id="site-url" readonly value="${esc(c.custom_domain ? "https://" + c.custom_domain : siteUrl)}"></div>
            <div class="btn-row" style="margin-top:8px"><button class="btn btn--sm" data-action="copy" data-target="site-url">Copier</button>
            ${pill(c.status === "live" ? "confirmed" : "pending", c.status === "live" ? "En ligne" : c.status === "draft" ? "Brouillon" : "Suspendu")}</div></section>
          <section class="card" id="pcw-avis"><h2>Votre avis sur PCW Padel Coach</h2><p class="muted" style="margin:0">Chargement…</p></section>
          ${S.isAdmin ? `<section class="card" id="pcw-avis-admin" style="border-color:var(--accent)"><h2>Avis des coachs <small>visible par l'équipe PCW seulement</small></h2><p class="muted" style="margin:0">Chargement…</p></section>` : ""}
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
    bindCalForm(page);
    loadTestimonial(page);
    if (S.isAdmin) loadTestimonialsAdmin(page);
    if (S.ui.scrollGoogle) { S.ui.scrollGoogle = false; const g = page.querySelector("#google"); if (g) g.scrollIntoView({ block: "start" }); }
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

  // ============================================= avis du coach sur PCW ===
  // Le coach écrit son avis sur le service ; il est publié sur pcwpadel.fr après validation par l'équipe PCW.
  const T_STATUS = {
    pending: ["pending", "En attente de validation", "L'équipe PCW le relit avant de le publier sur pcwpadel.fr, en général sous 48 h."],
    published: ["confirmed", "Publié sur pcwpadel.fr", "Merci ! Votre avis aide d'autres coachs à se lancer."],
    rejected: ["cancelled", "Non publié", ""],
  };
  const shortName = (n) => { const w = String(n || "").trim().split(/\s+/); return w.length > 1 ? `${w[0]} ${w[w.length - 1][0].toUpperCase()}.` : w[0] || ""; };
  async function loadTestimonial(page) {
    const box = page.querySelector("#pcw-avis");
    if (!box) return;
    try { S.testimonial = await S.api.getTestimonial(S.coach.id); } catch (e) { S.testimonial = null; }
    renderTestimonial(box);
  }
  function renderTestimonial(box, editing) {
    const t = S.testimonial, c = S.coach;
    const hasPortrait = Boolean(S.site && S.site.theme && S.site.theme.portrait_image);
    const head = `<h2>Votre avis sur PCW Padel Coach</h2>`;
    if (t && !editing) {
      const [cls, label, help] = T_STATUS[t.status] || T_STATUS.pending;
      box.innerHTML = `${head}
        <div class="t-preview">${stars(t.rating, 18)}<blockquote>${esc(t.body)}</blockquote>
          <p class="muted" style="margin:0;font-size:13px"><b style="color:var(--ink)">${esc(t.author_name)}</b>${t.author_role ? ` · ${esc(t.author_role)}` : ""}${t.place ? ` · ${esc(t.place)}` : ""}</p></div>
        <div class="btn-row" style="margin:12px 0 6px;align-items:center">${pill(cls, label)}</div>
        ${help ? `<p class="muted" style="margin:0 0 10px;font-size:13px">${help}</p>` : ""}
        ${t.status === "rejected" && t.admin_note ? `<p class="alert alert--err" style="margin:0 0 10px">${esc(t.admin_note)}</p>` : ""}
        <div class="btn-row"><button type="button" class="btn btn--sm" data-action="t-edit">Modifier</button>
          <button type="button" class="btn btn--sm btn--danger" data-action="t-delete">Retirer mon avis</button></div>`;
      return;
    }
    const v = t || { rating: 0, body: "", author_name: shortName(c.display_name), author_role: "Coach de padel", place: c.city || "", show_photo: false };
    box.innerHTML = `${head}
      <p class="muted" style="margin:0 0 12px;font-size:14px">${t ? "Une modification repasse en validation avant d'être publiée." : "Racontez en quelques lignes ce que l'outil a changé pour vous. Après validation par l'équipe PCW, votre avis apparaît sur pcwpadel.fr pour aider d'autres coachs à se décider."}</p>
      <form id="t-form" class="grid" style="gap:12px">
        <div class="t-rate" role="radiogroup" aria-label="Votre note sur 5">${[1, 2, 3, 4, 5].map((n) =>
          `<label><input type="radio" name="t-rating" value="${n}" ${v.rating === n ? "checked" : ""}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"/></svg><span class="sr">${n} sur 5</span></label>`).join("")}</div>
        <label class="field"><span>Votre avis</span><textarea id="t-body" rows="4" maxlength="600" placeholder="Ex. : mes élèves réservent seuls, je ne passe plus mes soirées à répondre aux messages…">${esc(v.body)}</textarea>
          <small class="muted" style="text-align:right"><span id="t-count">${v.body.length}</span> / 600</small></label>
        <div class="form-grid">
          <label class="field"><span>Nom affiché</span><input type="text" id="t-name" maxlength="60" value="${esc(v.author_name)}"></label>
          <label class="field"><span>Activité</span><input type="text" id="t-role" maxlength="60" value="${esc(v.author_role || "")}"></label>
          <label class="field full"><span>Ville et club</span><input type="text" id="t-place" maxlength="80" value="${esc(v.place || "")}" placeholder="Toulouse · Padel Club Garonne"></label>
        </div>
        ${hasPortrait ? `<label class="switch"><span><b>Afficher ma photo</b><small>Celle du portrait de votre site</small></span><input type="checkbox" id="t-photo" ${v.show_photo ? "checked" : ""}></label>` : ""}
        <label class="t-consent"><input type="checkbox" id="t-consent" ${t ? "checked" : ""}><span>J'accepte que cet avis soit publié sur pcwpadel.fr avec ce nom${hasPortrait ? " (et ma photo si je l'ai cochée)" : ""}. Je peux le retirer à tout moment.</span></label>
        <div class="btn-row"><button type="submit" class="btn btn--primary">${t ? "Envoyer la modification" : "Envoyer mon avis"}</button>
          ${t ? `<button type="button" class="btn" data-action="t-cancel">Annuler</button>` : ""}</div>
      </form>`;
    const form = box.querySelector("#t-form");
    const body = form.querySelector("#t-body");
    body.addEventListener("input", () => { form.querySelector("#t-count").textContent = body.value.length; });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const r = form.querySelector('input[name="t-rating"]:checked');
      if (!r) return toast("Choisissez une note de 1 à 5 étoiles.");
      if (!form.querySelector("#t-consent").checked) return toast("Cochez l'accord de publication pour envoyer votre avis.");
      const btn = form.querySelector("button[type=submit]");
      btn.disabled = true;
      try {
        S.testimonial = await S.api.saveTestimonial(S.coach.id, {
          rating: +r.value, body: body.value.trim(), author_name: form.querySelector("#t-name").value.trim(),
          author_role: form.querySelector("#t-role").value.trim(), place: form.querySelector("#t-place").value.trim(),
          show_photo: Boolean(form.querySelector("#t-photo") && form.querySelector("#t-photo").checked),
        });
        toast("Merci ! Votre avis est envoyé pour validation");
        renderTestimonial(box);
        const adm = document.getElementById("pcw-avis-admin");
        if (adm) loadTestimonialsAdmin(document);
      } catch (err) { toast(errMsg(err)); btn.disabled = false; }
    });
  }
  async function loadTestimonialsAdmin(page) {
    const box = page.querySelector("#pcw-avis-admin");
    if (!box) return;
    let list = [];
    try { list = await S.api.listTestimonials(); } catch (e) { box.innerHTML = `<h2>Avis des coachs</h2><p class="muted">${esc(errMsg(e))}</p>`; return; }
    const order = { pending: 0, published: 1, rejected: 2 };
    list.sort((a, b) => order[a.status] - order[b.status] || String(b.updated_at).localeCompare(String(a.updated_at)));
    const waiting = list.filter((t) => t.status === "pending").length;
    box.innerHTML = `<h2>Avis des coachs <small>${waiting ? `${waiting} à valider` : "visible par l'équipe PCW seulement"}</small></h2>
      ${list.length ? list.map((t) => {
        const [cls, label] = T_STATUS[t.status] || T_STATUS.pending;
        return `<div class="t-admin">
          <div class="t-admin__head"><b>${esc((t.coach && t.coach.display_name) || "")}</b>${pill(cls, label)}</div>
          ${stars(t.rating, 15)}<blockquote>${esc(t.body)}</blockquote>
          <p class="muted" style="margin:0 0 8px;font-size:13px">Affiché : ${esc(t.author_name)}${t.author_role ? ` · ${esc(t.author_role)}` : ""}${t.place ? ` · ${esc(t.place)}` : ""}${t.show_photo ? " · avec photo" : ""}</p>
          ${t.status !== "rejected" ? `<input type="text" class="t-note" id="t-note-${t.id}" maxlength="300" placeholder="Raison si vous refusez (visible par le coach, facultatif)">` : ""}
          <div class="btn-row">${t.status !== "published" ? `<button type="button" class="btn btn--sm btn--primary" data-action="t-moderate" data-id="${t.id}" data-status="published">Publier</button>` : ""}
            ${t.status !== "rejected" ? `<button type="button" class="btn btn--sm" data-action="t-moderate" data-id="${t.id}" data-status="rejected">${t.status === "published" ? "Retirer" : "Refuser"}</button>` : ""}</div>
        </div>`;
      }).join("") : `<p class="muted" style="margin:0">Aucun avis de coach pour l'instant.</p>`}`;
  }

  // ============================================================ partager ===
  // Lien de la page de réservation du coach : son domaine s'il en a un, sinon le site modèle.
  function bookingUrl() {
    const c = S.coach;
    if (c.custom_domain) return `https://${c.custom_domain}/#reserver`;
    return new URL(`../?c=${encodeURIComponent(c.slug)}#reserver`, location.href).href;
  }
  const brandColor = () => {
    const p = S.site && S.site.theme && S.site.theme.primary;
    // QR lisible : couleur foncée uniquement (sinon noir).
    return P.hexToRgb(p) && P.readableOn(p) === "#FFFFFF" ? p : "#0F1B30";
  };
  const SHARE_TEMPLATES = {
    presentation: (n, url) => `Bonjour ! Vous pouvez maintenant réserver vos cours de padel avec moi directement en ligne, 24 h/24 : choisissez votre séance et votre créneau en 1 minute.\n${url}\nÀ bientôt sur le terrain ! ${n}`,
    creneaux: (n, url) => `Il me reste des créneaux de coaching cette semaine. Réservez le vôtre ici, c'est confirmé tout de suite :\n${url}`,
    apres: (n, url) => `Merci pour la séance ! Pour réserver la prochaine, tout se passe ici :\n${url}\nVotre avis m'aide beaucoup si vous avez une minute pour le laisser après la séance.`,
  };
  function qrSvg(text, color, size = 240) {
    const qr = window.qrcode(0, "M");
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount(), q = 4, total = n + q * 2;
    let d = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + q} ${r + q}h1v1h-1z`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${size}" height="${size}" shape-rendering="crispEdges" role="img" aria-label="QR code vers votre page de réservation">
      <rect width="${total}" height="${total}" fill="#FFFFFF"/><path d="${d}" fill="${esc(color)}"/></svg>`;
  }
  function qrCanvas(text, color, px) {
    const qr = window.qrcode(0, "M");
    qr.addData(text); qr.make();
    const n = qr.getModuleCount(), q = 4, cell = Math.floor(px / (n + q * 2));
    const cv = document.createElement("canvas");
    cv.width = cv.height = cell * (n + q * 2);
    const g = cv.getContext("2d");
    g.fillStyle = "#FFFFFF"; g.fillRect(0, 0, cv.width, cv.height);
    g.fillStyle = color;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) g.fillRect((c + q) * cell, (r + q) * cell, cell, cell);
    return cv;
  }
  function viewShare() {
    const url = bookingUrl(), name = S.coach.display_name;
    const tpl = S.ui.shareTpl || "presentation";
    const msg = S.ui.shareMsg != null ? S.ui.shareMsg : SHARE_TEMPLATES[tpl](name.split(" ")[0], url);
    return `<div class="page__head"><div><h1>Partager ma page</h1><p>Envoyez votre lien de réservation à vos élèves, ou affichez votre QR code au club.</p></div></div>
      <div class="grid grid--main">
        <div class="grid">
          <section class="card"><h2>Mon lien de réservation</h2>
            <div class="share-link"><input type="text" id="share-url" readonly value="${esc(url)}" aria-label="Lien de réservation">
              <button type="button" class="btn" data-action="copy" data-target="share-url">Copier</button></div>
          </section>
          <section class="card"><h2>Message à envoyer</h2>
            <div class="seg" role="group" aria-label="Modèle de message" style="margin-bottom:10px">
              <button type="button" data-action="share-tpl" data-tpl="presentation" aria-pressed="${tpl === "presentation"}">Présentation</button>
              <button type="button" data-action="share-tpl" data-tpl="creneaux" aria-pressed="${tpl === "creneaux"}">Créneaux libres</button>
              <button type="button" data-action="share-tpl" data-tpl="apres" aria-pressed="${tpl === "apres"}">Après une séance</button></div>
            <label class="field"><span>Modifiable avant l'envoi</span><textarea id="share-msg" rows="5">${esc(msg)}</textarea></label>
            <div class="share-actions">
              ${navigator.share ? `<button type="button" class="btn btn--primary" data-action="share-native">Partager…</button>` : ""}
              <button type="button" class="btn share-wa" data-action="share-wa">WhatsApp</button>
              <button type="button" class="btn" data-action="share-sms">SMS</button>
              <button type="button" class="btn" data-action="share-mail">Email</button>
              <button type="button" class="btn" data-action="share-copy-msg">Copier le message</button>
            </div>
            <p class="muted" style="margin:10px 0 0;font-size:13px">Astuce : mettez le lien dans la bio de votre Instagram et dans votre statut WhatsApp.</p>
          </section>
        </div>
        <section class="card share-qr"><h2>QR code</h2>
          <div class="share-qr__code" id="share-qr">${window.qrcode ? qrSvg(url, brandColor()) : ""}</div>
          <p class="muted" style="margin:0;font-size:13px;text-align:center">Vos élèves le scannent avec l'appareil photo de leur téléphone et arrivent directement sur la réservation.</p>
          <div class="btn-row" style="justify-content:center">
            <button type="button" class="btn btn--dark" data-action="qr-png">Télécharger le QR code</button>
            <button type="button" class="btn" data-action="story-png">Image pour story Instagram</button>
            <button type="button" class="btn" data-action="poster-print">Imprimer une affiche</button>
          </div>
        </section>
      </div>`;
  }
  AFTER.partager = (page) => {
    const ta = page.querySelector("#share-msg");
    ta.addEventListener("input", () => { S.ui.shareMsg = ta.value; });
  };
  const shareText = () => (document.getElementById("share-msg") || {}).value || bookingUrl();
  async function saveBlob(blob, filename, shareTitle) {
    const file = new File([blob], filename, { type: blob.type });
    if (navigator.canShare && navigator.canShare({ files: [file] }) && window.matchMedia("(pointer: coarse)").matches) {
      try { await navigator.share({ files: [file], title: shareTitle }); return; } catch (e) { if (e && e.name === "AbortError") return; }
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast("Image enregistrée");
  }
  function wrapText(g, text, maxW) {
    const words = text.split(" "), lines = [];
    let line = "";
    for (const w of words) { const t = line ? line + " " + w : w; if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
    if (line) lines.push(line);
    return lines;
  }
  async function storyImage() {
    const th = (S.site && S.site.theme) || {};
    const bg = P.hexToRgb(th.primary) ? th.primary : "#0E2A52", accent = P.hexToRgb(th.accent) ? th.accent : "#E4F55B";
    const on = P.readableOn(bg);
    const W = 1080, H = 1920, cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const g = cv.getContext("2d");
    try { await document.fonts.ready; } catch { /* polices facultatives */ }
    const disp = `"${th.font_display || "Archivo"}", "Arial Narrow", sans-serif`, body = `"${th.font_body || "Hanken Grotesk"}", sans-serif`;
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    // Lignes de court en fond.
    g.strokeStyle = on === "#FFFFFF" ? "rgba(255,255,255,.12)" : "rgba(0,0,0,.08)"; g.lineWidth = 6;
    g.strokeRect(90, 120, W - 180, H - 240); g.beginPath(); g.moveTo(90, H / 2); g.lineTo(W - 90, H / 2); g.moveTo(W / 2, 120); g.lineTo(W / 2, H - 120); g.stroke();
    g.fillStyle = accent; g.beginPath(); g.arc(W / 2, 300, 46, 0, Math.PI * 2); g.fill();
    g.textAlign = "center"; g.fillStyle = on;
    g.font = `800 52px ${body}`; g.fillText((th.logo_text || S.coach.display_name).toUpperCase(), W / 2, 450);
    g.font = `900 112px ${disp}`; g.fillStyle = accent;
    wrapText(g, "RÉSERVEZ VOTRE COURS", W - 200).forEach((l, i) => g.fillText(l, W / 2, 620 + i * 118));
    const qr = qrCanvas(bookingUrl(), "#0F1B30", 620);
    const box = qr.width + 60, bx = (W - box) / 2, by = 900;
    g.fillStyle = "#FFFFFF"; g.beginPath(); g.roundRect ? g.roundRect(bx, by, box, box, 36) : g.rect(bx, by, box, box); g.fill();
    g.drawImage(qr, bx + 30, by + 30);
    g.fillStyle = on; g.font = `700 46px ${body}`;
    g.fillText("Scannez ou touchez le lien", W / 2, by + box + 110);
    g.font = `500 36px ${body}`; g.globalAlpha = .8;
    g.fillText(bookingUrl().replace(/^https:\/\//, "").replace(/#reserver$/, ""), W / 2, by + box + 170);
    g.globalAlpha = 1;
    return new Promise((res) => cv.toBlob(res, "image/png"));
  }
  function printPoster() {
    let area = document.getElementById("print-area");
    if (!area) { area = document.createElement("div"); area.id = "print-area"; document.body.appendChild(area); }
    const th = (S.site && S.site.theme) || {};
    area.innerHTML = `<div class="poster" style="--p:${esc(brandColor())};--a:${esc(P.hexToRgb(th.accent) ? th.accent : "#E4F55B")}">
      <div class="poster__brand">${esc((th.logo_text || S.coach.display_name).toUpperCase())}</div>
      <h1>Réservez votre cours de padel</h1>
      <p class="poster__sub">En ligne, 24 h/24, confirmation immédiate</p>
      <div class="poster__qr">${qrSvg(bookingUrl(), "#0F1B30", 420)}</div>
      <p class="poster__how">Scannez avec l'appareil photo de votre téléphone</p>
      <p class="poster__url">${esc(bookingUrl().replace(/^https:\/\//, "").replace(/#reserver$/, ""))}</p></div>`;
    document.body.classList.add("printing");
    const done = () => { document.body.classList.remove("printing"); window.removeEventListener("afterprint", done); };
    window.addEventListener("afterprint", done);
    setTimeout(() => window.print(), 50);
  }

  // ================================================================ avis ===
  const stars = (n, size = 16) => `<span class="stars" style="--s:${size}px" role="img" aria-label="${n} sur 5">${[1, 2, 3, 4, 5].map((i) =>
    `<svg viewBox="0 0 24 24" aria-hidden="true" class="${i <= Math.round(n) ? "on" : ""}"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"/></svg>`).join("")}</span>`;
  const published = () => S.reviews.filter((r) => r.status === "published");
  function ratingSummary() {
    const list = published();
    const avg = list.length ? list.reduce((a, r) => a + r.rating, 0) / list.length : null;
    return { avg, count: list.length, label: avg == null ? "–" : (Math.round(avg * 10) / 10).toLocaleString("fr-FR", { minimumFractionDigits: 1 }) };
  }
  function viewReviews() {
    const sum = ratingSummary(), list = [...S.reviews].sort((a, b) => b.created_at.localeCompare(a.created_at));
    const f = S.ui.revFilter || "all";
    const shown = list.filter((r) => f === "all" ? true : f === "noreply" ? !r.reply && r.status === "published" : f === "low" ? r.rating <= 3 : f === "reported" ? !!r.reported_at : true);
    const dist = [5, 4, 3, 2, 1].map((n) => ({ n, c: published().filter((r) => r.rating === n).length }));
    const max = Math.max(1, ...dist.map((d) => d.c));
    const limit = S.ui.revLimit || 10;
    return `<div class="page__head"><div><h1>Avis des élèves</h1><p>Avis vérifiés : seuls les élèves qui ont eu une séance avec vous peuvent noter.</p></div></div>
      <div class="grid grid--main reviews-layout">
        <div class="grid">
          <div class="toolbar" style="margin:0"><div class="seg" role="group" aria-label="Filtrer les avis">
            <button type="button" data-action="rev-filter" data-f="all" aria-pressed="${f === "all"}">Tous</button>
            <button type="button" data-action="rev-filter" data-f="noreply" aria-pressed="${f === "noreply"}">Sans réponse</button>
            <button type="button" data-action="rev-filter" data-f="low" aria-pressed="${f === "low"}">3 étoiles ou moins</button>
            <button type="button" data-action="rev-filter" data-f="reported" aria-pressed="${f === "reported"}">Signalés</button></div></div>
          ${shown.length ? shown.slice(0, limit).map(reviewCard).join("") + (shown.length > limit ? `<button type="button" class="btn btn--block" data-action="rev-more">Voir ${Math.min(10, shown.length - limit)} avis de plus (${shown.length - limit} restants)</button>` : "") : `<section class="card"><div class="empty">${S.reviews.length ? "Aucun avis dans ce filtre." : "Vos premiers avis arriveront après vos prochaines séances : chaque élève reçoit un email 2 h après la fin de sa séance."}</div></section>`}
        </div>
        <div class="grid">
          <section class="card score-card"><h2>Ma note de coaching</h2>
            <div class="score"><span class="score__value num">${sum.label}</span><span class="score__max">/ 5</span></div>
            ${sum.count ? stars(sum.avg, 22) : ""}
            <p class="muted" style="margin:6px 0 14px">${sum.count ? `${sum.count} avis vérifié${sum.count > 1 ? "s" : ""}, depuis le début` : "Pas encore d'avis"}</p>
            <div class="dist">${dist.map((d) => `<div class="dist__row"><span>${d.n} ★</span><span class="dist__bar"><i style="width:${Math.round(d.c / max * 100)}%"></i></span><span class="num">${d.c}</span></div>`).join("")}</div>
          </section>
          <section class="card"><h2>Demande d'avis</h2>
            <label class="switch"><span><b>Envoyer une demande après chaque séance</b><small>Email à l'élève 2 h après la fin de la séance, avec 5 boutons pour noter en un geste</small></span>
              <input type="checkbox" id="rev-requests" ${S.coach.review_requests !== false ? "checked" : ""}></label>
            ${S.api.mode === "demo" ? (() => { const b = (S.bookings || []).filter((x) => x.status === "completed" && x.review_token && !S.reviews.some((r) => r.booking_id === x.id)).pop();
              return b ? `<a class="btn btn--sm" style="margin-top:12px" href="../review.html?t=${encodeURIComponent(b.review_token)}&c=${encodeURIComponent(S.coach.slug)}&n=5" target="_blank" rel="noopener">${icon("ext")} Voir la page de notation (démo)</a>` : ""; })() : ""}
            <p class="muted" style="margin:12px 0 0;font-size:13px">Vous pouvez répondre publiquement à chaque avis. Un avis abusif (faux élève, insultes) se signale à Pierre Créa Web, qui vérifie et peut le retirer. Les avis ne peuvent pas être supprimés par le coach : c'est ce qui rend votre note crédible.</p>
          </section>
        </div>
      </div>`;
  }
  function reviewCard(r) {
    const admin = S.isAdmin && S.api.mode !== "demo";
    return `<article class="card review ${r.status === "removed" ? "review--removed" : ""}">
      <header class="review__head">${stars(r.rating)}<b>${esc(r.author_name)}</b>
        <span class="muted">${esc(r.service_name || "")}${r.session_date ? " · " + esc(P.fmtYmd(r.session_date)) : ""}</span>
        ${r.reported_at ? pill("pending", "Signalé à PCW") : ""}${r.status === "removed" ? pill("cancelled", "Retiré") : ""}</header>
      ${r.comment ? `<p class="review__text">${esc(r.comment)}</p>` : `<p class="review__text muted">Note sans commentaire.</p>`}
      ${r.reply ? `<div class="review__reply"><b>Votre réponse</b><p>${esc(r.reply)}</p></div>` : ""}
      <div class="btn-row">
        <button type="button" class="btn btn--sm" data-action="review-reply" data-id="${r.id}">${r.reply ? "Modifier ma réponse" : "Répondre"}</button>
        ${r.reported_at ? "" : `<button type="button" class="btn btn--sm btn--danger" data-action="review-report" data-id="${r.id}">Signaler</button>`}
        ${admin && r.status === "published" ? `<button type="button" class="btn btn--sm btn--dark" data-action="review-remove" data-id="${r.id}">Retirer (équipe PCW)</button>` : ""}
      </div></article>`;
  }
  AFTER.avis = (page) => {
    const cb = page.querySelector("#rev-requests");
    cb.addEventListener("change", async () => {
      try { Object.assign(S.coach, await S.api.updateCoach(S.coach.id, { review_requests: cb.checked })); toast(cb.checked ? "Demandes d'avis activées" : "Demandes d'avis désactivées"); }
      catch (e) { toast(errMsg(e)); cb.checked = !cb.checked; }
    });
  };
  function replyDrawer(id) {
    const r = S.reviews.find((x) => x.id === id);
    openDrawer({
      title: "Répondre à l'avis",
      body: `<div class="review__quote">${stars(r.rating)} <b>${esc(r.author_name)}</b>${r.comment ? `<p>${esc(r.comment)}</p>` : ""}</div>
        <label class="field"><span>Votre réponse, visible sur votre site</span><textarea id="rv-reply" rows="5" maxlength="1000" placeholder="Merci pour votre retour…">${esc(r.reply || "")}</textarea></label>
        <p class="muted" style="font-size:13px;margin:0">Une réponse courte et courtoise rassure les futurs élèves, surtout après un avis mitigé.</p>`,
      foot: `<button class="btn btn--primary" data-action="save-reply" data-id="${id}">Publier la réponse</button>${r.reply ? `<button class="btn btn--danger" data-action="save-reply" data-id="${id}" data-clear="1">Retirer ma réponse</button>` : ""}`,
    });
  }
  function reportDrawer(id) {
    const r = S.reviews.find((x) => x.id === id);
    openDrawer({
      title: "Signaler un avis",
      body: `<div class="review__quote">${stars(r.rating)} <b>${esc(r.author_name)}</b>${r.comment ? `<p>${esc(r.comment)}</p>` : ""}</div>
        <label class="field"><span>Pourquoi cet avis est-il abusif ?</span><textarea id="rv-reason" rows="4" maxlength="500" placeholder="Ex. : cet élève n'est jamais venu, propos insultants…"></textarea></label>
        <p class="muted" style="font-size:13px;margin:0">Pierre Créa Web vérifie chaque signalement. Un avis négatif mais honnête reste publié : vous pouvez y répondre.</p>`,
      foot: `<button class="btn btn--dark" data-action="save-report" data-id="${id}">Envoyer le signalement</button>`,
    });
  }

  // ========================================================= statistiques ===
  const RETRO = { none: "Aucune", percent: "% du prix", per_hour: "€ par heure", per_session: "€ par séance", monthly: "Forfait mensuel" };
  function periodRange(kind, anchor) {
    if (kind === "week") { const s = P.mondayOf(anchor); return { from: s, to: P.addDays(s, 7) }; }
    const [y, m] = anchor.split("-").map(Number);
    if (kind === "month") return { from: `${y}-${P.pad(m)}-01`, to: m === 12 ? `${y + 1}-01-01` : `${y}-${P.pad(m + 1)}-01` };
    return { from: `${y}-01-01`, to: `${y + 1}-01-01` };
  }
  function periodLabel(kind, r) {
    if (kind === "year") return r.from.slice(0, 4);
    if (kind === "month") { const [y, m] = r.from.split("-").map(Number); return `${P.cap(P.MONTHS[m - 1])} ${y}`; }
    const end = P.addDays(r.to, -1), [, m1, d1] = r.from.split("-").map(Number), [y2, m2, d2] = end.split("-").map(Number);
    return m1 === m2 ? `Du ${d1} au ${d2} ${P.MONTHS[m2 - 1]} ${y2}` : `Du ${d1} ${P.MONTHS[m1 - 1]} au ${d2} ${P.MONTHS[m2 - 1]} ${y2}`;
  }
  const daysIn = (ymd) => { const [y, m] = ymd.split("-").map(Number); return new Date(Date.UTC(y, m, 0)).getUTCDate(); };
  function ruleMinutes(day) {
    const wd = P.isoWeekday(day);
    const blocks = [...S.timeOff, ...S.busy].map((o) => [+new Date(o.starts_at), +new Date(o.ends_at)]);
    let total = 0;
    for (const r of S.rules.filter((x) => x.weekday === wd)) {
      const a = +P.zonedToUtc(day, r.start_time.slice(0, 5), tz()), b = +P.zonedToUtc(day, r.end_time.slice(0, 5), tz());
      let m = (b - a) / 6e4;
      for (const [s, e] of blocks) { const o = Math.min(b, e) - Math.max(a, s); if (o > 0) m -= o / 6e4; }
      total += Math.max(0, m);
    }
    return total;
  }
  function computeStats(kind, anchor) {
    const r = periodRange(kind, anchor), now = Date.now(), t = todayYmd();
    const all = S.allBookings || [];
    const inP = all.filter((b) => { const d = dayOf(b.starts_at); return d >= r.from && d < r.to; });
    const held = inP.filter((b) => b.status === "completed" || (b.status === "confirmed" && +new Date(b.ends_at) < now));
    const noShow = inP.filter((b) => b.status === "no_show");
    const upcoming = inP.filter((b) => isActive(b) && +new Date(b.ends_at) >= now);
    const revenue = sum(held, (b) => b.price_cents) + sum(noShow.filter((b) => b.payment_status === "paid"), (b) => b.price_cents);
    const paid = sum([...held, ...noShow].filter((b) => b.payment_status === "paid"), (b) => b.price_cents);
    const planned = sum(upcoming, (b) => b.price_cents);

    // Rétrocession au club : par séance ayant occupé un terrain, plus les forfaits mensuels.
    const locOf = (b) => locById(b.location_id) || locById((svcById(b.service_id) || {}).location_id) || null;
    const perClub = new Map();
    const club = (l) => { const k = l ? l.id : "none"; if (!perClub.has(k)) perClub.set(k, { loc: l, sessions: 0, revenue: 0, retro: 0 }); return perClub.get(k); };
    for (const b of [...held, ...noShow]) {
      const l = locOf(b), c = club(l), v = l ? Number(l.retro_value || 0) : 0;
      const earned = b.status === "no_show" && b.payment_status !== "paid" ? 0 : b.price_cents;
      c.sessions++; c.revenue += earned;
      if (!l) continue;
      // % du prix : sur ce que la séance a rapporté ; à l'heure ou à la séance : le terrain était réservé, il est dû.
      if (l.retro_mode === "percent") c.retro += Math.round(earned * v / 100);
      else if (l.retro_mode === "per_hour") c.retro += Math.round(minutes(b) / 60 * v * 100);
      else if (l.retro_mode === "per_session") c.retro += Math.round(v * 100);
    }
    // Forfait mensuel : au prorata des jours de la période déjà commencés (mois en cours compté en entier).
    for (const l of S.locations.filter((x) => x.retro_mode === "monthly" && Number(x.retro_value) > 0)) {
      let share = 0;
      for (let d = r.from; d < r.to && d <= t; d = P.addDays(d, 1)) share += 1 / daysIn(d);
      if (kind === "month" && r.from <= t) share = 1;
      if (kind === "year") { share = 0; for (let m = 1; m <= 12; m++) if (`${r.from.slice(0, 4)}-${P.pad(m)}-01` <= t) share++; }
      club(l).retro += Math.round(Number(l.retro_value) * 100 * share);
    }
    const retro = sum([...perClub.values()], (c) => c.retro);

    // Nouveaux élèves : première séance (non annulée) dans la période.
    const firstOf = new Map();
    for (const b of all) if (b.player_id && b.status !== "cancelled") {
      const d = dayOf(b.starts_at);
      if (!firstOf.has(b.player_id) || d < firstOf.get(b.player_id)) firstOf.set(b.player_id, d);
    }
    const newPlayers = [...firstOf.values()].filter((d) => d >= r.from && d < r.to && d <= t).length;
    const activePlayers = new Set([...held, ...upcoming].map((b) => b.player_id).filter(Boolean)).size;

    // Taux d'occupation : heures réservées / heures ouvertes (disponibilités moins absences et agenda Google).
    let open = 0;
    for (let d = r.from; d < r.to; d = P.addDays(d, 1)) open += ruleMinutes(d);
    const booked = sum(inP.filter((b) => b.status !== "cancelled"), minutes);
    const fill = open ? Math.min(100, Math.round(booked / open * 100)) : 0;

    // Revenu par jour (semaine, mois) ou par mois (année).
    const buckets = [];
    if (kind === "year") for (let m = 1; m <= 12; m++) buckets.push({ key: `${r.from.slice(0, 4)}-${P.pad(m)}`, label: P.MONTHS[m - 1].slice(0, 4).replace(/\.$/, ""), held: 0, planned: 0 });
    else for (let d = r.from; d < r.to; d = P.addDays(d, 1)) buckets.push({ key: d, label: kind === "week" ? P.DAYS_SHORT[P.isoWeekday(d) - 1] : String(+d.slice(8)), held: 0, planned: 0 });
    const bk = (b) => buckets.find((x) => x.key === (kind === "year" ? dayOf(b.starts_at).slice(0, 7) : dayOf(b.starts_at)));
    for (const b of held) { const x = bk(b); if (x) x.held += b.price_cents; }
    for (const b of upcoming) { const x = bk(b); if (x) x.planned += b.price_cents; }

    return { range: r, revenue, paid, toCollect: revenue - paid, planned, retro, perClub: [...perClub.values()],
      sessions: held.length, upcoming: upcoming.length, cancelled: inP.filter((b) => b.status === "cancelled").length, noShow: noShow.length,
      newPlayers, activePlayers, fill, bookedH: booked / 60, openH: open / 60, buckets };
  }
  function revenueChart(st, kind) {
    const narrow = window.innerWidth < 600;
    const W = narrow ? 340 : 640, H = narrow ? 190 : 200, padL = 8, padB = 22, padT = 18;
    const max = Math.max(1, ...st.buckets.map((b) => b.held + b.planned));
    const n = st.buckets.length, slot = (W - padL * 2) / n, bw = Math.max(3, Math.min(34, slot - (n > 20 ? 3 : 8)));
    const y = (v) => H - padB - (v / max) * (H - padB - padT);
    const bars = st.buckets.map((b, i) => {
      const x = padL + i * slot + (slot - bw) / 2;
      const hh = H - padB - y(b.held), hp = (H - padB - y(b.held + b.planned)) - hh;
      const tip = `${kind === "year" ? P.cap(P.MONTHS[i]) : P.fmtYmd(b.key)} : ${euros(b.held)} réalisés${b.planned ? `, ${euros(b.planned)} à venir` : ""}`;
      const showLabel = n <= (narrow ? 7 : 12) || i % (narrow ? 7 : 5) === 0 || i === n - 1;
      return `<g class="chart__col"><title>${esc(tip)}</title>
        <rect x="${x - (slot - bw) / 2}" y="${padT}" width="${slot}" height="${H - padB - padT}" fill="transparent"/>
        ${b.held ? `<rect class="chart__held" x="${x}" y="${y(b.held)}" width="${bw}" height="${Math.max(1, hh)}" rx="${Math.min(4, bw / 2)}"/>` : ""}
        ${b.planned ? `<rect class="chart__planned" x="${x}" y="${y(b.held + b.planned)}" width="${bw}" height="${Math.max(1, hp - (b.held ? 2 : 0))}" rx="${Math.min(4, bw / 2)}"/>` : ""}
        ${showLabel ? `<text x="${x + bw / 2}" y="${H - 6}" text-anchor="middle">${esc(b.label)}</text>` : ""}</g>`;
    }).join("");
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Revenu par ${kind === "year" ? "mois" : "jour"}">
      <line class="chart__grid" x1="${padL}" x2="${W - padL}" y1="${padT}" y2="${padT}"/><text class="chart__max" x="${padL}" y="${padT - 6}">${esc(euros(max))}</text>
      <line class="chart__base" x1="${padL}" x2="${W - padL}" y1="${H - padB}" y2="${H - padB}"/>${bars}</svg>`;
  }
  function viewStats() {
    const kind = S.ui.statsKind || "month", anchor = S.ui.statsAnchor || todayYmd();
    if (!S.allBookings) return `<div class="page__head"><div><h1>Statistiques</h1></div></div><section class="card"><div class="empty">Chargement des statistiques…</div></section>`;
    const st = computeStats(kind, anchor), sum = ratingSummary();
    const isCurrent = st.range.from <= todayYmd() && todayYmd() < st.range.to;
    const net = st.revenue - st.retro;
    const clubs = st.perClub.filter((c) => c.sessions || c.retro).sort((a, b) => b.revenue - a.revenue);
    return `<div class="page__head"><div><h1>Statistiques</h1><p>${esc(periodLabel(kind, st.range))}</p></div>
        <div class="week-nav">
          <div class="seg" role="group" aria-label="Période">
            <button type="button" data-action="stats-kind" data-kind="week" aria-pressed="${kind === "week"}">Cette semaine</button>
            <button type="button" data-action="stats-kind" data-kind="month" aria-pressed="${kind === "month"}">Ce mois</button>
            <button type="button" data-action="stats-kind" data-kind="year" aria-pressed="${kind === "year"}">Cette année</button></div>
          <button class="icon-btn" data-action="stats-move" data-dir="-1" aria-label="Période précédente">${icon("left")}</button>
          <button class="icon-btn" data-action="stats-move" data-dir="1" aria-label="Période suivante" ${isCurrent ? "disabled" : ""}>${icon("right")}</button>
        </div></div>
      <div class="kpis kpis--stats">
        <div class="kpi"><span class="kpi__label">${{ week: "Revenu de la semaine", month: "Revenu du mois", year: "Revenu de l'année" }[kind]}</span>
          <span class="kpi__value num">${euros(st.revenue)}</span>
          <span class="kpi__sub">${euros(st.paid)} encaissés · ${euros(st.toCollect)} à encaisser${st.planned ? ` · ${euros(st.planned)} à venir` : ""}</span></div>
        <div class="kpi"><span class="kpi__label">Rétrocession aux clubs</span><span class="kpi__value num">${euros(st.retro)}</span>
          <span class="kpi__sub">Net pour vous : <b class="num">${euros(net)}</b></span></div>
        <div class="kpi"><span class="kpi__label">Séances de coaching</span><span class="kpi__value num">${st.sessions}</span>
          <span class="kpi__sub">${st.upcoming ? `${st.upcoming} à venir · ` : ""}${st.cancelled} annulée${st.cancelled > 1 ? "s" : ""} · ${st.noShow} absence${st.noShow > 1 ? "s" : ""}</span></div>
        <a class="kpi" href="#avis" style="text-decoration:none;color:inherit"><span class="kpi__label">Note moyenne globale</span>
          <span class="kpi__value num">${sum.label}<small style="font-size:16px;color:var(--muted)"> / 5</small></span>
          <span class="kpi__sub">${sum.count ? `${stars(sum.avg, 13)} ${sum.count} avis, depuis le début` : "Pas encore d'avis"}</span></a>
        <div class="kpi"><span class="kpi__label">Nouveaux élèves</span><span class="kpi__value num">${st.newPlayers}</span>
          <span class="kpi__sub">première séance sur la période · ${st.activePlayers} élève${st.activePlayers > 1 ? "s" : ""} actif${st.activePlayers > 1 ? "s" : ""}</span></div>
        <div class="kpi"><span class="kpi__label">Taux d'occupation</span><span class="kpi__value num">${st.fill} %</span>
          <span class="kpi__sub">${Math.round(st.bookedH).toLocaleString("fr-FR")} h réservées sur ${Math.round(st.openH).toLocaleString("fr-FR")} h ouvertes</span>
          <span class="meter" aria-hidden="true"><i style="width:${st.fill}%"></i></span></div>
      </div>
      <div class="grid grid--main">
        <section class="card"><h2>Revenu par ${kind === "year" ? "mois" : "jour"}
          <span class="chart-legend"><span><i class="chart__held"></i>Réalisé</span>${st.planned ? `<span><i class="chart__planned"></i>À venir</span>` : ""}</span></h2>
          ${st.revenue || st.planned ? revenueChart(st, kind) : `<div class="empty">Aucune séance sur cette période.</div>`}</section>
        <section class="card"><h2>Par club <small>rétrocession due</small></h2>
          ${clubs.length ? `<div class="table-wrap"><table class="table table--stats"><thead><tr><th>Club</th><th class="num">Séances</th><th class="num">Revenu</th><th class="num">Dû au club</th></tr></thead><tbody>
            ${clubs.map((c) => `<tr><td><b>${esc(c.loc ? c.loc.name : "Sans lieu")}</b><br><small class="muted">${c.loc ? esc(retroLabel(c.loc)) : "Pas de rétrocession"}</small></td>
              <td class="num">${c.sessions}</td><td class="num">${euros(c.revenue)}</td><td class="num"><b>${euros(c.retro)}</b></td></tr>`).join("")}
            </tbody></table></div>
            <p class="muted" style="margin:10px 0 0;font-size:13px">Calcul sur les séances terminées et les absences (le terrain était réservé). Réglez le mode de chaque club dans <a href="#prestations">Prestations et lieux</a>.</p>`
            : `<div class="empty">Aucune séance terminée sur cette période.</div>`}</section>
      </div>`;
  }
  const retroLabel = (l) => {
    const v = Number(l.retro_value || 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 });
    return { none: "Pas de rétrocession", percent: `${v} % du prix de la séance`, per_hour: `${v} € par heure`, per_session: `${v} € par séance`, monthly: `Forfait de ${v} € par mois` }[l.retro_mode || "none"];
  };
  AFTER.statistiques = async () => {
    if (S.allBookings && Date.now() - S.allLoadedAt < 60e3) return;
    try {
      S.allBookings = (await S.api.bookings(S.coach.id, {})).map(withPlayer);
      S.allLoadedAt = Date.now();
      if (currentView() === "statistiques") render();
    } catch (e) { toast(errMsg(e)); }
  };

  // ==================================================== agenda Google ===
  function calendarCard() {
    const imp = S.calImport || {};
    const connected = !!imp.ics_url;
    const ago = imp.last_sync_at ? Math.max(0, Math.round((Date.now() - new Date(imp.last_sync_at)) / 6e4)) : null;
    const when = ago == null ? "jamais" : ago < 1 ? "à l'instant" : ago < 60 ? `il y a ${ago} min` : `le ${P.fmtDate(imp.last_sync_at, tz(), "short")} à ${hm(imp.last_sync_at)}`;
    return `<section class="card" id="google"><h2>Agenda Google <small>dans les deux sens</small></h2>
      <h3 class="subhead">1. Mes rendez-vous perso bloquent mes créneaux</h3>
      ${connected && !S.ui.calEdit ? `<div class="sync-status ${imp.last_error ? "sync-status--err" : ""}">
          <b>${imp.last_error ? "Synchronisation en erreur" : "Agenda connecté"}</b>
          <span>${imp.last_error ? esc(imp.last_error) : `${imp.events_count || 0} rendez-vous importé${(imp.events_count || 0) > 1 ? "s" : ""} · mise à jour ${esc(when)}`}</span></div>
        <p class="muted" style="margin:8px 0;font-size:13px">Toutes les 15 minutes, vos rendez-vous Google des prochaines semaines rendent ces horaires indisponibles sur votre site. Seules les heures sont lues : ni titre, ni lieu.</p>
        <div class="btn-row"><button type="button" class="btn btn--sm btn--dark" data-action="cal-sync">Synchroniser maintenant</button>
          <button type="button" class="btn btn--sm" data-action="cal-edit">Changer d'adresse</button>
          <button type="button" class="btn btn--sm btn--danger" data-action="cal-disconnect">Déconnecter</button></div>`
      : `<p class="muted" style="margin:0 0 10px;font-size:14px">Collez l'adresse secrète de votre Google Agenda : vos rendez-vous perso (médecin, famille, tournoi…) ne pourront plus être réservés par un élève.</p>
        ${calForm(S.ui.calEdit ? imp.ics_url || "" : "")}`}
      <h3 class="subhead" style="margin-top:18px">2. Mes séances apparaissent dans Google Agenda</h3>
      ${S.api.icalUrl(S.coach) ? `<div class="field"><span>Lien privé (ne le partagez pas)</span><input type="text" id="ical-url" readonly value="${esc(S.api.icalUrl(S.coach))}"></div>
        <div class="btn-row" style="margin-top:8px"><button class="btn btn--sm" data-action="copy" data-target="ical-url">Copier le lien</button></div>
        <details style="margin-top:10px"><summary style="cursor:pointer;font-weight:700">Comment l'ajouter ?</summary>
        <p style="margin:8px 0 0;font-size:14px"><b>Google Agenda</b> (sur ordinateur) : Autres agendas, +, À partir de l'URL, collez le lien.<br>
        <b>iPhone</b> : Réglages, Calendrier, Comptes, Ajouter un compte, Autre, Ajouter un calendrier avec abonnement, collez le lien.</p></details>`
        : `<p class="muted">Lien disponible une fois le service d'agenda activé par Pierre Créa Web.</p>`}
    </section>`;
  }
  const calForm = (val) => `<form id="cal-form" class="grid" style="gap:10px">
      <label class="field"><span>Adresse secrète au format iCal</span><input type="url" id="cal-url" value="${esc(val)}" placeholder="https://calendar.google.com/calendar/ical/…/basic.ics" autocomplete="off" spellcheck="false"></label>
      <details><summary style="cursor:pointer;font-weight:700">Où la trouver ? (1 minute, sur ordinateur)</summary>
        <ol style="margin:8px 0 0;padding-left:20px;font-size:14px;line-height:1.6">
          <li>Ouvrez <b>calendar.google.com</b>, puis la roue dentée, <b>Paramètres</b>.</li>
          <li>À gauche, sous « Paramètres de mes agendas », cliquez sur votre agenda.</li>
          <li>Descendez jusqu'à <b>Intégrer l'agenda</b> et copiez l'<b>Adresse secrète au format iCal</b>.</li>
          <li>Collez-la ici. Fonctionne aussi avec iCloud et Outlook (lien de publication).</li></ol></details>
      <div class="btn-row"><button type="submit" class="btn btn--primary">Connecter mon agenda</button>
        ${S.calImport && S.calImport.ics_url ? `<button type="button" class="btn" data-action="cal-cancel-edit">Annuler</button>` : ""}</div></form>`;
  function bindCalForm(page) {
    const f = page.querySelector("#cal-form");
    if (!f) return;
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const url = P.normalizeCalendarUrl(f.querySelector("#cal-url").value);
      if (!url) return toast("Adresse non reconnue : copiez l'« adresse secrète au format iCal » de Google Agenda (elle commence par https://calendar.google.com).");
      const btn = f.querySelector("button[type=submit]");
      btn.disabled = true; btn.textContent = "Connexion…";
      try {
        S.calImport = await S.api.saveCalendarImport({ coach_id: S.coach.id, ics_url: url, enabled: true });
        try { await S.api.syncCalendar(S.coach.id); toast("Agenda connecté"); } catch (err) { toast(errMsg(err)); }
        await reloadCalendar(); S.ui.calEdit = false; render();
      } catch (err) { toast(errMsg(err)); btn.disabled = false; btn.textContent = "Connecter mon agenda"; }
    });
  }
  async function reloadCalendar() {
    const [imp, busy] = await Promise.all([S.api.list("calendar_imports", S.coach.id, "coach_id").catch(() => []), S.api.list("external_busy", S.coach.id, "starts_at").catch(() => [])]);
    S.calImport = imp[0] || null; S.busy = busy;
  }

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
    "t-edit": () => renderTestimonial(document.getElementById("pcw-avis"), true),
    "t-cancel": () => renderTestimonial(document.getElementById("pcw-avis")),
    "t-delete": async (el) => {
      if (el.dataset.confirm !== "1") { el.dataset.confirm = "1"; el.textContent = "Confirmer le retrait"; return; }
      try { await S.api.deleteTestimonial(S.coach.id); S.testimonial = null; toast("Avis retiré de pcwpadel.fr"); renderTestimonial(document.getElementById("pcw-avis")); if (S.isAdmin) loadTestimonialsAdmin(document); }
      catch (err) { toast(errMsg(err)); }
    },
    "t-moderate": async (el) => {
      let note = null;
      if (el.dataset.status === "rejected") { const n = document.getElementById(`t-note-${el.dataset.id}`); note = n ? n.value.trim() || null : null; }
      try {
        await S.api.moderateTestimonial(el.dataset.id, el.dataset.status, note);
        toast(el.dataset.status === "published" ? "Avis publié sur pcwpadel.fr" : "Avis non publié");
        loadTestimonialsAdmin(document);
        if (S.testimonial && S.testimonial.id === el.dataset.id) { S.testimonial = await S.api.getTestimonial(S.coach.id); renderTestimonial(document.getElementById("pcw-avis")); }
      } catch (err) { toast(errMsg(err)); }
    },
    more: () => openDrawer({
      title: "Plus",
      body: `<div class="sheet-menu">
        <span class="sheet-menu__group">Au quotidien</span>
        <a href="#joueurs">${icon(VIEWS.joueurs.icon)} Joueurs</a>
        <span class="sheet-menu__group">Mon activité</span>
        <a href="#statistiques">${icon("chart")} Statistiques</a><a href="#avis">${icon("star")} Avis des élèves</a>
        <span class="sheet-menu__group">Ma vitrine</span>
        <a href="#partager">${icon("share")} Partager ma page</a><a href="#mon-site">${icon("brush")} Mon site</a><a href="#prestations">${icon("tag")} Prestations et lieux</a>
        <span class="sheet-menu__group">Compte</span>
        <a href="#reglages">${icon("gear")} Réglages</a>
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
    "copy-booking-link": () => copyText(bookingUrl()),
    // partage
    "share-tpl": (el) => { S.ui.shareTpl = el.dataset.tpl; S.ui.shareMsg = null; render(); },
    "share-native": async () => { try { await navigator.share({ title: `Réserver avec ${S.coach.display_name}`, text: shareText() }); } catch { /* annulé */ } },
    "share-wa": () => { window.open(`https://wa.me/?text=${encodeURIComponent(shareText())}`, "_blank", "noopener"); },
    "share-sms": () => { location.href = `sms:?&body=${encodeURIComponent(shareText())}`; },
    "share-mail": () => { location.href = `mailto:?subject=${encodeURIComponent(`Réservez votre cours de padel avec ${S.coach.display_name}`)}&body=${encodeURIComponent(shareText())}`; },
    "share-copy-msg": () => copyText(shareText()),
    "qr-png": async () => {
      const cv = qrCanvas(bookingUrl(), brandColor(), 1200);
      cv.toBlob((b) => saveBlob(b, `qr-reservation-${S.coach.slug}.png`, "QR code de réservation"), "image/png");
    },
    "story-png": async () => { const b = await storyImage(); await saveBlob(b, `story-reservation-${S.coach.slug}.png`, "Story Instagram"); },
    "poster-print": () => printPoster(),
    // avis
    "rev-filter": (el) => { S.ui.revFilter = el.dataset.f; S.ui.revLimit = 10; render(); },
    "rev-more": () => { S.ui.revLimit = (S.ui.revLimit || 10) + 10; render(); },
    "review-reply": (el) => replyDrawer(el.dataset.id),
    "review-report": (el) => reportDrawer(el.dataset.id),
    "save-reply": async (el) => {
      const text = el.dataset.clear ? "" : document.getElementById("rv-reply").value.trim();
      if (!el.dataset.clear && !text) return toast("Écrivez votre réponse.");
      try { await S.api.replyReview(el.dataset.id, text); Object.assign(S.reviews.find((r) => r.id === el.dataset.id), { reply: text || null, replied_at: text ? new Date().toISOString() : null });
        closeDrawer(); render(); toast(text ? "Réponse publiée sur votre site" : "Réponse retirée"); }
      catch (e) { toast(errMsg(e)); }
    },
    "save-report": async (el) => {
      const reason = document.getElementById("rv-reason").value.trim();
      try { await S.api.reportReview(el.dataset.id, reason); Object.assign(S.reviews.find((r) => r.id === el.dataset.id), { reported_at: new Date().toISOString(), report_reason: reason });
        closeDrawer(); render(); toast("Signalement envoyé à Pierre Créa Web"); }
      catch (e) { toast(errMsg(e)); }
    },
    "review-remove": async (el) => {
      try { await S.api.update("reviews", el.dataset.id, { status: "removed" }); S.reviews.find((r) => r.id === el.dataset.id).status = "removed"; render(); toast("Avis retiré du site"); }
      catch (e) { toast(errMsg(e)); }
    },
    // statistiques
    "stats-kind": (el) => { S.ui.statsKind = el.dataset.kind; S.ui.statsAnchor = todayYmd(); render(); },
    "stats-move": (el) => {
      const kind = S.ui.statsKind || "month", dir = +el.dataset.dir, a = S.ui.statsAnchor || todayYmd();
      const [y, m] = a.split("-").map(Number);
      S.ui.statsAnchor = kind === "week" ? P.addDays(a, 7 * dir) : kind === "month" ? (() => { const d = new Date(Date.UTC(y, m - 1 + dir, 1)); return `${d.getUTCFullYear()}-${P.pad(d.getUTCMonth() + 1)}-01`; })() : `${y + dir}-01-01`;
      render();
    },
    // agenda Google
    "cal-sync": async (el) => {
      el.disabled = true; el.textContent = "Synchronisation…";
      try { const r = await S.api.syncCalendar(S.coach.id); toast(`Agenda à jour : ${r && r.events != null ? r.events : 0} rendez-vous`); }
      catch (e) { toast(errMsg(e)); }
      await reloadCalendar(); render();
    },
    "cal-edit": () => { S.ui.calEdit = true; render(); },
    "cal-cancel-edit": () => { S.ui.calEdit = false; render(); },
    "cal-disconnect": async () => {
      try { S.calImport = await S.api.saveCalendarImport({ coach_id: S.coach.id, ics_url: null, enabled: false });
        if (S.api.mode !== "demo") await S.api.syncCalendar(S.coach.id).catch(() => null);
        await reloadCalendar(); render(); toast("Agenda Google déconnecté"); }
      catch (e) { toast(errMsg(e)); }
    },
    "goto-google": () => { S.ui.scrollGoogle = true; location.hash = "reglages"; },
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
