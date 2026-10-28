// Animation d'ouverture : jouée une fois par visite, et que l'on peut passer d'un clic ou d'une touche.
// (Chargé dans <head> pour décider avant l'affichage ; l'animation elle-même est en CSS.)
// Décide aussi du mode des animations : complet pour tous, ou réduit (classe « sobre ») si le visiteur l'a demandé
// avec le bouton « Réduire les animations » du pied de page (choix gardé sur son appareil).
// Pas d'ouverture pour qui arrive sur une section précise (lien vers #carte…) ou en mode réduit.
(() => {
  const racine = document.documentElement;
  racine.classList.add("js");
  let choix = null; // false : animations réduites par le visiteur ; sinon complètes
  try {
    choix = JSON.parse(localStorage.getItem("wok888-animations"));
  } catch {
    /* stockage indisponible : animations complètes */
  }
  const sobre = choix === false;
  racine.classList.toggle("sobre", sobre);

  const DUREE = 2900; // fin du rideau, en millisecondes (voir site.css)
  let dejaVue = false;
  try {
    dejaVue = sessionStorage.getItem("wok888-intro") === "1";
    sessionStorage.setItem("wok888-intro", "1");
  } catch {
    /* navigation privée stricte : l'animation se joue simplement à chaque visite */
  }
  if (dejaVue || sobre || location.hash.length > 1) return;
  racine.classList.add("intro-en-cours");

  let fini = false;
  const terminer = () => {
    if (fini) return;
    fini = true;
    racine.classList.remove("intro-en-cours");
    document.dispatchEvent(new Event("intro-finie"));
  };
  const passer = () => {
    if (fini) return;
    racine.classList.add("intro-passee");
    setTimeout(terminer, 450);
  };
  setTimeout(terminer, DUREE);

  document.addEventListener("DOMContentLoaded", () => {
    const intro = document.getElementById("intro");
    if (!intro) return terminer();
    intro.addEventListener("click", passer);
    document.addEventListener("keydown", passer, { once: true });
  });
})();
