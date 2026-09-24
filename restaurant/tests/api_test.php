<?php
// Tests de l'API. Lancement : php tests/api_test.php
// Démarre un serveur PHP temporaire avec une base de données jetable.

$root = dirname(__DIR__);
$tmp = sys_get_temp_dir() . '/asb-test-' . bin2hex(random_bytes(4));
mkdir($tmp);
$dbFile = "$tmp/test.sqlite";
$port = 8765;
putenv("ASB_DB_FILE=$dbFile");
$server = proc_open(
    [PHP_BINARY, '-S', "127.0.0.1:$port", '-t', $root],
    [1 => ['file', '/dev/null', 'w'], 2 => ['file', '/dev/null', 'w']],
    $pipes
);
register_shutdown_function(function () use ($server, $tmp) {
    proc_terminate($server);
    array_map('unlink', glob("$tmp/*"));
    rmdir($tmp);
});
for ($i = 0; $i < 50 && !@fsockopen('127.0.0.1', $port); $i++) usleep(100000);

$cookie = null;
function call(string $action, ?array $body = null, bool $auth = true): array
{
    global $port, $cookie;
    $headers = [];
    if ($auth && $cookie) $headers[] = "Cookie: $cookie";
    if ($body !== null) $headers[] = 'Content-Type: application/json';
    $ctx = stream_context_create(['http' => [
        'method' => $body === null ? 'GET' : 'POST',
        'header' => implode("\r\n", $headers),
        'content' => $body === null ? '' : json_encode($body),
        'ignore_errors' => true,
    ]]);
    $raw = file_get_contents("http://127.0.0.1:$port/api.php?action=$action", false, $ctx);
    $status = (int) explode(' ', $http_response_header[0])[1];
    $setCookie = null;
    foreach ($http_response_header as $h) {
        if (stripos($h, 'Set-Cookie: ASBSESSID=') === 0) $setCookie = $h;
    }
    if ($auth && $setCookie) $cookie = explode(';', substr($setCookie, 12))[0];
    return [$status, json_decode($raw, true), $setCookie];
}

$failed = 0;
function check(string $name, bool $ok): void
{
    global $failed;
    echo ($ok ? "ok      " : "ÉCHEC   ") . "$name\n";
    if (!$ok) $failed++;
}
function items(array $menu): array
{
    return array_merge(...array_column($menu['categories'], 'products'));
}

// --- Carte publique ---
[$s, $menu] = call('menu', null, false);
check('la carte publique est accessible sans connexion', $s === 200 && count($menu['categories']) === 17);
check('les plats suivent l\'ordre de la carte', $menu['categories'][0]['products'][0]['name'] === 'Formule midi : Entrée + Plat + Dessert'
    && $menu['categories'][0]['name'] === 'Formules');
$cote = array_values(array_filter(items($menu), fn($x) => str_starts_with($x['name'], 'Côte de bœuf')))[0];
check('prix sur demande pour la côte de bœuf', $cote['priceCents'] === null);
check('carte complète chargée', count(items($menu)) === 118);

// --- Premier lancement ---
[$s, $b] = call('me', null, false);
check('premier lancement : création du compte demandée', $s === 401 && $b['needsSetup'] === true);
check('gestion refusée sans connexion', call('products', null, false)[0] === 401);
check('mot de passe trop court refusé', call('setup', ['username' => 'admin', 'password' => 'court'])[0] === 400);
[$s, , $sc] = call('setup', ['username' => 'admin', 'password' => 'motdepasse-test']);
check('compte administrateur créé', $s === 200);
check('cookie de session HttpOnly et SameSite=Strict', stripos($sc, 'httponly') !== false && stripos($sc, 'samesite=strict') !== false);
check('connecté après la création du compte', call('me')[1]['username'] === 'admin');
check('un second compte ne peut pas être créé', call('setup', ['username' => 'pirate', 'password' => 'motdepasse-pirate'], false)[0] === 403);

// --- Connexion ---
call('logout', []);
check('déconnecté', call('products')[0] === 401);
check('mauvais mot de passe refusé', call('login', ['username' => 'admin', 'password' => 'faux'], false)[0] === 401);
check('bon mot de passe accepté', call('login', ['username' => 'admin', 'password' => 'motdepasse-test'])[0] === 200);
check('formulaire non-JSON refusé', (function () use ($port) {
    $ctx = stream_context_create(['http' => ['method' => 'POST', 'header' => 'Content-Type: application/x-www-form-urlencoded', 'content' => 'name=x', 'ignore_errors' => true]]);
    file_get_contents("http://127.0.0.1:$port/api.php?action=category-create", false, $ctx);
    return str_contains($http_response_header[0], '415');
})());

// --- Produits ---
$cats = call('categories')[1]['categories'];
[$s, $p] = call('product-create', ['name' => 'Brochettes de crevettes', 'categoryId' => $cats[1]['id'], 'priceCents' => 1750, 'stock' => 2, 'tags' => 'Épicé, Nouveau']);
check('produit ajouté', $s === 200 && $p['tags'] === ['Épicé', 'Nouveau']);
$id = $p['id'];
$item = array_values(array_filter(items(call('menu', null, false)[1]), fn($x) => $x['id'] === $id))[0];
check('stock faible affiché sur la carte', $item['remaining'] === 2);
check('prix passé en « sur demande »', array_key_exists('priceCents', $r = call('product-update', ['id' => $id, 'priceCents' => null])[1]) && $r['priceCents'] === null);
check('prix modifié', call('product-update', ['id' => $id, 'priceCents' => 1890])[1]['priceCents'] === 1890);
check('nouveau produit placé en fin de catégorie', (function () use ($id, $cats) {
    $inCat = array_values(array_filter(call('products')[1]['products'], fn($x) => $x['categoryId'] === $cats[1]['id']));
    return end($inCat)['id'] === $id;
})());
check('stock ne descend pas sous zéro', call('product-stock', ['id' => $id, 'delta' => -5])[1]['stock'] === 0);
$item = array_values(array_filter(items(call('menu', null, false)[1]), fn($x) => $x['id'] === $id))[0];
check('produit épuisé affiché comme tel', $item['soldOut'] === true && $item['priceCents'] === 1890);
call('product-update', ['id' => $id, 'visible' => false]);
check('produit masqué absent de la carte', !in_array($id, array_column(items(call('menu', null, false)[1]), 'id'), true));
check('produit supprimé', call('product-delete', ['id' => $id])[0] === 200 && call('product-update', ['id' => $id, 'priceCents' => 1])[0] === 404);

$bad = [
    ['name' => '', 'categoryId' => $cats[0]['id'], 'priceCents' => 100],
    ['name' => 'X', 'categoryId' => $cats[0]['id'], 'priceCents' => -1],
    ['name' => 'X', 'categoryId' => $cats[0]['id'], 'priceCents' => 12.5],
    ['name' => 'X', 'categoryId' => 99999, 'priceCents' => 100],
    ['name' => 'X', 'categoryId' => $cats[0]['id'], 'priceCents' => 100, 'stock' => -3],
];
check('données invalides refusées', array_sum(array_map(fn($b) => call('product-create', $b)[0] >= 400 ? 1 : 0, $bad)) === count($bad));

// --- Catégories ---
$c = call('category-create', ['name' => 'Menus enfants'])[1];
check('catégorie ajoutée', isset($c['id']));
check('doublon de catégorie refusé', call('category-create', ['name' => 'menus ENFANTS'])[0] === 409);
check('catégorie renommée', call('category-rename', ['id' => $c['id'], 'name' => 'Menu enfant'])[1]['name'] === 'Menu enfant');
$ids = array_reverse(array_column(call('categories')[1]['categories'], 'id'));
call('category-order', ['ids' => $ids]);
check('ordre des catégories modifié', array_column(call('categories')[1]['categories'], 'id') === $ids);
$drinks = array_values(array_filter(call('categories')[1]['categories'], fn($x) => $x['name'] === 'Bières pression'))[0];
[$s, $b] = call('category-delete', ['id' => $drinks['id']]);
check('catégorie non vide protégée', $s === 409 && $b['productCount'] === $drinks['productCount']);
call('category-delete', ['id' => $drinks['id'], 'moveTo' => $c['id']]);
$moved = array_values(array_filter(call('categories')[1]['categories'], fn($x) => $x['id'] === $c['id']))[0];
check('produits déplacés avant suppression', $moved['productCount'] === $drinks['productCount']);
call('category-delete', ['id' => $c['id'], 'deleteProducts' => true]);
check('catégorie et produits supprimés', !in_array($c['id'], array_column(call('products')[1]['products'], 'categoryId'), true));

// --- Mot de passe ---
$oldCookie = $cookie;
check('mot de passe actuel vérifié', call('password', ['currentPassword' => 'faux', 'newPassword' => 'nouveau-mdp-123'])[0] === 400);
check('mot de passe changé', call('password', ['currentPassword' => 'motdepasse-test', 'newPassword' => 'nouveau-mdp-123'])[0] === 200);
check('toujours connecté sur cet appareil', call('me')[0] === 200);
$current = $cookie;
$cookie = $oldCookie;
check("l'ancienne session est fermée", call('me')[0] === 401);
$cookie = $current;

// --- Réinitialisation par fichier ---
call('logout', []);
file_put_contents("$tmp/reinitialiser.txt", '');
check('fichier de réinitialisation détecté', call('me', null, false)[1]['needsSetup'] === true);
check('nouveau compte créé', call('setup', ['username' => 'gerant', 'password' => 'autre-mdp-456'])[0] === 200);
check('fichier de réinitialisation supprimé', !file_exists("$tmp/reinitialiser.txt"));
check("l'ancien compte n'existe plus", call('login', ['username' => 'admin', 'password' => 'nouveau-mdp-123'], false)[0] === 401);

// --- Limitation des tentatives ---
for ($i = 0; $i < 6; $i++) [$s] = call('login', ['username' => 'admin', 'password' => 'x'], false);
check('blocage après trop de tentatives', $s === 429);

// --- Mise à jour d'une ancienne base (carte d'exemple, prix obligatoire) ---
$old = "$tmp/ancienne.sqlite";
$pdo = new PDO("sqlite:$old");
$pdo->exec("
    CREATE TABLE categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE COLLATE NOCASE, position INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE products (id INTEGER PRIMARY KEY AUTOINCREMENT, category_id INTEGER NOT NULL REFERENCES categories(id),
        name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
        stock INTEGER, visible INTEGER NOT NULL DEFAULT 1, tags TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL, password_changed_at INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE login_failures (ip TEXT NOT NULL, failed_at INTEGER NOT NULL);
    INSERT INTO categories (name, position) VALUES ('Entrées', 0);
    INSERT INTO products (category_id, name, price_cents, stock) VALUES (1, 'Salade braisée', 650, 20);
");
$pdo->prepare('INSERT INTO users (username, password_hash, password_changed_at) VALUES (?, ?, 1)')
    ->execute(['patron', password_hash('ancien-mdp-123', PASSWORD_DEFAULT)]);
$pdo = null;
putenv("ASB_DB_FILE=$old");
$port2 = 8766;
$server2 = proc_open([PHP_BINARY, '-S', "127.0.0.1:$port2", '-t', $root], [1 => ['file', '/dev/null', 'w'], 2 => ['file', '/dev/null', 'w']], $pipes2);
for ($i = 0; $i < 50 && !@fsockopen('127.0.0.1', $port2); $i++) usleep(100000);
$port = $port2;
$cookie = null;
$menu = call('menu', null, false)[1];
check('ancienne base : nouvelle carte chargée', count($menu['categories']) === 17 && !in_array('Salade braisée', array_column(items($menu), 'name'), true));
check('ancienne base : compte conservé', call('login', ['username' => 'patron', 'password' => 'ancien-mdp-123'])[0] === 200);
check('ancienne base : prix sur demande accepté', call('product-update', ['id' => array_values(array_filter(call('products')[1]['products'], fn($x) => $x['name'] === 'Burrata'))[0]['id'], 'priceCents' => null])[0] === 200);
call('product-create', ['name' => 'Plat test', 'categoryId' => call('categories')[1]['categories'][0]['id'], 'priceCents' => 100]);
proc_terminate($server2);
proc_close($server2);
$server2 = proc_open([PHP_BINARY, '-S', "127.0.0.1:$port2", '-t', $root], [1 => ['file', '/dev/null', 'w'], 2 => ['file', '/dev/null', 'w']], $pipes2);
for ($i = 0; $i < 50 && !@fsockopen('127.0.0.1', $port2); $i++) usleep(100000);
usleep(200000);
check('la carte n\'est chargée qu\'une fois (modifications conservées)', in_array('Plat test', array_column(items(call('menu', null, false)[1]), 'name'), true));
proc_terminate($server2);

echo $failed ? "\n$failed test(s) en échec\n" : "\nTous les tests passent\n";
exit($failed ? 1 : 0);
