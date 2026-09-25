#!/usr/bin/env python3
"""
Carte imprimée de La Fleur d'Or : A3 paysage, recto-verso, pli roulé en 3 volets.

Construit carte-a3-3-volets.html à partir du fichier donnees/carte.json du site
(dépôt Fleur-d-or), sans la fondue. Toute la carte est reprise : formules, cuisine
chinoise et thaïlandaise, bar à sushis, desserts et glaces, boissons.

    python3 generer.py chemin/vers/Fleur-d-or/donnees/carte.json

Puis ouvrir carte-a3-3-volets.html dans Chrome > Imprimer > Enregistrer au format PDF
(A3 paysage, marges « Aucune », « Graphiques d'arrière-plan » coché).
"""
import json
import sys
from html import escape
from pathlib import Path

ICI = Path(__file__).resolve().parent
EXCLURE = ("fondue",)  # plats et formules écartés de la carte imprimée


def e(s):
    return escape(str(s), quote=True)


def prix(p):
    return f"{p:.2f}".replace(".", ",")


PIMENT = ('<svg class="piment" viewBox="0 0 24 24" aria-label="pimenté"><path d="M15.6 7.4c2.9 1.4 3.1 5.3-.3 8.9-3 3.2-7.8 '
          '4.7-11.1 4.3 3.4-1.7 6.3-5.1 7.2-9 .7-2.9 2.2-4.8 4.2-4.2Z" fill="currentColor"/><path d="M15.4 7.6c.1-2.1 '
          '1.2-3.6 3.3-4.1M13.3 8.3c1.1-1.4 3-1.7 4.5-.8" fill="none" stroke="currentColor" stroke-width="1.8" '
          'stroke-linecap="round"/></svg>')


def exclu(nom):
    return any(mot in nom.lower() for mot in EXCLURE)


# ---------- Plats ----------

def ligne_plat(p):
    nom = e(p["nom"]) + (PIMENT if p.get("piment") else "")
    desc = f' <span class="desc">{e(p["desc"])}</span>' if p.get("desc") else ""
    formats = p.get("formats") or []
    if any(f.get("prix") is not None for f in formats):
        valeurs = "".join(
            f'<span class="cellule"><span class="fmt">{e(f["libelle"])}</span> {prix(f["prix"])}</span>'
            if f.get("prix") is not None else '<span class="cellule">&nbsp;</span>'
            for f in formats
        )
        droite = f'<span class="prix prix-multi">{valeurs}</span>'
    elif p.get("prix") is not None:
        droite = f'<span class="prix">{prix(p["prix"])}</span>'
    else:
        droite = ""
    return f'<div class="plat"><span class="nom">{nom}{desc}</span><span class="points"></span>{droite}</div>'


def liste_courte(plats):
    """Deux colonnes quand les noms sont courts et sans précision (sushi, maki, apéritifs…)."""
    return (len(plats) >= 2 and all(len(p["nom"]) <= 30 and not p.get("desc") and not p.get("formats") for p in plats))


def rendre_section(s, avec_titre=True):
    titre = e(s["titre"]) + (PIMENT if s.get("piment") else "")
    note = f'<span class="note">{e(s["note"])}</span>' if s.get("note") else ""
    corps = []
    for g in s["groupes"]:
        plats = [p for p in g["plats"] if not exclu(p["nom"])]
        if not plats:
            continue
        if g.get("titre"):
            corps.append(f'<h4>{e(g["titre"])}</h4>')
        if g.get("note"):
            corps.append(f'<p class="note-groupe">{e(g["note"])}</p>')
        classe = "plats deux" if liste_courte(plats) else "plats"
        corps.append(f'<div class="{classe}">' + "".join(ligne_plat(p) for p in plats) + "</div>")
    tete = f"<h3>{titre}{note}</h3>" if avec_titre else ""
    return f'<section class="section">{tete}{"".join(corps)}</section>'


def rendre_quartier(q, titre=None, sections=None):
    """Bandeau de brique puis ses sections ; une section seule qui porte le nom du bandeau perd son titre."""
    sections = q["sections"] if sections is None else [s for s in q["sections"] if s["id"] in sections]
    titre = titre or q["titre"]
    seule = len(sections) == 1 and sections[0]["titre"].lower() == titre.lower()
    return f'<h2 class="quartier">{e(titre)}</h2>' + "".join(rendre_section(s, not seule) for s in sections)


# ---------- Formules ----------

def rendre_service(sv):
    choix = [c for c in sv["choix"] if c]
    if sv["type"] == "choix":
        libelle, texte = f'{sv["titre"]} au choix', " · ".join(e(c) for c in choix)
    elif sv["type"] == "ensemble":
        libelle, texte = sv["titre"], ", ".join(e(c) for c in choix)
    else:
        libelle, texte = sv["titre"], " ".join(e(c) for c in choix)
    return f'<p class="service"><b>{e(libelle)}</b> {texte}</p>'


def rendre_formules(groupes):
    html = ['<h2 class="quartier">Nos formules</h2>']
    for g in groupes:
        menus = [m for m in g["menus"] if not exclu(m["nom"])]
        if not menus:
            continue
        html.append(f'<h3 class="formules-titre">{e(g["titre"])}</h3>')
        for m in menus:
            cond = f'<span class="condition">{e(m["condition"])}</span>' if m.get("condition") else ""
            services = "".join(rendre_service(sv) for sv in m.get("services") or [])
            texte = f'<p class="service">{e(m["texte"])}</p>' if m.get("texte") else ""
            html.append(
                f'<div class="formule"><div class="formule-tete"><span class="formule-nom">{e(m["nom"])}</span>{cond}'
                f'<span class="points"></span><span class="prix">{prix(m["prix"])} €</span></div>{services}{texte}</div>'
            )
    return "".join(html)


# ---------- Informations pratiques ----------

def main():
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else ICI / "carte.json"
    d = json.loads(source.read_text(encoding="utf-8"))
    quartiers = {q["id"]: q for q in d["quartiers"]}

    # Répartition des 5 volets de texte : intérieur = cuisine, sushis, desserts ; extérieur = formules, glaces, bar.
    douceurs = quartiers["douceurs"]
    interieur = (rendre_quartier(quartiers["cuisine"]) + rendre_quartier(quartiers["sushi"])
                 + rendre_quartier(douceurs, "Desserts", ["desserts"]))
    exterieur = (rendre_formules(d["formules"]) + rendre_quartier(douceurs, "Glaces", ["glaces"])
                 + rendre_quartier(quartiers["bar"]))

    modele = (ICI / "modele.html").read_text(encoding="utf-8")
    html = modele.replace("{{INTERIEUR}}", interieur).replace("{{EXTERIEUR}}", exterieur)
    (ICI / "carte-a3-3-volets.html").write_text(html, encoding="utf-8")

    n_plats = sum(len([p for g in s["groupes"] for p in g["plats"] if not exclu(p["nom"])])
                  for q in d["quartiers"] for s in q["sections"])
    n_formules = sum(len([m for m in g["menus"] if not exclu(m["nom"])]) for g in d["formules"])
    print(f"carte-a3-3-volets.html : {n_plats} plats et boissons, {n_formules} formules (sans la fondue).")


if __name__ == "__main__":
    main()
