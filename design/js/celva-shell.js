/* CELVA — partials shared across pages.
   Loaded once via celva.js and injected as needed. */

window.CELVA_SVG_DEFS = `
<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">
  <defs>
    <symbol id="i-monogram" viewBox="0 0 100 100">
      <g fill="none" stroke="currentColor" stroke-width="7.5" stroke-linecap="butt" stroke-linejoin="miter">
        <path d="M 66 27.3 A 32 32 0 1 1 34 27.3" />
        <path d="M 24 8 L 50 78 L 74 6" />
        <path d="M 84 6 L 91 1" stroke-width="6.5" />
      </g>
    </symbol>
    <symbol id="i-search" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7" /><path d="M16 16l5 5" stroke-linecap="round" /></symbol>
    <symbol id="i-user" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke-linecap="round" /></symbol>
    <symbol id="i-heart" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 21s-7-4.5-9.5-9C1 9 2.6 5 6.5 5c2 0 3.6 1 5.5 3 1.9-2 3.5-3 5.5-3 3.9 0 5.5 4 4 7-2.5 4.5-9.5 9-9.5 9z" stroke-linejoin="round" /></symbol>
    <symbol id="i-bag" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 7h12l-1 13H7L6 7z" stroke-linejoin="round" /><path d="M9 7V5a3 3 0 0 1 6 0v2" /></symbol>
    <symbol id="i-arrow-right" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 12h14M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" /></symbol>
    <symbol id="i-arrow-left" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M19 12H5M11 6l-6 6 6 6" stroke-linecap="round" stroke-linejoin="round" /></symbol>
    <symbol id="i-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 12l5 5 9-11" stroke-linecap="round" stroke-linejoin="round"/></symbol>
    <symbol id="i-whatsapp" viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 3.5A11 11 0 0 0 2.5 17.4L1 23l5.7-1.5A11 11 0 0 0 23 12a10.9 10.9 0 0 0-2.5-8.5zM12 21a9 9 0 0 1-4.6-1.3l-.3-.2-3.4.9.9-3.3-.2-.3A9 9 0 1 1 12 21zm5-6.7c-.3-.2-1.6-.8-1.9-.9-.3-.1-.4-.1-.6.1l-.8 1c-.2.3-.4.3-.7.1-.3-.2-1.2-.4-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.4.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.3 0-.5l-.8-2c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.4s1 2.8 1.2 3c.2.3 2.1 3.2 5 4.4.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.6-.7 1.8-1.3.2-.6.2-1.2.2-1.3-.1-.1-.3-.2-.5-.3z"/></symbol>
  </defs>
</svg>
`;

window.CELVA_ANNOUNCE = `<div class="announce">Livraison offerte dès 50 000 FCFA · Retours gratuits sous 14 jours</div>`;

window.CELVA_HEADER = (active) => `
<header class="header">
  <div class="container">
    <nav class="nav">
      <a class="nav__brand" href="index.html"><svg viewBox="0 0 100 100" fill="none"><use href="#i-monogram"/></svg><span>CELVA</span></a>
      <ul class="nav__links">
        <li><a href="shop.html" ${active==='shop'?'class="is-active"':''}>Boutique</a></li>
        <li><a href="collection.html" ${active==='collection'?'class="is-active"':''}>Collections</a></li>
        <li><a href="index.html#sur-mesure">Studio sur-mesure</a></li>
        <li><a href="article.html" ${active==='journal'?'class="is-active"':''}>Journal</a></li>
      </ul>
      <div class="nav__actions">
        <button class="icon-btn" aria-label="Rechercher"><svg viewBox="0 0 24 24" fill="none"><use href="#i-search"/></svg></button>
        <a class="icon-btn" href="account.html" aria-label="Compte"><svg viewBox="0 0 24 24" fill="none"><use href="#i-user"/></svg></a>
        <button class="icon-btn" aria-label="Wishlist"><svg viewBox="0 0 24 24" fill="none"><use href="#i-heart"/></svg></button>
        <a class="icon-btn" href="cart.html" aria-label="Panier"><svg viewBox="0 0 24 24" fill="none"><use href="#i-bag"/></svg><span class="cart-badge">2</span></a>
      </div>
    </nav>
  </div>
</header>
`;

window.CELVA_FOOTER = `
<footer class="footer">
  <div class="container">
    <div class="footer__top">
      <div class="footer__brand">
        <a class="footer__brand-mark" href="index.html"><svg viewBox="0 0 100 100" fill="none"><use href="#i-monogram"/></svg><span>CELVA</span></a>
        <p>Maison camerounaise de prêt-à-porter et sur-mesure. Atelier rue Foch, Douala.</p>
      </div>
      <div class="footer__col"><h4>Boutique</h4><ul><li><a href="shop.html">Nouveautés</a></li><li><a href="shop.html">Femme</a></li><li><a href="shop.html">Homme</a></li><li><a href="shop.html">Archive</a></li></ul></div>
      <div class="footer__col"><h4>Maison</h4><ul><li><a href="#">Notre histoire</a></li><li><a href="#">Atelier</a></li><li><a href="index.html#sur-mesure">Le sur-mesure</a></li><li><a href="article.html">Journal</a></li></ul></div>
      <div class="footer__col"><h4>Aide</h4><ul><li><a href="aide.html#panel-sizes">Guide des tailles</a></li><li><a href="aide.html#panel-shipping">Livraison &amp; retours</a></li><li><a href="aide.html#panel-care">Entretien</a></li><li><a href="aide.html">Nous contacter</a></li></ul></div>
      <div class="footer__col"><h4>Contact</h4><ul><li><a href="#">bonjour@celva.cm</a></li><li><a href="#">+237 6 90 12 34 56</a></li><li><a href="#">WhatsApp</a></li><li><a href="#">Instagram</a></li></ul></div>
    </div>
    <div class="footer__bottom">
      <span>© 2026 Celva. Tous droits réservés.</span>
      <div class="footer__pay"><span>Orange Money</span><span>MTN MoMo</span><span>Visa</span><span>Mastercard</span></div>
      <span>FR · EN</span>
    </div>
  </div>
</footer>
<a class="fab-whatsapp" href="#" aria-label="WhatsApp"><svg viewBox="0 0 24 24" fill="currentColor"><use href="#i-whatsapp"/></svg></a>
`;

// Inject placeholders on DOM ready
function injectCelvaShell() {
  document.querySelectorAll('[data-celva="svg-defs"]').forEach(el => el.outerHTML = window.CELVA_SVG_DEFS);
  document.querySelectorAll('[data-celva="announce"]').forEach(el => el.outerHTML = window.CELVA_ANNOUNCE);
  document.querySelectorAll('[data-celva="header"]').forEach(el => el.outerHTML = window.CELVA_HEADER(el.getAttribute('data-active')));
  document.querySelectorAll('[data-celva="footer"]').forEach(el => el.outerHTML = window.CELVA_FOOTER);
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectCelvaShell);
} else {
  injectCelvaShell();
}
