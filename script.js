/* Sri Krishna Sweets & Bakery
   Pure HTML/CSS/JS + LocalStorage (no backend, no frameworks) */

(() => {
  "use strict";

  const KEYS = {
    products: "sksb_products",
    offers: "sksb_offers",
    session: "sksb_adminSession",
    settings: "sksb_settings"
  };

  const ADMIN_USER = "admin";
  const ADMIN_PASS = "admin123";
  const DEFAULT_WHATSAPP = "919999999999"; // Demo number (change in Admin → Settings)

  const CATEGORIES = ["Sweets", "Cakes", "Bakery"];

  // ---------- Utilities ----------
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function safeJsonParse(raw, fallback) {
    try { return JSON.parse(raw); } catch { return fallback; }
  }

  function getJSON(key, fallback) {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return safeJsonParse(raw, fallback);
  }

  function setJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    // Custom event for same-tab reactivity (storage event doesn't fire in same tab)
    window.dispatchEvent(new CustomEvent("sksb:dataChanged", { detail: { key } }));
  }

  function uid(prefix = "id") {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function formatINR(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "₹0";
    return `₹${Math.round(n).toLocaleString("en-IN")}`;
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function truncateText(s, n) {
    const str = String(s || "").trim();
    if (str.length <= n) return str;
    return str.slice(0, Math.max(0, n - 1)).trimEnd() + "…";
  }

  function seededNumber(seed) {
    // Simple deterministic pseudo-random [0..1)
    let h = 2166136261;
    const s = String(seed);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 10000) / 10000;
  }

  function escapeAttr(str) {
    // Avoid String.prototype.replaceAll (not supported in some older browsers/WebViews)
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // ---------- Seed Data ----------
  function seedIfEmpty() {
    const products = getJSON(KEYS.products, null);
    const offers = getJSON(KEYS.offers, null);
    const settings = getJSON(KEYS.settings, null);

    if (!settings) {
      setJSON(KEYS.settings, { whatsapp: "" });
    }

    if (!Array.isArray(products) || products.length === 0) {
      const demo = [
        { id: uid("p"), name: "Kaju Katli", price: 420, category: "Sweets", featured: true, createdAt: Date.now() - 86400000 * 3 },
        { id: uid("p"), name: "Motichoor Laddu", price: 320, category: "Sweets", featured: true, createdAt: Date.now() - 86400000 * 2 },
        { id: uid("p"), name: "Gulab Jamun", price: 260, category: "Sweets", featured: false, createdAt: Date.now() - 86400000 * 2 },
        { id: uid("p"), name: "Black Forest Cake", price: 699, category: "Cakes", featured: true, createdAt: Date.now() - 86400000 * 4 },
        { id: uid("p"), name: "Red Velvet Cake", price: 799, category: "Cakes", featured: false, createdAt: Date.now() - 86400000 * 5 },
        { id: uid("p"), name: "Butterscotch Pastry", price: 120, category: "Cakes", featured: false, createdAt: Date.now() - 86400000 * 1 },
        { id: uid("p"), name: "Butter Croissant", price: 95, category: "Bakery", featured: true, createdAt: Date.now() - 86400000 * 1 },
        { id: uid("p"), name: "Eggless Veg Puff", price: 55, category: "Bakery", featured: false, createdAt: Date.now() - 86400000 * 1 },
        { id: uid("p"), name: "Garlic Bread", price: 140, category: "Bakery", featured: false, createdAt: Date.now() - 86400000 * 1 }
      ];
      setJSON(KEYS.products, demo);
    }

    if (!Array.isArray(offers) || offers.length === 0) {
      const demoOffers = [
        { id: uid("o"), title: "Festive Sweet Box", description: "Get a premium mixed sweet box with elegant packaging.", tag: "FESTIVE" },
        { id: uid("o"), title: "Cake Combo Deal", description: "Order any 1/2 kg cake + 2 pastries and save more.", tag: "HOT" },
        { id: uid("o"), title: "Bakery Fresh Hour", description: "Fresh bakes every evening — ask on WhatsApp for today’s batch.", tag: "NEW" }
      ];
      setJSON(KEYS.offers, demoOffers);
    }
  }

  // ---------- Session ----------
  function setAdminSession() {
    setJSON(KEYS.session, { loggedIn: true, ts: Date.now() });
  }
  function clearAdminSession() {
    localStorage.removeItem(KEYS.session);
  }
  function isAdminLoggedIn() {
    const s = getJSON(KEYS.session, null);
    return !!(s && s.loggedIn);
  }

  // ---------- Settings ----------
  function getSettings() {
    return getJSON(KEYS.settings, { whatsapp: "" });
  }
  function setSettings(next) {
    setJSON(KEYS.settings, next);
  }
  function getWhatsAppNumber() {
    const { whatsapp } = getSettings();
    const trimmed = String(whatsapp || "").replace(/\s+/g, "");
    return trimmed || DEFAULT_WHATSAPP;
  }

  function waUrl(message) {
    const num = getWhatsAppNumber();
    const text = encodeURIComponent(message);
    return `https://wa.me/${num}?text=${text}`;
  }

  function setGlobalWhatsAppLinks() {
    const msg = "Hi Sri Krishna Sweets & Bakery! I want to place an order.";
    qsa("[data-whatsapp-business]").forEach((a) => {
      a.setAttribute("href", waUrl(msg));
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener");
    });
  }

  // ---------- Category “Random” Images (no network, no fetch) ----------
  function svgDataUri(svg) {
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function splitTitleLines(title) {
    const raw = String(title || "").trim().replace(/\s+/g, " ");
    if (!raw) return ["Product"];
    if (raw.length <= 18) return [raw];
    const parts = raw.split(" ");
    if (parts.length === 1) return [truncateText(raw, 18)];
    const line1 = [];
    const line2 = [];
    for (const w of parts) {
      const l1Len = (line1.join(" ") + (line1.length ? " " : "") + w).length;
      if (l1Len <= 18) line1.push(w);
      else line2.push(w);
    }
    const a = line1.join(" ") || truncateText(raw, 18);
    const b = line2.join(" ");
    return b ? [a, truncateText(b, 18)] : [a];
  }

  function productImageFromProduct(p) {
    const category = p.category;
    const name = p.name || "Product";
    const seed = `${p.id}_${name}_${category}`;
    const t = seededNumber(seed);
    const variant = Math.floor(t * 3); // 0..2

    const colorA = category === "Sweets" ? "#ff7a18"
      : category === "Cakes" ? "#f6c453"
      : "#ff9a3d";

    const colorB = category === "Sweets" ? "#ffd98a"
      : category === "Cakes" ? "#ff7a18"
      : "#f6c453";

    const titleLines = splitTitleLines(name);
    const label = category;
    const bg = `
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${colorA}" stop-opacity=".95"/>
          <stop offset="1" stop-color="${colorB}" stop-opacity=".95"/>
        </linearGradient>
        <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#1f1a17" flood-opacity=".25"/>
        </filter>
      </defs>
    `;

    const pattern = variant === 0
      ? `<circle cx="60" cy="60" r="32" fill="#ffffff" fill-opacity=".14"/>
         <circle cx="260" cy="140" r="58" fill="#ffffff" fill-opacity=".10"/>
         <circle cx="120" cy="180" r="48" fill="#ffffff" fill-opacity=".10"/>`
      : variant === 1
        ? `<path d="M0,160 C80,120 140,220 220,180 C300,140 340,220 420,170 L420,260 L0,260 Z" fill="#ffffff" fill-opacity=".10"/>
           <path d="M0,110 C90,80 160,140 240,110 C320,80 360,120 420,95" fill="none" stroke="#ffffff" stroke-opacity=".20" stroke-width="10" stroke-linecap="round"/>`
        : `<rect x="18" y="22" width="80" height="80" rx="26" fill="#ffffff" fill-opacity=".12"/>
           <rect x="300" y="26" width="96" height="96" rx="30" fill="#ffffff" fill-opacity=".10"/>
           <rect x="68" y="148" width="120" height="92" rx="30" fill="#ffffff" fill-opacity=".09"/>`;

    const lower = String(name).toLowerCase();
    const icon = category === "Sweets"
      ? `<g filter="url(#s)">
           <circle cx="210" cy="150" r="58" fill="#fff3df"/>
           <circle cx="210" cy="150" r="42" fill="#ffd98a"/>
           <circle cx="188" cy="130" r="7" fill="#ff7a18"/>
           <circle cx="230" cy="170" r="7" fill="#ff7a18"/>
           <circle cx="238" cy="136" r="6" fill="#ff7a18"/>
         </g>`
      : category === "Cakes"
        ? `<g filter="url(#s)">
             <path d="M150 190 L250 190 L232 110 L168 110 Z" fill="#fff3df"/>
             <path d="M168 110 L232 110 L244 86 L156 86 Z" fill="#ffffff"/>
             <path d="M156 86 C178 70 222 70 244 86" fill="none" stroke="#ff7a18" stroke-width="10" stroke-linecap="round"/>
             <circle cx="200" cy="72" r="10" fill="#f6c453"/>
           </g>`
        : `<g filter="url(#s)">
             <path d="M150 180 C150 130 250 130 250 180 Z" fill="#fff3df"/>
             <path d="M150 180 C170 212 230 212 250 180 Z" fill="#ffd98a"/>
             <path d="M165 155 C178 140 222 140 235 155" fill="none" stroke="#ff7a18" stroke-width="10" stroke-linecap="round" opacity=".75"/>
           </g>`;

    const badge = lower.includes("laddu") ? "LADDU"
      : lower.includes("katli") ? "KATLI"
      : lower.includes("jamun") ? "JAMUN"
      : lower.includes("croissant") ? "CROISSANT"
      : lower.includes("puff") ? "PUFF"
      : lower.includes("bread") ? "BREAD"
      : lower.includes("pastry") ? "PASTRY"
      : lower.includes("cake") ? "CAKE"
      : label.toUpperCase();

    const titleText = titleLines.length === 1
      ? `<text x="26" y="228" font-family="ui-sans-serif,system-ui" font-size="24" font-weight="900" fill="#ffffff" opacity=".95">${escapeAttr(titleLines[0])}</text>`
      : `<text x="26" y="218" font-family="ui-sans-serif,system-ui" font-size="22" font-weight="900" fill="#ffffff" opacity=".95">${escapeAttr(titleLines[0])}</text>
         <text x="26" y="245" font-family="ui-sans-serif,system-ui" font-size="22" font-weight="900" fill="#ffffff" opacity=".95">${escapeAttr(titleLines[1])}</text>`;

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 420 260">
        ${bg}
        <rect width="420" height="260" rx="32" fill="url(#g)"/>
        ${pattern}
        <text x="26" y="54" font-family="ui-sans-serif,system-ui" font-size="18" font-weight="900" fill="#ffffff" opacity=".92">${escapeAttr(label)}</text>
        <text x="390" y="54" text-anchor="end" font-family="ui-sans-serif,system-ui" font-size="14" font-weight="900" fill="#ffffff" opacity=".92">${escapeAttr(badge)}</text>
        ${icon}
        ${titleText}
      </svg>
    `;
    return svgDataUri(svg);
  }

  // ---------- Rendering: Product Cards ----------
  function productCardHTML(p) {
    const img = p.image ? String(p.image) : productImageFromProduct(p);
    const featured = p.featured ? `
      <div class="featured-flag tiny"><span class="star">★</span> Featured</div>
    ` : `<div class="tiny">Freshly prepared</div>`;

    const message = `Hi Sri Krishna Sweets & Bakery! I want to order:\n\n• ${p.name}\n• ${formatINR(p.price)}\n• Category: ${p.category}\n\nPlease confirm availability and delivery/pickup details.`;

    return `
      <article class="card-prod reveal">
        <div class="card-prod__img">
          <img src="${escapeAttr(img)}" alt="${escapeAttr(p.category)} product image" loading="lazy" />
        </div>
        <div class="card-prod__body">
          <span class="badge">${escapeAttr(p.category)}</span>
          <h3 class="card-prod__name">${escapeAttr(p.name)}</h3>
          <div class="price">${escapeAttr(formatINR(p.price))}</div>
          ${featured}
          <div class="card-prod__actions">
            <a class="btn btn--sm btn-wa" href="${escapeAttr(waUrl(message))}" target="_blank" rel="noopener">WhatsApp Order</a>
          </div>
        </div>
      </article>
    `;
  }

  // ---------- Home Page ----------
  function setupNavToggle() {
    const toggle = qs("[data-nav-toggle]");
    const links = qs("[data-nav-links]");
    const nav = qs(".nav");
    if (!toggle || !links || !nav) return;

    function close() {
      nav.classList.remove("is-open");
      document.body.classList.remove("nav-open");
      toggle.setAttribute("aria-expanded", "false");
    }
    function open() {
      nav.classList.add("is-open");
      document.body.classList.add("nav-open");
      toggle.setAttribute("aria-expanded", "true");
    }

    toggle.addEventListener("click", () => {
      nav.classList.contains("is-open") ? close() : open();
    });

    links.addEventListener("click", (e) => {
      if (e.target && e.target.matches("a")) close();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });
  }

  function setupRevealAnimations() {
    const items = qsa(".reveal");
    if (!items.length) return;

    if (!("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("in-view"));
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((ent) => {
        if (ent.isIntersecting) {
          ent.target.classList.add("in-view");
          io.unobserve(ent.target);
        }
      });
    }, { threshold: 0.12 });

    items.forEach((el) => io.observe(el));
  }

  function renderOffers() {
    const list = qs("[data-offers-list]");
    const miniTitle = qs("[data-mini-offer-title]");
    const miniDesc = qs("[data-mini-offer-desc]");
    if (!list) return;

    const offers = getJSON(KEYS.offers, []);
    if (!Array.isArray(offers) || offers.length === 0) {
      list.innerHTML = `<div class="offer"><div class="offer__title">No offers yet</div><p class="offer__desc">Admin can add offers from the admin panel.</p></div>`;
      if (miniTitle) miniTitle.textContent = "No offers yet";
      if (miniDesc) miniDesc.textContent = "Add offers from admin panel.";
      return;
    }

    list.innerHTML = offers.slice(0, 6).map((o) => `
      <div class="offer reveal">
        <div class="offer__tag">${escapeAttr(o.tag || "OFFER")}</div>
        <div class="offer__title">${escapeAttr(o.title)}</div>
        <p class="offer__desc">${escapeAttr(o.description || "")}</p>
      </div>
    `).join("");

    // Mini hero offer
    const first = offers[0];
    if (miniTitle) miniTitle.textContent = first.title;
    if (miniDesc) miniDesc.textContent = first.description || "";
  }

  function renderProducts(filter = { q: "", category: "All" }) {
    const grid = qs("[data-products-grid]");
    const count = qs("[data-result-count]");
    if (!grid) return;

    const all = getJSON(KEYS.products, []);
    const q = String(filter.q || "").trim().toLowerCase();
    const cat = filter.category || "All";

    const results = all
      .slice()
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .filter((p) => {
        const matchCat = (cat === "All") || (p.category === cat);
        const matchQ = !q || String(p.name || "").toLowerCase().includes(q);
        return matchCat && matchQ;
      });

    if (count) count.textContent = `${results.length} item${results.length === 1 ? "" : "s"} found`;

    if (results.length === 0) {
      grid.innerHTML = `
        <div class="offer" style="grid-column:1/-1">
          <div class="offer__title">No results</div>
          <p class="offer__desc">Try a different search term or category.</p>
        </div>
      `;
      setupRevealAnimations();
      return;
    }

    grid.innerHTML = results.map(productCardHTML).join("");
    setupRevealAnimations();
  }

  function setupSearchAndFilter() {
    const search = qs("[data-search]");
    const select = qs("[data-category]");
    const chips = qsa("[data-chip]");
    if (!search || !select) return;

    const state = { q: "", category: "All" };

    function syncUI() {
      select.value = state.category;
      chips.forEach((c) => c.classList.toggle("is-active", c.dataset.chip === state.category));
    }
    function update() {
      syncUI();
      renderProducts(state);
    }

    search.addEventListener("input", () => {
      state.q = search.value;
      update();
    });
    select.addEventListener("change", () => {
      state.category = select.value;
      update();
    });
    chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        state.category = chip.dataset.chip || "All";
        update();
      });
    });

    update();
  }

  function renderFeaturedSlider() {
    const track = qs("[data-featured-track]");
    const dots = qs("[data-featured-dots]");
    const prev = qs("[data-featured-prev]");
    const next = qs("[data-featured-next]");
    const slider = qs("[data-featured-slider]");
    if (!track || !dots || !prev || !next || !slider) return;

    const all = getJSON(KEYS.products, []);
    const featured = all.filter((p) => !!p.featured);
    const list = (featured.length ? featured : all).slice(0, 8);

    if (list.length === 0) {
      track.innerHTML = `<div class="offer" style="min-width:100%"><div class="offer__title">No products yet</div><p class="offer__desc">Add products from the admin panel.</p></div>`;
      dots.innerHTML = "";
      prev.disabled = true;
      next.disabled = true;
      return;
    }

    track.innerHTML = list.map((p) => `<div class="slider-item">${productCardHTML(p)}</div>`).join("");
    dots.innerHTML = list.map((_, i) => `<button class="dot ${i === 0 ? "is-active" : ""}" type="button" aria-label="Go to slide ${i + 1}" data-dot="${i}"></button>`).join("");

    let index = 0;
    let timer = null;

    function cardWidth() {
      const first = track.firstElementChild;
      if (!first) return 0;
      const rect = first.getBoundingClientRect();
      const style = getComputedStyle(track);
      const gap = parseFloat(style.columnGap || style.gap || "0") || 0;
      return rect.width + gap;
    }

    function go(i) {
      index = clamp(i, 0, list.length - 1);
      track.style.transform = `translateX(${-index * cardWidth()}px)`;
      qsa(".dot", dots).forEach((d, idx) => d.classList.toggle("is-active", idx === index));
    }

    function startAuto() {
      stopAuto();
      timer = window.setInterval(() => {
        go((index + 1) % list.length);
      }, 4200);
    }
    function stopAuto() {
      if (timer) window.clearInterval(timer);
      timer = null;
    }

    prev.addEventListener("click", () => { go(index - 1); startAuto(); });
    next.addEventListener("click", () => { go(index + 1); startAuto(); });
    dots.addEventListener("click", (e) => {
      const b = e.target.closest("[data-dot]");
      if (!b) return;
      go(Number(b.dataset.dot));
      startAuto();
    });
    window.addEventListener("resize", () => go(index));

    slider.addEventListener("mouseenter", stopAuto);
    slider.addEventListener("mouseleave", startAuto);

    // Make sure reveal animation works inside slider
    setupRevealAnimations();
    go(0);
    startAuto();
  }

  function setupHomeLiveUpdates() {
    function refreshAll() {
      renderOffers();
      renderFeaturedSlider();
      // Keep current filter state from UI
      const search = qs("[data-search]");
      const select = qs("[data-category]");
      renderProducts({ q: search ? search.value : "", category: select ? select.value : "All" });
      setGlobalWhatsAppLinks();
    }

    window.addEventListener("storage", (e) => {
      if (!e.key) return;
      if ([KEYS.products, KEYS.offers, KEYS.settings].includes(e.key)) refreshAll();
    });
    window.addEventListener("sksb:dataChanged", (e) => {
      const key = e.detail && e.detail.key;
      if ([KEYS.products, KEYS.offers, KEYS.settings].includes(key)) refreshAll();
    });
  }

  function initHome() {
    seedIfEmpty();
    setupNavToggle();
    setGlobalWhatsAppLinks();

    const year = qs("[data-year]");
    if (year) year.textContent = String(new Date().getFullYear());

    renderOffers();
    renderFeaturedSlider();
    setupSearchAndFilter();
    setupHomeLiveUpdates();

    // Smooth-scroll improvement (close menu, avoid jump on hashes in some browsers)
    document.addEventListener("click", (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute("href");
      const el = id && qs(id);
      if (!el) return;
      e.preventDefault();
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    setupRevealAnimations();
  }

  // ---------- Login Page ----------
  function initLogin() {
    seedIfEmpty();
    setGlobalWhatsAppLinks();

    if (isAdminLoggedIn()) {
      window.location.replace("admin.html");
      return;
    }

    const form = qs("[data-login-form]");
    const msg = qs("[data-login-msg]");
    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const u = String(fd.get("username") || "").trim();
      const p = String(fd.get("password") || "").trim();

      if (u === ADMIN_USER && p === ADMIN_PASS) {
        setAdminSession();
        if (msg) {
          msg.textContent = "Login successful. Redirecting…";
          msg.style.color = "rgba(31,26,23,.85)";
        }
        window.setTimeout(() => window.location.replace("admin.html"), 450);
      } else {
        if (msg) {
          msg.textContent = "Invalid credentials. Please try admin / admin123.";
          msg.style.color = "#b71c1c";
        }
      }
    });

    setupRevealAnimations();
  }

  // ---------- Admin Page ----------
  function adminGuard() {
    if (!isAdminLoggedIn()) {
      window.location.replace("login.html");
      return false;
    }
    return true;
  }

  function getProducts() {
    const list = getJSON(KEYS.products, []);
    return Array.isArray(list) ? list : [];
  }
  function setProducts(list) {
    setJSON(KEYS.products, list);
  }
  function getOffers() {
    const list = getJSON(KEYS.offers, []);
    return Array.isArray(list) ? list : [];
  }
  function setOffers(list) {
    setJSON(KEYS.offers, list);
  }

  function renderAdminCounts() {
    const pc = qs("[data-admin-product-count]");
    const oc = qs("[data-admin-offer-count]");
    const products = getProducts();
    const offers = getOffers();
    if (pc) pc.textContent = String(products.length);
    if (oc) oc.textContent = String(offers.length);
  }

  function renderAdminProducts() {
    const tbody = qs("[data-admin-products]");
    if (!tbody) return;
    const products = getProducts().slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    if (products.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="muted">No products yet. Add one on the left.</td></tr>`;
      return;
    }

    tbody.innerHTML = products.map((p) => `
      <tr>
        <td>${escapeAttr(p.name)} ${p.image ? `<span class="pill-mini">IMG</span>` : ""}</td>
        <td><span class="pill-mini">${escapeAttr(p.category)}</span></td>
        <td class="right">${escapeAttr(formatINR(p.price))}</td>
        <td class="center">
          <button class="toggle ${p.featured ? "is-on" : ""}" type="button" data-toggle-featured="${escapeAttr(p.id)}">
            ${p.featured ? "ON" : "OFF"}
          </button>
        </td>
        <td class="right">
          <button class="btn btn--ghost btn--sm" type="button" data-delete-product="${escapeAttr(p.id)}">Delete</button>
        </td>
      </tr>
    `).join("");
  }

  function renderAdminOffers() {
    const wrap = qs("[data-admin-offers]");
    if (!wrap) return;
    const offers = getOffers().slice().reverse();

    if (offers.length === 0) {
      wrap.innerHTML = `<div class="list-item"><div><div class="list-item__title">No offers yet</div><div class="list-item__desc">Add an offer from the form.</div></div></div>`;
      return;
    }

    wrap.innerHTML = offers.map((o) => `
      <div class="list-item">
        <div>
          <div class="list-item__title">${escapeAttr(o.title)} <span class="pill-mini">${escapeAttr(o.tag || "OFFER")}</span></div>
          <div class="list-item__desc">${escapeAttr(o.description || "")}</div>
        </div>
        <div>
          <button class="btn btn--ghost btn--sm" type="button" data-delete-offer="${escapeAttr(o.id)}">Delete</button>
        </div>
      </div>
    `).join("");
  }

  function setupAdminTabs() {
    const tabs = qsa("[data-admin-tab]");
    if (!tabs.length) return;
    tabs.forEach((t) => {
      t.addEventListener("click", () => {
        const key = t.dataset.adminTab;
        tabs.forEach((x) => x.classList.toggle("is-active", x === t));
        qsa("[data-admin-panel]").forEach((p) => p.classList.toggle("is-active", p.dataset.adminPanel === key));
      });
    });
  }

  function initAdmin() {
    seedIfEmpty();
    if (!adminGuard()) return;

    setupAdminTabs();

    const logout = qs("[data-admin-logout]");
    if (logout) {
      logout.addEventListener("click", () => {
        clearAdminSession();
        window.location.replace("login.html");
      });
    }

    // Add Product
    const addProd = qs("[data-add-product]");
    const addProdMsg = qs("[data-add-product-msg]");
    if (addProd) {
      addProd.addEventListener("submit", (e) => {
        e.preventDefault();
        const fd = new FormData(addProd);
        const name = String(fd.get("name") || "").trim();
        const price = Number(fd.get("price") || 0);
        const category = String(fd.get("category") || "").trim();
        const featured = fd.get("featured") === "on";

        if (!name || !Number.isFinite(price) || price <= 0 || !CATEGORIES.includes(category)) {
          if (addProdMsg) { addProdMsg.textContent = "Please enter valid product details."; addProdMsg.style.color = "#b71c1c"; }
          return;
        }

        const fileInput = qs('input[name="image"]', addProd);
        const file = fileInput && fileInput.files ? fileInput.files[0] : null;

        const commit = (imageDataUrl) => {
          const products = getProducts();
          products.unshift({
            id: uid("p"),
            name,
            price: Math.round(price),
            category,
            featured,
            image: imageDataUrl || "",
            createdAt: Date.now()
          });
          setProducts(products);

          addProd.reset();
          if (addProdMsg) { addProdMsg.textContent = "Product added successfully."; addProdMsg.style.color = "rgba(31,26,23,.85)"; }
          renderAdminCounts();
          renderAdminProducts();
        };

        if (!file) {
          commit("");
          return;
        }

        if (!String(file.type || "").startsWith("image/")) {
          if (addProdMsg) { addProdMsg.textContent = "Please upload a valid image file."; addProdMsg.style.color = "#b71c1c"; }
          return;
        }

        const reader = new FileReader();
        reader.onload = () => commit(String(reader.result || ""));
        reader.onerror = () => {
          if (addProdMsg) { addProdMsg.textContent = "Could not read the image. Try a different file."; addProdMsg.style.color = "#b71c1c"; }
        };
        reader.readAsDataURL(file);
      });
    }

    // Add Offer
    const addOffer = qs("[data-add-offer]");
    const addOfferMsg = qs("[data-add-offer-msg]");
    if (addOffer) {
      addOffer.addEventListener("submit", (e) => {
        e.preventDefault();
        const fd = new FormData(addOffer);
        const title = String(fd.get("title") || "").trim();
        const description = String(fd.get("description") || "").trim();
        const tag = String(fd.get("tag") || "").trim().slice(0, 12);

        if (!title || !description) {
          if (addOfferMsg) { addOfferMsg.textContent = "Please enter offer title and description."; addOfferMsg.style.color = "#b71c1c"; }
          return;
        }

        const offers = getOffers();
        offers.push({ id: uid("o"), title, description, tag: tag || "OFFER" });
        setOffers(offers);

        addOffer.reset();
        if (addOfferMsg) { addOfferMsg.textContent = "Offer added successfully."; addOfferMsg.style.color = "rgba(31,26,23,.85)"; }
        renderAdminCounts();
        renderAdminOffers();
      });
    }

    // Settings: WhatsApp number
    const settingsForm = qs("[data-settings-form]");
    const settingsMsg = qs("[data-settings-msg]");
    if (settingsForm) {
      const whatsappInput = qs('input[name="whatsapp"]', settingsForm);
      const s = getSettings();
      if (whatsappInput) whatsappInput.value = s.whatsapp || "";

      settingsForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const fd = new FormData(settingsForm);
        const whatsapp = String(fd.get("whatsapp") || "").replace(/\s+/g, "");

        if (whatsapp && !/^\d{8,15}$/.test(whatsapp)) {
          if (settingsMsg) { settingsMsg.textContent = "Please enter a valid number (digits only, 8–15 digits)."; settingsMsg.style.color = "#b71c1c"; }
          return;
        }

        setSettings({ whatsapp });
        if (settingsMsg) { settingsMsg.textContent = "Settings saved."; settingsMsg.style.color = "rgba(31,26,23,.85)"; }
      });
    }

    // Reset demo
    const reset = qs("[data-reset-demo]");
    if (reset) {
      reset.addEventListener("click", () => {
        const ok = confirm("Reset products & offers to demo data?");
        if (!ok) return;
        localStorage.removeItem(KEYS.products);
        localStorage.removeItem(KEYS.offers);
        seedIfEmpty();
        renderAdminCounts();
        renderAdminProducts();
        renderAdminOffers();
        alert("Demo data restored.");
      });
    }

    // Delegated actions (delete/toggle)
    document.addEventListener("click", (e) => {
      const delP = e.target.closest("[data-delete-product]");
      if (delP) {
        const id = delP.getAttribute("data-delete-product");
        const ok = confirm("Delete this product?");
        if (!ok) return;
        const next = getProducts().filter((p) => p.id !== id);
        setProducts(next);
        renderAdminCounts();
        renderAdminProducts();
        return;
      }

      const toggle = e.target.closest("[data-toggle-featured]");
      if (toggle) {
        const id = toggle.getAttribute("data-toggle-featured");
        const products = getProducts();
        const item = products.find((p) => p.id === id);
        if (item) item.featured = !item.featured;
        setProducts(products);
        renderAdminProducts();
        return;
      }

      const delO = e.target.closest("[data-delete-offer]");
      if (delO) {
        const id = delO.getAttribute("data-delete-offer");
        const ok = confirm("Delete this offer?");
        if (!ok) return;
        const next = getOffers().filter((o) => o.id !== id);
        setOffers(next);
        renderAdminCounts();
        renderAdminOffers();
      }
    });

    // Initial render
    renderAdminCounts();
    renderAdminProducts();
    renderAdminOffers();
    setupRevealAnimations();
  }

  // ---------- Boot ----------
  document.addEventListener("DOMContentLoaded", () => {
    const page = document.body && document.body.dataset && document.body.dataset.page;
    if (!page) return;

    if (page === "home") initHome();
    if (page === "login") initLogin();
    if (page === "admin") initAdmin();
  });
})();
