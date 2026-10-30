<?php
// Vérifie que l'hébergement convient au site : version de PHP, SQLite, dossier data/ inscriptible, base de données.
// Après l'envoi des fichiers, ouvrez https://votre-domaine/verification.php. Vous pouvez ensuite supprimer ce fichier.
// Écrit sans syntaxe récente de PHP, pour pouvoir signaler une version trop ancienne.

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');

$verifs = array();

$versionOk = version_compare(PHP_VERSION, '8.1', '>=');
$verifs[] = array('PHP 8.1 ou plus récent', $versionOk,
    'Version actuelle : ' . PHP_MAJOR_VERSION . '.' . PHP_MINOR_VERSION . ($versionOk ? '.' : '. Choisissez PHP 8.2 ou plus dans les réglages de l\'hébergement.'));

$sqliteOk = false;
if (extension_loaded('pdo_sqlite')) {
    try {
        $test = new PDO('sqlite::memory:');
        $sqliteOk = $test->query('SELECT 1')->fetchColumn() == 1;
    } catch (Exception $e) {
        $sqliteOk = false;
    }
}
$verifs[] = array('Base de données SQLite', $sqliteOk,
    $sqliteOk ? 'Disponible.' : 'Absente : demandez au support de l\'hébergeur d\'activer l\'extension PHP « pdo_sqlite ».');

$mbOk = extension_loaded('mbstring');
$verifs[] = array('Caractères accentués (mbstring)', $mbOk,
    $mbOk ? 'Disponible.' : 'Absente : demandez au support de l\'hébergeur d\'activer l\'extension PHP « mbstring ».');

$dossier = __DIR__ . '/data';
$ecritureOk = false;
if (is_dir($dossier)) {
    $essai = $dossier . '/essai-' . bin2hex(random_bytes(4)) . '.tmp';
    $ecritureOk = @file_put_contents($essai, 'ok') === 2;
    if ($ecritureOk) @unlink($essai);
}
$verifs[] = array('Dossier data/ accessible en écriture', $ecritureOk,
    $ecritureOk ? 'La carte et les comptes pourront y être enregistrés.' : 'Donnez les droits d\'écriture au dossier « data » (droits 755 ou 775 dans le logiciel FTP).');

// La base elle-même : création au premier passage, puis chargement de la carte.
$baseOk = false;
$detailBase = 'Vérification impossible tant qu\'un point ci-dessus est en échec.';
if ($versionOk && $sqliteOk && $mbOk && $ecritureOk) {
    try {
        require __DIR__ . '/inc/db.php';
        $pdo = db();
        $nbCategories = (int) $pdo->query('SELECT COUNT(*) FROM categories')->fetchColumn();
        $nbPlats = (int) $pdo->query('SELECT COUNT(*) FROM products')->fetchColumn();
        $baseOk = $nbPlats > 0;
        $detailBase = "Carte chargée : $nbCategories catégories, $nbPlats plats.";
    } catch (Throwable $e) {
        $detailBase = 'Erreur : ' . $e->getMessage();
    }
}
$verifs[] = array('Base de données du site', $baseOk, $detailBase);

$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['SERVER_PORT'] ?? '') == 443
    || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
$toutOk = $versionOk && $sqliteOk && $mbOk && $ecritureOk && $baseOk;
$h = function ($texte) { return htmlspecialchars($texte, ENT_QUOTES, 'UTF-8'); };
?>
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="robots" content="noindex" />
<title>Vérification de l'hébergement · Aux Saveurs Braisées</title>
<style>
  body { margin: 0; background: #fbf6ef; color: #2a211c; font: 16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  main { width: min(680px, 100% - 32px); margin: 40px auto; }
  h1 { font-size: 1.6rem; margin: 0 0 6px; }
  .intro { color: #74675d; margin: 0 0 24px; }
  ul { list-style: none; padding: 0; margin: 0; background: #fff; border: 1px solid #e2d6c6; border-radius: 14px; }
  li { display: flex; gap: 14px; padding: 14px 18px; border-bottom: 1px solid #e2d6c6; }
  li:last-child { border-bottom: 0; }
  .icone { flex: none; width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; color: #fff; font-weight: 800; }
  .ok .icone { background: #2f9e44; }
  .non .icone { background: #c92a2a; }
  strong { display: block; }
  small { color: #74675d; font-size: .92rem; }
  .bilan { margin: 22px 0 0; padding: 16px 18px; border-radius: 14px; font-weight: 600; }
  .bilan.ok { background: #e6f4ea; color: #1e6b32; }
  .bilan.non { background: #fdecea; color: #a61e1e; }
  a { color: #c4470a; font-weight: 700; }
  .suite { margin-top: 18px; color: #74675d; font-size: .95rem; }
</style>
</head>
<body>
<main>
  <h1>Vérification de l'hébergement</h1>
  <p class="intro">Aux Saveurs Braisées · ce que le site demande à l'hébergeur.</p>
  <ul>
<?php foreach ($verifs as $v): ?>
    <li class="<?= $v[1] ? 'ok' : 'non' ?>">
      <span class="icone" aria-hidden="true"><?= $v[1] ? '✓' : '✗' ?></span>
      <span><strong><?= $h($v[0]) ?> : <?= $v[1] ? 'oui' : 'non' ?></strong><small><?= $h($v[2]) ?></small></span>
    </li>
<?php endforeach; ?>
  </ul>
<?php if ($toutOk): ?>
  <p class="bilan ok">Tout est prêt. Ouvrez maintenant <a href="admin/">l'espace de gestion</a> pour créer votre compte, avant que quelqu'un d'autre ne le fasse.</p>
<?php else: ?>
  <p class="bilan non">Le site ne peut pas encore fonctionner ici : corrigez les points marqués ✗, puis rechargez cette page.</p>
<?php endif; ?>
  <p class="suite">
    Connexion <?= $https ? 'sécurisée (HTTPS) : parfait.' : 'non sécurisée (HTTP) : activez le certificat SSL du domaine chez l\'hébergeur, puis utilisez l\'adresse en https://.' ?><br />
    Dernier contrôle : <a href="inc/db.php">ce lien</a> doit afficher une erreur « Forbidden » (accès interdit). Sinon, le fichier <code>.htaccess</code> n'a pas été envoyé.<br />
    Une fois tout vérifié, vous pouvez supprimer le fichier <code>verification.php</code>.
  </p>
</main>
</body>
</html>
