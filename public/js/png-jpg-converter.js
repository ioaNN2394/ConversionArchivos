class PngJpgConverter {
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

        // CORRECCIÓN BUG 1: Validación más flexible (Tipo O Extensión)
        // Algunos navegadores no envían el type al arrastrar, así que validamos también la extensión
        const isValidType = file.type.includes('image/png');
        const isValidExt = file.name.toLowerCase().endsWith('.png');

        if (!isValidType && !isValidExt) {
            this.showMessage('Por favor selecciona un archivo PNG válido.', 'error');
            return;
        }

        // Validar tamaño
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            this.showMessage('El archivo excede el tamaño máximo de 10 MB.', 'error');
            return;
        }

        this.selectedFile = file;
        this.showMessage('', ''); // Limpiar mensajes

        // Mostrar contenedor de previews
        this.previewContainer.style.display = 'block';

        // CORRECCIÓN BUG 2: Mostrar controles de calidad (Sliders) que faltaban
        const controls = document.querySelectorAll('.control-group');
        controls.forEach(control => control.style.display = 'flex');

        // CORRECCIÓN BUG 2: Mostrar botones de acción asegurando el display flex con prioridad
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

        // Habilitar botón convertir
        this.convertBtn.disabled = false;
        this.convertBtn.textContent = 'Convertir a JPG';

        // Ocultar resultado anterior
        this.resultPreview.style.display = 'none';
        this.resultInfo.textContent = '';
        this.downloadBtn.disabled = true;
    }

    static async convertFile() {
        if (!this.selectedFile) return;

        this.showLoading(true);
        this.convertBtn.disabled = true;

        try {
            const result = await this.convertPNGtoJPG(this.selectedFile, 0.95);
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
            this.downloadBtn.textContent = 'Descargar JPG';

            this.showMessage('Conversión completada exitosamente.', 'success');

        } catch (error) {
            console.error('Error:', error);
            this.showMessage('Error en la conversión: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
            this.convertBtn.disabled = false;
        }
    }

    static convertPNGtoJPG(file, quality = 0.95) {
        return new Promise((resolve, reject) => {
            // Validación robusta: Tipo O Extensión (png)
            const isValidType = file.type.includes('image/png');
            const isValidExt = file.name.toLowerCase().endsWith('.png');

            if (!isValidType && !isValidExt) {
                reject(new Error('El archivo no es un PNG válido'));
                return;
            }

            // Leer el archivo PNG
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
                        
                        // Llenar fondo blanco (PNG puede tener transparencia)
                        ctx.fillStyle = '#FFFFFF';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        
                        // Dibujar imagen sobre fondo blanco
                        ctx.drawImage(img, 0, 0);
                        
                        // Convertir a JPG (JPEG)
                        canvas.toBlob(
                            function(blob) {
                                resolve({
                                    blob: blob,
                                    filename: file.name.replace('.png', '.jpg')
                                });
                            },
                            'image/jpeg',
                            quality // 0.95 = 95% calidad
                        );
                    } catch (error) {
                        reject(new Error('Error durante la conversión: ' + error.message));
                    }
                };
                
                img.onerror = function() {
                    reject(new Error('No se pudo cargar la imagen PNG'));
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

        const filename = this.selectedFile.name.replace('.png', '.jpg');
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
        
        // Ocultar controles de calidad
        const controls = document.querySelectorAll('.control-group');
        controls.forEach(control => control.style.display = 'none');
        
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