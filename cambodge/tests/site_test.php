<?php
// Tests du site Aux Saveurs du Cambodge. Lancement : php tests/site_test.php
// Le moteur (API, connexion, statistiques) est testé en détail par restaurant/tests/api_test.php :
// ici, on vérifie qu'il est bien identique, puis la carte, les pages et les liens propres à ce site.

$root = dirname(__DIR__);
$restaurant = dirname($root) . '/restaurant';
$tmp = sys_get_temp_dir() . '/ascb-test-' . bin2hex(random_bytes(4));
mkdir($tmp);

$failed = 0;
function check(string $name, bool $ok): void
{
    global $failed;
    echo ($ok ? "ok      " : "ÉCHEC   ") . "$name\n";
    if (!$ok) $failed++;
}

// --- Moteur commun avec Aux Saveurs Braisées ---
$communs = ['api.php', 'inc/db.php', 'inc/auth.php', 'inc/stats.php', 'admin/admin.js', 'admin/admin.css'];
$differents = array_filter($communs, fn($f) => @file_get_contents("$root/$f") !== @file_get_contents("$restaurant/$f"));
check('moteur identique à celui du restaurant (' . implode(', ', $communs) . ')', !$differents);
if ($differents) echo '        à synchroniser : ' . implode(', ', $differents) . "\n";
$adminCambodge = file_get_contents("$root/admin/index.html");
$adminRestaurant = str_replace('Aux Saveurs Braisées', 'Aux Saveurs du Cambodge', file_get_contents("$restaurant/admin/index.html"));
check("espace de gestion identique, au nom près", $adminCambodge === $adminRestaurant);

// --- Carte de départ (inc/carte.php) ---
require "$root/inc/carte.php";
$carte = carte();
$notes = carte_notes();
$plats = array_merge(...array_values($carte));
check('16 catégories et 86 plats', count($carte) === 16 && count($plats) === 86);
check('prix entiers en centimes', !array_filter($plats, fn($p) => !is_int($p[2]) || $p[2] <= 0));
// Mêmes limites que l'espace de gestion : sinon un plat ne pourrait plus être modifié tel quel.
check('noms, descriptions et étiquettes dans les limites de la gestion', !array_filter($plats, fn($p) =>
    $p[0] === '' || mb_strlen($p[0]) > 80 || mb_strlen($p[1]) > 300 || mb_strlen($p[3]) > 120));
check('catégories et notes dans les limites de la gestion', !array_filter(array_keys($carte), fn($c) => mb_strlen($c) > 50)
    && !array_filter($notes, fn($n) => mb_strlen($n) > 200) && !array_diff_key($notes, $carte));
$fautes = ['Cammandez', 'DIAMNCHE', 'champion', 'criton', 'crevttes', 'crostilliant', 'ACCOMPAGENEMTS', 'beigent', 'papilotte', 'Pât Thaï'];
$textes = file_get_contents("$root/inc/carte.php") . file_get_contents("$root/index.html");
check("fautes de l'ancien site corrigées", !array_filter($fautes, fn($f) => stripos($textes, $f) !== false));

// --- Serveur de test ---
function port_libre(): int
{
    $s = stream_socket_server('tcp://127.0.0.1:0');
    $port = (int) substr(strrchr(stream_socket_get_name($s, false), ':'), 1);
    fclose($s);
    return $port;
}
$port = port_libre();
putenv("ASB_DB_FILE=$tmp/test.sqlite");
$server = proc_open([PHP_BINARY, '-S', "127.0.0.1:$port", '-t', $root],
    [1 => ['file', '/dev/null', 'w'], 2 => ['file', '/dev/null', 'w']], $pipes);
register_shutdown_function(function () use ($server, $tmp) {
    proc_terminate($server);
    proc_close($server);
    array_map('unlink', glob("$tmp/*"));
    rmdir($tmp);
});
for ($i = 0; $i < 50 && !@fsockopen('127.0.0.1', $port); $i++) usleep(100000);

$cookie = null;
function http(string $path, ?array $body = null): array
{
    global $port, $cookie;
    $headers = $cookie ? ["Cookie: $cookie"] : [];
    if ($body !== null) $headers[] = 'Content-Type: application/json';
    $ctx = stream_context_create(['http' => [
        'method' => $body === null ? 'GET' : 'POST',
        'header' => implode("\r\n", $headers),
        'content' => $body === null ? '' : json_encode($body),
        'ignore_errors' => true,
    ]]);
    $raw = file_get_contents("http://127.0.0.1:$port/$path", false, $ctx);
    foreach ($http_response_header as $h) {
        if (stripos($h, 'Set-Cookie: ASBSESSID=') === 0) $cookie = explode(';', substr($h, 12))[0];
    }
    return [(int) explode(' ', $http_response_header[0])[1], $raw];
}
$api = fn(string $action, ?array $body = null) => (function () use ($action, $body) {
    [$s, $raw] = http("api.php?action=$action", $body);
    return [$s, json_decode($raw, true)];
})();

// --- Carte servie par l'API ---
[$s, $menu] = $api('menu');
check('carte publique servie', $s === 200 && count($menu['categories']) === 16);
$premiere = $menu['categories'][0];
check('« Menu bon et pas cher » en tête, avec sa note', $premiere['name'] === 'Menu bon et pas cher' && $premiere['note'] === 'Disponible dès maintenant !');
$vedettes = array_values(array_filter(array_merge(...array_column($menu['categories'], 'products')), fn($p) => in_array('À la une', $p['tags'], true)));
check('trois plats « À la une » (10 €, 10 €, 2,50 €)', array_column($vedettes, 'priceCents') === [1000, 1000, 250]);
$avecRiz = array_filter($menu['categories'], fn($c) => str_starts_with($c['note'], 'Servis avec du riz nature'));
check('note « riz nature » sur les 8 catégories de plats', count($avecRiz) === 8);

// --- Pages et fichiers ---
foreach (['', 'mentions-legales.html', 'admin/', 'robots.txt', 'sitemap.xml', 'favicon.svg', 'images/partage.png'] as $page) {
    check("page /$page accessible", http($page)[0] === 200);
}
foreach (['index.html', 'mentions-legales.html', 'admin/index.html'] as $page) {
    $html = file_get_contents("$root/$page");
    preg_match_all('/(?:src|href)="([^"]+)"/', $html, $m);
    $locaux = array_filter($m[1], fn($u) => !preg_match('#^(https?:|tel:|mailto:|\#|data:)#', $u));
    $base = dirname("$root/$page");
    $manquants = array_filter($locaux, function ($u) use ($base) {
        $chemin = $base . '/' . preg_replace('/[?#].*$/', '', $u);
        return !file_exists($chemin);
    });
    check("$page : tous les fichiers liés existent", !$manquants);
    if ($manquants) echo '        manquants : ' . implode(', ', $manquants) . "\n";
    // Partout le même numéro pour commander ; les mentions légales donnent aussi celui de l'hébergeur (OVH).
    preg_match_all('/href="tel:([^"]+)"/', $html, $t);
    $permis = $page === 'mentions-legales.html' ? ['+33759525341', '+33972101007'] : ['+33759525341'];
    check("$page : numéro de téléphone du restaurant partout", !array_diff($t[1], $permis));
}
$index = file_get_contents("$root/index.html");
preg_match('#<script type="application/ld\+json">(.*?)</script>#s', $index, $ld);
$fiche = json_decode($ld[1] ?? '', true);
check('fiche Google (JSON-LD) valide', is_array($fiche) && $fiche['@type'] === 'Restaurant' && $fiche['telephone'] === '+33 7 59 52 53 41'
    && $fiche['address']['postalCode'] === '31140' && count($fiche['openingHoursSpecification']) === 2);
foreach (['site.css', 'polices/anton-latin.woff2', 'polices/inter-latin.woff2', 'polices/inter-vietnamien.woff2', 'polices/caveat-600.woff2'] as $f) {
    check("fichier $f présent", is_file("$root/$f") && filesize("$root/$f") > 0);
}
preg_match_all('/url\(([^)"\']+)\)/', file_get_contents("$root/site.css"), $u);
check('polices de site.css présentes', !array_filter($u[1], fn($f) => !str_starts_with($f, 'data:') && !is_file("$root/$f")));

// --- Gestion (le détail est testé côté restaurant) ---
[$s, $b] = $api('me');
check('premier lancement : création du compte demandée', $s === 401 && $b['needsSetup'] === true);
check('compte créé', $api('setup', ['username' => 'patron', 'password' => 'motdepasse-cambodge'])[0] === 200);
$nems = array_values(array_filter($api('products')[1]['products'], fn($p) => $p['name'] === 'Nems au porc'))[0];
check('prix modifié depuis la gestion', $api('product-update', ['id' => $nems['id'], 'priceCents' => 720])[1]['priceCents'] === 720);
$carteMaj = array_merge(...array_column($api('menu')[1]['categories'], 'products'));
check('nouveau prix visible sur la carte', array_values(array_filter($carteMaj, fn($p) => $p['id'] === $nems['id']))[0]['priceCents'] === 720);
check("note d'une catégorie modifiable", $api('category-update', ['id' => $premiere['id'], 'note' => 'Tous les jours'])[1]['note'] === 'Tous les jours');
check('visite comptée', $api('visite', ['visiteur' => str_repeat('e', 32), 'largeur' => 390])[0] === 200 && $api('stats')[1]['visites'] === 1);

echo $failed ? "\n$failed test(s) en échec\n" : "\nTous les tests passent\n";
exit($failed ? 1 : 0);
