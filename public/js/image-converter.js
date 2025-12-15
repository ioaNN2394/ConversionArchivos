class ImageConverter {
    static init() {
        // Estado
        this.selectedFile = null;
        this.originalImage = null;
        this.convertedBlob = null;
        this.targetFormat = null; 

        // Elementos DOM
        this.dropZone = document.getElementById('drop-zone');
        this.fileInput = document.getElementById('file-input');
        this.selectBtn = document.getElementById('select-btn'); // Referencia al botón
        this.loader = document.getElementById('loader');
        this.messageArea = document.getElementById('message-area');
        
        // Controles
        this.formatButtonsContainer = document.getElementById('format-buttons');
        this.qualityControl = document.getElementById('quality-control');
        this.qualitySlider = document.getElementById('quality-slider');
        this.qualityValue = document.getElementById('quality-value');
        this.bgColorControl = document.getElementById('bg-color-control');
        this.bgColorInput = document.getElementById('bg-color-input');

        // Previews y Acción
        this.previewContainer = document.getElementById('preview-container');
        this.originalPreview = document.getElementById('original-preview');
        this.resultPreview = document.getElementById('result-preview');
        this.originalInfo = document.getElementById('original-info');
        this.resultInfo = document.getElementById('result-info');
        this.actionButtons = document.querySelector('.action-buttons');
        this.downloadBtn = document.getElementById('download-btn');
        this.resetBtn = document.getElementById('reset-btn');

        this.setupEventListeners();
        this.resetUI();
    }

    static setupEventListeners() {
        // 1. Clic en el botón específico (CORRECCIÓN PRINCIPAL)
        if (this.selectBtn) {
            this.selectBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Evita conflictos con la zona de arrastre
                this.fileInput.click();
            });
        }

        // 2. Clic en la zona de arrastre (fondo)
        if (this.dropZone) {
            this.dropZone.addEventListener('click', () => {
                this.fileInput.click();
            });
            
            // Eventos Drag & Drop
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
                    this.handleFile(e.dataTransfer.files[0]);
                }
            });
        }

        // 3. Cambio en el input de archivo
        if (this.fileInput) {
            this.fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) this.handleFile(e.target.files[0]);
            });
        }

        // Slider de calidad
        if (this.qualitySlider) {
            this.qualitySlider.addEventListener('input', (e) => {
                this.qualityValue.textContent = `${e.target.value}%`;
            });
            this.qualitySlider.addEventListener('change', () => {
                if (this.targetFormat) this.convertImage();
            });
        }

        // Cambio de color de fondo
        if (this.bgColorInput) {
            this.bgColorInput.addEventListener('change', () => {
                if (this.targetFormat) this.convertImage();
            });
        }

        // Botones de acción
        if (this.downloadBtn) {
            this.downloadBtn.addEventListener('click', () => this.downloadFile());
        }

        if (this.resetBtn) {
            this.resetBtn.addEventListener('click', () => this.resetUI());
        }
    }

    static handleFile(file) {
        if (!file) return;

        // Validación mejorada para móviles (Type o Extensión)
        const isValidType = file.type.match(/image.*/);
        const isValidExt = /\.(jpg|jpeg|png|webp)$/i.test(file.name);

        if (!isValidType && !isValidExt) {
            this.showMessage('Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP).', 'error');
            return;
        }

        if (file.size > 20 * 1024 * 1024) { // 20MB Max
            this.showMessage('La imagen es demasiado grande (Máx 20MB).', 'error');
            return;
        }

        this.selectedFile = file;
        this.showMessage('', '');
        this.showLoading(true);

        const reader = new FileReader();
        reader.onload = (e) => {
            this.originalImage = new Image();
            this.originalImage.onload = () => {
                this.setupUIForConversion(file);
                this.showLoading(false);
            };
            this.originalImage.onerror = () => {
                this.showMessage('Error al cargar la imagen. Intenta con otra.', 'error');
                this.showLoading(false);
            };
            this.originalImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    static setupUIForConversion(file) {
        // Ocultar zona de carga
        this.dropZone.style.display = 'none';
        
        // Mostrar preview original
        this.previewContainer.style.display = 'block';
        this.originalPreview.src = this.originalImage.src;
        this.originalInfo.textContent = `${file.name} (${this.formatBytes(file.size)})`;
        
        // Generar botones de formato
        // Detectar tipo MIME o inferirlo de la extensión si está vacío (común en Android)
        let mimeType = file.type;
        if (!mimeType) {
            if (file.name.toLowerCase().endsWith('.png')) mimeType = 'image/png';
            else if (file.name.toLowerCase().endsWith('.webp')) mimeType = 'image/webp';
            else mimeType = 'image/jpeg';
        }

        this.generateFormatButtons(mimeType);
        
        // Mostrar controles por defecto
        this.bgColorControl.style.display = 'flex';
        this.formatButtonsContainer.style.display = 'flex';
        
        // Ocultar resultado hasta que seleccione formato
        this.resultPreview.style.display = 'none';
        this.resultInfo.textContent = '';
        this.actionButtons.style.display = 'none';
    }

    static generateFormatButtons(currentMimeType) {
        this.formatButtonsContainer.innerHTML = '<span class="format-label">Convertir a:</span>';
        
        const formats = [
            { id: 'image/jpeg', label: 'JPG', ext: 'jpg' },
            { id: 'image/png', label: 'PNG', ext: 'png' },
            { id: 'image/webp', label: 'WebP', ext: 'webp' }
        ];

        formats.forEach(format => {
            // Permitir convertir al mismo formato para redimensionar/optimizar
            const btn = document.createElement('button');
            btn.className = 'btn btn--primary format-btn';
            btn.textContent = format.label;
            
            // Marcar el formato actual visualmente (opcional)
            if (currentMimeType === format.id) {
                btn.style.borderColor = 'var(--color-success)';
            }

            btn.addEventListener('click', () => {
                document.querySelectorAll('.format-btn').forEach(b => {
                    b.classList.remove('btn--active');
                    b.style.opacity = '1';
                });
                btn.classList.add('btn--active');
                btn.style.opacity = '0.8'; 
                
                this.setTargetFormat(format.id);
            });
            this.formatButtonsContainer.appendChild(btn);
        });
    }

    static setTargetFormat(format) {
        this.targetFormat = format;
        
        // Ocultar slider calidad si es PNG
        if (format === 'image/png') {
            this.qualityControl.style.display = 'none';
        } else {
            this.qualityControl.style.display = 'flex';
        }

        this.convertImage();
    }

    static async convertImage() {
        if (!this.originalImage || !this.targetFormat) return;

        this.showLoading(true);
        this.actionButtons.style.display = 'none';

        try {
            const canvas = document.createElement('canvas');
            let width = this.originalImage.width;
            let height = this.originalImage.height;

            // Downsampling seguro para móviles
            const MAX_SIZE = 4096; 
            if (width > MAX_SIZE || height > MAX_SIZE) {
                if (width > height) {
                    height *= MAX_SIZE / width;
                    width = MAX_SIZE;
                } else {
                    width *= MAX_SIZE / height;
                    height = MAX_SIZE;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            const bgColor = this.bgColorInput.value;
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, width, height);

            ctx.drawImage(this.originalImage, 0, 0, width, height);

            const quality = parseInt(this.qualitySlider.value) / 100;
            
            canvas.toBlob((blob) => {
                if (!blob) {
                    throw new Error('Error al generar la imagen');
                }
                
                this.convertedBlob = blob;
                this.updateResultPreview(blob);
                this.showLoading(false);

            }, this.targetFormat, quality);

        } catch (error) {
            console.error(error);
            this.showMessage('Error durante la conversión.', 'error');
            this.showLoading(false);
        }
    }

    static updateResultPreview(blob) {
        const url = URL.createObjectURL(blob);
        this.resultPreview.src = url;
        this.resultPreview.style.display = 'block';
        
        const originalSize = this.selectedFile.size;
        const newSize = blob.size;
        const diff = ((newSize - originalSize) / originalSize) * 100;
        const diffText = diff > 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`;
        const diffColor = diff > 0 ? 'var(--color-error)' : 'var(--color-success)';

        this.resultInfo.innerHTML = `
            ${this.getFormatLabel(this.targetFormat)}: ${this.formatBytes(newSize)} 
            <span style="color:${diffColor}">(${diffText})</span>
        `;

        this.actionButtons.style.display = 'flex';
    }

    static downloadFile() {
        if (!this.convertedBlob) return;

        const ext = this.targetFormat.split('/')[1];
        const fileName = this.selectedFile.name.split('.')[0] + `-convertido.${ext}`;
        
        const url = URL.createObjectURL(this.convertedBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    static getFormatLabel(mimeType) {
        const map = {
            'image/jpeg': 'JPG',
            'image/png': 'PNG',
            'image/webp': 'WebP'
        };
        return map[mimeType] || 'Imagen';
    }

    static resetUI() {
        this.selectedFile = null;
        this.originalImage = null;
        this.convertedBlob = null;
        this.targetFormat = null;
        this.fileInput.value = '';

        this.dropZone.style.display = 'block';
        this.previewContainer.style.display = 'none';
        this.formatButtonsContainer.style.display = 'none';
        this.qualityControl.style.display = 'none';
        this.bgColorControl.style.display = 'none';
        this.actionButtons.style.display = 'none';

        this.originalPreview.src = '';
        this.resultPreview.src = '';
        
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