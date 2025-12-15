class ImageToPdfConverter {
    static init() {
        this.files = []; // Almacena los archivos seleccionados
        this.generatedPdfBlob = null;

        // Elementos DOM
        this.dropZone = document.getElementById('drop-zone');
        this.fileInput = document.getElementById('file-input');
        this.selectBtn = document.getElementById('select-btn');
        this.loader = document.getElementById('loader');
        this.messageArea = document.getElementById('message-area');
        this.previewContainer = document.getElementById('preview-container');
        this.previewGrid = document.getElementById('preview-grid');
        this.fileCount = document.getElementById('file-count');
        this.orientationSelect = document.getElementById('orientation-select'); // El div contenedor
        this.orientationInput = this.orientationSelect ? this.orientationSelect.querySelector('select') : null;

        // Botones
        this.actionButtons = document.querySelector('.action-buttons');
        this.convertBtn = document.getElementById('convert-btn');
        this.downloadBtn = document.getElementById('download-btn');
        this.resetBtn = document.getElementById('reset-btn');

        this.setupEventListeners();
        this.resetUI();
    }

    static setupEventListeners() {
        // Click en zona o botón
        if (this.dropZone) {
            this.dropZone.addEventListener('click', (e) => {
                if (e.target !== this.selectBtn) this.fileInput.click();
            });
        }
        
        if (this.selectBtn) {
            this.selectBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Evitar doble click
                this.fileInput.click();
            });
        }

        // Drag & Drop
        if (this.dropZone) {
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
                    this.handleFiles(e.dataTransfer.files);
                }
            });
        }

        // Input Change
        if (this.fileInput) {
            this.fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleFiles(e.target.files);
                }
            });
        }

        // Acciones
        if (this.convertBtn) {
            this.convertBtn.addEventListener('click', () => this.generatePDF());
        }

        if (this.downloadBtn) {
            this.downloadBtn.addEventListener('click', () => this.downloadPDF());
        }

        if (this.resetBtn) {
            this.resetBtn.addEventListener('click', () => this.resetUI());
        }
    }

    static handleFiles(newFiles) {
        // Convertir FileList a Array y filtrar imágenes
        const validFiles = Array.from(newFiles).filter(file => {
            if (!file.type.match(/image.*/)) {
                console.warn(`Archivo ignorado (no es imagen): ${file.name}`);
                return false;
            }
            return true;
        });

        if (validFiles.length === 0) {
            this.showMessage('Por favor selecciona archivos de imagen válidos (JPG, PNG).', 'error');
            return;
        }

        // Agregar a la lista existente
        this.files = [...this.files, ...validFiles];
        
        // Actualizar UI
        this.updateUI();
    }

    static removeFile(index) {
        this.files.splice(index, 1);
        this.updateUI();
        
        // Si nos quedamos sin archivos, resetear
        if (this.files.length === 0) {
            this.resetUI();
        }
    }

    static updateUI() {
        // Mostrar preview container y controles
        if (this.files.length > 0) {
            this.previewContainer.style.display = 'block';
            this.actionButtons.style.display = 'flex';
            if (this.orientationSelect) this.orientationSelect.style.display = 'block';
            
            // Habilitar botón convertir, deshabilitar descarga
            this.convertBtn.disabled = false;
            this.downloadBtn.disabled = true;
            this.convertBtn.textContent = 'Crear PDF';
            this.showMessage('', '');
        }

        // Actualizar conteo
        if (this.fileCount) {
            this.fileCount.textContent = `${this.files.length} archivo${this.files.length !== 1 ? 's' : ''} seleccionado${this.files.length !== 1 ? 's' : ''}`;
        }

        // Renderizar miniaturas
        this.previewGrid.innerHTML = '';
        this.files.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const div = document.createElement('div');
                div.className = 'preview-item';
                div.innerHTML = `
                    <img src="${e.target.result}" alt="${file.name}">
                    <div class="preview-item-info">
                        <span class="preview-item-name">${file.name}</span>
                    </div>
                    <button class="preview-item-remove" onclick="ImageToPdfConverter.removeFile(${index})">×</button>
                `;
                this.previewGrid.appendChild(div);
            };
            reader.readAsDataURL(file);
        });
    }

    static async generatePDF() {
        if (this.files.length === 0) return;

        // Verificar si jsPDF está cargado
        if (typeof window.jspdf === 'undefined') {
            this.showMessage('Error: La librería PDF no se cargó correctamente. Recarga la página.', 'error');
            return;
        }

        this.showLoading(true);
        this.convertBtn.disabled = true;

        try {
            const { jsPDF } = window.jspdf;
            
            // Orientación seleccionada
            const orientation = this.orientationInput ? this.orientationInput.value : 'portrait';
            const doc = new jsPDF({
                orientation: orientation,
                unit: 'mm',
                format: 'a4'
            });

            // Dimensiones A4 en mm
            const pageWidth = orientation === 'portrait' ? 210 : 297;
            const pageHeight = orientation === 'portrait' ? 297 : 210;
            const margin = 10; // 10mm de margen

            for (let i = 0; i < this.files.length; i++) {
                if (i > 0) doc.addPage();

                // Procesar imagen (redimensionar para optimizar memoria en móviles)
                const imgData = await this.processImage(this.files[i]);
                
                // Calcular dimensiones para ajustar ("object-fit: contain")
                const imgProps = doc.getImageProperties(imgData);
                const imgWidth = imgProps.width;
                const imgHeight = imgProps.height;

                // Lógica de ajuste de aspecto
                const ratio = imgWidth / imgHeight;
                const availableWidth = pageWidth - (margin * 2);
                const availableHeight = pageHeight - (margin * 2);

                let finalWidth = availableWidth;
                let finalHeight = finalWidth / ratio;

                // Si la altura calculada se sale de la página, ajustamos por altura
                if (finalHeight > availableHeight) {
                    finalHeight = availableHeight;
                    finalWidth = finalHeight * ratio;
                }

                // Centrar imagen
                const x = (pageWidth - finalWidth) / 2;
                const y = (pageHeight - finalHeight) / 2;

                doc.addImage(imgData, 'JPEG', x, y, finalWidth, finalHeight);
            }

            this.generatedPdfBlob = doc.output('blob');
            this.downloadBtn.disabled = false;
            this.showMessage('PDF creado exitosamente.', 'success');

        } catch (error) {
            console.error(error);
            this.showMessage('Error al crear PDF: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
            this.convertBtn.disabled = false;
        }
    }

    // Procesa la imagen a un canvas para obtener DataURL y reducir tamaño si es gigante
    static processImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    // Crear canvas temporal
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Limitar tamaño máximo para evitar crash en iOS (Safari tiene límite de memoria)
                    const MAX_SIZE = 2000;
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
                    
                    // Fondo blanco por si es PNG transparente
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, width, height);
                    
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Retornar JPEG (más eficiente para PDF que PNG)
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                };
                img.onerror = reject;
                img.src = event.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    static downloadPDF() {
        if (!this.generatedPdfBlob) return;
        
        const url = URL.createObjectURL(this.generatedPdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `convertidorpro-documento.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Mostrar mensaje de confirmación
        this.showMessage('Tu PDF se descargó correctamente, revisa tus descargas', 'success');
    }

    static resetUI() {
        this.files = [];
        this.generatedPdfBlob = null;
        this.fileInput.value = '';
        
        // Elementos
        this.previewContainer.style.display = 'none';
        this.previewGrid.innerHTML = '';
        this.actionButtons.style.display = 'none';
        if (this.orientationSelect) this.orientationSelect.style.display = 'none';
        if (this.fileCount) this.fileCount.textContent = '';
        
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
}
