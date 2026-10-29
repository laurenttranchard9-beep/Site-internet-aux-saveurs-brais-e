#!/bin/bash
# Pose la musique sur le film muet, au volume conseillé pour Instagram (-14 LUFS, crêtes sous -1,5 dB) :
#   bash mixer.sh film-muet.mp4 musique.wav film.mp4
# Le volume est réglé en deux passes : mesure, puis correction linéaire (sans pompage).
set -euo pipefail
FILM=$1 MUSIQUE=$2 SORTIE=$3

mesure=$(ffmpeg -hide_banner -nostats -i "$MUSIQUE" -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
valeur() { echo "$mesure" | sed -n "s/.*\"$1\" : \"\([^\"]*\)\".*/\1/p"; }
NORME="loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$(valeur input_i):measured_TP=$(valeur input_tp)"
NORME+=":measured_LRA=$(valeur input_lra):measured_thresh=$(valeur input_thresh):offset=$(valeur target_offset):linear=true"

ffmpeg -loglevel error -y -i "$FILM" -i "$MUSIQUE" -map 0:v -map 1:a -c:v copy \
    -af "$NORME,aresample=48000" -c:a aac -b:a 192k -movflags +faststart -shortest "$SORTIE"
