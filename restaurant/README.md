# Aux Saveurs Braisées : menu interactif et espace de gestion

- **La carte** (`/`) : menu public avec catégories, recherche, filtres par étiquette (Épicé, Végétarien…) et badges de stock (« Plus que 3 portions », « Épuisé »). Elle se met à jour toute seule toutes les 30 secondes.
- **L'espace de gestion** (`/admin/`) : accessible après connexion. On peut y :
  - modifier les **prix** et les **stocks** directement dans le tableau (boutons − / +, ou saisie de la quantité) ;
  - **ajouter, modifier, masquer ou supprimer** des produits ;
  - **créer, renommer, réordonner et supprimer** des catégories (les produits d'une catégorie supprimée sont déplacés ou supprimés, au choix) ;
  - changer son mot de passe.

## Installation

Il faut Node.js 20 ou plus récent.

```bash
cd restaurant
npm install
npm start
```

Ouvrez ensuite <http://localhost:3000/> (la carte) et <http://localhost:3000/admin/> (la gestion).

Au **premier démarrage**, le serveur crée une carte d'exemple et un compte `admin`. Le mot de passe généré s'affiche **une seule fois** dans la console : notez-le, puis changez-le depuis l'espace de gestion (bouton « Mot de passe »).

Pour choisir soi-même l'identifiant et le mot de passe du premier compte :

```bash
ADMIN_USER=gerant ADMIN_PASSWORD='un-mot-de-passe-solide' npm start
```

Mot de passe oublié :

```bash
npm run reset-password -- admin 'nouveau-mot-de-passe'
```

## Stocks

- Un produit a soit une **quantité suivie** (nombre de portions), soit un **stock illimité** (case « Suivre le stock » décochée), pratique pour les accompagnements ou les boissons.
- À 5 portions ou moins, la carte affiche « Plus que N portions ». À 0, le plat reste affiché, barré, avec la mention « Épuisé ».
- Pour retirer un plat de la carte sans le supprimer, désactivez l'interrupteur **Visible**.

## Mise en ligne

Hébergez le dossier `restaurant/` sur n'importe quel service qui fait tourner Node.js (Render, Railway, Fly.io, un VPS…), avec un **disque persistant** pour le dossier `data/`, où se trouve la base de données.

| Variable | Rôle |
| --- | --- |
| `PORT` | Port d'écoute (3000 par défaut) |
| `NODE_ENV=production` | Cookie de session réservé au HTTPS. **Le site doit alors être servi en HTTPS**, sinon la connexion ne fonctionnera pas. |
| `TRUST_PROXY=1` | À activer derrière un proxy ou un hébergeur (Render, Railway…) pour que la limitation des tentatives de connexion utilise la vraie adresse IP |
| `DB_FILE` | Chemin de la base SQLite (`data/restaurant.db` par défaut) |
| `ADMIN_USER` / `ADMIN_PASSWORD` | Compte créé au premier démarrage |

Pensez à sauvegarder régulièrement le fichier `data/restaurant.db`.

## Sécurité

- Mots de passe chiffrés (scrypt avec sel), jamais stockés en clair.
- Session dans un cookie `HttpOnly` et `SameSite=Strict`, qui expire au bout de 8 h.
- 5 tentatives de connexion ratées bloquent l'adresse IP pendant 15 minutes.
- Changer de mot de passe déconnecte les autres appareils.
- Toutes les données sont vérifiées côté serveur. Une politique de sécurité du contenu (CSP) bloque les scripts extérieurs.

## Tests

```bash
npm test
```
