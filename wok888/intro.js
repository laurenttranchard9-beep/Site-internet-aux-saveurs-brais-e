// Animation d'ouverture : jouée une fois par visite, et que l'on peut passer d'un clic ou d'une touche.
// (Chargé dans <head> pour décider avant l'affichage ; l'animation elle-même est en CSS.)
// Décide aussi du mode des animations : complet, ou réduit (classe « sobre ») quand l'appareil demande moins
// d'animations. Le visiteur peut changer d'avis avec les boutons du site (choix gardé sur son appareil).
// Pas d'ouverture pour qui arrive sur une section précise (lien vers #carte…) ou en mode réduit.
(() => {
  const racine = document.documentElement;
  racine.classList.add("js");
  let choix = null; // true : animations voulues ; false : réduites ; null : selon le réglage de l'appareil
  try {
    choix = JSON.parse(localStorage.getItem("wok888-animations"));
  } catch {
    /* stockage indisponible : on suit le réglage de l'appareil */
  }
  const sobre = choix === false || (choix !== true && matchMedia("(prefers-reduced-motion: reduce)").matches);
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
