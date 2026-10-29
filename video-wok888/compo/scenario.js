// Scénario du film (temps en secondes) : partagé par la composition (rendu.js), le pilote (film.js)
// et la musique (audio/musique.py, via « node -p »).
// Tout est calé sur le tempo de la musique (120 temps par minute : une mesure = 2 s) : le rythme part à 4 s
// avec le téléphone, chaque scène commence sur un temps fort, et le coup final tombe à 44 s sur l'écran de fin.
const SCENARIO = {
  duree: 50,
  drop: 4.0,          // départ du rythme : le téléphone monte, premier titre
  logoSortie: [3.45, 3.95], // le logo d'ouverture s'efface juste avant
  debutSite: 4.3,     // l'horloge du site démarre (son ouverture dure 2,9 s)
  sortie: 43.6,       // le téléphone s'en va
  fin: 44.0,          // écran de fin : logo, adresse du site, téléphone, adresse (coup final de la musique)
  accentFin: 46.0,    // l'adresse du site grossit un instant
  // Titres : « sur » au pinceau, lignes en grandes capitales (*mot* en vert), « sous » en texte ({195} : nombre qui défile)
  titres: [
    { de: 4.0, a: 9.8, sur: "Découvrez", lignes: ["Le nouveau", "site *WOK 888*"], sous: "Animé, rapide, pensé pour le téléphone" },
    { de: 10.0, a: 13.8, sur: "Dès l'accueil", lignes: ["Faites sauter", "le *wok*"], sous: "Touchez-le : il saute !" },
    { de: 14.0, a: 21.8, sur: "À vous de jouer", lignes: ["Composez", "votre *wok*"], sous: "Base, garniture, petit plus : le prix suit" },
    { de: 22.0, a: 27.8, sur: "Midi et soir", lignes: ["Toute", "la *carte*"], sous: "{195} plats, recherche et filtres en un geste" },
    { de: 28.0, a: 33.8, sur: "Pas d'idée ?", lignes: ["La machine", "*888*"], sous: "Elle compose votre repas au hasard" },
    { de: 34.0, a: 39.8, sur: "Le mot de la fin", lignes: ["Cassez votre", "*fortune cookie*"], sous: "Un message et un plat porte-bonheur" },
    { de: 40.0, a: 43.8, sur: "Une table pour ce soir ?", lignes: ["Réservez", "*en ligne*"], sous: "Ou appelez-nous en un geste" },
  ],
  // Bulles d'information posées sur la scène (x, y : coin haut gauche)
  bulles: [
    { de: 8.0, a: 9.4, x: 575, y: 853, texte: "Horaires en direct", icone: "horloge" },
  ],
  // Actions sur le site, au temps du film (les touchers tombent sur les temps de la musique)
  actions: [
    { t: 7.9, faire: "entourer", sel: "[data-statut]", duree: 1.2 },
    { t: 9.6, faire: "defiler", sel: "#wok-toucher", marge: 250, duree: 1.0 },
    { t: 11.0, faire: "cliquer", sel: "#wok-toucher" },
    { t: 12.5, faire: "cliquer", sel: "#wok-toucher" },
    { t: 13.75, faire: "defiler", sel: "#etape-base", marge: 470, duree: 1.2 },
    { t: 16.0, faire: "cliquer", sel: "#choix-base .option", texte: "Nouilles" },
    { t: 16.9, faire: "defiler", sel: "#choix-garniture .option", texte: "Canard", marge: 500, duree: 0.8 },
    { t: 18.0, faire: "cliquer", sel: "#choix-garniture .option", texte: "Canard" },
    { t: 18.9, faire: "defiler", sel: "#choix-plus .option", texte: "Œuf", marge: 500, duree: 0.8 },
    { t: 20.0, faire: "cliquer", sel: "#choix-plus .option", texte: "Œuf" },
    { t: 20.6, faire: "entourer", sel: "#wok-prix", duree: 1.3 },
    { t: 21.8, faire: "defiler", sel: "#recherche", marge: 150, duree: 1.2 },
    { t: 23.35, faire: "toucher", sel: "#recherche" },
    { t: 23.5, faire: "taper", sel: "#recherche", saisie: "canard", pas: 0.125 },
    { t: 25.5, faire: "defilerDe", dy: 330, duree: 1.1 },
    { t: 27.85, faire: "defiler", sel: "#machine", marge: -10, duree: 1.1 },
    { t: 29.5, faire: "cliquer", sel: "#lancer" },
    { t: 32.5, faire: "entourer", sel: "#machine-resultat", duree: 1.1 },
    { t: 33.85, faire: "defiler", sel: "#fortune-cookie", marge: 170, duree: 1.0 },
    { t: 35.0, faire: "cliquer", sel: "#fortune-cookie" },
    { t: 37.45, faire: "entourer", sel: "#fortune-plat", duree: 1.3 },
    { t: 39.85, faire: "defiler", sel: "#reserver", marge: 0, duree: 1.0 },
    { t: 41.0, faire: "toucher", sel: "#ouvrir-resa" },
    { t: 42.5, faire: "toucher", sel: "#reserver a[href^='tel']" },
  ],
  // Musique : 120 temps par minute, mesures de 4 temps alignées sur « drop » ; coup final à « fin »
  musique: { bpm: 120 },
};
if (typeof module !== "undefined") module.exports = SCENARIO;
