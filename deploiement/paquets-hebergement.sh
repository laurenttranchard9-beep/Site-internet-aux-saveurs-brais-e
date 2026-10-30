#!/bin/bash
# Prépare les sites pour un hébergement web mutualisé (IONOS, OVH, o2switch…), sans serveur à administrer :
# un fichier ZIP par site, dont le contenu s'envoie tel quel dans le dossier du domaine (FileZilla, en SFTP).
#   bash deploiement/paquets-hebergement.sh [dossier de sortie] [sites…]
#   sites : restaurant (Aux Saveurs Braisées), wok888, cambodge — par défaut : restaurant et wok888
# Chaque paquet contient aussi verifier.php : à ouvrir une fois les fichiers envoyés (voir IONOS.md).
set -euo pipefail
DEPOT=$(cd "$(dirname "$0")/.." && pwd)
SORTIE=$(mkdir -p "${1:-$DEPOT/paquets}" && cd "${1:-$DEPOT/paquets}" && pwd)
shift || true
SITES=${*:-restaurant wok888}

nom_paquet() {
    case $1 in
        restaurant) echo aux-saveurs-braisees ;;
        cambodge) echo aux-saveurs-du-cambodge ;;
        *) echo "$1" ;;
    esac
}

for site in $SITES; do
    [ -d "$DEPOT/$site" ] || { echo "Erreur : site « $site » inconnu." >&2; exit 1; }
    tmp=$(mktemp -d)
    # Ni tests, ni documentation, ni base de données : la base se crée toute seule au premier passage
    rsync -a --exclude '/tests/' --exclude '/README.md' --exclude '/data/*.sqlite*' --exclude '/data/.gitignore' \
        --exclude '/data/reinitialiser.txt' "$DEPOT/$site/" "$tmp/site/"
    cp "$DEPOT/deploiement/verifier-hebergement.php" "$tmp/site/verifier.php"
    zip_=$SORTIE/$(nom_paquet "$site").zip
    rm -f "$zip_"
    (cd "$tmp/site" && zip -qr -X "$zip_" .)
    rm -rf "$tmp"
    echo "$zip_"
done
