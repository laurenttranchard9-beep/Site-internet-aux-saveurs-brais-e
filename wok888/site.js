// WOK 888 : carte (api.php), wok à composer, machine 888, fortune cookie, horaires en direct, réservation et animations.
(() => {
  "use strict";

  // ---------- Outils ----------
  const $ = (sel, racine = document) => racine.querySelector(sel);
  const $$ = (sel, racine = document) => [...racine.querySelectorAll(sel)];
  const SVG = "http://www.w3.org/2000/svg";
  const el = (tag, cls, texte) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (texte !== undefined) n.textContent = typo(String(texte));
    return n;
  };
  const svg = (tag, attributs = {}) => {
    const n = document.createElementNS(SVG, tag);
    for (const [cle, valeur] of Object.entries(attributs)) n.setAttribute(cle, valeur);
    return n;
  };
  const icone = (id, cls) => {
    const s = svg("svg", { "aria-hidden": "true" });
    if (cls) s.setAttribute("class", cls);
    s.append(svg("use", { href: `#${id}` }));
    return s;
  };
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/œ/g, "oe").replace(/æ/g, "ae").trim();
  // Typographie française : espace insécable avant « : ; ! ? » et à l'intérieur des guillemets
  const typo = (s) => s.replace(/ ([:;!?»])/g, "\u00a0$1").replace(/« /g, "«\u00a0");
  const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
  const prix = (c) => (c === null ? "Sur demande" : euros.format(c / 100));
  const prixOption = (c) => (c ? `+ ${euros.format(c / 100)}` : "Inclus");
  // Animations réduites (classe « sobre », posée par intro.js) : choix du visiteur
  const sobre = { get matches() { return document.documentElement.classList.contains("sobre"); } };
  const pointeurFin = matchMedia("(hover: hover) and (pointer: fine)");
  const alea = (n) => (((Math.sin(n * 12.9898) * 43758.5453) % 1) + 1) % 1; // pseudo-hasard stable
  const auHasard = (liste) => liste[Math.floor(Math.random() * liste.length)];
  const stockage = {
    lire(cle, defaut) {
      try {
        const v = localStorage.getItem(cle);
        return v === null ? defaut : JSON.parse(v);
      } catch {
        return defaut;
      }
    },
    ecrire(cle, valeur) {
      try {
        localStorage.setItem(cle, JSON.stringify(valeur));
      } catch {
        /* stockage indisponible (navigation privée…) : la page fonctionne sans */
      }
    },
  };
  const TEL = "05 61 58 06 97";
  const RESERVATION = "https://wok-888-1749636011.resos.com/booking";
  // Étiquettes particulières de l'espace de gestion (voir inc/carte.php)
  const ETIQUETTE = { une: "a la une", base: "base", supplement: "supplement" };
  const SPECIALES = new Set(Object.values(ETIQUETTE));
  const a = (p, etiquette) => p.cles.includes(ETIQUETTE[etiquette]);
  // Plat que la machine 888 peut tirer : ni épuisé, ni sans prix, ni base ou option du wok
  const disponible = (p) => !p.soldOut && p.priceCents !== null && !a(p, "base") && !a(p, "supplement");

  document.documentElement.classList.add("revele"); // les blocs [data-revele] apparaissent au défilement

  async function lire(url) {
    const rep = await fetch(url, { cache: "no-store" });
    if (!rep.ok) throw new Error(String(rep.status));
    return rep.json();
  }

  const annonce = $("#annonce");
  const annoncer = (texte) => {
    annonce.textContent = "";
    requestAnimationFrame(() => (annonce.textContent = texte));
  };

  // ---------- En-tête ----------
  const entete = $("#entete");
  const majEntete = () => entete.classList.toggle("colle", scrollY > 24);
  addEventListener("scroll", majEntete, { passive: true });
  majEntete();

  const liensNav = $$(".nav a");
  const suiviSections = new IntersectionObserver((entrees) => {
    for (const e of entrees) {
      if (!e.isIntersecting) continue;
      liensNav.forEach((l) => l.classList.toggle("actif", l.getAttribute("href") === `#${e.target.id}`));
    }
  }, { rootMargin: "-45% 0px -50% 0px" });
  liensNav.forEach((l) => {
    const cible = document.querySelector(l.getAttribute("href"));
    if (cible) suiviSections.observe(cible);
  });

  // ---------- Apparitions et compteurs au défilement ----------
  function compter(n) {
    const cible = Number(n.dataset.compteur);
    if (!Number.isFinite(cible)) return;
    if (sobre.matches) return void (n.textContent = cible);
    const debut = performance.now();
    const duree = 1300;
    const pas = (t) => {
      const x = Math.min(1, (t - debut) / duree);
      n.textContent = Math.round(cible * (1 - Math.pow(1 - x, 3)));
      if (x < 1) requestAnimationFrame(pas);
    };
    requestAnimationFrame(pas);
  }
  const apparitions = new IntersectionObserver((entrees) => {
    for (const e of entrees) {
      if (!e.isIntersecting) continue;
      e.target.classList.add("visible");
      $$("[data-compteur]", e.target).forEach(compter);
      apparitions.unobserve(e.target);
    }
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  const observerApparitions = (racine = document) => $$("[data-revele]:not(.visible)", racine).forEach((n) => apparitions.observe(n));
  observerApparitions();

  // ---------- Titres : les mots montent un à un quand le bloc apparaît ----------
  function decouperTitre(titre) {
    if (sobre.matches) return;
    let i = 0;
    const morceaux = [];
    const ajouterMot = (contenu) => {
      const mot = el("span", "mot");
      mot.append(contenu);
      mot.style.setProperty("--i", i++);
      morceaux.push(mot);
    };
    for (const noeud of [...titre.childNodes]) {
      if (noeud.nodeType !== Node.TEXT_NODE) {
        ajouterMot(noeud); // « 888 » de la machine : déjà dans son élément
        continue;
      }
      for (const partie of noeud.textContent.split(/([ \n\t]+)/)) {
        if (!partie) continue;
        if (!partie.trim()) {
          morceaux.push(document.createTextNode(" "));
          continue;
        }
        const texte = document.createElement("span");
        texte.textContent = partie;
        ajouterMot(texte);
      }
    }
    titre.replaceChildren(...morceaux);
  }
  $$(".section-tete h2, .wokhei-texte h2, .machine-texte h2, .reserver-contenu h2, .fortune-texte h2").forEach(decouperTitre);

  // ---------- Braises de l'accueil ----------
  let jaillir = () => {}; // gerbe d'étincelles quand on fait sauter le wok (définie par braises())
  (function braises() {
    const toile = $("#braises");
    const ctx = toile.getContext("2d");
    if (!ctx || sobre.matches) return;
    const scene = $(".heros-scene");
    const sprites = ["255,244,214", "183,240,206", "255,196,92"].map((rvb) => {
      const c = document.createElement("canvas");
      c.width = c.height = 32;
      const g = c.getContext("2d");
      const d = g.createRadialGradient(16, 16, 0, 16, 16, 16);
      d.addColorStop(0, "rgba(255,255,255,1)");
      d.addColorStop(0.25, `rgba(${rvb},.95)`);
      d.addColorStop(1, `rgba(${rvb},0)`);
      g.fillStyle = d;
      g.fillRect(0, 0, 32, 32);
      return c;
    });
    let largeur = 0, hauteur = 0, ratio = 1, foyer = { x: 0, y: 0, l: 200 };
    let particules = [];
    let actif = false;
    const N = innerWidth < 700 ? 34 : 70;
    function dimensionner() {
      const r = toile.getBoundingClientRect();
      ratio = Math.min(devicePixelRatio || 1, 2);
      largeur = r.width;
      hauteur = r.height;
      toile.width = Math.round(largeur * ratio);
      toile.height = Math.round(hauteur * ratio);
      const s = scene.getBoundingClientRect();
      foyer = { x: s.left - r.left + s.width * 0.52, y: s.top - r.top + s.height * 0.82, l: s.width * 0.55 };
    }
    const nouvelle = () => ({
      x: foyer.x + (Math.random() - 0.5) * foyer.l,
      y: foyer.y - Math.random() * 30,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -(0.5 + Math.random() * 1.7),
      vie: 0,
      duree: 100 + Math.random() * 160,
      taille: 4 + Math.random() * 12,
      phase: Math.random() * 100,
      sprite: auHasard(sprites),
    });
    function boucle() {
      if (!actif) return;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, largeur, hauteur);
      ctx.globalCompositeOperation = "lighter";
      while (particules.length < N) particules.push(nouvelle());
      for (const p of particules) {
        p.vie++;
        p.x += p.vx + Math.sin((p.vie + p.phase) * 0.05) * 0.4;
        p.y += p.vy;
        const t = p.vie / p.duree;
        ctx.globalAlpha = Math.max(0, t < 0.1 ? t * 10 : 1 - t) * 0.85;
        const s = p.taille * (1 - t * 0.5);
        ctx.drawImage(p.sprite, p.x - s / 2, p.y - s / 2, s, s);
      }
      particules = particules.filter((p) => p.vie < p.duree && p.y > -20);
      requestAnimationFrame(boucle);
    }
    const demarrer = () => {
      if (actif || document.hidden) return;
      actif = true;
      dimensionner();
      requestAnimationFrame(boucle);
    };
    jaillir = (nombre) => {
      if (!actif) return;
      for (let i = 0; i < nombre; i++) {
        const p = nouvelle();
        p.vx = (Math.random() - 0.5) * 2.6;
        p.vy = -(2.4 + Math.random() * 3.4);
        p.duree = 60 + Math.random() * 90;
        particules.push(p);
      }
    };
    new IntersectionObserver(([e]) => (e.isIntersecting ? demarrer() : (actif = false))).observe($("#accueil"));
    document.addEventListener("visibilitychange", () => (document.hidden ? (actif = false) : demarrer()));
    addEventListener("resize", () => actif && dimensionner());
  })();

  // ---------- Horaires en direct (heure de Seilh, quel que soit le fuseau de l'appareil) ----------
  // À modifier avec le tableau des horaires de index.html. 0 = dimanche … 6 = samedi ; fermé le lundi.
  const SERVICE = [12 * 60, 22 * 60 + 30];
  const CRENEAUX = [[SERVICE], [], [SERVICE], [SERVICE], [SERVICE], [SERVICE], [SERVICE]];
  const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  const hm = (m) => `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`;

  function heureLocale(date = new Date()) {
    const p = {};
    const format = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    for (const { type, value } of format.formatToParts(date)) p[type] = value;
    return { jour: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday), minutes: (Number(p.hour) % 24) * 60 + Number(p.minute) };
  }

  function statut({ jour, minutes }) {
    const enCours = CRENEAUX[jour].find(([debut, fin]) => minutes >= debut && minutes < fin);
    if (enCours) {
      const bientot = enCours[1] - minutes <= 30;
      return { ouvert: true, bientot, texte: bientot ? `Ferme bientôt · à ${hm(enCours[1])}` : `Ouvert · jusqu'à ${hm(enCours[1])}` };
    }
    for (let d = 0; d <= 7; d++) {
      const j = (jour + d) % 7;
      const suivant = CRENEAUX[j].find(([debut]) => d > 0 || debut > minutes);
      if (suivant) {
        const quand = d === 0 ? `à ${hm(suivant[0])}` : d === 1 ? `demain à ${hm(suivant[0])}` : `${JOURS[j]} à ${hm(suivant[0])}`;
        return { ouvert: false, bientot: false, texte: `Fermé · ouvre ${quand}` };
      }
    }
    return { ouvert: false, bientot: false, texte: "Fermé" };
  }

  function majHoraires() {
    const maintenant = heureLocale();
    const s = statut(maintenant);
    document.documentElement.classList.toggle("ouvert-maintenant", s.ouvert);
    $$("[data-statut]").forEach((n) => {
      if (n.textContent !== s.texte) n.textContent = s.texte; // évite de répéter l'annonce aux lecteurs d'écran
      n.classList.toggle("ouvert", s.ouvert && !s.bientot);
      n.classList.toggle("bientot", s.bientot);
      n.classList.toggle("ferme", !s.ouvert);
    });
    $$(".horaires tr[data-jour]").forEach((tr) => {
      const aujourdhui = Number(tr.dataset.jour) === maintenant.jour;
      tr.classList.toggle("aujourdhui", aujourdhui);
      if (aujourdhui) tr.setAttribute("aria-current", "date");
      else tr.removeAttribute("aria-current");
    });
  }

  // ---------- La carte (api.php) ----------
  let univers = []; // [{ cle, nom, categories: [{ id, name, sousNom, note, products }] }]
  const produits = new Map(); // id → { p, c }
  let wok = null; // catégorie du wok à composer : { categorie, garnitures, bases, supplements }
  let empreinte = "";

  function analyser(donnees) {
    produits.clear();
    univers = [];
    const parCle = new Map();
    for (const c of donnees.categories) {
      const i = c.name.indexOf(" · ");
      const nomUnivers = i > 0 ? c.name.slice(0, i) : c.name;
      const cle = norm(nomUnivers);
      if (!parCle.has(cle)) {
        const u = { cle, nom: nomUnivers, categories: [] };
        parCle.set(cle, u);
        univers.push(u);
      }
      const u = parCle.get(cle);
      const categorie = { ...c, sousNom: i > 0 ? c.name.slice(i + 3) : c.name, univers: u };
      u.categories.push(categorie);
      for (const p of c.products) {
        p.cles = p.tags.map(norm);
        produits.set(p.id, { p, c: categorie });
      }
    }
    wok = null;
    for (const c of univers.flatMap((u) => u.categories)) {
      const bases = c.products.filter((p) => a(p, "base"));
      if (!bases.length) continue;
      wok = {
        categorie: c,
        bases,
        supplements: c.products.filter((p) => a(p, "supplement")),
        garnitures: c.products.filter((p) => !a(p, "base") && !a(p, "supplement")),
      };
      break;
    }
  }

  async function chargerCarte() {
    try {
      const rep = await fetch("api.php?action=menu", { cache: "no-store" });
      if (!rep.ok) throw new Error(String(rep.status));
      const texte = await rep.text();
      if (texte === empreinte) return; // rien n'a changé : on ne redessine pas
      const premiere = !empreinte;
      empreinte = texte;
      analyser(JSON.parse(texte));
      rendreCarte(premiere);
      rendreComposeur();
      rendreUne();
      preparerMachine();
    } catch {
      if (!univers.length) {
        const lien = el("a", "", TEL);
        lien.href = "tel:+33561580697";
        $("#etat").replaceChildren("La carte ne peut pas s'afficher pour le moment. Appelez-nous au ", lien, ".");
      }
    }
  }

  // ---------- Rendu de la carte ----------
  const ICONES_UNIVERS = {
    entrees: "u-entrees", "cote wok": "u-wok", "poke bowls": "u-poke", "nos plats": "u-plats",
    japonais: "u-japonais", menus: "u-menus", desserts: "u-desserts", boissons: "u-boissons",
  };
  const outils = $("#carte-outils");
  const zone = $("#plats");
  let universActif = null;
  let requete = "";
  let filtresActifs = new Set();

  const decalage = () => entete.offsetHeight + outils.offsetHeight;
  function mesurer() {
    document.documentElement.style.setProperty("--decalage", `${decalage() + 12}px`);
    const onglets = $("#univers");
    onglets.classList.toggle("defilable", onglets.scrollWidth > onglets.clientWidth + 2);
    placerPastille();
  }
  addEventListener("resize", mesurer);
  document.fonts?.ready.then(mesurer); // la largeur des onglets change quand la police arrive

  // La pastille verte glisse jusqu'à l'onglet choisi
  const pastille = el("span", "onglet-pastille");
  pastille.setAttribute("aria-hidden", "true");
  let pastillePlacee = false;
  function placerPastille() {
    const actif = $('.onglet[aria-selected="true"]', $("#univers"));
    pastille.classList.toggle("cachee", !actif);
    if (!actif) return;
    if (!pastillePlacee) pastille.classList.add("sans-transition");
    pastille.style.width = `${actif.offsetWidth}px`;
    pastille.style.height = `${actif.offsetHeight}px`;
    pastille.style.transform = `translate(${actif.offsetLeft}px, ${actif.offsetTop}px)`;
    if (pastillePlacee) return;
    void pastille.offsetWidth;
    pastille.classList.remove("sans-transition");
    pastillePlacee = true;
  }

  function rendreOnglets() {
    const liste = $("#univers");
    if (!univers.some((u) => u.cle === universActif)) universActif = univers[0]?.cle ?? null;
    const recherche = Boolean(requete || filtresActifs.size);
    // Les onglets ne sont recréés que si les univers changent : sinon la pastille ne pourrait pas glisser
    const signature = univers.map((u) => `${u.cle}:${u.nom}`).join("|");
    if (liste.dataset.signature !== signature) {
      liste.dataset.signature = signature;
      liste.replaceChildren(pastille, ...univers.map((u) => {
        const b = el("button", "onglet");
        b.type = "button";
        b.setAttribute("role", "tab");
        b.dataset.cle = u.cle;
        b.append(icone(ICONES_UNIVERS[u.cle] || "u-defaut"), u.nom);
        return b;
      }));
      pastillePlacee = false;
    }
    for (const b of $$(".onglet", liste)) {
      b.setAttribute("aria-selected", String(b.dataset.cle === universActif && !recherche));
      b.tabIndex = b.dataset.cle === universActif ? 0 : -1;
      b.classList.toggle("attenue", recherche);
    }
    placerPastille();
  }

  $("#univers").addEventListener("click", (e) => {
    const b = e.target.closest(".onglet");
    if (!b) return;
    choisirUnivers(b.dataset.cle);
  });
  $("#univers").addEventListener("keydown", (e) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    const onglets = $$(".onglet", e.currentTarget);
    const i = onglets.indexOf(document.activeElement);
    const j = e.key === "Home" ? 0 : e.key === "End" ? onglets.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + onglets.length) % onglets.length;
    e.preventDefault();
    choisirUnivers(onglets[j].dataset.cle);
    $(`.onglet[data-cle="${CSS.escape(onglets[j].dataset.cle)}"]`)?.focus();
  });

  function choisirUnivers(cle) {
    universActif = cle;
    if (requete || filtresActifs.size) {
      requete = "";
      $("#recherche").value = "";
      filtresActifs.clear();
    }
    rendreCarte(true);
    const onglet = $(`.onglet[data-cle="${CSS.escape(cle)}"]`);
    if (onglet && $("#univers").scrollWidth > $("#univers").clientWidth) {
      $("#univers").scrollTo({ left: onglet.offsetLeft - ($("#univers").clientWidth - onglet.offsetWidth) / 2, behavior: "smooth" });
    }
    // Le début du nouvel univers reste visible sous la barre de la carte.
    const haut = zone.getBoundingClientRect().top;
    if (haut < decalage()) scrollTo({ top: scrollY + haut - decalage() - 8, behavior: sobre.matches ? "auto" : "smooth" });
  }

  function rendreFiltres() {
    const tags = new Map();
    for (const { p } of produits.values()) {
      p.tags.forEach((t, i) => {
        if (!SPECIALES.has(p.cles[i])) tags.set(p.cles[i], t);
      });
    }
    filtresActifs = new Set([...filtresActifs].filter((t) => tags.has(t)));
    $("#filtres").replaceChildren(...[...tags].sort(([x], [y]) => x.localeCompare(y, "fr")).map(([cle, libelle]) => {
      const b = el("button", "filtre", libelle);
      b.type = "button";
      b.dataset.cle = cle;
      b.setAttribute("aria-pressed", String(filtresActifs.has(cle)));
      return b;
    }));
  }
  $("#filtres").addEventListener("click", (e) => {
    const b = e.target.closest(".filtre");
    if (!b) return;
    const cle = b.dataset.cle;
    if (filtresActifs.has(cle)) filtresActifs.delete(cle);
    else filtresActifs.add(cle);
    rendreCarte(true);
    $(`.filtre[data-cle="${CSS.escape(cle)}"]`)?.focus();
  });

  const correspond = (p, c) =>
    (!filtresActifs.size || p.cles.some((t) => filtresActifs.has(t))) &&
    (!requete || norm(`${c.name} ${p.name} ${p.description} ${p.tags.join(" ")}`).includes(requete));

  function plat(p, c, i, animer) {
    const n = $("#plat-modele").content.firstElementChild.cloneNode(true);
    $(".plat-nom", n).textContent = p.name;
    $(".plat-desc", n).textContent = typo(p.description);
    const infos = $(".plat-infos", n);
    const cote = $(".plat-cote", n);
    $(".plat-prix", n).textContent = prix(p.priceCents);
    if (p.soldOut) {
      n.classList.add("epuise");
      infos.append(el("span", "badge epuise", "Épuisé"));
    } else if (p.remaining) {
      infos.append(el("span", "badge bientot", p.remaining === 1 ? "Plus qu'une portion" : `Plus que ${p.remaining} portions`));
    }
    p.tags.forEach((t, j) => {
      if (SPECIALES.has(p.cles[j])) return;
      const badge = el("span", "badge", t);
      badge.dataset.tag = p.cles[j];
      infos.append(badge);
    });
    if (wok && c === wok.categorie) {
      // Garniture du wok : on la choisit dans « Composez votre wok »
      $(".plat-prix", n).textContent = p.priceCents === null ? "Sur demande" : `dès ${prix(p.priceCents)}`;
      if (!p.soldOut) {
        const b = el("button", "bouton bouton-contour bouton-petit composer-lien", "Composer");
        b.type = "button";
        b.dataset.garniture = p.id;
        cote.append(b);
      }
    }
    if (animer && !sobre.matches && i < 14) {
      n.classList.add("apparait");
      n.style.setProperty("--delai", `${i * 35}ms`);
    }
    return n;
  }

  function encartWok() {
    const n = el("div", "wok-encart");
    const texte = el("div");
    texte.append(el("p", "pinceau", "Le wok, à votre façon"), el("h3", "", "Composez votre wok"),
      el("p", "", "Une base, une garniture, et un petit plus si le cœur vous en dit : nous faisons sauter le tout, devant le feu."));
    const lien = el("a", "bouton bouton-blanc bouton-grand");
    lien.href = "#composer";
    lien.append(icone("ic-feu"), "C'est parti");
    n.append(texte, lien);
    return n;
  }

  function rendreCarte(animer = false) {
    rendreOnglets();
    rendreFiltres();
    const recherche = Boolean(requete || filtresActifs.size);
    const u = univers.find((x) => x.cle === universActif);
    const categories = recherche ? univers.flatMap((x) => x.categories) : u?.categories ?? [];
    const blocs = [];
    if (!recherche && wok && u === wok.categorie.univers) blocs.push(encartWok());
    const sommaire = el("nav", "sous-categories");
    sommaire.setAttribute("aria-label", "Rubriques");
    let i = 0;
    let trouves = 0;
    for (const c of categories) {
      const liste = c.products.filter((p) => !a(p, "base") && !a(p, "supplement") && (!recherche || correspond(p, c)));
      if (!liste.length) continue;
      trouves += liste.length;
      const section = el("section", "categorie");
      section.id = `categorie-${c.id}`;
      section.setAttribute("aria-labelledby", `titre-${c.id}`);
      if (recherche && c.sousNom !== c.univers.nom) section.append(el("p", "categorie-univers", c.univers.nom));
      const tete = el("div", "categorie-tete");
      const titre = el("h3", "", c.sousNom);
      titre.id = `titre-${c.id}`;
      tete.append(titre);
      section.append(tete);
      if (c.note) section.append(el("p", "categorie-note", typo(c.note)));
      const ul = el("ul", "plats");
      ul.append(...liste.map((p) => plat(p, c, i++, animer)));
      section.append(ul);
      blocs.push(section);
      const lien = el("a", "", c.sousNom);
      lien.href = `#categorie-${c.id}`;
      sommaire.append(lien);
    }
    if (!recherche && sommaire.children.length > 1) blocs.unshift(sommaire);
    zone.replaceChildren(...blocs);
    if (animer && !sobre.matches) {
      zone.classList.remove("change");
      void zone.offsetWidth; // relance l'animation
      zone.classList.add("change");
    }
    const etat = $("#etat");
    if (!univers.length) etat.textContent = "La carte est en cours de préparation.";
    else if (recherche && !trouves) etat.textContent = "Aucun plat ne correspond à votre recherche.";
    else if (recherche) etat.textContent = `${trouves} résultat${trouves > 1 ? "s" : ""}`;
    else etat.textContent = "";
    mesurer();
  }

  $("#recherche").addEventListener("input", (e) => {
    requete = norm(e.target.value);
    rendreCarte(false);
    const haut = $("#filtres").getBoundingClientRect().top;
    if (haut < decalage()) scrollTo({ top: scrollY + haut - decalage() - 8 });
  });

  zone.addEventListener("click", (e) => {
    const composer = e.target.closest(".composer-lien");
    if (composer) {
      choisirGarniture(Number(composer.dataset.garniture));
      $("#composer").scrollIntoView({ behavior: sobre.matches ? "auto" : "smooth" });
    }
  });

  // ---------- La fenêtre : réservation et photos ----------
  const modale = $("#modale");
  let retourFocus = null;

  function ouvrirModale(titre, contenu) {
    $("#modale-titre").textContent = titre;
    $("#modale-corps").replaceChildren(...contenu);
    retourFocus = document.activeElement;
    modale.hidden = false;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => requestAnimationFrame(() => modale.classList.add("ouvert")));
    $(".modale-panneau", modale).focus({ preventScroll: true });
  }
  function fermerModale() {
    if (modale.hidden) return;
    modale.classList.remove("ouvert");
    document.body.style.overflow = "";
    setTimeout(() => {
      if (modale.classList.contains("ouvert")) return;
      modale.hidden = true;
      $("#modale-corps").replaceChildren(); // décharge la réservation ou la photo
    }, sobre.matches ? 0 : 420);
    retourFocus?.focus?.({ preventScroll: true });
  }
  modale.addEventListener("click", (e) => {
    if (e.target.closest("[data-fermer]")) fermerModale();
  });
  document.addEventListener("keydown", (e) => {
    if (modale.hidden) return;
    if (e.key === "Escape") return fermerModale();
    if (e.key !== "Tab") return;
    // Le focus reste dans la fenêtre ouverte
    const focusables = $$("a[href], button:not([disabled])", modale).filter((n) => n.getClientRects().length);
    if (!focusables.length) return;
    const premier = focusables[0], dernier = focusables.at(-1);
    if (e.shiftKey && document.activeElement === premier) {
      e.preventDefault();
      dernier.focus();
    } else if (!e.shiftKey && document.activeElement === dernier) {
      e.preventDefault();
      premier.focus();
    }
  });

  // ---------- Composez votre wok ----------
  const choixWok = { base: null, garniture: null, supplements: new Set() };
  const scene = $("#scene-poele");
  const wokPoele = $("#wok-poele");
  const TAILLES = {
    "i-nouille": [76, 20], "i-riz": [54, 27], "i-riz-saute": [54, 27], "i-brocoli": [30, 33], "i-carotte": [20, 20],
    "i-courgette": [26, 15], "i-oignon": [28, 14], "i-choufleur": [27, 24], "i-poivron": [30, 10], "i-poulet": [26, 22],
    "i-porc": [32, 19], "i-boeuf": [36, 13], "i-crevette": [27, 27], "i-canard": [32, 17], "i-loklak": [24, 22], "i-oeuf": [60, 48],
  };
  // Emplacements dans le wok (repère du dessin : centre 260 × 236)
  const EMPLACEMENTS = {
    base: [[168, 236], [214, 226], [262, 240], [308, 228], [352, 238], [192, 250], [240, 254], [286, 252], [332, 252]],
    legumes: [[150, 228], [204, 214], [252, 224], [300, 212], [346, 224], [374, 240], [230, 240], [318, 238], [182, 242], [272, 206]],
    garniture: [[178, 222], [222, 232], [266, 216], [310, 226], [352, 214], [200, 246], [248, 246], [296, 244], [338, 240]],
    plus: [[262, 222]],
  };
  const LEGUMES = ["i-brocoli", "i-carotte", "i-courgette", "i-choufleur", "i-oignon", "i-brocoli", "i-carotte", "i-courgette", "i-choufleur", "i-poivron"];

  function symboleDe(p, role) {
    const n = norm(p.name);
    if (role === "base") return n.includes("nouille") ? "i-nouille" : /saute|cantonais/.test(n) ? "i-riz-saute" : "i-riz";
    if (role === "supplement") return n.includes("oeuf") ? "i-oeuf" : "i-carotte";
    if (n.includes("lok lak")) return "i-loklak";
    if (n.includes("crevette")) return "i-crevette";
    if (n.includes("canard")) return "i-canard";
    if (n.includes("boeuf")) return "i-boeuf";
    if (n.includes("porc")) return "i-porc";
    if (n.includes("tofu") || n.includes("legume")) return "i-brocoli";
    return "i-poulet";
  }

  // « Wok au poulet » → « Poulet »
  const nomCourt = (nom) => {
    const court = nom.replace(/^wok\s+/i, "").replace(/^(au|aux|à la|à l'|a la)\s+/i, "");
    return court.charAt(0).toUpperCase() + court.slice(1);
  };

  function poser(couche, symbole, emplacements, { tomber = true, delai = 0, graine = 1 } = {}) {
    const [l, h] = TAILLES[symbole] || [24, 24];
    emplacements.forEach(([x, y], i) => {
      const s = Array.isArray(symbole) ? symbole[i % symbole.length] : symbole;
      const [w, hh] = Array.isArray(symbole) ? TAILLES[s] : [l, h];
      const position = svg("g", { transform: `translate(${x} ${y})` });
      const morceau = svg("g", { class: "piece" });
      morceau.append(svg("use", { href: `#${s}`, x: -w / 2, y: -hh / 2, width: w, height: hh, transform: `rotate(${Math.round(alea(i + graine) * 70 - 35)})` }));
      position.append(morceau);
      couche.append(position);
      if (tomber && !sobre.matches) {
        morceau.style.setProperty("--dx", `${Math.round((alea(i + graine + 7) - 0.5) * 120)}px`);
        morceau.style.setProperty("--r0", `${Math.round((alea(i + graine + 3) - 0.5) * 540)}deg`);
        morceau.style.animationDelay = `${delai + i * 45}ms`;
        morceau.classList.add("tombe");
      }
    });
  }

  function vider(couche) {
    const anciens = [...couche.children];
    if (!anciens.length) return;
    if (sobre.matches) return couche.replaceChildren();
    anciens.forEach((g, i) => {
      const morceau = g.firstElementChild;
      morceau.classList.remove("tombe");
      morceau.style.animationDelay = `${i * 18}ms`;
      morceau.classList.add("sort");
    });
    setTimeout(() => anciens.forEach((g) => g.remove()), 420 + anciens.length * 18);
  }

  function relancer(n, classe) {
    n.classList.remove(classe);
    void n.getBoundingClientRect();
    n.classList.add(classe);
  }

  function faireSauter(delai = 450) {
    if (sobre.matches) return;
    setTimeout(() => {
      relancer(wokPoele, "sauter");
      relancer(scene, "flambe");
      gresiller(0.9);
    }, delai);
  }

  function carteOption(p, role, nom, type) {
    const label = el("label", "option");
    const input = el("input");
    input.type = type;
    input.name = role;
    input.value = p.id;
    input.disabled = p.soldOut;
    if (p.soldOut) label.classList.add("epuise");
    const carte = el("span", "option-carte");
    const illustration = svg("svg", { class: "option-icone", viewBox: "0 0 60 60", "aria-hidden": "true" });
    const s = symboleDe(p, role);
    const [w, h] = TAILLES[s];
    const echelle = Math.min(1, 34 / w);
    [[30, 34, -8], [22, 26, 20], [38, 25, -24]].slice(0, s === "i-oeuf" ? 1 : 3).forEach(([x, y, r]) => {
      illustration.append(svg("use", { href: `#${s}`, x: x - (w * echelle) / 2, y: y - (h * echelle) / 2, width: w * echelle, height: h * echelle, transform: `rotate(${r} ${x} ${y})` }));
    });
    const prixTexte = p.soldOut ? "Épuisé" : role === "garniture" ? prix(p.priceCents) : prixOption(p.priceCents);
    carte.append(illustration, el("span", "option-nom", nom), el("span", "option-prix", prixTexte));
    label.append(input, carte);
    return label;
  }

  function rendreComposeur() {
    const section = $("#composer");
    const visible = Boolean(wok && wok.garnitures.length);
    section.hidden = !visible;
    $$('a[href="#composer"]').forEach((lien) => (lien.hidden = !visible));
    if (!visible) return;
    if (wok.categorie.note) $("#composer-note").textContent = typo(`Choisissez votre base et votre garniture : nous faisons sauter le tout au wok. ${wok.categorie.note}`);
    // Garde les choix encore valables après une mise à jour de la carte
    const existe = (p, liste) => p && liste.some((x) => x.id === p.id && !x.soldOut);
    if (!existe(choixWok.base, wok.bases)) choixWok.base = null;
    if (!existe(choixWok.garniture, wok.garnitures)) choixWok.garniture = null;
    choixWok.supplements = new Set([...choixWok.supplements].filter((id) => wok.supplements.some((s) => s.id === id && !s.soldOut)));
    if (choixWok.base) choixWok.base = wok.bases.find((b) => b.id === choixWok.base.id);
    if (choixWok.garniture) choixWok.garniture = wok.garnitures.find((g) => g.id === choixWok.garniture.id);

    $("#choix-base").replaceChildren(...wok.bases.map((p) => carteOption(p, "base", p.name, "radio")));
    $("#choix-garniture").replaceChildren(...wok.garnitures.map((p) => carteOption(p, "garniture", nomCourt(p.name), "radio")));
    $("#etape-plus").hidden = !wok.supplements.length;
    $("#choix-plus").replaceChildren(...wok.supplements.map((p) => carteOption(p, "supplement", p.name, "checkbox")));
    for (const input of $$("#composeur input")) {
      const id = Number(input.value);
      input.checked = (input.name === "base" && choixWok.base?.id === id) || (input.name === "garniture" && choixWok.garniture?.id === id)
        || (input.name === "supplement" && choixWok.supplements.has(id));
    }
    // Nombre de woks possibles : garnitures × bases × (avec ou sans chaque supplément)
    const possibles = wok.garnitures.length * wok.bases.length * 2 ** wok.supplements.length;
    const compteur = $("#chiffre-woks");
    compteur.dataset.compteur = possibles;
    if (compteur.closest(".visible")) compteur.textContent = possibles;
    if (!$("#couche-legumes").children.length) poser($("#couche-legumes"), LEGUMES, EMPLACEMENTS.legumes, { tomber: false, graine: 11 });
    redessinerWok(false);
    majResumeWok();
  }

  function redessinerWok(animer, retard = 0) {
    const options = { tomber: animer };
    for (const [couche, choix, role, emplacements] of [
      [$("#couche-base"), choixWok.base, "base", EMPLACEMENTS.base],
      [$("#couche-garniture"), choixWok.garniture, "garniture", EMPLACEMENTS.garniture],
    ]) {
      const voulu = choix ? `${role}-${choix.id}` : "";
      if (couche.dataset.contenu === voulu) continue;
      couche.dataset.contenu = voulu;
      animer ? vider(couche) : couche.replaceChildren();
      if (choix) poser(couche, symboleDe(choix, role), emplacements, { ...options, delai: animer ? 120 + retard : 0, graine: choix.id });
    }
    const plus = $("#couche-plus");
    const voulus = [...choixWok.supplements].sort().join(",");
    if (plus.dataset.contenu !== voulus) {
      plus.dataset.contenu = voulus;
      animer ? vider(plus) : plus.replaceChildren();
      [...choixWok.supplements].forEach((id, i) => {
        const p = wok.supplements.find((s) => s.id === id);
        if (p) poser(plus, symboleDe(p, "supplement"), [EMPLACEMENTS.plus[0].map((v, j) => v + (j ? 0 : i * 40))], { ...options, delai: 150 + retard });
      });
    }
  }

  let prixAffiche = null;
  function animerPrix(cible) {
    const sortie = $("#wok-prix");
    if (cible === null) {
      prixAffiche = null;
      sortie.textContent = "—";
      return;
    }
    const depart = prixAffiche ?? cible;
    prixAffiche = cible;
    relancer(sortie, "change");
    if (sobre.matches || depart === cible) return void (sortie.textContent = prix(cible));
    const debut = performance.now();
    const pas = (t) => {
      const x = Math.min(1, (t - debut) / 450);
      sortie.textContent = prix(Math.round(depart + (cible - depart) * (1 - Math.pow(1 - x, 3))));
      if (x < 1) requestAnimationFrame(pas);
    };
    requestAnimationFrame(pas);
  }

  function majResumeWok() {
    const { base, garniture, supplements } = choixWok;
    const extras = wok.supplements.filter((s) => supplements.has(s.id));
    $("#wok-nom").textContent = garniture ? garniture.name : base ? "Choisissez votre garniture" : "Votre wok, à composer";
    $("#wok-details").textContent = [base?.name ?? "Base à choisir", ...extras.map((s) => s.name)].join(" · ") + " · légumes inclus";
    if (garniture && base) {
      animerPrix(garniture.priceCents + base.priceCents + extras.reduce((s, x) => s + x.priceCents, 0));
    } else if (garniture) {
      animerPrix(null);
      $("#wok-prix").textContent = `dès ${prix(garniture.priceCents)}`;
    } else {
      animerPrix(null);
    }
    $("#wok-appeler").classList.toggle("pret", Boolean(base && garniture));
    $("#poele").classList.toggle("pret", Boolean(base && garniture)); // le wok fume
    $("#wok-recommencer").hidden = !(base || garniture || supplements.size);
  }

  // Le wok est complet (base et garniture) : une gerbe d'étincelles, et il n'y a plus qu'à appeler.
  const wokComplet = () => Boolean(choixWok.base && choixWok.garniture);
  function feterWok(avant, retard = 0) {
    if (!avant && wokComplet()) setTimeout(() => feuDeJoie(scene, 18), 650 + retard);
  }

  // L'ingrédient choisi file en cloche jusque dans le wok. Renvoie la durée du vol (0 : pas de vol).
  function volerVersWok(option) {
    const image = option && $(".option-icone", option);
    if (sobre.matches || !image) return 0;
    const de = image.getBoundingClientRect();
    const vers = wokPoele.getBoundingClientRect();
    if (!de.width || vers.bottom < 0 || vers.top > innerHeight) return 0;
    const demi = de.width / 2;
    const x0 = de.left + demi, y0 = de.top + de.height / 2;
    const x1 = vers.left + vers.width / 2, y1 = vers.top + vers.height * 0.3;
    const sommet = Math.min(y0, y1) - 90;
    const porteur = el("span", "vol-porteur");
    const copie = image.cloneNode(true);
    copie.classList.add("vol-ingredient");
    porteur.append(copie);
    document.body.append(porteur);
    const duree = 620;
    porteur.animate([{ transform: `translateX(${x0 - demi}px)` }, { transform: `translateX(${x1 - demi}px)` }],
      { duration: duree, easing: "cubic-bezier(.3, .1, .5, 1)", fill: "forwards" });
    copie.animate([
      { transform: `translateY(${y0 - demi}px) scale(1) rotate(0)`, easing: "cubic-bezier(.2, .7, .4, 1)" },
      { transform: `translateY(${sommet - demi}px) scale(1.15) rotate(-140deg)`, offset: 0.42, easing: "cubic-bezier(.6, 0, .9, .5)" },
      { transform: `translateY(${y1 - demi}px) scale(.3) rotate(-320deg)`, opacity: 0.3 },
    ], { duration: duree, fill: "forwards" }).onfinish = () => porteur.remove();
    return duree;
  }

  $("#composeur").addEventListener("change", (e) => {
    const input = e.target;
    const id = Number(input.value);
    const avant = wokComplet();
    if (input.name === "base") choixWok.base = wok.bases.find((b) => b.id === id) ?? null;
    if (input.name === "garniture") choixWok.garniture = wok.garnitures.find((g) => g.id === id) ?? null;
    if (input.name === "supplement") input.checked ? choixWok.supplements.add(id) : choixWok.supplements.delete(id);
    const vol = input.checked ? volerVersWok(input.closest(".option")) : 0;
    const retard = vol ? vol - 220 : 0; // les morceaux tombent quand l'ingrédient arrive
    redessinerWok(true, retard);
    majResumeWok();
    faireSauter((input.name === "supplement" ? 350 : 520) + retard);
    feterWok(avant, retard);
  });

  function choisirGarniture(id) {
    if (!wok) return;
    const avant = wokComplet();
    choixWok.garniture = wok.garnitures.find((g) => g.id === id) ?? choixWok.garniture;
    const input = $(`#choix-garniture input[value="${id}"]`);
    if (input) input.checked = true;
    redessinerWok(true);
    majResumeWok();
    faireSauter(700);
    feterWok(avant);
  }

  $("#wok-recommencer").addEventListener("click", () => {
    choixWok.base = null;
    choixWok.garniture = null;
    choixWok.supplements.clear();
    $$("#composeur input").forEach((i) => (i.checked = false));
    redessinerWok(true);
    majResumeWok();
    faireSauter(300);
  });

  // ---------- Son : le grésillement du wok (désactivé par défaut) ----------
  let audio = null;
  let sonActif = stockage.lire("wok888-son", false) === true;
  const boutonSon = $("#son-bouton");
  function majBoutonSon() {
    boutonSon.setAttribute("aria-pressed", String(sonActif));
    boutonSon.querySelector("use").setAttribute("href", sonActif ? "#ic-son" : "#ic-muet");
    boutonSon.querySelector("span").textContent = sonActif ? "Son activé" : "Son";
  }
  boutonSon.addEventListener("click", () => {
    sonActif = !sonActif;
    stockage.ecrire("wok888-son", sonActif);
    majBoutonSon();
    if (sonActif) gresiller(1.1);
  });
  majBoutonSon();

  function contexteAudio() {
    if (!sonActif || !window.AudioContext) return null;
    audio ??= new AudioContext();
    if (audio.state === "suspended") audio.resume();
    return audio;
  }

  function gresiller(duree) {
    const ac = contexteAudio();
    if (!ac) return;
    const n = Math.floor(ac.sampleRate * duree);
    const tampon = ac.createBuffer(1, n, ac.sampleRate);
    const donnees = tampon.getChannelData(0);
    for (let i = 0; i < n; i++) donnees[i] = (Math.random() * 2 - 1) * (Math.random() < 0.015 ? 1 : 0.3);
    const source = ac.createBufferSource();
    source.buffer = tampon;
    const filtre = ac.createBiquadFilter();
    filtre.type = "bandpass";
    filtre.frequency.value = 3400;
    filtre.Q.value = 0.7;
    const gain = ac.createGain();
    const t = ac.currentTime;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.3, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duree);
    source.connect(filtre).connect(gain).connect(ac.destination);
    source.start();
  }

  // Gerbe d'étincelles autour d'un élément (wok complet, machine 888)
  function feuDeJoie(autour, nombre = 22) {
    if (sobre.matches || !autour) return;
    const r = autour.getBoundingClientRect();
    if (!r.width) return;
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    for (let i = 0; i < nombre; i++) {
      const p = el("span", "etincelle");
      document.body.append(p);
      const angle = (i / nombre) * Math.PI * 2 + Math.random() * 0.4;
      const force = 80 + Math.random() * 110;
      const dx = Math.cos(angle) * force, dy = Math.sin(angle) * force - 60;
      const taille = 0.5 + Math.random() * 0.7;
      p.animate([
        { transform: `translate(${x - 9}px, ${y - 9}px) scale(${taille})`, opacity: 1 },
        { transform: `translate(${x - 9 + dx}px, ${y - 9 + dy}px) scale(${taille})`, opacity: 1, offset: 0.55 },
        { transform: `translate(${x - 9 + dx * 1.2}px, ${y - 9 + dy + 140}px) scale(${taille * 0.6})`, opacity: 0 },
      ], { duration: 1100 + Math.random() * 400, easing: "cubic-bezier(.2,.7,.4,1)" }).onfinish = () => p.remove();
    }
  }

  // ---------- À la une (étiquette « À la une ») ----------
  // « 4 sushis (saumon, thon, daurade), 2 brochettes. Coupe de fruits. » → éléments, sans couper dans les parenthèses
  function decouper(texte) {
    const morceaux = [];
    let profondeur = 0, courant = "";
    for (const c of texte) {
      if (c === "(") profondeur++;
      if (c === ")") profondeur = Math.max(0, profondeur - 1);
      if ((c === "," || c === ".") && !profondeur) {
        morceaux.push(courant);
        courant = "";
      } else {
        courant += c;
      }
    }
    morceaux.push(courant);
    return morceaux.map((m) => m.trim()).filter(Boolean).map((m) => m.charAt(0).toUpperCase() + m.slice(1));
  }

  function rendreUne() {
    const vedettes = [];
    for (const { p, c } of produits.values()) if (a(p, "une")) vedettes.push({ p, c });
    const section = $("#menus");
    section.hidden = !vedettes.length;
    $$('a[href="#menus"]').forEach((lien) => (lien.hidden = !vedettes.length));
    if (!vedettes.length) return;
    const premiere = vedettes[0].c;
    const titre = $("#signature-titre");
    const texteTitre = vedettes.every((v) => v.c === premiere) ? premiere.sousNom : "À la une";
    if (titre.dataset.texte !== texteTitre) {
      titre.dataset.texte = texteTitre;
      titre.textContent = texteTitre;
      decouperTitre(titre);
    }
    $("#signature-note").textContent = vedettes.every((v) => v.c === premiere) ? typo(premiere.note) : "";
    $("#signature-liste").replaceChildren(...vedettes.map(({ p }, i) => {
      const carte = el("article", "menu-carte");
      carte.dataset.revele = "";
      const royal = p.name.includes("888");
      if (royal) {
        carte.classList.add("royal");
        carte.append(el("p", "menu-ruban", "La signature"));
      }
      carte.append(el("h3", "menu-nom", p.name));
      const morceaux = p.description.match(/^(\d+)\s*pièces?\s*:?\s*(.*)$/is);
      if (morceaux) {
        const pieces = el("p", "menu-pieces");
        const nombre = el("b", "", morceaux[1]);
        nombre.dataset.compteur = morceaux[1];
        pieces.append(nombre, "pièces");
        carte.append(pieces);
        if (royal) {
          const chiffre = $("#chiffre-royal");
          chiffre.dataset.compteur = morceaux[1];
          if (chiffre.closest(".visible")) chiffre.textContent = morceaux[1];
        }
      }
      const compo = decouper(morceaux ? morceaux[2] : p.description);
      if (compo.length) {
        const ul = el("ul", "menu-compo");
        ul.append(...compo.map((m) => el("li", "", m)));
        carte.append(ul);
      }
      const bas = el("div", "menu-bas");
      bas.append(el("p", "menu-prix", prix(p.priceCents)));
      if (p.soldOut) {
        bas.append(el("span", "epuise-texte", "Épuisé"));
      } else {
        const lien = el("a", "bouton bouton-contour bouton-petit");
        lien.href = "tel:+33561580697";
        lien.setAttribute("aria-label", `Commander « ${p.name} » par téléphone`);
        lien.append(icone("ic-tel"), "Commander");
        bas.append(lien);
      }
      carte.append(bas);
      if (!sobre.matches) carte.style.transitionDelay = `${i * 80}ms`;
      return carte;
    }));
    observerApparitions(section);
  }

  // Léger effet de relief des cartes au survol de la souris
  $("#signature-liste").addEventListener("pointermove", (e) => {
    if (!pointeurFin.matches || sobre.matches) return;
    const carte = e.target.closest(".menu-carte");
    if (!carte) return;
    const r = carte.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    carte.style.transform = `perspective(900px) rotateY(${x * 7}deg) rotateX(${-y * 7}deg) translateY(-4px)`;
  });
  $("#signature-liste").addEventListener("pointerout", (e) => {
    const carte = e.target.closest(".menu-carte");
    if (carte && !carte.contains(e.relatedTarget)) carte.style.transform = "";
  });

  // ---------- La machine 888 ----------
  const machine = $("#machine");
  let reserves = null;
  let enCours = false;
  let tirage = null;

  function preparerMachine() {
    const reserve = { entree: [], plat: [], dessert: [] };
    for (const u of univers) {
      for (const c of u.categories) {
        for (const p of c.products) {
          if (!disponible(p)) continue;
          const choix = { nom: p.name, details: "", prix: p.priceCents };
          if (u.cle === "entrees" && p.priceCents >= 400) reserve.entree.push(choix);
          else if ((u.cle === "nos plats" && !norm(c.sousNom).includes("accompagnement")) || u.cle === "poke bowls") reserve.plat.push(choix);
          else if (u.cle === "desserts") reserve.dessert.push(choix);
        }
      }
    }
    // Les woks : une garniture et une base tirées au sort
    if (wok) {
      const bases = wok.bases.filter((b) => !b.soldOut);
      for (const g of wok.garnitures.filter(disponible)) {
        if (bases.length) reserve.plat.push({ wok: g, bases });
      }
    }
    reserves = reserve;
    const prete = reserve.entree.length && reserve.plat.length && reserve.dessert.length;
    machine.hidden = !prete;
    if (prete && !$(".rouleau-bande li")) {
      $$(".rouleau-bande").forEach((bande) => bande.replaceChildren(caseRouleau(null)));
    }
  }

  const tirer = (type) => {
    const choix = auHasard(reserves[type]);
    if (!choix.wok) return choix;
    const base = auHasard(choix.bases);
    return { nom: choix.wok.name, details: base.name, prix: choix.wok.priceCents + base.priceCents };
  };

  function caseRouleau(choix) {
    const li = el("li");
    if (!choix) {
      li.append(el("span", "rouleau-attente", "8"));
      return li;
    }
    li.append(el("span", "", choix.nom));
    if (choix.details) li.append(el("span", "", choix.details));
    li.append(el("small", "", prix(choix.prix)));
    return li;
  }

  function tourner(rouleau, gagnant, type, duree) {
    const bande = $(".rouleau-bande", rouleau);
    const cases = [bande.firstElementChild?.cloneNode(true) ?? caseRouleau(null)];
    for (let i = 0; i < 14; i++) cases.push(caseRouleau(tirer(type)));
    cases.push(caseRouleau(gagnant));
    bande.replaceChildren(...cases);
    const hauteur = bande.firstElementChild.offsetHeight;
    rouleau.classList.add("tourne");
    const anim = bande.animate(
      [{ transform: "translateY(0)" }, { transform: `translateY(${-(cases.length - 1) * hauteur}px)` }],
      { duration: sobre.matches ? 1 : duree, easing: "cubic-bezier(.15,.65,.2,1)", fill: "forwards" }
    );
    return anim.finished.then(() => {
      rouleau.classList.remove("tourne");
      relancer(rouleau, "arrete");
      bande.replaceChildren(caseRouleau(gagnant));
      anim.cancel();
      gresiller(0.15);
    });
  }

  async function lancer() {
    if (enCours || !reserves) return;
    enCours = true;
    const levier = $("#levier");
    levier.classList.add("tire");
    setTimeout(() => levier.classList.remove("tire"), 450);
    machine.classList.add("tourne");
    $("#machine-appeler").hidden = true;
    $("#machine-resultat").textContent = "Les rouleaux tournent…";
    tirage = { entree: tirer("entree"), plat: tirer("plat"), dessert: tirer("dessert") };
    await Promise.all($$(".rouleau", machine).map((r, i) => tourner(r, tirage[r.dataset.type], r.dataset.type, 1300 + i * 500)));
    machine.classList.remove("tourne");
    const total = tirage.entree.prix + tirage.plat.prix + tirage.dessert.prix;
    const resultat = $("#machine-resultat");
    resultat.replaceChildren(typo("Votre repas porte-bonheur : "), el("b", "", prix(total)));
    annoncer(`La machine a choisi : ${tirage.entree.nom}, ${tirage.plat.nom}, ${tirage.dessert.nom}, pour ${prix(total)}.`);
    $("#machine-appeler").hidden = false;
    relancer(machine, "gagne");
    feuDeJoie($(".machine-enseigne"), 26);
    enCours = false;
  }
  $("#lancer").addEventListener("click", lancer);
  $("#levier").addEventListener("click", lancer);
  // ---------- Réservation (resOS), chargée seulement à la demande ----------
  $("#ouvrir-resa").addEventListener("click", () => {
    const cadre = el("iframe");
    cadre.src = RESERVATION;
    cadre.title = "Réservation en ligne (resOS)";
    cadre.referrerPolicy = "strict-origin-when-cross-origin";
    const aide = el("p", "petit");
    const lien = el("a", "", "Ouvrir la réservation dans une nouvelle fenêtre");
    lien.href = RESERVATION;
    lien.target = "_blank";
    lien.rel = "noopener";
    aide.append(lien, ` · ou appelez le ${TEL}`);
    ouvrirModale("Réserver une table", [cadre, aide]);
  });

  // ---------- Plan : chargé seulement si le visiteur le demande ----------
  $("#afficher-plan").addEventListener("click", () => {
    const plan = $("#plan");
    const cadre = el("iframe");
    cadre.title = "Plan : 16 route de Grenade, 31840 Seilh";
    cadre.src = "https://www.openstreetmap.org/export/embed.html?bbox=1.3430%2C43.6929%2C1.3580%2C43.6995&layer=mapnik&marker=43.696159%2C1.350528";
    cadre.referrerPolicy = "no-referrer";
    const legende = el("figcaption");
    const lien = el("a", "", "Agrandir le plan sur OpenStreetMap");
    lien.href = "https://www.openstreetmap.org/?mlat=43.696159&mlon=1.350528#map=17/43.696159/1.350528";
    lien.target = "_blank";
    lien.rel = "noopener";
    legende.append(lien);
    plan.replaceChildren(cadre, legende);
    lien.focus({ preventScroll: true });
  });

  // ---------- Galerie : les photos déposées dans le dossier photos/ ----------
  async function chargerPhotos() {
    try {
      const { photos } = await lire("photos.php");
      if (!photos?.length) return;
      const grille = $("#galerie-grille");
      grille.replaceChildren(...photos.map((photo) => {
        const b = el("button");
        b.type = "button";
        b.setAttribute("aria-label", `Agrandir la photo : ${photo.legende}`);
        const img = el("img");
        img.src = photo.url;
        img.alt = photo.legende;
        img.loading = "lazy";
        img.decoding = "async";
        b.append(img);
        b.addEventListener("click", () => {
          const grande = el("img", "photo-grande");
          grande.src = photo.url;
          grande.alt = photo.legende;
          ouvrirModale(photo.legende, [grande]);
        });
        return b;
      }));
      $("#galerie").hidden = false;
      observerApparitions($("#galerie"));
    } catch {
      /* pas de galerie : rien à montrer */
    }
  }

  // ---------- Effets du défilement et de la souris (une seule boucle d'animation) ----------
  // Chaque tâche est appelée à chaque image tant qu'elle renvoie true.
  const taches = new Set();
  let boucleActive = false;
  function boucle() {
    for (const tache of taches) if (!tache()) taches.delete(tache);
    boucleActive = taches.size > 0;
    if (boucleActive) requestAnimationFrame(boucle);
  }
  function boucler(tache) {
    taches.add(tache);
    if (boucleActive) return;
    boucleActive = true;
    requestAnimationFrame(boucle);
  }

  const progression = $("#progression");
  const accueil = $("#accueil");
  const herosScene = $(".heros-scene");
  const herosTexte = $(".heros-texte");
  const herosBadge = $(".heros-badge");
  const cadreBandeau = $(".bandeau-cadre");
  const reserver = $("#reserver");
  const grandEcran = matchMedia("(min-width: 1100px)");
  const ecranLarge = matchMedia("(min-width: 900px)"); // accueil sur deux colonnes
  const decors = $$(".decor").map((d) => ({
    section: d.parentElement,
    elements: $$(".decor-el", d).map((n) => ({ n, vitesse: Number(n.dataset.vitesse) || 0.3 })),
  }));
  const lanternes = $$(".lanterne").map((n, i) => ({ n, angle: 0, vitesse: 0, poids: 1 + i * 0.3 }));
  const aLEcran = new Set(); // blocs animés actuellement visibles
  const surveillance = new IntersectionObserver((entrees) => {
    for (const e of entrees) e.isIntersecting ? aLEcran.add(e.target) : aLEcran.delete(e.target);
  });
  [accueil, cadreBandeau, reserver, ...decors.map((d) => d.section)].forEach((n) => surveillance.observe(n));

  // Accueil : la scène suit un peu la souris et glisse moins vite que la page (profondeur)
  const souris = { x: 0, y: 0, lx: 0, ly: 0 }; // position visée et position lissée, de -0,5 à 0,5
  let hauteurAccueil = accueil.offsetHeight;
  addEventListener("resize", () => (hauteurAccueil = accueil.offsetHeight));
  function majAccueil() {
    if (!aLEcran.has(accueil)) return;
    const y = ecranLarge.matches ? Math.min(scrollY, hauteurAccueil) : 0; // sur téléphone, la scène suit la page
    herosScene.style.translate = `${(souris.lx * -28).toFixed(1)}px ${(souris.ly * -18 + y * 0.12).toFixed(1)}px`;
    herosTexte.style.translate = `${(souris.lx * 10).toFixed(1)}px ${(souris.ly * 8 + y * 0.05).toFixed(1)}px`;
    herosBadge.style.translate = `${(souris.lx * 36).toFixed(1)}px ${(souris.ly * 26).toFixed(1)}px`;
    herosBadge.style.rotate = `${(y * 0.03).toFixed(1)}deg`;
  }
  function suivreSouris() {
    souris.lx += (souris.x - souris.lx) * 0.08;
    souris.ly += (souris.y - souris.ly) * 0.08;
    majAccueil();
    return Math.abs(souris.x - souris.lx) + Math.abs(souris.y - souris.ly) > 0.002;
  }

  // Lanternes : le défilement les fait se balancer (ressort amorti)
  let elan = 0; // vitesse du défilement, lissée (pixels par image)
  function balancerLanternes() {
    let bouge = false;
    for (const l of lanternes) {
      l.vitesse += -l.angle * 0.012 - l.vitesse * 0.03 + (elan * 0.002) / l.poids;
      l.angle = Math.max(-14, Math.min(14, l.angle + l.vitesse));
      if (Math.abs(l.angle) > 0.05 || Math.abs(l.vitesse) > 0.01) bouge = true;
      else l.angle = l.vitesse = 0;
      l.n.style.rotate = `${l.angle.toFixed(2)}deg`;
    }
    return bouge;
  }

  let dernierY = scrollY;
  let animBandeau = null;
  function suivreDefilement() {
    // Lectures d'abord, écritures ensuite : pas de mise en page forcée
    const y = scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    const blocsDecor = grandEcran.matches && !sobre.matches
      ? decors.filter((d) => aLEcran.has(d.section)).map((d) => [d, d.section.getBoundingClientRect()]) : [];
    elan += (y - dernierY - elan) * 0.3;
    dernierY = y;
    if (Math.abs(elan) < 0.05) elan = 0;
    progression.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max).toFixed(4) : 0})`;
    if (sobre.matches) return false;
    majAccueil();
    // Le bandeau accélère avec le défilement, et repart en arrière quand on remonte
    if (aLEcran.has(cadreBandeau)) {
      animBandeau ??= $(".bandeau-piste").getAnimations()[0] ?? null;
      if (animBandeau) animBandeau.playbackRate = 1 + Math.max(-5, Math.min(7, elan * 0.2));
    }
    if (elan && aLEcran.has(reserver)) boucler(balancerLanternes);
    for (const [d, r] of blocsDecor) {
      const ecart = r.top + r.height / 2 - innerHeight / 2;
      for (const e of d.elements) e.n.style.translate = `0 ${(ecart * e.vitesse * -0.6).toFixed(1)}px`;
    }
    return elan !== 0;
  }
  addEventListener("scroll", () => boucler(suivreDefilement), { passive: true });
  if (pointeurFin.matches && !sobre.matches) {
    accueil.addEventListener("pointermove", (e) => {
      const r = accueil.getBoundingClientRect();
      souris.x = (e.clientX - r.left) / r.width - 0.5;
      souris.y = (e.clientY - r.top) / r.height - 0.5;
      boucler(suivreSouris);
    });
    accueil.addEventListener("pointerleave", () => {
      souris.x = souris.y = 0;
      boucler(suivreSouris);
    });
  }

  // ---------- Accueil : « Ce soir, envie… » ----------
  const ENVIES = ["d'un wok au canard", "de sushis", "d'un poké bowl", "de nems maison", "d'un bò bún", "de bouchées vapeur", "du menu Royal 888", "d'un mojito"];
  let envie = 0;
  async function envieSuivante() {
    if (document.hidden || !aLEcran.has(accueil)) return;
    const cadre = $("#envie-cadre");
    const mot = $("#envie-mot");
    envie = (envie + 1) % ENVIES.length;
    const largeur = cadre.offsetWidth;
    const sortie = mot.animate([{ transform: "none", opacity: 1 }, { transform: "translateY(-100%)", opacity: 0 }],
      { duration: 260, easing: "cubic-bezier(.5, 0, .75, 0)", fill: "forwards" });
    try {
      await sortie.finished;
    } catch {
      return;
    }
    mot.textContent = typo(ENVIES[envie]);
    cadre.animate([{ width: `${largeur}px` }, { width: `${cadre.offsetWidth}px` }], { duration: 380, easing: "cubic-bezier(.2, .8, .2, 1)" });
    mot.animate([{ transform: "translateY(100%)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 520, easing: "cubic-bezier(.2, .8, .2, 1.3)" });
    sortie.cancel();
  }
  if (!sobre.matches) setInterval(envieSuivante, 2600);

  // ---------- Accueil : le wok se fait sauter d'un clic ----------
  const sceneWok = $(".scene-wok");
  const indiceWok = $("#wok-indice");
  const INDICES = ["Encore !", "Plus fort !", "Bravo, vous avez le coup de main !"];
  const VOLANTS = ["i-brocoli", "i-carotte", "i-crevette", "i-poivron", "i-courgette", "i-oignon", "i-nouille"];
  let sauts = 0;

  // Une poignée d'ingrédients jaillit du wok et retombe
  function lancerIngredients(nombre = 12) {
    const groupe = $(".volants", sceneWok);
    for (let i = 0; i < nombre; i++) {
      const s = auHasard(VOLANTS);
      const [l, h] = TAILLES[s];
      const position = svg("g", { transform: `translate(${Math.round(250 + Math.random() * 160)} ${Math.round(296 + Math.random() * 16)})` });
      const morceau = svg("use", { href: `#${s}`, x: -l * 0.65, y: -h * 0.65, width: l * 1.3, height: h * 1.3, class: "piece" });
      position.append(morceau);
      groupe.append(position);
      const dx = (Math.random() - 0.5) * 300, haut = 170 + Math.random() * 190, tour = (Math.random() - 0.5) * 1000;
      morceau.animate([
        { transform: "translate(0, 0) rotate(0)", opacity: 1, easing: "cubic-bezier(.2, .7, .4, 1)" },
        { transform: `translate(${dx * 0.55}px, ${-haut}px) rotate(${tour * 0.5}deg)`, opacity: 1, offset: 0.45, easing: "cubic-bezier(.6, 0, .9, .5)" },
        { transform: `translate(${dx}px, ${60 - haut * 0.2}px) rotate(${tour}deg)`, opacity: 0 },
      ], { duration: 1100 + Math.random() * 500, delay: Math.random() * 120, fill: "backwards" }).onfinish = () => position.remove();
    }
  }

  $("#wok-toucher").hidden = sobre.matches;
  $("#wok-toucher").addEventListener("click", () => {
    relancer(sceneWok, "grand-saut");
    lancerIngredients();
    jaillir(36);
    gresiller(1.2);
    navigator.vibrate?.(15);
    if (sauts < INDICES.length) {
      indiceWok.textContent = typo(INDICES[sauts]);
      indiceWok.animate([{ opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1.12, offset: 0.6 }, { opacity: 1, scale: 1 }],
        { duration: 450, easing: "ease-out", fill: "forwards" });
      if (sauts === INDICES.length - 1) indiceWok.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, delay: 2600, fill: "forwards" });
    }
    sauts++;
  });
  sceneWok.addEventListener("animationend", (e) => {
    if (e.animationName === "grand-saut") sceneWok.classList.remove("grand-saut");
  });

  // ---------- Le fortune cookie ----------
  const FORTUNES = [
    "Un bon wok n'attend pas : la chance sourit aux affamés.",
    "Le 8 vous porte bonheur : aujourd'hui, tout vous réussit.",
    "Qui partage ses nems double son bonheur.",
    "Votre prochaine bouchée sera la meilleure de la semaine.",
    "Celui qui hésite entre sushis et wok… prend les deux.",
    "Le feu vif révèle les saveurs ; l'amitié révèle les gens.",
    "Un repas partagé est un repas réussi.",
    "La chance, c'est comme le riz sauté : elle se savoure chaude.",
    "Les grandes aventures commencent par un bol de nouilles.",
    "Ce soir, laissez parler votre appétit.",
    "Un sourire et des baguettes : vous avez tout pour être heureux.",
    "La patience est une vertu, sauf devant un wok qui fume.",
    "Une bonne nouvelle arrive, et elle sent bon le gingembre.",
    "Les meilleures soirées commencent autour d'une table bien garnie.",
  ];
  const cookie = $("#fortune-cookie");
  const resultatFortune = $("#fortune-resultat");
  let frappe = 0;

  // Le message s'écrit lettre à lettre (la place est déjà réservée : rien ne bouge autour)
  function taper(cible, texte) {
    clearInterval(frappe);
    texte = typo(texte);
    if (sobre.matches) return void (cible.textContent = texte);
    const tape = document.createElement("span");
    const reste = el("span", "reste");
    reste.textContent = texte;
    cible.replaceChildren(tape, reste);
    let n = 0;
    frappe = setInterval(() => {
      n = Math.min(texte.length, n + 1);
      tape.textContent = texte.slice(0, n);
      reste.textContent = texte.slice(n);
      if (n === texte.length) clearInterval(frappe);
    }, 32);
  }

  function chiffresPorteBonheur() {
    const chiffres = new Set([8]);
    while (chiffres.size < 4) chiffres.add(1 + Math.floor(Math.random() * 88));
    return [...chiffres].sort((x, y) => x - y);
  }

  function platPorteBonheur() {
    const choix = [...produits.values()].filter(({ p, c }) => disponible(p) && c.univers.cle !== "boissons");
    return choix.length ? auHasard(choix) : null;
  }

  // Des miettes s'échappent du cookie
  function miettes(autour, nombre = 14) {
    if (sobre.matches) return;
    const r = autour.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height * 0.62;
    for (let i = 0; i < nombre; i++) {
      const m = el("span", "miette");
      document.body.append(m);
      const dx = (Math.random() - 0.5) * 240, dy = -40 - Math.random() * 90;
      m.animate([
        { transform: `translate(${x}px, ${y}px) rotate(0)`, opacity: 1 },
        { transform: `translate(${x + dx * 0.6}px, ${y + dy}px) rotate(${Math.random() * 360}deg)`, opacity: 1, offset: 0.4 },
        { transform: `translate(${x + dx}px, ${y + 130}px) rotate(${Math.random() * 720}deg)`, opacity: 0 },
      ], { duration: 900 + Math.random() * 400, easing: "cubic-bezier(.2, .6, .4, 1)" }).onfinish = () => m.remove();
    }
  }

  // Le « crac » du cookie (si le son est activé)
  function craquement() {
    const ac = contexteAudio();
    if (!ac) return;
    const n = Math.floor(ac.sampleRate * 0.14);
    const tampon = ac.createBuffer(1, n, ac.sampleRate);
    const donnees = tampon.getChannelData(0);
    for (let i = 0; i < n; i++) donnees[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
    const source = ac.createBufferSource();
    source.buffer = tampon;
    const filtre = ac.createBiquadFilter();
    filtre.type = "highpass";
    filtre.frequency.value = 1800;
    const gain = ac.createGain();
    gain.gain.value = 0.45;
    source.connect(filtre).connect(gain).connect(ac.destination);
    source.start();
  }

  function casserCookie() {
    if (cookie.classList.contains("casse")) return nouveauCookie();
    cookie.classList.remove("nouveau");
    cookie.classList.add("casse");
    $(".sr-only", cookie).textContent = "Prendre un autre fortune cookie";
    $("#fortune-aide").textContent = "Touchez-le pour en prendre un autre";
    miettes(cookie);
    craquement();
    navigator.vibrate?.(20);
    const message = auHasard(FORTUNES);
    const chiffres = chiffresPorteBonheur().join(" · ");
    const choix = platPorteBonheur();
    resultatFortune.hidden = false;
    taper($("#fortune-message"), message);
    $("#fortune-chiffres").replaceChildren(typo("Vos chiffres porte-bonheur : "), el("b", "", chiffres));
    const plat = $("#fortune-plat");
    plat.hidden = !choix;
    let texteAnnonce = `${message} Vos chiffres porte-bonheur : ${chiffres}.`;
    if (choix) {
      const { p, c } = choix;
      const tarif = wok && c === wok.categorie ? `dès ${prix(p.priceCents)}` : prix(p.priceCents);
      plat.replaceChildren(typo("Votre plat porte-bonheur : "), el("b", "", p.name), ` · ${tarif}`);
      texteAnnonce += ` Votre plat porte-bonheur : ${p.name}, ${tarif}.`;
    }
    annoncer(typo(texteAnnonce));
    // Sur téléphone, le message s'affiche sous le cookie : on le montre s'il est hors de l'écran
    if (!sobre.matches) {
      setTimeout(() => {
        if (resultatFortune.getBoundingClientRect().bottom > innerHeight) resultatFortune.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 450);
    }
  }

  function nouveauCookie() {
    clearInterval(frappe);
    cookie.classList.remove("casse");
    relancer(cookie, "nouveau");
    $(".sr-only", cookie).textContent = "Casser le fortune cookie";
    $("#fortune-aide").textContent = "Touchez le cookie pour le casser";
    resultatFortune.hidden = true;
  }

  $("#fortune").hidden = false;
  cookie.addEventListener("click", casserCookie);
  $("#fortune-encore").addEventListener("click", () => {
    nouveauCookie();
    cookie.focus({ preventScroll: true });
    if (!sobre.matches) cookie.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  // ---------- Grands boutons « aimantés » (souris seulement) ----------
  if (pointeurFin.matches && !sobre.matches) {
    let aimante = null;
    const relacher = () => {
      aimante?.style.removeProperty("--mx");
      aimante?.style.removeProperty("--my");
      aimante = null;
    };
    document.addEventListener("pointermove", (e) => {
      const b = e.target.closest?.(".bouton-grand");
      if (b !== aimante) relacher();
      if (!b || b.disabled) return;
      aimante = b;
      const r = b.getBoundingClientRect();
      const dx = Math.max(-10, Math.min(10, (e.clientX - r.left - r.width / 2) * 0.18));
      const dy = Math.max(-6, Math.min(6, (e.clientY - r.top - r.height / 2) * 0.3));
      b.style.setProperty("--mx", `${dx.toFixed(1)}px`);
      b.style.setProperty("--my", `${dy.toFixed(1)}px`);
    }, { passive: true });
    document.documentElement.addEventListener("pointerleave", relacher);
  }

  // ---------- Animations : complètes pour tous ; le visiteur peut les réduire (pied de page) ----------
  function choisirAnimations(actives) {
    stockage.ecrire("wok888-animations", actives);
    try {
      if (actives) sessionStorage.removeItem("wok888-intro"); // l'ouverture se rejoue : les animations se voient tout de suite
    } catch {
      /* stockage indisponible : la page se recharge simplement */
    }
    location.reload();
  }
  const boutonAnimations = $("#bouton-animations");
  boutonAnimations.textContent = sobre.matches ? "Activer les animations" : "Réduire les animations";
  boutonAnimations.hidden = false;
  boutonAnimations.addEventListener("click", () => choisirAnimations(sobre.matches));

  // ---------- Démarrage ----------
  majHoraires();
  chargerCarte();
  chargerPhotos();
  setInterval(majHoraires, 30_000);
  setInterval(() => {
    if (!document.hidden) chargerCarte();
  }, 60_000);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) return;
    majHoraires();
    chargerCarte();
  });
})();
