(function () {
    var T = {
        es: {
            'nav.home': 'INICIO',
            'nav.shop': 'CATÁLOGO',
            'nav.about': 'NOSOTROS',
            'nav.design': 'CREA TU DISEÑO',
            'nav.cart': 'BOLSA',
            'lang.btn': 'EN',
            'cart.title': 'TU BOLSA',
            'cart.empty': 'TU BOLSA ESTÁ VACÍA',
            'cart.explore': 'EXPLORAR EL CATÁLOGO',
            'cart.loading': 'CARGANDO...',
            'cart.subtotal': 'SUBTOTAL',
            'cart.checkout': 'COMPLETAR PEDIDO',
            'cart.shipping': 'ENVÍO SE CALCULA AL CONFIRMAR',
            'cart.items': 'ARTÍCULOS EN TU SELECCIÓN',
            'cart.remove': 'ELIMINAR',
            'product.add': 'AÑADIR AL CARRITO',
            'product.adding': 'AÑADIENDO...',
            'product.added': 'AÑADIDO AL CARRITO ✓',
            'product.soldout': 'AGOTADO',
            'product.size-guide': 'Guía de tallas',
            'product.material': 'Material y cuidados',
            'product.delivery': 'Envío y devoluciones',
            'product.delivery-text': 'Envío en todo el país. Devoluciones aceptadas dentro de los 14 días en condición original.',
            'product.quick-add': 'AGREGAR',
            'product.recommendations': 'TAMBIÉN TE PUEDE GUSTAR',
            'product.select-size': 'Selecciona una talla',
            'product.size': 'Talla',
            'catalog.soldout': 'AGOTADO',
            'catalog.quick-add': 'AGREGAR',
            'catalog.loading': 'CARGANDO PRODUCTOS...',
            'catalog.no-results': 'Sin resultados para tu búsqueda',
            'catalog.error': 'Error al cargar productos',
            'home.view-all': 'VER TODA LA COLECCIÓN',
            'home.explore': 'EXPLORAR',
            'home.loading': 'CARGANDO...',
            'home.arrivals': 'NOVEDADES',
            'about.explore': 'EXPLORAR ARCHIVO',
            'footer.shipping': 'Envíos',
            'footer.terms': 'Términos',
            'footer.about': 'Nosotros',
            'footer.cart': 'Carrito',
            'checkout.name': 'NOMBRE *',
            'checkout.phone': 'TELÉFONO *',
            'checkout.address': 'DIRECCIÓN (opcional)',
            'checkout.notes': 'NOTAS (opcional)',
            'checkout.confirm': 'CONFIRMAR PEDIDO',
            'checkout.title': 'CONFIRMAR PEDIDO',
            'checkout.total': 'TOTAL',
        },
        en: {
            'nav.home': 'HOME',
            'nav.shop': 'CATALOG',
            'nav.about': 'ABOUT',
            'nav.design': 'CREATE YOUR DESIGN',
            'nav.cart': 'BAG',
            'lang.btn': 'ES',
            'cart.title': 'YOUR BAG',
            'cart.empty': 'YOUR BAG IS EMPTY',
            'cart.explore': 'EXPLORE THE CATALOG',
            'cart.loading': 'LOADING...',
            'cart.subtotal': 'SUBTOTAL',
            'cart.checkout': 'COMPLETE ORDER',
            'cart.shipping': 'SHIPPING CALCULATED AT CHECKOUT',
            'cart.items': 'ITEMS IN YOUR SELECTION',
            'cart.remove': 'REMOVE',
            'product.add': 'ADD TO BAG',
            'product.adding': 'ADDING...',
            'product.added': 'ADDED TO BAG ✓',
            'product.soldout': 'SOLD OUT',
            'product.size-guide': 'Size Guide',
            'product.material': 'Material & Care',
            'product.delivery': 'Delivery & Returns',
            'product.delivery-text': 'Nationwide delivery. Returns accepted within 14 days in original condition.',
            'product.quick-add': 'QUICK ADD',
            'product.recommendations': 'YOU MAY ALSO LIKE',
            'product.select-size': 'Select a size',
            'product.size': 'Size',
            'catalog.soldout': 'SOLD OUT',
            'catalog.quick-add': 'QUICK ADD',
            'catalog.loading': 'LOADING PRODUCTS...',
            'catalog.no-results': 'No results for your search',
            'catalog.error': 'Error loading products',
            'home.view-all': 'VIEW ALL SERIES',
            'home.explore': 'EXPLORE',
            'home.loading': 'LOADING...',
            'home.arrivals': 'NEW ARRIVALS',
            'about.explore': 'EXPLORE ARCHIVE',
            'footer.shipping': 'Shipping',
            'footer.terms': 'Terms',
            'footer.about': 'About',
            'footer.cart': 'Cart',
            'checkout.name': 'NAME *',
            'checkout.phone': 'PHONE *',
            'checkout.address': 'ADDRESS (optional)',
            'checkout.notes': 'NOTES (optional)',
            'checkout.confirm': 'CONFIRM ORDER',
            'checkout.title': 'CONFIRM ORDER',
            'checkout.total': 'TOTAL',
        }
    };

    var STORAGE_KEY = 'one-root-lang';

    function getLang() {
        return localStorage.getItem(STORAGE_KEY) || 'es';
    }

    function t(key) {
        var lang = getLang();
        return (T[lang] && T[lang][key]) || (T.es && T.es[key]) || key;
    }

    function applyTranslations() {
        var lang = getLang();
        var dict  = T[lang] || T.es;
        document.querySelectorAll('[data-i18n]').forEach(function (el) {
            var val = dict[el.getAttribute('data-i18n')];
            if (val !== undefined) el.textContent = val;
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
            var val = dict[el.getAttribute('data-i18n-placeholder')];
            if (val !== undefined) el.placeholder = val;
        });
        document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
            var val = dict[el.getAttribute('data-i18n-html')];
            if (val !== undefined) el.innerHTML = val;
        });
        var btn = document.getElementById('lang-toggle');
        if (btn) btn.textContent = dict['lang.btn'] || (lang === 'es' ? 'EN' : 'ES');
        document.documentElement.lang = lang;
    }

    function setLang(lang) {
        localStorage.setItem(STORAGE_KEY, lang);
        applyTranslations();
        window.dispatchEvent(new CustomEvent('langchange', { detail: { lang: lang } }));
    }

    // Expose globals
    window.t        = t;
    window.getLang  = getLang;
    window.setLang  = setLang;
    window.applyTranslations = applyTranslations;

    function init() {
        applyTranslations();
        var btn = document.getElementById('lang-toggle');
        if (btn) btn.addEventListener('click', function () {
            setLang(getLang() === 'es' ? 'en' : 'es');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
