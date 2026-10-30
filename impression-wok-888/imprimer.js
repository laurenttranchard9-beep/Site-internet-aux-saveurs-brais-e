// Imprime carte-a3-3-volets.html en PDF (A3 paysage, recto-verso) et vérifie que rien ne déborde des volets.
//   node imprimer.js
const path = require("path");
const { chromium } = require("playwright");

(async () => {
  const navigateur = await chromium.launch();
  const page = await navigateur.newPage();
  await page.goto("file://" + path.join(__dirname, "carte-a3-3-volets.html"));
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ media: "print" });

  // Chaque colonne doit s'arrêter au-dessus de la frise du bas (12 mm).
  const debords = await page.evaluate(() => {
    const mm = 96 / 25.4;
    const res = [];
    document.querySelectorAll(".volet").forEach((v, i) => {
      const bas = v.getBoundingClientRect().bottom - 12 * mm;
      v.querySelectorAll(".colonne").forEach((c, j) => {
        const fin = c.lastElementChild.getBoundingClientRect().bottom;
        res.push({ volet: i + 1, colonne: j + 1, marge_mm: +((bas - fin) / mm).toFixed(1) });
      });
    });
    return res;
  });
  console.table(debords);

  await page.pdf({ path: path.join(__dirname, "carte-a3-3-volets.pdf"), preferCSSPageSize: true, printBackground: true });
  await navigateur.close();
  const trop = debords.filter((d) => d.marge_mm < 0);
  if (trop.length) { console.error("Attention : du texte dépasse dans", trop.length, "colonne(s)."); process.exit(1); }
  console.log("carte-a3-3-volets.pdf écrit");
})();
