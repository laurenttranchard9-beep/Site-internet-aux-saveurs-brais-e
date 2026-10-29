#!/bin/bash
# Mixe la voix et la musique, puis les pose sur le film muet :
#   bash mixer.sh film-muet.mp4 voix.wav musique.wav film.mp4
# Voix : nettoyée, compressée, au centre. Musique : creusée là où parle la voix (1,8 kHz) et baissée
# automatiquement pendant qu'elle parle. Volume final : -14 LUFS (niveau conseillé pour Instagram), en deux passes.
set -euo pipefail
FILM=$1 VOIX=$2 MUSIQUE=$3 SORTIE=$4
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

GRAPHE="[0:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=mono,highpass=f=90,equalizer=f=3000:t=q:w=1.2:g=2,"
GRAPHE+="acompressor=threshold=0.1:ratio=3:attack=4:release=90:makeup=2,pan=stereo|c0=c0|c1=c0,asplit=2[voix][cle];"
GRAPHE+="[1:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,equalizer=f=1800:t=o:w=1.5:g=-3,volume=0.42[mus];"
GRAPHE+="[mus][cle]sidechaincompress=threshold=0.05:ratio=5:attack=25:release=400[musb];"
GRAPHE+="[voix][musb]amix=inputs=2:duration=longest:normalize=0"
ffmpeg -loglevel error -y -i "$VOIX" -i "$MUSIQUE" -filter_complex "$GRAPHE" -c:a pcm_s24le "$TMP/premix.wav"

# Première passe : mesure ; seconde passe : correction linéaire vers -14 LUFS, crêtes sous -1,5 dB
mesure=$(ffmpeg -hide_banner -nostats -i "$TMP/premix.wav" -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
valeur() { echo "$mesure" | sed -n "s/.*\"$1\" : \"\([^\"]*\)\".*/\1/p"; }
NORME="loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$(valeur input_i):measured_TP=$(valeur input_tp)"
NORME+=":measured_LRA=$(valeur input_lra):measured_thresh=$(valeur input_thresh):offset=$(valeur target_offset):linear=true"

ffmpeg -loglevel error -y -i "$FILM" -i "$TMP/premix.wav" -map 0:v -map 1:a -c:v copy \
    -af "$NORME,aresample=48000" -c:a aac -b:a 192k -movflags +faststart -shortest "$SORTIE"
