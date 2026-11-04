// Imprime une affiche HTML en PDF (A3 portrait) et en PNG (pour les réseaux sociaux).
//   node imprimer-affiche.js                       (affiche-halloween)
//   node imprimer-affiche.js affiche-menu-du-jour
const path = require("path");
const { chromium } = require("playwright");

const nom = process.argv[2] || "affiche-halloween";

(async () => {
  const navigateur = await chromium.launch();
  const page = await navigateur.newPage({ viewport: { width: 1123, height: 1588 }, deviceScaleFactor: 2 });
  await page.goto("file://" + path.join(__dirname, nom + ".html"));
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ media: "print" });
  await page.pdf({ path: path.join(__dirname, nom + ".pdf"), preferCSSPageSize: true, printBackground: true });
  await page.locator(".affiche").screenshot({ path: path.join(__dirname, nom + ".png") });
  await navigateur.close();
  console.log(`${nom}.pdf et ${nom}.png écrits`);
})();
