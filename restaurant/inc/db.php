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

const PRODUCTS_TABLE = "
    CREATE TABLE IF NOT EXISTS products (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id  INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
        name         TEXT NOT NULL,
        description  TEXT NOT NULL DEFAULT '',
        price_cents  INTEGER CHECK (price_cents IS NULL OR price_cents >= 0), -- NULL = prix sur demande
        stock        INTEGER CHECK (stock IS NULL OR stock >= 0),             -- NULL = stock non suivi (illimité)
        visible      INTEGER NOT NULL DEFAULT 1,
        tags         TEXT NOT NULL DEFAULT '',                                -- séparés par des virgules
        position     INTEGER NOT NULL DEFAULT 0,                              -- ordre d'affichage dans la catégorie
        updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
";

function migrate(PDO $pdo): void
{
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS categories (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            name      TEXT NOT NULL UNIQUE COLLATE NOCASE,
            position  INTEGER NOT NULL DEFAULT 0
        );
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
        CREATE TABLE IF NOT EXISTS settings (
            key    TEXT PRIMARY KEY,
            value  TEXT NOT NULL
        );
    " . PRODUCTS_TABLE);
    require_once __DIR__ . '/stats.php';
    stats_migrer($pdo);
    load_carte_if_outdated($pdo);
}

// Charge la carte officielle (inc/carte.php) une seule fois par version de la carte.
// Remplace les catégories et les produits ; le compte administrateur est conservé.
function load_carte_if_outdated(PDO $pdo): void
{
    require_once __DIR__ . '/carte.php';
    $current = (int) ($pdo->query("SELECT value FROM settings WHERE key = 'carte_version'")->fetchColumn() ?: 0);
    if ($current >= CARTE_VERSION) return;

    $pdo->beginTransaction();
    try {
        // La table des produits est recréée pour suivre le schéma actuel (prix sur demande, ordre d'affichage).
        $pdo->exec('DROP TABLE IF EXISTS products');
        $pdo->exec('DELETE FROM categories');
        $pdo->exec(PRODUCTS_TABLE);
        $addCat = $pdo->prepare('INSERT INTO categories (name, position) VALUES (?, ?)');
        $addProd = $pdo->prepare(
            'INSERT INTO products (category_id, name, description, price_cents, tags, position) VALUES (?, ?, ?, ?, ?, ?)'
        );
        $catPosition = 0;
        foreach (carte() as $cat => $items) {
            $addCat->execute([$cat, $catPosition++]);
            $catId = (int) $pdo->lastInsertId();
            foreach (array_values($items) as $i => [$name, $desc, $price, $tags]) {
                $addProd->execute([$catId, $name, $desc, $price, $tags, $i]);
            }
        }
        $pdo->prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('carte_version', ?)")->execute([CARTE_VERSION]);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}
