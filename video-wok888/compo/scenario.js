// Scénario du film (temps en secondes) : partagé par la composition (rendu.js) et le pilote (film.js).
const SCENARIO = {
  duree: 53,
  debutSite: 3.6, // l'horloge du site démarre quand le téléphone apparaît
  // Titres : « sur » au pinceau, lignes en grandes capitales (*mot* en vert), « sous » en texte
  titres: [
    { de: 3.3, a: 7.95, sur: "Découvrez", lignes: ["Le nouveau", "site *WOK 888*"], sous: "Animé, rapide, pensé pour le téléphone" },
    { de: 8.15, a: 12.35, sur: "Dès l'accueil", lignes: ["Faites sauter", "le *wok*"], sous: "Touchez-le : il saute !" },
    { de: 12.55, a: 20.65, sur: "À vous de jouer", lignes: ["Composez", "votre *wok*"], sous: "Base, garniture, petit plus : le prix suit" },
    { de: 20.85, a: 26.85, sur: "Midi et soir", lignes: ["Toute", "la *carte*"], sous: "{195} plats, recherche et filtres en un geste" },
    { de: 27.05, a: 32.45, sur: "Pas d'idée ?", lignes: ["La machine", "*888*"], sous: "Elle compose votre repas au hasard" },
    { de: 32.65, a: 37.85, sur: "Le mot de la fin", lignes: ["Cassez votre", "*fortune cookie*"], sous: "Un message et un plat porte-bonheur" },
    { de: 38.05, a: 42.45, sur: "Une table pour ce soir ?", lignes: ["Réservez", "*en ligne*"], sous: "Ou appelez en un geste, horaires en direct" },
    { de: 42.65, a: 47.85, sur: "Côté restaurant", lignes: ["La carte", "*toujours à jour*"], sous: "Prix et plats modifiés en un instant" },
  ],
  // Bulles d'information posées sur la scène (x, y : coin haut gauche ; compteur : nombre qui défile)
  bulles: [
    { de: 7.0, a: 8.0, x: 575, y: 853, texte: "Horaires en direct", icone: "horloge" },
    { de: 46.0, a: 47.75, x: 70, y: 1560, texte: "Enregistré tout de suite", icone: "coche" },
  ],
  // Actions sur le site (cadre « site ») et sur l'espace de gestion (cadre « gestion »), au temps du film
  actions: [
    { t: 6.9, cadre: "site", faire: "entourer", sel: "[data-statut]", duree: 1.0 },
    { t: 8.0, cadre: "site", faire: "defiler", sel: "#wok-toucher", marge: 250, duree: 1.0 },
    { t: 9.35, cadre: "site", faire: "cliquer", sel: "#wok-toucher" },
    { t: 10.85, cadre: "site", faire: "cliquer", sel: "#wok-toucher" },
    { t: 12.3, cadre: "site", faire: "defiler", sel: "#etape-base", marge: 470, duree: 1.2 },
    { t: 14.0, cadre: "site", faire: "cliquer", sel: "#choix-base .option", texte: "Nouilles" },
    { t: 15.0, cadre: "site", faire: "defiler", sel: "#choix-garniture .option", texte: "Canard", marge: 500, duree: 0.8 },
    { t: 16.15, cadre: "site", faire: "cliquer", sel: "#choix-garniture .option", texte: "Canard" },
    { t: 17.2, cadre: "site", faire: "defiler", sel: "#choix-plus .option", texte: "Œuf", marge: 500, duree: 0.8 },
    { t: 18.3, cadre: "site", faire: "cliquer", sel: "#choix-plus .option", texte: "Œuf" },
    { t: 18.95, cadre: "site", faire: "entourer", sel: "#wok-prix", duree: 1.5 },
    { t: 20.7, cadre: "site", faire: "defiler", sel: "#recherche", marge: 150, duree: 1.2 },
    { t: 22.3, cadre: "site", faire: "toucher", sel: "#recherche" },
    { t: 22.45, cadre: "site", faire: "taper", sel: "#recherche", saisie: "canard", pas: 0.12 },
    { t: 24.35, cadre: "site", faire: "defilerDe", dy: 330, duree: 1.1 },
    { t: 26.9, cadre: "site", faire: "defiler", sel: "#machine", marge: -10, duree: 1.1 },
    { t: 28.4, cadre: "site", faire: "cliquer", sel: "#lancer" },
    { t: 31.4, cadre: "site", faire: "entourer", sel: "#machine-resultat", duree: 0.95 },
    { t: 32.5, cadre: "site", faire: "defiler", sel: "#fortune-cookie", marge: 170, duree: 1.0 },
    { t: 33.9, cadre: "site", faire: "cliquer", sel: "#fortune-cookie" },
    { t: 36.35, cadre: "site", faire: "entourer", sel: "#fortune-plat", duree: 1.3 },
    { t: 37.9, cadre: "site", faire: "defiler", sel: "#reserver", marge: 0, duree: 1.0 },
    { t: 39.4, cadre: "site", faire: "toucher", sel: "#ouvrir-resa" },
    { t: 40.3, cadre: "site", faire: "defiler", sel: "#infos .horaires, #infos table, #infos", marge: 40, duree: 1.0 },
    { t: 41.45, cadre: "site", faire: "entourer", sel: "tr.aujourdhui", duree: 0.95 },
    { t: 44.1, cadre: "gestion", faire: "defiler", sel: ".price-input", marge: 330, duree: 0.9 },
    { t: 45.15, cadre: "gestion", faire: "taper", sel: ".price-input", saisie: "4,20", pas: 0.14, remplacer: true, valider: true },
    { t: 45.95, cadre: "gestion", faire: "entourer", sel: ".price-input", duree: 1.6 },
    { t: 46.55, cadre: "gestion", faire: "cliquer", sel: ".switch", cible: "input" },
  ],
};
if (typeof module !== "undefined") module.exports = SCENARIO;
