# Bulles & Moustaches : page d'accueil d'un salon de toilettage

Une page d'accueil statique et ludique pour un salon de toilettage pour chiens et chats. Aucune étape de build, aucune dépendance.

- `index.html` : en-tête, prestations et tarifs, étapes, avis, formulaire de réservation, FAQ, appel à l'action final, pied de page
- `styles.css` : mise en page responsive, thème ludique (Fredoka + Nunito), prise en charge du mouvement réduit
- `script.js` : menu mobile, présélection de la prestation, validation du formulaire et message de confirmation, apparitions au défilement, bouton de réservation fixe sur mobile

Ouvrez `index.html` dans un navigateur pour voir la page.

> Pour l'instant, le formulaire de réservation vérifie les champs et affiche une confirmation dans le navigateur uniquement.
> Branchez-le à votre système de réservation ou à un service de formulaires à l'endroit marqué `TODO` dans `script.js`.

---

## Restaurant « Aux Saveurs Braisées »

Le dossier [`restaurant/`](restaurant/) contient le menu interactif du restaurant et son espace de gestion (prix, stocks, produits, catégories). Il tourne sur un serveur Node.js. Voir [`restaurant/README.md`](restaurant/README.md).
