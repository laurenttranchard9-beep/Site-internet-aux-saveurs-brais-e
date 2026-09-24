const path = require("node:path");
const express = require("express");
const { openDatabase, seedIfEmpty } = require("./db");
const { createAuth, ensureAdmin } = require("./auth");

const LOW_STOCK = 5;

class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

// --- Validation des entrées ---
function text(value, field, { min = 0, max }) {
  if (typeof value !== "string") throw new HttpError(400, `Le champ « ${field} » est invalide.`);
  const v = value.trim();
  if (v.length < min) throw new HttpError(400, `Le champ « ${field} » est obligatoire.`);
  if (v.length > max) throw new HttpError(400, `Le champ « ${field} » dépasse ${max} caractères.`);
  return v;
}
function priceCents(value) {
  if (!Number.isInteger(value) || value < 0 || value > 1_000_000) {
    throw new HttpError(400, "Le prix doit être un montant positif.");
  }
  return value;
}
function stock(value) {
  if (value === null) return null;
  if (!Number.isInteger(value) || value < 0 || value > 100_000) {
    throw new HttpError(400, "Le stock doit être un nombre entier positif (ou vide pour illimité).");
  }
  return value;
}
function id(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, "Identifiant invalide.");
  return n;
}

const toProduct = (p) => ({
  id: p.id,
  categoryId: p.category_id,
  name: p.name,
  description: p.description,
  priceCents: p.price_cents,
  stock: p.stock,
  visible: !!p.visible,
  tags: p.tags ? p.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
  updatedAt: p.updated_at,
});

function createApp(db, { secureCookies = false } = {}) {
  const app = express();
  const auth = createAuth(db, { secureCookies });

  app.set("trust proxy", process.env.TRUST_PROXY === "1" ? 1 : false);
  app.disable("x-powered-by");

  app.use((req, res, next) => {
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; " +
        "img-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "same-origin");
    next();
  });

  app.use(express.json({ limit: "20kb" }));

  const q = {
    categories: db.prepare("SELECT id, name, position FROM categories ORDER BY position, id"),
    category: db.prepare("SELECT id, name, position FROM categories WHERE id = ?"),
    maxPosition: db.prepare("SELECT COALESCE(MAX(position), -1) AS m FROM categories"),
    insertCategory: db.prepare("INSERT INTO categories (name, position) VALUES (?, ?)"),
    renameCategory: db.prepare("UPDATE categories SET name = ? WHERE id = ?"),
    setPosition: db.prepare("UPDATE categories SET position = ? WHERE id = ?"),
    deleteCategory: db.prepare("DELETE FROM categories WHERE id = ?"),
    countInCategory: db.prepare("SELECT COUNT(*) AS n FROM products WHERE category_id = ?"),
    moveProducts: db.prepare("UPDATE products SET category_id = ?, updated_at = datetime('now') WHERE category_id = ?"),
    deleteProductsIn: db.prepare("DELETE FROM products WHERE category_id = ?"),
    products: db.prepare("SELECT * FROM products ORDER BY category_id, name COLLATE NOCASE"),
    visibleProducts: db.prepare("SELECT * FROM products WHERE visible = 1 ORDER BY name COLLATE NOCASE"),
    product: db.prepare("SELECT * FROM products WHERE id = ?"),
    insertProduct: db.prepare(
      `INSERT INTO products (category_id, name, description, price_cents, stock, visible, tags)
       VALUES (@categoryId, @name, @description, @priceCents, @stock, @visible, @tags)`
    ),
    updateProduct: db.prepare(
      `UPDATE products SET category_id = @categoryId, name = @name, description = @description,
         price_cents = @priceCents, stock = @stock, visible = @visible, tags = @tags, updated_at = datetime('now')
       WHERE id = @id`
    ),
    adjustStock: db.prepare(
      "UPDATE products SET stock = MAX(0, stock + ?), updated_at = datetime('now') WHERE id = ? AND stock IS NOT NULL"
    ),
    deleteProduct: db.prepare("DELETE FROM products WHERE id = ?"),
  };

  const mustGetCategory = (catId) => {
    const c = q.category.get(catId);
    if (!c) throw new HttpError(404, "Catégorie introuvable.");
    return c;
  };
  const mustGetProduct = (prodId) => {
    const p = q.product.get(prodId);
    if (!p) throw new HttpError(404, "Produit introuvable.");
    return p;
  };
  const uniqueName = (fn) => {
    try {
      return fn();
    } catch (e) {
      if (String(e.code).startsWith("SQLITE_CONSTRAINT_UNIQUE")) throw new HttpError(409, "Cette catégorie existe déjà.");
      throw e;
    }
  };

  // Construit un produit complet à partir d'un produit existant et de champs modifiés.
  function productFields(body, base = {}) {
    const merged = { ...base, ...body };
    const tags = Array.isArray(merged.tags) ? merged.tags.join(",") : merged.tags ?? "";
    const fields = {
      categoryId: id(merged.categoryId),
      name: text(merged.name, "nom", { min: 1, max: 80 }),
      description: text(merged.description ?? "", "description", { max: 300 }),
      priceCents: priceCents(merged.priceCents),
      stock: stock(merged.stock === undefined ? null : merged.stock),
      visible: merged.visible === undefined ? 1 : merged.visible ? 1 : 0,
      tags: text(tags, "étiquettes", { max: 120 })
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .join(","),
    };
    mustGetCategory(fields.categoryId);
    return fields;
  }

  // ---------- API publique ----------
  app.get("/api/menu", (req, res) => {
    const byCategory = new Map();
    for (const p of q.visibleProducts.all()) {
      if (!byCategory.has(p.category_id)) byCategory.set(p.category_id, []);
      byCategory.get(p.category_id).push({
        id: p.id,
        name: p.name,
        description: p.description,
        priceCents: p.price_cents,
        tags: toProduct(p).tags,
        soldOut: p.stock === 0,
        remaining: p.stock !== null && p.stock > 0 && p.stock <= LOW_STOCK ? p.stock : null,
      });
    }
    const categories = q.categories
      .all()
      .filter((c) => byCategory.has(c.id))
      .map((c) => ({ id: c.id, name: c.name, products: byCategory.get(c.id) }));
    res.setHeader("Cache-Control", "no-store");
    res.json({ categories });
  });

  // ---------- Authentification ----------
  app.post("/api/login", auth.login);
  app.post("/api/logout", auth.logout);
  app.get("/api/me", (req, res) => {
    const s = auth.currentSession(req);
    if (!s) return res.status(401).json({ error: "Non connecté." });
    res.json({ username: s.user.username });
  });

  // ---------- API de gestion (connexion requise) ----------
  const admin = express.Router();
  admin.use(auth.requireAuth);
  admin.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  admin.post("/password", auth.changePassword);

  admin.get("/categories", (req, res) => {
    const cats = q.categories.all().map((c) => ({ ...c, productCount: q.countInCategory.get(c.id).n }));
    res.json(cats);
  });

  admin.post("/categories", (req, res) => {
    const name = text(req.body?.name, "nom", { min: 1, max: 50 });
    const info = uniqueName(() => q.insertCategory.run(name, q.maxPosition.get().m + 1));
    res.status(201).json(q.category.get(info.lastInsertRowid));
  });

  admin.put("/categories/order", (req, res) => {
    const ids = req.body?.ids;
    const existing = q.categories.all().map((c) => c.id);
    if (!Array.isArray(ids) || ids.length !== existing.length || !existing.every((e) => ids.includes(e))) {
      throw new HttpError(400, "L'ordre envoyé ne correspond pas aux catégories existantes.");
    }
    db.transaction(() => ids.forEach((catId, i) => q.setPosition.run(i, catId)))();
    res.json({ ok: true });
  });

  admin.put("/categories/:id", (req, res) => {
    const catId = id(req.params.id);
    mustGetCategory(catId);
    const name = text(req.body?.name, "nom", { min: 1, max: 50 });
    uniqueName(() => q.renameCategory.run(name, catId));
    res.json(q.category.get(catId));
  });

  // Une catégorie non vide ne peut être supprimée qu'en déplaçant (moveTo) ou supprimant (deleteProducts) ses produits.
  admin.delete("/categories/:id", (req, res) => {
    const catId = id(req.params.id);
    mustGetCategory(catId);
    const count = q.countInCategory.get(catId).n;
    db.transaction(() => {
      if (count > 0) {
        if (req.query.moveTo) {
          const target = id(req.query.moveTo);
          if (target === catId) throw new HttpError(400, "Choisissez une autre catégorie.");
          mustGetCategory(target);
          q.moveProducts.run(target, catId);
        } else if (req.query.deleteProducts === "1") {
          q.deleteProductsIn.run(catId);
        } else {
          throw new HttpError(409, "Cette catégorie contient encore des produits.", { productCount: count });
        }
      }
      q.deleteCategory.run(catId);
    })();
    res.json({ ok: true });
  });

  admin.get("/products", (req, res) => {
    res.json(q.products.all().map(toProduct));
  });

  admin.post("/products", (req, res) => {
    const fields = productFields(req.body || {});
    const info = q.insertProduct.run(fields);
    res.status(201).json(toProduct(q.product.get(info.lastInsertRowid)));
  });

  // Modification partielle : seuls les champs envoyés changent.
  admin.patch("/products/:id", (req, res) => {
    const prodId = id(req.params.id);
    const current = toProduct(mustGetProduct(prodId));
    const fields = productFields(req.body || {}, current);
    q.updateProduct.run({ ...fields, id: prodId });
    res.json(toProduct(q.product.get(prodId)));
  });

  // Ajustement relatif (+1 / -1…) : atomique, pour éviter d'écraser une autre modification.
  admin.post("/products/:id/stock", (req, res) => {
    const prodId = id(req.params.id);
    const p = mustGetProduct(prodId);
    const delta = req.body?.delta;
    if (!Number.isInteger(delta) || Math.abs(delta) > 10_000) throw new HttpError(400, "Ajustement invalide.");
    if (p.stock === null) throw new HttpError(400, "Le stock de ce produit n'est pas suivi.");
    q.adjustStock.run(delta, prodId);
    res.json(toProduct(q.product.get(prodId)));
  });

  admin.delete("/products/:id", (req, res) => {
    const prodId = id(req.params.id);
    mustGetProduct(prodId);
    q.deleteProduct.run(prodId);
    res.json({ ok: true });
  });

  app.use("/api/admin", admin);
  app.use("/api", (req, res) => res.status(404).json({ error: "Route inconnue." }));

  app.use(express.static(path.join(__dirname, "public"), { extensions: ["html"] }));

  // Gestion des erreurs
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, ...err.extra });
    if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Requête mal formée." });
    if (err.type === "entity.too.large") return res.status(413).json({ error: "Requête trop volumineuse." });
    console.error(err);
    res.status(500).json({ error: "Erreur interne du serveur." });
  });

  return app;
}

if (require.main === module) {
  const db = openDatabase();
  if (seedIfEmpty(db)) console.log("[db] Carte d'exemple créée.");
  ensureAdmin(db);
  const port = Number(process.env.PORT) || 3000;
  const app = createApp(db, { secureCookies: process.env.NODE_ENV === "production" });
  app.listen(port, () => {
    console.log(`Menu :             http://localhost:${port}/`);
    console.log(`Espace de gestion : http://localhost:${port}/admin/`);
  });
}

module.exports = { createApp };
