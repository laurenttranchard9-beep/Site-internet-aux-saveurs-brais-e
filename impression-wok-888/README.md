# Carte imprimée de Wok 888

**`carte-a3-3-volets.pdf`** : toute la carte du restaurant (les 8 pages A4 d'origine), en A3 paysage recto-verso, à plier en 3 volets (pli roulé).

- **Extérieur** (page 1) : les menus et les desserts (sur le rabat), les boissons, bières, cocktails et vins (au dos), la couverture.
- **Intérieur** (page 2) : les entrées, le wok, les poké bowls et les plats, les spécialités japonaises.

Le rabat fait 138 mm au lieu de 141 mm pour se replier sans buter contre le pli. De petits traits en haut et en bas indiquent où plier.

À l'imprimerie : **A3 recto-verso, retourné sur le bord court, papier 170 à 250 g, pli roulé en 3 volets**.

## Mettre à jour la carte

Les plats et les prix sont dans `generer.py`, la mise en page (couleurs, polices, couverture, décor) dans `modele.html`. Pour mettre un plat en avant comme spécialité de la maison (étoile et fond bordeaux), ajouter `spe=True` à sa ligne, ou à la rubrique entière ; `sticker=True` sur un grand titre ajoute le sticker rond « Nos spécialités ». Après une modification :

```bash
python3 generer.py
node imprimer.js
```

`imprimer.js` (Playwright) écrit le PDF et affiche, pour chaque colonne, la place restante en bas : si une valeur devient négative, le texte déborde. Il suffit alors de baisser la `taille` du volet concerné dans `generer.py` ou de déplacer une rubrique vers une autre colonne.

Sans Node, on peut aussi ouvrir `carte-a3-3-volets.html` dans Chrome, *Imprimer → Enregistrer au format PDF* : A3 paysage, marges « Aucune », « Graphiques d'arrière-plan » coché.

Images : couverture, feuilles et sushis repris du menu d'origine. Polices : Bebas Neue et DM Sans (licence libre, voir `polices/LICENCES.md`).

## Affiche Halloween

**`affiche-halloween.pdf`** (A3 portrait, pour l'impression) et **`affiche-halloween.png`** (pour les réseaux sociaux) : présentation des produits du restaurant le dimanche 1er novembre, de 11h à 14h, avec le logo en version Halloween (symbole couleur citrouille et chapeau de sorcière, citrouille à la place du « O »).

Le texte et la mise en page sont dans `affiche-halloween.html`. Après une modification :

```bash
node imprimer-affiche.js
```
