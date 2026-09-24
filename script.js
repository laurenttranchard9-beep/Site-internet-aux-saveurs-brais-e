(() => {
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".nav-toggle");
  const links = document.getElementById("nav-links");
  const form = document.getElementById("book-form");
  const success = document.getElementById("book-success");
  const errorMsg = form.querySelector(".form-error");
  const serviceSelect = document.getElementById("service");
  const dateInput = document.getElementById("date");
  const stickyCta = document.querySelector(".sticky-cta");

  document.getElementById("year").textContent = new Date().getFullYear();

  // Header shadow on scroll
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 8);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Mobile menu
  const closeMenu = () => {
    toggle.setAttribute("aria-expanded", "false");
    links.classList.remove("open");
  };
  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!open));
    links.classList.toggle("open", !open);
  });
  links.addEventListener("click", (e) => {
    if (e.target.closest("a")) closeMenu();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  // Service cards preselect the matching option in the form
  document.querySelectorAll("[data-service]").forEach((link) => {
    link.addEventListener("click", () => {
      serviceSelect.value = link.dataset.service;
      serviceSelect.classList.remove("invalid");
    });
  });

  // Earliest bookable date: tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const pad = (n) => String(n).padStart(2, "0");
  dateInput.min = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;

  // Booking form
  const fields = form.querySelectorAll("input[required], select[required]");
  fields.forEach((f) =>
    f.addEventListener("input", () => {
      if (f.checkValidity()) f.classList.remove("invalid");
    })
  );

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let firstInvalid = null;
    fields.forEach((f) => {
      const ok = f.checkValidity() && f.value.trim() !== "";
      f.classList.toggle("invalid", !ok);
      f.setAttribute("aria-invalid", String(!ok));
      if (!ok && !firstInvalid) firstInvalid = f;
    });

    if (firstInvalid) {
      errorMsg.hidden = false;
      firstInvalid.focus();
      return;
    }
    errorMsg.hidden = true;

    const data = new FormData(form);
    const date = new Date(`${data.get("date")}T12:00:00`).toLocaleDateString("fr-FR", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    document.getElementById("success-msg").textContent =
      `${data.get("service")} pour ${data.get("pet")} le ${date}, ${data.get("time")} : c'est noté ! ` +
      `On envoie un SMS à ${data.get("name").split(" ")[0]} au ${data.get("phone")} pour confirmer.`;

    // TODO : envoyer `data` vers votre système de réservation / service d'e-mail ici.
    form.hidden = true;
    success.hidden = false;
    success.focus();
  });

  document.getElementById("book-again").addEventListener("click", () => {
    form.reset();
    fields.forEach((f) => f.removeAttribute("aria-invalid"));
    success.hidden = true;
    form.hidden = false;
    form.querySelector("input").focus();
  });

  // Hide sticky mobile CTA while the booking section is on screen
  const bookSection = document.getElementById("book");
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      ([entry]) => stickyCta.classList.toggle("hide", entry.isIntersecting),
      { threshold: 0.15 }
    ).observe(bookSection);

    // Reveal-on-scroll
    const revealEls = document.querySelectorAll(".section-head, .card, .steps li, .quote, .faq details");
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        }),
      { threshold: 0.15 }
    );
    revealEls.forEach((el) => {
      el.classList.add("reveal");
      io.observe(el);
    });
  }
})();
