"""Voix off du film : chaque phrase du scénario (compo/scenario.js, « voix ») est dite par la voix française
« Siwis » de Piper, puis placée à son instant sur une piste de la durée du film.

    python voix.py scenario.json modele.onnx voix.wav

Voix : jeu de données SIWIS (Université d'Édimbourg), licence CC-BY 4.0 ; modèle Piper fr_FR-siwis-medium.
"""
import json
import sys
import wave

import numpy as np
from piper import PiperVoice, SynthesisConfig
from scipy.signal import resample_poly

TAUX = 48000
PAUSE_PHRASES = 0.22  # silence entre deux phrases d'une même réplique (secondes)

scenario = json.load(open(sys.argv[1], encoding="utf-8"))
voix = PiperVoice.load(sys.argv[2])
# Un peu plus rapide que le débit de lecture par défaut, comme une voix publicitaire
reglages = SynthesisConfig(length_scale=0.92, noise_scale=0.6, noise_w_scale=0.7)

piste = np.zeros(int(scenario["duree"] * TAUX), dtype=np.float32)
repliques = scenario["voix"]
for i, r in enumerate(repliques):
    morceaux = []
    for phrase in voix.synthesize(r["texte"], syn_config=reglages):
        if morceaux:
            morceaux.append(np.zeros(int(PAUSE_PHRASES * phrase.sample_rate), dtype=np.float32))
        morceaux.append(phrase.audio_float_array)
        taux_voix = phrase.sample_rate
    son = resample_poly(np.concatenate(morceaux), TAUX, taux_voix).astype(np.float32)
    # Silences de début et de fin retirés : la phrase part exactement à son instant
    actif = np.flatnonzero(np.abs(son) > 0.01)
    son = son[max(0, actif[0] - 200): actif[-1] + 2400]
    debut = int(r["t"] * TAUX)
    fin_phrase = r["t"] + len(son) / TAUX
    suivant = repliques[i + 1]["t"] if i + 1 < len(repliques) else scenario["duree"]
    alerte = "  <- déborde sur la phrase suivante" if fin_phrase > suivant - 0.1 else ""
    print(f"{r['t']:6.2f} → {fin_phrase:6.2f} s  {r['texte']}{alerte}")
    piste[debut: debut + len(son)] += son[: len(piste) - debut]

piste *= 0.89 / max(1e-6, float(np.max(np.abs(piste))))  # crête à -1 dB
with wave.open(sys.argv[3], "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(TAUX)
    w.writeframes((piste * 32767).astype(np.int16).tobytes())
