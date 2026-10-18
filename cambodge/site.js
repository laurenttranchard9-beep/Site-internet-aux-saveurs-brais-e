// Aux Saveurs du Cambodge : carte (lue dans api.php), horaires en direct et plan à la demande.
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  const el = (tag, cls, texte) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (texte !== undefined) n.textContent = texte;
    return n;
  };
  const euros = (decimales) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: decimales });
  const prix = (c) => (c === null ? "Sur demande" : euros(2).format(c / 100));
  // « 10 € » plutôt que « 10,00 € » pour les grands prix de la section « À la une »
  const prixCourt = (c) => (c === null ? "Sur demande" : euros(c % 100 ? 2 : 0).format(c / 100));
  const VEDETTE = "a la une"; // étiquette qui met un plat en avant en haut de la page

  // ---------- Horaires (heure de Saint-Alban, quel que soit le fuseau de l'appareil) ----------
  const MIDI = [12 * 60, 14 * 60];
  const SOIR = [18 * 60, 21 * 60 + 45];
  // 0 = dimanche … 6 = samedi. Le samedi et le dimanche midi, c'est uniquement sur commande : pas compté comme ouvert.
  const CRENEAUX = [[SOIR], [MIDI, SOIR], [MIDI, SOIR], [MIDI, SOIR], [MIDI, SOIR], [MIDI, SOIR], [SOIR]];
  const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  const hm = (m) => `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`;

  function heureLocale(date = new Date()) {
    const p = {};
    const format = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    for (const { type, value } of format.formatToParts(date)) p[type] = value;
    return { jour: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday), minutes: Number(p.hour) * 60 + Number(p.minute) };
  }

  function statut({ jour, minutes }) {
    const enCours = CRENEAUX[jour].find(([debut, fin]) => minutes >= debut && minutes < fin);
    if (enCours) {
      const fin = enCours[1];
      return { ouvert: true, texte: fin - minutes <= 30 ? `Ferme bientôt · à ${hm(fin)}` : `Ouvert · jusqu'à ${hm(fin)}` };
    }
    for (let d = 0; d <= 7; d++) {
      const j = (jour + d) % 7;
      const suivant = CRENEAUX[j].find(([debut]) => d > 0 || debut > minutes);
      if (suivant) {
        const quand = d === 0 ? `à ${hm(suivant[0])}` : d === 1 ? `demain à ${hm(suivant[0])}` : `${JOURS[j]} à ${hm(suivant[0])}`;
        return { ouvert: false, texte: `Fermé · ouvre ${quand}` };
      }
    }
    return { ouvert: false, texte: "Fermé" };
  }

  function majHoraires() {
    const maintenant = heureLocale();
    const s = statut(maintenant);
    document.querySelectorAll("[data-statut]").forEach((n) => {
      if (n.textContent !== s.texte) n.textContent = s.texte; // évite de répéter l'annonce aux lecteurs d'écran
      n.classList.toggle("ouvert", s.ouvert);
      n.classList.toggle("ferme", !s.ouvert);
    });
    document.querySelectorAll(".horaires-table tr[data-jour]").forEach((tr) => {
      const aujourdhui = Number(tr.dataset.jour) === maintenant.jour;
      tr.classList.toggle("aujourdhui", aujourdhui);
      if (aujourdhui) tr.setAttribute("aria-current", "date");
      else tr.removeAttribute("aria-current");
    });
  }
  majHoraires();
  setInterval(majHoraires, 30_000);

  // ---------- La carte ----------
  const els = {
    entete: $("#entete"),
    outils: $("#carte-outils"),
    plats: $("#plats"),
    categories: $("#categories"),
    filtres: $("#filtres"),
    recherche: $("#recherche"),
    etat: $("#etat"),
    modele: $("#plat-modele"),
    une: $("#a-la-une"),
    unePlats: $("#une-plats"),
    uneTitre: $("#une-titre"),
    uneNote: $("#une-note"),
  };
  let donnees = { categories: [] };
  let empreinte = "";
  let requete = "";
  let filtresActifs = new Set();

  // Hauteur de l'en-tête et de la barre de recherche, collées en haut de l'écran.
  const decalage = () => els.entete.offsetHeight + els.outils.offsetHeight;
  function mesurer() {
    document.documentElement.style.setProperty("--decalage", `${decalage() + 12}px`);
  }
  addEventListener("resize", mesurer);

  function messageErreur() {
    const lien = el("a", "", "07 59 52 53 41");
    lien.href = "tel:+33759525341";
    els.etat.replaceChildren("La carte ne peut pas s'afficher pour le moment. Appelez-nous au ", lien, ".");
  }

  async function charger() {
    try {
      const rep = await fetch("api.php?action=menu", { cache: "no-store" });
      if (!rep.ok) throw new Error(String(rep.status));
      const texte = await rep.text();
      if (texte === empreinte) return; // rien n'a changé : on ne redessine pas
      donnees = JSON.parse(texte);
      empreinte = texte;
      afficher();
    } catch {
      if (!donnees.categories.length) messageErreur();
    }
  }

  function correspond(p, c) {
    if (filtresActifs.size && !p.tags.some((t) => filtresActifs.has(norm(t)))) return false;
    return !requete || norm(`${c.name} ${p.name} ${p.description} ${p.tags.join(" ")}`).includes(requete);
  }

  function afficherUne() {
    const vedettes = [];
    let categorie = null;
    for (const c of donnees.categories) {
      for (const p of c.products) {
        if (!p.tags.some((t) => norm(t) === VEDETTE)) continue;
        vedettes.push(p);
        categorie ??= c;
      }
    }
    els.une.hidden = !vedettes.length;
    if (!vedettes.length) return;
    els.uneTitre.textContent = categorie.name;
    els.uneNote.textContent = categorie.note || "À découvrir";
    els.unePlats.replaceChildren(
      ...vedettes.map((p) => {
        const li = el("li", p.soldOut ? "une-plat epuise" : "une-plat");
        li.append(el("p", "une-prix", prixCourt(p.priceCents)), el("p", "une-nom", p.name));
        if (p.description) li.append(el("p", "une-desc", p.description));
        if (p.soldOut) li.append(el("span", "badge epuise", "Épuisé"));
        return li;
      })
    );
  }

  function afficherFiltres() {
    const tags = new Map();
    for (const c of donnees.categories) {
      for (const p of c.products) {
        for (const t of p.tags) if (norm(t) !== VEDETTE) tags.set(norm(t), t);
      }
    }
    filtresActifs = new Set([...filtresActifs].filter((t) => tags.has(t))); // filtres disparus de la carte
    els.filtres.replaceChildren(
      ...[...tags].sort(([a], [b]) => a.localeCompare(b, "fr")).map(([cle, libelle]) => {
        const b = el("button", "filtre", libelle);
        b.type = "button";
        b.dataset.cle = cle;
        b.setAttribute("aria-pressed", String(filtresActifs.has(cle)));
        b.addEventListener("click", () => {
          if (filtresActifs.has(cle)) filtresActifs.delete(cle);
          else filtresActifs.add(cle);
          afficher();
          els.filtres.querySelector(`[data-cle="${CSS.escape(cle)}"]`)?.focus();
        });
        return b;
      })
    );
  }

  function plat(p) {
    const n = els.modele.content.firstElementChild.cloneNode(true);
    $(".plat-nom", n).textContent = p.name;
    $(".plat-prix", n).textContent = prix(p.priceCents);
    $(".plat-desc", n).textContent = p.description;
    const infos = $(".plat-infos", n);
    if (p.soldOut) {
      n.classList.add("epuise");
      infos.append(el("span", "badge epuise", "Épuisé"));
    } else if (p.remaining) {
      infos.append(el("span", "badge bientot", p.remaining === 1 ? "Plus qu'une portion" : `Plus que ${p.remaining} portions`));
    }
    for (const t of p.tags) {
      if (norm(t) === VEDETTE) continue;
      const b = el("span", "badge", t);
      b.dataset.tag = norm(t);
      infos.append(b);
    }
    return n;
  }

  function afficher() {
    afficherUne();
    afficherFiltres();
    const sections = [];
    const liens = [];
    for (const c of donnees.categories) {
      const choisis = c.products.filter((p) => correspond(p, c));
      if (!choisis.length) continue;
      const section = el("section", "categorie");
      section.id = `categorie-${c.id}`;
      section.setAttribute("aria-labelledby", `titre-${c.id}`);
      const titre = el("h3", "", c.name);
      titre.id = `titre-${c.id}`;
      section.append(titre);
      if (c.note) section.append(el("p", "categorie-note", c.note));
      const liste = el("ul", "plats");
      liste.append(...choisis.map(plat));
      section.append(liste);
      sections.push(section);

      const lien = el("a", "", c.name);
      lien.href = `#categorie-${c.id}`;
      const li = el("li");
      li.append(lien);
      liens.push(li);
    }
    els.plats.replaceChildren(...sections);
    els.categories.replaceChildren(...liens);
    if (!donnees.categories.length) els.etat.textContent = "La carte est en cours de préparation.";
    else if (!sections.length) els.etat.textContent = "Aucun plat ne correspond à votre recherche.";
    else els.etat.textContent = "";
    mesurer();
    suivreCategories();
  }

  // Met en valeur, dans la barre, la catégorie lue à l'écran : la dernière dont le titre est passé sous la barre.
  let categorieActive = null;
  function suivreCategories() {
    const ligne = decalage() + 24;
    let actuelle = null;
    for (const s of els.plats.querySelectorAll(".categorie")) {
      if (s.getBoundingClientRect().top > ligne) break;
      actuelle = s;
    }
    const id = actuelle ? `#${actuelle.id}` : null;
    if (id === categorieActive && els.categories.querySelector(".actif")) return;
    categorieActive = id;
    els.categories.querySelectorAll("a").forEach((a) => {
      const actif = a.getAttribute("href") === id;
      a.classList.toggle("actif", actif);
      if (actif) {
        a.setAttribute("aria-current", "true");
        // Fait défiler la barre horizontalement seulement : scrollIntoView ferait aussi bouger la page.
        if (els.categories.scrollWidth > els.categories.clientWidth) {
          const gauche = a.offsetLeft - (els.categories.clientWidth - a.offsetWidth) / 2;
          els.categories.scrollTo({ left: Math.max(0, gauche), behavior: "smooth" });
        }
      } else {
        a.removeAttribute("aria-current");
      }
    });
  }
  let enAttente = false;
  addEventListener("scroll", () => {
    if (enAttente) return;
    enAttente = true;
    requestAnimationFrame(() => {
      enAttente = false;
      suivreCategories();
    });
  }, { passive: true });

  els.recherche.addEventListener("input", () => {
    requete = norm(els.recherche.value);
    afficher();
    // Si l'on cherchait au milieu de la carte, on remonte au début des résultats.
    const haut = els.filtres.getBoundingClientRect().top;
    if (haut < decalage()) scrollTo({ top: scrollY + haut - decalage() - 8 });
  });

  charger();
  setInterval(() => {
    if (!document.hidden) charger();
  }, 60_000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) charger();
  });

  // ---------- Plan : chargé seulement si le visiteur le demande (aucun service extérieur sans action de sa part) ----------
  $("#afficher-plan")?.addEventListener("click", () => {
    const plan = $("#plan");
    const carte = el("iframe");
    carte.title = "Plan : 10 avenue Salvador Allende, 31140 Saint-Alban";
    carte.src = "https://www.openstreetmap.org/export/embed.html?bbox=1.4009%2C43.6848%2C1.4159%2C43.6913&layer=mapnik&marker=43.688048%2C1.40842";
    carte.referrerPolicy = "no-referrer";
    const legende = el("figcaption");
    const lien = el("a", "", "Agrandir le plan sur OpenStreetMap");
    lien.href = "https://www.openstreetmap.org/?mlat=43.688048&mlon=1.40842#map=17/43.688048/1.40842";
    lien.target = "_blank";
    lien.rel = "noopener";
    legende.append(lien);
    plan.replaceChildren(carte, legende);
    lien.focus({ preventScroll: true });
  });
})();
