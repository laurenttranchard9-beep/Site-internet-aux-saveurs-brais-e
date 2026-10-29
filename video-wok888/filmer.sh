#!/bin/bash
# Tourne le film de présentation du site WOK 888 (format vertical 1080 × 1920, pour Instagram), avec sa musique :
#   ./filmer.sh [fichier.mp4]
#   ./filmer.sh --images 9.6,19.4 --dossier images     (seulement les images de ces instants, pour vérifier)
# Nécessite PHP 8.1 ou plus (avec pdo_sqlite), Python 3, Node.js 18 ou plus avec Playwright (et son Chromium), ffmpeg.
# Au premier lancement, numpy et scipy (pour la musique) sont installés dans .outils/.
set -euo pipefail
ICI=$(cd "$(dirname "$0")" && pwd)
DEPOT=$(dirname "$ICI")
OUTILS="$ICI/.outils"
TMP=$(mktemp -d)
trap 'kill $(jobs -p) 2>/dev/null || true; rm -rf "$TMP"' EXIT

# Le site, avec une base neuve (la carte d'origine) le temps du tournage : rien n'est modifié ailleurs
ASB_DB_FILE="$TMP/carte.sqlite" php -S 127.0.0.1:8765 -t "$DEPOT/wok888" >"$TMP/site.log" 2>&1 &
# La composition (titres, téléphone) et les polices du site
python3 -m http.server 8766 --bind 127.0.0.1 --directory "$DEPOT" >"$TMP/composition.log" 2>&1 &
sleep 1

if [ "${1:-}" = --images ]; then
    node "$ICI/film.js" "$@"
    exit
fi
SORTIE=${1:-"$ICI/film-wok888.mp4"}

echo "Image (une dizaine de minutes)…"
node "$ICI/film.js" --sortie "$TMP/film-muet.mp4"

echo "Musique…"
if [ ! -x "$OUTILS/venv/bin/python" ] || ! "$OUTILS/venv/bin/python" -c "import numpy, scipy" 2>/dev/null; then
    python3 -m venv "$OUTILS/venv"
    "$OUTILS/venv/bin/pip" install -q numpy scipy
fi
node -p "JSON.stringify(require('$ICI/compo/scenario.js'))" > "$TMP/scenario.json"
"$OUTILS/venv/bin/python" "$ICI/audio/musique.py" "$TMP/scenario.json" "$TMP/musique.wav"
bash "$ICI/audio/mixer.sh" "$TMP/film-muet.mp4" "$TMP/musique.wav" "$SORTIE"
echo "Film : $SORTIE"
