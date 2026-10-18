# Aux Saveurs du Cambodge : nouveau site

Nouveau site du restaurant de Saint-Alban, qui remplace l'ancien site Squarespace (auxsaveursducambodge-saintalban.com).

## Ce qui change par rapport à l'ancien site

| | Ancien site (Squarespace) | Nouveau site |
|---|---|---|
| Appeler pour commander | numéro affiché en « +33 07… », non cliquable ; bouton « Cammandez » vide | numéro cliquable partout, bouton « Appeler » toujours visible sur téléphone |
| La carte | une page de 13 000 px de haut, sans repères, avec des fautes | carte sur la page d'accueil : catégories, recherche, filtres (« Épicé », « Spécialité cambodgienne »), orthographe et prix relus |
| Horaires | texte simple (« SAMEDI DIAMNCHE ») | tableau clair, jour du jour mis en avant, « Ouvert · jusqu'à 21h45 » ou « Fermé · ouvre à 18h00 » en direct |
| Nous trouver | adresse en texte | boutons Google Maps, Waze et Plans (iPhone), plan à afficher |
| Formulaire | « Vous avez envie de travailler avec nous ? » (texte du modèle) | retiré : l'appel téléphonique est le vrai moyen de commander |
| Référencement Google | aucune description | description, fiche « Restaurant » pour Google (adresse, horaires, téléphone), image de partage pour Facebook et WhatsApp |
| Mentions légales | absentes (obligatoires) | page complète |
| Modifier la carte | éditeur Squarespace | espace de gestion : prix, plats, stocks, catégories, statistiques de visite |
| Poids de la page | 1,1 à 1,6 Mo, une cinquantaine de fichiers | environ 120 Ko en 10 fichiers : s'affiche vite, même en 4G faible |
| Confidentialité | Google contacté à chaque visite (polices, reCAPTCHA) ; cookies de statistiques Squarespace (`ss_cvr`, `ss_cvt`) déposés sans demander l'accord | tout est hébergé sur le site ; cookie de statistiques seulement après accord ; plan OpenStreetMap chargé seulement sur demande |

## Modifier la carte

L'espace de gestion est à l'adresse `/admin/` (lien « Espace gestion » en bas de page). À la première visite, il demande de créer le compte.

- **Prix, stocks, plats** : onglet « Produits & stocks ». Un plat masqué disparaît de la carte sans être supprimé.
- **Catégories** : onglet « Catégories ». La **note** d'une catégorie s'affiche sous son titre (par exemple « Servis avec du riz nature… »).
- **Mettre un plat en avant** : ajoutez l'étiquette **« À la une »** au plat (champ « Étiquettes »). Il apparaît dans le bandeau rouge en haut de la page, avec pour titre le nom de sa catégorie et pour sous-titre la note de celle-ci. Sans aucun plat « À la une », le bandeau disparaît.
- **Étiquettes** : « Épicé » et « Spécialité cambodgienne » servent de filtres sur la carte. Toute nouvelle étiquette devient un filtre.
- **Statistiques** : onglet « Statistiques » (visites, appareils, heures), seulement pour les visiteurs qui acceptent le cookie.

La carte de départ est dans `inc/carte.php`. Elle n'est chargée qu'une fois : ensuite, tout se fait dans l'espace de gestion.

## Horaires

Les horaires sont écrits à trois endroits, à modifier ensemble s'ils changent :

1. le tableau et le pied de page de `index.html` ;
2. le haut de `site.js` (`MIDI`, `SOIR`, `CRENEAUX`), qui calcule « Ouvert / Fermé » ;
3. la fiche Google dans `index.html` (`openingHoursSpecification`).

## Moteur commun avec Aux Saveurs Braisées

`api.php`, `inc/db.php`, `inc/auth.php`, `inc/stats.php`, `admin/admin.js` et `admin/admin.css` sont **les mêmes fichiers** que ceux du dossier `restaurant/`. Une correction se fait dans les deux dossiers ; le test `tests/site_test.php` vérifie qu'ils sont identiques.

Les deux sites peuvent être installés sur le même serveur : chacun a sa base de données, et une connexion à l'un ne donne pas accès à l'autre.

## Tests

```bash
php tests/site_test.php
```

## Mise en ligne

Voir `deploiement/README.md` (site `cambodge`).
