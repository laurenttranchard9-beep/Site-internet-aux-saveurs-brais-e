// Scénario du film (temps en secondes) : partagé par la composition (rendu.js), le pilote (film.js)
// et la bande son (audio/voix.py, audio/musique.py, via « node -p »).
const SCENARIO = {
  duree: 51,
  debutSite: 3.6, // l'horloge du site démarre quand le téléphone apparaît
  sortie: 43.3,   // le téléphone s'en va
  fin: 43.75,     // écran de fin : logo, adresse du site, téléphone, adresse
  accentFin: 47.7, // « wok888.fr » prononcé : l'adresse du site grossit un instant
  // Titres : « sur » au pinceau, lignes en grandes capitales (*mot* en vert), « sous » en texte ({195} : nombre qui défile)
  titres: [
    { de: 3.3, a: 8.5, sur: "Découvrez", lignes: ["Le nouveau", "site *WOK 888*"], sous: "Animé, rapide, pensé pour le téléphone" },
    { de: 8.7, a: 12.7, sur: "Dès l'accueil", lignes: ["Faites sauter", "le *wok*"], sous: "Touchez-le : il saute !" },
    { de: 12.9, a: 21.0, sur: "À vous de jouer", lignes: ["Composez", "votre *wok*"], sous: "Base, garniture, petit plus : le prix suit" },
    { de: 21.2, a: 27.2, sur: "Midi et soir", lignes: ["Toute", "la *carte*"], sous: "{195} plats, recherche et filtres en un geste" },
    { de: 27.4, a: 32.8, sur: "Pas d'idée ?", lignes: ["La machine", "*888*"], sous: "Elle compose votre repas au hasard" },
    { de: 33.0, a: 38.2, sur: "Le mot de la fin", lignes: ["Cassez votre", "*fortune cookie*"], sous: "Un message et un plat porte-bonheur" },
    { de: 38.4, a: 43.2, sur: "Une table pour ce soir ?", lignes: ["Réservez", "*en ligne*"], sous: "Ou appelez-nous en un geste" },
  ],
  // Bulles d'information posées sur la scène (x, y : coin haut gauche)
  bulles: [
    { de: 7.2, a: 8.35, x: 575, y: 853, texte: "Horaires en direct", icone: "horloge" },
  ],
  // Actions sur le site, au temps du film
  actions: [
    { t: 7.1, faire: "entourer", sel: "[data-statut]", duree: 1.0 },
    { t: 8.55, faire: "defiler", sel: "#wok-toucher", marge: 250, duree: 1.0 },
    { t: 9.9, faire: "cliquer", sel: "#wok-toucher" },
    { t: 11.4, faire: "cliquer", sel: "#wok-toucher" },
    { t: 12.65, faire: "defiler", sel: "#etape-base", marge: 470, duree: 1.2 },
    { t: 14.35, faire: "cliquer", sel: "#choix-base .option", texte: "Nouilles" },
    { t: 15.35, faire: "defiler", sel: "#choix-garniture .option", texte: "Canard", marge: 500, duree: 0.8 },
    { t: 16.5, faire: "cliquer", sel: "#choix-garniture .option", texte: "Canard" },
    { t: 17.55, faire: "defiler", sel: "#choix-plus .option", texte: "Œuf", marge: 500, duree: 0.8 },
    { t: 18.65, faire: "cliquer", sel: "#choix-plus .option", texte: "Œuf" },
    { t: 19.5, faire: "entourer", sel: "#wok-prix", duree: 1.4 },
    { t: 21.05, faire: "defiler", sel: "#recherche", marge: 150, duree: 1.2 },
    { t: 23.75, faire: "toucher", sel: "#recherche" },
    { t: 23.9, faire: "taper", sel: "#recherche", saisie: "canard", pas: 0.12 },
    { t: 25.5, faire: "defilerDe", dy: 330, duree: 1.1 },
    { t: 27.25, faire: "defiler", sel: "#machine", marge: -10, duree: 1.1 },
    { t: 28.75, faire: "cliquer", sel: "#lancer" },
    { t: 31.75, faire: "entourer", sel: "#machine-resultat", duree: 0.95 },
    { t: 32.85, faire: "defiler", sel: "#fortune-cookie", marge: 170, duree: 1.0 },
    { t: 34.25, faire: "cliquer", sel: "#fortune-cookie" },
    { t: 36.7, faire: "entourer", sel: "#fortune-plat", duree: 1.3 },
    { t: 38.25, faire: "defiler", sel: "#reserver", marge: 0, duree: 1.0 },
    { t: 40.3, faire: "toucher", sel: "#ouvrir-resa" },
    { t: 41.75, faire: "toucher", sel: "#reserver a[href^='tel']" },
  ],
  // Voix off : chaque phrase commence à son instant. Le texte est écrit pour la synthèse vocale :
  // « huit huit huit » pour 888, « Seille » pour Seilh, « plusse » pour « un petit plus », « èf èr » pour .fr
  voix: [
    { t: 0.45, texte: "Wok huit huit huit, les saveurs d'Asie à Seille." },
    { t: 3.55, texte: "Découvrez notre nouveau site : animé, rapide, et pensé pour votre téléphone." },
    { t: 8.85, texte: "Dès l'accueil, touchez le wok, et faites-le sauter !" },
    { t: 13.1, texte: "Composez votre wok." },
    { t: 14.3, texte: "Une base," },
    { t: 16.45, texte: "une garniture," },
    { t: 18.45, texte: "un petit plusse," },
    { t: 19.55, texte: "et le prix se calcule tout seul !" },
    { t: 21.75, texte: "Toute la carte est là : près de deux cents plats, et une recherche en un geste." },
    { t: 27.6, texte: "Pas d'idée ? La machine huit huit huit compose votre repas au hasard." },
    { t: 33.2, texte: "Et pour finir, cassez votre fortune cookie : un message, et un plat porte-bonheur." },
    { t: 38.6, texte: "Une table pour ce soir ? Réservez en ligne, ou appelez-nous en un geste." },
    { t: 44.05, texte: "Wok huit huit huit, sur place ou à emporter. Rendez-vous sur wok huit huit huit point èf èr !" },
  ],
  // Musique : le rythme part avec le téléphone (depart) et s'arrête sur l'écran de fin (arret), sur un coup de gong
  musique: { bpm: 107.6, depart: 3.3, arret: 43.45 },
};
if (typeof module !== "undefined") module.exports = SCENARIO;
