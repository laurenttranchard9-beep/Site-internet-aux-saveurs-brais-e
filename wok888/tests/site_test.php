<?php
// Tests du site de WOK 888. Lancement : php tests/site_test.php
// Le moteur de carte (API, connexion, statistiques) est testé en détail par restaurant/tests/api_test.php :
// ici, on vérifie qu'il est bien identique, puis la carte, les pages et les horaires.

$root = dirname(__DIR__);
$restaurant = dirname($root) . '/restaurant';
$tmp = sys_get_temp_dir() . '/wok888-test-' . bin2hex(random_bytes(4));
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
$adminRestaurant = str_replace('Aux Saveurs Braisées', 'WOK 888', file_get_contents("$restaurant/admin/index.html"));
check('espace de gestion identique, au nom près', file_get_contents("$root/admin/index.html") === $adminRestaurant);

// --- Pas de commande en ligne : on commande par téléphone ---
$retires = ['commande.php', 'inc/commandes.php', 'admin/commandes.html', 'admin/commandes.js', 'admin/commandes.css'];
check('commande en ligne retirée (' . implode(', ', $retires) . ')', !array_filter($retires, fn($f) => file_exists("$root/$f")));
$public = file_get_contents("$root/index.html") . file_get_contents("$root/site.js");
check('ni panier ni commande en ligne sur le site', !preg_match('/commande\.php|panier|Ma commande|commande en ligne/i', $public));

// --- Carte de départ (inc/carte.php) ---
require "$root/inc/carte.php";
$carte = carte();
$notes = carte_notes();
$plats = array_merge(...array_values($carte));
check('34 catégories et 195 produits', count($carte) === 34 && count($plats) === 195);
check('prix en centimes (entiers positifs, ou null = sur demande)', !array_filter($plats, fn($p) => !($p[2] === null || (is_int($p[2]) && $p[2] >= 0))));
// Mêmes limites que l'espace de gestion : sinon un plat ne pourrait plus être modifié tel quel.
check('noms, descriptions et étiquettes dans les limites de la gestion', !array_filter($plats, fn($p) =>
    $p[0] === '' || mb_strlen($p[0]) > 80 || mb_strlen($p[1]) > 300 || mb_strlen($p[3]) > 120));
check('catégories et notes dans les limites de la gestion', !array_filter(array_keys($carte), fn($c) => mb_strlen($c) > 50)
    && !array_filter($notes, fn($n) => mb_strlen($n) > 200) && !array_diff_key($notes, $carte));
$aEtiquette = fn(array $p, string $e) => in_array($e, array_map('trim', explode(',', $p[3])), true);
$wok = $carte['Côté wok'];
check('wok à composer : 6 garnitures, 3 bases, 1 supplément',
    count(array_filter($wok, fn($p) => $p[3] === '')) === 6
    && count(array_filter($wok, fn($p) => $aEtiquette($p, 'Base'))) === 3
    && count(array_filter($wok, fn($p) => $aEtiquette($p, 'Supplément'))) === 1);
check('bases et suppléments seulement dans « Côté wok »', !array_filter(array_diff_key($carte, ['Côté wok' => 1]), fn($items) =>
    array_filter($items, fn($p) => $aEtiquette($p, 'Base') || $aEtiquette($p, 'Supplément'))));
check('4 menus « À la une », dont le Royal 888 à 60 €', count(array_filter($plats, fn($p) => $aEtiquette($p, 'À la une'))) === 4
    && $carte['Menus · Menus japonais'][0][0] === 'Menu Royal 888' && $carte['Menus · Menus japonais'][0][2] === 6000);
check('plus d\'étiquette « Sur place » (carte version 2)', CARTE_VERSION === 2 && !array_filter($plats, fn($p) => $aEtiquette($p, 'Sur place')));
$fautes = ['Seihl', 'mièces', 'Soupede', 'Anghor', 'Cosmopolitain', 'Lorem ipsum', 'Benjiro', 'High Salary', 'Bò Bún Nem aux crevettes + 1,50'];
$textes = file_get_contents("$root/inc/carte.php") . file_get_contents("$root/index.html");
check("fautes et textes de démonstration de l'ancien site absents", !array_filter($fautes, fn($f) => stripos($textes, $f) !== false));

// --- Horaires : les mêmes dans site.js (« Ouvert / Fermé » en direct), le tableau et la fiche Google ---
$siteJs = file_get_contents("$root/site.js");
$index = file_get_contents("$root/index.html");
check('site.js : service de 12h00 à 22h30, fermé le lundi', str_contains($siteJs, 'const SERVICE = [12 * 60, 22 * 60 + 30];')
    && str_contains($siteJs, 'const CRENEAUX = [[SERVICE], [], [SERVICE], [SERVICE], [SERVICE], [SERVICE], [SERVICE]];'));
preg_match_all('#<tr data-jour="(\d)"><th scope="row">\w+</th><td[^>]*>([^<]+)</td></tr>#u', $index, $jours, PREG_SET_ORDER);
$tableau = array_column($jours, 2, 1);
check('tableau des horaires : lundi fermé, 12h00 – 22h30 les autres jours', count($tableau) === 7 && $tableau[1] === 'Fermé'
    && count(array_filter($tableau, fn($h) => $h === '12h00 – 22h30')) === 6);

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
$photoTest = "$root/photos/01-wok-de-test.png";
register_shutdown_function(function () use ($server, $tmp, $photoTest) {
    proc_terminate($server);
    proc_close($server);
    @unlink($photoTest);
    array_map('unlink', glob("$tmp/*"));
    rmdir($tmp);
});
for ($i = 0; $i < 50 && !@fsockopen('127.0.0.1', $port); $i++) usleep(100000);

$cookie = null;
function http(string $path, ?array $body = null, bool $session = true): array
{
    global $port, $cookie;
    $headers = $cookie && $session ? ["Cookie: $cookie"] : [];
    if ($body !== null) $headers[] = 'Content-Type: application/json';
    $ctx = stream_context_create(['http' => [
        'method' => $body === null ? 'GET' : 'POST',
        'header' => implode("\r\n", $headers),
        'content' => $body === null ? '' : json_encode($body),
        'ignore_errors' => true,
    ]]);
    $raw = file_get_contents("http://127.0.0.1:$port/$path", false, $ctx);
    foreach ($http_response_header as $h) {
        if ($session && stripos($h, 'Set-Cookie: ASBSESSID=') === 0) $cookie = explode(';', substr($h, 12))[0];
    }
    return [(int) explode(' ', $http_response_header[0])[1], $raw];
}
$api = function (string $action, ?array $body = null) {
    [$s, $raw] = http("api.php?action=$action", $body);
    return [$s, json_decode($raw, true)];
};

// --- Carte servie par l'API ---
[$s, $menu] = $api('menu');
check('carte publique servie', $s === 200 && count($menu['categories']) === 34);
$produit = [];
foreach ($menu['categories'] as $c) foreach ($c['products'] as $p) $produit[$c['name'] . ' / ' . $p['name']] = $p;
check('« Côté wok » : bases à 0 € et 1,50 €, œuf bio à 2,50 €', $produit['Côté wok / Nouilles']['priceCents'] === 0
    && $produit['Côté wok / Riz sauté aux crevettes et surimi']['priceCents'] === 150 && $produit['Côté wok / Œuf bio']['priceCents'] === 250);

// --- Pages et fichiers ---
foreach (['', 'mentions-legales.html', 'admin/', 'robots.txt', 'sitemap.xml', 'favicon.svg',
    'images/partage.png', 'images/icone-180.png', 'images/icone-512.png'] as $page) {
    check("page /$page accessible", http($page)[0] === 200);
}
foreach (['index.html', 'mentions-legales.html', 'admin/index.html'] as $page) {
    $html = file_get_contents("$root/$page");
    preg_match_all('/(?:src|href)="([^"]+)"/', $html, $m);
    $locaux = array_filter($m[1], fn($u) => !preg_match('#^(https?:|tel:|mailto:|\#|data:)#', $u));
    $base = dirname("$root/$page");
    $manquants = array_filter($locaux, fn($u) => !file_exists($base . '/' . preg_replace('/[?#].*$/', '', $u)));
    check("$page : tous les fichiers liés existent", !$manquants);
    if ($manquants) echo '        manquants : ' . implode(', ', $manquants) . "\n";
    preg_match_all('/href="tel:([^"]+)"/', $html, $t);
    check("$page : numéro de téléphone du restaurant partout", !array_diff($t[1], ['+33561580697']));
    preg_match_all('/href="#([^"]+)"/', $html, $ancres);
    $absentes = array_filter(array_unique($ancres[1]), fn($a) => !str_contains($html, "id=\"$a\""));
    check("$page : ancres internes présentes", !$absentes);
    if ($absentes) echo '        absentes : ' . implode(', ', $absentes) . "\n";
}
preg_match('#<script type="application/ld\+json">(.*?)</script>#s', $index, $ld);
$fiche = json_decode($ld[1] ?? '', true);
check('fiche Google (JSON-LD) valide', is_array($fiche) && $fiche['@type'] === 'Restaurant' && $fiche['telephone'] === '+33 5 61 58 06 97'
    && $fiche['address']['postalCode'] === '31840' && $fiche['openingHoursSpecification'][0]['opens'] === '12:00'
    && $fiche['openingHoursSpecification'][0]['closes'] === '22:30' && !in_array('Monday', $fiche['openingHoursSpecification'][0]['dayOfWeek'], true));
preg_match('#<symbol id="([^"]+)"#', $index, $premier);
preg_match_all('#href="\#([^"]+)"#', $index, $utilises);
preg_match_all('#id="([^"]+)"#', $index, $ids);
check('illustrations et icônes (symboles SVG) toutes définies', !array_diff(array_unique($utilises[1]), $ids[1]));
foreach (['site.css', 'site.js', 'intro.js', 'consentement.js', 'polices/bebas-neue.woff2', 'polices/outfit-latin.woff2',
    'polices/kaushan-script.woff2', 'polices/noto-serif-tc-wok-hei.woff2', 'polices/LICENCE-POLICES.txt'] as $f) {
    check("fichier $f présent", is_file("$root/$f") && filesize("$root/$f") > 0);
}
// Cache : les styles et scripts portent tous la même version (?v=), changée à chaque mise à jour du site
preg_match_all('/(?:href|src)="((?:site|intro|consentement)\.(?:css|js))\?v=(\w+)"/', $index, $versions, PREG_SET_ORDER);
$version = array_unique(array_column($versions, 2));
check('index.html : site.css, intro.js, site.js et consentement.js à la même version', count($versions) === 4 && count($version) === 1);
check('mentions légales : site.css à la même version', $version
    && str_contains(file_get_contents("$root/mentions-legales.html"), 'href="site.css?v=' . reset($version) . '"'));
// Animations : le choix du visiteur (site.js) est lu avant l'affichage (intro.js), sous le même nom
check('choix des animations partagé par intro.js et site.js', str_contains(file_get_contents("$root/intro.js"), '"wok888-animations"')
    && str_contains($siteJs, 'stockage.ecrire("wok888-animations"'));
preg_match_all('/url\((polices\/[^)"\']+)\)/', file_get_contents("$root/site.css"), $u);
check('polices de site.css présentes', count($u[1]) === 4 && !array_filter($u[1], fn($f) => !is_file("$root/$f")));
preg_match_all('/\$\("#([\w-]+)"\)/', $siteJs, $cibles);
$introuvables = array_filter(array_unique($cibles[1]), fn($c) => !str_contains($index, "id=\"$c\""));
check('site.js : tous les éléments visés existent dans la page', !$introuvables);
if ($introuvables) echo '        introuvables : ' . implode(', ', $introuvables) . "\n";

// --- Galerie : les photos déposées dans photos/ ---
[$s, $raw] = http('photos.php');
check('galerie vide sans photo', $s === 200 && json_decode($raw, true) === ['photos' => []]);
copy("$root/images/icone-180.png", $photoTest);
$photos = json_decode(http('photos.php')[1], true)['photos'];
check('photo déposée affichée, avec sa légende', count($photos) === 1 && $photos[0]['legende'] === 'Wok de test'
    && str_starts_with($photos[0]['url'], 'photos/01-wok-de-test.png?v='));
@unlink($photoTest);

// --- Visites (mesure d'audience avec accord) ---
check('compte créé', $api('setup', ['username' => 'patron', 'password' => 'motdepasse-wok888'])[0] === 200);
check('visite comptée', $api('visite', ['visiteur' => str_repeat('e', 32), 'largeur' => 390])[0] === 200 && $api('stats')[1]['visites'] === 1);

echo $failed ? "\n$failed test(s) en échec\n" : "\nTous les tests passent\n";
exit($failed ? 1 : 0);
