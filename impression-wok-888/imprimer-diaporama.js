// Enregistre chaque diapo de diaporama.html en image 1920 × 1080 (dossier ecrans/) et vérifie que rien ne déborde.
//   node imprimer-diaporama.js
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

(async () => {
  const navigateur = await chromium.launch();
  const page = await navigateur.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto("file://" + path.join(__dirname, "diaporama.html"));
  await page.evaluate(() => document.fonts.ready);

  // Le contenu doit s'arrêter au-dessus de la frise du bas (40 px) et ne pas déborder sur les côtés.
  const debords = await page.evaluate(() => [...document.querySelectorAll(".diapo")].flatMap((d) => {
    const cadre = d.getBoundingClientRect();
    const zone = d.querySelector(".colonnes, .flux");
    const res = [];
    for (const el of zone.querySelectorAll(".plat, .formule, h3, .intro")) {
      const r = el.getBoundingClientRect();
      if (r.bottom > cadre.bottom - 40 || r.right > cadre.right - 40) res.push(d.dataset.fichier + " : " + el.textContent.trim().slice(0, 40));
    }
    if (zone.scrollWidth > zone.clientWidth + 2) res.push(d.dataset.fichier + " : colonnes en trop");
    return res;
  }));

  const diapos = await page.locator(".diapo").all();
  for (const d of diapos) {
    const fichier = path.join(__dirname, "ecrans", await d.getAttribute("data-fichier"));
    fs.mkdirSync(path.dirname(fichier), { recursive: true });
    await d.screenshot({ path: fichier });
  }
  await navigateur.close();
  if (debords.length) { console.error("Attention, du texte dépasse :\n" + debords.join("\n")); process.exit(1); }
  console.log(diapos.length + " diapos enregistrées dans ecrans/");
})();
