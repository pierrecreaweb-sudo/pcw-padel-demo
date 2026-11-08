// Outils communs : fuseaux horaires, formats français, calcul des créneaux (mode démo).
// Aucune dépendance. Utilisable dans le navigateur (window.PCW) et sous Node (tests).
(function (root) {
  "use strict";

  // ---------------------------------------------------------------- dates ---
  const pad = (n) => String(n).padStart(2, "0");
  const partsCache = new Map();
  function fmtParts(tz) {
    if (!partsCache.has(tz)) {
      partsCache.set(tz, new Intl.DateTimeFormat("en-GB", {
        timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit", weekday: "short",
      }));
    }
    return partsCache.get(tz);
  }
  const WD = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

  // Composantes d'un instant dans un fuseau donné.
  function tzParts(date, tz) {
    const o = {};
    for (const p of fmtParts(tz).formatToParts(date)) o[p.type] = p.value;
    return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour % 24, mi: +o.minute, s: +o.second, wd: WD[o.weekday] };
  }
  function tzOffsetMs(date, tz) {
    const p = tzParts(date, tz);
    return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(date.getTime() / 1000) * 1000;
  }
  // "2026-11-02" + "09:00" à Paris → instant UTC.
  function zonedToUtc(ymd, hm, tz) {
    const [y, m, d] = ymd.split("-").map(Number);
    const [h, mi] = hm.split(":").map(Number);
    const guess = Date.UTC(y, m - 1, d, h, mi);
    let t = guess - tzOffsetMs(new Date(guess), tz);
    const off2 = tzOffsetMs(new Date(t), tz);
    t = guess - off2;
    return new Date(t);
  }
  function localYmd(date, tz) {
    const p = tzParts(date, tz);
    return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
  }
  function localHm(date, tz) {
    const p = tzParts(date, tz);
    return `${pad(p.h)}:${pad(p.mi)}`;
  }
  function addDays(ymd, n) {
    const [y, m, d] = ymd.split("-").map(Number);
    const t = new Date(Date.UTC(y, m - 1, d + n));
    return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
  }
  function isoWeekday(ymd) {
    const [y, m, d] = ymd.split("-").map(Number);
    const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    return wd === 0 ? 7 : wd;
  }
  function diffDays(a, b) {
    const [y1, m1, d1] = a.split("-").map(Number);
    const [y2, m2, d2] = b.split("-").map(Number);
    return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 864e5);
  }
  function mondayOf(ymd) { return addDays(ymd, 1 - isoWeekday(ymd)); }

  // ------------------------------------------------------------ formats FR ---
  const DAYS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
  const DAYS_SHORT = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];
  const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const MONTHS_SHORT = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  function fmtTime(date, tz) {
    const p = tzParts(new Date(date), tz);
    return `${p.h}h${pad(p.mi)}`;
  }
  function hmLabel(hm) { const [h, m] = hm.split(":"); return `${+h}h${m}`; }
  function fmtYmd(ymd, style) {
    const [, m, d] = ymd.split("-").map(Number);
    const wd = isoWeekday(ymd) - 1;
    if (style === "short") return `${DAYS_SHORT[wd]} ${d} ${MONTHS_SHORT[m - 1]}`;
    if (style === "day") return `${cap(DAYS[wd])} ${d}`;
    return `${cap(DAYS[wd])} ${d} ${MONTHS[m - 1]}`;
  }
  function fmtDate(date, tz, style) { return fmtYmd(localYmd(new Date(date), tz), style); }
  function fmtPrice(cents) {
    if (cents == null) return "";
    const v = cents / 100;
    return (Number.isInteger(v) ? String(v) : v.toFixed(2).replace(".", ",")) + " €";
  }
  function fmtDuration(min) {
    const h = Math.floor(min / 60), m = min % 60;
    return h ? (m ? `${h}h${pad(m)}` : `${h}h`) : `${m} min`;
  }

  // ------------------------------------------------- calcul des créneaux ---
  // Même logique que la fonction SQL compute_slots (mode démo uniquement).
  function overlaps(a0, a1, b0, b1) { return a0 < b1 && b0 < a1; }

  function computeSlots(opts) {
    const { coach, service, rules, timeOff, bookings, from, to, now = new Date() } = opts;
    if (!service || !service.active) return [];
    const tz = coach.timezone;
    const dur = service.duration_minutes * 6e4;
    const buf = (coach.buffer_minutes || 0) * 6e4;
    const step = coach.slot_step_minutes * 6e4;
    const minT = now.getTime() + coach.min_notice_hours * 36e5;
    const maxT = now.getTime() + coach.max_advance_days * 864e5;
    const active = bookings.filter((b) => b.status === "pending" || b.status === "confirmed")
      .map((b) => ({ s: +new Date(b.starts_at), e: +new Date(b.ends_at) + buf, day: localYmd(new Date(b.starts_at), tz) }));
    const off = timeOff.map((t) => ({ s: +new Date(t.starts_at), e: +new Date(t.ends_at) }));
    const perDay = {};
    for (const b of active) perDay[b.day] = (perDay[b.day] || 0) + 1;

    const out = new Map();
    const last = diffDays(from, to) > 62 ? addDays(from, 62) : to;
    for (let day = from; day <= last; day = addDays(day, 1)) {
      const wd = isoWeekday(day);
      if (coach.max_bookings_per_day && (perDay[day] || 0) >= coach.max_bookings_per_day) continue;
      for (const r of rules) {
        if (r.weekday !== wd) continue;
        if (service.location_id && r.location_id && r.location_id !== service.location_id) continue;
        const w0 = +zonedToUtc(day, r.start_time.slice(0, 5), tz);
        const w1 = +zonedToUtc(day, r.end_time.slice(0, 5), tz);
        for (let s = w0; s + dur <= w1; s += step) {
          if (s < minT || s > maxT || out.has(s)) continue;
          const e = s + dur;
          if (off.some((t) => overlaps(s, e, t.s, t.e))) continue;
          if (active.some((b) => overlaps(s, e + buf, b.s, b.e))) continue;
          out.set(s, { starts_at: new Date(s).toISOString(), ends_at: new Date(e).toISOString(), location_id: r.location_id || service.location_id || null });
        }
      }
    }
    return [...out.values()].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }

  // ------------------------------------------------------------- divers ---
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function uuid() {
    if (root.crypto && root.crypto.randomUUID) return root.crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  }
  function storage() {
    try { const k = "__pcw"; root.localStorage.setItem(k, "1"); root.localStorage.removeItem(k); return root.localStorage; }
    catch { return null; }
  }
  function googleCalendarUrl({ title, start, end, details, location }) {
    const f = (d) => new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const p = new URLSearchParams({ action: "TEMPLATE", text: title, dates: `${f(start)}/${f(end)}`, details: details || "", location: location || "" });
    return `https://calendar.google.com/calendar/render?${p}`;
  }

  // ------------------------------------------------------ thème du coach ---
  // Polices proposées aux coachs (toutes sur Google Fonts, avec les graisses utiles).
  const FONTS = {
    "Archivo": "Archivo:wdth,wght@62..125,400..900",
    "Barlow Condensed": "Barlow+Condensed:wght@500;600;700;800;900",
    "Bricolage Grotesque": "Bricolage+Grotesque:opsz,wght@12..96,400..800",
    "Anton": "Anton",
    "Oswald": "Oswald:wght@400..700",
    "Montserrat": "Montserrat:wght@400..900",
    "Sora": "Sora:wght@400..800",
    "Hanken Grotesk": "Hanken+Grotesk:wght@400;500;600;700",
    "DM Sans": "DM+Sans:opsz,wght@9..40,400..800",
    "Figtree": "Figtree:wght@400..800",
    "Nunito Sans": "Nunito+Sans:opsz,wght@6..12,400..800",
    "Lexend": "Lexend:wght@400..800",
  };
  function fontsUrl(display, body) {
    const fams = [...new Set([display, body])].filter((f) => FONTS[f]).map((f) => "family=" + FONTS[f]);
    if (!fams.length) fams.push("family=" + FONTS["Archivo"], "family=" + FONTS["Hanken Grotesk"]);
    return `https://fonts.googleapis.com/css2?${fams.join("&")}&display=swap`;
  }
  function hexToRgb(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "").trim());
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(a, b, t) {
    const A = hexToRgb(a), B = hexToRgb(b);
    if (!A || !B) return a;
    return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
  }
  // Texte lisible (blanc ou encre) sur une couleur donnée.
  // Icône de l'onglet : celle du coach (favicon, sinon logo), sinon une balle aux couleurs du site.
  // Sans thème (console PCW, connexion) : la balle PCW.
  // Liens légaux identiques sur toutes les pages publiques d'un site coach (hors accueil, qui a son propre pied de page).
  function legalFooter() {
    if (typeof document === "undefined" || document.querySelector("footer")) return;
    if (/\/(admin|mon-espace)/.test(location.pathname)) return;
    const q = location.search || "";
    const f = document.createElement("footer");
    f.className = "footer footer--legal";
    f.innerHTML = `<div class="wrap footer__in"><a href="/conditions.html${q}#mentions">Mentions légales</a>` +
      `<a href="/conditions.html${q}#donnees">Politique de confidentialité</a><a href="/conditions.html${q}">Conditions de réservation</a></div>`;
    document.body.appendChild(f);
  }
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", legalFooter); else legalFooter();
  }
  function setFavicon(theme) {
    if (typeof document === "undefined") return;
    const t = theme || {};
    const hex = (v, d) => (/^#[0-9a-f]{6}$/i.test(String(v || "")) ? v : d);
    const ok = (u) => (/^(https:\/\/|data:image\/)/i.test(String(u || "")) ? u : "");
    const own = ok(t.favicon_url) || ok(t.logo_url);
    const href = own || "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${hex(t.primary, "#0E2A52")}"/><circle cx="32" cy="32" r="16" fill="${hex(t.accent, "#E4F55B")}"/></svg>`);
    document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]').forEach((l) => l.remove());
    for (const rel of ["icon", "apple-touch-icon"]) {
      const l = document.createElement("link");
      l.rel = rel; l.href = href;
      document.head.appendChild(l);
    }
  }

  function readableOn(hex) {
    const c = hexToRgb(hex);
    if (!c) return "#FFFFFF";
    const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return L > 0.179 ? "#0B1830" : "#FFFFFF";
  }

  // Adresse d'agenda à importer : Google, iCloud ou Outlook uniquement (même règle que le serveur).
  const CAL_HOSTS = [/^calendar\.google\.com$/, /^p\d+-caldav\.icloud\.com$/, /^outlook\.(office365|live)\.com$/, /^outlook\.office\.com$/];
  function normalizeCalendarUrl(raw) {
    let s = String(raw || "").trim();
    if (/^webcals?:\/\//i.test(s)) s = s.replace(/^webcals?:\/\//i, "https://");
    let u;
    try { u = new URL(s); } catch { return null; }
    if (u.protocol !== "https:" || !CAL_HOSTS.some((re) => re.test(u.hostname))) return null;
    return u.toString();
  }

  // Recadrage d'une photo : point gardé au centre (x, y en %) et zoom (1 à 3).
  // Appliqué à l'affichage par des variables CSS, la photo d'origine n'est pas modifiée.
  function normCrop(c) {
    if (!c || typeof c !== "object") return null;
    const n = (v, lo, hi, d) => { v = Number(v); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
    const o = { x: Math.round(n(c.x, 0, 100, 50) * 10) / 10, y: Math.round(n(c.y, 0, 100, 50) * 10) / 10, z: Math.round(n(c.z, 0.3, 3, 1) * 100) / 100 };
    return o.x === 50 && o.y === 50 && o.z === 1 ? null : o;
  }
  function cropStyle(c) {
    const o = normCrop(c);
    return o ? ` style="--fx:${o.x}%;--fy:${o.y}%;--fz:${o.z}"` : "";
  }

  const api = {
    normCrop, cropStyle, FONTS, fontsUrl, hexToRgb, mix, readableOn, setFavicon, normalizeCalendarUrl,
    pad, tzParts, zonedToUtc, localYmd, localHm, addDays, isoWeekday, diffDays, mondayOf,
    DAYS, DAYS_SHORT, MONTHS, cap, fmtTime, hmLabel, fmtYmd, fmtDate, fmtPrice, fmtDuration,
    computeSlots, overlaps, esc, uuid, storage, googleCalendarUrl,
  };
  root.PCW = Object.assign(root.PCW || {}, api);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
