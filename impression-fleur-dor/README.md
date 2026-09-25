# Carte imprimée de La Fleur d'Or

**`carte-a3-3-volets.pdf`** : la carte complète du restaurant, sans la fondue, en A3 paysage recto-verso, à plier en 3 volets (pli roulé).

- **Intérieur** : cuisine chinoise et thaïlandaise, bar à sushis, desserts.
- **Extérieur** : les formules (sur le rabat), les glaces et le bar (au dos), la couverture avec les horaires, l'adresse, le téléphone, les moyens de paiement et les mentions légales.

Le rabat fait 138 mm au lieu de 141 mm pour se replier sans buter contre le pli. De petits traits en haut et en bas indiquent où plier.

À l'imprimerie : **A3 recto-verso, retourné sur le bord court, papier 170 à 250 g, pli roulé en 3 volets**.

## Mettre à jour la carte

La carte est construite à partir de `carte.json`, copie du fichier `donnees/carte.json` du site ([dépôt Fleur-d-or](https://github.com/laurenttranchard9-beep/Fleur-d-or)). Après une modification de la carte dans le panneau d'administration du site :

```bash
python3 generer.py chemin/vers/Fleur-d-or/donnees/carte.json
```

puis ouvrir `carte-a3-3-volets.html` dans Chrome, *Imprimer → Enregistrer au format PDF* : A3 paysage, marges « Aucune », « Graphiques d'arrière-plan » coché.

La mise en page (couleurs, polices, couverture, infos pratiques) est dans `modele.html`. Si la carte s'allonge, vérifiez que le texte tient toujours dans les volets.

Polices : Archivo et Noto Serif TC (licence libre, voir `polices/LICENCES.md`), converties en versions fixes pour l'impression.
