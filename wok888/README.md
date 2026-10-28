# WOK 888 : nouveau site

Nouveau site du restaurant WOK 888, 16 route de Grenade à Seilh, qui remplace le site WordPress de wok888.fr. Il reprend toute la carte (195 plats et boissons, aux prix de l'ancien site : voir « À vérifier avec le restaurant ») dans un thème **vert et blanc**, avec des animations et une vraie expérience client : faire sauter le wok, composer le sien, laisser la machine 888 choisir son repas, casser un fortune cookie, réserver sa table. Les commandes se passent **par téléphone** : il n'y a pas de commande en ligne.

Il fonctionne en **PHP** avec une base **SQLite** (un simple fichier créé tout seul dans `data/`) : rien d'autre à installer. Il tourne tel quel sous **XAMPP** (Apache) comme chez n'importe quel hébergeur PHP.

## Ce que trouve le client

| Section | Ce qui se passe |
|---|---|
| Ouverture | Le logo se dessine trait par trait, le bol de jade s'allume, « WOK 888 » apparaît (une fois par visite, se passe d'un clic). |
| Accueil | Un wok qui saute au-dessus des flammes ; le client le fait sauter lui-même d'un clic (« Touchez le wok ! ») et les ingrédients volent. « Ce soir, envie d'un wok au canard ? » : le plat change toutes les trois secondes environ. La scène suit la souris et donne de la profondeur au défilement. « Ouvert · jusqu'à 22h30 » en direct. |
| Le souffle du wok | 鑊氣, le *wok hei* : ce qui fait le goût d'un plat sauté au wok, avec des chiffres qui s'animent. |
| **Composez votre wok** | Le client choisit sa base, sa garniture et l'œuf bio : l'ingrédient choisi vole jusque dans le wok, qui saute et flambe. Le prix se met à jour ; quand le wok est complet, il fume, des étincelles jaillissent et le bouton « Le commander au 05 61 58 06 97 » appelle le restaurant. Grésillement du wok en option (bouton « Son »). |
| À la une | Les menus japonais (Royal 888, Duo, Maki, Sushi) en grandes cartes, chacune avec un bouton « Commander » qui appelle le restaurant ; elles se font glisser sur téléphone. |
| La carte | 8 univers (Entrées, Côté wok, Poké bowls, Nos plats, Japonais, Menus, Desserts, Boissons) avec une pastille qui glisse de l'un à l'autre, recherche, filtres, plats épuisés signalés en direct. |
| La machine 888 | Une machine à sous qui tire une entrée, un plat et un dessert ; le repas tiré se commande d'un geste par téléphone. |
| **Le fortune cookie** | Le client casse un fortune cookie (miettes, « crac » si le son est activé) : un message porte-bonheur s'écrit lettre à lettre, avec ses chiffres porte-bonheur et un plat de la carte tiré au sort, à commander par téléphone. |
| Réserver | Lanternes qui se balancent, et plus fort quand on fait défiler la page ; la réservation resOS du restaurant s'ouvre dans la page. |
| Horaires et accès | Jour du jour mis en avant, Google Maps, Waze, Plans, plan OpenStreetMap à la demande (l'épingle tombe et fait des ondes). |

Partout : les titres montent mot à mot, des mots clés se surlignent au feutre vert, une barre de progression suit la lecture, le bandeau accélère avec le défilement (et repart en arrière quand on remonte), des feuilles de bambou flottent sur les grands écrans, les grands boutons suivent légèrement la souris et le téléphone « sonne » de temps en temps quand le restaurant est ouvert.

Tout s'adapte au téléphone (barre d'actions en bas : Appeler, La carte, Mon wok, Réserver). Les animations s'arrêtent pour les visiteurs qui ont demandé à leur appareil de limiter les mouvements.

## Ce qui change par rapport à l'ancien site

| | Ancien site (WordPress) | Nouveau site |
|---|---|---|
| Textes | modèle de démonstration resté en ligne : « meet the chefs » (Benjiro Eito…), « High Salary », « Lorem ipsum », « Find locations near you », « WOK 888 Seihl » | textes du restaurant, en français, relus |
| La carte | 3 pages séparées, sans recherche | une seule carte en 8 univers, recherche, filtres, plats épuisés en direct |
| Le wok | « Choisissez votre base » avec une erreur (« Bò Bún Nem aux crevettes + 1,50 € » au lieu du riz sauté) | composeur animé, prix calculé |
| Commander | WooCommerce et Orderable (extensions payantes) | par téléphone, en un geste : boutons « Appeler » et « Le commander » partout sur le site |
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
5. À la première visite de l'espace de gestion, choisissez votre **identifiant** et votre **mot de passe** (10 caractères au moins).

**Depuis un téléphone ou une tablette sur le même Wi-Fi :** remplacez `localhost` par l'adresse IP de l'ordinateur (commande `ipconfig`, ligne « Adresse IPv4 »), par exemple `http://192.168.1.25/wok888/`. Si Windows le demande, autorisez Apache dans le pare-feu.

**Si la carte ne s'affiche pas** (message « could not find driver » dans `C:\xampp\apache\logs\error.log`) : dans le XAMPP Control Panel, bouton **Config** d'Apache → `PHP (php.ini)`, vérifiez que la ligne `extension=pdo_sqlite` ne commence pas par un point-virgule, enregistrez, puis **Stop** et **Start** sur Apache.

Le dossier `data/` doit rester accessible en écriture (c'est le cas sous XAMPP). Pour arrêter, cliquez sur **Stop** : les données restent enregistrées.

**Vous aviez installé la version précédente (avec la commande en ligne) ?** Supprimez d'abord le dossier `C:\xampp\htdocs\wok888` (gardez-en seulement le sous-dossier `data\` si vous voulez conserver votre compte et vos statistiques), puis copiez le nouveau : sinon les anciens fichiers de commande resteraient en place. À la première visite, la carte est rechargée depuis `inc/carte.php` (version 2, sans l'étiquette « Sur place ») ; le compte et les statistiques sont gardés.

## Modifier la carte

Espace de gestion, onglet « Produits & stocks » : prix, stocks, plats masqués, comme pour Aux Saveurs Braisées.

- **Catégories** : écrites « Univers · Sous-catégorie » (par exemple « Japonais · Makis »). Le site range les sous-catégories d'un même univers dans un onglet. Une nouvelle catégorie « Desserts · Nouveautés » arrive donc d'elle-même dans l'onglet Desserts.
- **Étiquettes particulières** (champ « Étiquettes ») :
  - **À la une** : le plat apparaît en grande carte dans « À la une » (aujourd'hui les 4 menus japonais) ;
  - **Base** et **Supplément** : dans « Côté wok », les bases au choix (nouilles, riz…) et les options (œuf bio) du wok à composer. Un nouveau produit « Tofu » sans étiquette dans « Côté wok » devient une nouvelle garniture.
- **Autres étiquettes** (« Épicé », « Fait maison », « Sans alcool »…) : affichées sur la carte et proposées comme filtres. Toute nouvelle étiquette devient un filtre.
- **Notes de catégorie** : affichées sous le titre (« Légumes inclus : oignon, brocoli… », « Par 3 pièces. »).

La carte de départ est dans `inc/carte.php`. Elle n'est chargée qu'une fois : ensuite, tout se fait dans l'espace de gestion.

## Photos

Déposez vos photos (JPG, PNG ou WebP) dans le dossier `photos/` : la galerie « En images » apparaît d'elle-même. Le nom du fichier sert de légende (`01-wok-aux-crevettes.jpg` s'affiche « Wok aux crevettes »). Voir `photos/LISEZ-MOI.txt`. Sans photo, la galerie n'est pas affichée. Le site n'utilise aucune photo de l'ancien site : les illustrations sont dessinées pour lui.

## Horaires

Du mardi au dimanche, 12h00 – 22h30, fermé le lundi. Ils sont écrits à deux endroits, à modifier ensemble :

1. `site.js`, constantes `SERVICE` et `CRENEAUX` : « Ouvert / Fermé » en direct (à l'heure de Seilh, quel que soit le fuseau du visiteur) ;
2. `index.html` : le tableau des horaires, le pied de page, l'accueil et la fiche Google (`openingHoursSpecification`).

Les tests vérifient que les deux concordent.

## Textes animés

Les plats de « Ce soir, envie… » (`ENVIES`) et les messages des fortune cookies (`FORTUNES`) sont en clair dans `site.js` : ils se modifient comme du texte. Le plat porte-bonheur, lui, est tiré de la carte (jamais une boisson ni un plat épuisé).

## Couleurs

Le thème vert et blanc est réglé en haut de `site.css` (`--vert`, `--vert-fonce`, `--menthe`…). Le logo, le favicon et les images de partage (`favicon.svg`, `images/`) reprennent les mêmes verts.

## À vérifier avec le restaurant

- **Mentions légales** (`mentions-legales.html`) : raison sociale, SIRET, TVA, directeur de la publication et hébergeur sont marqués « à compléter ».
- **Prix différents sur l'ancien site** entre la carte et la commande en ligne ; la carte a été suivie : porc croustillant à l'aigre-douce 13,10 € (12,50 € en ligne), riz vinaigré 4,00 € (6,00 €), mangue fraîche 6,90 € (7,90 €), maki crevette et maki ebi tempura 3,30 € (3,50 € et 4,90 €).
- **Bière pression** : l'ancien site affichait 8,00 € pour 25 cl comme pour 50 cl ; la 25 cl est affichée « sur demande » en attendant le bon prix.
- **Orthographe corrigée** : « Angkor Red » (« Anghor Red »), « Cosmopolitan » (« Cosmopolitain »), « Ha kao » (« 5 mièces »). À remettre si c'était voulu.
- **Horaires** : 12h00 – 22h30 sans interruption, comme sur l'ancien site.

## Moteur commun avec Aux Saveurs Braisées

`api.php`, `inc/db.php`, `inc/auth.php`, `inc/stats.php`, `admin/admin.js` et `admin/admin.css` sont **les mêmes fichiers** que ceux du dossier `restaurant/`, et `admin/index.html` ne diffère que par le nom du restaurant. Une correction se fait dans les trois dossiers (`restaurant/`, `cambodge/`, `wok888/`) ; les tests vérifient qu'ils sont identiques.

## Tests

```bash
php tests/site_test.php
```

## Mettre le site en ligne

Envoyez le contenu du dossier `wok888` sur un hébergement PHP (FileZilla ou le gestionnaire de fichiers de l'hébergeur), ouvrez **tout de suite** `https://votre-domaine/admin/` pour créer le compte, puis faites pointer `wok888.fr` vers ce site. Utilisez l'adresse en **https://** : sans elle, le mot de passe de l'espace de gestion circule sans chiffrement.
