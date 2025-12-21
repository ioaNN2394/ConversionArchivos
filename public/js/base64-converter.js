/**
 * Base64 Encoder/Decoder (Bidireccional)
 * Codifica y decodifica texto a/desde Base64
 * Soporta UTF-8 e i18n
 */

const Base64Converter = (function () {
    'use strict';

    let elements = {};

    // Helper para obtener traducciones
    function t(key, fallback) {
        return ConversionUtils.t(key, fallback);
    }

    function init() {
        elements = {
            inputText: document.getElementById('input-text'),
            outputText: document.getElementById('output-text'),
            encodeBtn: document.getElementById('encode-btn'),
            decodeBtn: document.getElementById('decode-btn'),
            copyBtn: document.getElementById('copy-btn'),
            clearBtn: document.getElementById('clear-btn'),
            swapBtn: document.getElementById('swap-btn'),
            messageArea: document.getElementById('message-area'),
            inputCharCount: document.getElementById('input-char-count'),
            outputCharCount: document.getElementById('output-char-count')
        };

        setupEventListeners();
        showPrivacyMessage();
    }

    function setupEventListeners() {
        if (elements.encodeBtn) {
            elements.encodeBtn.addEventListener('click', encode);
        }

        if (elements.decodeBtn) {
            elements.decodeBtn.addEventListener('click', decode);
        }

        if (elements.copyBtn) {
            elements.copyBtn.addEventListener('click', copyOutput);
        }

        if (elements.clearBtn) {
            elements.clearBtn.addEventListener('click', clear);
        }

        if (elements.swapBtn) {
            elements.swapBtn.addEventListener('click', swapTexts);
        }

        if (elements.inputText) {
            elements.inputText.addEventListener('input', updateInputCount);
        }

        if (elements.outputText) {
            elements.outputText.addEventListener('input', updateOutputCount);
        }
    }

    function showPrivacyMessage() {
        if (elements.messageArea) {
            ConversionUtils.showInfo(elements.messageArea, ConversionUtils.MESSAGES.INFO.privacy);
        }
    }

    function getCharactersLabel() {
        return t('common.labels.characters', 'caracteres');
    }

    function updateInputCount() {
        if (elements.inputCharCount && elements.inputText) {
            elements.inputCharCount.textContent = `${elements.inputText.value.length} ${getCharactersLabel()}`;
        }
    }

    function updateOutputCount() {
        if (elements.outputCharCount && elements.outputText) {
            elements.outputCharCount.textContent = `${elements.outputText.value.length} ${getCharactersLabel()}`;
        }
    }

    /**
     * Codifica texto a Base64 (soporta UTF-8)
     */
    function encode() {
        const input = elements.inputText ? elements.inputText.value : '';

        if (!input.trim()) {
            ConversionUtils.showError(elements.messageArea, ConversionUtils.MESSAGES.ERROR.noText);
            return;
        }

        try {
            // Codificar UTF-8 correctamente
            const utf8Bytes = new TextEncoder().encode(input);
            const binaryString = Array.from(utf8Bytes)
                .map(byte => String.fromCharCode(byte))
                .join('');
            const base64 = btoa(binaryString);

            if (elements.outputText) {
                elements.outputText.value = base64;
                updateOutputCount();
            }

            ConversionUtils.showSuccess(elements.messageArea,
                t('common.messages.encoded_success', '✓ Texto codificado a Base64 correctamente.'));

        } catch (error) {
            console.error('Error al codificar:', error);
            ConversionUtils.showError(elements.messageArea, ConversionUtils.MESSAGES.ERROR.conversionError);
        }
    }

    /**
     * Decodifica Base64 a texto (soporta UTF-8)
     */
    function decode() {
        const input = elements.inputText ? elements.inputText.value.trim() : '';

        if (!input) {
            ConversionUtils.showError(elements.messageArea, ConversionUtils.MESSAGES.ERROR.noText);
            return;
        }

        // Validar que sea Base64 válido
        if (!isValidBase64(input)) {
            ConversionUtils.showError(elements.messageArea, ConversionUtils.MESSAGES.ERROR.invalidBase64);
            return;
        }

        try {
            // Decodificar Base64 a bytes
            const binaryString = atob(input);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // Decodificar UTF-8
            const text = new TextDecoder('utf-8').decode(bytes);

            if (elements.outputText) {
                elements.outputText.value = text;
                updateOutputCount();
            }

            ConversionUtils.showSuccess(elements.messageArea,
                t('common.messages.decoded_success', '✓ Base64 decodificado correctamente.'));

        } catch (error) {
            console.error('Error al decodificar:', error);
            ConversionUtils.showError(elements.messageArea, ConversionUtils.MESSAGES.ERROR.invalidBase64);
        }
    }

    /**
     * Valida si una cadena es Base64 válida
     */
    function isValidBase64(str) {
        if (!str || str.length === 0) return false;

        // Remover espacios en blanco
        str = str.replace(/\s/g, '');

        // Verificar caracteres válidos y longitud
        const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
        if (!base64Regex.test(str)) return false;

        // La longitud debe ser múltiplo de 4
        if (str.length % 4 !== 0) return false;

        try {
            atob(str);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Copia el resultado al portapapeles
     */
    async function copyOutput() {
        const output = elements.outputText ? elements.outputText.value : '';

        if (!output.trim()) {
            ConversionUtils.showError(elements.messageArea,
                t('common.messages.no_copy_text', 'No hay texto para copiar.'));
            return;
        }

        const success = await ConversionUtils.copyToClipboard(output);
        if (success) {
            ConversionUtils.showSuccess(elements.messageArea, ConversionUtils.MESSAGES.SUCCESS.copy);
        } else {
            ConversionUtils.showError(elements.messageArea,
                t('common.messages.copy_failed', 'No se pudo copiar al portapapeles.'));
        }
    }

    /**
     * Intercambia entrada y salida
     */
    function swapTexts() {
        if (!elements.inputText || !elements.outputText) return;

        const temp = elements.inputText.value;
        elements.inputText.value = elements.outputText.value;
        elements.outputText.value = temp;

        updateInputCount();
        updateOutputCount();

        ConversionUtils.showInfo(elements.messageArea,
            t('common.messages.swapped', 'Textos intercambiados.'));
    }

    /**
     * Limpia ambos campos
     */
    function clear() {
        ConversionUtils.revokeAllTempURLs();
        if (elements.inputText) {
            elements.inputText.value = '';
        }
        if (elements.outputText) {
            elements.outputText.value = '';
        }

        updateInputCount();
        updateOutputCount();
        showPrivacyMessage();
    }

    return { init };
})();
