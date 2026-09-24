<?php
// API du menu et de l'espace de gestion.
// Lecture :  GET  api.php?action=...
// Écriture : POST api.php?action=...  (corps JSON)

declare(strict_types=1);

require __DIR__ . '/inc/db.php';
require __DIR__ . '/inc/auth.php';

const LOW_STOCK = 5;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');

class HttpError extends Exception
{
    public function __construct(public int $status, string $message, public array $extra = [])
    {
        parent::__construct($message);
    }
}

function fail(int $status, string $message, array $extra = []): never
{
    throw new HttpError($status, $message, $extra);
}

// ---------- Validation des entrées ----------
function text_field($value, string $field, int $min, int $max): string
{
    if (!is_string($value)) fail(400, "Le champ « $field » est invalide.");
    $v = trim($value);
    if (mb_strlen($v) < $min) fail(400, "Le champ « $field » est obligatoire.");
    if (mb_strlen($v) > $max) fail(400, "Le champ « $field » dépasse $max caractères.");
    return $v;
}

function int_id($value): int
{
    if (is_string($value) && ctype_digit($value)) $value = (int) $value;
    if (!is_int($value) || $value <= 0) fail(400, 'Identifiant invalide.');
    return $value;
}

function price_cents($value): int
{
    if (!is_int($value) || $value < 0 || $value > 1000000) fail(400, 'Le prix doit être un montant positif.');
    return $value;
}

function stock_value($value): ?int
{
    if ($value === null) return null;
    if (!is_int($value) || $value < 0 || $value > 100000) {
        fail(400, 'Le stock doit être un nombre entier positif (ou vide pour illimité).');
    }
    return $value;
}

function split_tags(string $tags): array
{
    return array_values(array_filter(array_map('trim', explode(',', $tags)), fn($t) => $t !== ''));
}

function to_product(array $p): array
{
    return [
        'id' => (int) $p['id'],
        'categoryId' => (int) $p['category_id'],
        'name' => $p['name'],
        'description' => $p['description'],
        'priceCents' => (int) $p['price_cents'],
        'stock' => $p['stock'] === null ? null : (int) $p['stock'],
        'visible' => (bool) $p['visible'],
        'tags' => split_tags($p['tags']),
        'updatedAt' => $p['updated_at'],
    ];
}

function get_category(int $id): array
{
    $stmt = db()->prepare('SELECT id, name, position FROM categories WHERE id = ?');
    $stmt->execute([$id]);
    $c = $stmt->fetch();
    if (!$c) fail(404, 'Catégorie introuvable.');
    return ['id' => (int) $c['id'], 'name' => $c['name'], 'position' => (int) $c['position']];
}

function get_product(int $id): array
{
    $stmt = db()->prepare('SELECT * FROM products WHERE id = ?');
    $stmt->execute([$id]);
    $p = $stmt->fetch();
    if (!$p) fail(404, 'Produit introuvable.');
    return $p;
}

function all_categories(): array
{
    return db()->query('SELECT id, name, position FROM categories ORDER BY position, id')->fetchAll();
}

function unique_name(callable $fn)
{
    try {
        return $fn();
    } catch (PDOException $e) {
        if (str_contains($e->getMessage(), 'UNIQUE')) fail(409, 'Cette catégorie existe déjà.');
        throw $e;
    }
}

// Construit un produit complet à partir d'un produit existant et des champs modifiés.
function product_fields(array $body, array $base = []): array
{
    $m = array_merge($base, $body);
    $tags = $m['tags'] ?? '';
    if (is_array($tags)) $tags = implode(',', array_filter($tags, 'is_string'));
    $fields = [
        'categoryId' => int_id($m['categoryId'] ?? null),
        'name' => text_field($m['name'] ?? null, 'nom', 1, 80),
        'description' => text_field($m['description'] ?? '', 'description', 0, 300),
        'priceCents' => price_cents($m['priceCents'] ?? null),
        'stock' => stock_value(array_key_exists('stock', $m) ? $m['stock'] : null),
        'visible' => array_key_exists('visible', $m) ? ($m['visible'] ? 1 : 0) : 1,
        'tags' => implode(',', split_tags(text_field($tags, 'étiquettes', 0, 120))),
    ];
    get_category($fields['categoryId']);
    return $fields;
}

function transaction(callable $fn)
{
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $result = $fn();
        $pdo->commit();
        return $result;
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

// ---------- Actions ----------
function handle(string $method, string $action, array $body): array
{
    $pdo = db();

    // Publiques
    if ($method === 'GET' && $action === 'menu') {
        $byCategory = [];
        foreach ($pdo->query('SELECT * FROM products WHERE visible = 1 ORDER BY name COLLATE NOCASE') as $p) {
            $stock = $p['stock'] === null ? null : (int) $p['stock'];
            $byCategory[(int) $p['category_id']][] = [
                'id' => (int) $p['id'],
                'name' => $p['name'],
                'description' => $p['description'],
                'priceCents' => (int) $p['price_cents'],
                'tags' => split_tags($p['tags']),
                'soldOut' => $stock === 0,
                'remaining' => $stock !== null && $stock > 0 && $stock <= LOW_STOCK ? $stock : null,
            ];
        }
        $categories = [];
        foreach (all_categories() as $c) {
            $id = (int) $c['id'];
            if (isset($byCategory[$id])) $categories[] = ['id' => $id, 'name' => $c['name'], 'products' => $byCategory[$id]];
        }
        return ['categories' => $categories];
    }
    if ($method === 'GET' && $action === 'me') {
        $user = current_user();
        if (!$user) fail(401, 'Non connecté.', ['needsSetup' => needs_setup()]);
        return ['username' => $user['username']];
    }
    if ($method === 'POST' && $action === 'login') return login($body);
    if ($method === 'POST' && $action === 'setup') return setup_admin($body);
    if ($method === 'POST' && $action === 'logout') {
        logout();
        return ['ok' => true];
    }

    // Gestion : connexion requise
    $user = require_user();

    switch ("$method $action") {
        case 'POST password':
            return change_password($user, $body);

        case 'GET categories':
            $counts = $pdo->query('SELECT category_id, COUNT(*) AS n FROM products GROUP BY category_id')
                ->fetchAll(PDO::FETCH_KEY_PAIR);
            return ['categories' => array_map(fn($c) => [
                'id' => (int) $c['id'],
                'name' => $c['name'],
                'position' => (int) $c['position'],
                'productCount' => (int) ($counts[$c['id']] ?? 0),
            ], all_categories())];

        case 'POST category-create':
            $name = text_field($body['name'] ?? null, 'nom', 1, 50);
            $next = (int) $pdo->query('SELECT COALESCE(MAX(position), -1) + 1 FROM categories')->fetchColumn();
            unique_name(fn() => $pdo->prepare('INSERT INTO categories (name, position) VALUES (?, ?)')->execute([$name, $next]));
            return get_category((int) $pdo->lastInsertId());

        case 'POST category-rename':
            $id = int_id($body['id'] ?? null);
            get_category($id);
            $name = text_field($body['name'] ?? null, 'nom', 1, 50);
            unique_name(fn() => $pdo->prepare('UPDATE categories SET name = ? WHERE id = ?')->execute([$name, $id]));
            return get_category($id);

        case 'POST category-order':
            $ids = $body['ids'] ?? null;
            $existing = array_map('intval', array_column(all_categories(), 'id'));
            if (!is_array($ids) || count($ids) !== count($existing) || array_diff($existing, $ids) || array_diff($ids, $existing)) {
                fail(400, "L'ordre envoyé ne correspond pas aux catégories existantes.");
            }
            transaction(function () use ($pdo, $ids) {
                $stmt = $pdo->prepare('UPDATE categories SET position = ? WHERE id = ?');
                foreach (array_values($ids) as $i => $id) $stmt->execute([$i, (int) $id]);
            });
            return ['ok' => true];

        // Une catégorie non vide ne peut être supprimée qu'en déplaçant (moveTo) ou supprimant (deleteProducts) ses produits.
        case 'POST category-delete':
            $id = int_id($body['id'] ?? null);
            get_category($id);
            $count = $pdo->prepare('SELECT COUNT(*) FROM products WHERE category_id = ?');
            $count->execute([$id]);
            $n = (int) $count->fetchColumn();
            transaction(function () use ($pdo, $body, $id, $n) {
                if ($n > 0) {
                    if (!empty($body['moveTo'])) {
                        $target = int_id($body['moveTo']);
                        if ($target === $id) fail(400, 'Choisissez une autre catégorie.');
                        get_category($target);
                        $pdo->prepare("UPDATE products SET category_id = ?, updated_at = datetime('now') WHERE category_id = ?")
                            ->execute([$target, $id]);
                    } elseif (!empty($body['deleteProducts'])) {
                        $pdo->prepare('DELETE FROM products WHERE category_id = ?')->execute([$id]);
                    } else {
                        fail(409, 'Cette catégorie contient encore des produits.', ['productCount' => $n]);
                    }
                }
                $pdo->prepare('DELETE FROM categories WHERE id = ?')->execute([$id]);
            });
            return ['ok' => true];

        case 'GET products':
            $rows = $pdo->query('SELECT * FROM products ORDER BY category_id, name COLLATE NOCASE')->fetchAll();
            return ['products' => array_map('to_product', $rows)];

        case 'POST product-create':
            $f = product_fields($body);
            $pdo->prepare(
                'INSERT INTO products (category_id, name, description, price_cents, stock, visible, tags)
                 VALUES (?, ?, ?, ?, ?, ?, ?)'
            )->execute([$f['categoryId'], $f['name'], $f['description'], $f['priceCents'], $f['stock'], $f['visible'], $f['tags']]);
            return to_product(get_product((int) $pdo->lastInsertId()));

        // Modification partielle : seuls les champs envoyés changent.
        case 'POST product-update':
            $id = int_id($body['id'] ?? null);
            $changes = $body;
            unset($changes['id']);
            $f = product_fields($changes, to_product(get_product($id)));
            $pdo->prepare(
                "UPDATE products SET category_id = ?, name = ?, description = ?, price_cents = ?, stock = ?,
                   visible = ?, tags = ?, updated_at = datetime('now') WHERE id = ?"
            )->execute([$f['categoryId'], $f['name'], $f['description'], $f['priceCents'], $f['stock'], $f['visible'], $f['tags'], $id]);
            return to_product(get_product($id));

        // Ajustement relatif (+1 / -1…) : atomique, pour ne pas écraser une modification faite en même temps.
        case 'POST product-stock':
            $id = int_id($body['id'] ?? null);
            $p = get_product($id);
            $delta = $body['delta'] ?? null;
            if (!is_int($delta) || abs($delta) > 10000) fail(400, 'Ajustement invalide.');
            if ($p['stock'] === null) fail(400, "Le stock de ce produit n'est pas suivi.");
            $pdo->prepare("UPDATE products SET stock = MAX(0, stock + ?), updated_at = datetime('now') WHERE id = ?")
                ->execute([$delta, $id]);
            return to_product(get_product($id));

        case 'POST product-delete':
            $id = int_id($body['id'] ?? null);
            get_product($id);
            $pdo->prepare('DELETE FROM products WHERE id = ?')->execute([$id]);
            return ['ok' => true];
    }

    fail(404, 'Action inconnue.');
}

// ---------- Point d'entrée ----------
try {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (!in_array($method, ['GET', 'POST'], true)) fail(405, 'Méthode non autorisée.');
    $action = is_string($_GET['action'] ?? null) ? $_GET['action'] : '';
    $body = [];
    if ($method === 'POST') {
        // Exiger du JSON empêche un autre site d'envoyer des formulaires à la place de l'administrateur.
        if (!str_starts_with($_SERVER['CONTENT_TYPE'] ?? '', 'application/json')) fail(415, 'Requête mal formée.');
        $raw = file_get_contents('php://input', false, null, 0, 20000);
        $body = $raw === '' ? [] : json_decode($raw, true);
        if (!is_array($body)) fail(400, 'Requête mal formée.');
    }
    echo json_encode(handle($method, $action, $body), JSON_UNESCAPED_UNICODE);
} catch (HttpError $e) {
    http_response_code($e->status);
    echo json_encode(['error' => $e->getMessage()] + $e->extra, JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    error_log('[api] ' . $e);
    http_response_code(500);
    echo json_encode(['error' => 'Erreur interne du serveur.'], JSON_UNESCAPED_UNICODE);
}
