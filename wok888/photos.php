<?php
// Galerie : les photos déposées dans le dossier photos/ (JPG, PNG ou WebP), dans l'ordre de leur nom.
// Le nom du fichier sert de légende : « 01-wok-aux-crevettes.jpg » devient « Wok aux crevettes ».

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache');
header('X-Content-Type-Options: nosniff');

const PHOTOS_MAX = 24;

$photos = [];
foreach (glob(__DIR__ . '/photos/*') ?: [] as $chemin) {
    $nom = basename($chemin);
    if (!is_file($chemin) || !preg_match('/^[\p{L}\p{N}_\-. ]+\.(jpe?g|png|webp)$/iu', $nom)) continue;
    $legende = trim((string) preg_replace(['/\.[a-z]+$/i', '/^\d+[\s_-]*/', '/[_-]+/'], ['', '', ' '], $nom));
    $photos[] = [
        'url' => 'photos/' . rawurlencode($nom) . '?v=' . filemtime($chemin), // une photo remplacée se voit tout de suite
        'legende' => $legende === '' ? 'WOK 888' : mb_strtoupper(mb_substr($legende, 0, 1)) . mb_substr($legende, 1),
    ];
    if (count($photos) >= PHOTOS_MAX) break;
}
echo json_encode(['photos' => $photos], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
