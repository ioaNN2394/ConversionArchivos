/**
 * Utilidades compartidas para todos los conversores
 * Manejo de archivos, validación, descargas y mensajes
 * Con soporte para i18next cuando está disponible
 */

const ConversionUtils = (function () {
    'use strict';

    // =============================================
    // CONFIGURACIÓN GLOBAL
    // =============================================
    const CONFIG = {
        MAX_FILE_SIZE: 10 * 1024 * 1024, // 10 MB
        MAX_IMAGE_DIMENSION: 4000, // píxeles máximos
        MAX_FILES: 5,
        ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
        ALLOWED_CSV_TYPES: ['text/csv', 'text/plain', 'application/vnd.ms-excel'],
        ALLOWED_JSON_TYPES: ['application/json', 'text/plain'],
        QUALITY_DEFAULT: 0.8,
        QUALITY_LEVELS: {
            low: 0.5,
            medium: 0.75,
            high: 0.9
        }
    };

    // Detectar iOS
    function isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    }

    // Detectar Safari
    function isSafari() {
        return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    }

    // =============================================
    // HELPER PARA TRADUCCIONES
    // =============================================

    /**
     * Obtiene traducción si i18next está disponible, sino usa el fallback
     * @param {string} key - Clave de traducción (ej: 'common.messages.success')
     * @param {string} fallback - Texto por defecto si no hay traducción
     * @returns {string}
     */
    function t(key, fallback) {
        if (typeof i18next !== 'undefined' && i18next.isInitialized && i18next.exists(key)) {
            return i18next.t(key);
        }
        return fallback;
    }

    // =============================================
    // MENSAJES UNIFORMES (con soporte i18n)
    // =============================================
    const MESSAGES = {
        SUCCESS: {
            get conversion() { return t('common.messages.success', '✓ Conversión completada. Tu archivo está listo para descargar.'); },
            get copy() { return t('common.messages.copied', '✓ Copiado al portapapeles.'); },
            get compress() { return t('common.messages.compress_success', '✓ Compresión completada.'); }
        },
        ERROR: {
            get fileTooLarge() { return t('common.messages.max_size', 'El archivo es demasiado grande. Tamaño máximo: 10 MB.'); },
            get invalidType() { return t('common.messages.invalid_file', 'Tipo de archivo no soportado.'); },
            get readError() { return t('common.messages.read_error', 'No se pudo leer el archivo. Verifica que no esté dañado.'); },
            get conversionError() { return t('common.messages.error', 'Error durante la conversión. Intenta de nuevo.'); },
            get invalidBase64() { return t('common.messages.invalid_base64', 'El texto no es una cadena Base64 válida.'); },
            get csvParseError() { return t('common.messages.csv_error', 'Error al procesar el archivo CSV.'); },
            get jsonParseError() { return t('common.messages.json_error', 'Error al procesar el archivo JSON.'); },
            get qrTooLong() { return t('common.messages.qr_too_long', 'El texto es demasiado largo para generar un QR válido.'); },
            get imageTooLarge() { return t('common.messages.image_too_large', 'La imagen es demasiado grande. Se redimensionará automáticamente.'); },
            get noFile() { return t('common.messages.no_file', 'Por favor selecciona un archivo.'); },
            get noText() { return t('common.messages.no_text', 'Por favor ingresa texto para procesar.'); },
            get webpNotSupported() { return t('common.messages.webp_not_supported', 'Tu navegador no soporta el formato WebP.'); }
        },
        INFO: {
            get processing() { return t('common.messages.converting', 'Procesando...'); },
            get dragDrop() { return t('common.dropzone.drag_file', 'Arrastra tu archivo aquí o haz clic para seleccionar'); },
            get privacy() { return t('common.messages.privacy', '🔒 Los archivos no se suben a ningún servidor. Todo se procesa en tu navegador.'); },
            get transparencyWarning() { return t('common.messages.transparency_warning', 'Las imágenes con transparencia tendrán fondo blanco en JPG.'); }
        }
    };

    // =============================================
    // VALIDACIÓN DE ARCHIVOS
    // =============================================

    /**
     * Valida un archivo según tipo y tamaño
     * @param {File} file - Archivo a validar
     * @param {Array} allowedTypes - MIME types permitidos
     * @returns {Object} { valid: boolean, error: string|null }
     */
    function validateFile(file, allowedTypes) {
        if (!file) {
            return { valid: false, error: MESSAGES.ERROR.noFile };
        }

        if (file.size > CONFIG.MAX_FILE_SIZE) {
            return { valid: false, error: MESSAGES.ERROR.fileTooLarge };
        }

        // Validación híbrida: MIME type + extensión (especialmente para iOS)
        let isValidType = false;

        if (file.type && allowedTypes.includes(file.type)) {
            // MIME type válido
            isValidType = true;
        } else if (!file.type && file.name) {
            // Si MIME type está vacío (iOS), validar por extensión
            const extension = file.name.toLowerCase().split('.').pop();
            const extensionMap = {
                'image/jpeg': ['jpg', 'jpeg'],
                'image/png': ['png'],
                'image/webp': ['webp'],
                'text/csv': ['csv'],
                'application/json': ['json']
            };

            for (const mimeType of allowedTypes) {
                if (extensionMap[mimeType] && extensionMap[mimeType].includes(extension)) {
                    isValidType = true;
                    break;
                }
            }
        }

        if (!isValidType) {
            return { valid: false, error: MESSAGES.ERROR.invalidType };
        }

        return { valid: true, error: null };
    }

    /**
     * Valida imagen específicamente
     * @param {File} file 
     * @returns {Object}
     */
    function validateImageFile(file) {
        return validateFile(file, CONFIG.ALLOWED_IMAGE_TYPES);
    }

    /**
     * Valida archivo CSV
     * @param {File} file 
     * @returns {Object}
     */
    function validateCSVFile(file) {
        return validateFile(file, CONFIG.ALLOWED_CSV_TYPES);
    }

    /**
     * Valida archivo JSON
     * @param {File} file 
     * @returns {Object}
     */
    function validateJSONFile(file) {
        return validateFile(file, CONFIG.ALLOWED_JSON_TYPES);
    }

    // =============================================
    // LECTURA DE ARCHIVOS
    // =============================================

    /**
     * Lee un archivo como DataURL
     * @param {File} file 
     * @returns {Promise<string>}
     */
    function readAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error(MESSAGES.ERROR.readError));
            reader.readAsDataURL(file);
        });
    }

    /**
     * Lee un archivo como texto
     * @param {File} file 
     * @returns {Promise<string>}
     */
    function readAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error(MESSAGES.ERROR.readError));
            reader.readAsText(file, 'UTF-8');
        });
    }

    /**
     * Carga una imagen desde un DataURL
     * @param {string} dataURL 
     * @returns {Promise<HTMLImageElement>}
     */
    function loadImage(dataURL) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(MESSAGES.ERROR.readError));
            img.src = dataURL;
        });
    }

    // =============================================
    // PROCESAMIENTO DE IMÁGENES CON CANVAS
    // =============================================

    // Canvas reutilizable para mejor rendimiento
    let sharedCanvas = null;
    let sharedCtx = null;

    function getSharedCanvas() {
        if (!sharedCanvas) {
            sharedCanvas = document.createElement('canvas');
            sharedCtx = sharedCanvas.getContext('2d');
        }
        return { canvas: sharedCanvas, ctx: sharedCtx };
    }

    /**
     * Redimensiona imagen si es demasiado grande
     * @param {number} width 
     * @param {number} height 
     * @returns {Object} { width, height, scaled }
     */
    function calculateDimensions(width, height) {
        const maxDim = CONFIG.MAX_IMAGE_DIMENSION;

        if (width <= maxDim && height <= maxDim) {
            return { width, height, scaled: false };
        }

        const ratio = Math.min(maxDim / width, maxDim / height);
        return {
            width: Math.round(width * ratio),
            height: Math.round(height * ratio),
            scaled: true
        };
    }

    /**
     * Convierte imagen a formato especificado usando Canvas
     * @param {HTMLImageElement} img 
     * @param {string} format - 'image/png', 'image/jpeg', 'image/webp'
     * @param {number} quality - 0.0 a 1.0 (solo para jpeg/webp)
     * @param {string} bgColor - Color de fondo para transparencias
     * @returns {Promise<Blob>}
     */
    function convertImageToFormat(img, format, quality = CONFIG.QUALITY_DEFAULT, bgColor = '#ffffff') {
        return new Promise((resolve, reject) => {
            try {
                const dims = calculateDimensions(img.width, img.height);
                const { canvas, ctx } = getSharedCanvas();

                canvas.width = dims.width;
                canvas.height = dims.height;

                // Limpiar y rellenar fondo si es JPG (no soporta transparencia)
                if (format === 'image/jpeg') {
                    ctx.fillStyle = bgColor;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                } else {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }

                ctx.drawImage(img, 0, 0, dims.width, dims.height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error(MESSAGES.ERROR.conversionError));
                        }
                    },
                    format,
                    quality
                );
            } catch (error) {
                reject(new Error(MESSAGES.ERROR.conversionError));
            }
        });
    }

    /**
     * Detecta si el navegador soporta WebP
     * @returns {Promise<boolean>}
     */
    function supportsWebP() {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img.width > 0 && img.height > 0);
            img.onerror = () => resolve(false);
            img.src = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';
        });
    }

    // =============================================
    // DESCARGA DE ARCHIVOS
    // =============================================

    // URLs temporales a revocar
    const tempURLs = new Set();

    /**
     * Crea URL temporal y la registra para limpieza
     * @param {Blob} blob 
     * @returns {string}
     */
    function createTempURL(blob) {
        const url = URL.createObjectURL(blob);
        tempURLs.add(url);
        return url;
    }

    /**
     * Revoca una URL temporal específica
     * @param {string} url 
     */
    function revokeTempURL(url) {
        if (tempURLs.has(url)) {
            URL.revokeObjectURL(url);
            tempURLs.delete(url);
        }
    }

    /**
     * Revoca todas las URLs temporales
     */
    function revokeAllTempURLs() {
        tempURLs.forEach(url => URL.revokeObjectURL(url));
        tempURLs.clear();
    }

    /**
     * Descarga un blob como archivo
     * @param {Blob} blob 
     * @param {string} filename 
     */
    function downloadBlob(blob, filename) {
        const url = createTempURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Revocar URL después de un breve delay
        setTimeout(() => revokeTempURL(url), 1000);
    }

    /**
     * Descarga texto como archivo
     * @param {string} content 
     * @param {string} filename 
     * @param {string} mimeType 
     */
    function downloadText(content, filename, mimeType = 'text/plain') {
        const blob = new Blob([content], { type: mimeType });
        downloadBlob(blob, filename);
    }

    /**
     * Obtiene nombre de archivo sin extensión
     * @param {string} filename 
     * @returns {string}
     */
    function getFileNameWithoutExtension(filename) {
        const lastDot = filename.lastIndexOf('.');
        return lastDot > 0 ? filename.substring(0, lastDot) : filename;
    }

    // =============================================
    // UI HELPERS
    // =============================================

    /**
     * Formatea tamaño de archivo para mostrar
     * @param {number} bytes 
     * @returns {string}
     */
    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }

    /**
     * Muestra mensaje de éxito en elemento
     * @param {HTMLElement} element 
     * @param {string} message 
     */
    function showSuccess(element, message) {
        element.innerHTML = `<div class="message message--success">${message}</div>`;
        element.classList.add('show');
    }

    /**
     * Muestra mensaje de error en elemento
     * @param {HTMLElement} element 
     * @param {string} message 
     */
    function showError(element, message) {
        element.innerHTML = `<div class="message message--error">${message}</div>`;
        element.classList.add('show');
    }

    /**
     * Muestra mensaje de información en elemento
     * @param {HTMLElement} element 
     * @param {string} message 
     */
    function showInfo(element, message) {
        element.innerHTML = `<div class="message message--info">${message}</div>`;
        element.classList.add('show');
    }

    /**
     * Limpia mensajes de un elemento
     * @param {HTMLElement} element 
     */
    function clearMessage(element) {
        element.innerHTML = '';
        element.classList.remove('show');
    }

    /**
     * Copia texto al portapapeles
     * @param {string} text 
     * @returns {Promise<boolean>}
     */
    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            // Fallback para navegadores antiguos
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            const success = document.execCommand('copy');
            document.body.removeChild(textarea);
            return success;
        }
    }

    /**
     * Debounce para evitar llamadas excesivas
     * @param {Function} func 
     * @param {number} wait 
     * @returns {Function}
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Resetea un input de archivo de forma correcta
     * Solo limpia el valor, sin cambiar el tipo (evita problemas en iOS)
     * @param {HTMLInputElement} inputElement
     */
    function resetFileInput(inputElement) {
        if (!inputElement) return;

        // Solo limpiar el valor, no cambiar el tipo
        inputElement.value = '';
    }

    /**
     * Inicializa evento de input para archivos
     * Solo usa change para evitar conflictos en iOS
     * No clona el input - solo limpia listeners y asigna nuevos
     * @param {HTMLInputElement} fileInput
     * @param {Function} onFileSelected
     */
    function setupFileInputListener(fileInput, onFileSelected) {
        if (!fileInput) return fileInput;

        // NO clonar: directamente limpiar y asignar listeners al input existente
        // Esto evita problemas con el diálogo nativo en iOS

        // Marcar que este input ya fue configurado para evitar múltiples listeners
        if (fileInput._fileListenerConfigured) {
            return fileInput;
        }

        // Crear wrapper para evitar listeners duplicados y ejecuciones múltiples
        const wrappedHandler = (e) => {
            const files = e.target.files;

            if (!files || files.length === 0) {
                return;
            }

            // Evitar doble ejecución
            if (fileInput._isProcessing) return;
            fileInput._isProcessing = true;

            // Obtener el primer archivo
            const file = files[0];

            // Ejecutar callback de forma asíncrona con manejo de errores
            setTimeout(() => {
                try {
                    onFileSelected(file);
                } catch (error) {
                    console.error('Error processing file:', error);
                    showError(document.body, MESSAGES.ERROR.conversionError);
                }

                // IMPORTANTE: Reset el flag después de procesar
                // Esto permite que el próximo clic en el botón funcione
                fileInput._isProcessing = false;

                // Limpiar el value para permitir seleccionar el MISMO archivo de nuevo
                // Esto se hace AQUÍ, no en el listener de click, para no interferir con el diálogo
                fileInput.value = '';
            }, 0);
        };

        // Escuchar únicamente el evento change
        fileInput.addEventListener('change', wrappedHandler);

        // Reset del flag al hacer click para asegurar que está listo
        fileInput.addEventListener('click', () => {
            fileInput._isProcessing = false;
        });

        // Marcar como configurado
        fileInput._fileListenerConfigured = true;

        // Retornar el input sin clonar
        return fileInput;
    }

    /**
     * Inicializa zona de arrastrar y soltar
     * @param {HTMLElement} dropZone 
     * @param {Function} onFileDrop 
     */
    function initDragAndDrop(dropZone, onFileDrop) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.add('drag-over');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.remove('drag-over');
            });
        });

        dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                onFileDrop(files[0]);
            }
        });
    }

    // =============================================
    // EXPORTAR API PÚBLICA
    // =============================================
    return {
        CONFIG,
        MESSAGES,
        t, // Exponer helper de traducción
        // Validación
        validateFile,
        validateImageFile,
        validateCSVFile,
        validateJSONFile,
        // Lectura
        readAsDataURL,
        readAsText,
        loadImage,
        // Canvas
        convertImageToFormat,
        supportsWebP,
        calculateDimensions,
        // Descarga
        downloadBlob,
        downloadText,
        createTempURL,
        revokeTempURL,
        revokeAllTempURLs,
        getFileNameWithoutExtension,
        // Manejo de input
        resetFileInput,
        setupFileInputListener,
        // UI
        formatFileSize,
        showSuccess,
        showError,
        showInfo,
        clearMessage,
        copyToClipboard,
        debounce,
        initDragAndDrop,
        isIOS,
        isSafari
    };
})();

// Limpiar URLs temporales al cerrar página
window.addEventListener('beforeunload', () => {
    ConversionUtils.revokeAllTempURLs();
});
