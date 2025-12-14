class JpgPngConverter {
    static init(type) {
        this.type = type;
        this.selectedFile = null;
        this.convertedBlob = null;

        // Elementos del DOM
        this.dropZone = document.getElementById('drop-zone');
        this.fileInput = document.getElementById('file-input');
        this.convertBtn = document.getElementById('convert-btn');
        this.downloadBtn = document.getElementById('download-btn');
        this.resetBtn = document.getElementById('reset-btn');
        this.loader = document.getElementById('loader');
        this.messageArea = document.getElementById('message-area');
        this.previewContainer = document.getElementById('preview-container');
        this.originalPreview = document.getElementById('original-preview');
        this.resultPreview = document.getElementById('result-preview');
        this.originalInfo = document.getElementById('original-info');
        this.resultInfo = document.getElementById('result-info');

        this.setupEventListeners();
        this.resetUI();
    }

    static setupEventListeners() {
        // Click en zona de arrastre
        if (this.dropZone) {
            this.dropZone.addEventListener('click', () => {
                this.fileInput.click();
            });
        }

        // Cambio de archivo en input
        if (this.fileInput) {
            this.fileInput.addEventListener('change', (e) => {
                this.handleFileSelection(e.target.files[0]);
            });
        }

        // Arrastrar y soltar archivos
        if (this.dropZone) {
            this.dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.dropZone.style.backgroundColor = '#e0e0e0';
            });

            this.dropZone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.dropZone.style.backgroundColor = '';
            });

            this.dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.dropZone.style.backgroundColor = '';
                
                if (e.dataTransfer.files.length > 0) {
                    this.handleFileSelection(e.dataTransfer.files[0]);
                }
            });
        }

        // Botón convertir
        if (this.convertBtn) {
            this.convertBtn.addEventListener('click', () => {
                if (this.selectedFile) {
                    this.convertFile();
                }
            });
        }

        // Botón descargar
        if (this.downloadBtn) {
            this.downloadBtn.addEventListener('click', () => {
                if (this.convertedBlob && this.selectedFile) {
                    this.downloadFile();
                }
            });
        }

        // Botón reset
        if (this.resetBtn) {
            this.resetBtn.addEventListener('click', () => {
                this.resetUI();
            });
        }
    }

    static handleFileSelection(file) {
        if (!file) return;

        // Validación robusta: Tipo O Extensión (jpg o jpeg)
        const isValidType = file.type.includes('image/jpeg');
        const isValidExt = file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg');

        if (!isValidType && !isValidExt) {
            this.showMessage('Por favor selecciona un archivo JPG/JPEG válido.', 'error');
            return;
        }

        // Validar tamaño
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            this.showMessage('El archivo excede el tamaño máximo de 10 MB.', 'error');
            return;
        }

        this.selectedFile = file;
        this.showMessage('', '');

        // Mostrar contenedor de previews
        this.previewContainer.style.display = 'block';

        // Mostrar botones de acción con prioridad
        const actionButtons = document.querySelector('.action-buttons');
        if (actionButtons) {
            actionButtons.style.setProperty('display', 'flex', 'important');
        }

        // Mostrar preview original
        const reader = new FileReader();
        reader.onload = (e) => {
            this.originalPreview.src = e.target.result;
            this.originalPreview.style.display = 'block';
            this.originalInfo.textContent = `Tamaño: ${(file.size / 1024 / 1024).toFixed(2)} MB`;
        };
        reader.readAsDataURL(file);

        this.convertBtn.disabled = false;
        this.convertBtn.textContent = 'Convertir a PNG';

        this.resultPreview.style.display = 'none';
        this.resultInfo.textContent = '';
        this.downloadBtn.disabled = true;
    }

    static async convertFile() {
        if (!this.selectedFile) return;

        this.showLoading(true);
        this.convertBtn.disabled = true;

        try {
            const result = await this.convertJPGtoPNG(this.selectedFile);
            this.convertedBlob = result.blob;

            // Mostrar preview resultado
            const url = URL.createObjectURL(result.blob);
            this.resultPreview.src = url;
            this.resultPreview.style.display = 'block';

            // Mostrar info
            const originalSize = this.selectedFile.size;
            const compressedSize = result.blob.size;
            const reduction = (((originalSize - compressedSize) / originalSize) * 100).toFixed(1);
            this.resultInfo.textContent = `Tamaño: ${(compressedSize / 1024 / 1024).toFixed(2)} MB (${reduction}% reducción)`;

            // Habilitar descarga
            this.downloadBtn.disabled = false;
            this.downloadBtn.textContent = 'Descargar PNG';

            this.showMessage('Conversión completada exitosamente.', 'success');

        } catch (error) {
            console.error('Error:', error);
            this.showMessage('Error en la conversión: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
            this.convertBtn.disabled = false;
        }
    }

    static convertJPGtoPNG(file) {
        return new Promise((resolve, reject) => {
            // Validación robusta: Tipo O Extensión (jpg o jpeg)
            const isValidType = file.type.includes('image/jpeg');
            const isValidExt = file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg');

            if (!isValidType && !isValidExt) {
                reject(new Error('El archivo no es un JPG válido'));
                return;
            }

            // Leer el archivo JPG
            const reader = new FileReader();
            
            reader.onload = function(event) {
                const img = new Image();
                
                img.onload = function() {
                    try {
                        // Crear canvas
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        
                        const ctx = canvas.getContext('2d');
                        
                        // Dibujar imagen sin fondo (PNG soporta transparencia)
                        ctx.drawImage(img, 0, 0);
                        
                        // Convertir a PNG
                        canvas.toBlob(
                            function(blob) {
                                resolve({
                                    blob: blob,
                                    filename: file.name.replace('.jpg', '.png').replace('.jpeg', '.png')
                                });
                            },
                            'image/png'
                        );
                    } catch (error) {
                        reject(new Error('Error durante la conversión: ' + error.message));
                    }
                };
                
                img.onerror = function() {
                    reject(new Error('No se pudo cargar la imagen JPG'));
                };
                
                // Establecer origen para CORS
                img.crossOrigin = 'anonymous';
                img.src = event.target.result;
            };
            
            reader.onerror = function() {
                reject(new Error('Error al leer el archivo'));
            };
            
            reader.readAsDataURL(file);
        });
    }

    static downloadFile() {
        if (!this.convertedBlob || !this.selectedFile) return;

        const filename = this.selectedFile.name.replace('.jpg', '.png').replace('.jpeg', '.png');
        const url = URL.createObjectURL(this.convertedBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    static resetUI() {
        this.selectedFile = null;
        this.convertedBlob = null;
        this.fileInput.value = '';
        this.previewContainer.style.display = 'none';
        this.originalPreview.style.display = 'none';
        this.resultPreview.style.display = 'none';
        this.originalInfo.textContent = '';
        this.resultInfo.textContent = '';
        this.convertBtn.disabled = true;
        this.downloadBtn.disabled = true;
        this.showMessage('', '');
        this.showLoading(false);
        
        // Ocultar botones de acción
        const actionButtons = document.querySelector('.action-buttons');
        if (actionButtons) {
            actionButtons.style.display = 'none';
        }
    }

    static showLoading(isLoading) {
        if (this.loader) {
            this.loader.style.display = isLoading ? 'block' : 'none';
        }
    }

    static showMessage(message, type) {
        if (this.messageArea) {
            this.messageArea.textContent = message;
            this.messageArea.className = 'message-area';
            if (type) {
                this.messageArea.classList.add('message', `message--${type}`);
            }
        }
    }
}
