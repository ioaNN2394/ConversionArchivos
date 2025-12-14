/**
 * Generador de Códigos QR
 * Genera QR personalizados desde texto o URL
 * Usa QRCode.js para la generación
 */

const QrGenerator = (function() {
    'use strict';

    let qrCode = null;
    let elements = {};

    const SIZE_OPTIONS = {
        small: 128,
        medium: 256,
        large: 512
    };

    const MAX_TEXT_LENGTH = 2953; // Límite práctico para QR

    function init() {
        loadQRCodeLib();

        elements = {
            textInput: document.getElementById('qr-text-input'),
            sizeSelect: document.getElementById('qr-size'),
            fgColorInput: document.getElementById('qr-fg-color'),
            bgColorInput: document.getElementById('qr-bg-color'),
            generateBtn: document.getElementById('generate-btn'),
            qrContainer: document.getElementById('qr-container'),
            qrResult: document.getElementById('qr-result'),
            downloadBtn: document.getElementById('download-btn'),
            resetBtn: document.getElementById('reset-btn'),
            messageArea: document.getElementById('message-area'),
            charCount: document.getElementById('char-count')
        };

        setupEventListeners();
        showPrivacyMessage();
    }

    function loadQRCodeLib() {
        if (typeof QRCode === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
            script.async = true;
            document.head.appendChild(script);
        }
    }

    function setupEventListeners() {
        if (elements.textInput) {
            elements.textInput.addEventListener('input', () => {
                updateCharCount();
                validateInput();
            });

            // Generar QR al presionar Enter
            elements.textInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    generateQR();
                }
            });
        }

        if (elements.generateBtn) {
            elements.generateBtn.addEventListener('click', generateQR);
        }

        if (elements.downloadBtn) {
            elements.downloadBtn.addEventListener('click', downloadQR);
        }

        if (elements.resetBtn) {
            elements.resetBtn.addEventListener('click', reset);
        }

        // Actualizar QR cuando cambian opciones de estilo
        ['sizeSelect', 'fgColorInput', 'bgColorInput'].forEach(key => {
            if (elements[key]) {
                elements[key].addEventListener('change', () => {
                    if (elements.textInput.value.trim()) {
                        generateQR();
                    }
                });
            }
        });
    }

    function showPrivacyMessage() {
        if (elements.messageArea) {
            ConversionUtils.showInfo(elements.messageArea, ConversionUtils.MESSAGES.INFO.privacy);
        }
    }

    function updateCharCount() {
        if (!elements.charCount || !elements.textInput) return;
        
        const length = elements.textInput.value.length;
        elements.charCount.textContent = `${length} / ${MAX_TEXT_LENGTH}`;
        
        if (length > MAX_TEXT_LENGTH) {
            elements.charCount.classList.add('over-limit');
        } else {
            elements.charCount.classList.remove('over-limit');
        }
    }

    function validateInput() {
        const text = elements.textInput.value.trim();
        
        if (!text) {
            if (elements.generateBtn) {
                elements.generateBtn.disabled = true;
            }
            return false;
        }

        if (text.length > MAX_TEXT_LENGTH) {
            ConversionUtils.showError(elements.messageArea, ConversionUtils.MESSAGES.ERROR.qrTooLong);
            if (elements.generateBtn) {
                elements.generateBtn.disabled = true;
            }
            return false;
        }

        if (elements.generateBtn) {
            elements.generateBtn.disabled = false;
        }
        ConversionUtils.clearMessage(elements.messageArea);
        return true;
    }

    function isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch {
            return false;
        }
    }

    async function generateQR() {
        const text = elements.textInput.value.trim();
        
        if (!text) {
            ConversionUtils.showError(elements.messageArea, ConversionUtils.MESSAGES.ERROR.noText);
            return;
        }

        if (text.length > MAX_TEXT_LENGTH) {
            ConversionUtils.showError(elements.messageArea, ConversionUtils.MESSAGES.ERROR.qrTooLong);
            return;
        }

        try {
            await waitForQRCode();

            // Obtener opciones
            const sizeKey = elements.sizeSelect ? elements.sizeSelect.value : 'medium';
            const size = SIZE_OPTIONS[sizeKey] || SIZE_OPTIONS.medium;
            const fgColor = elements.fgColorInput ? elements.fgColorInput.value : '#000000';
            const bgColor = elements.bgColorInput ? elements.bgColorInput.value : '#ffffff';

            // Verificar contraste
            if (!hasGoodContrast(fgColor, bgColor)) {
                ConversionUtils.showInfo(elements.messageArea, 
                    '⚠️ El contraste entre colores es bajo. El QR podría no escanearse bien.');
            }

            // Limpiar QR anterior
            if (elements.qrResult) {
                elements.qrResult.innerHTML = '';
            }

            // Generar nuevo QR
            qrCode = new QRCode(elements.qrResult, {
                text: text,
                width: size,
                height: size,
                colorDark: fgColor,
                colorLight: bgColor,
                correctLevel: QRCode.CorrectLevel.M
            });

            if (elements.qrContainer) {
                elements.qrContainer.style.display = 'block';
            }

            // Mostrar botones
            if (elements.downloadBtn) {
                elements.downloadBtn.style.display = 'inline-flex';
            }
            if (elements.resetBtn) {
                elements.resetBtn.style.display = 'inline-flex';
            }

            // Validar URL si aplica
            if (isValidUrl(text)) {
                ConversionUtils.showSuccess(elements.messageArea, 
                    '✓ QR generado correctamente. Contiene una URL válida.');
            } else {
                ConversionUtils.showSuccess(elements.messageArea, 
                    '✓ QR generado correctamente.');
            }

        } catch (error) {
            console.error('Error al generar QR:', error);
            ConversionUtils.showError(elements.messageArea, ConversionUtils.MESSAGES.ERROR.conversionError);
        }
    }

    function hasGoodContrast(color1, color2) {
        const lum1 = getLuminance(color1);
        const lum2 = getLuminance(color2);
        const ratio = (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);
        return ratio >= 4.5; // WCAG AA standard
    }

    function getLuminance(hex) {
        const rgb = hexToRgb(hex);
        const a = [rgb.r, rgb.g, rgb.b].map(v => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    }

    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    function downloadQR() {
        if (!elements.qrResult) return;

        const canvas = elements.qrResult.querySelector('canvas');
        const img = elements.qrResult.querySelector('img');

        if (canvas) {
            canvas.toBlob((blob) => {
                ConversionUtils.downloadBlob(blob, 'qr-code.png');
            }, 'image/png');
        } else if (img) {
            // Fallback: crear canvas desde imagen
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = img.width;
            tempCanvas.height = img.height;
            const ctx = tempCanvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            tempCanvas.toBlob((blob) => {
                ConversionUtils.downloadBlob(blob, 'qr-code.png');
            }, 'image/png');
        }
    }

    function reset() {
        qrCode = null;
        ConversionUtils.revokeAllTempURLs();

        if (elements.textInput) elements.textInput.value = '';
        if (elements.qrResult) elements.qrResult.innerHTML = '';
        if (elements.qrContainer) elements.qrContainer.style.display = 'none';
        if (elements.downloadBtn) elements.downloadBtn.style.display = 'none';
        if (elements.resetBtn) elements.resetBtn.style.display = 'none';
        if (elements.charCount) {
            elements.charCount.textContent = `0 / ${MAX_TEXT_LENGTH}`;
            elements.charCount.classList.remove('over-limit');
        }
        if (elements.generateBtn) elements.generateBtn.disabled = true;

        // Resetear colores a defecto
        if (elements.fgColorInput) elements.fgColorInput.value = '#000000';
        if (elements.bgColorInput) elements.bgColorInput.value = '#ffffff';
        if (elements.sizeSelect) elements.sizeSelect.value = 'medium';

        showPrivacyMessage();
    }

    function waitForQRCode() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50;
            
            const check = () => {
                if (typeof QRCode !== 'undefined') {
                    resolve();
                } else if (attempts >= maxAttempts) {
                    reject(new Error('QRCode.js no se pudo cargar'));
                } else {
                    attempts++;
                    setTimeout(check, 100);
                }
            };
            
            check();
        });
    }

    return { init };
})();
