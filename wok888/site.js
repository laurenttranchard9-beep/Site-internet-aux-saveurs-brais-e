// WOK 888 : carte (api.php), wok à composer, commande à emporter et suivi (commande.php), machine 888, animations.
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
  const sobre = matchMedia("(prefers-reduced-motion: reduce)");
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
  const ETIQUETTE = { une: "a la une", base: "base", supplement: "supplement", surPlace: "sur place" };
  const SPECIALES = new Set(Object.values(ETIQUETTE));
  const a = (p, etiquette) => p.cles.includes(ETIQUETTE[etiquette]);
  const commandable = (p) => !p.soldOut && p.priceCents !== null && !a(p, "surPlace") && !a(p, "base") && !a(p, "supplement");

  document.documentElement.classList.add("revele"); // les blocs [data-revele] apparaissent au défilement

  async function api(url, corps) {
    const options = corps === undefined
      ? { cache: "no-store" }
      : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) };
    const rep = await fetch(url, options);
    const data = await rep.json().catch(() => ({}));
    if (!rep.ok) {
      const erreur = new Error(data.error || `Le serveur ne répond pas. Réessayez, ou appelez-nous au ${TEL}.`);
      erreur.status = rep.status;
      erreur.data = data;
      throw erreur;
    }
    return data;
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

  // ---------- Braises de l'accueil ----------
  (function braises() {
    const toile = $("#braises");
    const ctx = toile.getContext("2d");
    if (!ctx || sobre.matches) return;
    const scene = $(".heros-scene");
    const sprites = ["255,214,120", "255,138,31", "227,60,40"].map((rvb) => {
      const c = document.createElement("canvas");
      c.width = c.height = 32;
      const g = c.getContext("2d");
      const d = g.createRadialGradient(16, 16, 0, 16, 16, 16);
      d.addColorStop(0, "rgba(255,250,230,1)");
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
    new IntersectionObserver(([e]) => (e.isIntersecting ? demarrer() : (actif = false))).observe($("#accueil"));
    document.addEventListener("visibilitychange", () => (document.hidden ? (actif = false) : demarrer()));
    addEventListener("resize", () => actif && dimensionner());
  })();

  // ---------- Horaires et état de la commande en ligne (commande.php) ----------
  let etatCommande = null;
  async function chargerEtat() {
    try {
      const etat = await api("commande.php?action=etat");
      document.querySelectorAll("[data-statut]").forEach((n) => {
        if (n.textContent !== etat.statut.texte) n.textContent = etat.statut.texte; // évite de répéter l'annonce
        n.classList.toggle("ouvert", etat.statut.ouvert);
        n.classList.toggle("ferme", !etat.statut.ouvert);
      });
      $$(".horaires tr[data-jour]").forEach((tr) => {
        const aujourdhui = Number(tr.dataset.jour) === etat.jour;
        tr.classList.toggle("aujourdhui", aujourdhui);
        if (aujourdhui) tr.setAttribute("aria-current", "date");
        else tr.removeAttribute("aria-current");
      });
      etatCommande = etat.commande;
    } catch {
      etatCommande = null;
    }
    majDisponibilite();
    return etatCommande;
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
      nettoyerPanier();
      rendreCarte(premiere);
      rendreComposeur();
      rendreUne();
      preparerMachine();
      majPanier();
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
  }
  addEventListener("resize", mesurer);

  function rendreOnglets() {
    const liste = $("#univers");
    if (!univers.some((u) => u.cle === universActif)) universActif = univers[0]?.cle ?? null;
    const recherche = Boolean(requete || filtresActifs.size);
    liste.replaceChildren(...univers.map((u) => {
      const b = el("button", "onglet");
      b.type = "button";
      b.setAttribute("role", "tab");
      b.dataset.cle = u.cle;
      const actif = u.cle === universActif && !recherche;
      b.setAttribute("aria-selected", String(actif));
      b.tabIndex = u.cle === universActif ? 0 : -1;
      b.classList.toggle("attenue", recherche);
      b.append(icone(ICONES_UNIVERS[u.cle] || "u-defaut"), u.nom);
      return b;
    }));
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

  function quantiteDans(id) {
    return panier.filter((l) => l.id === id && !l.options.length).reduce((n, l) => n + l.quantite, 0);
  }

  function boutonAjouter(p) {
    const b = el("button", "ajouter");
    b.type = "button";
    b.dataset.id = p.id;
    b.setAttribute("aria-label", `Ajouter « ${p.name} » à ma commande`);
    b.append(icone("ic-plus"));
    const qte = quantiteDans(p.id);
    if (qte) b.append(el("span", "ajouter-qte", String(qte)));
    return b;
  }

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
        const b = el("button", "bouton bouton-clair bouton-petit composer-lien", "Composer");
        b.type = "button";
        b.dataset.garniture = p.id;
        cote.append(b);
      }
    } else if (commandable(p)) {
      cote.append(boutonAjouter(p));
    } else if (a(p, "surPlace") && !p.soldOut) {
      cote.append(el("span", "plat-sur-place", "Sur place"));
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
    const lien = el("a", "bouton bouton-feu bouton-grand");
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
    const ajout = e.target.closest(".ajouter");
    if (ajout) return ajouter(Number(ajout.dataset.id), [], 1, ajout);
    const composer = e.target.closest(".composer-lien");
    if (composer) {
      choisirGarniture(Number(composer.dataset.garniture));
      $("#composer").scrollIntoView({ behavior: sobre.matches ? "auto" : "smooth" });
    }
  });

  // ---------- Ma commande : le panier (gardé sur cet appareil) ----------
  let panier = stockage.lire("wok888-panier", []);
  if (!Array.isArray(panier)) panier = [];
  const cleLigne = (id, options) => [id, ...[...options].sort((x, y) => x - y)].join("+");

  function resoudre(ligne) {
    const entree = produits.get(ligne.id);
    if (!entree) return null;
    const options = ligne.options.map((o) => produits.get(o)?.p);
    if (options.some((o) => !o)) return null;
    const unitaire = (entree.p.priceCents ?? 0) + options.reduce((s, o) => s + (o.priceCents ?? 0), 0);
    return {
      nom: entree.p.name,
      details: options.map((o) => o.name).join(" · "),
      unitaire,
      ok: commandable(entree.p) && options.every((o) => !o.soldOut),
    };
  }

  // Après une mise à jour de la carte : retire ce qui n'est plus commandable
  function nettoyerPanier() {
    const avant = panier.length;
    panier = panier.filter((l) => resoudre(l)?.ok);
    if (panier.length !== avant) {
      sauverPanier();
      annoncer("Un plat de votre commande n'est plus disponible : il a été retiré.");
    }
  }
  const sauverPanier = () => stockage.ecrire("wok888-panier", panier.map(({ id, options, quantite }) => ({ id, options, quantite })));
  const totalPanier = () => panier.reduce((s, l) => s + (resoudre(l)?.unitaire ?? 0) * l.quantite, 0);
  const nombreArticles = () => panier.reduce((n, l) => n + l.quantite, 0);

  function ajouter(id, options = [], quantite = 1, depuis = null) {
    const cle = cleLigne(id, options);
    const ligne = panier.find((l) => cleLigne(l.id, l.options) === cle);
    if (ligne) ligne.quantite = Math.min(30, ligne.quantite + quantite);
    else panier.push({ id, options: [...options], quantite });
    sauverPanier();
    majPanier();
    const info = resoudre({ id, options });
    if (info) annoncer(`« ${info.nom} » ajouté à votre commande.`);
    if (depuis) {
      volerVersPanier(depuis);
      depuis.classList.remove("ajoute");
      void depuis.offsetWidth;
      depuis.classList.add("ajoute");
    }
    navigator.vibrate?.(12);
  }

  function changerQuantite(index, delta) {
    const ligne = panier[index];
    if (!ligne) return;
    ligne.quantite = Math.max(0, Math.min(30, ligne.quantite + delta));
    if (!ligne.quantite) panier.splice(index, 1);
    sauverPanier();
    majPanier();
  }

  function boutonPanierVisible() {
    const barre = $("#barre-panier");
    return barre.getBoundingClientRect().width ? barre : $("#ouvrir-panier");
  }

  function secouerPanier() {
    const b = boutonPanierVisible();
    b.classList.remove("secousse");
    void b.offsetWidth;
    b.classList.add("secousse");
  }

  // Une pastille de feu file de l'élément touché jusqu'à « Ma commande ».
  function volerVersPanier(depuis) {
    if (sobre.matches) return secouerPanier();
    const de = depuis.getBoundingClientRect();
    const vers = boutonPanierVisible().getBoundingClientRect();
    const x0 = de.left + de.width / 2, y0 = de.top + de.height / 2;
    const x1 = vers.left + vers.width / 2, y1 = vers.top + vers.height / 2;
    const sommet = Math.min(y0, y1) - 90;
    const porteur = el("span", "vol-porteur");
    const point = el("span", "vol-panier");
    porteur.append(point);
    document.body.append(porteur);
    const duree = 760;
    porteur.animate([{ transform: `translateX(${x0}px)` }, { transform: `translateX(${x1}px)` }], { duration: duree, easing: "linear", fill: "forwards" });
    const anim = point.animate([
      { transform: `translateY(${y0}px) scale(.5)`, opacity: 0.4, easing: "cubic-bezier(.2,.7,.4,1)" },
      { transform: `translateY(${sommet}px) scale(1.1)`, opacity: 1, offset: 0.4, easing: "cubic-bezier(.6,0,.9,.5)" },
      { transform: `translateY(${y1}px) scale(.35)`, opacity: 0.9 },
    ], { duration: duree, fill: "forwards" });
    anim.onfinish = () => {
      porteur.remove();
      secouerPanier();
    };
  }

  function majPanier() {
    const n = nombreArticles();
    for (const id of ["#panier-compte", "#barre-compte"]) {
      const badge = $(id);
      const avant = badge.textContent;
      badge.textContent = String(n);
      badge.hidden = n === 0;
      if (n && avant !== String(n)) {
        badge.classList.remove("pop");
        void badge.offsetWidth;
        badge.classList.add("pop");
      }
    }
    $("#panier-libelle").textContent = n ? typo(`Ma commande : ${n} article${n > 1 ? "s" : ""}`) : "Ma commande, vide";
    // Quantités affichées sur les boutons « + » de la carte
    $$(".ajouter[data-id]").forEach((b) => {
      const qte = quantiteDans(Number(b.dataset.id));
      let badge = $(".ajouter-qte", b);
      if (!qte) return badge?.remove();
      if (!badge) b.append((badge = el("span", "ajouter-qte")));
      badge.textContent = String(qte);
    });
    rendreLignes();
  }

  function rendreLignes() {
    const vide = !panier.length;
    $("#panier-vide").hidden = !vide;
    $("#panier-pied").hidden = vide;
    $("#lignes").replaceChildren(...panier.map((l, index) => {
      const info = resoudre(l) ?? { nom: "Plat indisponible", details: "", unitaire: 0 };
      const li = el("li", "ligne");
      const texte = el("div");
      texte.append(el("p", "ligne-nom", info.nom));
      if (info.details) texte.append(el("p", "ligne-details", info.details));
      const qte = el("div", "ligne-qte");
      const moins = el("button", "qte-btn");
      moins.type = "button";
      moins.dataset.index = index;
      moins.dataset.delta = "-1";
      moins.setAttribute("aria-label", l.quantite > 1 ? `Retirer un « ${info.nom} »` : `Retirer « ${info.nom} » de ma commande`);
      moins.append(icone("ic-moins"));
      const plus = el("button", "qte-btn");
      plus.type = "button";
      plus.dataset.index = index;
      plus.dataset.delta = "1";
      plus.setAttribute("aria-label", `Ajouter un « ${info.nom} »`);
      plus.append(icone("ic-plus"));
      qte.append(moins, el("span", "qte-valeur", String(l.quantite)), plus);
      li.append(texte, el("p", "ligne-prix", prix(info.unitaire * l.quantite)), qte);
      return li;
    }));
    const total = prix(totalPanier());
    $("#panier-total").textContent = total;
    $("#formulaire-total").textContent = total;
    $("#envoyer-commande").textContent = `Envoyer ma commande · ${total}`;
  }

  $("#lignes").addEventListener("click", (e) => {
    const b = e.target.closest(".qte-btn");
    if (!b) return;
    const index = Number(b.dataset.index);
    const delta = Number(b.dataset.delta);
    if (delta < 0 && panier[index]?.quantite === 1 && !sobre.matches) {
      b.closest(".ligne").classList.add("retiree");
      setTimeout(() => changerQuantite(index, delta), 250);
    } else {
      changerQuantite(index, delta);
    }
  });
  $("#vider-panier").addEventListener("click", () => {
    if (!confirm("Vider votre commande ?")) return;
    panier = [];
    sauverPanier();
    majPanier();
  });

  function majDisponibilite() {
    const dispo = $("#commande-dispo");
    if (!etatCommande) {
      dispo.textContent = "";
      return;
    }
    dispo.classList.toggle("ok", etatCommande.possible);
    dispo.textContent = typo(etatCommande.possible
      ? `Commande en ligne ouverte : retrait dès ${etatCommande.creneaux[0].libelle}`
      : etatCommande.raison === "fermee"
        ? "La commande en ligne ouvre aux heures d'ouverture."
        : "Commande en ligne indisponible pour le moment : appelez-nous.");
  }

  // ---------- Le tiroir « Ma commande » et la fenêtre (réservation, photos) ----------
  const tiroir = $("#panier");
  const modale = $("#modale");
  let retourFocus = null;
  let fenetreOuverte = null;

  function ouvrir(fenetre) {
    if (fenetreOuverte && fenetreOuverte !== fenetre) fermer(fenetreOuverte, false);
    retourFocus = document.activeElement;
    fenetreOuverte = fenetre;
    fenetre.hidden = false;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => requestAnimationFrame(() => fenetre.classList.add("ouvert")));
    $(".tiroir-panneau, .modale-panneau", fenetre).focus({ preventScroll: true });
  }
  function fermer(fenetre = fenetreOuverte, rendreFocus = true) {
    if (!fenetre || fenetre.hidden) return;
    fenetre.classList.remove("ouvert");
    if (fenetreOuverte === fenetre) fenetreOuverte = null;
    document.body.style.overflow = "";
    setTimeout(() => {
      if (fenetre.classList.contains("ouvert")) return;
      fenetre.hidden = true;
      if (fenetre === modale) $("#modale-corps").replaceChildren(); // décharge la réservation ou la photo
    }, sobre.matches ? 0 : 420);
    if (rendreFocus) retourFocus?.focus?.({ preventScroll: true });
  }
  for (const fenetre of [tiroir, modale]) {
    fenetre.addEventListener("click", (e) => {
      if (e.target.closest("[data-fermer]")) fermer(fenetre, !e.target.closest("a[href^='#']"));
    });
  }
  document.addEventListener("keydown", (e) => {
    if (!fenetreOuverte) return;
    if (e.key === "Escape") return fermer();
    if (e.key !== "Tab") return;
    // Le focus reste dans la fenêtre ouverte
    const focusables = $$("a[href], button:not([disabled]), input:not([tabindex='-1']), select, textarea", fenetreOuverte)
      .filter((n) => n.getClientRects().length && !n.closest("[hidden]"));
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

  function montrerVue(vue) {
    for (const v of ["panier", "formulaire", "suivi"]) $(`#vue-${v}`).hidden = v !== vue;
    $("#panier-retour").hidden = vue !== "formulaire";
    $("#panier-titre").textContent = vue === "suivi" ? "Ma commande" : vue === "formulaire" ? "À emporter" : "Ma commande";
  }

  function ouvrirPanier() {
    montrerVue("panier");
    ouvrir(tiroir);
    chargerEtat();
  }
  $("#ouvrir-panier").addEventListener("click", ouvrirPanier);
  $("#barre-panier").addEventListener("click", ouvrirPanier);
  $("#panier-retour").addEventListener("click", () => montrerVue("panier"));

  // ---------- Commande à emporter ----------
  const formulaire = $("#vue-formulaire");

  function remplirRecap(liste) {
    liste.replaceChildren(...panier.map((l) => {
      const info = resoudre(l);
      if (!info) return "";
      const li = el("li");
      li.append(el("span", "q", `${l.quantite} ×`), el("span", "", info.nom), el("span", "p", prix(info.unitaire * l.quantite)));
      if (info.details) li.append(el("small", "", info.details));
      return li;
    }));
  }

  async function allerCommande() {
    montrerVue("formulaire");
    $("#erreur-commande").hidden = true;
    $("#envoyer-commande").disabled = true;
    for (const bloc of ["#champs", "#formulaire-pied", "#indispo"]) $(bloc).hidden = true;
    $("#chargement-commande").hidden = false;
    await chargerEtat();
    $("#chargement-commande").hidden = true;
    const ouvert = Boolean(etatCommande?.possible);
    $("#indispo").hidden = ouvert;
    $("#champs").hidden = !ouvert;
    $("#formulaire-pied").hidden = !ouvert;
    if (!ouvert) {
      $("#indispo-texte").textContent = typo(etatCommande?.raison === "fermee"
        ? "La commande en ligne ouvre aux heures d'ouverture. Appelez-nous : votre commande est prête à être lue au téléphone."
        : "Appelez-nous : votre commande est prête à être lue au téléphone.");
      remplirRecap($("#recap-tel"));
      $("#recap-tel-total").textContent = typo(`Total : ${prix(totalPanier())}`);
      return;
    }
    remplirCreneaux(etatCommande.creneaux);
    const client = stockage.lire("wok888-client", {});
    if (!formulaire.nom.value && client.nom) formulaire.nom.value = client.nom;
    if (!formulaire.telephone.value && client.telephone) formulaire.telephone.value = client.telephone;
    $("#envoyer-commande").disabled = false;
    formulaire.retrait.focus({ preventScroll: true });
  }
  $("#aller-commande").addEventListener("click", allerCommande);

  function remplirCreneaux(creneaux) {
    const select = formulaire.retrait;
    const avant = select.value;
    select.replaceChildren(...creneaux.map((c, i) => {
      const o = el("option", "", i === 0 ? `Dès que possible · ${c.libelle}` : c.libelle);
      o.value = c.valeur;
      return o;
    }));
    if ([...select.options].some((o) => o.value === avant)) select.value = avant;
  }

  formulaire.addEventListener("submit", async (e) => {
    e.preventDefault();
    const erreur = $("#erreur-commande");
    const montrerErreur = (texte, champ) => {
      erreur.textContent = typo(texte);
      erreur.hidden = false;
      if (champ) {
        champ.setAttribute("aria-invalid", "true");
        champ.focus();
      }
    };
    $$("[aria-invalid]", formulaire).forEach((n) => n.removeAttribute("aria-invalid"));
    erreur.hidden = true;
    const nom = formulaire.nom.value.trim();
    const telephone = formulaire.telephone.value.trim();
    if (nom.length < 2) return montrerErreur("Indiquez votre nom, pour que l'on vous reconnaisse au retrait.", formulaire.nom);
    if (!/^\+?[\d\s.\-()]{8,20}$/.test(telephone)) return montrerErreur("Indiquez un numéro de téléphone valide, par exemple 06 12 34 56 78.", formulaire.telephone);
    if (!panier.length) return montrerErreur("Votre commande est vide.");
    const bouton = $("#envoyer-commande");
    bouton.disabled = true;
    bouton.textContent = "Envoi en cours…";
    try {
      const r = await api("commande.php?action=envoyer", {
        nom,
        telephone,
        note: formulaire.note.value.trim(),
        retrait: Number(formulaire.retrait.value),
        site: formulaire.site.value,
        articles: panier.map(({ id, options, quantite }) => ({ id, options, quantite })),
      });
      stockage.ecrire("wok888-client", { nom, telephone });
      const suivis = stockage.lire("wok888-suivis", []).filter((s) => Date.now() - s.cree < 12 * 3600e3);
      suivis.unshift({ jeton: r.jeton, numero: r.numero, cree: Date.now() });
      stockage.ecrire("wok888-suivis", suivis.slice(0, 5));
      panier = [];
      sauverPanier();
      majPanier();
      formulaire.note.value = "";
      montrerVue("suivi");
      suivre(r.jeton, true);
      feuDeJoie($(".suivi-wok"));
    } catch (err) {
      if (err.data?.creneaux) remplirCreneaux(err.data.creneaux);
      if (err.data?.raison) return allerCommande();
      montrerErreur(err.message);
      if (err.status === 409) chargerCarte();
    } finally {
      bouton.disabled = false;
      rendreLignes();
    }
  });

  // ---------- Suivi de la commande ----------
  const MESSAGES = {
    nouvelle: (r) => `Envoyée ! Le restaurant la confirme dans un instant. Retrait prévu à ${r.retraitTexte}.`,
    acceptee: (r) => `Acceptée : ça saute dans le wok ! Retrait à ${r.retraitTexte}.`,
    prete: () => "Elle est prête : elle vous attend au comptoir. À tout de suite !",
    retiree: () => "Retirée. Bon appétit, et merci !",
    annulee: () => `Le restaurant n'a pas pu prendre cette commande. Appelez-nous au ${TEL}.`,
  };
  let suiviJeton = null;
  let dernierStatut = null;
  let minuteurSuivi = null;

  async function suivre(jeton, immediat = false) {
    suiviJeton = jeton;
    clearTimeout(minuteurSuivi);
    try {
      const r = await api(`commande.php?action=suivi&jeton=${encodeURIComponent(jeton)}`);
      afficherSuivi(r, immediat);
      if (["nouvelle", "acceptee", "prete"].includes(r.statut)) minuteurSuivi = setTimeout(() => suivre(jeton), 15000);
      else oublierSuivi(jeton);
    } catch (err) {
      if (err.status === 404) oublierSuivi(jeton);
      else minuteurSuivi = setTimeout(() => suivre(jeton), 30000);
    }
  }

  function oublierSuivi(jeton) {
    stockage.ecrire("wok888-suivis", stockage.lire("wok888-suivis", []).filter((s) => s.jeton !== jeton));
    $("#suivi-pastille").hidden = true;
  }

  function afficherSuivi(r, immediat) {
    $("#suivi-numero").textContent = `N° ${r.numero}`;
    $("#suivi-message").textContent = typo(MESSAGES[r.statut]?.(r) ?? "");
    // Étapes franchies : « Envoyée » dès la réception, « En préparation » en cours une fois acceptée, puis « Prête ».
    const faites = { nouvelle: 1, acceptee: 1, prete: 3, retiree: 3 }[r.statut] ?? 0;
    $$("#etapes-suivi li").forEach((li, i) => {
      li.classList.toggle("fait", i < faites);
      li.classList.toggle("actuel", r.statut === "acceptee" && i === 1);
    });
    const recap = $("#recap-suivi");
    recap.replaceChildren(...r.articles.map((art) => {
      const li = el("li");
      li.append(el("span", "q", `${art.quantite} ×`), el("span", "", art.nom), el("span", "p", prix(art.prixCents * art.quantite)));
      if (art.details) li.append(el("small", "", art.details));
      return li;
    }));
    $("#suivi-total").textContent = typo(`Total : ${prix(r.totalCents)}, à régler au retrait`);
    const pastille = $("#suivi-pastille");
    const enCours = ["nouvelle", "acceptee", "prete"].includes(r.statut);
    pastille.hidden = !enCours;
    pastille.textContent = typo(`Commande n° ${r.numero} · ${{ nouvelle: "envoyée", acceptee: "en préparation", prete: "prête !" }[r.statut] ?? ""}`);
    if (!immediat && dernierStatut && dernierStatut !== r.statut) {
      if (r.statut === "prete") {
        carillon();
        navigator.vibrate?.([80, 60, 80]);
        feuDeJoie(pastille);
      }
      annoncer(`Commande n° ${r.numero} : ${MESSAGES[r.statut]?.(r)}`);
    }
    dernierStatut = r.statut;
  }

  $("#suivi-pastille").addEventListener("click", () => {
    montrerVue("suivi");
    ouvrir(tiroir);
    if (suiviJeton) suivre(suiviJeton);
  });
  $("#nouvelle-commande").addEventListener("click", () => montrerVue("panier"));

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
    $$('a[href="#composer"]').forEach((lien) => (lien.hidden = !visible && !lien.closest(".tiroir")));
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

  function redessinerWok(animer) {
    const options = { tomber: animer };
    for (const [couche, choix, role, emplacements] of [
      [$("#couche-base"), choixWok.base, "base", EMPLACEMENTS.base],
      [$("#couche-garniture"), choixWok.garniture, "garniture", EMPLACEMENTS.garniture],
    ]) {
      const voulu = choix ? `${role}-${choix.id}` : "";
      if (couche.dataset.contenu === voulu) continue;
      couche.dataset.contenu = voulu;
      animer ? vider(couche) : couche.replaceChildren();
      if (choix) poser(couche, symboleDe(choix, role), emplacements, { ...options, delai: animer ? 120 : 0, graine: choix.id });
    }
    const plus = $("#couche-plus");
    const voulus = [...choixWok.supplements].sort().join(",");
    if (plus.dataset.contenu !== voulus) {
      plus.dataset.contenu = voulus;
      animer ? vider(plus) : plus.replaceChildren();
      [...choixWok.supplements].forEach((id, i) => {
        const p = wok.supplements.find((s) => s.id === id);
        if (p) poser(plus, symboleDe(p, "supplement"), [EMPLACEMENTS.plus[0].map((v, j) => v + (j ? 0 : i * 40))], { ...options, delai: 150 });
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
    $("#wok-ajouter").disabled = !(base && garniture && commandable(garniture));
    $("#wok-recommencer").hidden = !(base || garniture || supplements.size);
  }

  $("#composeur").addEventListener("change", (e) => {
    const input = e.target;
    const id = Number(input.value);
    if (input.name === "base") choixWok.base = wok.bases.find((b) => b.id === id) ?? null;
    if (input.name === "garniture") choixWok.garniture = wok.garnitures.find((g) => g.id === id) ?? null;
    if (input.name === "supplement") input.checked ? choixWok.supplements.add(id) : choixWok.supplements.delete(id);
    redessinerWok(true);
    majResumeWok();
    faireSauter(input.name === "supplement" ? 350 : 520);
  });

  function choisirGarniture(id) {
    if (!wok) return;
    choixWok.garniture = wok.garnitures.find((g) => g.id === id) ?? choixWok.garniture;
    const input = $(`#choix-garniture input[value="${id}"]`);
    if (input) input.checked = true;
    redessinerWok(true);
    majResumeWok();
    faireSauter(700);
  }

  $("#wok-ajouter").addEventListener("click", (e) => {
    const { base, garniture, supplements } = choixWok;
    if (!base || !garniture) return;
    ajouter(garniture.id, [base.id, ...wok.supplements.filter((s) => supplements.has(s.id)).map((s) => s.id)], 1, e.currentTarget);
    const bouton = e.currentTarget;
    const texte = bouton.lastChild.textContent;
    bouton.lastChild.textContent = typo("Ajouté à votre commande !");
    setTimeout(() => (bouton.lastChild.textContent = texte), 1600);
    feuDeJoie(scene);
  });

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

  function carillon() {
    const ac = contexteAudio();
    if (!ac) return;
    const t0 = ac.currentTime;
    [[880, 0], [1320, 0.16]].forEach(([frequence, decalage]) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.frequency.value = frequence;
      gain.gain.setValueAtTime(0.0001, t0 + decalage);
      gain.gain.exponentialRampToValueAtTime(0.25, t0 + decalage + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + decalage + 0.8);
      osc.connect(gain).connect(ac.destination);
      osc.start(t0 + decalage);
      osc.stop(t0 + decalage + 0.85);
    });
  }

  // Gerbe d'étincelles dorées autour d'un élément (ajout du wok, commande envoyée, machine 888)
  function feuDeJoie(autour, nombre = 22) {
    if (sobre.matches || !autour) return;
    const r = autour.getBoundingClientRect();
    if (!r.width) return;
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    for (let i = 0; i < nombre; i++) {
      const p = el("span", "piece-or");
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
    $("#signature-titre").textContent = vedettes.every((v) => v.c === premiere) ? premiere.sousNom : "À la une";
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
      if (commandable(p)) {
        const b = el("button", "bouton bouton-feu");
        b.type = "button";
        b.dataset.id = p.id;
        b.append(icone("ic-sac"), "Ajouter");
        bas.append(b);
      } else {
        bas.append(el("span", "epuise-texte", p.soldOut ? "Épuisé" : "Sur place"));
      }
      carte.append(bas);
      if (!sobre.matches) carte.style.transitionDelay = `${i * 80}ms`;
      return carte;
    }));
    observerApparitions(section);
  }

  $("#signature-liste").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-id]");
    if (b) ajouter(Number(b.dataset.id), [], 1, b);
  });
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
          if (!commandable(p)) continue;
          const choix = { id: p.id, options: [], nom: p.name, details: "", prix: p.priceCents };
          if (u.cle === "entrees" && p.priceCents >= 400) reserve.entree.push(choix);
          else if ((u.cle === "nos plats" && !norm(c.sousNom).includes("accompagnement")) || u.cle === "poke bowls") reserve.plat.push(choix);
          else if (u.cle === "desserts") reserve.dessert.push(choix);
        }
      }
    }
    // Les woks : une garniture et une base tirées au sort
    if (wok) {
      const bases = wok.bases.filter((b) => !b.soldOut);
      for (const g of wok.garnitures.filter(commandable)) {
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
    return { id: choix.wok.id, options: [base.id], nom: choix.wok.name, details: base.name, prix: choix.wok.priceCents + base.priceCents };
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
    $("#machine-ajouter").hidden = true;
    $("#machine-resultat").textContent = "Les rouleaux tournent…";
    tirage = { entree: tirer("entree"), plat: tirer("plat"), dessert: tirer("dessert") };
    await Promise.all($$(".rouleau", machine).map((r, i) => tourner(r, tirage[r.dataset.type], r.dataset.type, 1300 + i * 500)));
    machine.classList.remove("tourne");
    const total = tirage.entree.prix + tirage.plat.prix + tirage.dessert.prix;
    const resultat = $("#machine-resultat");
    resultat.replaceChildren(typo("Votre repas porte-bonheur : "), el("b", "", prix(total)));
    annoncer(`La machine a choisi : ${tirage.entree.nom}, ${tirage.plat.nom}, ${tirage.dessert.nom}, pour ${prix(total)}.`);
    $("#machine-ajouter").hidden = false;
    relancer(machine, "gagne");
    feuDeJoie($(".machine-enseigne"), 26);
    enCours = false;
  }
  $("#lancer").addEventListener("click", lancer);
  $("#levier").addEventListener("click", lancer);
  $("#machine-ajouter").addEventListener("click", (e) => {
    if (!tirage) return;
    for (const choix of [tirage.entree, tirage.plat, tirage.dessert]) ajouter(choix.id, choix.options, 1, null);
    volerVersPanier(e.currentTarget);
    e.currentTarget.hidden = true;
    $("#machine-resultat").textContent = typo("C'est dans votre commande. Bon appétit !");
  });

  // ---------- Réservation (resOS), chargée seulement à la demande ----------
  function ouvrirModale(titre, contenu) {
    $("#modale-titre").textContent = titre;
    $("#modale-corps").replaceChildren(...contenu);
    ouvrir(modale);
  }
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
      const { photos } = await api("photos.php");
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

  // ---------- Démarrage ----------
  majPanier();
  chargerCarte();
  chargerEtat();
  chargerPhotos();
  setInterval(() => {
    if (document.hidden) return;
    chargerCarte();
    chargerEtat();
  }, 60_000);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) return;
    chargerCarte();
    chargerEtat();
    if (suiviJeton) suivre(suiviJeton);
  });
  // Une commande envoyée récemment depuis cet appareil : on reprend son suivi
  const suiviRecent = stockage.lire("wok888-suivis", []).find((s) => Date.now() - s.cree < 12 * 3600e3);
  if (suiviRecent) suivre(suiviRecent.jeton, true);
})();
