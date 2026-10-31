#!/usr/bin/env bash
# Fabrique, pour chaque écran, le contenu de sa clé USB à partir des images de ecrans/ :
#   - <écran>-boucle.mp4 : une boucle de toutes ses diapos (fondu d'une seconde entre deux diapos),
#                          à lire en mode « répéter » sur la télévision
#   - images/*.jpg       : les diapos, pour le mode « diaporama photo » de la télévision
# Avec --10h, ajoute <écran>-10h.mp4 : la même boucle répétée pendant 10 heures, pour une télévision
# qui ne sait pas répéter une vidéo (environ 450 Mo par écran ; changements de diapo sans fondu, plus légers).
#   bash fabriquer-videos.sh [--10h]      (après node imprimer-diaporama.js)
set -euo pipefail
cd "$(dirname "$0")"

DUREE=20          # secondes par diapo
HEURES=10         # durée de la vidéo longue
SORTIE=cles-usb
LONGUE=$([[ "${1:-}" == "--10h" ]] && echo 1 || echo 0)
X264=(-c:v libx264 -profile:v high -level 4.1 -preset slow -tune stillimage -r 25 -movflags +faststart)

for dossier in ecrans/*/; do
  ecran=$(basename "$dossier")
  mapfile -t images < <(ls "$dossier"*.png | sort)
  n=${#images[@]}
  cle="$SORTIE/$ecran"
  rm -rf "$cle"; mkdir -p "$cle/images"

  # Images JPEG pour le mode diaporama photo
  for img in "${images[@]}"; do
    ffmpeg -loglevel error -y -i "$img" -q:v 2 "$cle/images/$(basename "${img%.png}").jpg"
  done

  # Boucle : chaque diapo DUREE s, fondu d'une seconde, et retour en fondu sur la première
  # pour que la répétition se fasse sans saut.
  entrees=(); filtre=""; precedent="0:v"; longueur=$DUREE
  for img in "${images[@]}"; do entrees+=(-loop 1 -framerate 25 -t "$DUREE" -i "$img"); done
  entrees+=(-loop 1 -framerate 25 -t 1 -i "${images[0]}")
  for ((i = 1; i <= n; i++)); do
    filtre+="[$precedent][$i:v]xfade=transition=fade:duration=1:offset=$((longueur - 1))[v$i];"
    precedent="v$i"
    if ((i < n)); then longueur=$((longueur + DUREE - 1)); fi
  done
  ffmpeg -loglevel error -y "${entrees[@]}" -filter_complex "$filtre[$precedent]format=yuv420p[s]" -map "[s]" \
    "${X264[@]}" -crf 20 -g 250 "$cle/$ecran-boucle.mp4"
  echo "$ecran : $n diapos, boucle de $(( n * DUREE - n + 1 )) s ($(du -h "$cle/$ecran-boucle.mp4" | cut -f1))"

  if ((LONGUE)); then
    # Boucle sans fondu (un fondu coûte 25 images complètes), recopiée bout à bout sans réencodage
    entrees=(); for img in "${images[@]}"; do entrees+=(-loop 1 -framerate 25 -t "$DUREE" -i "$img"); done
    flux=""; for ((i = 0; i < n; i++)); do flux+="[$i:v]"; done
    net=$(mktemp --suffix=.mp4); liste=$(mktemp)
    ffmpeg -loglevel error -y "${entrees[@]}" -filter_complex "${flux}concat=n=$n:v=1,format=yuv420p[s]" -map "[s]" \
      "${X264[@]}" -crf 22 -g 7500 "$net"
    for ((i = 0; i < (HEURES * 3600 + n * DUREE - 1) / (n * DUREE); i++)); do echo "file '$net'" >> "$liste"; done
    ffmpeg -loglevel error -y -f concat -safe 0 -i "$liste" -c copy -movflags +faststart "$cle/$ecran-${HEURES}h.mp4"
    rm -f "$net" "$liste"
    echo "   + $ecran-${HEURES}h.mp4 ($(du -h "$cle/$ecran-${HEURES}h.mp4" | cut -f1))"
  fi
done
