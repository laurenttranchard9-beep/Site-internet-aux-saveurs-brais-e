# Aux Saveurs Braisées : menu interactif et espace de gestion

- **La carte** (`index.html`) : menu public avec catégories, recherche, filtres par étiquette (Épicé, Végétarien…) et badges de stock (« Plus que 3 portions », « Épuisé »). Elle se met à jour toute seule toutes les 30 secondes.
- **L'espace de gestion** (`admin/`) : accessible après connexion. On peut y :
  - modifier les **prix** et les **stocks** directement dans le tableau (boutons − / +, ou saisie de la quantité) ;
  - **ajouter, modifier, masquer ou supprimer** des produits ;
  - **créer, renommer, réordonner et supprimer** des catégories ;
  - changer son mot de passe.

Le site fonctionne en **PHP** avec une base **SQLite**, un simple fichier créé automatiquement dans `data/`. Rien d'autre à installer ni à configurer.

## Utiliser le site sur son ordinateur (Windows)

1. Installez **XAMPP** : <https://www.apachefriends.org/fr/> (version PHP 8.1 ou plus récente).
2. Copiez le dossier `restaurant` dans `C:\xampp\htdocs\`. Vous obtenez `C:\xampp\htdocs\restaurant\`.
3. Ouvrez le **XAMPP Control Panel** et cliquez sur **Start** à côté d'**Apache**.
4. Ouvrez dans votre navigateur :
   - la carte : <http://localhost/restaurant/>
   - la gestion : <http://localhost/restaurant/admin/>
5. À la première visite de la gestion, choisissez votre **identifiant** et votre **mot de passe**.

Pour arrêter, cliquez sur **Stop** dans XAMPP. Vos données restent enregistrées.

**Depuis un téléphone sur le même Wi-Fi :** remplacez `localhost` par l'adresse IP de l'ordinateur (commande `ipconfig`, ligne « Adresse IPv4 »), par exemple `http://192.168.1.25/restaurant/admin/`. Si Windows le demande, autorisez Apache dans le pare-feu.

## Mettre le site en ligne

Presque tous les hébergeurs web proposent PHP, même les offres les moins chères (OVH, o2switch, Hostinger, IONOS…).

1. Envoyez le contenu du dossier `restaurant` sur l'hébergement, avec le gestionnaire de fichiers de l'hébergeur ou un logiciel FTP comme FileZilla.
2. Ouvrez **tout de suite** `https://votre-site.fr/admin/` et créez votre compte. Tant que ce n'est pas fait, la première personne qui ouvre cette page peut créer le compte.
3. C'est tout.

Vérifiez que le dossier `data/` est **accessible en écriture** (c'est le cas par défaut chez la plupart des hébergeurs). Utilisez de préférence l'adresse en **https://**.

## Mot de passe oublié

1. Dans le dossier `data/`, créez un fichier vide nommé **`reinitialiser.txt`** (dans l'Explorateur Windows ou le gestionnaire de fichiers de l'hébergeur).
2. Ouvrez la page de gestion : elle propose de créer un nouveau compte, qui remplace l'ancien.
3. Le fichier `reinitialiser.txt` est supprimé automatiquement.

Seule une personne qui a accès aux fichiers du site peut faire cette manipulation.

## Statistiques de visite et cookies

L'onglet **Statistiques** de l'espace de gestion montre quand et sur quel appareil la carte est consultée : visites par jour (ou par mois), heures et jours de la semaine, smartphone / tablette / ordinateur, systèmes, navigateurs et provenance (Google, Facebook…), sur 7 jours, 30 jours ou 12 mois.

Conformément aux règles de la CNIL, un bandeau demande l'accord du visiteur avant tout cookie de mesure :

- **Accepter** dépose un identifiant aléatoire (`asb_visiteur`, 13 mois) et compte la visite ; **Refuser** ne compte rien. Les deux boutons sont à égalité.
- Le choix est gardé 6 mois (`asb_cookies`), et le lien « Gérer les cookies » en bas de la carte permet d'en changer.
- Aucune adresse IP n'est enregistrée ; une même personne compte une visite par tranche de 30 minutes ; les visites de plus de 25 mois sont supprimées.

Les chiffres ne portent donc que sur les visiteurs qui acceptent le cookie.

## Stocks

- Un produit a soit une **quantité suivie** (nombre de portions), soit un **stock illimité** (case « Suivre le stock » décochée), pratique pour les accompagnements ou les boissons.
- À 5 portions ou moins, la carte affiche « Plus que N portions ». À 0, le plat reste affiché, barré, avec la mention « Épuisé ».
- Pour retirer un plat de la carte sans le supprimer, désactivez l'interrupteur **Visible**.

## Sauvegarde

Toutes les données (produits, prix, stocks, catégories, compte) sont dans le fichier `data/restaurant-….sqlite`. Copiez-le régulièrement sur une clé USB ou un cloud.

## Sécurité

- Mots de passe chiffrés (bcrypt), jamais stockés en clair.
- Cookie de session `HttpOnly` et `SameSite=Strict`, qui expire au bout de 8 h.
- 5 tentatives de connexion ratées bloquent l'adresse IP pendant 15 minutes.
- Changer de mot de passe déconnecte les autres appareils.
- Les dossiers `data/`, `inc/` et `tests/` sont interdits d'accès depuis le navigateur, et le fichier de la base porte un nom aléatoire.
- Toutes les données sont vérifiées côté serveur.

## Tests (pour les développeurs)

```bash
php tests/api_test.php
```

## Carte imprimée

Le dossier `impression/` contient la carte papier : **`carte-a3-3-volets.pdf`** (A3 paysage, recto-verso, pliée en 3 volets). Le fichier `carte-a3-3-volets.html` est sa source : si vous changez un plat ou un prix, modifiez-le puis ouvrez-le dans Chrome, *Imprimer → Enregistrer au format PDF* (A3 paysage, marges « Aucune », « Graphiques d'arrière-plan » coché).
