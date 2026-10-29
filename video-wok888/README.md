# Film de présentation du site WOK 888

Film en motion design : le vrai site, en action dans un téléphone, avec des titres animés aux couleurs de WOK 888, une voix off et une musique de fond.
51 secondes, format vertical **1080 × 1920** (Reels et Stories Instagram, TikTok), 30 images/s, son stéréo à -14 LUFS (le niveau conseillé pour Instagram).

| Temps | Scène | Voix off |
|---|---|---|
| 0 – 3 s | Le logo se dessine | « Wok 888, les saveurs d'Asie à Seilh. » |
| 3 – 8,5 s | « Le nouveau site » : ouverture du site, horaires en direct | « Découvrez notre nouveau site… » |
| 8,5 – 12,5 s | « Faites sauter le wok » | « Dès l'accueil, touchez le wok… » |
| 12,5 – 21 s | « Composez votre wok » : nouilles, canard, œuf, le prix suit | « Une base, une garniture, un petit plus… » |
| 21 – 27 s | « Toute la carte » : 195 plats, recherche « canard » | « Toute la carte est là… » |
| 27 – 33 s | « La machine 888 » | « Pas d'idée ? La machine 888… » |
| 33 – 38 s | « Cassez votre fortune cookie » | « Et pour finir, cassez votre fortune cookie… » |
| 38 – 43 s | « Réservez en ligne » ou appelez | « Une table pour ce soir ? » |
| 43 – 51 s | wok888.fr, téléphone, adresse | « Sur place ou à emporter. Rendez-vous sur wok888.fr ! » |

## Voix et musique

- **Voix** : synthèse vocale [Piper](https://github.com/rhasspy/piper), voix française « siwis » (données *SIWIS French Speech Synthesis Database*, Université d'Édimbourg, licence [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/)). La licence demande de citer la source : par exemple, dans la description de la publication, « Voix : Piper, voix siwis (CC-BY 4.0) ».
- **Musique** : composée et synthétisée par `audio/musique.py` (cordes pincées façon koto en gamme pentatonique, nappes, basse, batterie légère, gong final). Aucun échantillon extérieur : elle est libre de droits. Le rythme part avec le téléphone et s'arrête sur un coup de gong à l'écran de fin ; elle baisse d'elle-même quand la voix parle.

## Refaire le film

Après une modification du site (carte, textes, couleurs) ou du scénario :

```bash
./filmer.sh
```

Le film est écrit dans `film-wok888.mp4`, dans ce dossier (il n'est pas enregistré dans le dépôt : trop lourd). Compter une dizaine de minutes.

Il faut PHP 8.1 ou plus (avec `pdo_sqlite`), Python 3, Node.js 18 ou plus avec Playwright et son Chromium (`npm install playwright` puis `npx playwright install chromium`), et ffmpeg. Au premier lancement, le script installe la synthèse vocale dans `.outils/` et télécharge la voix (environ 60 Mo). Il lance le site sur une base temporaire (la carte d'origine) : aucune vraie base n'est modifiée.

## Modifier les textes, la voix ou le rythme

- `compo/scenario.js` : les titres de chaque scène (`*mot*` s'écrit en vert, `{195}` est un nombre qui défile), les bulles, les actions sur le site (défiler, toucher, taper), le texte de la voix off et le départ de la musique, chacun à son instant en secondes. Le texte de la voix est écrit pour être bien prononcé : « huit huit huit » pour 888, « Seille » pour Seilh, « point èf èr » pour .fr.
- `compo/index.html` et `compo/rendu.js` : la mise en page et les animations (logo, titres, téléphone, fin).
- `film.js` et `temps-virtuel.js` : le tournage. Le site est filmé image par image avec une horloge virtuelle (vendredi 19 h 30, restaurant ouvert), et un hasard fixe : la machine 888 et le fortune cookie tirent toujours les mêmes plats.
- `audio/voix.py`, `audio/musique.py`, `audio/mixer.sh` : la voix, la musique et leur mélange. Une phrase trop longue pour sa place est signalée pendant le rendu (« déborde sur la phrase suivante »).

Pour vérifier une scène sans tout refaire :

```bash
./filmer.sh --images 9.6,19.4 --dossier images
```

écrit les images de ces instants (en secondes) dans `images/`.
