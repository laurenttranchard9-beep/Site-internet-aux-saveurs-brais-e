#!/bin/bash
# Tourne le film de présentation du site WOK 888 (format vertical 1080 × 1920, pour Instagram) :
#   ./filmer.sh [fichier.mp4]
#   ./filmer.sh --images 9.6,19.4 --dossier images     (seulement les images de ces instants, pour vérifier)
# Nécessite PHP 8.1 ou plus (avec pdo_sqlite), Python 3, Node.js 18 ou plus avec Playwright (et son Chromium), ffmpeg.
set -euo pipefail
ICI=$(cd "$(dirname "$0")" && pwd)
DEPOT=$(dirname "$ICI")
if [ "${1:-}" = --images ]; then
    ARGUMENTS=("$@")
else
    ARGUMENTS=(--sortie "${1:-"$ICI/film-wok888.mp4"}")
fi
TMP=$(mktemp -d)
trap 'kill $(jobs -p) 2>/dev/null || true; rm -rf "$TMP"' EXIT

# Le site, avec une base neuve (la carte d'origine) le temps du tournage : rien n'est modifié ailleurs
ASB_DB_FILE="$TMP/carte.sqlite" php -S 127.0.0.1:8765 -t "$DEPOT/wok888" >"$TMP/site.log" 2>&1 &
# La composition (titres, téléphone) et les polices du site
python3 -m http.server 8766 --bind 127.0.0.1 --directory "$DEPOT" >"$TMP/composition.log" 2>&1 &
sleep 1
# Compte de l'espace de gestion de cette base temporaire (la fin du film montre la gestion de la carte)
curl -fsS -H 'Content-Type: application/json' -d '{"username":"patron","password":"motdepasse-wok888"}' \
    "http://127.0.0.1:8765/api.php?action=setup" >/dev/null

node "$ICI/film.js" "${ARGUMENTS[@]}"
