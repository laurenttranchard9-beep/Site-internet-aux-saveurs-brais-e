// Mesure d'audience avec consentement : aucun cookie de mesure n'est déposé tant que le visiteur n'a pas accepté.
(() => {
  const CHOIX = "asb_cookies";      // « oui » ou « non », gardé 6 mois (recommandation CNIL)
  const VISITEUR = "asb_visiteur";  // identifiant aléatoire, 13 mois au plus
  const SIX_MOIS = 182 * 86400;
  const TREIZE_MOIS = 395 * 86400;

  const banniere = document.getElementById("cookies");
  const lire = (nom) => document.cookie.split("; ").find((c) => c.startsWith(nom + "="))?.split("=")[1];
  const ecrire = (nom, valeur, duree) => {
    const securise = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${nom}=${valeur}; Max-Age=${duree}; Path=/; SameSite=Lax${securise}`;
  };

  function identifiant() {
    let id = lire(VISITEUR);
    if (!/^[a-f0-9]{32}$/.test(id || "")) {
      const octets = crypto.getRandomValues(new Uint8Array(16));
      id = [...octets].map((o) => o.toString(16).padStart(2, "0")).join("");
      ecrire(VISITEUR, id, TREIZE_MOIS);
    }
    return id;
  }

  function compterVisite() {
    fetch("api.php?action=visite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visiteur: identifiant(),
        largeur: Math.round(screen.width) || null,
        tactile: navigator.maxTouchPoints > 1,
        origine: document.referrer,
      }),
      keepalive: true,
    }).catch(() => {});
  }

  const montrer = () => {
    banniere.hidden = false;
    banniere.focus({ preventScroll: true }); // aucun bouton présélectionné : accepter et refuser sont à égalité
  };
  const cacher = () => {
    banniere.hidden = true;
  };

  document.getElementById("cookies-accepter").addEventListener("click", () => {
    ecrire(CHOIX, "oui", SIX_MOIS);
    cacher();
    compterVisite();
  });
  document.getElementById("cookies-refuser").addEventListener("click", () => {
    ecrire(CHOIX, "non", SIX_MOIS);
    ecrire(VISITEUR, "", 0); // retire l'identifiant s'il existait
    cacher();
  });
  document.getElementById("gerer-cookies").addEventListener("click", montrer);

  const choix = lire(CHOIX);
  if (choix === "oui") compterVisite();
  else if (choix !== "non") montrer();
})();
