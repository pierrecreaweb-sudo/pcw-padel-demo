// Données du coach de démonstration (fictif). Mêmes contenus que supabase/seed_demo.sql.
// Les réservations d'exemple sont générées autour de la date du jour pour que le
// back-office de démo soit toujours vivant.
(function (root) {
  "use strict";
  const P = root.PCW;

  const COACH_ID = "c0ac0000-0000-4000-8000-000000000001";
  const L1 = "10c00000-0000-4000-8000-000000000001";
  const L2 = "10c00000-0000-4000-8000-000000000002";
  const S = (n) => `5e000000-0000-4000-8000-00000000000${n}`;

  function seed(now = new Date()) {
    const tz = "Europe/Paris";
    const coach = {
      id: COACH_ID, slug: "demo", display_name: "Lucas Ferrand", city: "Toulouse", status: "live",
      custom_domain: null, timezone: tz, min_notice_hours: 12, max_advance_days: 30, cancel_hours: 24,
      auto_confirm: true, buffer_minutes: 0, slot_step_minutes: 30, max_bookings_per_day: null,
      notify_email: "coach@exemple.fr", ical_token: "d3m0d3m0-0000-4000-8000-000000000000", review_requests: true,
    };
    const theme = {
      primary: "#0E2A52", accent: "#E4F55B", surface: "#F2F5F9",
      font_display: "Archivo", font_body: "Hanken Grotesk",
      logo_text: "LUCAS FERRAND", logo_url: null, hero_image: null, hero_image_2: null, portrait_image: null,
    };
    const content = {
      hero_title: "Coach de padel à Toulouse",
      hero_subtitle: "Cours individuels, duo et collectifs, prépa compétition. Réservez votre séance en ligne en 1 minute.",
      intro_title: "Bien plus qu'un coach : un partenaire de progression",
      intro: "J'accompagne les joueurs de tous niveaux avec une méthode simple : comprendre votre jeu, cibler deux ou trois axes de travail, et les mettre en place en situation réelle.",
      bio: "Ancien joueur classé dans le top 300 français, je coache depuis 2019 à Toulouse. Je suis titulaire du DE Padel et j'interviens dans deux clubs de l'agglomération.",
      philosophy: "Chaque séance a un objectif précis, annoncé au début et vérifié à la fin. Je préfère trois progrès solides à dix conseils oubliés.",
      diplomas: ["DE JEPS mention Padel", "Formation préparation mentale FFT", "PSC1 premiers secours"],
      achievements: ["Top 300 français (2021)", "Vainqueur P1000 Occitanie 2022", "+250 joueurs accompagnés"],
      specialties: ["Défense et sortie de vitre", "Jeu au filet et volée", "Tactique en double", "Préparation tournois FFT"],
      stats: [
        { value: "7 ans", label: "de coaching" },
        { value: "250+", label: "joueurs accompagnés" },
        { value: "2", label: "clubs à Toulouse" },
      ],
      phone: "06 12 34 56 78", email: "coach@exemple.fr", whatsapp: "33612345678", instagram: "https://instagram.com/",
      seo_title: "Lucas Ferrand, coach de padel à Toulouse | Réservation en ligne",
      seo_description: "Cours de padel individuels, duo et collectifs à Toulouse et Balma. Prépa compétition et analyse vidéo. Réservez votre séance en ligne.",
      legal_name: "Lucas Ferrand EI", siret: "000 000 000 00000",
      conditions_extra: "Une séance non annulée dans le délai, ou en cas d'absence, reste due. En cas de retard, la séance se termine à l'heure prévue.",
    };
    const locations = [
      { id: L1, coach_id: COACH_ID, name: "Padel Club Garonne", address: "12 chemin des Courts, 31200 Toulouse", maps_url: "https://maps.google.com/?q=Toulouse", position: 0, retro_mode: "per_hour", retro_value: 15 },
      { id: L2, coach_id: COACH_ID, name: "Le Patio Padel", address: "4 avenue du Stade, 31130 Balma", maps_url: "https://maps.google.com/?q=Balma", position: 1, retro_mode: "percent", retro_value: 20 },
    ];
    const services = [
      [1, "Coaching individuel", "Une heure en tête-à-tête pour travailler vos points faibles : technique, placement, lecture du jeu.", 60, 6000, 1, "Tous niveaux", "#1F6FEB"],
      [2, "Coaching duo", "Venez avec votre partenaire : automatismes, communication et tactique à deux.", 60, 8000, 2, "Tous niveaux", "#0E9F6E"],
      [3, "Coaching collectif", "Séance dynamique jusqu'à 4 joueurs : exercices, mises en situation et matchs à thème.", 90, 12000, 4, "Débutant à intermédiaire", "#D97706"],
      [4, "Prépa compétition", "Plan de jeu, gestion des points clés et préparation mentale avant un tournoi FFT.", 90, 9000, 2, "P100 et plus", "#B42318"],
      [5, "Analyse vidéo", "Analyse d'un de vos matchs filmés, débrief détaillé et plan de progression écrit.", 60, 7000, 1, "Tous niveaux", "#6E40C9"],
    ].map(([n, name, description, duration_minutes, price_cents, capacity, level, color], i) => ({
      id: S(n), coach_id: COACH_ID, name, description, duration_minutes, price_cents, capacity, level,
      location_id: null, color, active: true, position: i,
    }));
    const rules = [
      [1, "09:00", "12:00", L1], [1, "17:00", "21:00", L1], [2, "17:00", "21:00", L2],
      [3, "09:00", "12:00", L1], [3, "14:00", "20:00", L1], [4, "17:00", "21:00", L2],
      [5, "12:00", "14:00", L1], [5, "17:00", "20:00", L1], [6, "09:00", "13:00", L2],
    ].map(([weekday, s, e, loc], i) => ({
      id: `a7a00000-0000-4000-8000-0000000000${P.pad(i + 1)}`, coach_id: COACH_ID, weekday,
      start_time: s + ":00", end_time: e + ":00", location_id: loc,
    }));
    const testimonials = [
      ["Camille, joueuse P250", "En trois mois j'ai enfin compris où me placer en défense. Les séances sont exigeantes mais toujours claires."],
      ["Thomas et Julien", "Le coaching duo a changé notre façon de jouer ensemble. On communique beaucoup mieux sur le terrain."],
      ["Sophie, débutante", "Je partais de zéro. Lucas a su me mettre en confiance dès la première séance."],
    ].map(([author, text], i) => ({ id: `7e570000-0000-4000-8000-00000000000${i + 1}`, coach_id: COACH_ID, author, text, rating: 5, visible: true, position: i }));

    // Joueurs et réservations d'exemple.
    const names = [
      ["Camille", "Durand", "P250"], ["Thomas", "Morel", "P100"], ["Julien", "Garcia", "P100"], ["Sophie", "Lefebvre", "Débutante"],
      ["Nicolas", "Roux", "P500"], ["Léa", "Fournier", "P25"], ["Mathieu", "Girard", "P250"], ["Inès", "Bonnet", "Débutante"],
      ["Hugo", "Mercier", "P100"], ["Clara", "Lambert", "P25"], ["Antoine", "Faure", "P1000"], ["Manon", "Rousseau", "P100"],
      ["Yanis", "Chevalier", "P50"], ["Emma", "Blanc", "Débutante"], ["Lucas", "Perrin", "P100"], ["Chloé", "Robin", "P25"],
    ];
    const players = names.map(([first_name, last_name, level], i) => ({
      id: `9a000000-0000-4000-8000-0000000000${P.pad(i + 1)}`, coach_id: COACH_ID, first_name, last_name,
      email: `${first_name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}.${last_name.toLowerCase()}@exemple.fr`,
      phone: `06 ${P.pad(10 + i)} ${P.pad(20 + i * 3)} ${P.pad(30 + i * 2)} ${P.pad(40 + i)}`, level,
      notes: i === 0 ? "Travaille la défense derrière la vitre. Objectif P500 cette saison." : null,
      created_at: new Date(now.getTime() - Math.max(1, 400 - Math.max(0, i - 1) * 28) * 864e5).toISOString(),
    }));

    // Générateur pseudo-aléatoire déterministe : la démo est la même pour tout le monde le même jour.
    let x = 20261028;
    const rnd = () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
    const today = P.localYmd(now, tz);
    const bookings = [];
    const taken = [];
    const free = (s, e) => !taken.some(([a, b]) => s < b && a < e);
    for (let off = -400; off <= 12; off++) {
      const day = P.addDays(today, off);
      const wd = P.isoWeekday(day);
      for (const r of rules.filter((r) => r.weekday === wd)) {
        const w0 = +P.zonedToUtc(day, r.start_time.slice(0, 5), tz);
        const w1 = +P.zonedToUtc(day, r.end_time.slice(0, 5), tz);
        for (let s = w0; s < w1; s += 30 * 6e4) {
          // Activité qui monte doucement sur l'année écoulée (pour les statistiques).
          const ramp = off < -24 ? 0.16 + 0.14 * (1 + off / 400) : off < 0 ? 0.32 : off === 0 ? 0.5 : 0.22;
          if (rnd() > ramp) continue;
          const svc = services[Math.floor(rnd() * rnd() * services.length)];
          const e = s + svc.duration_minutes * 6e4;
          if (e > w1 || !free(s, e)) continue;
          taken.push([s, e]);
          // Les élèves arrivent au fil de l'année : un nouveau à peu près tous les mois.
          const known = Math.min(players.length, 2 + Math.floor((off + 400) / 28));
          const pl = players[Math.floor(rnd() * known)];
          const past = e < now.getTime();
          const status = past ? (rnd() < 0.06 ? "no_show" : "completed") : (off > 1 && rnd() < 0.18 ? "pending" : "confirmed");
          bookings.push({
            id: P.uuid(), coach_id: COACH_ID, service_id: svc.id, player_id: pl.id, location_id: r.location_id,
            service_name: svc.name, starts_at: new Date(s).toISOString(), ends_at: new Date(e).toISOString(),
            status, payment_status: past && status === "completed" ? (rnd() < 0.85 ? "paid" : "unpaid") : "unpaid",
            price_cents: svc.price_cents, party_size: Math.min(svc.capacity, 1 + Math.floor(rnd() * svc.capacity)),
            player_message: rnd() < 0.2 ? "Je voudrais travailler mon smash par 3." : null, coach_notes: null,
            source: rnd() < 0.7 ? "online" : "manual", cancel_token: P.uuid(), review_token: P.uuid(), cancelled_by: null,
            review_requested_at: past ? new Date(e + 2 * 36e5).toISOString() : null,
            created_at: new Date(s - (2 + rnd() * 6) * 864e5).toISOString(),
          });
        }
      }
    }
    // Une réservation annulée pour illustrer le statut.
    const fut = bookings.find((b) => b.status === "confirmed" && new Date(b.starts_at) > now);
    if (fut) bookings.push({ ...fut, id: P.uuid(), cancel_token: P.uuid(), review_token: P.uuid(), status: "cancelled", cancelled_by: "player", starts_at: fut.starts_at, player_id: players[5].id });

    // Une absence (tournoi) dans 9 jours.
    const offDay = P.addDays(today, 9);
    const time_off = [{
      id: "0ff00000-0000-4000-8000-000000000001", coach_id: COACH_ID, reason: "Tournoi P1000",
      starts_at: P.zonedToUtc(offDay, "08:00", tz).toISOString(), ends_at: P.zonedToUtc(offDay, "20:00", tz).toISOString(),
    }];

    // Galerie : emplacements stylisés (url vide) en démo, à remplacer par les photos du coach.
    const media = [
      "Coaching individuel au Padel Club Garonne", "Travail de la sortie de vitre", "Séance collective du samedi",
      "Prépa compétition avant un P1000", "Échauffement et placement", "Coaching duo : automatismes au filet",
      "Analyse vidéo d'un match", "Stage jeunes des vacances",
    ].map((caption, i) => ({ id: `3ed1a000-0000-4000-8000-00000000000${i + 1}`, coach_id: COACH_ID, url: "", caption, visible: true, position: i }));

    // Avis vérifiés laissés après les séances terminées.
    const COMMENTS = [
      [5, "Séance très claire, j'ai enfin compris comment sortir de la vitre. Hâte d'être à la prochaine !", "Merci ! On continue sur la sortie de vitre la semaine prochaine."],
      [5, "Super ambiance, exercices variés et adaptés à mon niveau.", null],
      [4, "Très bon coach, la séance est passée vite. J'aurais aimé un peu plus de jeu à la fin.", "Bien noté, on finira par 15 minutes de match la prochaine fois."],
      [5, null, null],
      [5, "Le travail au filet a tout changé pour notre duo. Merci Lucas !", null],
      [5, "Pédagogue et exigeant, exactement ce qu'il me fallait avant mon tournoi.", null],
      [4, "Bonne séance, conseils utiles. Le club était un peu bruyant ce soir-là.", null],
      [5, null, null],
      [3, "Séance correcte mais nous avons commencé en retard.", "Désolé pour le retard, le terrain précédent avait débordé. La prochaine sera rallongée."],
      [5, "Je recommande à tous les débutants, très patient.", null],
      [5, "Analyse vidéo très complète, avec un plan de travail écrit.", null],
      [4, null, null],
    ];
    const done = bookings.filter((b) => b.status === "completed").sort((a, b) => b.starts_at.localeCompare(a.starts_at));
    const reviews = [];
    for (let i = 0, k = 0; i < done.length && k < 34; i += 2, k++) {
      const b = done[i], pl = players.find((p) => p.id === b.player_id);
      const [rating, comment, reply] = COMMENTS[k % COMMENTS.length];
      const at = new Date(+new Date(b.ends_at) + (3 + k % 5) * 36e5).toISOString();
      reviews.push({
        id: `4e710000-0000-4000-8000-0000000000${P.pad(k + 1)}`, coach_id: COACH_ID, booking_id: b.id, player_id: pl.id,
        rating, comment: k < COMMENTS.length ? comment : (comment && k % 3 === 0 ? comment : null),
        author_name: `${pl.first_name} ${pl.last_name[0]}.`, service_name: b.service_name, session_date: P.localYmd(new Date(b.starts_at), tz),
        reply: k < COMMENTS.length ? reply : null, replied_at: reply && k < COMMENTS.length ? at : null,
        reported_at: null, report_reason: null, status: "published", created_at: at, updated_at: at,
      });
    }

    // Agenda Google du coach (démo) : quelques rendez-vous perso dans les prochains jours, sur des plages libres.
    const external_busy = [];
    for (let off = 1; off <= 12 && external_busy.length < 3; off++) {
      const day = P.addDays(today, off);
      const r = rules.find((x) => x.weekday === P.isoWeekday(day));
      if (!r) continue;
      for (let s = +P.zonedToUtc(day, r.start_time.slice(0, 5), tz); s + 36e5 <= +P.zonedToUtc(day, r.end_time.slice(0, 5), tz); s += 30 * 6e4) {
        if (free(s, s + 36e5)) {
          taken.push([s, s + 36e5]);
          external_busy.push({ id: external_busy.length + 1, coach_id: COACH_ID, starts_at: new Date(s).toISOString(), ends_at: new Date(s + 36e5).toISOString(), source: "google" });
          break;
        }
      }
      off += 1;
    }
    const calendar_imports = [{
      coach_id: COACH_ID, ics_url: "https://calendar.google.com/calendar/ical/lucas.ferrand.demo%40gmail.com/private-3f9cdemo/basic.ics",
      enabled: true, last_sync_at: new Date(now.getTime() - 7 * 6e4).toISOString(), last_error: null, events_count: external_busy.length,
    }];

    // Messages reçus via le formulaire de contact.
    const ago = (h) => new Date(now.getTime() - h * 36e5).toISOString();
    const contact_messages = [
      ["Romain Vidal", "romain.vidal@exemple.fr", "06 45 12 78 90", "Cours collectif",
        "Bonjour Lucas, nous sommes 4 amis niveau P50 et aimerions des cours collectifs le jeudi soir. Avez-vous de la place cet hiver ?", "new", 3],
      ["Élodie Marchand", "elodie.marchand@exemple.fr", null, "Stage",
        "Bonjour, organisez-vous un stage pendant les vacances de Noël pour les ados de 13-15 ans ? Merci !", "new", 20],
      ["Karim Benali", "karim.benali@exemple.fr", "07 61 22 33 48", "Cours individuel",
        "Je prépare mon premier P250 en décembre, est-ce possible de faire 3 séances rapprochées avant ?", "read", 70],
    ].map(([name, email, phone, subject, message, status, h], i) => ({
      id: `c0e70000-0000-4000-8000-00000000000${i + 1}`, coach_id: COACH_ID, name, email, phone, subject, message, status, created_at: ago(h),
    }));

    return {
      version: 7, seededOn: today,
      coaches: [coach],
      site_content: [{ coach_id: COACH_ID, theme, content }],
      locations, services, availability_rules: rules, time_off, players,
      bookings: bookings.sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
      testimonials, media, contact_messages, notifications: [], reviews, external_busy, calendar_imports,
    };
  }

  root.PCW_DEMO = { seed, COACH_ID };
})(typeof window !== "undefined" ? window : globalThis);
