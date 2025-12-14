/**
 * Conversor CSV ↔ JSON (Bidireccional)
 * Convierte datos entre formatos CSV y JSON
 * Usa PapaParse para parsing robusto de CSV
 */

const CsvJsonConverter = (function() {
    'use strict';

    let currentFile = null;
    let currentData = null;
    let currentMode = null; // 'csv' o 'json'
    let originalFileName = '';
    let elements = {};

    function init() {
        // Cargar PapaParse
        loadPapaParse();

        elements = {
            dropZone: document.getElementById('drop-zone'),
            fileInput: document.getElementById('file-input'),
            selectBtn: document.getElementById('select-btn'),
            textInput: document.getElementById('text-input'),
            previewContainer: document.getElementById('preview-container'),
            inputPreview: document.getElementById('input-preview'),
            outputPreview: document.getElementById('output-preview'),
            tablePreview: document.getElementById('table-preview'),
            headerOption: document.getElementById('header-option'),
            convertBtn: document.getElementById('convert-btn'),
            copyBtn: document.getElementById('copy-btn'),
            downloadBtn: document.getElementById('download-btn'),
            resetBtn: document.getElementById('reset-btn'),
            messageArea: document.getElementById('message-area'),
            loader: document.getElementById('loader'),
            modeIndicator: document.getElementById('mode-indicator'),
            inputInfo: document.getElementById('input-info')
        };

        setupEventListeners();
        showPrivacyMessage();
    }

    function loadPapaParse() {
        if (typeof Papa === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js';
            script.async = true;
            document.head.appendChild(script);
        }
    }

    function setupEventListeners() {
        // 1. PRIMERO: Configurar el Input (Listeners y Validación)
        if (elements.fileInput) {
            // setupFileInputListener no clona, solo asigna listeners
            ConversionUtils.setupFileInputListener(elements.fileInput, handleFile);
        }

        // 2. SEGUNDO: Botón de selección
        if (elements.selectBtn) {
            elements.selectBtn.onclick = () => {
                const activeInput = document.getElementById('file-input');
                if (activeInput) activeInput.click();
            };
        }

        // 3. TERCERO: Drag and drop
        if (elements.dropZone) {
            ConversionUtils.initDragAndDrop(elements.dropZone, handleFile);
            elements.dropZone.onclick = () => {
                const activeInput = document.getElementById('file-input');
                if (activeInput) activeInput.click();
            };
        }

        if (elements.textInput) {
            elements.textInput.addEventListener('input', ConversionUtils.debounce(() => {
                handleTextInput();
            }, 500));
        }

        if (elements.convertBtn) {
            elements.convertBtn.addEventListener('click', convert);
        }

        if (elements.copyBtn) {
            elements.copyBtn.addEventListener('click', copyResult);
        }

        if (elements.downloadBtn) {
            elements.downloadBtn.addEventListener('click', downloadResult);
        }

        if (elements.resetBtn) {
            elements.resetBtn.addEventListener('click', reset);
        }

        if (elements.headerOption) {
            elements.headerOption.addEventListener('change', () => {
                if (currentData && currentMode === 'csv') {
                    convert();
                }
            });
        }
    }

    function showPrivacyMessage() {
        if (elements.messageArea) {
            ConversionUtils.showInfo(elements.messageArea, ConversionUtils.MESSAGES.INFO.privacy);
        }
    }

    async function handleFile(file) {
        // --- DIAGNÓSTICO PARA IOS ---
        alert(`Archivo recibido:\nNombre: ${file.name}\nTipo: ${file.type || 'VACÍO'}\nTamaño: ${file.size}`);

        // 1. VALIDACIÓN INTELIGENTE (Permisiva)
        // Detectar tipo de archivo usando extensión como fallback
        let isCSV = false;
        let isJSON = false;

        const fileName = file.name.toLowerCase();
        
        if (file.type === 'text/csv' || fileName.endsWith('.csv')) {
            isCSV = true;
        }
        else if (file.type === 'application/json' || fileName.endsWith('.json')) {
            isJSON = true;
        }
        // FIX CRÍTICO iOS: Si el tipo viene vacío, usar la extensión como única verdad
        else if (!file.type) {
            if (fileName.endsWith('.csv')) {
                isCSV = true;
                console.log("Validado como CSV por extensión");
            } else if (fileName.endsWith('.json')) {
                isJSON = true;
                console.log("Validado como JSON por extensión");
            }
        }

        if (!isCSV && !isJSON) {
            alert(`Error de formato.\nEsperado: CSV o JSON\nRecibido: ${file.type || 'desconocido'}\nPor favor intenta con otro archivo.`);
            
            ConversionUtils.showError(elements.messageArea, 
                'Formato no soportado. Solo se aceptan archivos CSV o JSON.');
            if (elements.fileInput) ConversionUtils.resetFileInput(elements.fileInput);
            return;
        }

        // --- FIN DE LA VALIDACIÓN ---

        // Validar tamaño
        if (file.size > ConversionUtils.CONFIG.MAX_FILE_SIZE) {
            alert(`Archivo demasiado grande: ${ConversionUtils.formatFileSize(file.size)}\nMáximo permitido: ${ConversionUtils.formatFileSize(ConversionUtils.CONFIG.MAX_FILE_SIZE)}`);
            
            ConversionUtils.showError(elements.messageArea, ConversionUtils.MESSAGES.ERROR.fileTooLarge);
            if (elements.fileInput) ConversionUtils.resetFileInput(elements.fileInput);
            return;
        }

        currentFile = file;
        currentMode = isCSV ? 'csv' : 'json';
        originalFileName = ConversionUtils.getFileNameWithoutExtension(file.name);

        try {
            showLoader(true);
            ConversionUtils.clearMessage(elements.messageArea);

            const content = await ConversionUtils.readAsText(file);
            
            if (currentMode === 'csv') {
                processCSV(content);
            } else {
                processJSON(content);
            }

            showLoader(false);
        } catch (error) {
            showLoader(false);
            ConversionUtils.showError(elements.messageArea, ConversionUtils.MESSAGES.ERROR.readError);
            // Resetear input para permitir reintentos
            if (elements.fileInput) {
                ConversionUtils.resetFileInput(elements.fileInput);
            }
        }
    }

    function handleTextInput() {
        const text = elements.textInput.value.trim();
        if (!text) return;

        // Detectar si es JSON o CSV
        try {
            JSON.parse(text);
            currentMode = 'json';
            processJSON(text);
        } catch {
            // Asumir CSV
            currentMode = 'csv';
            processCSV(text);
        }
    }

    async function processCSV(content) {
        try {
            await waitForPapaParse();

            const result = Papa.parse(content, {
                header: elements.headerOption ? elements.headerOption.checked : true,
                skipEmptyLines: true,
                dynamicTyping: true
            });

            if (result.errors.length > 0) {
                console.warn('Advertencias al parsear CSV:', result.errors);
            }

            currentData = {
                parsed: result.data,
                meta: result.meta,
                original: content
            };

            showInputPreview(content, 'CSV');
            updateModeIndicator('CSV → JSON');
            showControls();

            // Mostrar tabla de preview
            showTablePreview(result.data, result.meta.fields);

        } catch (error) {
            ConversionUtils.showError(elements.messageArea, ConversionUtils.MESSAGES.ERROR.csvParseError);
        }
    }

    function processJSON(content) {
        try {
            const parsed = JSON.parse(content);
            
            // Verificar que sea un array o convertible a array
            let dataArray;
            if (Array.isArray(parsed)) {
                dataArray = parsed;
            } else if (typeof parsed === 'object') {
                dataArray = [parsed];
            } else {
                throw new Error('El JSON debe ser un array u objeto');
            }

            currentData = {
                parsed: dataArray,
                original: content
            };

            showInputPreview(content, 'JSON');
            updateModeIndicator('JSON → CSV');
            showControls();

            // Mostrar preview del JSON formateado
            if (elements.inputPreview) {
                elements.inputPreview.textContent = JSON.stringify(parsed, null, 2);
            }

        } catch (error) {
            ConversionUtils.showError(elements.messageArea, ConversionUtils.MESSAGES.ERROR.jsonParseError);
        }
    }

    function showInputPreview(content, format) {
        if (elements.inputPreview) {
            // Mostrar solo primeras líneas
            const lines = content.split('\n');
            const preview = lines.slice(0, 20).join('\n');
            elements.inputPreview.textContent = preview + (lines.length > 20 ? '\n...' : '');
            elements.inputPreview.style.display = 'block';
        }

        if (elements.inputInfo) {
            const lines = content.split('\n').length;
            elements.inputInfo.innerHTML = `
                <p><strong>Formato:</strong> ${format}</p>
                <p><strong>Líneas:</strong> ${lines}</p>
                ${currentFile ? `<p><strong>Tamaño:</strong> ${ConversionUtils.formatFileSize(currentFile.size)}</p>` : ''}
            `;
        }

        if (elements.previewContainer) {
            elements.previewContainer.style.display = 'block';
        }
    }

    function showTablePreview(data, fields) {
        if (!elements.tablePreview || !data.length) return;

        const maxRows = 10;
        const rows = data.slice(0, maxRows);
        const headers = fields || Object.keys(rows[0] || {});

        let html = '<table class="preview-table"><thead><tr>';
        headers.forEach(h => {
            html += `<th>${escapeHtml(String(h))}</th>`;
        });
        html += '</tr></thead><tbody>';

        rows.forEach(row => {
            html += '<tr>';
            if (Array.isArray(row)) {
                row.forEach(cell => {
                    html += `<td>${escapeHtml(String(cell ?? ''))}</td>`;
                });
            } else {
                headers.forEach(h => {
                    html += `<td>${escapeHtml(String(row[h] ?? ''))}</td>`;
                });
            }
            html += '</tr>';
        });

        if (data.length > maxRows) {
            html += `<tr><td colspan="${headers.length}" class="more-rows">... y ${data.length - maxRows} filas más</td></tr>`;
        }

        html += '</tbody></table>';
        elements.tablePreview.innerHTML = html;
        elements.tablePreview.style.display = 'block';
    }

    function updateModeIndicator(text) {
        if (elements.modeIndicator) {
            elements.modeIndicator.textContent = text;
            elements.modeIndicator.style.display = 'inline-block';
        }
    }

    function showControls() {
        if (elements.convertBtn) {
            elements.convertBtn.style.display = 'inline-flex';
            elements.convertBtn.textContent = currentMode === 'csv' ? 'Convertir a JSON' : 'Convertir a CSV';
        }
        if (elements.resetBtn) {
            elements.resetBtn.style.display = 'inline-flex';
        }
        // Mostrar opción de cabecera solo para CSV
        if (elements.headerOption) {
            elements.headerOption.parentElement.style.display = currentMode === 'csv' ? 'block' : 'none';
        }
    }

    function convert() {
        if (!currentData) {
            ConversionUtils.showError(elements.messageArea, ConversionUtils.MESSAGES.ERROR.noFile);
            return;
        }

        try {
            showLoader(true);
            
            let result;
            if (currentMode === 'csv') {
                // CSV → JSON
                result = JSON.stringify(currentData.parsed, null, 2);
            } else {
                // JSON → CSV
                result = convertJsonToCsv(currentData.parsed);
            }

            showOutput(result);
            showLoader(false);
            ConversionUtils.showSuccess(elements.messageArea, ConversionUtils.MESSAGES.SUCCESS.conversion);

        } catch (error) {
            showLoader(false);
            ConversionUtils.showError(elements.messageArea, ConversionUtils.MESSAGES.ERROR.conversionError);
        }
    }

    function convertJsonToCsv(data) {
        if (!data.length) return '';

        // Obtener todas las claves únicas
        const allKeys = new Set();
        data.forEach(item => {
            if (typeof item === 'object' && item !== null) {
                Object.keys(item).forEach(key => allKeys.add(key));
            }
        });

        const keys = Array.from(allKeys);
        
        // Usar PapaParse para generar CSV
        if (typeof Papa !== 'undefined') {
            return Papa.unparse(data, {
                columns: keys
            });
        }

        // Fallback manual
        const header = keys.map(k => escapeCsvField(k)).join(',');
        const rows = data.map(item => {
            return keys.map(key => {
                const value = item[key];
                return escapeCsvField(value);
            }).join(',');
        });

        return [header, ...rows].join('\n');
    }

    function escapeCsvField(value) {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }

    function showOutput(result) {
        if (elements.outputPreview) {
            elements.outputPreview.textContent = result;
            elements.outputPreview.style.display = 'block';
        }

        // Guardar resultado para descarga
        if (elements.downloadBtn) {
            elements.downloadBtn.result = result;
            elements.downloadBtn.style.display = 'inline-flex';
        }
        if (elements.copyBtn) {
            elements.copyBtn.result = result;
            elements.copyBtn.style.display = 'inline-flex';
        }
    }

    async function copyResult() {
        if (!elements.copyBtn.result) return;
        
        const success = await ConversionUtils.copyToClipboard(elements.copyBtn.result);
        if (success) {
            ConversionUtils.showSuccess(elements.messageArea, ConversionUtils.MESSAGES.SUCCESS.copy);
        }
    }

    function downloadResult() {
        if (!elements.downloadBtn.result) return;
        
        const isJson = currentMode === 'csv';
        const ext = isJson ? '.json' : '.csv';
        const mimeType = isJson ? 'application/json' : 'text/csv';
        const filename = originalFileName + ext;
        
        ConversionUtils.downloadText(elements.downloadBtn.result, filename, mimeType);
    }

    function reset() {
        currentFile = null;
        currentData = null;
        currentMode = null;
        originalFileName = '';

        ConversionUtils.revokeAllTempURLs();
        if (elements.fileInput) ConversionUtils.resetFileInput(elements.fileInput);
        if (elements.textInput) elements.textInput.value = '';
        if (elements.inputPreview) {
            elements.inputPreview.textContent = '';
            elements.inputPreview.style.display = 'none';
        }
        if (elements.outputPreview) {
            elements.outputPreview.textContent = '';
            elements.outputPreview.style.display = 'none';
        }
        if (elements.tablePreview) {
            elements.tablePreview.innerHTML = '';
            elements.tablePreview.style.display = 'none';
        }
        if (elements.inputInfo) elements.inputInfo.innerHTML = '';
        if (elements.previewContainer) elements.previewContainer.style.display = 'none';
        if (elements.modeIndicator) {
            elements.modeIndicator.textContent = '';
            elements.modeIndicator.style.display = 'none';
        }
        if (elements.convertBtn) elements.convertBtn.style.display = 'none';
        if (elements.copyBtn) {
            elements.copyBtn.style.display = 'none';
            elements.copyBtn.result = null;
        }
        if (elements.downloadBtn) {
            elements.downloadBtn.style.display = 'none';
            elements.downloadBtn.result = null;
        }
        if (elements.resetBtn) elements.resetBtn.style.display = 'none';
        if (elements.headerOption) {
            elements.headerOption.checked = true;
            elements.headerOption.parentElement.style.display = 'none';
        }

        showPrivacyMessage();
    }

    function showLoader(show) {
        if (elements.loader) {
            elements.loader.style.display = show ? 'flex' : 'none';
        }
    }

    function waitForPapaParse() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50;
            
            const check = () => {
                if (typeof Papa !== 'undefined') {
                    resolve();
                } else if (attempts >= maxAttempts) {
                    reject(new Error('PapaParse no se pudo cargar'));
                } else {
                    attempts++;
                    setTimeout(check, 100);
                }
            };
            
            check();
        });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    return { init };
})();
