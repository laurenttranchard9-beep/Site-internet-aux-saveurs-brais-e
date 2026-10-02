#!/bin/bash
# Sauvegarde les données des sites, pour les garder ou pour déménager sur un autre serveur :
#   - Aux Saveurs Braisées : la base (carte, prix, stocks, compte, statistiques) ;
#   - La Fleur d'Or : la carte, ses sauvegardes et le mot de passe du panneau ;
#   - les certificats HTTPS (Let's Encrypt) de leurs domaines, pour que ceux-ci fonctionnent tout de suite
#     sur le nouveau serveur.
#
# Sur l'ANCIEN serveur, par exemple pour déménager seulement le restaurant :
#   curl -fsSL https://raw.githubusercontent.com/laurenttranchard9-beep/Site-internet-aux-saveurs-brais-e/claude/pet-grooming-landing-page-po26m7/deploiement/sauvegarder.sh | sudo bash -s -- restaurant ubuntu@ADRESSE-IP-DU-NOUVEAU-SERVEUR
#
# Sites : restaurant, fleur-dor, toilettage (sans précision : tous). Le fichier sauvegarde-sites.tar.gz est créé
# dans le dossier personnel, puis envoyé dans celui de l'utilisateur indiqué sur le nouveau serveur (son mot de passe
# est demandé). Sans destination, le fichier est seulement créé. Sur le nouveau serveur, installer.sh le trouve et le reprend.

# shellcheck disable=SC2016 # le code PHP entre apostrophes utilise ses propres variables ($argv)
set -euo pipefail

WEB=${WEB:-/var/www/html}
NOM=sauvegarde-sites.tar.gz
TOUS_LES_SITES="restaurant fleur-dor toilettage"
DEPOT_BRUT=https://raw.githubusercontent.com/laurenttranchard9-beep/Site-internet-aux-saveurs-brais-e/claude/pet-grooming-landing-page-po26m7

erreur() { echo "Erreur : $*" >&2; exit 1; }

# Domaines reliés au site par ajouter-domaine.sh (un fichier site-DOMAINE.conf par domaine).
domaines_du_site() { # site
    local f d
    for f in /etc/httpd/conf.d/site-*.conf /etc/apache2/sites-available/site-*.conf; do
        [ -f "$f" ] || continue
        if grep -q "DocumentRoot \"$WEB/$1\"" "$f"; then
            d=${f##*/site-}
            echo "${d%.conf}"
        fi
    done
}

# Certificat d'un domaine : fichiers, liens « live » et réglages de renouvellement.
copier_certificat() { # domaine, site, dossier de la sauvegarde
    local le=/etc/letsencrypt dst=$3/letsencrypt
    [ -d "$le/live/$1" ] && [ -d "$le/archive/$1" ] || return 1
    mkdir -p "$dst/live" "$dst/archive" "$dst/renewal"
    cp -a "$le/live/$1" "$dst/live/"
    cp -a "$le/archive/$1" "$dst/archive/"
    if [ -f "$le/renewal/$1.conf" ]; then cp -a "$le/renewal/$1.conf" "$dst/renewal/"; fi
    if [ -d "$le/accounts" ] && [ ! -d "$dst/accounts" ]; then cp -a "$le/accounts" "$dst/"; fi
    echo "$1 $2" >> "$dst/domaines.txt"
}

main() {
    [ "$(id -u)" -eq 0 ] || erreur "lancez ce script en administrateur (sudo)."
    local destination="" sites="" arg site domaine utilisateur=${SUDO_USER:-root} dossier tmp archive base
    for arg in "$@"; do
        if [[ " $TOUS_LES_SITES " == *" $arg "* ]]; then
            sites+="${sites:+ }$arg"
        elif [[ "$arg" == *@* ]]; then
            destination=$arg
        else
            erreur "« $arg » : indiquez les sites ($TOUS_LES_SITES) puis la destination, par exemple ubuntu@51.68.10.20."
        fi
    done
    sites=${sites:-$TOUS_LES_SITES}
    dossier=$(getent passwd "$utilisateur" | cut -d: -f6)
    archive="$dossier/$NOM"
    SAUVEGARDE_TMP=$(mktemp -d)
    tmp=$SAUVEGARDE_TMP
    trap 'rm -rf "${SAUVEGARDE_TMP:-}"' EXIT

    echo "==> 1/2 Sauvegarde ($sites)"
    # Copie cohérente de la base, même si quelqu'un modifie la carte au même moment.
    base=""
    if [[ " $sites " == *" restaurant "* ]]; then
        base=$(find "$WEB/restaurant/data" -maxdepth 1 -name 'restaurant-*.sqlite' 2>/dev/null | head -n 1)
    fi
    if [ -n "$base" ]; then
        mkdir -p "$tmp/restaurant/data"
        php -r '$p = new PDO("sqlite:" . $argv[1], null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
                $p->exec("VACUUM INTO " . $p->quote($argv[2]));' "$base" "$tmp/restaurant/data/$(basename "$base")"
        echo "   Aux Saveurs Braisées : base sauvegardée."
    elif [[ " $sites " == *" restaurant "* ]]; then
        echo "   Aux Saveurs Braisées : pas de base trouvée dans $WEB/restaurant/data."
    fi
    if [[ " $sites " == *" fleur-dor "* ]] && [ -f "$WEB/fleur-dor/donnees/carte.json" ]; then
        mkdir -p "$tmp/fleur-dor"
        cp -a "$WEB/fleur-dor/donnees" "$tmp/fleur-dor/donnees"
        echo "   La Fleur d'Or : carte et mot de passe sauvegardés."
    fi
    for site in $sites; do
        for domaine in $(domaines_du_site "$site"); do
            if copier_certificat "$domaine" "$site" "$tmp"; then
                echo "   Certificat HTTPS de $domaine ($site) sauvegardé."
            fi
        done
    done
    [ -n "$(ls -A "$tmp")" ] || erreur "rien à sauvegarder : les sites ne sont pas installés dans $WEB."

    # Le fichier contient les clés des certificats : lisible seulement par son propriétaire.
    (umask 077; tar czf "$archive" -C "$tmp" .)
    chown "$utilisateur:" "$archive"
    echo "   Fichier créé : $archive ($(du -h "$archive" | cut -f1))"

    echo "==> 2/2 Envoi vers le nouveau serveur"
    if [ -z "$destination" ]; then
        echo "   Pas de destination indiquée : le fichier reste ici."
        return
    fi
    [[ "$destination" == *@* ]] || erreur "destination à écrire sous la forme utilisateur@adresse-ip, par exemple ubuntu@51.68.10.20."
    echo "   Le mot de passe de $destination va être demandé (rien ne s'affiche pendant la saisie, c'est normal)."
    if scp -q -o StrictHostKeyChecking=accept-new "$archive" "$destination:$NOM" </dev/null; then
        echo
        echo "Terminé : $NOM est dans le dossier personnel de $destination."
        echo "Sur le nouveau serveur, lancez maintenant :"
        echo "   curl -fsSL $DEPOT_BRUT/deploiement/installer.sh | sudo bash -s -- $sites"
        echo "N'utilisez plus l'espace de gestion de l'ancien serveur : les modifications faites ici ne seraient pas transférées."
    else
        echo
        echo "L'envoi a échoué. Le fichier est ici : $archive"
        echo "Vous pouvez le copier en passant par votre ordinateur (voir deploiement/README.md, « Déménager sur un autre serveur »)."
        exit 1
    fi
}

[ "${INSTALLER_SANS_EXECUTION:-0}" = 1 ] || main "$@"
