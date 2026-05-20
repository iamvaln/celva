/* CELVA — shared site JS (theme + tweaks + reveal) */

(function () {
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "theme": "light",
    "patternOpacity": 5,
    "gridCols": 4,
    "accent": "#B26248"
  }/*EDITMODE-END*/;

  const STORAGE_KEY = "celva.tweaks";
  let tweakState = { ...TWEAK_DEFAULTS };
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    tweakState = { ...tweakState, ...stored };
  } catch (e) {}

  function applyTweaks(s) {
    const root = document.documentElement;
    root.setAttribute("data-theme", s.theme);
    root.style.setProperty("--pattern-opacity", (s.patternOpacity / 100).toString());
    root.style.setProperty("--grid-cols", String(s.gridCols));
    root.style.setProperty("--accent", s.accent);
    // recompute hover/dark variants from accent
    root.style.setProperty("--terracotta", s.accent);
  }

  function saveTweaks(s) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    try {
      window.parent.postMessage({ type: "__edit_mode_set_keys", edits: s }, "*");
    } catch (e) {}
  }

  function setTweak(key, value) {
    tweakState = { ...tweakState, [key]: value };
    applyTweaks(tweakState);
    saveTweaks(tweakState);
    renderTweakUI();
  }

  // ---------- UI ----------
  function renderTweakUI() {
    const panel = document.getElementById("tweaks-panel");
    if (!panel) return;
    panel.innerHTML = `
      <div class="tweaks__head">
        <h5>Tweaks</h5>
        <button class="tweaks__close" aria-label="Fermer" data-close>✕</button>
      </div>
      <div class="tweaks__body">
        <div class="tweak">
          <div class="tweak__label"><span>Apparence</span></div>
          <div class="tweak__row">
            <button class="tweak__pill ${tweakState.theme === 'light' ? 'is-active' : ''}" data-tweak="theme" data-value="light">Clair</button>
            <button class="tweak__pill ${tweakState.theme === 'dark' ? 'is-active' : ''}" data-tweak="theme" data-value="dark">Sombre</button>
          </div>
        </div>

        <div class="tweak">
          <div class="tweak__label"><span>Couleur d'accent</span></div>
          <div class="tweak__row">
            ${[
              ["#B26248", "Terracotta"],
              ["#8E4E3A", "Brique"],
              ["#595D40", "Olive"],
              ["#A38660", "Ocre"]
            ].map(([hex, name]) => `
              <button class="tweak__pill ${tweakState.accent === hex ? 'is-active' : ''}"
                      data-tweak="accent" data-value="${hex}" title="${name}"
                      style="--swatch:${hex}; ${tweakState.accent === hex ? '' : 'color:'+hex+';border-color:'+hex+';'}">
                <span style="display:inline-block;width:10px;height:10px;background:${hex};margin-right:6px;vertical-align:middle;border-radius:999px;"></span>${name}
              </button>
            `).join("")}
          </div>
        </div>

        <div class="tweak">
          <div class="tweak__label">
            <span>Motif monogramme</span>
            <span class="tweak__value">${tweakState.patternOpacity}%</span>
          </div>
          <input type="range" min="0" max="14" step="1" value="${tweakState.patternOpacity}" data-tweak-range="patternOpacity" />
        </div>

        <div class="tweak">
          <div class="tweak__label"><span>Grille catalogue</span></div>
          <div class="tweak__row">
            ${[2, 3, 4].map(n => `
              <button class="tweak__pill ${tweakState.gridCols === n ? 'is-active' : ''}"
                      data-tweak="gridCols" data-value="${n}">${n} col.</button>
            `).join("")}
          </div>
        </div>
      </div>
    `;

    panel.querySelectorAll("[data-tweak]").forEach(el => {
      el.addEventListener("click", () => {
        const key = el.getAttribute("data-tweak");
        const raw = el.getAttribute("data-value");
        const val = key === "gridCols" ? Number(raw) : raw;
        setTweak(key, val);
      });
    });
    panel.querySelectorAll("[data-tweak-range]").forEach(el => {
      el.addEventListener("input", () => {
        setTweak(el.getAttribute("data-tweak-range"), Number(el.value));
      });
    });
    panel.querySelector("[data-close]")?.addEventListener("click", () => {
      panel.classList.remove("is-open");
      try { window.parent.postMessage({ type: "__edit_mode_dismissed" }, "*"); } catch (e) {}
    });
  }

  // ---------- Edit-mode protocol ----------
  function ensurePanel() {
    if (document.getElementById("tweaks-panel")) return;
    const div = document.createElement("div");
    div.id = "tweaks-panel";
    div.className = "tweaks";
    document.body.appendChild(div);
    renderTweakUI();
  }

  window.addEventListener("message", (e) => {
    const data = e.data || {};
    if (data.type === "__activate_edit_mode") {
      ensurePanel();
      document.getElementById("tweaks-panel").classList.add("is-open");
    } else if (data.type === "__deactivate_edit_mode") {
      document.getElementById("tweaks-panel")?.classList.remove("is-open");
    }
  });

  // ---------- Reveal on scroll ----------
  function setupReveal() {
    const els = document.querySelectorAll(".fade-up");
    if (!("IntersectionObserver" in window)) {
      els.forEach(el => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
    els.forEach(el => io.observe(el));
  }

  // ---------- Interactions (drawer, search, menu, toast, cookies) ----------
  const monogramSVG = `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="7.5" stroke-linecap="butt" stroke-linejoin="miter"><path d="M 66 27.3 A 32 32 0 1 1 34 27.3" /><path d="M 24 8 L 50 78 L 74 6" /><path d="M 84 6 L 91 1" stroke-width="6.5" /></svg>`;
  const checkSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 12l5 5 9-11" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const xSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 6l12 12M18 6l-12 12" stroke-linecap="round"/></svg>`;
  const burgerSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 7h16M4 12h16M4 17h16" stroke-linecap="round"/></svg>`;

  function html(strings, ...values) {
    const tpl = document.createElement('template');
    tpl.innerHTML = String.raw({ raw: strings }, ...values).trim();
    return tpl.content.firstElementChild;
  }

  function buildOverlay() {
    if (document.getElementById('celva-overlay')) return;
    const el = html`<div id="celva-overlay" class="overlay" aria-hidden="true"></div>`;
    document.body.appendChild(el);
    el.addEventListener('click', closeAll);
  }

  function buildDrawer() {
    if (document.getElementById('celva-drawer')) return;
    const el = html`
      <aside id="celva-drawer" class="drawer" aria-label="Mini-panier" aria-hidden="true">
        <header class="drawer__head">
          <h3>Panier <span class="count">2 pièces</span></h3>
          <button class="drawer__close" data-close-drawer aria-label="Fermer">${xSVG}</button>
        </header>
        <div class="drawer__body">
          <article class="drawer__line">
            <div class="ph" data-ratio="3/4"><div class="ph__mono">${monogramSVG}</div></div>
            <div>
              <strong>Trench Ekiti</strong>
              <em>Terre cuite · Taille 38</em>
              <div class="drawer__line-meta">
                <button>−</button><span>Qté 1</span><button>+</button>
                <button style="margin-left:auto">Retirer</button>
              </div>
            </div>
            <span class="drawer__line-price">68 500</span>
          </article>
          <article class="drawer__line">
            <div class="ph" data-ratio="3/4"><div class="ph__mono">${monogramSVG}</div></div>
            <div>
              <strong>Chemise Wouri</strong>
              <em>Sable · Taille M</em>
              <div class="drawer__line-meta">
                <button>−</button><span>Qté 1</span><button>+</button>
                <button style="margin-left:auto">Retirer</button>
              </div>
            </div>
            <span class="drawer__line-price">34 000</span>
          </article>
        </div>
        <footer class="drawer__foot">
          <div class="drawer__row">
            <span class="lbl">Sous-total</span>
            <span class="big">102 500 FCFA</span>
          </div>
          <p class="drawer__free"><em>Vous bénéficiez de la livraison offerte.</em></p>
          <div class="drawer__cta">
            <a href="cart.html" class="btn btn--primary">Passer commande</a>
            <a href="cart.html" class="btn btn--ghost" style="align-self:center">Voir le panier complet</a>
          </div>
        </footer>
      </aside>`;
    document.body.appendChild(el);
    el.querySelector('[data-close-drawer]').addEventListener('click', closeAll);
  }

  function buildSearch() {
    if (document.getElementById('celva-search')) return;
    const el = html`
      <div id="celva-search" class="search-overlay" aria-hidden="true">
        <div class="container">
          <div class="search-overlay__row">
            <input type="search" class="search-overlay__input" placeholder="Que cherchez-vous&nbsp;?" />
            <button class="search-overlay__close" data-close-search>Fermer ${xSVG.replace('width="1.5"', 'width="1.5" style="width:14px;height:14px"')}</button>
          </div>
          <div class="search-overlay__cols">
            <div class="search-overlay__col">
              <h5>Récherches récentes</h5>
              <ul>
                <li><a href="shop.html">Trench coton</a></li>
                <li><a href="shop.html">Chemise lin</a></li>
                <li><a href="shop.html">Robe écru</a></li>
              </ul>
            </div>
            <div class="search-overlay__col">
              <h5>Populaire</h5>
              <ul>
                <li><a href="shop.html">Pluvieuse, douce <em>· collection</em></a></li>
                <li><a href="product.html">Trench Ekiti <em>· veste</em></a></li>
                <li><a href="shop.html">Pièces de marché <em>· capsule</em></a></li>
                <li><a href="collection.html">Archive <em>· pièces uniques</em></a></li>
              </ul>
            </div>
            <div class="search-overlay__col">
              <h5>Explorer</h5>
              <ul>
                <li><a href="shop.html">Toutes les vestes</a></li>
                <li><a href="shop.html">Robes</a></li>
                <li><a href="shop.html">Chemises &amp; blouses</a></li>
                <li><a href="shop.html">Pantalons</a></li>
                <li><a href="shop.html">Accessoires</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(el);
    el.querySelector('[data-close-search]').addEventListener('click', closeAll);
  }

  function buildMobileMenu() {
    if (document.getElementById('celva-menu')) return;
    const el = html`
      <nav id="celva-menu" class="mobile-menu" aria-hidden="true">
        <header class="mobile-menu__head">
          <span class="mobile-menu__brand">CELVA</span>
          <button class="drawer__close" data-close-menu aria-label="Fermer">${xSVG}</button>
        </header>
        <div class="mobile-menu__body">
          <ul>
            <li><a href="shop.html">Boutique</a></li>
            <li><a href="collection.html">Collections</a></li>
            <li><a href="index.html#sur-mesure">Studio sur-mesure</a></li>
            <li><a href="article.html">Journal</a></li>
            <li><a href="account.html">Mon compte</a></li>
            <li><a href="login.html">Se connecter / Créer un compte</a></li>
          </ul>
          <div class="mobile-menu__sub">
            <ul>
              <li><a href="#">Aide</a></li>
              <li><a href="#">Livraison &amp; retours</a></li>
              <li><a href="#">Guide des tailles</a></li>
              <li><a href="#">Nous contacter</a></li>
            </ul>
          </div>
        </div>
        <footer class="mobile-menu__foot">
          <span>FR · EN</span>
          <span>+237 6 90 12 34 56</span>
        </footer>
      </nav>`;
    document.body.appendChild(el);
    el.querySelector('[data-close-menu]').addEventListener('click', closeAll);
  }

  function buildToastStack() {
    if (document.getElementById('celva-toasts')) return;
    document.body.appendChild(html`<div id="celva-toasts" class="toast-stack" aria-live="polite"></div>`);
  }

  function buildCookieBanner() {
    if (localStorage.getItem('celva.cookies') === 'ok') return;
    if (document.getElementById('celva-cookies')) return;
    const el = html`
      <aside id="celva-cookies" class="cookies" role="dialog" aria-label="Cookies">
        <p><strong>Quelques cookies&nbsp;?</strong>Nous en utilisons pour vous reconnaître à votre retour et améliorer la boutique. Rien de plus.</p>
        <div class="cookies__actions">
          <button class="btn btn--primary" data-cookies="ok">Tout accepter</button>
          <button class="btn btn--secondary" data-cookies="essential">Essentiels</button>
        </div>
      </aside>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('is-visible'));
    el.querySelectorAll('[data-cookies]').forEach(b => b.addEventListener('click', () => {
      localStorage.setItem('celva.cookies', b.dataset.cookies);
      el.classList.remove('is-visible');
      setTimeout(() => el.remove(), 320);
    }));
  }

  function injectBurger() {
    document.querySelectorAll('.header .nav').forEach(nav => {
      if (nav.querySelector('.burger')) return;
      const burger = document.createElement('button');
      burger.className = 'burger icon-btn';
      burger.setAttribute('aria-label', 'Menu');
      burger.innerHTML = burgerSVG;
      nav.insertBefore(burger, nav.firstChild);
      burger.addEventListener('click', () => openPanel('menu'));
    });
  }

  // ---------- Open / close ----------
  function openPanel(kind) {
    document.getElementById('celva-overlay')?.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    if (kind === 'cart')   document.getElementById('celva-drawer')?.classList.add('is-open');
    if (kind === 'search') {
      const s = document.getElementById('celva-search');
      s?.classList.add('is-open');
      setTimeout(() => s?.querySelector('input')?.focus(), 120);
    }
    if (kind === 'menu')   document.getElementById('celva-menu')?.classList.add('is-open');
  }
  function closeAll() {
    document.getElementById('celva-overlay')?.classList.remove('is-open');
    document.getElementById('celva-drawer')?.classList.remove('is-open');
    document.getElementById('celva-search')?.classList.remove('is-open');
    document.getElementById('celva-menu')?.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  // ---------- Toast API ----------
  window.celvaToast = function (message, options = {}) {
    buildToastStack();
    const stack = document.getElementById('celva-toasts');
    const toast = html`<div class="toast" role="status">${checkSVG}<span><strong>${options.title || 'Ajouté ✓'}</strong>${message ? ' · ' + message : ''}</span></div>`;
    stack.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('is-dismissing');
      setTimeout(() => toast.remove(), 240);
    }, options.duration || 3800);
  };

  function setupInteractions() {
    buildOverlay();
    buildDrawer();
    buildSearch();
    buildMobileMenu();
    buildToastStack();
    injectBurger();
    buildCookieBanner();

    // Intercept clicks
    document.addEventListener('click', (e) => {
      // bag → drawer
      const bag = e.target.closest('[aria-label="Panier"]');
      if (bag && !bag.hasAttribute('data-no-drawer')) {
        e.preventDefault();
        openPanel('cart');
        return;
      }
      // search
      const search = e.target.closest('[aria-label="Rechercher"]');
      if (search) {
        e.preventDefault();
        openPanel('search');
        return;
      }
      // "Ajouter au panier" — trigger toast and open drawer
      const addCart = e.target.closest('.product__add');
      if (addCart && addCart.tagName === 'A') {
        e.preventDefault();
        window.celvaToast('Trench Ekiti · Taille 38', { title: 'Ajouté au panier ✓' });
        openPanel('cart');
        return;
      }
    });

    // Esc to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAll();
    });
  }
  function init() {
    applyTweaks(tweakState);
    setupReveal();
    ensurePanel();
    setupInteractions();

    try {
      window.parent.postMessage({ type: "__edit_mode_available" }, "*");
    } catch (e) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
