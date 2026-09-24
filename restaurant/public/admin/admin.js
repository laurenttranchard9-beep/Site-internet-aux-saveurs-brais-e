(() => {
  const LOW_STOCK = 5;
  const $ = (sel, root = document) => root.querySelector(sel);
  const euroInput = (cents) => (cents / 100).toFixed(2).replace(".", ",");
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  const state = { categories: [], products: [] };

  // ---------- Utilitaires ----------
  class ApiError extends Error {
    constructor(status, body) {
      super(body.error || "Une erreur est survenue.");
      this.status = status;
      this.body = body;
    }
  }

  async function api(method, url, body) {
    const res = await fetch(url, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : {},
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: "same-origin",
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && url !== "/api/login" && url !== "/api/me") {
      showLogin("Votre session a expiré. Merci de vous reconnecter.");
      throw new ApiError(401, data);
    }
    if (!res.ok) throw new ApiError(res.status, data);
    return data;
  }

  function toast(message, type = "ok") {
    const t = document.createElement("div");
    t.className = `toast ${type}`;
    t.textContent = message;
    $("#toasts").append(t);
    setTimeout(() => t.remove(), type === "error" ? 5000 : 2500);
  }
  const fail = (err) => err.status !== 401 && toast(err.message, "error");

  function parsePrice(value) {
    const v = String(value).trim().replace(/\s|€/g, "").replace(",", ".");
    if (!/^\d+(\.\d{1,2})?$/.test(v)) return null;
    return Math.round(parseFloat(v) * 100);
  }

  function el(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === "class") node.className = v;
      else if (k === "dataset") Object.assign(node.dataset, v);
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else if (k in node && typeof v !== "string") node[k] = v;
      else node.setAttribute(k, v);
    }
    node.append(...children.filter((c) => c !== null && c !== undefined && c !== false));
    return node;
  }

  function flash(input, cls) {
    input.classList.remove("saving", "saved", "error");
    input.classList.add(cls);
    if (cls === "saved") setTimeout(() => input.classList.remove("saved"), 1200);
  }

  const confirmDialog = (title, text, label = "Supprimer") =>
    new Promise((resolve) => {
      const d = $("#confirm-dialog");
      $("#confirm-title").textContent = title;
      $("#confirm-text").textContent = text;
      $('button[value="confirm"]', d).textContent = label;
      d.returnValue = "";
      d.addEventListener("close", () => resolve(d.returnValue === "confirm"), { once: true });
      d.showModal();
    });

  // ---------- Connexion ----------
  function showLogin(message) {
    $("#app-view").hidden = true;
    $("#login-view").hidden = false;
    document.querySelectorAll("dialog[open]").forEach((d) => d.close());
    const err = $("#login-error");
    err.hidden = !message;
    err.textContent = message || "";
    $('#login-form [name="username"]').focus();
  }

  async function showApp() {
    $("#login-view").hidden = true;
    $("#app-view").hidden = false;
    await refresh();
  }

  $("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    const btn = $('button[type="submit"]', f);
    btn.disabled = true;
    try {
      await api("POST", "/api/login", { username: f.username.value, password: f.password.value });
      f.reset();
      await showApp();
    } catch (err) {
      const box = $("#login-error");
      box.textContent = err.message;
      box.hidden = false;
      f.password.select();
    } finally {
      btn.disabled = false;
    }
  });

  $("#logout").addEventListener("click", async () => {
    await api("POST", "/api/logout").catch(() => {});
    showLogin();
  });

  // ---------- Chargement ----------
  async function refresh() {
    const [categories, products] = await Promise.all([
      api("GET", "/api/admin/categories"),
      api("GET", "/api/admin/products"),
    ]);
    state.categories = categories;
    state.products = products;
    renderCategoryFilter();
    renderProducts();
    renderCategories();
  }

  const catName = (id) => state.categories.find((c) => c.id === id)?.name ?? "—";
  const stockLevel = (p) => (p.stock === null ? "none" : p.stock === 0 ? "out" : p.stock <= LOW_STOCK ? "low" : "ok");

  function renderStats() {
    const ps = state.products;
    $("#stat-total").textContent = ps.length;
    $("#stat-low").textContent = ps.filter((p) => stockLevel(p) === "low").length;
    $("#stat-out").textContent = ps.filter((p) => stockLevel(p) === "out").length;
    $("#stat-hidden").textContent = ps.filter((p) => !p.visible).length;
  }

  // ---------- Onglets ----------
  document.querySelectorAll('[role="tab"]').forEach((tab) =>
    tab.addEventListener("click", () => {
      document.querySelectorAll('[role="tab"]').forEach((t) => {
        const on = t === tab;
        t.setAttribute("aria-selected", String(on));
        $(`#${t.getAttribute("aria-controls")}`).hidden = !on;
      });
    })
  );

  // ---------- Produits ----------
  function renderCategoryFilter() {
    const sel = $("#p-cat");
    const current = sel.value;
    sel.replaceChildren(
      el("option", { value: "" }, "Toutes les catégories"),
      ...state.categories.map((c) => el("option", { value: String(c.id) }, c.name))
    );
    sel.value = state.categories.some((c) => String(c.id) === current) ? current : "";
  }

  function filteredProducts() {
    const q = norm($("#p-search").value.trim());
    const cat = $("#p-cat").value;
    const lowOnly = $("#p-low").checked;
    const order = new Map(state.categories.map((c, i) => [c.id, i]));
    return state.products
      .filter((p) => !cat || String(p.categoryId) === cat)
      .filter((p) => !lowOnly || ["low", "out"].includes(stockLevel(p)))
      .filter((p) => !q || norm(`${p.name} ${p.description} ${p.tags.join(" ")}`).includes(q))
      .sort((a, b) => order.get(a.categoryId) - order.get(b.categoryId) || a.name.localeCompare(b.name, "fr"));
  }

  function renderProducts() {
    const rows = filteredProducts().map(productRow);
    $("#p-rows").replaceChildren(...rows);
    $("#p-empty").hidden = rows.length > 0;
    renderStats();
  }

  function replaceProduct(updated) {
    state.products = state.products.map((p) => (p.id === updated.id ? updated : p));
    const row = $(`#p-rows tr[data-id="${updated.id}"]`);
    if (row) row.replaceWith(productRow(updated));
    renderStats();
  }

  async function patchProduct(p, changes, input) {
    if (input) flash(input, "saving");
    try {
      const updated = await api("PATCH", `/api/admin/products/${p.id}`, changes);
      replaceProduct(updated);
      const again = input && $(`#p-rows tr[data-id="${p.id}"] [data-field="${input.dataset.field}"]`);
      if (again) flash(again, "saved");
      return updated;
    } catch (err) {
      if (input) flash(input, "error");
      fail(err);
    }
  }

  function productRow(p) {
    const level = stockLevel(p);
    const price = el("input", {
      class: "price-input",
      inputmode: "decimal",
      value: euroInput(p.priceCents),
      "aria-label": `Prix de ${p.name}`,
      dataset: { field: "price" },
      onchange: (e) => {
        const cents = parsePrice(e.target.value);
        if (cents === null) {
          flash(e.target, "error");
          return toast("Prix invalide. Exemple : 12,50", "error");
        }
        patchProduct(p, { priceCents: cents }, e.target);
      },
      onkeydown: (e) => e.key === "Enter" && e.target.blur(),
    });

    let stockCell;
    if (p.stock === null) {
      stockCell = el("span", { class: "unlimited" }, "Illimité");
    } else {
      const adjust = async (delta) => {
        try {
          replaceProduct(await api("POST", `/api/admin/products/${p.id}/stock`, { delta }));
          $(`#p-rows tr[data-id="${p.id}"] button[data-delta="${delta}"]`)?.focus();
        } catch (err) {
          fail(err);
        }
      };
      stockCell = el(
        "div",
        { class: "stock-ctl" },
        el("button", { class: "icon-btn", type: "button", "aria-label": `Retirer 1 à ${p.name}`, dataset: { delta: "-1" }, disabled: p.stock === 0, onclick: () => adjust(-1) }, "−"),
        el("input", {
          type: "number", min: "0", step: "1", value: String(p.stock), "aria-label": `Stock de ${p.name}`,
          dataset: { field: "stock" },
          onchange: (e) => {
            const n = Number(e.target.value);
            if (!Number.isInteger(n) || n < 0 || e.target.value === "") {
              flash(e.target, "error");
              return toast("Le stock doit être un nombre entier positif.", "error");
            }
            patchProduct(p, { stock: n }, e.target);
          },
          onkeydown: (e) => e.key === "Enter" && e.target.blur(),
        }),
        el("button", { class: "icon-btn", type: "button", "aria-label": `Ajouter 1 à ${p.name}`, dataset: { delta: "1" }, onclick: () => adjust(1) }, "+")
      );
    }

    const visible = el(
      "label",
      { class: "switch", title: p.visible ? "Visible sur la carte" : "Masqué de la carte" },
      el("input", {
        type: "checkbox",
        checked: p.visible,
        "aria-label": `Afficher ${p.name} sur la carte`,
        onchange: (e) => patchProduct(p, { visible: e.target.checked }),
      }),
      el("span")
    );

    return el(
      "tr",
      { dataset: { id: String(p.id) }, class: [!p.visible && "is-hidden", level === "out" && "is-out", level === "low" && "is-low"].filter(Boolean).join(" ") },
      el(
        "td",
        { class: "c-name" },
        el("div", { class: "p-name" }, p.name,
          level === "out" ? el("span", { class: "p-badge out" }, "Épuisé") : null,
          level === "low" ? el("span", { class: "p-badge low" }, "Stock faible") : null),
        p.description ? el("div", { class: "p-desc", title: p.description }, p.description) : null
      ),
      el("td", { class: "c-cat" }, catName(p.categoryId)),
      el("td", { "data-label": "Prix (€)" }, price),
      el("td", { "data-label": "Stock" }, stockCell),
      el("td", { "data-label": "Visible" }, visible),
      el(
        "td",
        { class: "c-actions" },
        el(
          "div",
          { class: "row-actions" },
          el("button", { class: "link-btn", type: "button", onclick: () => openProductDialog(p) }, "Modifier"),
          el("button", { class: "link-btn danger", type: "button", onclick: () => deleteProduct(p) }, "Supprimer")
        )
      )
    );
  }

  async function deleteProduct(p) {
    if (!(await confirmDialog("Supprimer ce produit ?", `« ${p.name} » sera retiré définitivement de la carte.`))) return;
    try {
      await api("DELETE", `/api/admin/products/${p.id}`);
      state.products = state.products.filter((x) => x.id !== p.id);
      renderProducts();
      bumpCategoryCount(p.categoryId, -1);
      toast(`« ${p.name} » supprimé.`);
    } catch (err) {
      fail(err);
    }
  }

  function bumpCategoryCount(catId, delta) {
    const c = state.categories.find((x) => x.id === catId);
    if (c) c.productCount += delta;
    renderCategories();
  }

  ["#p-search", "#p-cat", "#p-low"].forEach((s) => $(s).addEventListener("input", renderProducts));

  // ---------- Fenêtre produit (ajout / modification) ----------
  const pDialog = $("#product-dialog");
  const pForm = $("#product-form");
  let editing = null;

  function openProductDialog(p = null) {
    if (!state.categories.length) {
      toast("Créez d'abord une catégorie.", "error");
      $("#tab-categories").click();
      return;
    }
    editing = p;
    pForm.reset();
    $(".form-error", pForm).hidden = true;
    $("#product-title").textContent = p ? `Modifier « ${p.name} »` : "Ajouter un produit";
    pForm.categoryId.replaceChildren(...state.categories.map((c) => el("option", { value: String(c.id) }, c.name)));
    const defaultCat = $("#p-cat").value || String(state.categories[0].id);
    pForm.categoryId.value = p ? String(p.categoryId) : defaultCat;
    pForm.name.value = p?.name ?? "";
    pForm.price.value = p ? euroInput(p.priceCents) : "";
    pForm.description.value = p?.description ?? "";
    pForm.tags.value = p?.tags.join(", ") ?? "";
    pForm.trackStock.checked = p ? p.stock !== null : true;
    pForm.stock.value = p?.stock ?? 0;
    pForm.stock.disabled = !pForm.trackStock.checked;
    pForm.visible.checked = p ? p.visible : true;
    pDialog.showModal();
    pForm.name.focus();
  }

  pForm.trackStock.addEventListener("change", () => {
    pForm.stock.disabled = !pForm.trackStock.checked;
  });

  pForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (e.submitter?.value === "cancel") return pDialog.close();
    const errBox = $(".form-error", pForm);
    const showErr = (m) => {
      errBox.textContent = m;
      errBox.hidden = false;
    };
    const priceCents = parsePrice(pForm.price.value);
    if (priceCents === null) return showErr("Prix invalide. Exemple : 12,50");
    const stockVal = Number(pForm.stock.value);
    if (pForm.trackStock.checked && (!Number.isInteger(stockVal) || stockVal < 0)) {
      return showErr("La quantité doit être un nombre entier positif.");
    }
    const body = {
      name: pForm.name.value,
      categoryId: Number(pForm.categoryId.value),
      priceCents,
      description: pForm.description.value,
      tags: pForm.tags.value,
      stock: pForm.trackStock.checked ? stockVal : null,
      visible: pForm.visible.checked,
    };
    try {
      if (editing) {
        const updated = await api("PATCH", `/api/admin/products/${editing.id}`, body);
        if (updated.categoryId !== editing.categoryId) {
          bumpCategoryCount(editing.categoryId, -1);
          bumpCategoryCount(updated.categoryId, 1);
        }
        state.products = state.products.map((x) => (x.id === updated.id ? updated : x));
        toast(`« ${updated.name} » mis à jour.`);
      } else {
        const created = await api("POST", "/api/admin/products", body);
        state.products.push(created);
        bumpCategoryCount(created.categoryId, 1);
        toast(`« ${created.name} » ajouté à la carte.`);
      }
      renderProducts();
      pDialog.close();
    } catch (err) {
      if (err.status !== 401) showErr(err.message);
    }
  });

  $("#add-product").addEventListener("click", () => openProductDialog());

  // ---------- Catégories ----------
  function renderCategories() {
    const list = $("#cat-rows");
    if (!state.categories.length) {
      list.replaceChildren(el("li", { class: "muted" }, "Aucune catégorie pour le moment."));
      return;
    }
    list.replaceChildren(
      ...state.categories.map((c, i) => {
        const nameCell = el("div", { class: "cat-name" }, c.name);
        const rename = () => {
          const input = el("input", { value: c.name, maxlength: "50", "aria-label": `Nouveau nom pour ${c.name}` });
          let done = false;
          const save = async () => {
            if (done) return;
            done = true;
            const name = input.value.trim();
            if (!name || name === c.name) return renderCategories();
            try {
              const updated = await api("PUT", `/api/admin/categories/${c.id}`, { name });
              c.name = updated.name;
              toast("Catégorie renommée.");
              renderCategoryFilter();
              renderProducts();
            } catch (err) {
              fail(err);
            }
            renderCategories();
          };
          input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") {
              done = true;
              renderCategories();
            }
          });
          input.addEventListener("blur", save);
          nameCell.replaceChildren(input);
          input.select();
        };
        return el(
          "li",
          {},
          el(
            "div",
            { class: "cat-order" },
            el("button", { class: "icon-btn", type: "button", "aria-label": `Monter ${c.name}`, disabled: i === 0, onclick: () => move(i, -1) }, "↑"),
            el("button", { class: "icon-btn", type: "button", "aria-label": `Descendre ${c.name}`, disabled: i === state.categories.length - 1, onclick: () => move(i, 1) }, "↓")
          ),
          nameCell,
          el("span", { class: "cat-count" }, `${c.productCount} produit${c.productCount > 1 ? "s" : ""}`),
          el("button", { class: "link-btn", type: "button", onclick: rename }, "Renommer"),
          el("button", { class: "link-btn danger", type: "button", onclick: () => deleteCategory(c) }, "Supprimer")
        );
      })
    );
  }

  async function move(index, dir) {
    const cats = [...state.categories];
    [cats[index], cats[index + dir]] = [cats[index + dir], cats[index]];
    try {
      await api("PUT", "/api/admin/categories/order", { ids: cats.map((c) => c.id) });
      state.categories = cats;
      renderCategories();
      renderCategoryFilter();
      renderProducts();
      $("#cat-rows").children[index + dir]?.querySelector(`[aria-label^="${dir < 0 ? "Monter" : "Descendre"}"]:not(:disabled)`)?.focus();
    } catch (err) {
      fail(err);
    }
  }

  $("#cat-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = e.target.name;
    try {
      const c = await api("POST", "/api/admin/categories", { name: input.value });
      state.categories.push({ ...c, productCount: 0 });
      input.value = "";
      renderCategories();
      renderCategoryFilter();
      toast(`Catégorie « ${c.name} » créée.`);
    } catch (err) {
      fail(err);
    }
  });

  async function deleteCategory(c) {
    let query = "";
    if (c.productCount === 0) {
      if (!(await confirmDialog("Supprimer cette catégorie ?", `La catégorie « ${c.name} » est vide et sera supprimée.`))) return;
    } else {
      const d = $("#delcat-dialog");
      const f = $("#delcat-form");
      const others = state.categories.filter((x) => x.id !== c.id);
      $("#delcat-name").textContent = c.name;
      $("#delcat-count").textContent = `${c.productCount} produit${c.productCount > 1 ? "s" : ""}`;
      f.moveTo.replaceChildren(...others.map((x) => el("option", { value: String(x.id) }, x.name)));
      f.mode.value = others.length ? "move" : "delete";
      f.querySelector('input[value="move"]').disabled = !others.length;
      f.moveTo.disabled = !others.length;
      d.returnValue = "";
      d.showModal();
      await new Promise((r) => d.addEventListener("close", r, { once: true }));
      if (d.returnValue !== "confirm") return;
      query = f.mode.value === "move" ? `?moveTo=${encodeURIComponent(f.moveTo.value)}` : "?deleteProducts=1";
    }
    try {
      await api("DELETE", `/api/admin/categories/${c.id}${query}`);
      toast(`Catégorie « ${c.name} » supprimée.`);
      await refresh();
    } catch (err) {
      fail(err);
    }
  }

  // ---------- Mot de passe ----------
  const pwDialog = $("#password-dialog");
  const pwForm = $("#password-form");
  $("#open-password").addEventListener("click", () => {
    pwForm.reset();
    $(".form-error", pwForm).hidden = true;
    pwDialog.showModal();
  });
  pwForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (e.submitter?.value === "cancel") return pwDialog.close();
    const errBox = $(".form-error", pwForm);
    if (pwForm.newPassword.value !== pwForm.confirm.value) {
      errBox.textContent = "Les deux nouveaux mots de passe ne correspondent pas.";
      errBox.hidden = false;
      return;
    }
    try {
      await api("POST", "/api/admin/password", {
        currentPassword: pwForm.currentPassword.value,
        newPassword: pwForm.newPassword.value,
      });
      pwDialog.close();
      toast("Mot de passe mis à jour.");
    } catch (err) {
      if (err.status !== 401) {
        errBox.textContent = err.message;
        errBox.hidden = false;
      }
    }
  });

  // ---------- Démarrage ----------
  api("GET", "/api/me")
    .then(showApp)
    .catch(() => showLogin());
})();
