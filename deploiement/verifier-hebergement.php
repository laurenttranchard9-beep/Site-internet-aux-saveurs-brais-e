<?php
// Vérification d'un hébergement web mutualisé (IONOS, OVH, o2switch…), ajoutée aux paquets de paquets-hebergement.sh
// sous le nom verifier.php : à ouvrir une fois les fichiers envoyés. Si tout est bon, la page s'efface d'elle-même.
declare(strict_types=1);
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');

$resultats = []; // [réussi, essentiel, nom, détail]
function controle(array &$r, bool $reussi, bool $essentiel, string $nom, string $detail): void
{
    $r[] = [$reussi, $essentiel, $nom, $detail];
}

$phpOk = version_compare(PHP_VERSION, '8.1', '>=');
controle($resultats, $phpOk, true, 'Version de PHP', 'PHP ' . PHP_VERSION
    . ($phpOk ? '' : ' : choisissez PHP 8.1 ou plus récent dans votre espace client (IONOS : Hébergement, puis PHP).'));
$sqliteOk = extension_loaded('pdo_sqlite');
controle($resultats, $sqliteOk, true, 'Base de données SQLite', $sqliteOk ? 'disponible'
    : "absente : demandez à l'hébergeur d'activer l'extension PHP « pdo_sqlite », ou choisissez une autre version de PHP.");
controle($resultats, extension_loaded('mbstring'), true, 'Extension PHP mbstring', extension_loaded('mbstring') ? 'disponible'
    : "absente : demandez à l'hébergeur d'activer l'extension « mbstring ».");

$donnees = __DIR__ . '/data';
$essai = $donnees . '/verification-' . bin2hex(random_bytes(6));
$ecriture = is_dir($donnees) && @file_put_contents($essai . '.txt', 'ok') === 2;
@unlink($essai . '.txt');
controle($resultats, $ecriture, true, 'Dossier data/ en écriture', $ecriture ? 'oui'
    : "non : vérifiez que le dossier data/ a bien été envoyé, puis donnez-lui les droits d'écriture (FileZilla : clic droit sur data, Droits d'accès au fichier, 755).");

$baseOk = false;
$erreur = '';
if ($sqliteOk && $ecriture) {
    try {
        $pdo = new PDO('sqlite:' . $essai . '.sqlite', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        $pdo->exec('CREATE TABLE essai (x INTEGER)');
        $pdo->exec('INSERT INTO essai VALUES (1)');
        $baseOk = (int) $pdo->query('SELECT COUNT(*) FROM essai')->fetchColumn() === 1;
        $pdo = null;
    } catch (Throwable $e) {
        $erreur = $e->getMessage();
    }
    @unlink($essai . '.sqlite');
}
controle($resultats, $baseOk, true, 'Base de données de test', $baseOk ? 'créée, lue puis supprimée'
    : ($erreur !== '' ? 'erreur : ' . $erreur : 'impossible tant que les points ci-dessus ne sont pas réglés'));

$sessionOk = @session_start();
if ($sessionOk) session_destroy();
controle($resultats, $sessionOk, true, "Sessions PHP (connexion à l'espace de gestion)", $sessionOk ? 'disponibles'
    : "indisponibles : signalez-le à l'hébergeur.");

$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
controle($resultats, $https, false, 'Adresse sécurisée (https)', $https ? 'oui'
    : "non : ouvrez cette page avec https:// ; si cela ne marche pas, activez le certificat SSL du domaine dans votre espace client.");

$toutBon = !array_filter($resultats, fn($r) => $r[1] && !$r[0]);
$efface = $toutBon && @unlink(__FILE__);
?>
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>Vérification de l'hébergement</title>
<style>
  body { margin: 0; padding: 32px 16px; font: 16px/1.5 system-ui, sans-serif; background: #f4f7f5; color: #1d2b24; }
  main { max-width: 680px; margin: 0 auto; }
  h1 { font-size: 1.5rem; margin: 0 0 16px; }
  ul { list-style: none; padding: 0; margin: 0 0 24px; display: grid; gap: 10px; }
  li { background: #fff; border: 1px solid #d9e4dd; border-radius: 12px; padding: 12px 16px; }
  li strong { display: block; }
  .ok strong::before { content: "✔ "; color: #1f8a4c; }
  .ko strong::before { content: "✖ "; color: #c0392b; }
  .attention strong::before { content: "! "; color: #b9770e; }
  .bilan { padding: 16px; border-radius: 12px; background: #e3f3ea; border: 1px solid #9fd3b4; }
  .bilan.ko { background: #fdecea; border-color: #f0b4ad; }
  a { color: #12784e; font-weight: 600; }
</style>
</head>
<body>
<main>
  <h1>Vérification de l'hébergement</h1>
  <ul>
<?php foreach ($resultats as [$reussi, $essentiel, $nom, $detail]): ?>
    <li class="<?= $reussi ? 'ok' : ($essentiel ? 'ko' : 'attention') ?>"><strong><?= htmlspecialchars($nom) ?></strong><?= htmlspecialchars($detail) ?></li>
<?php endforeach; ?>
  </ul>
<?php if ($toutBon): ?>
  <p class="bilan">Tout est prêt.<?= $efface ? ' Cette page de vérification vient de se supprimer.' : ' Supprimez maintenant le fichier verifier.php.' ?><br />
    Ouvrez tout de suite <a href="admin/">l'espace de gestion</a> pour créer votre compte, puis <a href="./">la carte</a>.<br />
    Dernier contrôle : <a href="data/">le dossier data/</a> doit afficher « Forbidden » (accès interdit).</p>
<?php else: ?>
  <p class="bilan ko">Réglez les points marqués ✖, puis rechargez cette page.</p>
<?php endif; ?>
</main>
</body>
</html>
