// Traduction de l'interface : français (langue d'origine), espagnol, anglais.
// Chaque utilisateur choisit sa langue (sélecteur dans l'en-tête). Choix mémorisé, sinon langue du navigateur.
// Principe : les textes sont écrits en français dans les pages ; ce module remplace, au chargement et à chaque
// changement de la page, chaque texte connu par sa traduction (dictionnaires assets/lang/es.js et en.js).
// Les textes saisis par le coach (présentation, prestations, avis...) ne sont jamais traduits.
(function (root) {
  "use strict";
  var LANGS = { fr: "Français", es: "Español", en: "English" };
  var doc = root.document;
  var script = doc && doc.currentScript;
  var ver = "";
  try { ver = script && /\?(v=[^&]+)/.test(script.src) ? "?" + RegExp.$1 : ""; } catch (e) {}
  var base = script ? script.src.replace(/i18n\.js(\?.*)?$/, "") : "assets/";

  function detect() {
    try {
      var q = /[?&]lang=(fr|es|en)\b/.exec(root.location.search);
      if (q) { root.localStorage.setItem("pcw_lang", q[1]); return q[1]; }
    } catch (e) {}
    try { var s = root.localStorage.getItem("pcw_lang"); if (LANGS[s]) return s; } catch (e) {}
    var nav = (root.navigator && (root.navigator.languages || [root.navigator.language])) || [];
    for (var i = 0; i < nav.length; i++) {
      var l = String(nav[i] || "").slice(0, 2).toLowerCase();
      if (LANGS[l]) return l;
    }
    return "fr";
  }

  var lang = detect();
  var D = { exact: {}, rules: [], pats: [] };
  var LOCALE = { fr: "fr-FR", es: "es-ES", en: "en-GB" };

  var norm = function (s) { return String(s).replace(/[  ]/g, " ").replace(/\s+/g, " ").trim(); };
  var escRe = function (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); };

  // Ajout d'un dictionnaire. dict : { "texte français": "traduction" } ; une clé avec {} est un modèle
  // (chaque {} correspond à une valeur variable) ; la traduction y reprend {} dans le même ordre, ou {1} {2}.
  // rules : [ [/regex/, function (m) { return "..."; }] ] pour les pluriels et cas particuliers.
  function add(l, dict, rules) {
    if (l !== lang) return;
    Object.keys(dict).forEach(function (k) {
      var key = norm(k);
      if (key.indexOf("{}") < 0) { D.exact[key] = dict[k]; return; }
      var re = new RegExp("^" + key.split("{}").map(escRe).join("((?:[^.!?;]|\\d\\.\\d){1,90}?)") + "$");
      D.pats.push([re, dict[k]]);
    });
    (rules || []).forEach(function (r) { D.rules.push(r); });
  }

  function tr(text) {
    if (lang === "fr" || text == null) return text;
    var s = norm(text);
    if (!s) return text;
    var hit = D.exact[s];
    if (hit == null) {
      for (var i = 0; i < D.pats.length && hit == null; i++) {
        var m = D.pats[i][0].exec(s);
        if (m) { var n = 0; hit = D.pats[i][1].replace(/\{(\d*)\}/g, function (_, d) { var v = m[d ? +d : ++n]; return v != null ? tr(v) : ""; }); }
      }
      for (var j = 0; j < D.rules.length && hit == null; j++) {
        var mm = D.rules[j][0].exec(s);
        if (mm) hit = D.rules[j][1](mm);
      }
    }
    if (hit == null) return text;
    var lead = /^\s*/.exec(text)[0], trail = /\s*$/.exec(text)[0];
    return lead + hit + trail;
  }

  // ------------------------------------------------------- traduction du DOM ---
  var ATTRS = ["placeholder", "title", "aria-label", "alt", "content"];
  var SKIP = /^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|CODE|PRE)$/;
  var orig = typeof WeakMap !== "undefined" ? new WeakMap() : null;
  var busy = false, observer = null;

  function textNode(n) {
    if (!n.parentNode || SKIP.test(n.parentNode.nodeName) || (n.parentNode.closest && n.parentNode.closest("[data-notranslate]"))) return;
    var o = orig.get(n);
    if (o == null || (o.cur !== n.nodeValue)) { o = { fr: n.nodeValue, cur: n.nodeValue }; orig.set(n, o); }
    var t = lang === "fr" ? o.fr : tr(o.fr);
    if (t !== n.nodeValue) { n.nodeValue = t; }
    o.cur = n.nodeValue;
  }
  function attrs(el) {
    if (el.closest && el.closest("[data-notranslate]")) return;
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i];
      if (!el.hasAttribute(a)) continue;
      if (a === "content" && !(el.nodeName === "META" && /^(description|og:description|og:title)$/.test(el.getAttribute("name") || el.getAttribute("property") || ""))) continue;
      var key = "data-fr-" + a, cur = el.getAttribute(a);
      var o = el.getAttribute(key);
      if (o == null || el.__i18nCur !== cur) { o = cur; el.setAttribute(key, o); }
      var t = lang === "fr" ? o : tr(o);
      if (t !== cur) el.setAttribute(a, t);
      el.__i18nCur = el.getAttribute(a);
    }
  }
  function walk(node) {
    if (!node) return;
    if (node.nodeType === 3) { textNode(node); return; }
    if (node.nodeType !== 1) return;
    attrs(node);
    if (SKIP.test(node.nodeName)) return;
    for (var c = node.firstChild; c; c = c.nextSibling) walk(c);
  }
  function run(node) {
    if (!doc || !orig) return;
    busy = true;
    try { walk(node || doc.documentElement); } finally { busy = false; }
  }
  function start() {
    if (!doc || !orig || lang === "fr" && !doc.__langSwitched) { /* rien à traduire : on observe quand même pour permettre le changement */ }
    run();
    if (typeof MutationObserver === "undefined" || observer) return;
    observer = new MutationObserver(function (muts) {
      if (busy) return;
      busy = true;
      try {
        muts.forEach(function (m) {
          if (m.type === "childList") m.addedNodes.forEach(function (n) { walk(n); });
          else if (m.type === "characterData") textNode(m.target);
          else if (m.type === "attributes") attrs(m.target);
        });
      } finally { busy = false; }
    });
    observer.observe(doc.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }

  // ------------------------------------------------------- sélecteur de langue ---
  function title() {
    if (!doc) return;
    if (doc.__frTitle == null) doc.__frTitle = doc.title;
    var t = lang === "fr" ? doc.__frTitle : tr(doc.__frTitle);
    if (t !== doc.title) doc.title = t;
  }
  function setLang(l) {
    if (!LANGS[l]) return;
    try { root.localStorage.setItem("pcw_lang", l); } catch (e) {}
    // Les espaces connectés (back-office) peuvent mémoriser la langue côté serveur avant le rechargement.
    var wait = null;
    try { wait = root.PCW_ON_LANG ? root.PCW_ON_LANG(l) : null; } catch (e) {}
    if (wait && wait.then) {
      var done = false, go = function () { if (!done) { done = true; reload(); } };
      wait.then(go, go); setTimeout(go, 1500);
    } else reload();
  }
  function reload() {
    if (root.location) { var u = root.location.href.replace(/([?&])lang=[a-z]{2}&?/, "$1").replace(/[?&]$/, ""); root.location.replace(u); }
  }
  /** Sélecteur prêt à insérer dans un menu généré (back-office). */
  function switcherHtml(cls) {
    return '<select class="langsw ' + (cls || "") + '" data-langsw aria-label="Language" data-notranslate>' +
      Object.keys(LANGS).map(function (l) { return '<option value="' + l + '"' + (l === lang ? " selected" : "") + ">" + LANGS[l] + "</option>"; }).join("") + "</select>";
  }
  if (doc) doc.addEventListener("change", function (e) { var t = e.target; if (t && t.matches && t.matches("select[data-langsw]")) setLang(t.value); });
  function mountSwitcher() {
    if (!doc || doc.querySelector(".langsw")) return;
    var host = doc.querySelector(".topbar__in, .top__in");
    if (!host) return;
    var sel = doc.createElement("select");
    sel.className = "langsw"; sel.setAttribute("aria-label", "Language"); sel.setAttribute("data-notranslate", "");
    Object.keys(LANGS).forEach(function (l) {
      var o = doc.createElement("option"); o.value = l; o.textContent = LANGS[l]; if (l === lang) o.selected = true; sel.appendChild(o);
    });
    sel.addEventListener("change", function () { setLang(sel.value); });
    host.appendChild(sel);
  }

  /** Les liens vers la démo emportent la langue choisie (fr, es ou en). */
  function demoLinks() {
    if (!doc) return;
    var set = function () {
      var as = doc.querySelectorAll('a[href*="demo.pcwpadel.fr"]');
      for (var i = 0; i < as.length; i++) {
        var h = as[i].getAttribute("href").replace(/([?&])lang=[a-z]{2}&?/, "$1").replace(/[?&]$/, "");
        as[i].setAttribute("href", h + (h.indexOf("?") < 0 ? "?" : "&") + "lang=" + lang);
      }
    };
    set(); setTimeout(set, 600);
    if (lang !== "fr") { var nf = doc.querySelectorAll("[data-nonfr]"); for (var n = 0; n < nf.length; n++) nf[n].removeAttribute("hidden"); }
    // Captures d'écran localisées : media/xxx-fr.jpg devient media/xxx-<langue>.jpg
    var im = doc.querySelectorAll('img[src*="-fr.jpg"]');
    for (var j = 0; j < im.length; j++) im[j].setAttribute("src", im[j].getAttribute("src").replace("-fr.jpg", "-" + lang + ".jpg"));
    // La vidéo de présentation existe dans chaque langue (presentation-xx.mp4).
    var vs = doc.querySelectorAll("video source[data-vid]");
    for (var k = 0; k < vs.length; k++) {
      var src = vs[k].getAttribute("data-vid").replace("{lang}", lang);
      vs[k].setAttribute("src", src); if (vs[k].parentNode && vs[k].parentNode.load) vs[k].parentNode.load();
    }
  }

  var api = {
    lang: lang, LANGS: LANGS, locale: LOCALE[lang], tr: tr, add: add, run: run, setLang: setLang, switcherHtml: switcherHtml,
    start: function () { title(); mountSwitcher(); demoLinks(); start(); },
  };
  root.PCW_LANG = lang;
  root.PCW_I18N = api;
  if (doc) {
    try { doc.documentElement.lang = lang; } catch (e) {}
    if (lang !== "fr") {
      var only = script && script.hasAttribute("data-only");
      if (!only) doc.write('<script src="' + base + "lang/" + lang + ".js" + ver + '"><\/script>');
      var extra = script && script.getAttribute("data-dict");
      if (extra) extra.split(",").forEach(function (d) { doc.write('<script src="' + base + "lang/" + d + "-" + lang + ".js" + ver + '"><\/script>'); });
    }
    var go = function () { api.start(); };
    // Les dictionnaires sont chargés avant la fin du document : on traduit dès que la page est prête, puis en continu.
    if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", go); else go();
  }
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
