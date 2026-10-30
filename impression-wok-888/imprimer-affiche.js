// Imprime affiche-halloween.html en PDF (A3 portrait) et en PNG (pour les réseaux sociaux).
//   node imprimer-affiche.js
const path = require("path");
const { chromium } = require("playwright");

(async () => {
  const navigateur = await chromium.launch();
  const page = await navigateur.newPage({ viewport: { width: 1123, height: 1588 }, deviceScaleFactor: 2 });
  await page.goto("file://" + path.join(__dirname, "affiche-halloween.html"));
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ media: "print" });
  await page.pdf({ path: path.join(__dirname, "affiche-halloween.pdf"), preferCSSPageSize: true, printBackground: true });
  await page.locator(".affiche").screenshot({ path: path.join(__dirname, "affiche-halloween.png") });
  await navigateur.close();
  console.log("affiche-halloween.pdf et affiche-halloween.png écrits");
})();
