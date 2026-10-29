// Pilote du film : avance le temps image par image, joue les actions du scénario sur le vrai site, filme la composition.
// Le site (port 8765) et la composition (port 8766) doivent être servis : filmer.sh s'en charge.
//   node film.js --sortie film.mp4            film complet (MP4 H.264, 1080 × 1920, 30 images/s)
//   node film.js --images 4.2,9.6 --dossier d  images fixes à ces instants (PNG), pour vérifier
//   node film.js --de 20 --a 27 --sortie x.mp4 un extrait (le début est rejoué sans être filmé)
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const S = require("./compo/scenario.js");

const opts = {};
for (let i = 2; i < process.argv.length; i += 2) opts[process.argv[i].replace(/^--/, "")] = process.argv[i + 1];
const FPS = Number(opts.fps || 30);
const DE = Number(opts.de || 0);
const A = Number(opts.a || S.duree);
const images = opts.images ? opts.images.split(",").map(Number) : null;
const dossier = opts.dossier || "images";
const SITE = "http://127.0.0.1:8765";

(async () => {
  const navigateur = await chromium.launch();
  const ctx = await navigateur.newContext({
    viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1, hasTouch: true, bypassCSP: true,
    locale: "fr-FR", timezoneId: "Europe/Paris",
  });
  await ctx.addInitScript({ path: path.join(__dirname, "temps-virtuel.js") });
  const r = await ctx.request.post(`${SITE}/api.php?action=login`, { data: { username: "patron", password: "motdepasse-wok888" } });
  if (!r.ok()) throw new Error(`connexion à l'espace de gestion : ${r.status()}`);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.error("[erreur page]", e.message));
  page.on("console", (m) => { if (m.type() === "error") console.error("[console]", m.text()); });
  // Toutes les animations CSS et Web Animations figées avant le chargement : elles n'avancent qu'avec l'horloge virtuelle
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Animation.enable");
  await cdp.send("Animation.setPlaybackRate", { playbackRate: 0 });
  await page.goto("http://127.0.0.1:8766/video-wok888/compo/index.html", { waitUntil: "load" });
  await page.waitForFunction(() => window.pret === true);
  const site = await (await page.$("#site")).contentFrame();
  const gestion = await (await page.$("#gestion")).contentFrame();
  for (const f of [site, gestion]) await f.waitForFunction(() => window.__tv && document.readyState === "complete");
  await site.waitForFunction(() => document.querySelectorAll("#choix-base .option").length > 0);
  await gestion.waitForFunction(() => document.querySelectorAll(".price-input").length > 0);
  await page.waitForTimeout(500);
  for (const f of [site, gestion]) await f.evaluate(() => window.__tv.remettreAZero());

  // Touchers annoncés 0,3 s avant l'action (le doigt arrive), puis l'action elle-même
  const evenements = [];
  for (const a of S.actions) {
    if (["cliquer", "toucher", "taper"].includes(a.faire)) evenements.push({ t: a.t - 0.3, annonce: true, a });
    if (a.faire !== "toucher") evenements.push({ t: a.t, a });
  }
  evenements.sort((x, y) => x.t - y.t);
  async function executer({ annonce, a }) {
    const f = a.cadre === "gestion" ? gestion : site;
    if (annonce) {
      const c = await f.evaluate((a) => window.__tv.centre(a), a);
      return page.evaluate(([t0, x, y]) => window.toucher(t0, x, y), [a.t, c.x, c.y]);
    }
    if (a.faire === "entourer") {
      const b = await f.evaluate((a) => window.__tv.boite(a), a);
      return page.evaluate(([t0, d, b]) => window.entourer(t0, d, b), [a.t, a.duree, b]);
    }
    if (a.faire === "defilerDe") return f.evaluate(([dy, d]) => window.__tv.defilerDe(dy, d), [a.dy, a.duree * 1000]);
    if (a.faire === "defiler") return f.evaluate(([a, m, d]) => window.__tv.defilerVers(a, m, d), [a, a.marge, a.duree * 1000]);
    if (a.faire === "cliquer") return f.evaluate((a) => window.__tv.cliquer(a), a);
    if (a.faire === "taper") return f.evaluate((a) => window.__tv.taper(a), { ...a, pas: a.pas * 1000 });
  }

  let ffmpeg = null;
  if (!images) {
    const sortie = opts.sortie || "film.mp4";
    ffmpeg = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
      "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "17",
      "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-movflags", "+faststart", sortie], { stdio: ["pipe", "inherit", "inherit"] });
  } else fs.mkdirSync(dossier, { recursive: true });

  const debut = Date.now();
  let k = 0, filmees = 0;
  for (let i = 0; ; i++) {
    const t = i / FPS;
    if (t > A + 1e-9) break;
    while (k < evenements.length && evenements[k].t <= t + 1e-9) await executer(evenements[k++]);
    const ts = Math.max(0, t - S.debutSite) * 1000;
    await site.evaluate((x) => window.__tv.aller(x), ts);
    await gestion.evaluate((x) => window.__tv.aller(x), ts);
    if (t + 1e-9 < DE) continue;
    if (images) {
      const voulu = images.find((x) => Math.round(x * FPS) === i); // l'image la plus proche de chaque instant demandé
      if (voulu === undefined) continue;
      await page.evaluate((x) => window.rendu(x), t);
      await page.screenshot({ path: path.join(dossier, `${voulu.toFixed(2).padStart(5, "0")}.png`) });
      filmees++;
      continue;
    }
    await page.evaluate((x) => window.rendu(x), t);
    const image = await page.screenshot({ type: "jpeg", quality: 94 });
    if (!ffmpeg.stdin.write(image)) await new Promise((ok) => ffmpeg.stdin.once("drain", ok));
    if (++filmees % 150 === 0) console.log(`${(t).toFixed(1)} s filmées (${((Date.now() - debut) / 1000).toFixed(0)} s)`);
  }
  if (ffmpeg) {
    ffmpeg.stdin.end();
    await new Promise((ok) => ffmpeg.on("close", ok));
  }
  console.log(`${filmees} images en ${((Date.now() - debut) / 1000).toFixed(0)} s`);
  await navigateur.close();
})().catch((e) => { console.error(e); process.exit(1); });
