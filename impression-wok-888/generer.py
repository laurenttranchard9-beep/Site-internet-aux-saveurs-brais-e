#!/usr/bin/env python3
"""
Carte imprimée de Wok 888 : A3 paysage, recto-verso, pli roulé en 3 volets.

Reprend toute la carte d'origine (8 pages) : entrées, wok, poké bowls, plats,
spécialités japonaises, menus, desserts, boissons, cocktails, vins et bières.

    python3 generer.py            # écrit carte-a3-3-volets.html
    node imprimer.js              # écrit carte-a3-3-volets.pdf

Pour changer un prix ou un plat, modifier les données ci-dessous puis relancer
les deux commandes. La mise en page (couleurs, polices, couverture) est dans modele.html.
"""
from html import escape
from pathlib import Path

ICI = Path(__file__).resolve().parent


# ---------- Outils de saisie ----------

def p(nom, prix="", desc="", qte=""):
    """Une ligne de la carte. prix est écrit tel qu'il doit s'afficher."""
    return {"nom": nom, "prix": prix, "desc": desc, "qte": qte}


def rubrique(titre, plats, note="", intro=""):
    return {"type": "rubrique", "titre": titre, "note": note, "intro": intro, "plats": plats}


def titre(petit, grand):
    return {"type": "titre", "petit": petit, "grand": grand}


def html(code):
    return {"type": "html", "code": code}


# ---------- Données : intérieur ----------

GRILLADES = rubrique("Grillades", note="1 pièce", plats=[
    p("Brochette de poulet", "6,90 €"),
    p("Brochette de bœuf", "7,30 €"),
    p("Brochette de crevettes", "7,90 €"),
    p("Brochette de canard", "7,90 €"),
    p("Brochette de champignon", "4,50 €"),
    p("Brochette de courgette", "4,50 €"),
    p("Brochette d’encornet", "7,00 €"),
    p("Brochette Saint-Jacques", "9,90 €"),
    p("Brochette duo", "11,00 €", "Saint-Jacques, crevettes"),
    p("Brochette saumon", "6,50 €"),
])

VAPEUR = rubrique("Spécialités vapeur", plats=[
    p("Bouchées de crevettes", "6,90 €", qte="5 pièces"),
    p("Bouchées de porc", "6,50 €", qte="5 pièces"),
    p("Ha kao aux crevettes", "6,90 €", qte="5 pièces"),
    p("Mélange vapeur", "7,90 €", "2 bouchées de crevettes, 2 bouchées de porc, 2 ha kao aux crevettes", "6 pièces"),
    p("Gyozas aux légumes", "7,50 €", qte="4 pièces"),
    p("Gyozas aux crevettes", "8,00 €", qte="4 pièces"),
    p("Gyozas au bœuf", "8,00 €", qte="4 pièces"),
])

SOUPES = rubrique("Soupes & potages", plats=[
    p("Potage pékinois au crabe", "8,90 €", "Chair de crabe, champignons noirs, pousses de bambou"),
    p("Potage pékinois au poulet", "8,90 €", "Blanc de poulet émincé, champignons noirs"),
    p("Soupe de raviolis", "9,90 €", "Raviolis aux crevettes, crevettes, chou chinois"),
    p("Soupe de nouilles aux fruits de mer", "9,90 €", "Nouilles, crevettes, encornets, champignons noirs, chou chinois"),
    p("Soupe miso", "4,50 €"),
    p("Soupe miso au crabe", "6,50 €"),
    p("Soupe miso aux crevettes", "6,90 €"),
])

TAPAS = rubrique("Tapas à partager", intro="Nems et samoussas faits maison", plats=[
    p("Rouleaux de printemps", "7,90 €", "Salade, vermicelles, crevettes, poulet", "2 pièces"),
    p("Nem porc", "5,90 €", qte="3 pièces"),
    p("Nem poulet", "5,90 €", qte="3 pièces"),
    p("Nem crevette", "5,90 €", qte="3 pièces"),
    p("Beignets de poulet", "6,00 €", qte="4 pièces"),
    p("Beignets de crevette", "6,00 €", qte="3 pièces"),
    p("Ebi tempura", "6,50 €", qte="3 pièces"),
    p("Samoussa bœuf", "6,50 €", qte="3 pièces"),
    p("Millefeuille aux Saint-Jacques", "9,90 €", qte="1 pièce"),
    p("Feuille de riz croustillante", "7,90 €", "Guacamole et crevettes", "1 pièce"),
    p("Riz frit au saumon, thon et chair de crabe", "7,90 €"),
    p("Porc croustillant", "7,00 €", qte="4 pièces"),
    p("Tataki saumon", "7,00 €", qte="4 pièces"),
    p("Tataki thon", "7,00 €", qte="4 pièces"),
    p("Tataki mixte", "8,00 €", "Saumon, thon", "4 pièces"),
    p("Carpaccio saumon", "7,00 €"),
    p("Carpaccio thon", "7,50 €"),
    p("Carpaccio mixte", "8,00 €", "Saumon, thon"),
])

ASSIETTE = "Nems au porc, nems au poulet, beignets de crevettes, samoussa bœuf, brochettes de champignons, de courgettes et de poulet"
ASSIETTES = rubrique("Assiettes à partager", plats=[
    p("Assiette composée pour 1 personne", "12,50 €", ASSIETTE + " (7 pièces)"),
    p("Assiette à partager pour 2 personnes", "24,00 €", ASSIETTE + " (14 pièces)"),
])

SALADES = rubrique("Salades", plats=[
    p("Bò bún nem au porc", "12,00 €", "Nem maison, lamelles de porc sautées, oignons, choux, pousses de soja, carottes, salade"),
    p("Bò bún nem au poulet", "12,00 €", "Nem maison, lamelles de poulet sautées, oignons, choux, pousses de soja, carottes, salade"),
    p("Bò bún nem aux crevettes", "12,00 €", "Nem maison, crevettes sautées, oignons, choux, pousses de soja, carottes, salade"),
    p("Grande salade exotique", "15,00 €", "Crabe, surimi, crevettes, choux, carottes, salade et fruits"),
    p("Grande salade chinoise", "9,00 €", "Choux, carottes, salade"),
    p("Grande salade fruits de mer", "17,00 €", "Choux, encornets, crevettes, Saint-Jacques, carottes, salade"),
    p("Salade de choux", "4,50 €"),
    p("Salade de choux aux crevettes", "7,50 €"),
    p("Salade de poulet", "10,00 €"),
])

LEGUMES = "Oignons, brocolis, chou-fleur, courgettes, carottes"
WOK_BASE = rubrique("Choisissez votre base", intro="Légumes inclus : " + LEGUMES.lower(), plats=[
    p("Nouilles ou udon", desc="À base de blé, de riz ou de fécule de pommes de terre"),
    p("Riz nature"),
    p("Riz sauté aux crevettes et surimi", "+ 1,50 €", "Champignons de Paris, céleri, surimi, crevettes"),
])
WOK = rubrique("Wok", note="Supplément œuf bio + 2,50 €", plats=[
    p("Poulet", "15,90 €"),
    p("Crevettes", "17,90 €"),
    p("Porc", "15,90 €"),
    p("Bœuf", "16,90 €"),
    p("Canard", "17,90 €"),
    p("Lak lak", "17,50 €"),
])

POKE = rubrique("Poké bowl", intro="Riz vinaigré, brocolis, chou-fleur, avocat, concombre, mayonnaise maison et sauce noire", plats=[
    p("Poké bowl crevettes", "17,90 €"),
    p("Poké bowl saumon", "16,90 €", "Chair de crabe, champignons noirs, pousses de bambou"),
    p("Poké bowl thon", "16,90 €", qte="5 pièces"),
    p("Poké bowl mixte", "17,90 €", qte="5 pièces"),
    p("Poké bowl poulet", "16,90 €"),
    p("Poké bowl poulet frit", "17,90 €"),
])

LEG_PLATS = "oignons, brocolis, chou-fleur, courgettes, carottes, poivrons"
PLATS = rubrique("Spécialités", intro="Servies sans accompagnement", plats=[
    p("Poulet frit sauce piquante", "14,90 €", "Cuisses de poulet désossées et panées"),
    p("Poulet frit au curry", "14,90 €", "Cuisses de poulet désossées et panées"),
    p("Porc croustillant à l’aigre-douce", "14,90 €", f"Porc mariné, {LEG_PLATS}, ananas"),
    p("Porc frit au curry", "14,90 €", "Porc mariné et pané"),
    p("Porc frit sauce piquante", "14,90 €", "Porc mariné et pané"),
    p("Porc au caramel", "14,90 €", "Porc mijoté"),
    p("Canard laqué", "15,50 €", f"Magret mariné, {LEG_PLATS}, pousses de soja"),
    p("Poulet au basilic", "14,50 €", f"Poulet mariné au basilic thaï, {LEG_PLATS}, ananas"),
    p("Poulet frit à l’aigre-douce", "14,50 €", f"Cuisses de poulet désossées et panées, {LEG_PLATS}, ananas"),
    p("Poulet à l’ananas", "13,50 €", f"Blanc de poulet, {LEG_PLATS}, ananas"),
    p("Fruits de mer à la plancha", "17,00 €", "Encornets, crevettes, moules, Saint-Jacques, oignons"),
    p("Canard grillé sur plaque chauffante au saté", "16,00 €", f"Magret, {LEG_PLATS}, ananas"),
    p("Bœuf grillé sur plaque chauffante au saté", "16,00 €", f"Bœuf, {LEG_PLATS}, ananas"),
    p("Bœuf au curry", "15,00 €", f"Bœuf, {LEG_PLATS}, ananas"),
    p("Bœuf piquant", "15,00 €", f"Bœuf, {LEG_PLATS}, ananas"),
])

ACCOMPAGNEMENTS = rubrique("Accompagnements", plats=[
    p("Riz nature", "3,90 €"),
    p("Riz sauté aux crevettes et surimi", "6,90 €", "Champignons de Paris, céleri, surimi, crevettes"),
    p("Riz sauté épicé", "7,90 €", "Piment, champignons de Paris, céleri, surimi, crevettes"),
    p("Riz vinaigré", "4,00 €"),
    p("Sauté de légumes", "6,90 €", LEGUMES),
    p("Nouilles sautées, canard au saké", "17,50 €"),
    p("Nouilles légumes", "7,50 €"),
])

SUSHI = rubrique("Sushi", note="2 pièces", plats=[
    p("Sushi saumon", "5,80 €"),
    p("Sushi thon", "5,80 €"),
    p("Sushi poulet", "5,80 €"),
    p("Sushi avocat", "5,80 €"),
    p("Sushi saumon-avocat", "7,00 €"),
    p("Sushi saumon-cheese", "7,00 €"),
    p("Sushi Hana", "8,00 €", "Saumon, thon, chair de crabe, crevettes, avocat"),
])
MAKI = rubrique("Maki", note="3 pièces", plats=[
    p("Maki saumon", "4,30 €"),
    p("Maki thon", "4,30 €"),
    p("Maki thon mayonnaise", "4,30 €"),
    p("Maki concombre", "4,30 €"),
    p("Maki concombre cheese", "4,30 €"),
    p("Maki avocat", "4,30 €"),
    p("Maki avocat cheese", "5,20 €"),
    p("Maki crevette", "4,50 €"),
    p("Maki EBI tempura", "5,90 €"),
])
CHIRASHI = rubrique("Chirashi", plats=[
    p("Chirashi saumon-avocat", "16,90 €"),
    p("Chirashi thon-avocat", "17,90 €"),
    p("Chirashi mixte", "18,90 €"),
])
SASHIMI = rubrique("Sashimi", note="3 pièces", plats=[
    p("Sashimi saumon", "5,90 €"),
    p("Sashimi thon", "5,90 €"),
    p("Sashimi mixte", "6,10 €"),
    p("Sashimi dorade", "5,90 €"),
])
CRUNCHI = rubrique("Spécialités crunchi", intro="Base : concombre, avocat, oignons frits", plats=[
    p("Crunchi saumon", "5,50 €"),
    p("Crunchi thon", "5,50 €"),
    p("Crunchi EBI tempura", "5,50 €"),
    p("Crunchi saumon frit", "5,50 €"),
    p("Crunchi poulet", "5,50 €"),
    p("Crunchi surimi", "5,50 €"),
    p("Crunchi avocat, oignons frits", "5,50 €"),
    p("Crunchi concombre, oignons frits", "5,50 €"),
    p("Crunchi avocat, concombre, oignons frits", "5,50 €"),
])
SNOW = rubrique("Snow rolls", note="3 pièces", intro="Sans feuille d’algue", plats=[
    p("Snow rolls avocat-cheese", "5,50 €"),
    p("Snow rolls saumon-avocat-cheese", "6,00 €"),
])
CALIFORNIA = rubrique("California", note="3 pièces", plats=[
    p("California avocat poulet", "5,00 €"),
    p("California avocat saumon", "5,00 €"),
    p("California avocat thon", "5,00 €"),
    p("California avocat surimi", "5,00 €"),
    p("California avocat surimi-cheese", "5,90 €"),
    p("California avocat saumon-cheese", "5,90 €"),
    p("California avocat EBI tempura", "5,90 €"),
    p("California avocat thon frit", "5,90 €"),
    p("California avocat saumon frit", "6,00 €"),
    p("California avocat foie gras", "7,50 €"),
    p("California foie gras", "6,90 €"),
    p("California avocat thon & foie gras", "6,90 €"),
    p("California roll frit saumon", "6,10 €"),
    p("California roll frit thon", "6,00 €"),
    p("California roll frit poulet", "6,00 €"),
])


# ---------- Données : extérieur ----------

MISO = "Soupe miso + salade de choux"


def menu(nom, prix, compte, lignes, vedette=False, corps=""):
    """Formule présentée en encadré. lignes = [(libellé, quantité)] ; la soupe miso
    et la salade de choux, servies avec chaque menu, s'affichent à part en tête."""
    inclus = [l for l, q in lignes if l == MISO]
    return {"type": "formule", "nom": nom, "prix": prix, "sous": compte, "vedette": vedette, "corps": corps,
            "inclus": inclus[0] if inclus else "", "lignes": [(l, q) for l, q in lignes if l != MISO]}


MENU_JOUR = menu("Menu du jour", "", "Uniquement le midi, sauf les jours fériés et les week-ends", [], corps=(
    '<div class="tuiles">'
    '<div><span>Entrée<br>+ plat</span><b>17,00 €</b></div>'
    '<div><span>Plat<br>+ dessert</span><b>17,00 €</b></div>'
    '<div><span>Entrée + plat<br>+ dessert</span><b>19,00 €</b></div>'
    '</div>'
    '<div class="express"><div class="ligne"><span class="nom">Assiette express</span><span class="pts"></span>'
    '<span class="prix">15,00 €</span></div>'
    '<p class="desc">Nem poulet, nem porc, brochettes poulet, courgette et champignon, riz nature</p></div>'))
MENU_MAKI = menu("Menu Maki", "25,90 €", "24 pièces", [
    (MISO, ""), ("Maki avocat", "6 pièces"), ("Maki concombre", "6 pièces"),
    ("California avocat surimi", "6 pièces"), ("California avocat saumon", "6 pièces"),
])
MENU_SUSHI = menu("Menu Sushi", "23,90 €", "11 pièces", [
    (MISO, ""), ("Sushi saumon", "3 pièces"), ("Sushi thon", "3 pièces"),
    ("Sushi daurade", "3 pièces"), ("Sushi du moment", "2 pièces"),
])
MENU_SASHIMI = menu("Menu Sashimi", "28,00 €", "21 pièces", [
    (MISO, ""), ("Sashimi saumon", "7 pièces"), ("Sashimi thon", "7 pièces"),
    ("Sashimi daurade", "7 pièces"), ("Riz nature", ""),
])
MENU_DUO = menu("Menu Duo", "30,00 €", "18 pièces", [
    (MISO, ""), ("Maki avocat", "3 pièces"), ("California avocat saumon", "3 pièces"),
    ("Sushi saumon", "2 pièces"), ("Sushi thon", "2 pièces"), ("Sushi daurade", "2 pièces"),
    ("Sushi du moment", "2 pièces"), ("Sashimi saumon, thon, daurade", "1 pièce de chaque"),
    ("Brochettes de poulet", "1 pièce"), ("Brochettes de champignons", "1 pièce"),
    ("Brochettes de courgettes", "1 pièce"), ("Riz nature", ""),
])
MENU_ROYAL = menu("Menu Royal 888", "60,00 €", "Pour 2 personnes (42 pièces)", [
    (MISO, ""), ("California avocat saumon", "6 pièces"), ("California EBI tempura", "6 pièces"),
    ("Maki avocat", "6 pièces"), ("Maki concombre", "6 pièces"), ("Sashimi saumon", "4 pièces"),
    ("Sashimi thon", "4 pièces"), ("Sashimi daurade", "4 pièces"), ("Brochettes de poulet", "2 pièces"),
    ("Brochettes de champignons", "2 pièces"), ("Brochettes de courgettes", "2 pièces"),
    ("Riz nature", "2 pièces"), ("Ananas ou coupe de fruits frais", ""),
], vedette=True)
MENU_ENFANT = menu("Menu enfant", "10,00 €", "Un plat, un dessert et une boisson", [], corps=(
    '<div class="enfant">'
    '<span>Saumon grillé, riz ou nouilles</span><em>ou</em><span>Brochettes de poulet, riz</span>'
    '<span>Salade de fruits</span><em>ou</em><span>Glace</span>'
    '<span class="trio"><span>Sirop</span><em>ou</em><span>Jus</span><em>ou</em><span>Soda</span></span>'
    '</div>'))

DESSERTS = rubrique("Desserts", plats=[
    p("Tapioca banane", "7,90 €"),
    p("Tapioca mangue", "7,90 €"),
    p("Nougatine", "6,90 €", "Mou, dur et gingembre"),
    p("Ananas frais", "6,90 €"),
    p("Mangue fraîche", "7,90 €"),
    p("Beignet", "6,90 €", "Aux pommes, banane ou ananas · flambé + 1,50 €"),
    p("Assortiment de beignets", "7,90 €"),
    p("Perles de coco", "6,90 €"),
    p("Café gourmand", "9,90 €"),
    p("Champagne gourmand", "11,00 €"),
    p("Salade de fruits frais", "6,90 €"),
    p("Banane grillée avec glace vanille", "7,90 €", "Nappe de caramel avec une boule de glace vanille"),
    p("Fondant au chocolat", "8,00 €"),
])
MOCHI = rubrique("Mochi", note="7,90 €", intro="3 pièces · vanille, mangue, coco ou chocolat", plats=[])
GLACES = rubrique("Glaces", intro="Vanille, chocolat, fraise, citron, mangue, framboise", plats=[
    p("1 boule", "3,50 €"),
    p("2 boules", "6,50 €"),
    p("3 boules", "7,50 €"),
])
DIGESTIFS_GLACES = rubrique("Spécialités glacées", plats=[
    p("Colonel chinois", "8,00 €", qte="saké"),
    p("Colonel normand", "8,00 €", qte="vodka"),
])

SOFTS = rubrique("Jus & softs", plats=[
    p("Coca-Cola, Coca-Cola Zéro", "4,00 €", qte="33 cl"),
    p("Orangina", "4,00 €", qte="25 cl"),
    p("Ice Tea", "4,00 €"),
    p("Limonade japonaise", "4,10 €"),
    p("Jus de fruits Pago", "3,90 €", "Orange, ananas, pomme, abricot, mangue"),
    p("Sirop à l’eau", "2,00 €"),
])
EAUX = rubrique("Eaux plates et pétillantes", plats=[
    p("Évian", "3,90 €", qte="50 cl"),
    p("Évian", "5,90 €", qte="100 cl"),
    p("Perrier", "3,90 €", qte="33 cl"),
    p("San Pellegrino", "3,90 €", qte="50 cl"),
    p("San Pellegrino", "5,90 €", qte="100 cl"),
])
CHAUDES = rubrique("Boissons chaudes", plats=[
    p("Café Richard", "2,50 €"),
    p("Thé Richard", "2,90 €"),
    p("Café noisette", "3,00 €"),
])
APERITIFS = rubrique("Apéritifs", plats=[
    p("Martini blanc", "4,90 €", qte="5 cl"),
    p("Martini rouge", "4,90 €", qte="5 cl"),
    p("Ricard", "4,90 €", qte="4 cl"),
    p("Jet 27", "8,00 €"),
    p("Kir", "4,90 €", qte="10 cl"),
    p("Kir royal", "8,00 €", qte="10 cl"),
    p("Porto", "4,90 €", qte="5 cl"),
    p("Cocktail 888", "8,00 €", qte="15 cl"),
    p("Coupe de champagne", "8,00 €", qte="10 cl"),
    p("Mei Kweilu", "4,90 €", "Alcool de riz à la rose", "5 cl"),
])
SPIRITUEUX = rubrique("Spiritueux", note="Supplément soft + 1,50 €", intro="4 cl", plats=[
    p("Whisky J&B", "5,90 €"),
    p("Jack Daniel’s", "9,00 €"),
    p("Whisky japonais Nikka", "10,00 €"),
    p("Rhum blanc Havana", "8,00 €"),
    p("Rhum ambré Havana", "8,00 €"),
    p("Diplomático", "9,00 €"),
    p("Don Papa", "8,00 €"),
    p("Gin", "9,00 €"),
    p("Armagnac", "7,00 €"),
    p("Cognac Hennessy", "9,00 €"),
])
SAKE = rubrique("Saké", plats=[p("Saké japonais", "6,90 €", "16°, chaud ou froid")])

COCKTAILS = rubrique("Avec alcool", note="8,00 €", plats=[
    p("Mojito", desc="Rhum blanc, menthe fraîche, citron vert, sucre de canne, eau gazeuse"),
    p("Piña colada", desc="Rhum blanc, rhum ambré, lait de coco, jus d’ananas"),
    p("Pornstar Martini", desc="Vodka infusée à la vanille, liqueur de fruit de la passion, jus de maracuja, jus de citron, 1 shot de prosecco"),
    p("Apéro Spritz", desc="Prosecco, Aperol, eau gazeuse"),
    p("Bellini", desc="Prosecco, nectar de mangue"),
    p("Angkor red", desc="Vodka, jus de goyave, sirop de fraise, jus de citron, eau gazeuse"),
    p("Cosmopolitan", desc="Vodka, Cointreau, jus de cranberry, jus de citron"),
])
SANS_ALCOOL = rubrique("Sans alcool", note="6,50 €", plats=[
    p("Virgin Mojito", desc="Menthe fraîche, citron vert, sucre de canne, eau gazeuse"),
    p("Cocktail du moment", desc="Demandez à notre équipe la création du jour"),
])

VINS_ROUGES = rubrique("Vins rouges", note="75 cl", plats=[
    p("Côtes-du-Rhône, cuvée Perrin", "25,00 €", qte="2022"),
    p("Pays d’Oc bio, Chemin de Moscou", "25,00 €", qte="2021"),
    p("Fronton Bodego", "20,00 €", qte="2022"),
    p("Corbières", "20,00 €", qte="2023"),
    p("Pic Saint-Loup", "31,00 €"),
])
VINS_BLANCS = rubrique("Vins blancs", note="75 cl", plats=[
    p("Côtes de Gascogne, domaine de Pé-Jéhout", "20,00 €", qte="2023 · moelleux"),
    p("Beauvignac, Picpoul de Pinet", "20,00 €", qte="2022 · sec"),
    p("Pays d’Oc, domaine de Fontiès, chardonnay", "20,00 €", qte="2023 · sec"),
])
VINS_ROSES = rubrique("Vin rosé", note="75 cl", plats=[
    p("Côtes de Provence, Murmure de Goa", "21,00 €", qte="2023 · bio"),
])
BULLES = rubrique("Pétillant & champagne", note="75 cl", plats=[
    p("Prosecco", "20,00 €", qte="pétillant italien"),
    p("Jeeper Champagne blanc de blancs", "100,00 €", qte="grande réserve"),
])
VIN_VERRE = rubrique("Vin au verre", note="12,5 cl", plats=[
    p("Labastide", "3,90 €", qte="rouge, blanc ou rosé"),
])

BIERES_BOUTEILLE = rubrique("En bouteille", plats=[
    p("Tsingtao", "4,70 €", qte="Chine"),
    p("Singha", "4,70 €", qte="Thaïlande"),
    p("Asahi", "4,70 €", qte="Japon"),
    p("Kirin", "5,60 €", qte="Japon"),
    p("IKI", "5,60 €", qte="Japon"),
])
BIERES_PRESSION = rubrique("À la pression", intro="Heineken, Affligem ou bière du moment", plats=[
    p("25 cl", "3,90 €"),
    p("50 cl", "7,50 €"),
])


# ---------- Volets ----------
# Chaque volet : un titre facultatif sur toute la largeur, puis deux colonnes.
# « taille » est la taille du texte en points : tout le volet (titres, marges) suit.

INTERIEUR = [
    {"titre": titre("Nos", "Entrées"),
     "colonnes": [[GRILLADES, VAPEUR, SOUPES], [TAPAS, ASSIETTES, SALADES]], "taille": 8.6},
    {"colonnes": [[titre("Côté", "Wok"), WOK_BASE, WOK, titre("", "Poké bowl"), POKE, ACCOMPAGNEMENTS],
                  [titre("Nos", "Plats"), PLATS]], "taille": 8.6},
    {"titre": titre("Spécialités", "Japonaises"),
     "colonnes": [[SUSHI, MAKI, CHIRASHI, SASHIMI], [CRUNCHI, SNOW, CALIFORNIA]], "taille": 8.6},
]

EXTERIEUR = [
    {"colonnes": [[titre("Les", "Menus"), MENU_JOUR, MENU_MAKI, MENU_SUSHI, MENU_SASHIMI, MENU_DUO],
                  [MENU_ROYAL, MENU_ENFANT, titre("Les", "Desserts"), DESSERTS, MOCHI, GLACES, DIGESTIFS_GLACES]],
     "taille": 7.8},
    {"colonnes": [[titre("Les", "Boissons"), SOFTS, EAUX, CHAUDES, APERITIFS, SPIRITUEUX,
                   titre("Les", "Bières"), BIERES_BOUTEILLE, BIERES_PRESSION],
                  [titre("Les", "Cocktails"), COCKTAILS, SANS_ALCOOL,
                   titre("Les", "Vins"), VINS_ROUGES, VINS_BLANCS, VINS_ROSES, BULLES, VIN_VERRE, SAKE]],
     "taille": 7.6},
]


# ---------- Rendu ----------

def e(s):
    return escape(str(s), quote=True)


def ligne(pl):
    qte = f' <em class="qte">{e(pl["qte"])}</em>' if pl["qte"] else ""
    desc = f'<p class="desc">{e(pl["desc"])}</p>' if pl["desc"] else ""
    pts = '<span class="pts"></span>' if pl["prix"] or not pl["desc"] else ""
    return (f'<div class="plat"><div class="ligne"><span class="nom">{e(pl["nom"])}{qte}</span>{pts}'
            f'<span class="prix">{e(pl["prix"])}</span></div>{desc}</div>')


def bloc(b):
    if b["type"] == "titre":
        petit = f"<small>{e(b['petit'])}</small>" if b["petit"] else ""
        return f'<h2 class="grand">{petit}{e(b["grand"])}</h2>'
    if b["type"] == "html":
        return b["code"]
    if b["type"] == "formule":
        prix = f'<b class="tarif">{e(b["prix"])}</b>' if b["prix"] else ""
        sous = f'<p class="sous">{e(b["sous"])}</p>' if b["sous"] else ""
        inclus = f'<p class="inclus">{e(b["inclus"])}</p>' if b["inclus"] else ""
        lignes = "".join(f'<li><span>{e(l)}</span><em>{e(q)}</em></li>' for l, q in b["lignes"])
        liste = f"<ul>{lignes}</ul>" if lignes else ""
        classe = "formule vedette" if b["vedette"] else "formule"
        return (f'<section class="{classe}"><header><h3>{e(b["nom"])}</h3>{prix}</header>'
                f'<div class="corps">{sous}{inclus}{liste}{b["corps"]}</div></section>')
    note = f'<b>{e(b["note"])}</b>' if b["note"] else ""
    intro = f'<p class="intro">{e(b["intro"])}</p>' if b["intro"] else ""
    return (f'<section class="rubrique"><h3><span>{e(b["titre"])}</span><i></i>{note}</h3>{intro}'
            + "".join(ligne(pl) for pl in b["plats"]) + "</section>")


def volet(v, gauche, largeur):
    tete = bloc(v["titre"]) if v.get("titre") else ""
    colonnes = "".join('<div class="colonne">' + "".join(bloc(b) for b in c) + "</div>" for c in v["colonnes"])
    return (f'<div class="volet" style="left:{gauche}mm;width:{largeur}mm;font-size:{v["taille"]}pt">{tete}'
            f'<div class="colonnes">{colonnes}</div></div>')


def main():
    modele = (ICI / "modele.html").read_text(encoding="utf-8")
    # Extérieur : rabat 138 mm, dos 141 mm (la couverture occupe 279 → 420 mm).
    exterieur = volet(EXTERIEUR[0], 0, 138) + volet(EXTERIEUR[1], 138, 141)
    # Intérieur : 141 + 141 + 138 mm (le dernier volet est le revers du rabat).
    interieur = volet(INTERIEUR[0], 0, 141) + volet(INTERIEUR[1], 141, 141) + volet(INTERIEUR[2], 282, 138)
    sortie = modele.replace("{{EXTERIEUR}}", exterieur).replace("{{INTERIEUR}}", interieur)
    (ICI / "carte-a3-3-volets.html").write_text(sortie, encoding="utf-8")
    print("carte-a3-3-volets.html écrit")


if __name__ == "__main__":
    main()
