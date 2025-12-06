// Asegurar que los contenedores de anuncios permanezcan visibles
// Este script protege contra cambios de CSS o JavaScript que oculten los ads

(function() {
    // Función para restaurar visibilidad y asegurar que sean clickeables
    function ensureAdVisibility() {
        const adContainers = document.querySelectorAll('.ad-container');
        adContainers.forEach(container => {
            // Forzar estilos de visibilidad
            container.style.display = 'flex !important';
            container.style.visibility = 'visible !important';
            container.style.opacity = '1 !important';
            container.style.pointerEvents = 'auto !important';
            container.style.position = 'relative';
            
            // Asegurar que no sea colapsado
            if (container.offsetHeight === 0 || container.offsetWidth === 0) {
                container.style.minHeight = '280px';
                container.style.height = 'auto';
            }
            
            // Remover display: none si existe
            if (container.classList.contains('ad-container--top')) {
                container.style.height = '280px';
            } else if (container.classList.contains('ad-container--content') || 
                       container.classList.contains('ad-container--footer')) {
                container.style.height = '90px';
            }
        });
    }

    // Ejecutar cuando el DOM está listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(ensureAdVisibility, 100);
        });
    } else {
        ensureAdVisibility();
    }

    // Ejecutar después de que todos los scripts y estilos se carguen
    window.addEventListener('load', function() {
        setTimeout(ensureAdVisibility, 200);
    });

    // Monitorear cambios frecuentes durante los primeros 5 segundos
    let monitorCount = 0;
    const monitorInterval = setInterval(() => {
        ensureAdVisibility();
        monitorCount++;
        if (monitorCount > 10) { // 10 × 500ms = 5 segundos
            clearInterval(monitorInterval);
        }
    }, 500);

    // Usar MutationObserver para detectar cambios en el DOM
    try {
        const observer = new MutationObserver(() => {
            ensureAdVisibility();
        });
        
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['style', 'class'],
            subtree: true
        });
    } catch(e) {
        // Fallback si MutationObserver no está disponible
    }
})();
