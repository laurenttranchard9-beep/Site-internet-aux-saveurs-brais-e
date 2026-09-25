<?php
// Mesure d'audience du menu public : seulement pour les visiteurs qui ont accepté le cookie.
// Aucune adresse IP n'est enregistrée ; l'identifiant du visiteur est un nombre aléatoire tiré par son navigateur.

const VISITE_DUREE = 30 * 60;               // une même personne compte une visite par tranche de 30 min
const VISITES_CONSERVATION = 25 * 30 * 86400; // 25 mois, durée maximale recommandée par la CNIL

function stats_migrer(PDO $pdo): void
{
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS visites (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            quand     INTEGER NOT NULL,          -- horodatage Unix
            visiteur  TEXT NOT NULL,             -- identifiant aléatoire du cookie
            appareil  TEXT NOT NULL,             -- Smartphone, Tablette, Ordinateur
            systeme   TEXT NOT NULL,
            navigateur TEXT NOT NULL,
            largeur   INTEGER,                   -- largeur de l'écran en pixels
            origine   TEXT NOT NULL DEFAULT ''   -- site d'où vient le visiteur (Google, Facebook…), vide si accès direct
        );
        CREATE INDEX IF NOT EXISTS idx_visites_quand ON visites(quand);
        CREATE INDEX IF NOT EXISTS idx_visites_visiteur ON visites(visiteur, quand);
    ");
}

// Déduit l'appareil, le système et le navigateur de l'en-tête User-Agent.
function analyser_navigateur(string $ua, ?int $largeur): array
{
    $systeme = match (true) {
        (bool) preg_match('/iPhone|iPad|iPod/i', $ua) => 'iOS',
        (bool) preg_match('/Android/i', $ua) => 'Android',
        (bool) preg_match('/Windows/i', $ua) => 'Windows',
        (bool) preg_match('/Macintosh|Mac OS X/i', $ua) => 'macOS',
        (bool) preg_match('/CrOS/i', $ua) => 'ChromeOS',
        (bool) preg_match('/Linux/i', $ua) => 'Linux',
        default => 'Autre',
    };
    $navigateur = match (true) {
        (bool) preg_match('/SamsungBrowser/i', $ua) => 'Samsung Internet',
        (bool) preg_match('/Edg\//i', $ua) => 'Edge',
        (bool) preg_match('/OPR\/|Opera/i', $ua) => 'Opera',
        (bool) preg_match('/Firefox|FxiOS/i', $ua) => 'Firefox',
        (bool) preg_match('/Chrome|CriOS/i', $ua) => 'Chrome',
        (bool) preg_match('/Safari/i', $ua) => 'Safari',
        default => 'Autre',
    };
    $tablette = preg_match('/iPad|Tablet/i', $ua) || (preg_match('/Android/i', $ua) && !preg_match('/Mobile/i', $ua));
    $mobile = preg_match('/Mobi|iPhone|iPod|Android.*Mobile/i', $ua);
    $appareil = $tablette ? 'Tablette' : ($mobile ? 'Smartphone' : 'Ordinateur');
    return [$appareil, $systeme, $navigateur];
}

function origine_visite($referrer): string
{
    if (!is_string($referrer) || $referrer === '') return '';
    $hote = strtolower((string) parse_url($referrer, PHP_URL_HOST));
    if ($hote === '' || $hote === strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''))) return '';
    $hote = preg_replace('/^(www|m|l|lm)\./', '', $hote);
    return match (true) {
        str_contains($hote, 'google.') => 'Google',
        str_contains($hote, 'facebook.') => 'Facebook',
        str_contains($hote, 'instagram.') => 'Instagram',
        str_contains($hote, 'bing.') => 'Bing',
        default => mb_substr($hote, 0, 60),
    };
}

function enregistrer_visite(array $body): array
{
    $visiteur = $body['visiteur'] ?? null;
    if (!is_string($visiteur) || !preg_match('/^[a-f0-9]{32}$/', $visiteur)) fail(400, 'Visiteur invalide.');
    $largeur = $body['largeur'] ?? null;
    $largeur = is_int($largeur) && $largeur > 0 && $largeur < 10000 ? $largeur : null;
    $pdo = db();
    $maintenant = time();
    // Une visite par personne et par tranche de 30 minutes
    $recente = $pdo->prepare('SELECT 1 FROM visites WHERE visiteur = ? AND quand > ? LIMIT 1');
    $recente->execute([$visiteur, $maintenant - VISITE_DUREE]);
    if ($recente->fetchColumn()) return ['ok' => true, 'nouvelle' => false];

    [$appareil, $systeme, $navigateur] = analyser_navigateur((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), $largeur);
    if (!empty($body['tactile']) && $appareil === 'Ordinateur' && $systeme === 'macOS' && $largeur !== null && $largeur <= 1366) {
        $appareil = 'Tablette'; // iPad qui se présente comme un Mac
        $systeme = 'iOS';
    }
    $pdo->prepare('INSERT INTO visites (quand, visiteur, appareil, systeme, navigateur, largeur, origine) VALUES (?, ?, ?, ?, ?, ?, ?)')
        ->execute([$maintenant, $visiteur, $appareil, $systeme, $navigateur, $largeur, origine_visite($body['origine'] ?? '')]);
    $pdo->prepare('DELETE FROM visites WHERE quand < ?')->execute([$maintenant - VISITES_CONSERVATION]);
    return ['ok' => true, 'nouvelle' => true];
}

// Statistiques sur les N derniers jours (heure de Paris).
function statistiques(int $jours): array
{
    $jours = max(1, min(400, $jours));
    $fuseau = new DateTimeZone('Europe/Paris');
    $debut = (new DateTimeImmutable('today', $fuseau))->modify('-' . ($jours - 1) . ' days');
    $stmt = db()->prepare('SELECT quand, visiteur, appareil, systeme, navigateur, origine FROM visites WHERE quand >= ? ORDER BY quand');
    $stmt->execute([$debut->getTimestamp()]);

    $parJour = [];
    for ($d = $debut, $i = 0; $i < $jours; $i++, $d = $d->modify('+1 day')) $parJour[$d->format('Y-m-d')] = 0;
    $heures = array_fill(0, 24, 0);
    $semaine = array_fill(1, 7, 0); // 1 = lundi
    $appareils = $systemes = $navigateurs = $origines = [];
    $visiteurs = [];
    $total = 0;
    foreach ($stmt as $v) {
        $t = (new DateTimeImmutable('@' . $v['quand']))->setTimezone($fuseau);
        $total++;
        $parJour[$t->format('Y-m-d')] = ($parJour[$t->format('Y-m-d')] ?? 0) + 1;
        $heures[(int) $t->format('G')]++;
        $semaine[(int) $t->format('N')]++;
        $visiteurs[$v['visiteur']] = true;
        $appareils[$v['appareil']] = ($appareils[$v['appareil']] ?? 0) + 1;
        $systemes[$v['systeme']] = ($systemes[$v['systeme']] ?? 0) + 1;
        $navigateurs[$v['navigateur']] = ($navigateurs[$v['navigateur']] ?? 0) + 1;
        $o = $v['origine'] === '' ? 'Accès direct' : $v['origine'];
        $origines[$o] = ($origines[$o] ?? 0) + 1;
    }
    $trier = function (array $a): array {
        arsort($a);
        return array_map(fn($k, $n) => ['nom' => (string) $k, 'visites' => $n], array_keys($a), $a);
    };
    return [
        'jours' => $jours,
        'visites' => $total,
        'visiteurs' => count($visiteurs),
        'parJour' => array_map(fn($k, $n) => ['jour' => $k, 'visites' => $n], array_keys($parJour), $parJour),
        'heures' => $heures,
        'semaine' => array_values($semaine),
        'appareils' => $trier($appareils),
        'systemes' => $trier($systemes),
        'navigateurs' => $trier($navigateurs),
        'origines' => $trier($origines),
    ];
}
