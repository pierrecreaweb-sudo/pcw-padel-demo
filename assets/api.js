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
    // « Rester connecté » : session gardée sur l'appareil (localStorage) ou seulement jusqu'à la fermeture de l'onglet/navigateur (sessionStorage).
    const REMEMBER_KEY = "pcw_remember";
    const safe = (fn, d = null) => { try { return fn(); } catch { return d; } };
    const wantsRemember = () => safe(() => root.localStorage.getItem(REMEMBER_KEY), null) !== "0";
    const authStorage = {
      getItem: (k) => safe(() => root.sessionStorage.getItem(k)) ?? safe(() => root.localStorage.getItem(k)),
      setItem: (k, v) => {
        if (wantsRemember()) { safe(() => root.localStorage.setItem(k, v)); safe(() => root.sessionStorage.removeItem(k)); }
        else { safe(() => root.sessionStorage.setItem(k, v)); safe(() => root.localStorage.removeItem(k)); }
      },
      removeItem: (k) => { safe(() => root.localStorage.removeItem(k)); safe(() => root.sessionStorage.removeItem(k)); },
    };
    const sb = root.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, { auth: { storage: authStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    const unwrap = ({ data, error }) => { if (error) throw fromPg(error); return data; };
    const bookingSelect = "*, player:players(*), location:locations(*)";

    return {
      mode: "supabase",
      // ---- public
      getSite: async (slug) => unwrap(await sb.rpc("public_get_site", { p_slug: slug })),
      getSlots: async (slug, serviceId, from, to) =>
        unwrap(await sb.rpc("public_get_slots", { p_slug: slug, p_service_id: serviceId, p_from: from, p_to: to })) || [],
      getSlotLevels: async (slug, serviceId, from, to) =>
        unwrap(await sb.rpc("public_get_slot_levels", { p_slug: slug, p_service_id: serviceId, p_from: from, p_to: to })) || [],
      getExtras: async (slug) => unwrap(await sb.rpc("public_get_extras", { p_slug: slug })) || { stages: [], packs: [], online_payment: false },
      registerStage: async (slug, r) => unwrap(await sb.rpc("public_register_stage", {
        p_slug: slug, p_stage_id: r.stage_id, p_first_name: r.first_name, p_last_name: r.last_name || "",
        p_email: r.email, p_phone: r.phone, p_party_size: r.party_size || 1, p_message: r.message || null })),
      requestPack: async (slug, r) => unwrap(await sb.rpc("public_request_pack", {
        p_slug: slug, p_pack_id: r.pack_id, p_first_name: r.first_name, p_last_name: r.last_name || "", p_email: r.email, p_phone: r.phone })),
      playerLogin: async (slug, email, password) => {
        const r = unwrap(await sb.rpc("public_player_login", { p_slug: slug, p_email: email, p_password: password }));
        if (r && r.error) throw new ApiError(r.message || "Email ou mot de passe incorrect.", r.error);
        return r.session;
      },
      playerRequestAccess: async (slug, email) => !!unwrap(await sb.rpc("public_player_request_access", { p_slug: slug, p_email: email })),
      playerSetPassword: async (token, password) => {
        const r = unwrap(await sb.rpc("public_player_set_password", { p_token: token, p_password: password }));
        if (!r || r.error || !r.session) throw new ApiError((r && r.message) || "Ce lien n'est plus valide. Demandez-en un nouveau.", (r && r.error) || "INVALID_TOKEN");
        return r.session;
      },
      playerSpace: async (session) => unwrap(await sb.rpc("public_player_space", { p_session: session })),
      spaceCall: async (session, name, args) => unwrap(await sb.rpc("public_player_" + name, { p_session: session, ...(args || {}) })),
      playerLogout: async (session) => { try { await sb.rpc("public_player_logout", { p_session: session }); } catch {} return true; },
      setPlayerOptoutSession: async (session, optout) => !!unwrap(await sb.rpc("public_player_set_optout_session", { p_session: session, p_optout: !!optout })),
      setPlayerOptout: async (token, optout) => !!unwrap(await sb.rpc("public_player_set_optout", { p_token: token, p_optout: !!optout })),
      book: async (slug, b) => unwrap(await sb.rpc("public_book", {
        p_slug: slug, p_service_id: b.service_id, p_starts_at: b.starts_at, p_first_name: b.first_name,
        p_last_name: b.last_name, p_email: b.email, p_phone: b.phone, p_level: b.level || null,
        p_message: b.message || null, p_party_size: b.party_size || 1,
        p_companions: (b.companions || []).map((c) => ({ first_name: c.first_name || "", email: c.email })),
      })),
      getBooking: async (token) => unwrap(await sb.rpc("public_get_booking", { p_token: token })),
      cancelBooking: async (token) => unwrap(await sb.rpc("public_cancel_booking", { p_token: token })),
      getReviewRequest: async (token) => unwrap(await sb.rpc("public_get_review_request", { p_token: token })),
      submitReview: async (token, rating, comment) => unwrap(await sb.rpc("public_submit_review", { p_token: token, p_rating: rating, p_comment: comment || null })),
      sendMessage: async (slug, m) => unwrap(await sb.rpc("public_send_message", {
        p_slug: slug, p_name: m.name, p_email: m.email, p_phone: m.phone || null, p_subject: m.subject || null,
        p_message: m.message, p_website: m.website || null,
      })),

      // ---- authentification coach
      getUser: async () => (await sb.auth.getUser()).data.user || null,
      getRemember: () => wantsRemember(),
      setRemember: (yes) => { safe(() => root.localStorage.setItem(REMEMBER_KEY, yes ? "1" : "0")); },
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
      // ---- console PCW (équipe PCW seulement)
      adminDashboard: async () => unwrap(await sb.rpc("admin_dashboard")),
      adminCoaches: async () => unwrap(await sb.rpc("admin_coaches")) || [],
      adminSetBilling: async (coachId, patch) => unwrap(await sb.rpc("admin_set_billing", { p_coach_id: coachId, p_patch: patch })),
      adminDeleteCoach: async (coachId) => { unwrap(await sb.rpc("admin_delete_coach", { p_coach_id: coachId })); },
      adminInvoices: async (coachId) => unwrap(await sb.rpc("admin_invoices", { p_coach_id: coachId || null })) || [],
      adminCreateInvoice: async (coachId, kind, client, periodStart, notes) => unwrap(await sb.rpc("admin_create_invoice",
        { p_coach_id: coachId, p_kind: kind, p_client: client, p_period_start: periodStart || null, p_notes: notes || null })),
      adminMarkInvoicePaid: async (id, paidOn) => unwrap(await sb.rpc("admin_mark_invoice_paid", { p_id: id, p_paid_on: paidOn || null })),
      adminCancelInvoice: async (id, reason) => unwrap(await sb.rpc("admin_cancel_invoice", { p_id: id, p_reason: reason || null })),
      adminGetSettings: async () => unwrap(await sb.rpc("admin_get_settings")) || {},
      adminSetSettings: async (patch) => unwrap(await sb.rpc("admin_set_settings", { p_patch: patch })),
      adminResendInvite: async (coachId) => {
        const { data, error } = await sb.functions.invoke("create-coach", { body: { action: "resend_invite", coach_id: coachId } });
        if (error) {
          let msg = error.message;
          try { msg = (await error.context.json()).error || msg; } catch { /* réponse non JSON */ }
          throw new ApiError(msg, "RESEND_INVITE");
        }
        return data;
      },
      // ---- factures d'abonnement vues par le coach
      coachInvoices: async (coachId) => unwrap(await sb.rpc("coach_invoices", { p_coach_id: coachId })) || { invoices: [], payment: {} },
      adminSetInvoicePaymentUrl: async (id, url) => { unwrap(await sb.rpc("admin_set_invoice_payment_url", { p_id: id, p_url: url || null })); },
      // ---- notifications push (appareil du navigateur)
      // compteurs de notifications par onglet du menu
      navCounts: async (coachId) => unwrap(await sb.rpc("nav_counts", { p_coach_id: coachId || null })) || {},
      navMarkSeen: async (coachId, tab) => { unwrap(await sb.rpc("nav_mark_seen", { p_coach_id: coachId || null, p_tab: tab })); },
      pushPublicKey: async () => unwrap(await sb.rpc("push_public_key")),
      pushSubscribe: async (sub, label) => { unwrap(await sb.rpc("push_subscribe", { p_endpoint: sub.endpoint, p_p256dh: sub.p256dh, p_auth: sub.auth, p_label: label || null })); },
      pushUnsubscribe: async (endpoint) => { unwrap(await sb.rpc("push_unsubscribe", { p_endpoint: endpoint })); },
      pushGetPrefs: async (endpoint) => unwrap(await sb.rpc("push_get_prefs", { p_endpoint: endpoint })) || {},
      pushSetPref: async (endpoint, kind, enabled) => { unwrap(await sb.rpc("push_set_pref", { p_endpoint: endpoint, p_kind: kind, p_enabled: enabled })); },
      pushTest: async () => {
        const { data, error } = await sb.functions.invoke("push-worker", { body: { action: "test" } });
        if (error) {
          let msg = error.message;
          try { msg = (await error.context.json()).error || msg; } catch { /* réponse non JSON */ }
          throw new ApiError(msg, "PUSH_TEST");
        }
        return data;
      },
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
      // ---- avis
      replyReview: async (id, reply) => { unwrap(await sb.rpc("coach_reply_review", { p_review_id: id, p_reply: reply || null })); },
      reportReview: async (id, reason) => { unwrap(await sb.rpc("coach_report_review", { p_review_id: id, p_reason: reason })); },
      // ---- avis du coach sur PCW Padel Coach (page de vente)
      getTestimonial: async (coachId) => unwrap(await sb.from("coach_testimonials").select("*").eq("coach_id", coachId).maybeSingle()),
      saveTestimonial: async (coachId, t) => unwrap(await sb.rpc("coach_save_testimonial", {
        p_coach_id: coachId, p_rating: t.rating, p_body: t.body, p_author_name: t.author_name,
        p_author_role: t.author_role || null, p_place: t.place || null, p_show_photo: Boolean(t.show_photo),
      })),
      deleteTestimonial: async (coachId) => { unwrap(await sb.rpc("coach_delete_testimonial", { p_coach_id: coachId })); },
      listTestimonials: async () => unwrap(await sb.from("coach_testimonials").select("*, coach:coaches(display_name, slug, status)").order("updated_at", { ascending: false })) || [],
      moderateTestimonial: async (id, status, note) => unwrap(await sb.rpc("admin_moderate_testimonial", { p_id: id, p_status: status, p_note: note || null })),
      // ---- agenda Google (import)
      saveCalendarImport: async (row) => unwrap(await sb.from("calendar_imports").upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: "coach_id" }).select().single()),
      syncCalendar: async (coachId) => {
        const { data, error } = await sb.functions.invoke("gcal-sync", { body: { coach_id: coachId } });
        if (error) throw new ApiError("Synchronisation impossible pour le moment. Nouvel essai automatique dans 15 minutes.", "SYNC");
        const r = (data && data.results && data.results[0]) || null;
        if (r && !r.ok) throw new ApiError(r.error, "SYNC");
        return r;
      },
    };
  }

  // ============================================================ DÉMO =======
  const KEY = "pcw-demo-db";
  const demoNavSeen = {};
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
        // Les rendez-vous importés de l'agenda Google bloquent les créneaux comme une absence.
        timeOff: db.time_off.filter((t) => t.coach_id === coach.id).concat((db.external_busy || []).filter((t) => t.coach_id === coach.id)),
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

    function publicReviews(coachId) {
      const list = (db.reviews || []).filter((r) => r.coach_id === coachId && r.status === "published");
      const avg = list.length ? Math.round((list.reduce((a, r) => a + r.rating, 0) / list.length) * 10) / 10 : null;
      const shown = [...list].sort((a, b) => (a.comment ? 0 : 1) - (b.comment ? 0 : 1) || b.created_at.localeCompare(a.created_at)).slice(0, 30)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      return {
        rating: { average: avg, count: list.length },
        reviews: shown.map((r) => ({ author: r.author_name, rating: r.rating, comment: r.comment, service_name: r.service_name, date: r.session_date, reply: r.reply })),
      };
    }

  const demoAdminCoaches = async () => {
      db.coach_billing = db.coach_billing || [];
      const now = Date.now();
      return delay(clone(db.coaches.map((c) => {
        const bs = (db.bookings || []).filter((b) => b.coach_id === c.id);
        const live = bs.filter((b) => ["pending", "confirmed", "completed", "no_show"].includes(b.status));
        const bl = db.coach_billing.find((x) => x.coach_id === c.id) || { coach_id: c.id, plan_status: "pending", live_since: null, commitment_months: 12,
          setup_fee_cents: 3900, setup_waived: false, setup_paid_at: null, monthly_cents: 7900, paid_until: null, cancel_requested_at: null, notes: null };
        return { id: c.id, slug: c.slug, display_name: c.display_name, city: c.city, status: c.status, custom_domain: c.custom_domain || null,
          notify_email: c.notify_email || null, directory_listed: c.directory_listed !== false, created_at: c.created_at || null,
          owner_email: c.notify_email || null, last_sign_in_at: null, invite_pending: false,
          bookings_30d: live.filter((b) => Math.abs(new Date(b.starts_at) - now) < 30 * 864e5).length,
          bookings_upcoming: bs.filter((b) => ["pending", "confirmed"].includes(b.status) && new Date(b.starts_at) > now).length,
          bookings_total: bs.length, rating: null, rating_count: 0,
          services_count: db.services.filter((x) => x.coach_id === c.id && x.active !== false).length,
          locations_count: (db.locations || []).filter((x) => x.coach_id === c.id).length,
          rules_count: (db.availability_rules || []).filter((x) => x.coach_id === c.id).length, billing: bl };
      })));
    };
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
          ...publicReviews(c.id),
        }));
      },
      getReviewRequest: async (token) => {
        const b = db.bookings.find((x) => x.review_token === token);
        if (!b) return delay(null);
        const c = db.coaches.find((x) => x.id === b.coach_id), p = db.players.find((x) => x.id === b.player_id);
        const r = (db.reviews || []).find((x) => x.booking_id === b.id);
        const ended = new Date(b.ends_at) <= Date.now(), age = Date.now() - new Date(b.ends_at);
        const recent = !r || Date.now() - new Date(r.created_at) < 7 * 864e5;
        const reason = ["cancelled", "no_show"].includes(b.status) ? "NOT_HELD" : !ended ? "TOO_EARLY" : age > 60 * 864e5 ? "TOO_LATE" : !recent ? "ALREADY" : null;
        return delay(clone({
          coach: { slug: c.slug, display_name: c.display_name, timezone: c.timezone }, service_name: b.service_name, starts_at: b.starts_at,
          player_first_name: p ? p.first_name : null, can_review: !reason, reason, review: r ? { rating: r.rating, comment: r.comment } : null,
        }));
      },
      submitReview: async (token, rating, comment) => {
        const b = db.bookings.find((x) => x.review_token === token);
        if (!b) throw new ApiError("Lien d'avis introuvable.", "NOT_FOUND");
        if (!["confirmed", "completed"].includes(b.status)) throw new ApiError("Cette séance n'a pas eu lieu : elle ne peut pas être notée.", "NOT_HELD");
        if (new Date(b.ends_at) > Date.now()) throw new ApiError("Vous pourrez noter cette séance une fois terminée.", "TOO_EARLY");
        if (Date.now() - new Date(b.ends_at) > 60 * 864e5) throw new ApiError("Le délai pour noter cette séance est dépassé.", "TOO_LATE");
        rating = Number(rating);
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new ApiError("Choisissez une note de 1 à 5.", "INVALID_INPUT");
        const text = String(comment || "").trim() || null;
        if (text && text.length > 1000) throw new ApiError("Commentaire trop long (1000 caractères maximum).", "INVALID_INPUT");
        db.reviews = db.reviews || [];
        let r = db.reviews.find((x) => x.booking_id === b.id);
        if (r && Date.now() - new Date(r.created_at) >= 7 * 864e5) throw new ApiError("Vous avez déjà noté cette séance.", "ALREADY");
        const c = db.coaches.find((x) => x.id === b.coach_id), p = db.players.find((x) => x.id === b.player_id) || {};
        const now = new Date().toISOString();
        if (r) Object.assign(r, { rating, comment: text, updated_at: now });
        else {
          r = { id: P.uuid(), coach_id: b.coach_id, booking_id: b.id, player_id: b.player_id, rating, comment: text,
                author_name: `${p.first_name || "Élève"}${p.last_name ? " " + p.last_name[0].toUpperCase() + "." : ""}`,
                service_name: b.service_name, session_date: P.localYmd(new Date(b.starts_at), c.timezone),
                reply: null, replied_at: null, reported_at: null, report_reason: null, status: "published", created_at: now, updated_at: now };
          db.reviews.push(r);
        }
        save();
        return delay({ ok: true, rating });
      },
      getSlotLevels: async () => delay([]),
      getSlots: async (slug, serviceId, from, to) => {
        const c = coachBySlug(slug);
        return delay(c ? slotsFor(c, serviceId, from, to) : []);
      },
      getExtras: async (slug) => {
        const c = coachBySlug(slug);
        if (!c) return delay(null);
        const taken = (id) => (db.stage_registrations || []).filter((r) => r.stage_id === id && r.status !== "cancelled").reduce((n, r) => n + r.party_size, 0);
        const locOf = (id) => (db.locations || []).find((l) => l.id === id);
        return delay(clone({
          stages: (db.stages || []).filter((x) => x.coach_id === c.id && x.published && new Date(x.ends_at) > Date.now())
            .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
            .map((x) => ({ ...x, places_left: Math.max(0, x.capacity - taken(x.id)), location: locOf(x.location_id) || null })),
          packs: (db.packs || []).filter((k) => k.coach_id === c.id && k.active).sort((a, b) => a.position - b.position)
            .map((k) => ({ ...k, service_name: ((db.services || []).find((v) => v.id === k.service_id) || {}).name || null })),
          online_payment: false,
        }));
      },
      registerStage: async (slug, r) => {
        const c = coachBySlug(slug);
        if (!c || c.status !== "live") throw new ApiError("Ce site ne prend pas d'inscription pour le moment.", "SITE_CLOSED");
        const st = (db.stages || []).find((x) => x.id === r.stage_id && x.coach_id === c.id && x.published);
        if (!st || new Date(st.ends_at) <= Date.now()) throw new ApiError("Ce stage n'est plus disponible.", "STAGE_UNAVAILABLE");
        if (!st.registration_open) throw new ApiError("Les inscriptions à ce stage sont fermées. Contactez directement le coach.", "STAGE_CLOSED");
        const email = String(r.email || "").trim().toLowerCase();
        if (!String(r.first_name || "").trim()) throw new ApiError("Indiquez votre prénom.", "INVALID_INPUT");
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new ApiError("Adresse email invalide.", "INVALID_INPUT");
        if (!/^\+?[0-9]{9,15}$/.test(String(r.phone || "").replace(/[^0-9+]/g, ""))) throw new ApiError("Numéro de téléphone invalide.", "INVALID_INPUT");
        db.stage_registrations = db.stage_registrations || [];
        const party = Number(r.party_size) || 1;
        const taken = db.stage_registrations.filter((x) => x.stage_id === st.id && x.status !== "cancelled").reduce((n, x) => n + x.party_size, 0);
        const left = st.capacity - taken;
        if (left < party) throw new ApiError(left <= 0 ? "Ce stage est complet." : `Il ne reste que ${left} place(s) pour ce stage.`, "STAGE_FULL");
        if (db.stage_registrations.some((x) => x.stage_id === st.id && x.email === email && x.status !== "cancelled")) throw new ApiError("Vous êtes déjà inscrit à ce stage avec cette adresse.", "ALREADY_REGISTERED");
        const row = { id: P.uuid(), stage_id: st.id, coach_id: c.id, first_name: String(r.first_name).trim(), last_name: String(r.last_name || "").trim(), email, phone: String(r.phone).trim(), party_size: party, message: r.message || null, status: "confirmed", payment_status: "unpaid", created_at: new Date().toISOString() };
        row.status = "confirmed";
        db.stage_registrations.push(row); save();
        return delay({ id: row.id, status: "confirmed", stage_title: st.title, starts_at: st.starts_at, ends_at: st.ends_at, places_left: left - party });
      },
      // Démo : le lien « ?t=demo » ouvre l'espace du premier joueur du coach modèle.
      requestPack: async (slug, r) => {
        const c = coachBySlug(slug);
        if (!c || c.status !== "live") throw new ApiError("Ce site ne prend pas de demande pour le moment.", "SITE_CLOSED");
        const k = (db.packs || []).find((x) => x.id === r.pack_id && x.coach_id === c.id && x.active);
        if (!k) throw new ApiError("Ce pack n'est plus disponible.", "PACK_UNAVAILABLE");
        const email = String(r.email || "").trim().toLowerCase();
        if (!String(r.first_name || "").trim()) throw new ApiError("Indiquez votre prénom.", "INVALID_INPUT");
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new ApiError("Adresse email invalide.", "INVALID_INPUT");
        if (!/^\+?[0-9]{9,15}$/.test(String(r.phone || "").replace(/[^0-9+]/g, ""))) throw new ApiError("Numéro de téléphone invalide.", "INVALID_INPUT");
        db.players = db.players || []; db.player_packs = db.player_packs || [];
        let p = db.players.find((x) => x.coach_id === c.id && String(x.email || "").toLowerCase() === email);
        if (!p) { p = { id: P.uuid(), coach_id: c.id, first_name: String(r.first_name).trim(), last_name: String(r.last_name || "").trim(), email, phone: String(r.phone).trim(), created_at: new Date().toISOString() }; db.players.push(p); }
        if (db.player_packs.some((x) => x.player_id === p.id && x.pack_id === k.id && x.payment_status === "unpaid" && !x.sessions_used)) throw new ApiError("Vous avez déjà demandé ce pack. Votre coach vous contactera pour le règlement.", "ALREADY_REQUESTED");
        const exp = k.valid_days ? new Date(Date.now() + k.valid_days * 864e5).toISOString().slice(0, 10) : null;
        const row = { id: P.uuid(), coach_id: c.id, player_id: p.id, pack_id: k.id, name: k.name, sessions_total: k.sessions_count, sessions_used: 0, price_cents: k.price_cents, payment_status: "unpaid", expires_at: exp, note: "Demandé en ligne", created_at: new Date().toISOString() };
        db.player_packs.push(row); save();
        return delay({ id: row.id, name: row.name, sessions_total: row.sessions_total, price_cents: row.price_cents, expires_at: exp });
      },
      playerLogin: async (slug, email, password) => {
        if (!/^demo/i.test(String(password)) ) throw new ApiError("Email ou mot de passe incorrect. (Démo : tapez un mot de passe commençant par « demo ».)", "BAD_LOGIN");
        return delay("demo");
      },
      playerSetPassword: async () => delay("demo"),
      playerLogout: async () => delay(true),
      setPlayerOptoutSession: async (s, optout) => {
        const p = (db.players || []).filter((x) => x.coach_id === coachBySlug("demo").id)[0];
        if (p) { p.marketing_optout = !!optout; save(); }
        return delay(true);
      },
      // Démo : l'espace joueur d'exemple (premier joueur du coach modèle). Objectifs, messages, alertes sont gardés en mémoire du navigateur.
      playerSpace: async (token) => {
        if (token !== "demo") return delay(null);
        const c = coachBySlug("demo");
        const p = (db.players || []).filter((x) => x.coach_id === c.id)[0];
        if (!p) return delay(null);
        const ds = (db.demo_space = db.demo_space || { goals: [], messages: [], waitlist: [], prefs: { pref_reminders: true, pref_pack_alerts: true, pref_messages: true } });
        if (!ds.skills) ds.skills = [["Bandeja", 3, 4], ["Volée", 2, 2], ["Service", 4, 4]].flatMap(([s, a1, b1]) => [{ skill: s, level: a1, rated_at: new Date(Date.now() - 40 * 864e5).toISOString() }, { skill: s, level: b1, rated_at: new Date(Date.now() - 6 * 864e5).toISOString() }]);
        const locName = (id) => ((db.locations || []).find((l) => l.id === id) || {}).name || null;
        const bs = db.bookings.filter((b) => b.player_id === p.id);
        const now = Date.now();
        const past = bs.filter((b) => ["confirmed", "completed"].includes(b.status) && new Date(b.ends_at) <= now);
        const last = bs.filter((b) => ["confirmed", "completed", "pending"].includes(b.status)).sort((a, b) => b.starts_at.localeCompare(a.starts_at))[0];
        const sv = (db.services || []).filter((s) => s.coach_id === c.id && s.active);
        const skills = [...new Set(ds.skills.map((x) => x.skill))].map((s) => { const h = ds.skills.filter((x) => x.skill === s).sort((a, b) => a.rated_at.localeCompare(b.rated_at)); const l = h[h.length - 1], pv = h[h.length - 2]; return { skill: s, level: l.level, previous: pv ? pv.level : null, rated_at: l.rated_at }; });
        return delay(clone({
          coach: { slug: c.slug, display_name: c.display_name, timezone: c.timezone, cancel_hours: c.cancel_hours || 24 },
          player: { first_name: p.first_name, last_name: p.last_name, level: p.level, email: p.email || "joueur@exemple.fr", phone: p.phone || "0612345678", marketing_optout: !!p.marketing_optout, ...ds.prefs },
          last_service: last ? { service_id: last.service_id } : null,
          services: sv.map((s) => ({ id: s.id, name: s.name, duration_minutes: s.duration_minutes, price_cents: s.price_cents })),
          upcoming: bs.filter((b) => ["pending", "confirmed"].includes(b.status) && new Date(b.starts_at) > now).sort((a, b) => a.starts_at.localeCompare(b.starts_at))
            .map((b) => ({ starts_at: b.starts_at, ends_at: b.ends_at, service_name: b.service_name, status: b.status, location: locName(b.location_id), address: null, cancel_token: b.cancel_token })),
          history: bs.filter((b) => ["confirmed", "completed", "no_show"].includes(b.status) && new Date(b.starts_at) <= now).sort((a, b) => b.starts_at.localeCompare(a.starts_at)).slice(0, 60)
            .map((b, i) => ({ starts_at: b.starts_at, service_id: b.service_id, service_name: b.service_name, status: b.status, location: locName(b.location_id), player_notes: b.player_notes || null, pack_name: null, review_token: i === 0 && b.status !== "no_show" ? "demo-review" : null })),
          packs: (db.player_packs || []).filter((x) => x.player_id === p.id).map((x) => ({ name: x.name, sessions_total: x.sessions_total, sessions_used: x.sessions_used, expires_at: x.expires_at, payment_status: x.payment_status })),
          stages: [],
          goals: ds.goals.filter((g) => g.status !== "cancelled"),
          skills, skill_history: ds.skills,
          messages: ds.messages,
          waitlist: ds.waitlist.filter((w) => w.status !== "cancelled"),
          stats: { total: past.length, minutes: past.reduce((n, b) => n + (new Date(b.ends_at) - new Date(b.starts_at)) / 60000, 0), this_month: past.filter((b) => b.starts_at.slice(0, 7) === new Date().toISOString().slice(0, 7)).length, first_at: past.length ? past.map((b) => b.starts_at).sort()[0] : null, top_service: past.length ? past[0].service_name : null, streak_weeks: 3 },
        }));
      },
      spaceCall: async function (session, name, args) {
        const c = coachBySlug("demo");
        const p = (db.players || []).filter((x) => x.coach_id === c.id)[0];
        const ds = (db.demo_space = db.demo_space || { goals: [], messages: [], waitlist: [], prefs: { pref_reminders: true, pref_pack_alerts: true, pref_messages: true } });
        const a = args || {};
        switch (name) {
          case "book": {
            const s = (db.services || []).find((x) => x.id === a.p_service_id);
            if (!s) throw new ApiError("Cette prestation n'est plus disponible.", "SERVICE_UNAVAILABLE");
            return this.book("demo", { service_id: s.id, starts_at: a.p_starts_at, first_name: p.first_name, last_name: p.last_name || "", email: p.email || "joueur@exemple.fr", phone: p.phone || "0612345678", party_size: 1 });
          }
          case "goal_add": ds.goals.push({ id: P.uuid(), title: String(a.p_title).trim(), progress: 0, status: "active", created_by: "player" }); break;
          case "goal_set": { const g = ds.goals.find((x) => x.id === a.p_id); if (g) { g.progress = a.p_status === "done" ? 100 : a.p_progress; g.status = a.p_status; } break; }
          case "message_send": ds.messages.push({ id: P.uuid(), sender: "player", body: String(a.p_body), created_at: new Date().toISOString(), unread: false }); break;
          case "messages_read": ds.messages.forEach((m) => { m.unread = false; }); break;
          case "waitlist_add": { const s = (db.services || []).find((x) => x.id === a.p_service_id); ds.waitlist.push({ id: P.uuid(), wanted_date: a.p_date, service_name: s ? s.name : "Séance", status: "waiting" }); break; }
          case "waitlist_cancel": { const w = ds.waitlist.find((x) => x.id === a.p_id); if (w) w.status = "cancelled"; break; }
          case "update_profile": ds.prefs = { pref_reminders: !!a.p_pref_reminders, pref_pack_alerts: !!a.p_pref_pack_alerts, pref_messages: !!a.p_pref_messages }; if (p) { p.phone = a.p_phone; p.email = a.p_email; p.marketing_optout = !!a.p_marketing_optout; } break;
          case "change_password": if (!/^demo/i.test(String(a.p_old))) return delay({ error: "BAD_PASSWORD", message: "Le mot de passe actuel est incorrect. (Démo : « demo1234 »)" }); return delay({ ok: true });
          case "export": return delay({ exported_at: new Date().toISOString(), profil: { prenom: p.first_name, nom: p.last_name }, note: "Export de démonstration" });
          case "delete_account": if (!/^demo/i.test(String(a.p_password))) return delay({ error: "BAD_PASSWORD", message: "Le mot de passe est incorrect. (Démo : « demo1234 »)" }); return delay({ ok: true });
        }
        save(); return delay(true);
      },
      playerRequestAccess: async () => delay(true),
      setPlayerOptout: async (token, optout) => {
        const p = (db.players || []).filter((x) => x.coach_id === coachBySlug("demo").id)[0];
        if (p) { p.marketing_optout = !!optout; save(); }
        return delay(true);
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
      getRemember: () => true,
      setRemember: () => {},
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
      // ---- console PCW (démo)
      adminCoaches: () => demoAdminCoaches(),
      adminDashboard: async () => {
        const list = await demoAdminCoaches();
        const bk = (db.bookings || []).filter((b) => ["pending", "confirmed", "completed", "no_show"].includes(b.status));
        const m0 = new Date(); m0.setDate(1); m0.setHours(0, 0, 0, 0);
        const m1 = new Date(m0); m1.setMonth(m1.getMonth() - 1);
        const m2 = new Date(m0); m2.setMonth(m2.getMonth() + 1);
        const inR = (b, a, z) => new Date(b.starts_at) >= a && new Date(b.starts_at) < z;
        const bills = list.map((c) => c.billing);
        return {
          coaches: { total: list.length, live: list.filter((c) => c.status === "live").length, draft: list.filter((c) => c.status === "draft").length, suspended: list.filter((c) => c.status === "suspended").length },
          bookings: { month: bk.filter((b) => inR(b, m0, m2)).length, last_month: bk.filter((b) => inR(b, m1, m0)).length, upcoming: bk.filter((b) => new Date(b.starts_at) > new Date()).length },
          weekly_bookings: [],
          mrr_cents: bills.filter((b) => ["active", "cancelling"].includes(b.plan_status)).reduce((n, b) => n + b.monthly_cents, 0),
          overdue: { count: bills.filter((b) => b.plan_status === "overdue").length, cents: bills.filter((b) => b.plan_status === "overdue").reduce((n, b) => n + b.monthly_cents, 0) },
          waived_setups: bills.filter((b) => b.setup_waived).length,
          pending_testimonials: (db.coach_testimonials || []).filter((t) => t.status === "pending").length,
          reported_reviews: 0, due_soon: [], commitment_ending: [],
          attention: list.filter((c) => c.slug !== "demo").map((c) => ({ coach_id: c.id, name: c.display_name, status: c.status,
            issues: [c.services_count ? null : "Aucune prestation active", c.locations_count ? null : "Aucun lieu", c.rules_count ? null : "Aucun horaire"].filter(Boolean) })).filter((x) => x.issues.length),
        };
      },
      adminSetBilling: async (coachId, patch) => {
        db.coach_billing = db.coach_billing || [];
        let r = db.coach_billing.find((x) => x.coach_id === coachId);
        if (!r) { r = { coach_id: coachId, plan_status: "pending", live_since: null, commitment_months: 12, setup_fee_cents: 3900, setup_waived: false, setup_paid_at: null, monthly_cents: 7900, paid_until: null, cancel_requested_at: null, notes: null }; db.coach_billing.push(r); }
        Object.assign(r, patch); save();
        return delay(clone(r));
      },
      adminDeleteCoach: async (coachId) => {
        const c = db.coaches.find((x) => x.id === coachId);
        if (!c) throw new ApiError("Coach introuvable.", "NOT_FOUND");
        if (c.slug === "demo") throw new ApiError("Le coach modèle ne peut pas être supprimé.", "FORBIDDEN");
        if (c.status === "live") throw new ApiError("Repassez d'abord le site en brouillon ou suspendez-le.", "FORBIDDEN");
        if ((db.bookings || []).some((b) => b.coach_id === coachId)) throw new ApiError("Ce coach a des réservations : suspendez-le plutôt que de le supprimer.", "FORBIDDEN");
        db.coaches = db.coaches.filter((x) => x.id !== coachId); save();
        return delay();
      },
      adminInvoices: async (coachId) => {
        const names = Object.fromEntries(db.coaches.map((c) => [c.id, c.display_name]));
        return delay(clone((db.invoices || []).filter((i) => !coachId || i.coach_id === coachId).map((i) => ({ ...i, coach_name: names[i.coach_id] || "" }))
          .sort((a, b) => b.number.localeCompare(a.number))));
      },
      adminCreateInvoice: async (coachId, kind, client, periodStart, notes) => {
        db.invoices = db.invoices || []; db.coach_billing = db.coach_billing || [];
        let b = db.coach_billing.find((x) => x.coach_id === coachId);
        if (!b) { b = { coach_id: coachId, plan_status: "pending", live_since: null, commitment_months: 12, setup_fee_cents: 3900, setup_waived: false, setup_paid_at: null, monthly_cents: 7900, paid_until: null, cancel_requested_at: null, notes: null }; db.coach_billing.push(b); }
        if (!String((client && client.name) || "").trim()) throw new ApiError("Nom du client obligatoire sur la facture.", "INVALID_INPUT");
        const today = new Date().toISOString().slice(0, 10);
        const addM = (ymd, n) => { const d = new Date(ymd + "T12:00:00"); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 10); };
        const dayBefore = (ymd) => { const d = new Date(ymd + "T12:00:00"); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); };
        let lines, total, due = today, ps = null, pe = null;
        if (kind === "setup") {
          if (b.setup_waived) throw new ApiError("La mise en place est offerte à ce coach : pas de facture.", "FORBIDDEN");
          if (b.setup_paid_at || db.invoices.some((i) => i.coach_id === coachId && i.kind === "setup" && i.status !== "cancelled")) throw new ApiError("Une facture de mise en place existe déjà.", "DUPLICATE");
          lines = [{ label: "Mise en place du site PCW Padel Coach", qty: 1, unit_cents: b.setup_fee_cents }]; total = b.setup_fee_cents;
        } else {
          ps = periodStart || (b.paid_until ? new Date(new Date(b.paid_until + "T12:00:00").getTime() + 864e5).toISOString().slice(0, 10) : b.live_since || today);
          pe = dayBefore(addM(ps, 1));
          if (db.invoices.some((i) => i.coach_id === coachId && i.kind === "monthly" && i.status !== "cancelled" && i.period_start === ps)) throw new ApiError("Une facture existe déjà pour cette période.", "DUPLICATE");
          const f = (y) => y.split("-").reverse().join("/");
          lines = [{ label: `Abonnement PCW Padel Coach, du ${f(ps)} au ${f(pe)}`, qty: 1, unit_cents: b.monthly_cents }]; total = b.monthly_cents; due = ps > today ? ps : today;
        }
        const year = new Date().getFullYear();
        const n = db.invoices.filter((i) => i.number.startsWith(`FA-${year}-`)).length + 1;
        const inv = { id: P.uuid(), number: `FA-${year}-${String(n).padStart(4, "0")}`, coach_id: coachId, kind, issued_on: today, due_on: due, period_start: ps, period_end: pe,
          lines, total_cents: total, client: { name: client.name.trim(), address: client.address || null, siret: client.siret || null, email: client.email || null },
          status: "issued", paid_on: null, notes: notes || null, created_at: new Date().toISOString() };
        db.invoices.push(inv); save();
        return delay(clone({ ...inv, coach_name: (db.coaches.find((c) => c.id === coachId) || {}).display_name }));
      },
      adminMarkInvoicePaid: async (id, paidOn) => {
        const i = (db.invoices || []).find((x) => x.id === id);
        if (!i) throw new ApiError("Facture introuvable.", "NOT_FOUND");
        if (i.status === "cancelled") throw new ApiError("Cette facture est annulée.", "FORBIDDEN");
        i.status = "paid"; i.paid_on = paidOn || new Date().toISOString().slice(0, 10);
        const b = db.coach_billing.find((x) => x.coach_id === i.coach_id);
        if (b && i.kind === "setup") b.setup_paid_at = i.paid_on;
        if (b && i.kind === "monthly") { if (!b.paid_until || b.paid_until < i.period_end) b.paid_until = i.period_end; b.live_since = b.live_since || i.period_start; if (["pending", "overdue"].includes(b.plan_status)) b.plan_status = "active"; }
        save(); return delay(clone(i));
      },
      adminCancelInvoice: async (id, reason) => {
        const i = (db.invoices || []).find((x) => x.id === id);
        if (!i) throw new ApiError("Facture introuvable.", "NOT_FOUND");
        if (i.status === "paid") throw new ApiError("Une facture payée ne s'annule pas : établissez un avoir.", "FORBIDDEN");
        i.status = "cancelled"; if (reason) i.notes = reason; save(); return delay(clone(i));
      },
      adminGetSettings: async () => delay(clone(db.platform_settings || {})),
      adminSetSettings: async (patch) => { db.platform_settings = { ...(db.platform_settings || {}), ...patch }; save(); return delay(clone(db.platform_settings)); },
      adminResendInvite: async () => delay({ sent: true, kind: "invite", email: "démo" }),
      coachInvoices: async () => {
        const today = new Date().toISOString().slice(0, 10);
        const due = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
        return delay({ payment: { iban: "FR76 0000 0000 0000 0000 0000 000", bic: "EXEMPLE", bank_name: "Banque exemple", stripe_link_monthly: "https://buy.stripe.com/exemple" },
          invoices: [
            { id: "demo-inv-2", number: "FA-2026-0002", kind: "monthly", status: "issued", issued_on: today, due_on: due, period_start: today, period_end: due, total_cents: 7900,
              lines: [{ label: "Abonnement PCW Padel Coach, 1 mois", qty: 1, unit_cents: 7900 }], client: { name: "Lucas Ferrand", email: "coach@exemple.fr" }, pay_url: "https://buy.stripe.com/exemple" },
            { id: "demo-inv-1", number: "FA-2026-0001", kind: "setup", status: "paid", issued_on: "2026-10-01", due_on: "2026-10-08", paid_on: "2026-10-03", total_cents: 3900,
              lines: [{ label: "Mise en place du site", qty: 1, unit_cents: 3900 }], client: { name: "Lucas Ferrand", email: "coach@exemple.fr" } },
          ] });
      },
      adminSetInvoicePaymentUrl: async () => {},
      navCounts: async (coachId) => (coachId
        ? { avis: demoNavSeen.avis ? 0 : 2, factures: demoNavSeen.factures ? 0 : 1, reservations: demoNavSeen.reservations ? 0 : 3 }
        : { coaches: demoNavSeen.coaches ? 0 : 1, billing: demoNavSeen.billing ? 0 : 2, reviews: demoNavSeen.reviews ? 0 : 1 }),
      navMarkSeen: async (coachId, tab) => { demoNavSeen[tab] = true; },
      pushPublicKey: async () => null,
      pushSubscribe: async () => {}, pushUnsubscribe: async () => {}, pushGetPrefs: async () => ({}), pushSetPref: async () => {},
      pushTest: async () => ({ sent: 0 }),
      createCoach: async ({ slug, display_name, city, email, domain }) => {
        slug = String(slug || "").trim().toLowerCase();
        if (!/^[a-z0-9]([a-z0-9-]{1,38}[a-z0-9])$/.test(slug)) throw new ApiError("Adresse invalide : 3 à 40 caractères, lettres minuscules, chiffres et tirets.", "INVALID_INPUT");
        if (!String(display_name || "").trim()) throw new ApiError("Nom du coach obligatoire.", "INVALID_INPUT");
        if (db.coaches.some((c) => c.slug === slug)) throw new ApiError("Cette adresse est déjà prise.", "DUPLICATE");
        const src = db.coaches.find((c) => c.slug === "demo") || db.coaches[0];
        const srcSite = db.site_content.find((x) => x.coach_id === src.id);
        const id = P.uuid();
        const name = display_name.trim(), cityTxt = (city || "").trim();
        db.coaches.push({ ...clone(src), id, slug, display_name: name, city: cityTxt || null, status: "draft", custom_domain: String(domain || "").trim().toLowerCase() || null,
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
        const rows = (db[table] || []).filter((r) => r.coach_id === coachId);
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
      replyReview: async (id, reply) => {
        const r = db.reviews.find((x) => x.id === id);
        const text = String(reply || "").trim() || null;
        if (text && text.length > 1000) throw new ApiError("Réponse trop longue (1000 caractères maximum).", "INVALID_INPUT");
        Object.assign(r, { reply: text, replied_at: text ? new Date().toISOString() : null }); save(); return delay();
      },
      reportReview: async (id, reason) => {
        const text = String(reason || "").trim();
        if (text.length < 5 || text.length > 500) throw new ApiError("Expliquez en quelques mots pourquoi cet avis est abusif.", "INVALID_INPUT");
        Object.assign(db.reviews.find((x) => x.id === id), { reported_at: new Date().toISOString(), report_reason: text }); save(); return delay();
      },
      getTestimonial: async (coachId) => delay(clone((db.coach_testimonials || []).find((t) => t.coach_id === coachId) || null)),
      saveTestimonial: async (coachId, t) => {
        const body = String(t.body || "").trim(), name = String(t.author_name || "").trim();
        if (!(t.rating >= 1 && t.rating <= 5)) throw new ApiError("Choisissez une note de 1 à 5 étoiles.", "INVALID_INPUT");
        if (body.length < 20) throw new ApiError("Votre avis est un peu court : 20 caractères minimum.", "INVALID_INPUT");
        if (body.length > 600) throw new ApiError("Votre avis est trop long : 600 caractères maximum.", "INVALID_INPUT");
        if (name.length < 2 || name.length > 60) throw new ApiError("Indiquez le nom à afficher (2 à 60 caractères).", "INVALID_INPUT");
        db.coach_testimonials = db.coach_testimonials || [];
        let r = db.coach_testimonials.find((x) => x.coach_id === coachId);
        const now = new Date().toISOString();
        if (!r) { r = { id: P.uuid(), coach_id: coachId, created_at: now }; db.coach_testimonials.push(r); }
        Object.assign(r, { rating: t.rating, body, author_name: name, author_role: String(t.author_role || "").trim() || null,
          place: String(t.place || "").trim() || null, show_photo: Boolean(t.show_photo), status: "pending", admin_note: null, published_at: null, updated_at: now });
        save(); return delay(clone(r));
      },
      deleteTestimonial: async (coachId) => { db.coach_testimonials = (db.coach_testimonials || []).filter((t) => t.coach_id !== coachId); save(); return delay(); },
      listTestimonials: async () => delay(clone((db.coach_testimonials || []).map((t) => {
        const c = db.coaches.find((x) => x.id === t.coach_id) || {};
        return { ...t, coach: { display_name: c.display_name, slug: c.slug, status: c.status } };
      }))),
      moderateTestimonial: async (id, status, note) => {
        const r = (db.coach_testimonials || []).find((x) => x.id === id);
        if (!r) throw new ApiError("Avis introuvable.", "NOT_FOUND");
        Object.assign(r, { status, admin_note: String(note || "").trim() || null, published_at: status === "published" ? new Date().toISOString() : null, updated_at: new Date().toISOString() });
        save(); return delay(clone(r));
      },
      saveCalendarImport: async (row) => {
        db.calendar_imports = db.calendar_imports || [];
        let r = db.calendar_imports.find((x) => x.coach_id === row.coach_id);
        if (!r) { r = { coach_id: row.coach_id, enabled: true, last_sync_at: null, last_error: null, events_count: 0 }; db.calendar_imports.push(r); }
        Object.assign(r, clone(row));
        if (!r.ics_url) { db.external_busy = (db.external_busy || []).filter((x) => x.coach_id !== row.coach_id); Object.assign(r, { events_count: 0, last_sync_at: null, last_error: null }); }
        save(); return delay(clone(r));
      },
      syncCalendar: async (coachId) => {
        const r = (db.calendar_imports || []).find((x) => x.coach_id === coachId);
        if (!r || !P.normalizeCalendarUrl(r.ics_url)) throw new ApiError("Adresse non reconnue : utilisez l'adresse secrète iCal de Google Agenda, iCloud ou Outlook.", "SYNC");
        // Démo : pas d'accès réseau, les rendez-vous d'exemple restent ceux déjà importés.
        const n = (db.external_busy || []).filter((x) => x.coach_id === coachId).length;
        Object.assign(r, { last_sync_at: new Date().toISOString(), last_error: null, events_count: n }); save();
        return delay({ ok: true, events: n });
      },
    };
  }

  let backendPromise = null;
  function backend() {
    if (!backendPromise) backendPromise = CFG.SUPABASE_URL ? supabaseBackend() : Promise.resolve(demoBackend());
    return backendPromise;
  }

  root.PCW = Object.assign(root.PCW || {}, { backend, currentSlug, ApiError });
})(typeof window !== "undefined" ? window : globalThis);
