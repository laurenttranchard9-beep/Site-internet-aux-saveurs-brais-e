#!/usr/bin/env python3
"""
Diaporama de la carte de Wok 888 pour 5 écrans (télévisions en 16:9, 1920 × 1080).

Chaque écran a sa clé USB et montre une partie de la carte, en 2 ou 3 diapos qui
tournent en boucle. Les plats et les prix viennent de generer.py (la carte imprimée) :
une modification là-bas se retrouve ici.

    python3 diaporama.py            # écrit diaporama.html
    node imprimer-diaporama.js      # écrit les images 1920 × 1080 dans ecrans/
    bash fabriquer-videos.sh        # écrit les vidéos MP4 (boucle courte et 10 heures)
"""
from pathlib import Path

import generer as g

ICI = Path(__file__).resolve().parent

SUSHIS = '<img class="deco" src="images/sushis.png" alt="" style="right:40px;bottom:30px;height:430px" />'
FEUILLES = '<img class="deco" src="images/feuilles.png" alt="" style="right:60px;bottom:40px;height:520px;transform:scaleX(-1) rotate(-14deg)" />'

def partie(r, debut, fin=None):
    """Morceau d'une rubrique trop longue pour une colonne. La suite garde le filet du titre, sans le texte."""
    suite = debut > 0
    return dict(r, titre="" if suite else r["titre"], note="" if suite else r["note"],
                intro="" if suite else r["intro"], plats=r["plats"][debut:fin])


# Chaque écran : un dossier, puis ses diapos. Une diapo : un titre, puis des colonnes
# (« flux » : un seul bloc réparti automatiquement sur toutes les colonnes).
ECRANS = [
    {"dossier": "ecran-1-entrees", "diapos": [
        {"titre": g.titre("Nos", "Entrées", sticker=True), "colonnes": [[g.GRILLADES], [g.VAPEUR], [g.SOUPES]]},
        {"titre": g.titre("Nos", "Entrées", sticker=True),
         "colonnes": [[partie(g.TAPAS, 0, 9)], [partie(g.TAPAS, 9)], [g.ASSIETTES]]},
        {"titre": g.titre("Nos", "Salades"), "colonnes": [[partie(g.SALADES, 0, 5)], [partie(g.SALADES, 5)]],
         "largeurs": "1fr 1fr 0.55fr", "deco": FEUILLES},
    ]},
    {"dossier": "ecran-2-wok-poke-plats", "diapos": [
        {"titre": g.titre("Côté", "Wok & poké bowl", sticker=True),
         "colonnes": [[g.WOK_BASE, g.WOK], [g.POKE], [g.ACCOMPAGNEMENTS]]},
        {"titre": g.titre("Nos", "Plats"), "flux": 3, "colonnes": [[g.PLATS]]},
    ]},
    {"dossier": "ecran-3-japonais", "diapos": [
        {"titre": g.titre("Spécialités", "Japonaises", sticker=True),
         "colonnes": [[g.SUSHI, g.CHIRASHI], [g.MAKI], [g.SASHIMI]], "deco": SUSHIS},
        {"titre": g.titre("Spécialités", "Japonaises", sticker=True), "colonnes": [[g.CRUNCHI, g.SNOW], [g.CALIFORNIA]],
         "largeurs": "1fr 1fr 0.55fr", "deco": FEUILLES},
    ]},
    {"dossier": "ecran-4-menus", "diapos": [
        {"titre": g.titre("Les", "Menus"), "colonnes": [[g.MENU_JOUR], [g.MENU_MAKI], [g.MENU_SUSHI], [g.MENU_SASHIMI]], "ecart": 44},
        {"titre": g.titre("Les", "Menus"), "colonnes": [[g.MENU_DUO], [g.MENU_ROYAL], [g.MENU_ENFANT]]},
    ]},
    {"dossier": "ecran-5-desserts-boissons", "diapos": [
        {"titre": g.titre("Les", "Desserts"), "colonnes": [[g.DESSERTS], [g.MOCHI, g.GLACES, g.DIGESTIFS_GLACES]],
         "largeurs": "1fr 1fr 0.55fr", "deco": FEUILLES},
        {"titre": g.titre("Les", "Boissons"), "colonnes": [[g.SOFTS, g.EAUX], [g.CHAUDES, g.APERITIFS], [g.SPIRITUEUX, g.SAKE]]},
        {"titre": g.titre("Les", "Cocktails"), "colonnes": [[g.COCKTAILS], [g.SANS_ALCOOL]],
         "largeurs": "1fr 1fr 0.55fr", "deco": FEUILLES},
        {"titre": g.titre("Vins", "& bières"),
         "colonnes": [[g.VINS_ROUGES, g.VINS_ROSES], [g.VINS_BLANCS, g.BULLES, g.VIN_VERRE], [g.BIERES_BOUTEILLE, g.BIERES_PRESSION]]},
    ]},
]


def diapo(d, numero, total, dossier):
    colonnes = d["colonnes"]
    if d.get("flux"):
        contenu = f'<div class="flux" style="column-count:{d["flux"]}">' + "".join(g.bloc(b) for b in colonnes[0]) + "</div>"
    else:
        largeurs = d.get("largeurs", " ".join(["1fr"] * len(colonnes)))
        ecart = f';column-gap:{d["ecart"]}px' if d.get("ecart") else ""
        contenu = (f'<div class="colonnes" style="grid-template-columns:{largeurs}{ecart}">'
                   + "".join('<div class="colonne">' + "".join(g.bloc(b) for b in c) + "</div>" for c in colonnes)
                   + "</div>")
    points = "".join(f'<i class="{"actif" if i == numero else ""}"></i>' for i in range(1, total + 1)) if total > 1 else ""
    return (f'<section class="diapo" data-fichier="{dossier}/{dossier}-{numero}.png">'
            f'{d.get("deco", "")}'
            f'<header class="tete">{g.bloc(d["titre"])}'
            '<div class="marque"><img src="images/logo-symbole.png" alt="" /><img src="images/logo-nom.png" alt="Wok 888" /></div>'
            f'</header>{contenu}<div class="points">{points}</div></section>')


def main():
    modele = (ICI / "diaporama-modele.html").read_text(encoding="utf-8")
    diapos = "".join(diapo(d, i, len(e["diapos"]), e["dossier"])
                     for e in ECRANS for i, d in enumerate(e["diapos"], 1))
    (ICI / "diaporama.html").write_text(modele.replace("{{DIAPOS}}", diapos), encoding="utf-8")
    print("diaporama.html écrit")


if __name__ == "__main__":
    main()
