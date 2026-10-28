# WOK 888 : nouveau site

Nouveau site du restaurant WOK 888, 16 route de Grenade à Seilh, qui remplace le site WordPress de wok888.fr. Il reprend toute la carte (195 plats et boissons, aux prix de l'ancien site : voir « À vérifier avec le restaurant ») et y ajoute des animations et une vraie expérience client : composer son wok, préparer sa commande à emporter, la suivre en direct, laisser la machine 888 choisir son repas, réserver sa table.

Il fonctionne en **PHP** avec une base **SQLite** (un simple fichier créé tout seul dans `data/`) : rien d'autre à installer. Il tourne tel quel sous **XAMPP** (Apache) comme chez n'importe quel hébergeur PHP.

## Ce que trouve le client

| Section | Ce qui se passe |
|---|---|
| Ouverture | Le logo se dessine trait par trait, le wok s'enflamme, « WOK 888 » apparaît (une fois par visite, se passe d'un clic). |
| Accueil | Un wok qui saute au-dessus des flammes, des braises qui s'envolent, « Ouvert · jusqu'à 22h30 » en direct. |
| Le souffle du wok | 鑊氣, le *wok hei* : ce qui fait le goût d'un plat sauté au wok, avec des chiffres qui s'animent. |
| **Composez votre wok** | Le client choisit sa base, sa garniture et l'œuf bio : chaque ingrédient tombe dans le wok, qui saute et flambe. Le prix se met à jour, le wok part dans la commande. Grésillement du wok en option (bouton « Son »). |
| À la une | Les menus japonais (Royal 888, Duo, Maki, Sushi) en grandes cartes ; elles se font glisser sur téléphone. |
| La carte | 8 univers (Entrées, Côté wok, Poké bowls, Nos plats, Japonais, Menus, Desserts, Boissons), recherche, filtres, bouton « + » sur chaque plat avec une étincelle qui file jusqu'à « Ma commande ». |
| La machine 888 | Une machine à sous qui tire une entrée, un plat et un dessert ; le repas s'ajoute en un geste. |
| Réserver | Lanternes qui se balancent ; la réservation resOS du restaurant s'ouvre dans la page. |
| Horaires et accès | Jour du jour mis en avant, Google Maps, Waze, Plans, plan OpenStreetMap à la demande. |
| Ma commande | Commande à emporter : heure de retrait, nom, téléphone, puis **suivi en direct** (envoyée, en préparation, prête). |

Tout s'adapte au téléphone (barre d'actions en bas : Appeler, La carte, Mon wok, Commande). Les animations s'arrêtent pour les visiteurs qui ont demandé à leur appareil de limiter les mouvements.

## Ce qui change par rapport à l'ancien site

| | Ancien site (WordPress) | Nouveau site |
|---|---|---|
| Textes | modèle de démonstration resté en ligne : « meet the chefs » (Benjiro Eito…), « High Salary », « Lorem ipsum », « Find locations near you », « WOK 888 Seihl » | textes du restaurant, en français, relus |
| La carte | 3 pages séparées, sans recherche | une seule carte en 8 univers, recherche, filtres, épuisés et stocks en direct |
| Le wok | « Choisissez votre base » avec une erreur (« Bò Bún Nem aux crevettes + 1,50 € » au lieu du riz sauté) | composeur animé, prix calculé |
| Commander | WooCommerce et Orderable (extensions payantes) | commande à emporter intégrée, reçue sur l'écran « Commandes en ligne », suivie en direct par le client |
| Horaires | page Contact seulement | sur l'accueil, avec « Ouvert / Fermé » en direct |
| Modifier la carte | WordPress et Elementor | espace de gestion simple : prix, plats, stocks, catégories, statistiques |
| Confidentialité | polices et services extérieurs chargés à chaque visite | tout est sur le site ; réservation et plan chargés seulement si le client les ouvre ; cookie de statistiques seulement après accord |

## Installer le site avec XAMPP (Windows)

1. Installez **XAMPP** : <https://www.apachefriends.org/fr/> (version PHP 8.1 ou plus récente).
2. Copiez le dossier `wok888` dans `C:\xampp\htdocs\`. Vous obtenez `C:\xampp\htdocs\wok888\`.
3. Ouvrez le **XAMPP Control Panel** et cliquez sur **Start** à côté d'**Apache**.
4. Ouvrez dans votre navigateur :
   - le site : <http://localhost/wok888/>
   - l'espace de gestion : <http://localhost/wok888/admin/>
   - l'écran des commandes : <http://localhost/wok888/admin/commandes.html>
5. À la première visite de l'espace de gestion, choisissez votre **identifiant** et votre **mot de passe** (10 caractères au moins).

**Depuis un téléphone ou une tablette sur le même Wi-Fi :** remplacez `localhost` par l'adresse IP de l'ordinateur (commande `ipconfig`, ligne « Adresse IPv4 »), par exemple `http://192.168.1.25/wok888/`. Si Windows le demande, autorisez Apache dans le pare-feu.

**Si la carte ne s'affiche pas** (message « could not find driver » dans `C:\xampp\apache\logs\error.log`) : dans le XAMPP Control Panel, bouton **Config** d'Apache → `PHP (php.ini)`, vérifiez que la ligne `extension=pdo_sqlite` ne commence pas par un point-virgule, enregistrez, puis **Stop** et **Start** sur Apache.

Le dossier `data/` doit rester accessible en écriture (c'est le cas sous XAMPP). Pour arrêter, cliquez sur **Stop** : les données restent enregistrées.

## La commande à emporter en ligne

1. Le client remplit sa commande sur le site, choisit une heure de retrait (de quart d'heure en quart d'heure, au plus tôt 20 minutes après, jusqu'à 22h15), donne son nom et son téléphone. Il paie au retrait.
2. La commande arrive sur l'écran **Commandes en ligne** (lien en haut de l'espace de gestion) avec un carillon. Touchez **🔔 Activer le son** une fois en arrivant : les navigateurs l'exigent.
3. **Accepter**, puis **Prête**, puis **Retirée** : le client voit chaque étape sur son téléphone. **Refuser** ou **Annuler** le prévient aussi (pensez à l'appeler). **Imprimer** sort un ticket.

**Important :** la commande en ligne n'est proposée que pendant les heures d'ouverture **et tant que l'écran « Commandes en ligne » est ouvert** quelque part (une tablette en cuisine suffit ; l'écran reste allumé quand le navigateur le permet). Si personne ne le regarde, le site propose simplement d'appeler, avec la commande prête à être lue au téléphone : aucune commande ne se perd. L'interrupteur **Commande en ligne** ferme la commande en ligne à tout moment (coup de feu, rupture…).

- Les prix sont recalculés par le serveur à partir de la carte : un client ne peut pas les modifier.
- Un plat dont le stock est suivi est retiré du stock à la commande, et rendu si la commande est annulée.
- Les boissons, les glaces et le menu du jour sont marqués « Sur place » : ils ne se commandent pas en ligne.
- Le nom et le téléphone des clients sont effacés au bout de 3 mois. Un même appareil ne peut pas envoyer plus de 5 commandes par heure.

## Modifier la carte

Espace de gestion, onglet « Produits & stocks » : prix, stocks, plats masqués, comme pour Aux Saveurs Braisées.

- **Catégories** : écrites « Univers · Sous-catégorie » (par exemple « Japonais · Makis »). Le site range les sous-catégories d'un même univers dans un onglet. Une nouvelle catégorie « Desserts · Nouveautés » arrive donc d'elle-même dans l'onglet Desserts.
- **Étiquettes particulières** (champ « Étiquettes ») :
  - **À la une** : le plat apparaît en grande carte dans « À la une » (aujourd'hui les 4 menus japonais) ;
  - **Base** et **Supplément** : dans « Côté wok », les bases au choix (nouilles, riz…) et les options (œuf bio) du wok à composer. Un nouveau produit « Tofu » sans étiquette dans « Côté wok » devient une nouvelle garniture ;
  - **Sur place** : pas de commande en ligne pour ce produit.
- **Autres étiquettes** (« Épicé », « Fait maison », « Sans alcool »…) : affichées sur la carte et proposées comme filtres. Toute nouvelle étiquette devient un filtre.
- **Notes de catégorie** : affichées sous le titre (« Légumes inclus : oignon, brocoli… », « Par 3 pièces. »).

La carte de départ est dans `inc/carte.php`. Elle n'est chargée qu'une fois : ensuite, tout se fait dans l'espace de gestion.

## Photos

Déposez vos photos (JPG, PNG ou WebP) dans le dossier `photos/` : la galerie « En images » apparaît d'elle-même. Le nom du fichier sert de légende (`01-wok-aux-crevettes.jpg` s'affiche « Wok aux crevettes »). Voir `photos/LISEZ-MOI.txt`. Sans photo, la galerie n'est pas affichée. Le site n'utilise aucune photo de l'ancien site : les illustrations sont dessinées pour lui.

## Horaires

Du mardi au dimanche, 12h00 – 22h30, fermé le lundi. Ils sont écrits à deux endroits, à modifier ensemble :

1. `inc/commandes.php`, fonction `horaires()` : « Ouvert / Fermé » en direct et heures de retrait ;
2. `index.html` : le tableau des horaires, le pied de page, l'accueil et la fiche Google (`openingHoursSpecification`).

## À vérifier avec le restaurant

- **Mentions légales** (`mentions-legales.html`) : raison sociale, SIRET, TVA, directeur de la publication et hébergeur sont marqués « à compléter ».
- **Prix différents sur l'ancien site** entre la carte et la commande en ligne ; la carte a été suivie : porc croustillant à l'aigre-douce 13,10 € (12,50 € en ligne), riz vinaigré 4,00 € (6,00 €), mangue fraîche 6,90 € (7,90 €), maki crevette et maki ebi tempura 3,30 € (3,50 € et 4,90 €).
- **Bière pression** : l'ancien site affichait 8,00 € pour 25 cl comme pour 50 cl ; la 25 cl est affichée « sur demande » en attendant le bon prix.
- **Orthographe corrigée** : « Angkor Red » (« Anghor Red »), « Cosmopolitan » (« Cosmopolitain »), « Ha kao » (« 5 mièces »). À remettre si c'était voulu.
- **Horaires** : 12h00 – 22h30 sans interruption, comme sur l'ancien site.

## Moteur commun avec Aux Saveurs Braisées

`api.php`, `inc/db.php`, `inc/auth.php`, `inc/stats.php`, `admin/admin.js` et `admin/admin.css` sont **les mêmes fichiers** que ceux du dossier `restaurant/`. Une correction se fait dans les trois dossiers (`restaurant/`, `cambodge/`, `wok888/`) ; les tests vérifient qu'ils sont identiques. La commande en ligne est propre à WOK 888 : `commande.php`, `inc/commandes.php` et `admin/commandes.*`.

## Tests

```bash
php tests/site_test.php
```

## Mettre le site en ligne

Envoyez le contenu du dossier `wok888` sur un hébergement PHP (FileZilla ou le gestionnaire de fichiers de l'hébergeur), ouvrez **tout de suite** `https://votre-domaine/admin/` pour créer le compte, puis faites pointer `wok888.fr` vers ce site. Utilisez l'adresse en **https://** : sans elle, les mots de passe et les coordonnées des clients circulent sans chiffrement.
