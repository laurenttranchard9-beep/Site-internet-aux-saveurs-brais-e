// Composition du film : chaque image est une fonction du temps, rendu(t) (t en secondes). Aucune animation CSS ici,
// pour que le même t donne toujours la même image.
(() => {
  const S = SCENARIO;
  const $ = (s) => document.querySelector(s);
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  const mix = (a, b, p) => a + (b - a) * p;
  const E = {
    outCubic: (x) => 1 - Math.pow(1 - x, 3),
    inCubic: (x) => x * x * x,
    inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    outBack: (x, s = 1.6) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2),
    outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
    inOutSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
  };
  const bosse = (t, a, b) => Math.sin(Math.PI * prog(t, a, b)); // 0 → 1 → 0
  // « inherit » plutôt que « visible » : un élément caché cache aussi ses enfants (les iframes du téléphone)
  const montrer = (el, oui) => { el.style.visibility = oui ? "inherit" : "hidden"; };
  const typo = (s) => s.replace(/ ([?!:;])/g, "\u00a0$1");

  // ---------- Titres ----------
  const ICONES = {
    horloge: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    euro: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M17 6.5a7 7 0 1 0 0 11M4.5 10.5h9M4.5 13.5h9"/></svg>',
    coche: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  };
  const titres = S.titres.map((d) => {
    const bloc = document.createElement("div");
    bloc.className = "titre";
    const sur = document.createElement("p");
    sur.className = "sur";
    sur.textContent = typo(d.sur);
    bloc.append(sur);
    const lettres = [];
    const lignes = d.lignes.map((texte) => {
      const ligne = document.createElement("div");
      ligne.className = "ligne";
      const grand = document.createElement("span");
      grand.className = "grand";
      texte.split(/(\*[^*]+\*)/).filter(Boolean).forEach((morceau) => {
        const vert = morceau.startsWith("*");
        for (const c of vert ? morceau.slice(1, -1) : morceau) {
          const s = document.createElement("span");
          s.textContent = c === " " ? " " : c;
          if (vert) s.className = "vert";
          grand.append(s);
          lettres.push(s);
        }
      });
      ligne.append(grand);
      bloc.append(ligne);
      return { ligne, grand, lettres: [...grand.children] };
    });
    const sous = document.createElement("p");
    sous.className = "sous";
    // {195} : nombre qui défile jusqu'à sa valeur
    let compteur = null;
    d.sous.split(/(\{\d+\})/).filter(Boolean).forEach((m) => {
      if (/^\{\d+\}$/.test(m)) {
        compteur = { el: document.createElement("b"), n: Number(m.slice(1, -1)) };
        compteur.el.className = "compteur";
        sous.append(compteur.el);
      } else sous.append(document.createTextNode(typo(m)));
    });
    bloc.append(sous);
    $("#titres").append(bloc);
    return { d, bloc, sur, lignes, sous, compteur };
  });
  function ajusterTitres() { // une ligne trop longue est réduite pour tenir dans la largeur
    for (const t of titres) for (const l of t.lignes) {
      l.grand.style.fontSize = "";
      const largeur = l.grand.getBoundingClientRect().width;
      if (largeur > 950) l.grand.style.fontSize = `${Math.floor(146 * 950 / largeur)}px`;
    }
  }

  function rendreTitre(T, t) {
    const { de, a } = T.d;
    const visible = t >= de && t <= a;
    montrer(T.bloc, visible);
    if (!visible) return;
    const sortie = E.inCubic(prog(t, a - 0.38, a));
    T.bloc.style.transform = `translateY(${-70 * sortie}px)`;
    T.bloc.style.opacity = String(1 - sortie);
    const ps = E.outCubic(prog(t, de, de + 0.45));
    T.sur.style.opacity = String(ps);
    T.sur.style.transform = `translateY(${28 * (1 - ps)}px) rotate(-3deg)`;
    let n = 0;
    T.lignes.forEach((l, i) => {
      l.lettres.forEach((s) => {
        const debut = de + 0.12 + i * 0.14 + n++ * 0.018;
        const p = E.outExpo(prog(t, debut, debut + 0.55));
        s.style.transform = `translateY(${(1 - p) * 105}%) rotate(${(1 - p) * 6}deg)`;
      });
    });
    const pss = E.outCubic(prog(t, de + 0.55, de + 1.05));
    T.sous.style.opacity = String(pss);
    T.sous.style.transform = `translateY(${22 * (1 - pss)}px)`;
    if (T.compteur) T.compteur.el.textContent = String(Math.round(T.compteur.n * E.outCubic(prog(t, de + 0.6, de + 1.8))));
  }

  // ---------- Bulles ----------
  const bulles = S.bulles.map((d) => {
    const b = document.createElement("div");
    b.className = "bulle";
    b.style.left = `${d.x}px`;
    b.style.top = `${d.y}px`;
    if (d.icone) b.insertAdjacentHTML("beforeend", ICONES[d.icone]);
    const nombre = d.compteur ? document.createElement("b") : null;
    if (nombre) b.append(nombre);
    b.append(document.createTextNode(typo(d.texte)));
    $("#bulles").append(b);
    return { d, b, nombre };
  });
  function rendreBulle(B, t) {
    const { de, a, compteur } = B.d;
    const visible = t >= de && t <= a;
    montrer(B.b, visible);
    if (!visible) return;
    const p = E.outBack(prog(t, de, de + 0.42), 2.2);
    const s = 1 - E.inCubic(prog(t, a - 0.25, a));
    B.b.style.opacity = String(Math.min(1, prog(t, de, de + 0.15)) * s);
    B.b.style.transform = `translateY(${Math.sin(t * 2.2) * 5}px) scale(${(0.55 + 0.45 * p) * (0.85 + 0.15 * s)}) rotate(${-2 + Math.sin(t * 1.3)}deg)`;
    if (B.nombre) B.nombre.textContent = String(Math.round(compteur * E.outCubic(prog(t, de + 0.1, de + 1.2))));
  }

  // ---------- Touchers (enregistrés par le pilote, en pixels de la page du site) ----------
  const touchers = [];
  window.toucher = (t0, x, y) => {
    const el = document.createElement("div");
    el.className = "toucher";
    el.innerHTML = '<i class="onde"></i><i class="doigt"></i>';
    el.style.left = `${x * 1.5}px`;
    el.style.top = `${71 + y * 1.5}px`;
    $("#touchers").append(el);
    touchers.push({ t0, el, onde: el.firstChild, doigt: el.lastChild });
  };
  function rendreToucher(T, t) {
    const { t0 } = T;
    const visible = t >= t0 - 0.28 && t <= t0 + 0.75;
    montrer(T.el, visible);
    if (!visible) return;
    const approche = E.outCubic(prog(t, t0 - 0.28, t0));
    const depart = prog(t, t0 + 0.22, t0 + 0.5);
    const appui = bosse(t, t0 - 0.04, t0 + 0.16);
    T.doigt.style.opacity = String(approche * (1 - depart));
    T.doigt.style.transform = `scale(${(1.7 - 0.7 * approche) * (1 - 0.18 * appui)})`;
    const o = prog(t, t0, t0 + 0.6);
    T.onde.style.opacity = String(t >= t0 ? 0.95 * (1 - o) : 0);
    T.onde.style.transform = `scale(${1 + 1.9 * E.outCubic(o)})`;
  }

  // ---------- Tracés autour d'un élément du site (en pixels de la page du site) ----------
  const traces = [];
  window.entourer = (t0, duree, b) => {
    const pad = 14;
    const cx = b.x * 1.5 + (b.l * 1.5) / 2, cy = 71 + b.y * 1.5 + (b.h * 1.5) / 2;
    const rx = (b.l * 1.5) / 2 + pad * 1.6, ry = (b.h * 1.5) / 2 + pad;
    const points = [];
    for (let i = 0; i <= 64; i++) { // un tour et un peu plus, légèrement irrégulier, comme au feutre
      const a = -2.2 + (i / 64) * Math.PI * 2.16;
      const w = 1 + 0.035 * Math.sin(i * 0.9) + 0.03 * (i / 64);
      points.push(`${(cx + Math.cos(a) * rx * w).toFixed(1)} ${(cy + Math.sin(a) * ry * w).toFixed(1)}`);
    }
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("class", "trace");
    svg.setAttribute("width", "585");
    svg.setAttribute("height", "1266");
    const p = document.createElementNS(ns, "path");
    p.setAttribute("d", "M" + points.join("L"));
    svg.append(p);
    $("#touchers").append(svg);
    const longueur = p.getTotalLength();
    p.style.strokeDasharray = String(longueur);
    traces.push({ t0, duree, svg, p, longueur });
  };
  function rendreTrace(T, t) {
    const { t0, duree } = T;
    const visible = t >= t0 && t <= t0 + duree + 0.3;
    montrer(T.svg, visible);
    if (!visible) return;
    T.p.style.strokeDashoffset = String(T.longueur * (1 - E.inOutCubic(prog(t, t0, t0 + 0.5))));
    T.svg.style.opacity = String(1 - prog(t, t0 + duree, t0 + duree + 0.3));
  }

  // ---------- Braises (déterministes : position = fonction du temps) ----------
  const toile = $("#braises");
  const ctx = toile.getContext("2d");
  const hasard = (n) => (((Math.sin(n * 12.9898) * 43758.5453) % 1) + 1) % 1;
  function rendreBraises(t, force) {
    ctx.clearRect(0, 0, 1080, 1920);
    if (force <= 0) return;
    for (let i = 0; i < 46; i++) {
      const vitesse = 70 + hasard(i + 1) * 120;
      const y = 2000 - ((t * vitesse + hasard(i + 2) * 2200) % 2200);
      const x = hasard(i + 3) * 1080 + Math.sin(t * (0.6 + hasard(i + 4)) + i) * 36;
      const r = 1.6 + hasard(i + 5) * 3.6;
      const vie = clamp((2000 - y) / 300) * clamp(y / 500);
      const a = force * vie * (0.45 + 0.45 * Math.sin(t * (5 + hasard(i + 6) * 4) + i));
      if (a <= 0.01) continue;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
      g.addColorStop(0, `rgba(255, 214, 120, ${a})`);
      g.addColorStop(0.35, `rgba(255, 140, 40, ${a * 0.55})`);
      g.addColorStop(1, "rgba(255, 90, 20, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r * 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---------- Logo d'ouverture ----------
  const logo = $("#logo");
  const lw1 = $("#lw1"), lw2 = $("#lw2"), lk = $("#lk"), larc = $("#larc");
  // Arc de jade révélé par un trait qui suit l'arc (masque SVG)
  const svgLogo = $("#logo svg");
  svgLogo.insertAdjacentHTML("afterbegin", '<defs><mask id="m-arc" maskUnits="userSpaceOnUse" x="0" y="0" width="1400" height="1200"><path id="m-arc-trait" d="M858.5 351.7A310 310 0 0 1 567.2 856.3" fill="none" stroke="#fff" stroke-width="150" stroke-dasharray="760" stroke-dashoffset="760"/></mask></defs>');
  larc.setAttribute("mask", "url(#m-arc)");
  const arcTrait = $("#m-arc-trait");
  const lettresNom = [...document.querySelectorAll("#logo-nom span")];
  const script = $("#logo-script");
  function rendreLogo(t) {
    const visible = t < S.logoSortie[1] + 0.05;
    montrer(logo, visible);
    if (!visible) return;
    const traits = [[lw1, 0.25], [lw2, 0.42], [lk, 0.62]];
    for (const [el, d] of traits) {
      const p = E.outBack(prog(t, d, d + 0.55), 1.8);
      const o = prog(t, d, d + 0.2);
      el.style.opacity = String(o);
      el.style.transform = el === lk ? `translateX(${(1 - p) * 120}px)` : `translateY(${(1 - p) * -110}px)`;
    }
    arcTrait.setAttribute("stroke-dashoffset", String(760 * (1 - E.inOutCubic(prog(t, 0.78, 1.4)))));
    lettresNom.forEach((s, i) => {
      const d = 1.15 + i * 0.06;
      const p = E.outBack(prog(t, d, d + 0.5), 1.9);
      s.style.opacity = String(prog(t, d, d + 0.18));
      s.style.transform = `translateY(${(1 - p) * 90}px)`;
    });
    const ps = E.outCubic(prog(t, 1.75, 2.45));
    script.style.clipPath = `inset(-20% ${100 - ps * 100}% -20% -5%)`;
    const sortie = E.inOutCubic(prog(t, S.logoSortie[0], S.logoSortie[1]));
    logo.style.opacity = String(1 - sortie);
    logo.style.transform = `translateY(${-180 * sortie}px) scale(${1 - 0.25 * sortie})`;
  }

  // ---------- Téléphone ----------
  const tel = $("#telephone");
  const changements = S.titres.slice(1).map((d) => d.de);
  function rendreTelephone(t) {
    const visible = t >= S.drop - 0.05 && t < S.sortie + 0.95;
    montrer(tel, visible);
    if (!visible) return;
    const monte = prog(t, S.drop, S.drop + 1.15); // le téléphone monte sur le départ du rythme
    let y = (1 - E.outBack(monte, 0.7)) * 1500;
    let rot = (1 - E.outCubic(monte)) * 9;
    let echelle = 1;
    // Petit élan à chaque changement de scène
    changements.forEach((c, i) => {
      const b = bosse(t, c - 0.3, c + 0.45);
      echelle -= 0.04 * b;
      rot += (i % 2 ? 1.6 : -1.6) * b;
    });
    // Flottement léger
    y += Math.sin(t * 1.15) * 7;
    rot += Math.sin(t * 0.7) * 0.35;
    // Sortie
    const s = prog(t, S.sortie, S.sortie + 0.9);
    y += E.inCubic(s) * 1700;
    rot += E.inCubic(s) * -8;
    tel.style.transform = `translateY(${y}px) rotate(${rot}deg) scale(${0.92 * echelle})`;
  }

  // ---------- Fin ----------
  const fin = $("#fin");
  const finEls = [["#fin-logo", 0.05, "pop"], ["#fin-web", 0.35, "monte"], ["#fin-tel", 0.85, "pop"], ["#fin-lieu", 1.2, "monte"], ["#fin-slogan", 1.6, "trace"]]
    .map(([s, d, mode]) => [$(s), S.fin + d, mode]);
  function rendreFin(t) {
    const visible = t >= S.fin;
    montrer(fin, visible);
    if (!visible) return;
    for (const [el, d, mode] of finEls) {
      const p = prog(t, d, d + 0.6);
      if (mode === "pop") {
        el.style.opacity = String(prog(t, d, d + 0.15));
        el.style.transform = `scale(${0.5 + 0.5 * E.outBack(p, 2)})`;
      } else if (mode === "monte") {
        el.style.opacity = String(E.outCubic(p));
        // Sur le coup final, l'adresse du site grossit un instant
        const accent = el.id === "fin-web" ? 0.08 * bosse(t, S.accentFin, S.accentFin + 0.55) : 0;
        el.style.transform = `translateY(${(1 - E.outExpo(p)) * 60}px) scale(${1 + accent})`;
      } else {
        el.style.clipPath = `inset(-20% ${100 - E.outCubic(p) * 100}% -20% -5%)`;
        el.style.transform = "rotate(-3deg)";
      }
    }
  }

  // ---------- Image complète ----------
  window.rendu = (t) => {
    // Halo : suit l'action (logo, téléphone, fin)
    const hx = 540 + Math.sin(t * 0.4) * 60;
    const hy = t < S.drop ? 900 : t < S.fin ? mix(900, 1180, prog(t, S.drop, S.drop + 1.15)) : mix(1180, 950, prog(t, S.fin, S.fin + 0.7));
    $("#halo").style.transform = `translate(${hx}px, ${hy}px) scale(${1 + Math.sin(t * 0.9) * 0.04})`;
    $("#motif").style.transform = `translateY(${(t * 14) % 80}px)`;
    const forceBraises = t < S.drop + 0.2 ? 1 : t < S.fin ? 0.4 : 1;
    rendreBraises(t, forceBraises);
    $("#voile").style.opacity = String(1 - E.outCubic(prog(t, 0, 0.6)));
    rendreLogo(t);
    titres.forEach((T) => rendreTitre(T, t));
    rendreTelephone(t);
    bulles.forEach((B) => rendreBulle(B, t));
    touchers.forEach((T) => rendreToucher(T, t));
    traces.forEach((T) => rendreTrace(T, t));
    rendreFin(t);
  };
  document.fonts.ready.then(() => { ajusterTitres(); window.pret = true; });
})();
