class JpgCompressor {
    static init() {
        // Estado de la aplicación
        this.selectedFile = null;
        this.compressedBlob = null;
        this.originalImage = null; // Guardamos la imagen cargada para re-comprimir rápido

        // Referencias al DOM
        this.dropZone = document.getElementById('drop-zone');
        this.fileInput = document.getElementById('file-input');
        this.loader = document.getElementById('loader');
        this.messageArea = document.getElementById('message-area');
        
        // Controles y visualización
        this.qualityControl = document.getElementById('quality-control');
        this.qualitySlider = document.getElementById('quality-slider');
        this.qualityValue = document.getElementById('quality-value');
        this.previewContainer = document.getElementById('preview-container');
        this.originalPreview = document.getElementById('original-preview');
        this.resultPreview = document.getElementById('result-preview');
        this.originalInfo = document.getElementById('original-info');
        this.resultInfo = document.getElementById('result-info');
        this.sizeComparison = document.getElementById('size-comparison');

        // Botones
        this.actionButtons = document.querySelector('.action-buttons');
        this.compressBtn = document.getElementById('compress-btn');
        this.downloadBtn = document.getElementById('download-btn');
        this.resetBtn = document.getElementById('reset-btn');

        this.setupEventListeners();
        this.resetUI();
    }

    static setupEventListeners() {
        // 1. Selector de archivos
        if (this.dropZone) {
            this.dropZone.addEventListener('click', () => this.fileInput.click());
            
            // Drag & Drop visual feedback
            this.dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                this.dropZone.classList.add('drag-over');
            });
            
            this.dropZone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                this.dropZone.classList.remove('drag-over');
            });

            this.dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                this.dropZone.classList.remove('drag-over');
                if (e.dataTransfer.files.length > 0) {
                    this.handleFileSelection(e.dataTransfer.files[0]);
                }
            });
        }

        if (this.fileInput) {
            this.fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleFileSelection(e.target.files[0]);
                }
            });
        }

        // 2. Slider de Calidad
        if (this.qualitySlider) {
            // Actualizar texto mientras se arrastra
            this.qualitySlider.addEventListener('input', (e) => {
                this.qualityValue.textContent = `${e.target.value}%`;
            });

            // Re-comprimir al soltar el slider (para no saturar el móvil)
            this.qualitySlider.addEventListener('change', () => {
                if (this.selectedFile) {
                    this.processCompression();
                }
            });
        }

        // 3. Botones de Acción
        if (this.compressBtn) {
            this.compressBtn.addEventListener('click', () => {
                if (this.selectedFile) this.processCompression();
            });
        }

        if (this.downloadBtn) {
            this.downloadBtn.addEventListener('click', () => this.downloadFile());
        }

        if (this.resetBtn) {
            this.resetBtn.addEventListener('click', () => this.resetUI());
        }
    }

    static handleFileSelection(file) {
        if (!file) return;

        // Validación: Aceptamos imágenes genéricas, pero preferiblemente JPG/PNG
        if (!file.type.match(/image.*/)) {
            this.showMessage('Por favor selecciona un archivo de imagen válido.', 'error');
            return;
        }

        if (file.size > 20 * 1024 * 1024) { // Límite 20MB
            this.showMessage('El archivo es demasiado grande (Máx 20MB).', 'error');
            return;
        }

        this.selectedFile = file;
        this.showMessage('', ''); // Limpiar errores

        // Preparar UI
        this.previewContainer.style.display = 'block';
        if (this.qualityControl) this.qualityControl.style.display = 'flex'; // Importante: FLEX
        if (this.actionButtons) this.actionButtons.style.display = 'flex';
        this.dropZone.style.display = 'none'; // Ocultar zona de carga para dar espacio
        
        // Resetear estados
        this.downloadBtn.disabled = true;
        this.resultPreview.style.opacity = '0.5';

        // Leer archivo
        const reader = new FileReader();
        reader.onload = (e) => {
            // Crear objeto imagen
            this.originalImage = new Image();
            this.originalImage.onload = () => {
                // Mostrar preview original
                this.originalPreview.src = this.originalImage.src;
                this.originalPreview.style.display = 'block';
                this.originalInfo.textContent = `Original: ${this.formatBytes(file.size)}`;
                
                // Ejecutar primera compresión automática
                this.processCompression();
            };
            this.originalImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    static async processCompression() {
        if (!this.originalImage) return;

        this.showLoading(true);
        this.compressBtn.disabled = true;

        try {
            // Obtener calidad del slider (0.1 a 1.0)
            const quality = parseInt(this.qualitySlider.value) / 100;

            const result = await this.compressToJpg(this.originalImage, quality);
            this.compressedBlob = result;

            // Actualizar preview resultado
            const url = URL.createObjectURL(result);
            this.resultPreview.src = url;
            this.resultPreview.style.display = 'block';
            this.resultPreview.style.opacity = '1';

            // Calcular ahorro
            const savedBytes = this.selectedFile.size - result.size;
            const savedPercent = ((savedBytes / this.selectedFile.size) * 100).toFixed(1);
            
            // Mostrar info
            this.resultInfo.innerHTML = `
                Peso: <strong>${this.formatBytes(result.size)}</strong><br>
                <span style="color: var(--color-success)">Ahorro: -${savedPercent}%</span>
            `;

            this.downloadBtn.disabled = false;
            this.showMessage('Imagen comprimida correctamente.', 'success');

        } catch (error) {
            console.error(error);
            this.showMessage('Error al comprimir: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
            this.compressBtn.disabled = false;
        }
    }

    static compressToJpg(img, quality) {
        return new Promise((resolve, reject) => {
            try {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Optimización para móviles: Si la imagen es gigante (>4K), reducirla un poco
                // para evitar crash de memoria en iOS/Android viejos
                const MAX_DIMENSION = 4096;
                if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                    if (width > height) {
                        height *= MAX_DIMENSION / width;
                        width = MAX_DIMENSION;
                    } else {
                        width *= MAX_DIMENSION / height;
                        height = MAX_DIMENSION;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                
                // Fondo blanco por si viene de un PNG transparente
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, width, height);
                
                // Dibujar imagen
                ctx.drawImage(img, 0, 0, width, height);

                // Convertir a Blob JPG
                canvas.toBlob(
                    (blob) => {
                        if (blob) resolve(blob);
                        else reject(new Error('Fallo en la conversión del canvas'));
                    },
                    'image/jpeg',
                    quality
                );

            } catch (err) {
                reject(err);
            }
        });
    }

    static downloadFile() {
        if (!this.compressedBlob) return;

        // Generar nombre: original-min.jpg
        let fileName = this.selectedFile.name.split('.')[0];
        fileName += '-min.jpg';

        const url = URL.createObjectURL(this.compressedBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    static resetUI() {
        this.selectedFile = null;
        this.compressedBlob = null;
        this.originalImage = null;
        this.fileInput.value = '';
        
        // Restaurar visibilidad
        this.dropZone.style.display = 'block';
        this.previewContainer.style.display = 'none';
        
        // Ocultar controles usando display none
        if (this.qualityControl) this.qualityControl.style.display = 'none';
        if (this.actionButtons) this.actionButtons.style.display = 'none';

        // Resetear textos e imágenes
        this.originalPreview.src = '';
        this.resultPreview.src = '';
        this.originalInfo.textContent = '';
        this.resultInfo.textContent = '';
        this.qualitySlider.value = 80;
        this.qualityValue.textContent = '80%';
        
        this.showMessage('', '');
        this.showLoading(false);
    }

    static showLoading(isLoading) {
        if (this.loader) {
            this.loader.style.display = isLoading ? 'flex' : 'none';
        }
    }

    static showMessage(message, type) {
        if (this.messageArea) {
            this.messageArea.textContent = message;
            this.messageArea.className = 'message-area';
            if (type) {
                this.messageArea.classList.add('message', `message--${type}`);
                this.messageArea.style.display = 'block';
            } else {
                this.messageArea.style.display = 'none';
            }
        }
    }

    static formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
}
