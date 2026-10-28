<?php
// Tests du site de WOK 888. Lancement : php tests/site_test.php
// Le moteur de carte (API, connexion, statistiques) est testé en détail par restaurant/tests/api_test.php :
// ici, on vérifie qu'il est bien identique, puis la carte, les pages, les horaires et la commande en ligne.

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
$lienCommandes = "          <a class=\"btn primary small\" href=\"commandes.html\">Commandes en ligne</a>\n";
$adminWok = str_replace($lienCommandes, '', file_get_contents("$root/admin/index.html"));
$adminRestaurant = str_replace('Aux Saveurs Braisées', 'WOK 888', file_get_contents("$restaurant/admin/index.html"));
check("espace de gestion identique, au nom et au lien « Commandes en ligne » près", $adminWok === $adminRestaurant);

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
$boissons = array_merge(...array_values(array_filter($carte, fn($c) => str_starts_with($c, 'Boissons · '), ARRAY_FILTER_USE_KEY)));
check('boissons servies sur place (pas de commande en ligne)', $boissons && !array_filter($boissons, fn($p) => !$aEtiquette($p, 'Sur place')));
$fautes = ['Seihl', 'mièces', 'Soupede', 'Anghor', 'Cosmopolitain', 'Lorem ipsum', 'Benjiro', 'High Salary', 'Bò Bún Nem aux crevettes + 1,50'];
$textes = file_get_contents("$root/inc/carte.php") . file_get_contents("$root/index.html");
check("fautes et textes de démonstration de l'ancien site absents", !array_filter($fautes, fn($f) => stripos($textes, $f) !== false));

// --- Horaires et créneaux de retrait (sans serveur) ---
require "$root/inc/commandes.php";
$paris = new DateTimeZone('Europe/Paris');
$a = fn(string $quand) => new DateTimeImmutable($quand, $paris);
check('lundi : fermé, ouvre le lendemain', statut_ouverture($a('2026-10-26 15:00'))['texte'] === 'Fermé · ouvre demain à 12h00');
check('mardi matin : ouvre à midi', statut_ouverture($a('2026-10-27 11:00'))['texte'] === 'Fermé · ouvre à 12h00');
check('mardi 19h : ouvert', statut_ouverture($a('2026-10-27 19:00')) === ['ouvert' => true, 'texte' => "Ouvert · jusqu'à 22h30"]);
check('mardi 22h10 : ferme bientôt', statut_ouverture($a('2026-10-27 22:10'))['texte'] === 'Ferme bientôt · à 22h30');
check('dimanche soir : rouvre mardi', statut_ouverture($a('2026-11-01 23:00'))['texte'] === 'Fermé · ouvre mardi à 12h00');
$creneaux = creneaux_retrait($a('2026-10-27 19:02'));
check('retrait au plus tôt 20 min après, de quart d\'heure en quart d\'heure jusqu\'à 22h15',
    count($creneaux) === 12 && $creneaux[0]['libelle'] === '19h30' && end($creneaux)['libelle'] === '22h15');
check('commande avant l\'ouverture : premier retrait à 12h15', creneaux_retrait($a('2026-10-27 10:00'))[0]['libelle'] === '12h15');
check('pas de retrait le lundi ni après 21h55', !creneaux_retrait($a('2026-10-26 18:00')) && !creneaux_retrait($a('2026-10-27 22:00')));
$changement = creneaux_retrait($a('2026-10-25 21:30')); // jour du passage à l'heure d'hiver
check("créneaux justes le jour du changement d'heure", $changement && heure_de($changement[0]['valeur']) === $changement[0]['libelle']);

// --- Serveur de test (mardi 27 octobre 2026, 19h02) ---
function port_libre(): int
{
    $s = stream_socket_server('tcp://127.0.0.1:0');
    $port = (int) substr(strrchr(stream_socket_get_name($s, false), ':'), 1);
    fclose($s);
    return $port;
}
$port = port_libre();
putenv("ASB_DB_FILE=$tmp/test.sqlite");
putenv('WOK_MAINTENANT=' . $a('2026-10-27 19:02')->getTimestamp());
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
$commande = function (string $action, ?array $body = null, bool $session = true) {
    [$s, $raw] = http("commande.php?action=$action", $body, $session);
    return [$s, json_decode($raw, true)];
};

// --- Carte servie par l'API ---
[$s, $menu] = $api('menu');
check('carte publique servie', $s === 200 && count($menu['categories']) === 34);
$produit = [];
foreach ($menu['categories'] as $c) foreach ($c['products'] as $p) $produit[$c['name'] . ' / ' . $p['name']] = $p;
$id = fn(string $nom) => $produit[$nom]['id'];
check('« Côté wok » : bases à 0 € et 1,50 €, œuf bio à 2,50 €', $produit['Côté wok / Nouilles']['priceCents'] === 0
    && $produit['Côté wok / Riz sauté aux crevettes et surimi']['priceCents'] === 150 && $produit['Côté wok / Œuf bio']['priceCents'] === 250);

// --- Pages et fichiers ---
foreach (['', 'mentions-legales.html', 'admin/', 'admin/commandes.html', 'robots.txt', 'sitemap.xml', 'favicon.svg',
    'images/partage.png', 'images/icone-180.png', 'images/icone-512.png'] as $page) {
    check("page /$page accessible", http($page)[0] === 200);
}
foreach (['index.html', 'mentions-legales.html', 'admin/index.html', 'admin/commandes.html'] as $page) {
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
$index = file_get_contents("$root/index.html");
preg_match('#<script type="application/ld\+json">(.*?)</script>#s', $index, $ld);
$fiche = json_decode($ld[1] ?? '', true);
check('fiche Google (JSON-LD) valide', is_array($fiche) && $fiche['@type'] === 'Restaurant' && $fiche['telephone'] === '+33 5 61 58 06 97'
    && $fiche['address']['postalCode'] === '31840' && $fiche['openingHoursSpecification'][0]['closes'] === '22:30');
preg_match('#<symbol id="([^"]+)"#', $index, $premier);
preg_match_all('#href="\#([^"]+)"#', $index, $utilises);
preg_match_all('#id="([^"]+)"#', $index, $ids);
check('illustrations et icônes (symboles SVG) toutes définies', !array_diff(array_unique($utilises[1]), $ids[1]));
foreach (['site.css', 'site.js', 'intro.js', 'consentement.js', 'polices/bebas-neue.woff2', 'polices/outfit-latin.woff2',
    'polices/kaushan-script.woff2', 'polices/noto-serif-tc-wok-hei.woff2', 'polices/LICENCE-POLICES.txt'] as $f) {
    check("fichier $f présent", is_file("$root/$f") && filesize("$root/$f") > 0);
}
preg_match_all('/url\((polices\/[^)"\']+)\)/', file_get_contents("$root/site.css"), $u);
check('polices de site.css présentes', count($u[1]) === 4 && !array_filter($u[1], fn($f) => !is_file("$root/$f")));
preg_match_all('/\$\("#([\w-]+)"\)/', file_get_contents("$root/site.js"), $cibles);
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

// --- Commande en ligne ---
[$s, $etat] = $commande('etat');
check('état public : ouvert, mardi, commande en attente de l\'écran de réception', $s === 200 && $etat['statut']['ouvert'] === true
    && $etat['jour'] === 2 && $etat['commande'] === ['possible' => false, 'raison' => 'reception', 'creneaux' => []]);
[$s] = $commande('liste');
check('écran de réception : connexion requise', $s === 401);
check('compte créé', $api('setup', ['username' => 'patron', 'password' => 'motdepasse-wok888'])[0] === 200);
[$s, $liste] = $commande('liste');
check("écran ouvert : la commande en ligne s'ouvre", $s === 200 && $liste['etat']['possible'] === true && $liste['actives'] === true);
[, $etat] = $commande('etat', null, false);
$retrait = $etat['commande']['creneaux'][0]['valeur'];
check('créneaux proposés aux clients, dès 19h30', $etat['commande']['possible'] === true && $etat['commande']['creneaux'][0]['libelle'] === '19h30');

$wokCrevettes = ['id' => $id('Côté wok / Wok aux crevettes'), 'quantite' => 2,
    'options' => [$id('Côté wok / Riz sauté aux crevettes et surimi'), $id('Côté wok / Œuf bio')]];
$nems = ['id' => $id('Entrées · Tapas à partager / Nem au porc'), 'quantite' => 4];
$client = ['nom' => 'Camille', 'telephone' => '+33 6 12 34 56 78', 'retrait' => $retrait, 'note' => 'Sans coriandre', 'site' => ''];
$envoyer = fn(array $articles, array $changements = []) => $commande('envoyer', ['articles' => $articles] + $changements + $client, false);

[$s, $r] = $envoyer([$wokCrevettes, $nems]);
check('commande envoyée : n° 1, prix recalculé par le serveur (2 × 21,90 € + 4 × 1,60 €)', $s === 200 && $r['numero'] === 1
    && $r['totalCents'] === 5020 && $r['retraitTexte'] === '19h30' && preg_match('/^[a-f0-9]{32}$/', $r['jeton']));
$jeton = $r['jeton'];
[$s, $suivi] = $commande("suivi&jeton=$jeton", null, false);
check('suivi par le client : nouvelle, détail du wok, sans le téléphone', $s === 200 && $suivi['statut'] === 'nouvelle'
    && $suivi['articles'][0]['details'] === 'Riz sauté aux crevettes et surimi · Œuf bio' && !isset($suivi['telephone']));
check('suivi : commande inconnue', $commande('suivi&jeton=' . str_repeat('0', 32), null, false)[0] === 404);

$refus = [
    'wok sans base' => [[['id' => $wokCrevettes['id'], 'quantite' => 1]], [], 400],
    'base seule' => [[['id' => $id('Côté wok / Nouilles'), 'quantite' => 1]], [], 400],
    'deux bases' => [[['id' => $wokCrevettes['id'], 'quantite' => 1, 'options' => [$id('Côté wok / Nouilles'), $id('Côté wok / Riz nature')]]], [], 400],
    'option d\'une autre catégorie' => [[['id' => $wokCrevettes['id'], 'quantite' => 1, 'options' => [$id('Côté wok / Nouilles'), $nems['id']]]], [], 409],
    'option sur un plat simple' => [[['id' => $nems['id'], 'quantite' => 1, 'options' => [$id('Côté wok / Œuf bio')]]], [], 409],
    'boisson sur place' => [[['id' => $id('Boissons · Cocktails / Mojito'), 'quantite' => 1]], [], 409],
    'quantité nulle' => [[['id' => $nems['id'], 'quantite' => 0]], [], 400],
    'panier vide' => [[], [], 400],
    'produit inconnu' => [[['id' => 99999, 'quantite' => 1]], [], 409],
    'téléphone invalide' => [[$nems], ['telephone' => '12'], 400],
    'nom manquant' => [[$nems], ['nom' => ' '], 400],
    'créneau inconnu' => [[$nems], ['retrait' => 123], 409],
    'robot (champ piège rempli)' => [[$nems], ['site' => 'http://spam.example'], 400],
];
foreach ($refus as $cas => [$articles, $changements, $attendu]) {
    check("commande refusée : $cas", $envoyer($articles, $changements)[0] === $attendu);
}

// Stocks suivis : la commande les réserve, l'annulation les rend
$api('product-update', ['id' => $nems['id'], 'stock' => 3]);
[$s, $r] = $envoyer([$nems]);
check('stock insuffisant : commande refusée avec le nombre restant', $s === 409 && str_contains($r['error'], 'Il ne reste que 3'));
[$s, $r2] = $envoyer([['id' => $nems['id'], 'quantite' => 3]]);
$stock = fn() => array_values(array_filter($api('products')[1]['products'], fn($p) => $p['id'] === $nems['id']))[0]['stock'];
check('stock réservé par la commande', $s === 200 && $r2['numero'] === 2 && $stock() === 0);
check('plat épuisé sur la carte', array_values(array_filter(array_merge(...array_column($api('menu')[1]['categories'], 'products')),
    fn($p) => $p['id'] === $nems['id']))[0]['soldOut'] === true);
$id2 = array_values(array_filter($commande('liste')[1]['commandes'], fn($c) => $c['numero'] === 2))[0]['id'];
[$s, $annulee] = $commande('statut', ['id' => $id2, 'statut' => 'annulee']);
check('annulation par le restaurant : stock rendu', $s === 200 && $annulee['statut'] === 'annulee' && $stock() === 3);
check('commande annulée : définitive', $commande('statut', ['id' => $id2, 'statut' => 'acceptee'])[0] === 409);

// Statuts vus par le client
$id1 = array_values(array_filter($commande('liste')[1]['commandes'], fn($c) => $c['numero'] === 1))[0]['id'];
check('statut inconnu refusé', $commande('statut', ['id' => $id1, 'statut' => 'livree'])[0] === 400);
check('statut changé sans connexion : refusé', $commande('statut', ['id' => $id1, 'statut' => 'acceptee'], false)[0] === 401);
$commande('statut', ['id' => $id1, 'statut' => 'acceptee']);
check('le client voit sa commande acceptée', $commande("suivi&jeton=$jeton", null, false)[1]['statut'] === 'acceptee');
[, $liste] = $commande('liste');
check("écran de réception : téléphone, précisions et heure de commande", $liste['commandes'][0]['telephone'] === '06 12 34 56 78'
    && $liste['commandes'][0]['note'] === 'Sans coriandre' && $liste['commandes'][0]['creeTexte'] === '19h02');

// Interrupteur de la commande en ligne
[$s, $r] = $commande('reglages', ['actives' => false]);
check('commande en ligne fermée par le restaurant', $s === 200 && $r['etat']['raison'] === 'desactivee'
    && $commande('etat', null, false)[1]['commande']['possible'] === false);
check('commande refusée quand la commande en ligne est fermée', $envoyer([$nems])[0] === 409);
$commande('reglages', ['actives' => true]);

// Pas plus de 5 commandes par appareil et par heure (2 déjà passées)
$api('product-update', ['id' => $nems['id'], 'stock' => null]);
$envoyer([$nems]);
$envoyer([$nems]);
$envoyer([$nems]);
[$s, $r] = $envoyer([$nems]);
check('6e commande dans l\'heure depuis le même appareil : refusée', $s === 429);

// Visites (mesure d'audience avec accord)
check('visite comptée', $api('visite', ['visiteur' => str_repeat('e', 32), 'largeur' => 390])[0] === 200 && $api('stats')[1]['visites'] === 1);

echo $failed ? "\n$failed test(s) en échec\n" : "\nTous les tests passent\n";
exit($failed ? 1 : 0);
