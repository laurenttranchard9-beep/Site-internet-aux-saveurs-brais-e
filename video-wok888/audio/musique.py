"""Musique de fond du film, composée et synthétisée ici (aucun échantillon extérieur, donc aucun droit à payer) :
cordes pincées façon koto en gamme pentatonique de ré majeur, nappes, basse, batterie légère et gong final.
L'introduction accompagne le logo, le rythme part avec le téléphone (« depart ») et s'arrête sur un coup de gong
à l'écran de fin (« arret »), puis l'accord final s'éteint.

    python musique.py scenario.json musique.wav
"""
import json
import sys
import wave

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

TAUX = 48000
scenario = json.load(open(sys.argv[1], encoding="utf-8"))
M = scenario["musique"]
DUREE = scenario["duree"]
DEPART, ARRET = M["depart"], M["arret"]
# Tempo ajusté pour que le coup final tombe exactement sur un temps fort (mesures de 4 temps)
mesures = max(1, round((ARRET - DEPART) / (4 * 60 / M["bpm"])))
TEMPS = (ARRET - DEPART) / (4 * mesures)
rng = np.random.default_rng(888)

N = int((DUREE + 1) * TAUX)
pistes = {nom: np.zeros((N, 2)) for nom in ["pince", "melodie", "nappe", "basse", "kick", "clap", "charleston", "effets"]}


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def poser(piste, t, son, gauche=1.0, droite=1.0):
    i = int(t * TAUX)
    if i >= N or i + len(son) <= 0:
        return
    if i < 0:
        son, i = son[-i:], 0
    son = son[: N - i].copy()
    k = min(len(son), int(0.02 * TAUX))
    son[len(son) - k:] *= np.linspace(1, 0, k)  # fin fondue : jamais de clic quand un son s'arrête
    pistes[piste][i: i + len(son), 0] += son * gauche
    pistes[piste][i: i + len(son), 1] += son * droite


def panoramique(p):  # -1 gauche … 1 droite, à puissance constante
    a = (p + 1) * np.pi / 4
    return np.cos(a), np.sin(a)


def filtre(son, type_, f):
    return sosfilt(butter(2, f, btype=type_, fs=TAUX, output="sos"), son)


# ---------- Instruments ----------

def pince(midi, vel=1.0, duree=1.6, eclat=0.22):
    """Corde pincée (koto) : partiels qui s'éteignent d'autant plus vite qu'ils sont aigus, léger glissé d'attaque."""
    f0 = hz(midi)
    t = np.arange(int(duree * TAUX)) / TAUX
    glisse = 1 + 0.006 * np.exp(-t / 0.04)
    phase = 2 * np.pi * f0 * np.cumsum(glisse) / TAUX
    tau1 = 0.9 * (440 / f0) ** 0.35
    son = np.zeros_like(t)
    for k in range(1, 13):
        if k * f0 > 12000:
            break
        a = abs(np.sin(np.pi * k * eclat)) / k ** 1.1
        inh = np.sqrt(1 + 0.00012 * k * k)
        son += a * np.sin(k * inh * phase + rng.uniform(0, 2 * np.pi)) * np.exp(-t / (tau1 / (1 + 0.55 * (k - 1))))
    attaque = filtre(rng.standard_normal(len(t)) * np.exp(-t / 0.006), "bandpass", [1800, 5200]) * 0.15
    son = (son + attaque) * np.minimum(1, t / 0.002)
    son *= np.minimum(1, (duree - t) / 0.08)  # pas de clic à la coupure
    return vel * son / 2.2


def cloche(midi, vel=1.0, duree=2.5):
    f0 = hz(midi)
    t = np.arange(int(duree * TAUX)) / TAUX
    son = sum(a * np.sin(2 * np.pi * f0 * r * t) * np.exp(-t / d)
              for r, a, d in [(1, 1, 1.6), (2.76, 0.45, 0.9), (5.4, 0.25, 0.45), (8.93, 0.12, 0.25)])
    return vel * son * np.minimum(1, t / 0.003) * np.minimum(1, (duree - t) / 0.1) / 1.8


def nappe(notes, duree, vel=1.0, attaque=0.35, relache=0.7):
    """Nappe douce : dents de scie adoucies (peu d'harmoniques), deux voix légèrement désaccordées par côté."""
    t = np.arange(int((duree + relache) * TAUX)) / TAUX
    env = np.minimum(1, t / attaque) * np.clip((duree + relache - t) / relache, 0, 1)
    g, d = np.zeros_like(t), np.zeros_like(t)
    for m in notes:
        f0 = hz(m)
        for cote, desaccord in ((g, -0.004), (d, 0.004)):
            ph = rng.uniform(0, 2 * np.pi)
            for k in range(1, 7):
                cote += np.sin(2 * np.pi * f0 * (1 + desaccord) * k * t + ph * k) / k ** 1.6
    return vel * g * env / (3 * len(notes)), vel * d * env / (3 * len(notes))


def basse(midi, duree, vel=1.0):
    f0 = hz(midi)
    t = np.arange(int((duree + 0.08) * TAUX)) / TAUX
    env = np.minimum(1, t / 0.005) * np.exp(-t / 0.55) * np.clip((duree + 0.08 - t) / 0.08, 0, 1)
    son = np.sin(2 * np.pi * f0 * t) + 0.3 * np.sin(4 * np.pi * f0 * t) + 0.08 * np.sin(6 * np.pi * f0 * t)
    return vel * np.tanh(1.4 * son * env) * 0.8


def kick(vel=1.0):
    t = np.arange(int(0.42 * TAUX)) / TAUX
    f = 44 + 90 * np.exp(-t / 0.045)
    son = np.sin(2 * np.pi * np.cumsum(f) / TAUX) * np.exp(-t / 0.2)
    clic = filtre(rng.standard_normal(len(t)) * np.exp(-t / 0.003), "highpass", 2500) * 0.12
    return vel * np.tanh(1.6 * (son + clic)) * 0.9


def clap(vel=1.0):
    t = np.arange(int(0.35 * TAUX)) / TAUX
    bruit = rng.standard_normal(len(t))
    env = np.zeros_like(t)
    for decal in (0, 0.011, 0.022):  # trois battements rapprochés, comme des mains
        env += np.where(t >= decal, np.exp(-(t - decal) / (0.009 if decal < 0.02 else 0.11)), 0)
    son = filtre(bruit * env, "bandpass", [900, 4200]) + 0.25 * np.sin(2 * np.pi * 210 * t) * np.exp(-t / 0.05)
    return vel * son * 0.55


def charleston(vel=1.0, ouvert=False):
    d = 0.32 if ouvert else 0.05
    t = np.arange(int((d * 4) * TAUX)) / TAUX
    son = filtre(rng.standard_normal(len(t)), "highpass", 7500) * np.exp(-t / d)
    return vel * son * 0.32


def gong(midi=38, vel=1.0, duree=7.0):
    f0 = hz(midi)
    t = np.arange(int(duree * TAUX)) / TAUX
    son = np.zeros_like(t)
    for r, a, d, flor in [(1, 1, 5.5, 0), (1.52, 0.6, 4.2, 0.2), (2.08, 0.55, 3.6, 0.35), (2.68, 0.4, 3.0, 0.5),
                          (3.32, 0.3, 2.4, 0.6), (4.1, 0.22, 1.9, 0.7), (4.9, 0.15, 1.4, 0.8), (5.6, 0.1, 1.1, 0.9)]:
        f = f0 * r * (1 + rng.uniform(-0.004, 0.004))
        ph = 2 * np.pi * np.cumsum(f * (1 - 0.01 * np.exp(-t / 0.6))) / TAUX
        eclosion = 1 - flor * np.exp(-t / 0.35)  # les partiels aigus « s'ouvrent » après le coup
        son += a * np.sin(ph) * np.exp(-t / d) * eclosion
    coup = filtre(rng.standard_normal(len(t)) * np.exp(-t / 0.04), "lowpass", 900) * 0.6
    return vel * (son + coup) * np.minimum(1, t / 0.004) / 3.0


def souffle(duree, vel=1.0):
    """Montée de bruit filtré qui annonce le départ du rythme."""
    n = int(duree * TAUX)
    t = np.arange(n) / TAUX
    bruit = rng.standard_normal(n)
    son = np.zeros(n)
    for i, f in enumerate(np.geomspace(400, 6000, 12)):  # filtre qui s'ouvre par paliers fondus
        part = filtre(bruit, "bandpass", [f * 0.7, f * 1.3])
        poids = np.exp(-((t / duree * 11 - i) ** 2) / 2)
        son += part * poids
    return vel * son * (t / duree) ** 2 * 0.5


# ---------- Écriture ----------

ACCORDS = [  # ré – si mineur – sol – la : nappe (notes), basse (fondamentale)
    ([62, 66, 69, 76], 38), ([59, 62, 66, 69], 35), ([55, 59, 62, 66], 31), ([57, 62, 64, 69], 33)]
MELODIE_A = [
    [(0, 69), (0.75, 71), (1.5, 74), (2.5, 76), (3, 74)],
    [(0, 78), (1, 76), (1.5, 74), (2.5, 71)],
    [(0, 74), (0.5, 71), (1.5, 69), (2, 71), (3, 74)],
    [(0, 76), (0.75, 78), (1.5, 76), (2, 69), (3, 71)]]
MELODIE_B = [
    [(0, 74), (0.5, 76), (1, 78), (2, 81), (3, 78)],
    [(0, 76), (0.5, 74), (1.5, 71), (2.5, 74), (3.5, 76)],
    [(0, 71), (1, 74), (1.5, 76), (2.5, 74)],
    [(0, 69), (1, 71), (1.5, 74), (2, 76), (3, 81)]]


def t_temps(mesure, temps):  # instant d'un temps (mesure 0 = départ du rythme)
    return DEPART + (mesure * 4 + temps) * TEMPS


# Introduction : nappe qui monte, arpège qui grimpe jusqu'au départ, cloches quand le logo est dessiné
g, d = nappe([62, 66, 69, 76], DEPART + 0.1, vel=0.9, attaque=1.6, relache=0.6)
poser("nappe", 0.15, g, 1, 0)
poser("nappe", 0.15, d, 0, 1)
arpege = [62, 66, 69, 74, 76, 78, 81, 86]
n_croches = int((DEPART - 0.25) / (TEMPS / 2))
for k in range(n_croches):
    t = DEPART - (n_croches - k) * TEMPS / 2
    m = arpege[k % len(arpege)]
    gp, dp = panoramique(np.sin(k * 1.3) * 0.6)
    poser("pince", t, pince(m, vel=0.35 + 0.4 * k / n_croches, duree=1.2), gp, dp)
for t, m in [(1.42, 86), (1.6, 93)]:
    poser("effets", t, cloche(m, vel=0.35), 0.8, 1.0)
poser("effets", DEPART - 1.2, souffle(1.2, vel=0.5))

# Rythme : du départ à l'arrêt
for mesure in range(mesures):
    notes, fond = ACCORDS[mesure % 4]
    complet = mesure >= 2
    g, d = nappe(notes, 4 * TEMPS, vel=0.55 if complet else 0.7, attaque=0.25, relache=0.5)
    poser("nappe", t_temps(mesure, 0), g, 1, 0)
    poser("nappe", t_temps(mesure, 0), d, 0, 1)
    for temps, ecart, duree in [(0, 0, 1.0), (1.5, 0, 0.4), (2, 7, 0.9), (3, 12, 0.4), (3.5, 7, 0.4)]:
        poser("basse", t_temps(mesure, temps), basse(fond + ecart, duree * TEMPS, vel=0.9 if temps == 0 else 0.7))
    # Batterie
    for temps, vel in [(0, 1.0), (1.5, 0.55), (2, 0.85)] + ([(3.5, 0.5)] if mesure % 2 else []):
        poser("kick", t_temps(mesure, temps), kick(vel))
    if complet:
        for temps in (1, 3):
            poser("clap", t_temps(mesure, temps), clap(0.8), 0.95, 1.0)
    for croche in range(8):
        swing = 0.07 if croche % 2 else 0
        ouvert = croche == 7 and mesure % 2 == 1
        gp, dp = panoramique(0.35)
        poser("charleston", t_temps(mesure, croche / 2 + swing), charleston(0.7 if croche % 2 == 0 else 0.45, ouvert), gp, dp)
    # Mélodie (à partir de la troisième mesure ; variante B dans la seconde moitié)
    if complet:
        motif = (MELODIE_B if mesure >= 2 + (mesures - 2) // 2 else MELODIE_A)[mesure % 4]
        for temps, m in motif:
            gp, dp = panoramique(-0.25)
            poser("melodie", t_temps(mesure, temps), pince(m, vel=0.75, duree=1.5), gp, dp)
    # Arpège léger en contretemps, en écho de la mélodie
    for croche in (1, 3, 5, 7):
        m = notes[(croche // 2 + mesure) % len(notes)] + 12
        gp, dp = panoramique(0.55)
        poser("pince", t_temps(mesure, croche / 2), pince(m, vel=0.22, duree=0.9), gp, dp)

# Relance avant la fin : roulement de claps qui monte, souffle
for k in range(8):
    poser("clap", t_temps(mesures - 1, 2 + k * 0.25), clap(0.25 + 0.08 * k))
poser("effets", ARRET - 1.6, souffle(1.6, vel=0.6))

# Coup final : gong, accord égrené, nappe qui s'éteint jusqu'à la fin du film
poser("effets", ARRET, gong(38, vel=0.9, duree=DUREE - ARRET))
poser("kick", ARRET, kick(1.0))
for k, m in enumerate([50, 57, 62, 66, 69, 74, 76, 81]):
    gp, dp = panoramique(-0.6 + k * 0.17)
    poser("melodie", ARRET + k * 0.035, pince(m, vel=0.55, duree=4.0), gp, dp)
g, d = nappe([50, 62, 66, 69, 76], DUREE - ARRET, vel=0.8, attaque=0.05, relache=0.01)
fondu = np.linspace(1, 0, len(g)) ** 1.5
poser("nappe", ARRET, g * fondu, 1, 0)
poser("nappe", ARRET, d * fondu, 0, 1)

# ---------- Mixage ----------

def reverberation(son, duree=1.9):
    n = int(duree * TAUX)
    t = np.arange(n) / TAUX
    ir = np.stack([filtre(rng.standard_normal(n), "lowpass", 6000) * np.exp(-t * 6.9 / duree) for _ in range(2)], axis=1)
    ir[: int(0.02 * TAUX)] = 0  # pré-délai
    ir /= np.sqrt(np.sum(ir ** 2, axis=0))
    return np.stack([fftconvolve(son[:, c], ir[:, c])[: len(son)] for c in range(2)], axis=1)


niveaux = {"pince": 0.55, "melodie": 0.62, "nappe": 0.5, "basse": 0.85, "kick": 0.8, "clap": 0.45, "charleston": 0.3, "effets": 0.6}
envoi = {"pince": 0.45, "melodie": 0.35, "nappe": 0.3, "basse": 0, "kick": 0.05, "clap": 0.25, "charleston": 0.1, "effets": 0.4}
sec = sum(pistes[p] * niveaux[p] for p in pistes)
humide = reverberation(sum(pistes[p] * niveaux[p] * envoi[p] for p in pistes))
mix = sec + 0.55 * humide
mix = mix[: int(DUREE * TAUX)]
mix[:, 0] = filtre(mix[:, 0], "highpass", 30)
mix[:, 1] = filtre(mix[:, 1], "highpass", 30)
fin = np.ones(len(mix))
fin[-int(2.5 * TAUX):] = np.linspace(1, 0, int(2.5 * TAUX)) ** 2  # la fin s'éteint doucement
mix *= fin[:, None]
mix = np.tanh(mix / np.max(np.abs(mix)) * 1.15) / np.tanh(1.15) * 0.89  # crête à -1 dB, sans écrêtage dur

with wave.open(sys.argv[2], "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(TAUX)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
print(f"{mesures} mesures à {60 / TEMPS:.1f} temps/min, {DUREE:.1f} s")
