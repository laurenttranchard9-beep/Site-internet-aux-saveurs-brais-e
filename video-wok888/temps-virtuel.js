// Horloge virtuelle injectée dans les pages du site (pas dans la composition) : le film avance image par image,
// et chaque image montre le site exactement à l'instant voulu, quel que soit le temps de calcul.
// Minuteurs, requestAnimationFrame, Date et performance.now suivent l'horloge virtuelle ; les animations CSS et
// Web Animations sont figées (vitesse 0 via le protocole de débogage) puis placées au bon instant à chaque image.
(() => {
  if (location.port !== "8765" || window.__tv) return;
  const EPOQUE = Date.parse("2026-10-30T18:30:00Z"); // vendredi, 19 h 30 à Paris : le restaurant est ouvert
  const DateReelle = Date;
  let maintenant = 0; // millisecondes virtuelles depuis le chargement
  let numero = 1;
  const minuteurs = new Map();
  let images = new Map();

  // Hasard reproductible : le même film à chaque rendu (machine 888, fortune cookie…)
  let graine = 888;
  Math.random = () => {
    graine = (graine + 0x6d2b79f5) | 0;
    let x = Math.imul(graine ^ (graine >>> 15), 1 | graine);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };

  class DateVirtuelle extends DateReelle {
    constructor(...a) { if (a.length) super(...a); else super(EPOQUE + maintenant); }
    static now() { return EPOQUE + maintenant; }
  }
  window.Date = DateVirtuelle;
  performance.now = () => maintenant;
  window.setTimeout = (fn, ms, ...args) => {
    const id = numero++;
    minuteurs.set(id, { quand: maintenant + Math.max(0, Number(ms) || 0), fn, args });
    return id;
  };
  window.setInterval = (fn, ms, ...args) => {
    const id = numero++;
    const pas = Math.max(1, Number(ms) || 0);
    minuteurs.set(id, { quand: maintenant + pas, fn, args, pas });
    return id;
  };
  window.clearTimeout = window.clearInterval = (id) => minuteurs.delete(id);
  window.requestAnimationFrame = (fn) => { const id = numero++; images.set(id, fn); return id; };
  window.cancelAnimationFrame = (id) => images.delete(id);
  window.requestIdleCallback = (fn) => window.setTimeout(() => fn({ didTimeout: false, timeRemaining: () => 10 }), 1);
  window.cancelIdleCallback = window.clearTimeout;

  // Défilements « smooth » du site : rejoués en temps virtuel (sinon le navigateur les fait en temps réel)
  let tween = null;
  const defiler = (y, duree = 650) => {
    const max = document.documentElement.scrollHeight - innerHeight;
    tween = { de: scrollY, a: Math.max(0, Math.min(max, y)), debut: maintenant, duree };
  };
  const scrollToNatif = window.scrollTo.bind(window);
  window.scrollTo = function (a, b) {
    if (a && typeof a === "object") {
      const y = a.top ?? scrollY;
      if (a.behavior === "smooth") return defiler(y);
      return scrollToNatif(0, y);
    }
    return scrollToNatif(a, b);
  };
  const scrollIntoViewNatif = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = function (o) {
    if (!o || typeof o !== "object" || o.behavior !== "smooth") return scrollIntoViewNatif.call(this, o);
    const r = this.getBoundingClientRect();
    const marge = parseFloat(getComputedStyle(this).scrollMarginTop) || 0;
    if (o.block === "nearest" && r.top >= 0 && r.bottom <= innerHeight) return;
    const y = o.block === "nearest" && r.bottom > innerHeight ? scrollY + r.bottom - innerHeight + 16 : scrollY + r.top - marge;
    defiler(y);
  };
  const lisse = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

  const suivies = new WeakMap();
  function placerAnimations(dt) {
    for (const a of document.getAnimations()) {
      if (a.playState === "idle") continue;
      let s = suivies.get(a);
      const lu = a.currentTime;
      if (!s) {
        s = { local: lu ?? 0, pose: null };
        suivies.set(a, s);
      } else {
        if (lu !== null && s.pose !== null && Math.abs(lu - s.pose) > 0.5) s.local = lu; // la page l'a repositionnée
        if (a.playState !== "paused") s.local += dt * (a.playbackRate || 0);
      }
      try { a.currentTime = s.local; } catch { /* animation sans durée */ }
      s.pose = a.currentTime;
    }
  }

  window.__tv = {
    get maintenant() { return maintenant; },
    // Avance jusqu'à t (ms virtuelles) : minuteurs dans l'ordre, puis une image, puis les animations
    aller(t) {
      const avant = maintenant;
      for (;;) {
        let id = null, m = null;
        for (const [i, x] of minuteurs) if (x.quand <= t && (!m || x.quand < m.quand)) { id = i; m = x; }
        if (!m) break;
        maintenant = Math.max(maintenant, m.quand);
        if (m.pas) m.quand += m.pas; else minuteurs.delete(id);
        try { if (typeof m.fn === "function") m.fn(...m.args); } catch (e) { console.error(e); }
      }
      maintenant = Math.max(maintenant, t);
      if (tween) {
        const p = Math.min(1, (maintenant - tween.debut) / tween.duree);
        scrollToNatif(0, tween.de + (tween.a - tween.de) * lisse(p));
        if (p >= 1) tween = null;
      }
      const fns = images;
      images = new Map();
      for (const fn of fns.values()) { try { fn(maintenant); } catch (e) { console.error(e); } }
      placerAnimations(maintenant - avant);
    },
    defiler,
    // Élément visé : premier qui correspond au sélecteur (et contient « texte », si indiqué) ; « cible » : un enfant
    trouver({ sel, texte, cible }) {
      let el = [...document.querySelectorAll(sel)].find((e) => !texte || e.textContent.includes(texte));
      if (el && cible) el = el.querySelector(cible);
      if (!el) throw new Error(`introuvable : ${sel} ${texte || ""}`);
      return el;
    },
    // Centre d'un élément dans la fenêtre du site (pour dessiner le toucher dans la composition)
    centre(a) {
      const r = this.trouver(a).getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    },
    boite(a) {
      const r = this.trouver(a).getBoundingClientRect();
      return { x: r.left, y: r.top, l: r.width, h: r.height };
    },
    defilerDe(dy, duree) { defiler(scrollY + dy, duree); },
    defilerVers(a, marge, duree) {
      const el = this.trouver(a);
      defiler(scrollY + el.getBoundingClientRect().top - marge, duree);
    },
    cliquer(a) { this.trouver(a).click(); },
    // Frappe lettre par lettre dans un champ (événements « input », puis « change » si « valider »)
    taper(a) {
      const el = this.trouver(a);
      el.focus();
      if (a.remplacer) el.value = "";
      const pas = a.pas ?? 110;
      [...a.saisie].forEach((c, i) => window.setTimeout(() => {
        el.value += c;
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }, i * pas));
      if (a.valider) window.setTimeout(() => { el.dispatchEvent(new Event("change", { bubbles: true })); el.blur(); }, a.saisie.length * pas + 250);
    },
    // Toutes les animations déjà créées au chargement repartent de zéro : l'horloge virtuelle n'a pas encore tourné
    remettreAZero() {
      for (const a of document.getAnimations()) {
        suivies.set(a, { local: 0, pose: null });
        try { a.currentTime = 0; } catch { /* sans durée */ }
      }
    },
  };

  document.cookie = "wok888_cookies=non; Path=/; SameSite=Lax"; // pas de bannière de consentement dans le film
  addEventListener("DOMContentLoaded", () => { document.documentElement.style.scrollBehavior = "auto"; });
})();
