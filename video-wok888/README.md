# Film de présentation du site WOK 888

Film en motion design : le vrai site, en action dans un téléphone, avec des titres animés aux couleurs de WOK 888 et une musique électro-house originale.
50 secondes, format vertical **1080 × 1920** (Reels et Stories Instagram, TikTok), 30 images/s, son stéréo à -14 LUFS (le niveau conseillé pour Instagram).

Tout est calé sur le tempo de la musique (120 temps par minute, une mesure = 2 s) : chaque scène commence sur un temps fort, et les touchers tombent sur les temps.

| Temps | Scène |
|---|---|
| 0 – 4 s | Le logo se dessine, la musique monte |
| 4 – 10 s | Le rythme part : « Le nouveau site », ouverture du site, horaires en direct |
| 10 – 14 s | « Faites sauter le wok » |
| 14 – 22 s | « Composez votre wok » : nouilles, canard, œuf, le prix suit |
| 22 – 28 s | « Toute la carte » : 195 plats, recherche « canard » |
| 28 – 34 s | « La machine 888 » |
| 34 – 40 s | « Cassez votre fortune cookie » |
| 40 – 44 s | « Réservez en ligne » ou appelez |
| 44 – 50 s | Coup final : wok888.eu, téléphone, adresse |

## Musique et bruitages

Composés et synthétisés par `audio/musique.py`, sans aucun échantillon extérieur : ils sont libres de droits.

- **Musique** : grosse caisse à chaque temps, basse en contretemps, accords plaqués, nappe qui « pompe », et une mélodie en la mineur pentatonique aux couleurs asiatiques. Montée pendant le logo, cymbale et souffle à chaque changement de scène, arpège rapide pendant que la machine 888 tourne, coup final sur l'écran de fin.
- **Bruitages** : touchers, frappe au clavier, wok qui saute et grésille, cookie qui craque, cloches au résultat de la machine, trait de feutre autour des éléments entourés, bulle qui apparaît. Ils suivent les actions du scénario.

## Refaire le film

Après une modification du site (carte, textes, couleurs) ou du scénario :

```bash
./filmer.sh
```

Le film est écrit dans `film-wok888.mp4`, dans ce dossier (il n'est pas enregistré dans le dépôt : trop lourd). Compter une dizaine de minutes.

Il faut PHP 8.1 ou plus (avec `pdo_sqlite`), Python 3, Node.js 18 ou plus avec Playwright et son Chromium (`npm install playwright` puis `npx playwright install chromium`), et ffmpeg. Au premier lancement, le script installe numpy et scipy dans `.outils/` pour la musique. Il lance le site sur une base temporaire (la carte d'origine) : aucune vraie base n'est modifiée.

## Modifier les textes ou le rythme

- `compo/scenario.js` : les titres de chaque scène (`*mot*` s'écrit en vert, `{195}` est un nombre qui défile), les bulles et les actions sur le site (défiler, toucher, taper), chacune à son instant en secondes. Pour garder la musique calée, une scène commence toujours sur une mesure (4, 10, 14… : multiples de 2 s après le départ du rythme à 4 s).
- `compo/index.html` et `compo/rendu.js` : la mise en page et les animations (logo, titres, téléphone, fin).
- `film.js` et `temps-virtuel.js` : le tournage. Le site est filmé image par image avec une horloge virtuelle (vendredi 19 h 30, restaurant ouvert), et un hasard fixe : la machine 888 et le fortune cookie tirent toujours les mêmes plats.
- `audio/musique.py` et `audio/mixer.sh` : la musique, les bruitages et le volume final.

Pour vérifier une scène sans tout refaire :

```bash
./filmer.sh --images 9.6,19.4 --dossier images
```

écrit les images de ces instants (en secondes) dans `images/`.
