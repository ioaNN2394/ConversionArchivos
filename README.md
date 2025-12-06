# Proyecto Web: Convertidor de Archivos

Este proyecto es una aplicación web estática optimizada para SEO, accesibilidad y monetización con Google AdSense.

## Estructura del Proyecto

```
proyecto-web/
├── index.html              # Página de inicio (Landing)
├── pages/                  # Páginas internas
│   ├── herramienta.html    # Herramienta de conversión
│   ├── privacidad.html     # Política de privacidad (AdSense compliant)
│   ├── terminos.html       # Términos de servicio
│   └── contacto.html       # Formulario de contacto
├── css/                    # Estilos CSS modulares
│   ├── variables.css       # Variables globales (colores, fuentes)
│   ├── base.css            # Reset y estilos base
│   ├── componentes.css     # Botones, cards, forms
│   ├── layout.css          # Grid, header, footer, ads
│   └── responsive.css      # Media queries
├── js/                     # JavaScript
│   ├── main.js             # Lógica general
│   ├── navegacion.js       # Menú móvil
│   └── analytics.js        # Configuración GA
└── assets/                 # Recursos estáticos
```

## Pasos para Finalizar

1.  **Google AdSense:**
    *   Busca los comentarios `<!-- Google AdSense Code Placeholder -->` en los archivos HTML.
    *   Reemplaza el contenido dentro de los `div` con clase `ad-container` con tu código de script de AdSense.
    *   Asegúrate de no modificar las clases CSS de los contenedores.

2.  **Google Analytics:**
    *   Abre `js/analytics.js` y descomenta las líneas de configuración.
    *   Reemplaza `G-XXXXXXXXXX` con tu ID de medición real.

3.  **Personalización:**
    *   Edita `css/variables.css` para cambiar los colores de marca si es necesario.
    *   Actualiza los textos de "Tu Nombre/Empresa" y correos electrónicos en `pages/contacto.html` y `pages/privacidad.html`.
    *   Agrega tu lógica de conversión en `js/main.js` o un nuevo archivo específico.

4.  **Despliegue:**
    *   Sube todo el contenido a tu hosting o servicio como Netlify/Vercel/GitHub Pages.
    *   Verifica que todas las rutas de imágenes y enlaces funcionen correctamente.

## Optimización

*   **Velocidad:** El CSS y JS están separados para facilitar la minificación futura.
*   **SEO:** Las etiquetas meta y la estructura semántica están listas.
*   **Accesibilidad:** Se han seguido pautas WCAG 2.1 AA (contrastes, etiquetas aria, navegación por teclado).
