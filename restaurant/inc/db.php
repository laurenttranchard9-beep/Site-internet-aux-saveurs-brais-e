<?php
// Base de données SQLite : un seul fichier dans le dossier data/, créé automatiquement.

const DATA_DIR = __DIR__ . '/../data';

function db_file(): string
{
    $override = getenv('ASB_DB_FILE');
    if ($override) return $override;

    // Le nom du fichier contient une partie aléatoire pour qu'il ne puisse pas être deviné
    // (protection supplémentaire si le serveur ignore le .htaccess du dossier data/).
    $existing = glob(DATA_DIR . '/restaurant-*.sqlite');
    if ($existing) return $existing[0];
    return DATA_DIR . '/restaurant-' . bin2hex(random_bytes(12)) . '.sqlite';
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo) return $pdo;

    $file = db_file();
    if (!is_dir(dirname($file)) && !mkdir(dirname($file), 0775, true)) {
        throw new RuntimeException("Impossible de créer le dossier des données.");
    }
    $pdo = new PDO('sqlite:' . $file, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_STRINGIFY_FETCHES => false,
    ]);
    $pdo->exec('PRAGMA foreign_keys = ON');
    $pdo->exec('PRAGMA busy_timeout = 5000');
    migrate($pdo);
    return $pdo;
}

function migrate(PDO $pdo): void
{
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS categories (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            name      TEXT NOT NULL UNIQUE COLLATE NOCASE,
            position  INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS products (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id  INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
            name         TEXT NOT NULL,
            description  TEXT NOT NULL DEFAULT '',
            price_cents  INTEGER NOT NULL CHECK (price_cents >= 0),
            stock        INTEGER CHECK (stock IS NULL OR stock >= 0), -- NULL = stock non suivi (illimité)
            visible      INTEGER NOT NULL DEFAULT 1,
            tags         TEXT NOT NULL DEFAULT '',                    -- séparés par des virgules
            updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
        CREATE TABLE IF NOT EXISTS users (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            username       TEXT NOT NULL UNIQUE COLLATE NOCASE,
            password_hash  TEXT NOT NULL,
            password_changed_at INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS login_failures (
            ip          TEXT NOT NULL,
            failed_at   INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_login_failures_ip ON login_failures(ip);
    ");
    seed_if_empty($pdo);
}

// Carte de départ, modifiable ensuite depuis l'espace de gestion.
function seed_if_empty(PDO $pdo): void
{
    if ((int) $pdo->query('SELECT COUNT(*) FROM categories')->fetchColumn() > 0) return;

    $seed = [
        'Entrées' => [
            ['Salade braisée', 'Poivrons et aubergines grillés, oignons rouges, vinaigrette citronnée.', 650, 20, 'Végétarien'],
            ['Brochettes de gésiers', 'Gésiers marinés aux épices, grillés au feu de bois.', 750, 15, ''],
            ['Accras de morue', 'Six beignets croustillants, sauce pimentée maison.', 700, 25, 'Épicé'],
        ],
        'Grillades & braises' => [
            ['Poulet braisé', 'Demi-poulet mariné 24 h, braisé à la flamme, sauce oignon-moutarde.', 1450, 18, 'Maison'],
            ['Poisson braisé', 'Bar entier grillé, marinade ail-gingembre-persil, tomates confites.', 1850, 8, ''],
            ['Brochettes de bœuf', 'Trois brochettes de bœuf tendres, marinade au poivre de Penja.', 1600, 12, ''],
            ["Côtes d'agneau", "Côtes d'agneau grillées, herbes fraîches et jus corsé.", 2100, 6, ''],
            ['Assiette mixte du braiseur', 'Poulet, bœuf et saucisse grillés, pour les grosses faims.', 2400, 10, 'Maison'],
        ],
        'Accompagnements' => [
            ['Alloco', 'Bananes plantains frites, dorées et fondantes.', 450, null, 'Végétarien'],
            ['Attiéké', 'Semoule de manioc légère, oignons et tomates.', 450, null, 'Végétarien'],
            ['Frites maison', 'Pommes de terre fraîches, double cuisson.', 400, null, 'Végétarien'],
            ['Riz parfumé', 'Riz basmati aux épices douces.', 350, null, 'Végétarien'],
        ],
        'Desserts' => [
            ['Ananas rôti', 'Ananas caramélisé à la braise, glace vanille.', 650, 10, 'Végétarien'],
            ['Moelleux au chocolat', 'Cœur coulant, crème anglaise maison.', 700, 12, 'Végétarien'],
        ],
        'Boissons' => [
            ['Bissap maison', "Infusion d'hibiscus glacée, menthe fraîche (50 cl).", 400, 30, 'Sans alcool'],
            ['Jus de gingembre', 'Gingembre frais pressé, citron vert (50 cl).', 400, 30, 'Sans alcool'],
            ['Eau minérale', 'Plate ou gazeuse (50 cl).', 250, null, 'Sans alcool'],
            ['Bière pression', 'Blonde locale (25 cl).', 450, null, ''],
        ],
    ];

    $pdo->beginTransaction();
    $addCat = $pdo->prepare('INSERT INTO categories (name, position) VALUES (?, ?)');
    $addProd = $pdo->prepare(
        'INSERT INTO products (category_id, name, description, price_cents, stock, tags) VALUES (?, ?, ?, ?, ?, ?)'
    );
    $position = 0;
    foreach ($seed as $cat => $items) {
        $addCat->execute([$cat, $position++]);
        $catId = (int) $pdo->lastInsertId();
        foreach ($items as [$name, $desc, $price, $stock, $tags]) {
            $addProd->execute([$catId, $name, $desc, $price, $stock, $tags]);
        }
    }
    $pdo->commit();
}
