"""Bande son du film, composée et synthétisée ici (aucun échantillon extérieur, donc aucun droit à payer) :
une musique électro-house à 120 temps par minute (grosse caisse à chaque temps, basse en contretemps, accords
plaqués, mélodie pentatonique en la mineur aux couleurs asiatiques) et des bruitages calés sur l'écran.

Tout suit le scénario (compo/scenario.js) : introduction pendant le logo, départ du rythme sur « drop », une
cymbale et un souffle à chaque changement de scène, un coup final sur « fin », puis l'accord final s'éteint.
Les bruitages (touchers, frappe au clavier, wok qui saute, machine 888, cookie qui craque, tracés, bulles)
tombent aux instants des actions.

    python musique.py scenario.json musique.wav
"""
import json
import sys
import wave

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

TAUX = 48000
S = json.load(open(sys.argv[1], encoding="utf-8"))
TEMPS = 60 / S["musique"]["bpm"]
MESURE = 4 * TEMPS
DROP, FIN, DUREE = S["drop"], S["fin"], S["duree"]
MESURES = round((FIN - DROP) / MESURE)              # mesures de rythme, du départ au coup final
SCENES = [t["de"] for t in S["titres"]][1:]          # changements de scène (sur des temps forts)
MACHINE = next((a["t"] for a in S["actions"] if a.get("sel") == "#lancer"), None)
rng = np.random.default_rng(888)
N = int((DUREE + 1) * TAUX)
BUS = ["kick", "clap", "hats", "basse", "accords", "melodie", "nappe", "cymbales", "effets", "bruitages"]
pistes = {nom: np.zeros((N, 2)) for nom in BUS}


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def t_(n):  # début de la n-ième mesure (0 = départ du rythme ; négatif : introduction)
    return DROP + n * MESURE


def poser(piste, t, son, pan=0.0):
    a = (pan + 1) * np.pi / 4
    i = int(round(t * TAUX))
    if i >= N or i + len(son) <= 0:
        return
    if i < 0:
        son, i = son[-i:], 0
    son = son[: N - i].copy()
    k = min(len(son), int(0.015 * TAUX))
    son[len(son) - k:] *= np.linspace(1, 0, k)  # fin fondue : jamais de clic
    pistes[piste][i: i + len(son), 0] += son * np.cos(a) * 1.41
    pistes[piste][i: i + len(son), 1] += son * np.sin(a) * 1.41


def filtre(son, type_, f, ordre=2):
    return sosfilt(butter(ordre, f, btype=type_, fs=TAUX, output="sos"), son)


def temps_(d):
    return np.arange(int(d * TAUX)) / TAUX


def bruit(d):
    return rng.standard_normal(int(d * TAUX))


# ---------- Batterie ----------

def kick(vel=1.0):
    t = temps_(0.45)
    f = 47 + 150 * np.exp(-t / 0.028) + 25 * np.exp(-t / 0.12)
    corps = np.sin(2 * np.pi * np.cumsum(f) / TAUX) * np.exp(-t / 0.2)
    clic = filtre(bruit(0.45) * np.exp(-t / 0.002), "highpass", 3500) * 0.3
    return vel * np.tanh(2.2 * (corps + clic)) * 0.9


def clap(vel=1.0):
    t = temps_(0.4)
    env = sum(np.where(t >= d, np.exp(-(t - d) / 0.006), 0) for d in (0, 0.008, 0.017))
    env += np.where(t >= 0.026, np.exp(-(t - 0.026) / 0.13), 0) * 0.8
    return vel * filtre(filtre(bruit(0.4) * env, "bandpass", [850, 3600]), "highpass", 500) * 0.7


METAL = [205.3, 304.4, 369.6, 522.7, 540.0, 800.0]  # fréquences d'une boîte à rythmes 808


def metal(d):
    t = temps_(d)
    return sum(np.sign(np.sin(2 * np.pi * f * t + rng.uniform(0, 6.28))) for f in METAL) / 6


def charley(vel=1.0, ouvert=False):
    d = 0.3 if ouvert else 0.045
    t = temps_(d * 4)
    son = filtre(metal(d * 4) * 0.7 + bruit(d * 4) * 0.3, "bandpass", [7000, 13000]) * np.exp(-t / d)
    return vel * son * (0.9 if ouvert else 0.75)


def cymbale(vel=1.0, d=1.8):
    t = temps_(d)
    son = filtre(metal(d) * 0.5 + bruit(d), "highpass", 4200) * np.exp(-t / (d * 0.4)) * np.minimum(1, t / 0.003)
    return vel * son * 0.5


def cymbale_inverse(vel=1.0, d=0.9):  # souffle qui monte jusqu'au temps fort
    return np.flip(cymbale(vel, d)) * 0.8


# ---------- Instruments ----------

def basse(midi, duree, vel=1.0):
    f0 = hz(midi)
    t = temps_(duree + 0.03)
    son = 0.65 * np.sin(2 * np.pi * f0 * t) * np.exp(-t / 0.8)  # sous-basse tenue
    for k in range(1, 30):
        if k * f0 > 4500:
            break
        tau = 0.16 / (1 + 0.3 * (k - 1))  # le filtre se referme : son rond après l'attaque
        son += np.sin(2 * np.pi * f0 * k * t + 0.3 * k) / k * np.exp(-t / tau) * 0.8
    son *= np.minimum(1, t / 0.003)
    return vel * np.tanh(1.5 * son) * 0.8


PARTIELS_ACCORD = [(1, 1), (2, 0.55), (3, 0.35), (4, 0.25), (5, 0.14), (6, 0.1), (8, 0.06)]


def accord(notes, vel=1.0, duree=0.32, ouverture=1.0):
    """Accord plaqué (piano électrique et orgue de house), deux voix légèrement désaccordées gauche/droite."""
    t = temps_(duree + 0.05)
    env = np.minimum(1, t / 0.004) * np.exp(-t / 0.16)
    g, d = np.zeros_like(t), np.zeros_like(t)
    for m in notes:
        for k, a in PARTIELS_ACCORD:
            a *= ouverture ** (k - 1)
            g += a * np.sin(2 * np.pi * hz(m) * k * 0.9965 * t + k)
            d += a * np.sin(2 * np.pi * hz(m) * k * 1.0035 * t + 2 * k)
    n = 2.2 * len(notes)
    return vel * g * env / n, vel * d * env / n


def pince(midi, vel=1.0, duree=0.6, eclat=0.35):
    """Pincé brillant (future house) : dents de scie dont les harmoniques s'éteignent vite."""
    f0 = hz(midi)
    t = temps_(duree)
    son = 0.3 * np.sin(np.pi * f0 * t) * np.exp(-t / 0.3)  # un peu de corps une octave dessous
    for k in range(1, 18):
        if k * f0 > 11000:
            break
        tau = eclat / (1 + 0.5 * (k - 1))
        son += np.sin(2 * np.pi * f0 * k * t + 0.5 * k) / k * np.exp(-t / tau)
    return vel * son * np.minimum(1, t / 0.002) * 0.55


def nappe(notes, duree, vel=1.0):
    t = temps_(duree + 0.6)
    env = np.minimum(1, t / 0.45) * np.clip((duree + 0.6 - t) / 0.6, 0, 1)
    g, d = np.zeros_like(t), np.zeros_like(t)
    for m in notes:
        for j, desaccord in enumerate([-0.011, -0.004, 0.004, 0.011]):
            cote = g if j % 2 == 0 else d
            for k in range(1, 8):
                cote += np.sin(2 * np.pi * hz(m) * (1 + desaccord) * k * t + rng.uniform(0, 6.28)) / k ** 1.4
    n = 6 * len(notes)
    return vel * g * env / n, vel * d * env / n


def cloche(midi, vel=1.0, d=1.8):
    t = temps_(d)
    son = sum(a * np.sin(2 * np.pi * hz(midi) * r * t) * np.exp(-t / e)
              for r, a, e in [(1, 1, 1.1), (2.76, 0.45, 0.6), (5.4, 0.25, 0.3), (8.93, 0.12, 0.15)])
    return vel * son * np.minimum(1, t / 0.002) / 1.8


# ---------- Effets ----------

def montee(d, vel=1.0):
    """Bruit filtré qui s'ouvre et monte jusqu'au départ du rythme."""
    t = temps_(d)
    b = bruit(d)
    son = np.zeros_like(t)
    for i, f in enumerate(np.geomspace(500, 9000, 14)):
        son += filtre(b, "bandpass", [f * 0.75, f * 1.3]) * np.exp(-((t / d * 13 - i) ** 2) / 2)
    son += 0.15 * np.sin(2 * np.pi * np.cumsum(220 * 2 ** (2 * t / d)) / TAUX)  # sirène discrète qui grimpe
    return vel * son * (t / d) ** 2 * 0.6


def impact(vel=1.0):
    t = temps_(1.4)
    sub = np.sin(2 * np.pi * np.cumsum(30 + 50 * np.exp(-t / 0.35)) / TAUX) * np.exp(-t / 0.55)
    coup = filtre(bruit(1.4) * np.exp(-t / 0.08), "lowpass", 1400) * 0.8
    return vel * np.tanh(1.5 * (sub + coup)) * 0.9


def souffle(d, f1, f2, vel=1.0):
    """Bruit dont la bande passe de f1 à f2 (déplacement, wok qui saute)."""
    t = temps_(d)
    b = bruit(d)
    son = np.zeros_like(t)
    for i, f in enumerate(np.geomspace(f1, f2, 10)):
        son += filtre(b, "bandpass", [f * 0.7, f * 1.4]) * np.exp(-((t / d * 9 - i) ** 2) / 1.5)
    return vel * son * np.sin(np.pi * t / d) * 0.5


# ---------- Bruitages ----------

def toucher(vel=1.0):
    t = temps_(0.12)
    f = 900 + 600 * np.exp(-t / 0.012)
    son = np.sin(2 * np.pi * np.cumsum(f) / TAUX) * np.exp(-t / 0.035)
    return vel * (son + filtre(bruit(0.12) * np.exp(-t / 0.002), "highpass", 3000) * 0.2) * 0.45


def touche_clavier(vel=1.0):
    t = temps_(0.06)
    son = filtre(bruit(0.06) * np.exp(-t / 0.004), "bandpass", [1800, 5500]) * 0.6
    return vel * (son + np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.012) * 0.4) * 0.5


def gresillement(d=1.0, vel=1.0):
    """Wok qui grésille : bruit aigu traversé de crépitements."""
    t = temps_(d)
    crepit = (rng.random(len(t)) < 0.004) * rng.uniform(0.3, 1, len(t))
    crepit = np.convolve(crepit, np.exp(-np.arange(80) / 12), "same")
    son = filtre(bruit(d) * (0.25 + crepit), "highpass", 2600) * np.exp(-t / (d * 0.45)) * np.minimum(1, t / 0.02)
    return vel * son * 0.5


def craquement(vel=1.0):
    t = temps_(0.25)
    env = sum(np.where(t >= d, np.exp(-(t - d) / 0.005), 0) * a for d, a in [(0, 1), (0.014, 0.8), (0.031, 0.9), (0.052, 0.5)])
    son = filtre(bruit(0.25) * env, "bandpass", [1500, 7000]) + np.sin(2 * np.pi * 130 * t) * np.exp(-t / 0.03) * 0.5
    return vel * son * 0.7


def plume(d=0.6, vel=1.0):  # trait de feutre qui entoure
    t = temps_(d)
    return vel * filtre(bruit(d), "bandpass", [2500, 6500]) * np.sin(np.pi * t / d) ** 0.7 * 0.12


def bulle(vel=1.0):
    t = temps_(0.12)
    f = 500 + 700 * (1 - np.exp(-t / 0.03))
    return vel * np.sin(2 * np.pi * np.cumsum(f) / TAUX) * np.exp(-t / 0.04) * 0.5


# ---------- Écriture ----------

GRILLE = [  # la mineur – fa – do – sol : accord plaqué, nappe, fondamentale de la basse
    ([57, 60, 64, 69], [57, 64, 69, 72], 33), ([53, 57, 60, 65], [53, 60, 65, 69], 29),
    ([55, 60, 64, 67], [55, 64, 67, 72], 36), ([55, 59, 62, 67], [55, 62, 67, 71], 31)]
MELODIE_A = [  # (temps dans la mesure, note) en la mineur pentatonique : la do ré mi sol
    [(0, 76), (0.5, 79), (1, 81), (1.75, 79), (2.5, 76), (3, 74), (3.5, 76)],
    [(0, 72), (0.75, 74), (1.5, 76), (2.5, 79), (3, 76)],
    [(0, 76), (0.5, 79), (1, 81), (1.75, 84), (2.5, 81), (3, 79)],
    [(0, 74), (0.75, 76), (1.5, 79), (2.5, 74), (3.25, 76)]]
MELODIE_B = [
    [(0, 81), (0.75, 79), (1.5, 76), (2, 79), (3, 81), (3.5, 84)],
    [(0, 81), (1, 79), (1.5, 76), (2.5, 72), (3, 74)],
    [(0, 76), (0.75, 79), (1.5, 84), (2, 81), (3, 79)],
    [(0, 74), (0.5, 76), (1, 79), (2, 81), (2.75, 79), (3.5, 76)]]


def melodie(m):  # mélodie de la mesure m (0 = départ du rythme), ou aucune
    t = t_(m)
    if MACHINE is not None and MACHINE - MESURE < t < MACHINE + 2.6:
        return None  # pendant que la machine tourne : arpège rapide à la place
    if m >= MESURES - 2:
        return None  # dernière ligne droite : la montée
    scene = sum(1 for s in SCENES if s <= t + 1e-6)
    if scene == 2 and t < SCENES[1] + 2 * MESURE:
        return None  # début de « Composez votre wok » : on laisse respirer
    return (MELODIE_B if scene in (2, 4) else MELODIE_A)[m % 4]


coups = []  # instants des grosses caisses (pour le pompage de la nappe, de la basse et des accords)

# Introduction (deux mesures avant le départ) : nappe, accords qui s'ouvrent, arpège qui grimpe, roulement, montée
for m in (-2, -1):
    acc, nap, _ = GRILLE[m % 4]
    g, d = nappe(nap, MESURE, vel=0.9)
    poser("nappe", t_(m), g, -1)
    poser("nappe", t_(m), d, 1)
    for tps in range(4):
        g, d = accord(acc, vel=0.45, ouverture=0.35 + 0.08 * ((m + 2) * 4 + tps))
        poser("accords", t_(m) + tps * TEMPS, g, -0.6)
        poser("accords", t_(m) + tps * TEMPS, d, 0.6)
arpege = [69, 72, 76, 79, 81, 84, 88, 91]
for k in range(16):
    note = arpege[k % 8] - (12 if k < 8 else 0)
    poser("melodie", t_(-2) + k * TEMPS / 2, pince(note, vel=0.25 + 0.03 * k, duree=0.4), np.sin(k) * 0.5)
for k in range(12):  # roulement : croches puis doubles croches
    tk = t_(-1) + (k * TEMPS / 2 if k < 4 else 2 * TEMPS + (k - 4) * TEMPS / 4)
    poser("clap", tk, clap(0.25 + 0.06 * k))
poser("effets", DROP - MESURE, montee(MESURE, vel=0.8))
poser("cymbales", DROP - 0.9, cymbale_inverse(0.8))

# Rythme
for m in range(MESURES):
    acc, nap, fond = GRILLE[m % 4]
    t0 = t_(m)
    for tps in range(4):
        poser("kick", t0 + tps * TEMPS, kick(1.0 if tps % 2 == 0 else 0.92))
        coups.append(t0 + tps * TEMPS)
    for tps in (1, 3):
        poser("clap", t0 + tps * TEMPS, clap(0.9), 0.05)
    for d in range(16):  # charley fermé en doubles croches (sauf sur les contretemps)
        if d % 4 != 2:
            poser("hats", t0 + d * TEMPS / 4 + (0.012 if d % 2 else 0), charley([0.8, 0.35, 0.55, 0.35][d % 4]), 0.3)
    for tps in range(4):  # charley ouvert sur les contretemps
        poser("hats", t0 + (tps + 0.5) * TEMPS, charley(0.55, ouvert=True), -0.25)
    for pos, ecart in [(0.5, 0), (1.5, 0), (2.5, 0), (3.25, 12), (3.5, 0)]:  # basse en contretemps, saut d'octave
        poser("basse", t0 + pos * TEMPS, basse(fond + ecart, 0.42 * TEMPS, vel=0.95 if ecart == 0 else 0.7))
    for pos in (0.5, 1.25, 2.5, 3.25):  # accords plaqués syncopés
        g, d = accord(acc, vel=0.8, ouverture=0.9)
        poser("accords", t0 + pos * TEMPS, g, -0.5)
        poser("accords", t0 + pos * TEMPS, d, 0.5)
    g, d = nappe(nap, MESURE, vel=0.7)
    poser("nappe", t0, g, -1)
    poser("nappe", t0, d, 1)
    for pos, note in melodie(m) or []:
        poser("melodie", t0 + pos * TEMPS, pince(note, vel=0.85), -0.15)

# Machine 888 : arpège rapide pendant que les rouleaux tournent, puis deux cloches quand le résultat s'affiche
if MACHINE is not None:
    notes = [69, 72, 74, 76, 79, 81, 84, 86, 88, 91]
    for k in range(int(2.1 / (TEMPS / 4))):  # les rouleaux s'arrêtent environ 2,1 s après le lancement
        note = notes[k % len(notes)] + (12 if k > 12 else 0)
        poser("melodie", MACHINE + k * TEMPS / 4, pince(note, vel=0.45, duree=0.18, eclat=0.12), 0.4 * np.sin(k))
    poser("effets", MACHINE + 2.15, cloche(96, 0.6))
    poser("effets", MACHINE + 2.2, cloche(91, 0.45))

# À chaque changement de scène : souffle qui monte, cymbale, petit roulement sur le dernier temps
for s in SCENES:
    poser("cymbales", s - 0.75, cymbale_inverse(0.55), 0.2)
    poser("cymbales", s, cymbale(0.55), -0.2)
    for k in range(4):
        poser("clap", s - TEMPS + k * TEMPS / 4, clap(0.3 + 0.1 * k))

# Départ du rythme et coup final
poser("effets", DROP, impact(1.0))
poser("cymbales", DROP, cymbale(0.9, 2.4))
poser("effets", FIN - 2 * MESURE, montee(2 * MESURE, vel=0.9))
for k in range(16):  # montée finale : roulement de plus en plus fort
    poser("clap", FIN - MESURE + k * MESURE / 16, clap(0.2 + 0.04 * k))
poser("cymbales", FIN - 0.9, cymbale_inverse(0.8))
poser("effets", FIN, impact(1.1))
poser("kick", FIN, kick(1.0))
poser("cymbales", FIN, cymbale(1.0, 3.0))
ACCORD_FINAL = [45, 57, 64, 69, 71, 76]  # la mineur avec la neuvième
g, d = accord(ACCORD_FINAL, vel=1.0, duree=1.2, ouverture=1.0)
poser("accords", FIN, g, -0.4)
poser("accords", FIN, d, 0.4)
g, d = nappe(ACCORD_FINAL, DUREE - FIN - 0.6, vel=1.0)
fondu = np.linspace(1, 0, len(g)) ** 1.6
poser("nappe", FIN, g * fondu, -1)
poser("nappe", FIN, d * fondu, 1)
for k, note in enumerate([76, 79, 81, 84, 88]):  # écho de la mélodie qui s'éloigne
    poser("melodie", FIN + 0.5 + k * TEMPS, pince(note, vel=0.5 - 0.07 * k, duree=0.9), (-1) ** k * 0.5)

# Bruitages calés sur les actions de l'écran
for a in S["actions"]:
    t, faire, sel = a["t"], a["faire"], a.get("sel", "")
    if faire in ("cliquer", "toucher"):
        poser("bruitages", t, toucher(0.8))
    if sel == "#wok-toucher":
        poser("bruitages", t - 0.05, souffle(0.45, 300, 3000, vel=0.9))
        poser("bruitages", t + 0.25, gresillement(1.1, vel=0.8))
    if sel == "#fortune-cookie":
        poser("bruitages", t + 0.06, craquement(1.0))
    if sel == "#lancer":
        poser("bruitages", t, souffle(0.35, 2500, 400, vel=0.7))
    if faire == "taper":
        for k in range(len(a["saisie"])):
            poser("bruitages", t + k * a["pas"], touche_clavier(0.8), 0.1)
    if faire == "entourer":
        poser("bruitages", t, plume(0.55, vel=1.0), 0.15)
for b in S["bulles"]:
    poser("bruitages", b["de"], bulle(0.8), 0.3)

# ---------- Mixage ----------

# Pompage : la nappe, la basse et les accords s'effacent un instant à chaque grosse caisse
i_coups = np.zeros(N, dtype=bool)
for c in coups:
    i_coups[min(N - 1, int(c * TAUX))] = True
dernier = np.maximum.accumulate(np.where(i_coups, np.arange(N), -10 ** 9))
pompe = np.where(dernier >= 0, 1 - np.exp(-(np.arange(N) - dernier) / TAUX / 0.13), 1.0)
for nom, profondeur in [("nappe", 0.7), ("basse", 0.45), ("accords", 0.35)]:
    pistes[nom] *= (1 - profondeur * (1 - pompe))[:, None]


def echo(son, retard, retour=0.35):  # écho ping-pong
    sortie = np.zeros_like(son)
    r = int(retard * TAUX)
    tampon = son.copy()
    for _ in range(5):
        tampon = np.roll(tampon, r, axis=0) * retour
        tampon[:r] = 0
        tampon = tampon[:, ::-1]  # passe d'un côté à l'autre
        sortie += tampon
    return sortie


def reverberation(son, duree=1.6):
    n = int(duree * TAUX)
    t = np.arange(n) / TAUX
    ir = np.stack([filtre(rng.standard_normal(n), "lowpass", 7000) * np.exp(-t * 6.9 / duree) for _ in range(2)], axis=1)
    ir[: int(0.015 * TAUX)] = 0
    ir /= np.sqrt(np.sum(ir ** 2, axis=0))
    return np.stack([fftconvolve(son[:, c], ir[:, c])[: len(son)] for c in range(2)], axis=1)


pistes["melodie"] += 0.3 * echo(pistes["melodie"], 0.75 * TEMPS)
niveaux = {"kick": 0.62, "clap": 1.05, "hats": 0.7, "basse": 0.55, "accords": 1.2, "melodie": 0.5,
           "nappe": 0.55, "cymbales": 0.4, "effets": 0.55, "bruitages": 1.0}
envoi = {"kick": 0.02, "clap": 0.22, "hats": 0.05, "basse": 0, "accords": 0.18, "melodie": 0.28,
         "nappe": 0.3, "cymbales": 0.12, "effets": 0.25, "bruitages": 0.15}
sec = sum(pistes[p] * niveaux[p] for p in BUS)
mix = sec + 0.5 * reverberation(sum(pistes[p] * niveaux[p] * envoi[p] for p in BUS))
mix = mix[: int(DUREE * TAUX)]
for c in range(2):
    mix[:, c] = filtre(mix[:, c], "highpass", 28)
fondu = np.ones(len(mix))
fondu[-int(1.5 * TAUX):] = np.linspace(1, 0, int(1.5 * TAUX)) ** 2
mix *= fondu[:, None]
mix = np.tanh(mix / np.max(np.abs(mix)) * 1.3) / np.tanh(1.3) * 0.89  # crête à -1 dB, sans écrêtage dur

with wave.open(sys.argv[2], "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(TAUX)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
print(f"{MESURES} mesures à {60 / TEMPS:.0f} temps/min, {DUREE:.1f} s")
