const path = require("node:path");
const fs = require("node:fs");
const Database = require("better-sqlite3");

function openDatabase(file = process.env.DB_FILE || path.join(__dirname, "data", "restaurant.db")) {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL UNIQUE COLLATE NOCASE,
      position    INTEGER NOT NULL DEFAULT 0
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
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash  TEXT PRIMARY KEY,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at  INTEGER NOT NULL
    );
  `);

  return db;
}

// Carte de départ, modifiable ensuite depuis l'espace de gestion.
const SEED = [
  ["Entrées", [
    ["Salade braisée", "Poivrons et aubergines grillés, oignons rouges, vinaigrette citronnée.", 650, 20, "Végétarien"],
    ["Brochettes de gésiers", "Gésiers marinés aux épices, grillés au feu de bois.", 750, 15, ""],
    ["Accras de morue", "Six beignets croustillants, sauce pimentée maison.", 700, 25, "Épicé"],
  ]],
  ["Grillades & braises", [
    ["Poulet braisé", "Demi-poulet mariné 24 h, braisé à la flamme, sauce oignon-moutarde.", 1450, 18, "Maison"],
    ["Poisson braisé", "Bar entier grillé, marinade ail-gingembre-persil, tomates confites.", 1850, 8, ""],
    ["Brochettes de bœuf", "Trois brochettes de bœuf tendres, marinade au poivre de Penja.", 1600, 12, ""],
    ["Côtes d'agneau", "Côtes d'agneau grillées, herbes fraîches et jus corsé.", 2100, 6, ""],
    ["Assiette mixte du braiseur", "Poulet, bœuf et saucisse grillés, pour les grosses faims.", 2400, 10, "Maison"],
  ]],
  ["Accompagnements", [
    ["Alloco", "Bananes plantains frites, dorées et fondantes.", 450, null, "Végétarien"],
    ["Attiéké", "Semoule de manioc légère, oignons et tomates.", 450, null, "Végétarien"],
    ["Frites maison", "Pommes de terre fraîches, double cuisson.", 400, null, "Végétarien"],
    ["Riz parfumé", "Riz basmati aux épices douces.", 350, null, "Végétarien"],
  ]],
  ["Desserts", [
    ["Ananas rôti", "Ananas caramélisé à la braise, glace vanille.", 650, 10, "Végétarien"],
    ["Moelleux au chocolat", "Cœur coulant, crème anglaise maison.", 700, 12, "Végétarien"],
  ]],
  ["Boissons", [
    ["Bissap maison", "Infusion d'hibiscus glacée, menthe fraîche (50 cl).", 400, 30, "Sans alcool"],
    ["Jus de gingembre", "Gingembre frais pressé, citron vert (50 cl).", 400, 30, "Sans alcool"],
    ["Eau minérale", "Plate ou gazeuse (50 cl).", 250, null, "Sans alcool"],
    ["Bière pression", "Blonde locale (25 cl).", 450, null, ""],
  ]],
];

function seedIfEmpty(db) {
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM categories").get();
  if (n > 0) return false;
  const addCat = db.prepare("INSERT INTO categories (name, position) VALUES (?, ?)");
  const addProd = db.prepare(
    "INSERT INTO products (category_id, name, description, price_cents, stock, tags) VALUES (?, ?, ?, ?, ?, ?)"
  );
  db.transaction(() => {
    SEED.forEach(([cat, items], i) => {
      const catId = addCat.run(cat, i).lastInsertRowid;
      for (const [name, desc, price, stock, tags] of items) addProd.run(catId, name, desc, price, stock, tags);
    });
  })();
  return true;
}

module.exports = { openDatabase, seedIfEmpty };
