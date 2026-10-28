// Écran de réception des commandes en ligne (WOK 888).
// Tant qu'il est ouvert, il se signale au serveur toutes les 10 secondes : c'est ce qui ouvre la commande en ligne sur le site.
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, cls, texte) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (texte !== undefined) n.textContent = texte;
    return n;
  };
  const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
  const prix = (c) => euros.format(c / 100);
  const RAFRAICHIR = 10_000;
  const RAPPEL_SON = 15_000;

  class ApiError extends Error {
    constructor(status, data) {
      super(data.error || "Erreur réseau. Réessayez.");
      this.status = status;
    }
  }

  async function appel(fichier, action, body) {
    const res = await fetch(`../${fichier}?${new URLSearchParams({ action })}`, {
      method: body !== undefined ? "POST" : "GET",
      headers: body !== undefined ? { "Content-Type": "application/json" } : {},
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: "same-origin",
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, data);
    return data;
  }
  const commande = (action, body) => appel("commande.php", action, body);

  function toast(message, type = "ok") {
    const t = el("div", `toast ${type}`, message);
    $("#toasts").append(t);
    setTimeout(() => t.remove(), type === "error" ? 5000 : 2500);
  }

  // ---------- Connexion ----------
  function montrerConnexion(message) {
    $("#app-view").hidden = true;
    $("#login-view").hidden = false;
    const err = $("#login-error");
    err.hidden = !message;
    err.textContent = message || "";
    $("#login-form").username.focus();
  }

  $("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    try {
      await appel("api.php", "login", { username: f.username.value, password: f.password.value });
      f.password.value = "";
      demarrer();
    } catch (err) {
      montrerConnexion(err.message);
    }
  });

  $("#logout").addEventListener("click", async () => {
    await appel("api.php", "logout", {}).catch(() => {});
    location.reload();
  });

  // ---------- Son : un carillon tant qu'une commande attend d'être acceptée ----------
  // Les navigateurs n'autorisent le son qu'après un geste : d'où le bouton « Activer le son ».
  let audio = null;
  const boutonSon = $("#son");
  function majBoutonSon() {
    const actif = audio?.state === "running";
    boutonSon.textContent = actif ? "🔔 Son activé" : "🔔 Activer le son";
    boutonSon.setAttribute("aria-pressed", String(actif));
    boutonSon.classList.toggle("primary", !actif);
    boutonSon.classList.toggle("ghost", actif);
  }
  boutonSon.addEventListener("click", async () => {
    if (audio?.state === "running") {
      await audio.suspend();
    } else {
      audio ??= new AudioContext();
      await audio.resume();
      carillon();
    }
    majBoutonSon();
  });

  function carillon() {
    if (audio?.state !== "running") return;
    const t0 = audio.currentTime;
    [[880, 0], [1175, 0.18], [1568, 0.36]].forEach(([frequence, decalage]) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = "sine";
      osc.frequency.value = frequence;
      gain.gain.setValueAtTime(0.0001, t0 + decalage);
      gain.gain.exponentialRampToValueAtTime(0.4, t0 + decalage + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + decalage + 0.9);
      osc.connect(gain).connect(audio.destination);
      osc.start(t0 + decalage);
      osc.stop(t0 + decalage + 1);
    });
  }

  // ---------- Écran toujours allumé (tablette en cuisine), quand le navigateur le permet ----------
  let verrou = null;
  async function garderEcranAllume() {
    if (!("wakeLock" in navigator) || document.hidden || verrou) return;
    try {
      verrou = await navigator.wakeLock.request("screen");
      verrou.addEventListener("release", () => (verrou = null));
    } catch {
      /* refusé (économie d'énergie, page non sécurisée…) : sans gravité */
    }
  }

  // ---------- Commandes ----------
  const ACTIONS = {
    nouvelle: [["acceptee", "Accepter", "primary"], ["annulee", "Refuser", "ghost"]],
    acceptee: [["prete", "Prête", "primary"], ["annulee", "Annuler", "ghost"]],
    prete: [["retiree", "Retirée", "primary"], ["acceptee", "Pas encore prête", "ghost"]],
    retiree: [["prete", "Annuler « retirée »", "ghost"]],
    annulee: [],
  };
  const LIBELLES = { retiree: "Retirée", annulee: "Annulée" };
  let commandes = [];
  let connues = null; // identifiants déjà vus : une nouvelle commande fait sonner tout de suite
  let ecartHorloge = 0; // heure du serveur moins heure de l'appareil, en millisecondes
  const titre = document.title;

  function delai(retrait) {
    const minutes = Math.round((retrait * 1000 - (Date.now() + ecartHorloge)) / 60000);
    if (minutes > 0) return { texte: `dans ${minutes} min`, retard: false };
    if (minutes === 0) return { texte: "maintenant", retard: false };
    return { texte: `retard ${-minutes} min`, retard: true };
  }

  function carte(c) {
    const n = $("#carte-cmd").content.firstElementChild.cloneNode(true);
    n.dataset.id = c.id;
    n.classList.add(`statut-${c.statut}`);
    $(".cmd-numero", n).textContent = `N° ${c.numero}`;
    $(".cmd-heure", n).textContent = `Retrait ${c.retraitTexte}`;
    if (["nouvelle", "acceptee", "prete"].includes(c.statut)) {
      const d = delai(c.retrait);
      const delaiEl = $(".cmd-delai", n);
      delaiEl.textContent = d.texte;
      delaiEl.classList.toggle("retard", d.retard);
    } else {
      $(".cmd-delai", n).textContent = LIBELLES[c.statut] || "";
    }
    $(".cmd-nom", n).textContent = c.nom;
    const tel = $(".cmd-tel", n);
    tel.textContent = c.telephone;
    tel.href = `tel:${c.telephone.replace(/\s/g, "")}`;
    $(".cmd-articles", n).append(
      ...c.articles.map((a) => {
        const li = el("li");
        li.append(el("span", "cmd-qte", `${a.quantite} ×`), el("span", "cmd-art", a.nom));
        if (a.details) li.append(el("small", "cmd-details", a.details));
        li.append(el("span", "cmd-prix", prix(a.prixCents * a.quantite)));
        return li;
      })
    );
    const note = $(".cmd-note", n);
    if (c.note) note.textContent = `« ${c.note} »`;
    else note.remove();
    $(".cmd-total", n).textContent = `Total ${prix(c.totalCents)} · à payer au retrait`;
    $(".cmd-recue", n).textContent = `Reçue à ${c.creeTexte}`;

    const actions = $(".cmd-actions", n);
    for (const [statut, libelle, style] of ACTIONS[c.statut] || []) {
      const b = el("button", `btn ${style}`, libelle);
      b.type = "button";
      b.addEventListener("click", () => changerStatut(c, statut, b));
      actions.append(b);
    }
    const imprimer = el("button", "btn ghost small imprimer", "Imprimer");
    imprimer.type = "button";
    imprimer.addEventListener("click", () => {
      n.classList.add("a-imprimer");
      print();
      n.classList.remove("a-imprimer");
    });
    actions.append(imprimer);
    return n;
  }

  async function changerStatut(c, statut, bouton) {
    if (statut === "annulee" && !confirm(`${c.statut === "nouvelle" ? "Refuser" : "Annuler"} la commande n° ${c.numero} de ${c.nom} ?\nPensez à prévenir le client au ${c.telephone}.`)) return;
    bouton.disabled = true;
    try {
      const maj = await commande("statut", { id: c.id, statut });
      commandes = commandes.map((x) => (x.id === maj.id ? maj : x));
      afficher();
    } catch (err) {
      bouton.disabled = false;
      if (err.status === 401) return montrerConnexion("Votre session a expiré. Merci de vous reconnecter.");
      toast(err.message, "error");
    }
  }

  function afficher() {
    const colonnes = { nouvelle: [], acceptee: [], prete: [], terminees: [] };
    for (const c of commandes) (colonnes[c.statut] || colonnes.terminees).push(carte(c));
    for (const [statut, cartes] of Object.entries(colonnes)) {
      $(`#col-${statut}`).replaceChildren(...(cartes.length ? cartes : [el("p", "vide", "Aucune commande")]));
      $(statut === "terminees" ? "#compte-terminees" : `#compte-${statut}`).textContent = cartes.length;
    }
    const enAttente = colonnes.nouvelle.length;
    document.title = enAttente ? `🔔 (${enAttente}) Nouvelle commande · WOK 888` : titre;
    document.body.classList.toggle("alerte", enAttente > 0);
  }

  function afficherEtat(actives, etat) {
    $("#actives").checked = actives;
    $("#actives-texte").textContent = actives ? "ouverte" : "fermée";
    const texte = !actives
      ? "Fermée : le site propose d'appeler le restaurant."
      : etat.possible
        ? `Ouverte : les clients peuvent commander pour un retrait entre ${etat.creneaux[0].libelle} et ${etat.creneaux.at(-1).libelle}.`
        : etat.raison === "fermee"
          ? "En attente : elle ouvrira aux heures d'ouverture, tant que cet écran reste ouvert."
          : "En attente de cet écran…";
    const etatEl = $("#reception-etat");
    etatEl.textContent = texte;
    etatEl.classList.toggle("ok", actives && etat.possible);
  }

  $("#actives").addEventListener("change", async (e) => {
    try {
      const r = await commande("reglages", { actives: e.target.checked });
      afficherEtat(r.actives, r.etat);
      toast(r.actives ? "Commande en ligne ouverte." : "Commande en ligne fermée.");
    } catch (err) {
      e.target.checked = !e.target.checked;
      toast(err.message, "error");
    }
  });

  let rappel = null;
  async function rafraichir() {
    try {
      const r = await commande("liste");
      ecartHorloge = r.maintenant * 1000 - Date.now();
      const nouvelles = r.commandes.filter((c) => c.statut === "nouvelle");
      if (connues && nouvelles.some((c) => !connues.has(c.id))) {
        carillon();
        toast("Nouvelle commande !");
      }
      connues = new Set(r.commandes.map((c) => c.id));
      commandes = r.commandes;
      afficher();
      afficherEtat(r.actives, r.etat);
      clearInterval(rappel);
      if (nouvelles.length) rappel = setInterval(carillon, RAPPEL_SON);
    } catch (err) {
      if (err.status === 401) return montrerConnexion("Votre session a expiré. Merci de vous reconnecter.");
      $("#reception-etat").textContent = "Connexion au serveur perdue : nouvel essai dans quelques secondes…";
      $("#reception-etat").classList.remove("ok");
    }
  }

  let minuteur = null;
  function demarrer() {
    $("#login-view").hidden = true;
    $("#app-view").hidden = false;
    majBoutonSon();
    rafraichir();
    garderEcranAllume();
    clearInterval(minuteur);
    minuteur = setInterval(rafraichir, RAFRAICHIR);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden || $("#app-view").hidden) return;
    rafraichir();
    garderEcranAllume();
  });

  appel("api.php", "me")
    .then(demarrer)
    .catch((err) => montrerConnexion(err.status === 401 ? "" : err.message));
})();
