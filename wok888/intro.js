// Animation d'ouverture : jouée une fois par visite, et que l'on peut passer d'un clic ou d'une touche.
// (Chargé dans <head> pour décider avant l'affichage ; l'animation elle-même est en CSS.)
// Pas d'animation pour qui arrive sur une section précise (lien vers #carte…) ou préfère limiter les animations.
(() => {
  const racine = document.documentElement;
  racine.classList.add("js");
  const DUREE = 2900; // fin du rideau, en millisecondes (voir site.css)
  let dejaVue = false;
  try {
    dejaVue = sessionStorage.getItem("wok888-intro") === "1";
    sessionStorage.setItem("wok888-intro", "1");
  } catch {
    /* navigation privée stricte : l'animation se joue simplement à chaque visite */
  }
  const sobre = matchMedia("(prefers-reduced-motion: reduce)").matches;
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
