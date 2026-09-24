(() => {
  const REFRESH_MS = 30_000;
  const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  const els = {
    menu: document.getElementById("menu"),
    cats: document.getElementById("cat-list"),
    filters: document.getElementById("filters"),
    search: document.getElementById("search"),
    status: document.getElementById("status"),
    updated: document.getElementById("updated"),
    tpl: document.getElementById("item-tpl"),
  };

  let data = { categories: [] };
  let query = "";
  let activeTags = new Set();

  async function load() {
    try {
      const res = await fetch("api.php?action=menu", { cache: "no-store" });
      if (!res.ok) throw new Error(res.status);
      data = await res.json();
      els.updated.textContent = `Dernière mise à jour : ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
      render();
    } catch {
      if (!data.categories.length) els.status.textContent = "Impossible de charger la carte pour le moment. Réessayez dans un instant.";
    }
  }

  function matches(p) {
    if (activeTags.size && !p.tags.some((t) => activeTags.has(norm(t)))) return false;
    if (!query) return true;
    return norm(`${p.name} ${p.description} ${p.tags.join(" ")}`).includes(query);
  }

  function renderFilters() {
    const tags = new Map();
    data.categories.forEach((c) => c.products.forEach((p) => p.tags.forEach((t) => tags.set(norm(t), t))));
    // Retire les filtres qui n'existent plus
    activeTags = new Set([...activeTags].filter((t) => tags.has(t)));
    els.filters.replaceChildren(
      ...[...tags].sort().map(([key, label]) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "filter";
        b.textContent = label;
        b.setAttribute("aria-pressed", String(activeTags.has(key)));
        b.addEventListener("click", () => {
          activeTags.has(key) ? activeTags.delete(key) : activeTags.add(key);
          render();
        });
        return b;
      })
    );
  }

  function renderItem(p) {
    const node = els.tpl.content.firstElementChild.cloneNode(true);
    node.querySelector(".item-name").textContent = p.name;
    node.querySelector(".item-price").textContent = p.priceCents === null ? "Sur demande" : euro.format(p.priceCents / 100);
    const desc = node.querySelector(".item-desc");
    if (p.description) desc.textContent = p.description;
    else desc.remove();
    const meta = node.querySelector(".item-meta");
    if (p.soldOut) {
      node.classList.add("sold-out");
      meta.append(badge("Épuisé", "stock-badge out"));
    } else if (p.remaining) {
      meta.append(badge(p.remaining === 1 ? "Plus qu'une portion" : `Plus que ${p.remaining} portions`, "stock-badge low"));
    }
    p.tags.forEach((t) => {
      const b = badge(t, "tag");
      b.dataset.tag = norm(t);
      meta.append(b);
    });
    return node;
  }

  function badge(text, cls) {
    const s = document.createElement("span");
    s.className = cls;
    s.textContent = text;
    return s;
  }

  function render() {
    renderFilters();
    const sections = [];
    const links = [];
    for (const c of data.categories) {
      const items = c.products.filter(matches);
      if (!items.length) continue;
      const section = document.createElement("section");
      section.className = "cat-section";
      section.id = `cat-${c.id}`;
      const h2 = document.createElement("h2");
      h2.textContent = c.name;
      const grid = document.createElement("div");
      grid.className = "items";
      grid.append(...items.map(renderItem));
      section.append(h2, grid);
      sections.push(section);

      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = `#cat-${c.id}`;
      a.textContent = c.name;
      li.append(a);
      links.push(li);
    }
    els.menu.replaceChildren(...sections);
    els.cats.replaceChildren(...links);
    if (!data.categories.length) els.status.textContent = "La carte est en cours de préparation.";
    else if (!sections.length) els.status.textContent = "Aucun plat ne correspond à votre recherche.";
    else els.status.textContent = "";
    observeSections();
  }

  // Met en surbrillance la catégorie visible à l'écran
  let observer;
  function observeSections() {
    if (!("IntersectionObserver" in window)) return;
    observer?.disconnect();
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          els.cats.querySelectorAll("a").forEach((a) => {
            const on = a.getAttribute("href") === `#${e.target.id}`;
            if (on && !a.classList.contains("active")) {
              // Fait défiler uniquement la barre des catégories (horizontalement) : scrollIntoView
              // ferait aussi bouger la page et la ferait remonter pendant le défilement.
              const left = a.offsetLeft - (els.cats.clientWidth - a.offsetWidth) / 2;
              els.cats.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
            }
            a.classList.toggle("active", on);
          });
        });
      },
      { rootMargin: "-140px 0px -60% 0px" }
    );
    els.menu.querySelectorAll(".cat-section").forEach((s) => observer.observe(s));
  }

  els.search.addEventListener("input", () => {
    query = norm(els.search.value.trim());
    render();
  });

  load();
  setInterval(() => {
    if (!document.hidden) load();
  }, REFRESH_MS);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) load();
  });
})();
