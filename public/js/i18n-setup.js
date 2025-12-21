/**
 * i18n-setup.js - Internationalization Configuration for Pro Conversion
 * Handles language detection, translation, SEO updates, and link persistence
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Detect current page to load page-specific SEO
    const path = window.location.pathname;
    let pageKey = 'home'; // Default

    if (path.includes('jpg-png')) pageKey = 'jpg_png';
    else if (path.includes('png-jpg')) pageKey = 'png_jpg';
    else if (path.includes('jpg-compressor')) pageKey = 'jpg_compressor';
    else if (path.includes('imagen-imagen')) pageKey = 'imagen_imagen';
    else if (path.includes('imagen-pdf')) pageKey = 'imagen_pdf';
    else if (path.includes('csv-json')) pageKey = 'csv_json';
    else if (path.includes('base64')) pageKey = 'base64';
    else if (path.includes('qr-generator')) pageKey = 'qr_generator';
    else if (path.includes('herramienta')) pageKey = 'tools';
    else if (path.includes('contacto')) pageKey = 'contact';
    else if (path.includes('privacidad')) pageKey = 'privacy';
    else if (path.includes('terminos')) pageKey = 'terms';

    // Main orchestration function
    function updateAll(pageKey) {
        updateTextContent();
        updateAttributes();
        updateSEO(pageKey);
        fixInternalLinks();
        syncLanguageSwitcher();
    }

    // 1. Translate HTML inner content (h1, p, span, button, etc.)
    function updateTextContent() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (i18next.exists(key)) {
                el.innerHTML = i18next.t(key);
            }
        });
    }

    // 2. Translate attributes (placeholder, alt, title, value, aria-label)
    function updateAttributes() {
        document.querySelectorAll('[data-i18n-attr]').forEach(el => {
            const pairs = el.getAttribute('data-i18n-attr').split(';');
            pairs.forEach(pair => {
                const [attr, key] = pair.split(':').map(s => s.trim());
                if (attr && key && i18next.exists(key)) {
                    el.setAttribute(attr, i18next.t(key));
                }
            });
        });
    }

    // Helper to get current language safely
    function getCurrentLang() {
        const lang = i18next.language || i18next.resolvedLanguage || 'es';
        return lang.substring(0, 2);
    }

    // 3. Update Meta Tags for SEO and AdSense
    function updateSEO(key) {
        const currentLang = getCurrentLang();

        // Page Title
        const titleKey = `pages.${key}.seo_title`;
        if (i18next.exists(titleKey)) {
            document.title = i18next.t(titleKey);
        }

        // Meta Description
        const descKey = `pages.${key}.seo_desc`;
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc && i18next.exists(descKey)) {
            metaDesc.setAttribute('content', i18next.t(descKey));
        }

        // HTML Lang attribute
        document.documentElement.lang = currentLang;

        // Update URL visually (without reload) using replaceState to not break back button
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('lng', currentLang);
        window.history.replaceState({}, '', newUrl);

        // Update OG locale if present
        const ogLocale = document.querySelector('meta[property="og:locale"]');
        if (ogLocale) {
            ogLocale.setAttribute('content', currentLang === 'en' ? 'en_US' : 'es_ES');
        }
    }

    // 4. Add language parameter to all internal links for persistence
    function fixInternalLinks() {
        const currentLang = getCurrentLang();

        document.querySelectorAll('a').forEach(link => {
            // Only act on internal links that are not anchors (#)
            const href = link.getAttribute('href');
            if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
                try {
                    // Handle relative URLs
                    const url = new URL(href, window.location.origin);
                    if (url.hostname === window.location.hostname) {
                        url.searchParams.set('lng', currentLang);
                        link.href = url.toString();
                    }
                } catch (e) {
                    // Invalid URL, skip
                }
            }
        });
    }

    // 5. Sync language switcher with current language
    function syncLanguageSwitcher() {
        const switcher = document.getElementById('languageSwitcher');
        if (switcher) {
            const currentLang = getCurrentLang();
            switcher.value = currentLang;
        }
    }

    // Setup language switcher event listener
    function setupLanguageSwitcher() {
        const switcher = document.getElementById('languageSwitcher');
        if (switcher) {
            switcher.addEventListener('change', (e) => {
                const lang = e.target.value;
                i18next.changeLanguage(lang, () => {
                    updateAll(pageKey);
                });
            });
        }
    }

    // Show body after translations are ready
    function showBody() {
        if (document.body) {
            document.body.style.visibility = 'visible';
        }
    }

    // Initialize i18next
    i18next
        .use(i18nextHttpBackend)
        .use(i18nextBrowserLanguageDetector)
        .init({
            fallbackLng: 'es',
            supportedLngs: ['es', 'en'],
            debug: false,
            backend: {
                // IMPORTANT: Leading / ensures absolute path loading from root
                // Works correctly for both root pages and /pages/ subdirectory
                loadPath: '/locales/{{lng}}/translation.json'
            },
            detection: {
                order: ['querystring', 'cookie', 'localStorage', 'navigator'],
                lookupQuerystring: 'lng', // ?lng=en
                caches: ['localStorage', 'cookie']
            }
        }, function (err, t) {
            if (err) {
                console.error('Error loading translations:', err);
                showBody(); // Show body even on error
                return;
            }

            // Execute initial translation after i18next is ready
            updateAll(pageKey);

            // Setup language switcher after initialization
            setupLanguageSwitcher();

            // Show body after translations are applied
            showBody();
        });
});
