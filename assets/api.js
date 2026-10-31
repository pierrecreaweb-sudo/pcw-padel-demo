// Accès aux données : Supabase en production, mode démo (navigateur) sinon.
// Les deux implémentations exposent exactement les mêmes méthodes.
(function (root) {
  "use strict";
  const P = root.PCW;
  const CFG = root.PCW_CONFIG || {};

  class ApiError extends Error {
    constructor(message, code) { super(message); this.code = code || "ERROR"; }
  }
  function fromPg(err) {
    if (!err) return null;
    if (err instanceof ApiError) return err;
    if (err.code === "23P01") return new ApiError("Ce créneau chevauche une autre séance. Choisissez un autre horaire.", "SLOT_TAKEN");
    if (err.code === "42501") return new ApiError(err.message || "Action non autorisée.", "FORBIDDEN");
    if (err.code === "23505") return new ApiError("Cet élément existe déjà.", "DUPLICATE");
    if (/Failed to fetch|NetworkError/i.test(err.message || "")) return new ApiError("Connexion impossible. Vérifiez votre réseau et réessayez.", "NETWORK");
    return new ApiError(err.message || "Une erreur est survenue.", err.hint || err.code);
  }

  function currentSlug() {
    const q = new URLSearchParams(root.location ? root.location.search : "").get("c");
    if (q) return q.toLowerCase();
    const host = root.location ? root.location.hostname : "";
    if (CFG.DOMAINS && CFG.DOMAINS[host]) return CFG.DOMAINS[host];
    return CFG.DEFAULT_SLUG || "demo";
  }

  // ======================================================== SUPABASE =======
  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = src; s.onload = res; s.onerror = () => rej(new ApiError("Chargement impossible. Vérifiez votre connexion.", "NETWORK"));
      document.head.appendChild(s);
    });
  }

  async function supabaseBackend() {
    if (!root.supabase) await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js");
    const sb = root.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
    const unwrap = ({ data, error }) => { if (error) throw fromPg(error); return data; };
    const bookingSelect = "*, player:players(*), location:locations(*)";

    return {
      mode: "supabase",
      // ---- public
      getSite: async (slug) => unwrap(await sb.rpc("public_get_site", { p_slug: slug })),
      getSlots: async (slug, serviceId, from, to) =>
        unwrap(await sb.rpc("public_get_slots", { p_slug: slug, p_service_id: serviceId, p_from: from, p_to: to })) || [],
      book: async (slug, b) => unwrap(await sb.rpc("public_book", {
        p_slug: slug, p_service_id: b.service_id, p_starts_at: b.starts_at, p_first_name: b.first_name,
        p_last_name: b.last_name, p_email: b.email, p_phone: b.phone, p_level: b.level || null,
        p_message: b.message || null, p_party_size: b.party_size || 1,
      })),
      getBooking: async (token) => unwrap(await sb.rpc("public_get_booking", { p_token: token })),
      cancelBooking: async (token) => unwrap(await sb.rpc("public_cancel_booking", { p_token: token })),
      sendMessage: async (slug, m) => unwrap(await sb.rpc("public_send_message", {
        p_slug: slug, p_name: m.name, p_email: m.email, p_phone: m.phone || null, p_subject: m.subject || null,
        p_message: m.message, p_website: m.website || null,
      })),

      // ---- authentification coach
      getUser: async () => (await sb.auth.getUser()).data.user || null,
      signIn: async (email, password) => { unwrap(await sb.auth.signInWithPassword({ email, password })); },
      sendMagicLink: async (email) => { unwrap(await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: root.location.href.split("#")[0] } })); },
      resetPassword: async (email) => { unwrap(await sb.auth.resetPasswordForEmail(email, { redirectTo: root.location.href.split("#")[0] })); },
      updatePassword: async (password) => { unwrap(await sb.auth.updateUser({ password })); },
      signOut: async () => { await sb.auth.signOut(); },
      onAuthChange: (cb) => sb.auth.onAuthStateChange((evt, session) => cb(evt, session && session.user)),

      // ---- back-office
      myCoaches: async () => unwrap(await sb.rpc("my_coaches")) || [],
      isPlatformAdmin: async () => Boolean(unwrap(await sb.rpc("is_platform_admin"))),
      createCoach: async (body) => {
        const { data, error } = await sb.functions.invoke("create-coach", { body });
        if (error) {
          let msg = error.message;
          try { msg = (await error.context.json()).error || msg; } catch { /* réponse non JSON */ }
          throw new ApiError(msg, "CREATE_COACH");
        }
        return data;
      },
      updateCoach: async (id, patch) => unwrap(await sb.from("coaches").update(patch).eq("id", id).select().single()),
      getSiteContent: async (coachId) => unwrap(await sb.from("site_content").select("*").eq("coach_id", coachId).single()),
      saveSiteContent: async (coachId, patch) => unwrap(await sb.from("site_content").update(patch).eq("coach_id", coachId).select().single()),
      list: async (table, coachId, order = "position") => {
        let q = sb.from(table).select("*").eq("coach_id", coachId);
        for (const o of String(order).split(",").filter(Boolean)) q = q.order(o.trim());
        return unwrap(await q) || [];
      },
      insert: async (table, row) => unwrap(await sb.from(table).insert(row).select().single()),
      update: async (table, id, patch) => unwrap(await sb.from(table).update(patch).eq("id", id).select().single()),
      remove: async (table, id) => { unwrap(await sb.from(table).delete().eq("id", id)); },
      bookings: async (coachId, { from, to } = {}) => {
        let q = sb.from("bookings").select(bookingSelect).eq("coach_id", coachId).order("starts_at");
        if (from) q = q.gte("starts_at", from);
        if (to) q = q.lt("starts_at", to);
        return unwrap(await q) || [];
      },
      updateBooking: async (id, patch) => unwrap(await sb.from("bookings").update(patch).eq("id", id).select(bookingSelect).single()),
      createBooking: async (row) => unwrap(await sb.from("bookings").insert({ ...row, during: "[2000-01-01,2000-01-02)" }).select(bookingSelect).single()),
      coachSlots: async (coach, serviceId, from, to) =>
        unwrap(await sb.rpc("coach_get_slots", { p_coach_id: coach.id, p_service_id: serviceId, p_from: from, p_to: to })) || [],
      upload: async (coachId, file) => {
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${coachId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        unwrap(await sb.storage.from("coach-media").upload(path, file, { cacheControl: "31536000", upsert: false }));
        return sb.storage.from("coach-media").getPublicUrl(path).data.publicUrl;
      },
      icalUrl: (coach) => CFG.ICAL_FUNCTION_URL ? `${CFG.ICAL_FUNCTION_URL}?token=${coach.ical_token}` : "",
    };
  }

  // ============================================================ DÉMO =======
  const KEY = "pcw-demo-db";
  function demoBackend() {
    const store = P.storage();
    let db;
    function load() {
      let saved = null;
      try { saved = store && JSON.parse(store.getItem(KEY) || "null"); } catch { saved = null; }
      const fresh = root.PCW_DEMO.seed();
      // Les données de démo sont regénérées chaque jour pour rester autour de la date du jour.
      db = saved && saved.version === fresh.version && saved.seededOn === fresh.seededOn ? saved : fresh;
      save();
    }
    function save() {
      try { if (store) store.setItem(KEY, JSON.stringify(db)); return true; }
      catch { return false; /* quota ou stockage bloqué : on garde en mémoire */ }
    }
    load();

    const delay = (v) => new Promise((r) => setTimeout(() => r(v), 120));
    const clone = (v) => JSON.parse(JSON.stringify(v));
    const coachBySlug = (slug) => db.coaches.find((c) => c.slug === slug || c.custom_domain === slug);
    const active = (b) => b.status === "pending" || b.status === "confirmed";
    const joinBooking = (b) => ({ ...b, player: db.players.find((p) => p.id === b.player_id) || null, location: db.locations.find((l) => l.id === b.location_id) || null });
    let session = null;
    try { session = store && JSON.parse(store.getItem(KEY + "-session") || "null"); } catch { session = null; }
    const authListeners = [];

    function slotsFor(coach, serviceId, from, to, coachView) {
      const service = db.services.find((s) => s.id === serviceId && s.coach_id === coach.id);
      return P.computeSlots({
        coach: coachView ? { ...coach, min_notice_hours: 0, max_advance_days: 366 } : coach, service, from, to,
        rules: db.availability_rules.filter((r) => r.coach_id === coach.id),
        timeOff: db.time_off.filter((t) => t.coach_id === coach.id),
        bookings: db.bookings.filter((b) => b.coach_id === coach.id),
      });
    }
    function assertNoOverlap(row, ignoreId) {
      if (!active(row)) return;
      const coach = db.coaches.find((c) => c.id === row.coach_id);
      const buf = (coach.buffer_minutes || 0) * 6e4;
      const s = +new Date(row.starts_at), e = +new Date(row.ends_at) + buf;
      const clash = db.bookings.some((b) => b.id !== ignoreId && b.coach_id === row.coach_id && active(b)
        && P.overlaps(s, e, +new Date(b.starts_at), +new Date(b.ends_at) + buf));
      if (clash) throw new ApiError("Ce créneau chevauche une autre séance. Choisissez un autre horaire.", "SLOT_TAKEN");
    }
    function publicBooking(b) {
      const c = db.coaches.find((x) => x.id === b.coach_id);
      const sc = db.site_content.find((x) => x.coach_id === c.id);
      const p = db.players.find((x) => x.id === b.player_id);
      const l = db.locations.find((x) => x.id === b.location_id);
      return {
        status: b.status, service_name: b.service_name, starts_at: b.starts_at, ends_at: b.ends_at,
        price_cents: b.price_cents, party_size: b.party_size, player_first_name: p ? p.first_name : null,
        location: l ? { name: l.name, address: l.address, maps_url: l.maps_url } : null,
        coach: { slug: c.slug, display_name: c.display_name, timezone: c.timezone, cancel_hours: c.cancel_hours, phone: sc.content.phone, email: sc.content.email },
        can_cancel: active(b) && new Date(b.starts_at) - Date.now() >= c.cancel_hours * 36e5,
      };
    }

    return {
      mode: "demo",
      reset: () => { try { store && store.removeItem(KEY); } catch { /* ignore */ } load(); },
      getSite: async (slug) => {
        const c = coachBySlug(slug);
        if (!c || c.status !== "live") return delay(null);
        const sc = db.site_content.find((x) => x.coach_id === c.id);
        return delay(clone({
          coach: { id: c.id, slug: c.slug, display_name: c.display_name, city: c.city, status: c.status, timezone: c.timezone,
                   min_notice_hours: c.min_notice_hours, max_advance_days: c.max_advance_days, cancel_hours: c.cancel_hours, auto_confirm: c.auto_confirm },
          theme: sc.theme, content: sc.content,
          services: db.services.filter((s) => s.coach_id === c.id && s.active).sort((a, b) => a.position - b.position),
          locations: db.locations.filter((l) => l.coach_id === c.id).sort((a, b) => a.position - b.position),
          testimonials: db.testimonials.filter((t) => t.coach_id === c.id && t.visible).sort((a, b) => a.position - b.position),
          gallery: (db.media || []).filter((m) => m.coach_id === c.id && m.visible).sort((a, b) => a.position - b.position)
            .slice(0, 60).map((m) => ({ id: m.id, url: m.url, caption: m.caption })),
        }));
      },
      getSlots: async (slug, serviceId, from, to) => {
        const c = coachBySlug(slug);
        return delay(c ? slotsFor(c, serviceId, from, to) : []);
      },
      book: async (slug, b) => {
        const c = coachBySlug(slug);
        if (!c || c.status !== "live") throw new ApiError("Ce site ne prend pas de réservation pour le moment.", "SITE_CLOSED");
        const s = db.services.find((x) => x.id === b.service_id && x.coach_id === c.id && x.active);
        if (!s) throw new ApiError("Cette prestation n'est plus disponible.", "SERVICE_UNAVAILABLE");
        const email = String(b.email || "").trim().toLowerCase();
        if (!String(b.first_name || "").trim()) throw new ApiError("Indiquez votre prénom.", "INVALID_INPUT");
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new ApiError("Adresse email invalide.", "INVALID_INPUT");
        if (!/^\+?[0-9]{9,15}$/.test(String(b.phone || "").replace(/[^0-9+]/g, ""))) throw new ApiError("Numéro de téléphone invalide.", "INVALID_INPUT");
        const party = b.party_size || 1;
        if (party < 1 || party > s.capacity) throw new ApiError(`Nombre de joueurs invalide pour cette prestation (maximum ${s.capacity}).`, "INVALID_INPUT");
        const day = P.localYmd(new Date(b.starts_at), c.timezone);
        const slot = slotsFor(c, s.id, day, day).find((x) => x.starts_at === new Date(b.starts_at).toISOString());
        if (!slot) throw new ApiError("Ce créneau vient d'être pris ou n'est plus disponible. Choisissez-en un autre.", "SLOT_TAKEN");
        let p = db.players.find((x) => x.coach_id === c.id && (x.email || "").toLowerCase() === email);
        if (!p) {
          p = { id: P.uuid(), coach_id: c.id, email, notes: null, created_at: new Date().toISOString() };
          db.players.push(p);
        }
        Object.assign(p, { first_name: b.first_name.trim(), last_name: (b.last_name || "").trim(), phone: b.phone.trim(), level: b.level || p.level || null });
        const row = {
          id: P.uuid(), coach_id: c.id, service_id: s.id, player_id: p.id, location_id: slot.location_id, service_name: s.name,
          starts_at: slot.starts_at, ends_at: slot.ends_at, status: c.auto_confirm ? "confirmed" : "pending", payment_status: "unpaid",
          price_cents: s.price_cents, party_size: party, player_message: (b.message || "").trim() || null, coach_notes: null,
          source: "online", cancel_token: P.uuid(), cancelled_by: null, created_at: new Date().toISOString(),
        };
        db.bookings.push(row);
        save();
        return delay({ booking_id: row.id, token: row.cancel_token, status: row.status, starts_at: row.starts_at, ends_at: row.ends_at });
      },
      getBooking: async (token) => {
        const b = db.bookings.find((x) => x.cancel_token === token);
        return delay(b ? publicBooking(b) : null);
      },
      cancelBooking: async (token) => {
        const b = db.bookings.find((x) => x.cancel_token === token);
        if (!b) throw new ApiError("Réservation introuvable.", "NOT_FOUND");
        if (!active(b)) throw new ApiError("Cette réservation est déjà annulée ou terminée.", "NOT_CANCELLABLE");
        const c = db.coaches.find((x) => x.id === b.coach_id);
        if (new Date(b.starts_at) - Date.now() < c.cancel_hours * 36e5)
          throw new ApiError(`L'annulation en ligne n'est plus possible à moins de ${c.cancel_hours} h de la séance. Contactez votre coach.`, "TOO_LATE");
        Object.assign(b, { status: "cancelled", cancelled_by: "player" });
        save();
        return delay(publicBooking(b));
      },

      sendMessage: async (slug, m) => {
        const c = coachBySlug(slug);
        if (!c || c.status !== "live") throw new ApiError("Ce site ne reçoit pas de message pour le moment.", "SITE_CLOSED");
        if (String(m.website || "").trim()) return delay({ ok: true });
        const name = String(m.name || "").trim(), email = String(m.email || "").trim().toLowerCase(), msg = String(m.message || "").trim();
        if (!name) throw new ApiError("Indiquez votre nom.", "INVALID_INPUT");
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new ApiError("Adresse email invalide.", "INVALID_INPUT");
        if (msg.length < 5) throw new ApiError("Votre message est trop court.", "INVALID_INPUT");
        if (msg.length > 2000) throw new ApiError("Message trop long (2000 caractères maximum).", "INVALID_INPUT");
        db.contact_messages = db.contact_messages || [];
        const recent = db.contact_messages.filter((x) => x.coach_id === c.id && x.email === email && Date.now() - new Date(x.created_at) < 36e5);
        if (recent.length >= 3) throw new ApiError("Trop de messages envoyés. Réessayez dans une heure ou contactez le coach par téléphone.", "TOO_MANY");
        db.contact_messages.push({ id: P.uuid(), coach_id: c.id, name, email, phone: String(m.phone || "").trim() || null,
          subject: String(m.subject || "").trim() || null, message: msg, status: "new", created_at: new Date().toISOString() });
        save();
        return delay({ ok: true });
      },

      // ---- authentification (démo : tout identifiant est accepté)
      getUser: async () => delay(session),
      signIn: async (email) => {
        session = { id: "demo-user", email: email || "coach@exemple.fr" };
        try { store && store.setItem(KEY + "-session", JSON.stringify(session)); } catch { /* ignore */ }
        authListeners.forEach((cb) => cb("SIGNED_IN", session));
        return delay();
      },
      sendMagicLink: async () => delay(),
      resetPassword: async () => delay(),
      updatePassword: async () => delay(),
      signOut: async () => {
        session = null;
        try { store && store.removeItem(KEY + "-session"); } catch { /* ignore */ }
        authListeners.forEach((cb) => cb("SIGNED_OUT", null));
      },
      onAuthChange: (cb) => { authListeners.push(cb); },

      // ---- back-office
      myCoaches: async () => delay(clone(db.coaches)),
      isPlatformAdmin: async () => delay(true),
      createCoach: async ({ slug, display_name, city, email }) => {
        slug = String(slug || "").trim().toLowerCase();
        if (!/^[a-z0-9]([a-z0-9-]{1,38}[a-z0-9])$/.test(slug)) throw new ApiError("Adresse invalide : 3 à 40 caractères, lettres minuscules, chiffres et tirets.", "INVALID_INPUT");
        if (!String(display_name || "").trim()) throw new ApiError("Nom du coach obligatoire.", "INVALID_INPUT");
        if (db.coaches.some((c) => c.slug === slug)) throw new ApiError("Cette adresse est déjà prise.", "DUPLICATE");
        const src = db.coaches.find((c) => c.slug === "demo") || db.coaches[0];
        const srcSite = db.site_content.find((x) => x.coach_id === src.id);
        const id = P.uuid();
        const name = display_name.trim(), cityTxt = (city || "").trim();
        db.coaches.push({ ...clone(src), id, slug, display_name: name, city: cityTxt || null, status: "draft", custom_domain: null,
                          notify_email: email || null, ical_token: P.uuid() });
        db.site_content.push({ coach_id: id,
          theme: { ...clone(srcSite.theme), logo_text: name.toUpperCase(), logo_url: null, hero_image: null, portrait_image: null },
          content: { ...clone(srcSite.content), hero_title: "Coach de padel" + (cityTxt ? " à " + cityTxt : ""), phone: null, email: null,
                     whatsapp: null, instagram: null, legal_name: name, siret: null,
                     seo_title: `${name}, coach de padel${cityTxt ? " à " + cityTxt : ""} | Réservation en ligne` } });
        for (const sv of db.services.filter((x) => x.coach_id === src.id)) db.services.push({ ...clone(sv), id: P.uuid(), coach_id: id, location_id: null });
        save();
        return delay({ coach_id: id, slug, status: "draft", invited: false });
      },
      updateCoach: async (id, patch) => { const c = db.coaches.find((x) => x.id === id); Object.assign(c, patch); save(); return delay(clone(c)); },
      getSiteContent: async (coachId) => delay(clone(db.site_content.find((x) => x.coach_id === coachId))),
      saveSiteContent: async (coachId, patch) => {
        const sc = db.site_content.find((x) => x.coach_id === coachId);
        Object.assign(sc, clone(patch));
        save();
        return delay(clone(sc));
      },
      list: async (table, coachId, order = "position") => {
        const keys = String(order).split(",").map((k) => k.trim()).filter(Boolean);
        const rows = db[table].filter((r) => r.coach_id === coachId);
        rows.sort((a, b) => { for (const k of keys) { if (a[k] < b[k]) return -1; if (a[k] > b[k]) return 1; } return 0; });
        return delay(clone(rows));
      },
      insert: async (table, row) => {
        const r = { id: P.uuid(), created_at: new Date().toISOString(), ...clone(row) };
        db[table] = db[table] || [];
        db[table].push(r);
        if (!save() && table === "media") {
          db[table].pop();
          throw new ApiError("La démo garde les photos dans votre navigateur, dont l'espace est plein. Supprimez quelques photos ou réinitialisez la démo.", "QUOTA");
        }
        return delay(clone(r));
      },
      update: async (table, id, patch) => {
        const r = db[table].find((x) => x.id === id);
        if (!r) throw new ApiError("Élément introuvable.", "NOT_FOUND");
        Object.assign(r, clone(patch)); save(); return delay(clone(r));
      },
      remove: async (table, id) => { db[table] = db[table].filter((x) => x.id !== id); save(); return delay(); },
      bookings: async (coachId, { from, to } = {}) => delay(clone(db.bookings
        .filter((b) => b.coach_id === coachId && (!from || b.starts_at >= from) && (!to || b.starts_at < to))
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at)).map(joinBooking))),
      updateBooking: async (id, patch) => {
        const b = db.bookings.find((x) => x.id === id);
        const next = { ...b, ...patch };
        assertNoOverlap(next, id);
        Object.assign(b, patch); save();
        return delay(clone(joinBooking(b)));
      },
      createBooking: async (row) => {
        const b = { id: P.uuid(), cancel_token: P.uuid(), payment_status: "unpaid", party_size: 1, source: "manual",
                    cancelled_by: null, coach_notes: null, player_message: null, created_at: new Date().toISOString(), ...row };
        assertNoOverlap(b);
        db.bookings.push(b); save();
        return delay(clone(joinBooking(b)));
      },
      coachSlots: async (coach, serviceId, from, to) => delay(slotsFor(db.coaches.find((c) => c.id === coach.id), serviceId, from, to, true)),
      upload: (coachId, file) => new Promise((res, rej) => {
        if (file.size > 1.5e6) return rej(new ApiError("En démo, les images sont limitées à 1,5 Mo.", "TOO_BIG"));
        // (les images sont déjà réduites par le back-office avant l'envoi)
        const fr = new FileReader();
        fr.onload = () => res(fr.result);
        fr.onerror = () => rej(new ApiError("Lecture de l'image impossible.", "UPLOAD"));
        fr.readAsDataURL(file);
      }),
      icalUrl: () => "https://exemple.supabase.co/functions/v1/ical?token=lien-prive-de-demo",
    };
  }

  let backendPromise = null;
  function backend() {
    if (!backendPromise) backendPromise = CFG.SUPABASE_URL ? supabaseBackend() : Promise.resolve(demoBackend());
    return backendPromise;
  }

  root.PCW = Object.assign(root.PCW || {}, { backend, currentSlug, ApiError });
})(typeof window !== "undefined" ? window : globalThis);
