#!/usr/bin/env python3
"""
Stories Instagram « à la une » de Wok 888 (1080 × 1920).

Pour chaque rubrique : une couverture ronde (pictogramme au centre) et les stories de la
carte, découpées automatiquement en pages. Les plats et les prix viennent de generer.py.

    python3 stories.py              # écrit stories.html
    node imprimer-stories.js        # écrit les images dans instagram/
"""
from html import escape
from pathlib import Path

import generer as g

ICI = Path(__file__).resolve().parent

# Pictogrammes des couvertures (traits, viewBox 0 0 120 120)
PICTOS = {
    "entrees": '<path d="M14 72Q60 14 106 72Q102 98 60 98Q18 98 14 72Z"/><path d="M40 47q6 8 0 15M60 40q6 9 0 17M80 47q6 8 0 15"/>'
               '<path d="M44 26q-6-7 0-14M60 22q-6-7 0-14M76 26q-6-7 0-14"/>',
    "wok": '<path d="M16 62H104Q102 100 60 102Q18 100 16 62Z"/><path d="M44 108H76"/><path d="M30 62q5-12 10 0q5-12 10 0q5-12 10 0q5-12 10 0"/>'
           '<path d="M66 14L100 56M80 10L108 50"/>',
    "japonais": '<circle cx="50" cy="70" r="32"/><circle cx="50" cy="70" r="19"/><circle cx="50" cy="70" r="7" class="plein"/>'
                '<path d="M64 12L112 74M76 8L118 62"/>',
    "menus": '<rect x="14" y="30" width="92" height="70" rx="10"/><path d="M60 30V100M60 64H106"/><circle cx="37" cy="65" r="13"/>'
             '<path d="M72 47h22M72 82q11-9 22 0"/><path d="M40 18H80"/>',
    "desserts": '<path d="M38 62L60 110L82 62"/><path d="M45 76L72 70M50 88L68 84"/><path d="M34 62A26 26 0 1 1 86 62Z"/>'
                '<circle cx="60" cy="26" r="7" class="plein"/><path d="M60 19q2-8 9-10"/>',
    "boissons": '<path d="M22 28H98L60 68Z"/><path d="M60 68V102M40 104H80"/><path d="M74 8L66 44"/><circle cx="94" cy="28" r="12"/>'
                '<path d="M94 16V40M82 28H106"/>',
}

ETOILE = ('<svg class="etoile-geante" viewBox="0 0 24 24"><path d="M12 2.6l2.9 6 6.5.8-4.8 4.5 1.3 6.5L12 17.2l-5.9 3.2 1.3-6.5L2.6 9.4l6.5-.8z"/></svg>')

SPECIALITES = g.rubrique("Nos spécialités", intro="Les plats préférés de la maison", plats=[
    pl for r in (g.TAPAS, g.SOUPES, g.POKE, g.PLATS, g.SUSHI) for pl in r["plats"] if pl.get("spe")])

# Une rubrique « à la une » : un dossier, un titre et ses blocs de carte
A_LA_UNE = [
    {"id": "01-wok-888", "couverture": "logo", "intro": True},
    {"id": "02-specialites", "couverture": "etoile", "titre": ("Nos", "Spécialités"), "blocs": [SPECIALITES]},
    {"id": "03-entrees", "couverture": "entrees", "titre": ("Nos", "Entrées"),
     "blocs": [g.GRILLADES, g.VAPEUR, g.SOUPES, g.TAPAS, g.ASSIETTES, g.SALADES]},
    {"id": "04-wok-poke-plats", "couverture": "wok", "titre": ("Wok, poké", "& plats"),
     "blocs": [g.WOK_BASE, g.WOK, g.POKE, g.PLATS, g.ACCOMPAGNEMENTS]},
    {"id": "05-japonais", "couverture": "japonais", "titre": ("Spécialités", "Japonaises"),
     "blocs": [g.SUSHI, g.MAKI, g.CHIRASHI, g.SASHIMI, g.CRUNCHI, g.SNOW, g.CALIFORNIA]},
    {"id": "06-menus", "couverture": "menus", "titre": ("Les", "Menus"),
     "blocs": [g.MENU_JOUR, g.MENU_MAKI, g.MENU_SUSHI, g.MENU_SASHIMI, g.MENU_DUO, g.MENU_ROYAL, g.MENU_ENFANT]},
    {"id": "07-desserts", "couverture": "desserts", "titre": ("Les", "Desserts"),
     "blocs": [g.DESSERTS, g.MOCHI, g.GLACES, g.DIGESTIFS_GLACES]},
    {"id": "08-boissons", "couverture": "boissons", "titre": ("Les", "Boissons"),
     "blocs": [g.SOFTS, g.EAUX, g.CHAUDES, g.APERITIFS, g.SPIRITUEUX, g.SAKE, g.COCKTAILS, g.SANS_ALCOOL,
               g.VINS_ROUGES, g.VINS_BLANCS, g.VINS_ROSES, g.BULLES, g.VIN_VERRE, g.BIERES_BOUTEILLE, g.BIERES_PRESSION]},
]

RUBRIQUES = ["Spécialités", "Entrées", "Wok & poké", "Plats", "Sushis", "Menus", "Desserts", "Boissons"]


def couverture(r):
    c = r["couverture"]
    if c == "logo":
        centre = '<img class="logo-couv" src="images/logo-symbole.png" alt="" /><img class="nom-couv" src="images/logo-nom.png" alt="" />'
    elif c == "etoile":
        centre = ETOILE
    else:
        centre = f'<svg class="picto" viewBox="0 0 120 120">{PICTOS[c]}</svg>'
    classe = "disque bordeaux" if c == "etoile" else "disque"
    return (f'<section class="story couverture" data-fichier="couvertures-a-la-une/{r["id"]}.png">'
            f'<div class="{classe}">{centre}</div></section>')


def marque():
    return '<div class="marque"><img src="images/logo-symbole.png" alt="" /><img src="images/logo-nom.png" alt="Wok 888" /></div>'


def stories(r):
    dossier = f'stories/{r["id"]}'
    if r.get("intro"):
        puces = "".join(f"<li>{escape(n)}</li>" for n in RUBRIQUES)
        return (f'<section class="story accueil" data-fichier="{dossier}/{r["id"]}-1.png"></section>'
                f'<section class="story bienvenue" data-fichier="{dossier}/{r["id"]}-2.png">{marque()}'
                '<p class="accroche">Saveurs d’Asie,<br>terre et mer</p>'
                '<p class="texte">Toute notre carte est dans les stories à la une :</p>'
                f'<ul class="rubriques">{puces}</ul>'
                '<p class="pied">Wok 888 · Moment à partager</p></section>')
    petit, grand = r["titre"]
    flux = "".join(g.bloc(b) for b in r["blocs"])
    # Une seule story modèle : imprimer-stories.js fait défiler le flux page par page.
    return (f'<section class="story carte" data-dossier="{dossier}" data-nom="{r["id"]}">{marque()}'
            f'<h2 class="grand"><small>{escape(petit)}</small>{escape(grand)}</h2>'
            f'<div class="fenetre"><div class="flux">{flux}</div></div>'
            '<div class="points"></div><p class="pied">Wok 888 · Moment à partager</p></section>')


def main():
    modele = (ICI / "stories-modele.html").read_text(encoding="utf-8")
    corps = "".join(couverture(r) + stories(r) for r in A_LA_UNE)
    (ICI / "stories.html").write_text(modele.replace("{{STORIES}}", corps), encoding="utf-8")
    print("stories.html écrit")


if __name__ == "__main__":
    main()
