// Enregistre les couvertures « à la une » et les stories de stories.html en images 1080 × 1920 (dossier instagram/).
// Les stories de la carte sont découpées en pages : le flux en colonnes défile d'une colonne par page.
//   node imprimer-stories.js
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const PAS = 1080; // largeur d'une colonne + gouttière = une page

(async () => {
  const navigateur = await chromium.launch();
  const page = await navigateur.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto("file://" + path.join(__dirname, "stories.html"));
  await page.evaluate(() => document.fonts.ready);
  // Un titre de rubrique ne reste jamais seul en bas d'une story : il est attaché à son premier plat.
  await page.evaluate(() => document.querySelectorAll(".flux .rubrique").forEach((r) => {
    const tete = document.createElement("div");
    tete.className = "tete-rubrique";
    r.prepend(tete);
    [r.querySelector("h3"), r.querySelector(".intro"), r.querySelector(".plat")].forEach((el) => el && tete.append(el));
  }));
  const racine = path.join(__dirname, "instagram");
  fs.rmSync(racine, { recursive: true, force: true });
  let total = 0;

  const enregistrer = async (story, fichier) => {
    const cible = path.join(racine, fichier);
    fs.mkdirSync(path.dirname(cible), { recursive: true });
    await story.screenshot({ path: cible });
    total++;
  };

  for (const story of await page.locator(".story").all()) {
    const fichier = await story.getAttribute("data-fichier");
    if (fichier) { await enregistrer(story, fichier); continue; }

    const dossier = await story.getAttribute("data-dossier");
    const nom = await story.getAttribute("data-nom");
    const pages = await story.evaluate((s, pas) => Math.ceil(s.querySelector(".flux").scrollWidth / pas), PAS);
    for (let i = 0; i < pages; i++) {
      await story.evaluate((s, { i, pages, pas }) => {
        s.querySelector(".flux").style.transform = `translateX(${-i * pas}px)`;
        s.querySelector(".points").innerHTML = pages > 1
          ? Array.from({ length: pages }, (_, j) => `<i class="${j === i ? "actif" : ""}"></i>`).join("") : "";
      }, { i, pages, pas: PAS });
      await enregistrer(story, `${dossier}/${nom}-${i + 1}.png`);
    }
  }
  await navigateur.close();
  console.log(total + " images enregistrées dans instagram/");
})();
