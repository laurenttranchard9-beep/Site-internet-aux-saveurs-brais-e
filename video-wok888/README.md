# Film de présentation du site WOK 888

Film en motion design : le vrai site, en action dans un téléphone, avec des titres animés aux couleurs de WOK 888.
53 secondes, format vertical **1080 × 1920** (Reels et Stories Instagram, TikTok), 30 images/s, **sans son** : ajoutez une musique depuis Instagram au moment de publier.

| Temps | Scène |
|---|---|
| 0 – 3 s | Le logo se dessine |
| 3 – 8 s | « Le nouveau site » : ouverture du site, horaires en direct |
| 8 – 12 s | « Faites sauter le wok » |
| 12 – 21 s | « Composez votre wok » : nouilles, canard, œuf, le prix suit |
| 21 – 27 s | « Toute la carte » : 195 plats, recherche « canard » |
| 27 – 32 s | « La machine 888 » |
| 32 – 38 s | « Cassez votre fortune cookie » |
| 38 – 42 s | « Réservez en ligne », horaires du jour |
| 42 – 48 s | « La carte toujours à jour » : l'espace de gestion (prix modifié, plat masqué) |
| 48 – 53 s | wok888.fr, téléphone, adresse |

## Refaire le film

Après une modification du site (carte, textes, couleurs) ou du scénario :

```bash
./filmer.sh
```

Le film est écrit dans `film-wok888.mp4`, dans ce dossier (il n'est pas enregistré dans le dépôt : trop lourd). Compter une dizaine de minutes.

Il faut PHP 8.1 ou plus (avec `pdo_sqlite`), Python 3, Node.js 18 ou plus avec Playwright et son Chromium (`npm install playwright` puis `npx playwright install chromium`), et ffmpeg. Le script lance le site sur une base temporaire (la carte d'origine) : aucune vraie base n'est modifiée.

## Modifier les textes ou le rythme

- `compo/scenario.js` : les titres de chaque scène (`*mot*` s'écrit en vert, `{195}` est un nombre qui défile), les bulles, et les actions sur le site (défiler, toucher, taper), chacune à son instant en secondes.
- `compo/index.html` et `compo/rendu.js` : la mise en page et les animations (logo, titres, téléphone, fin).
- `film.js` et `temps-virtuel.js` : le tournage. Le site est filmé image par image avec une horloge virtuelle (vendredi 19 h 30, restaurant ouvert), et un hasard fixe : la machine 888 et le fortune cookie tirent toujours les mêmes plats.

Pour vérifier une scène sans tout refaire :

```bash
./filmer.sh --images 9.6,19.4 --dossier images
```

écrit les images de ces instants (en secondes) dans `images/`.
