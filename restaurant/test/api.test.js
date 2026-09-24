const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { openDatabase, seedIfEmpty } = require("../db");
const { ensureAdmin } = require("../auth");
const { createApp } = require("../server");

let server, base, cookie;
const PASSWORD = "motdepasse-de-test";

async function call(method, url, body, { auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth && cookie) headers.Cookie = cookie;
  const res = await fetch(base + url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  return { status: res.status, body: await res.json().catch(() => null), headers: res.headers };
}

before(async () => {
  process.env.ADMIN_USER = "admin";
  process.env.ADMIN_PASSWORD = PASSWORD;
  const db = openDatabase(":memory:");
  seedIfEmpty(db);
  ensureAdmin(db, () => {});
  server = createApp(db).listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

test("la carte publique est accessible sans connexion", async () => {
  const { status, body } = await call("GET", "/api/menu", undefined, { auth: false });
  assert.equal(status, 200);
  assert.ok(body.categories.length >= 5);
  assert.ok(body.categories[0].products[0].priceCents > 0);
});

test("l'API de gestion refuse les visiteurs non connectés", async () => {
  assert.equal((await call("GET", "/api/admin/products", undefined, { auth: false })).status, 401);
  assert.equal((await call("POST", "/api/admin/categories", { name: "X" }, { auth: false })).status, 401);
});

test("mauvais mot de passe refusé, bon mot de passe accepté", async () => {
  const bad = await call("POST", "/api/login", { username: "admin", password: "nope" }, { auth: false });
  assert.equal(bad.status, 401);
  const ok = await call("POST", "/api/login", { username: "admin", password: PASSWORD }, { auth: false });
  assert.equal(ok.status, 200);
  const setCookie = ok.headers.get("set-cookie");
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /SameSite=Strict/);
  cookie = setCookie.split(";")[0];
  assert.equal((await call("GET", "/api/me")).body.username, "admin");
});

test("gestion des produits : ajout, prix, stock, masquage, suppression", async () => {
  const cats = (await call("GET", "/api/admin/categories")).body;
  const created = await call("POST", "/api/admin/products", {
    name: "Brochettes de crevettes", categoryId: cats[1].id, priceCents: 1750, stock: 2, tags: "Épicé, Nouveau",
  });
  assert.equal(created.status, 201);
  const id = created.body.id;
  assert.deepEqual(created.body.tags, ["Épicé", "Nouveau"]);

  let menu = (await call("GET", "/api/menu", undefined, { auth: false })).body;
  let item = menu.categories.flatMap((c) => c.products).find((p) => p.id === id);
  assert.equal(item.remaining, 2);

  assert.equal((await call("PATCH", `/api/admin/products/${id}`, { priceCents: 1890 })).body.priceCents, 1890);
  assert.equal((await call("POST", `/api/admin/products/${id}/stock`, { delta: -5 })).body.stock, 0);

  menu = (await call("GET", "/api/menu", undefined, { auth: false })).body;
  item = menu.categories.flatMap((c) => c.products).find((p) => p.id === id);
  assert.equal(item.soldOut, true);
  assert.equal(item.priceCents, 1890);

  await call("PATCH", `/api/admin/products/${id}`, { visible: false });
  menu = (await call("GET", "/api/menu", undefined, { auth: false })).body;
  assert.ok(!menu.categories.flatMap((c) => c.products).some((p) => p.id === id));

  assert.equal((await call("DELETE", `/api/admin/products/${id}`)).status, 200);
  assert.equal((await call("PATCH", `/api/admin/products/${id}`, { priceCents: 1 })).status, 404);
});

test("les données invalides sont refusées", async () => {
  const cats = (await call("GET", "/api/admin/categories")).body;
  const cases = [
    { name: "", categoryId: cats[0].id, priceCents: 100 },
    { name: "X", categoryId: cats[0].id, priceCents: -1 },
    { name: "X", categoryId: cats[0].id, priceCents: 12.5 },
    { name: "X", categoryId: 99999, priceCents: 100 },
    { name: "X", categoryId: cats[0].id, priceCents: 100, stock: -3 },
  ];
  for (const body of cases) assert.equal((await call("POST", "/api/admin/products", body)).status >= 400, true, JSON.stringify(body));
});

test("gestion des catégories : ajout, doublon, renommage, ordre, suppression", async () => {
  const c = (await call("POST", "/api/admin/categories", { name: "Menus enfants" })).body;
  assert.equal((await call("POST", "/api/admin/categories", { name: "menus ENFANTS" })).status, 409);
  assert.equal((await call("PUT", `/api/admin/categories/${c.id}`, { name: "Menu enfant" })).body.name, "Menu enfant");

  let cats = (await call("GET", "/api/admin/categories")).body;
  const ids = cats.map((x) => x.id).reverse();
  assert.equal((await call("PUT", "/api/admin/categories/order", { ids })).status, 200);
  cats = (await call("GET", "/api/admin/categories")).body;
  assert.deepEqual(cats.map((x) => x.id), ids);

  // Catégorie non vide : suppression bloquée, puis déplacement des produits
  const drinks = cats.find((x) => x.name === "Boissons");
  const blocked = await call("DELETE", `/api/admin/categories/${drinks.id}`);
  assert.equal(blocked.status, 409);
  assert.equal(blocked.body.productCount, drinks.productCount);
  assert.equal((await call("DELETE", `/api/admin/categories/${drinks.id}?moveTo=${c.id}`)).status, 200);
  cats = (await call("GET", "/api/admin/categories")).body;
  assert.equal(cats.find((x) => x.id === c.id).productCount, drinks.productCount);

  assert.equal((await call("DELETE", `/api/admin/categories/${c.id}?deleteProducts=1`)).status, 200);
  const products = (await call("GET", "/api/admin/products")).body;
  assert.ok(!products.some((p) => p.categoryId === c.id));
});

test("changement de mot de passe puis déconnexion", async () => {
  assert.equal((await call("POST", "/api/admin/password", { currentPassword: "faux", newPassword: "nouveau-mdp-123" })).status, 400);
  assert.equal((await call("POST", "/api/admin/password", { currentPassword: PASSWORD, newPassword: "court" })).status, 400);
  assert.equal((await call("POST", "/api/admin/password", { currentPassword: PASSWORD, newPassword: "nouveau-mdp-123" })).status, 200);
  await call("POST", "/api/logout");
  assert.equal((await call("GET", "/api/admin/products")).status, 401);
  const relog = await call("POST", "/api/login", { username: "admin", password: "nouveau-mdp-123" }, { auth: false });
  assert.equal(relog.status, 200);
});

test("blocage après trop de tentatives de connexion", async () => {
  let last;
  for (let i = 0; i < 6; i++) last = await call("POST", "/api/login", { username: "admin", password: "x" }, { auth: false });
  assert.equal(last.status, 429);
});
