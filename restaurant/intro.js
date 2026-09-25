// Animation d'ouverture : jouée une fois par visite, et que l'on peut passer d'un clic ou d'une touche.
// (Chargé dans <head> pour décider avant l'affichage ; l'animation elle-même est en CSS.)
(() => {
  const racine = document.documentElement;
  const DUREE = 3600; // fin du rideau, en millisecondes (voir menu.css)
  let dejaVue = false;
  try {
    dejaVue = sessionStorage.getItem("asb-intro") === "1";
    sessionStorage.setItem("asb-intro", "1");
  } catch {
    /* navigation privée stricte : l'animation se joue simplement à chaque visite */
  }
  if (dejaVue) {
    racine.classList.add("intro-deja-vue");
    return;
  }
  racine.classList.add("intro-en-cours");

  let fini = false;
  const terminer = () => {
    if (fini) return;
    fini = true;
    racine.classList.remove("intro-en-cours");
  };
  const passer = () => {
    if (fini) return;
    racine.classList.add("intro-passee");
    setTimeout(terminer, 700);
  };
  setTimeout(terminer, DUREE);

  document.addEventListener("DOMContentLoaded", () => {
    const intro = document.getElementById("intro");
    if (!intro) return terminer();
    intro.addEventListener("click", passer);
    document.addEventListener("keydown", passer, { once: true });
  });
})();
