// Billang Studio - JavaScript para Procesamiento de Audio

class BillangStudio {
    constructor() {
        this.audioContext = null;
        this.audioBuffer = null;
        this.originalAudioBuffer = null;
        this.isProcessing = false;
        
        this.initializeElements();
        this.setupEventListeners();
        this.initializeAudioContext();
    }

    initializeElements() {
        // Elementos del DOM
        this.uploadArea = document.getElementById('uploadArea');
        this.audioFileInput = document.getElementById('audioFile');
        this.fileInfo = document.getElementById('fileInfo');
        this.fileName = document.getElementById('fileName');
        this.fileSize = document.getElementById('fileSize');
        this.audioPlayerCard = document.getElementById('audioPlayerCard');
        this.audioPlayer = document.getElementById('audioPlayer');
        this.processingCard = document.getElementById('processingCard');
        this.pitchSlider = document.getElementById('pitchSlider');
        this.pitchValue = document.getElementById('pitchValue');
        this.karaokeMode = document.getElementById('karaokeMode');
        this.processBtn = document.getElementById('processBtn');
        this.progressCard = document.getElementById('progressCard');
        this.progressBar = document.getElementById('progressBar');
        this.progressText = document.getElementById('progressText');
        this.resultsCard = document.getElementById('resultsCard');
        this.processedAudio = document.getElementById('processedAudio');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.resetBtn = document.getElementById('resetBtn');
    }

    setupEventListeners() {
        // Drag and drop
        this.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadArea.classList.add('dragover');
        });

        this.uploadArea.addEventListener('dragleave', () => {
            this.uploadArea.classList.remove('dragover');
        });

        this.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect(files[0]);
            }
        });

        // File input
        this.audioFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelect(e.target.files[0]);
            }
        });

        // Pitch slider
        this.pitchSlider.addEventListener('input', (e) => {
            this.pitchValue.textContent = e.target.value;
        });

        // Process button
        this.processBtn.addEventListener('click', () => {
            this.processAudio();
        });

        // Download button
        this.downloadBtn.addEventListener('click', () => {
            this.downloadProcessedAudio();
        });

        // Reset button
        this.resetBtn.addEventListener('click', () => {
            this.resetApplication();
        });
    }

    async initializeAudioContext() {
        try {
            // Crear AudioContext con fallback para navegadores más antiguos
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            
            // Verificar si el contexto está suspendido (requiere interacción del usuario)
            if (this.audioContext.state === 'suspended') {
                console.log('AudioContext suspendido, esperando interacción del usuario...');
            }
        } catch (error) {
            console.error('Error al inicializar AudioContext:', error);
            this.showError('No se pudo inicializar el procesador de audio. Verifica que tu navegador soporte Web Audio API.');
        }
    }

    async handleFileSelect(file) {
        if (!file.type.includes('audio/')) {
            this.showError('Por favor selecciona un archivo de audio válido.');
            return;
        }

        if (file.size > 50 * 1024 * 1024) { // 50MB limit
            this.showError('El archivo es demasiado grande. Máximo 50MB.');
            return;
        }

        try {
            // Iniciar Tone.js en una interacción del usuario
            if (Tone.context.state !== 'running') {
                await Tone.start();
                console.log('AudioContext iniciado con Tone.js');
            }

            // Mostrar información del archivo
            this.showFileInfo(file);
            
            // Cargar el archivo de audio
            const arrayBuffer = await this.readFileAsArrayBuffer(file);
            this.originalAudioBuffer = await Tone.context.decodeAudioData(arrayBuffer);
            this.audioBuffer = this.originalAudioBuffer;
            
            // Crear URL para el reproductor
            const audioUrl = URL.createObjectURL(file);
            this.audioPlayer.src = audioUrl;
            
            // Mostrar elementos
            this.showAudioPlayer();
            this.showProcessingControls();
            
            // Animar entrada
            this.animateElements();
            
        } catch (error) {
            console.error('Error al cargar el archivo:', error);
            this.showError('Error al cargar el archivo de audio. Verifica que el archivo no esté corrupto.');
        }
    }

    readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    showFileInfo(file) {
        this.fileName.textContent = file.name;
        this.fileSize.textContent = this.formatFileSize(file.size);
        this.fileInfo.style.display = 'block';
        this.fileInfo.classList.add('fade-in');
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showAudioPlayer() {
        this.audioPlayerCard.style.display = 'block';
        this.audioPlayerCard.classList.add('slide-up');
    }

    showProcessingControls() {
        this.processingCard.style.display = 'block';
        this.processingCard.classList.add('slide-up');
    }

    animateElements() {
        const elements = [this.audioPlayerCard, this.processingCard];
        elements.forEach((element, index) => {
            setTimeout(() => {
                element.classList.add('fade-in');
            }, index * 200);
        });
    }

    async processAudio() {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        this.processBtn.disabled = true;
        this.showProgress();

        try {
            // Asegurar que el AudioContext de Tone.js esté activo
            if (Tone.context.state === 'suspended') {
                await Tone.context.resume();
            }

            const pitchShift = parseInt(this.pitchSlider.value);
            const removeVocals = this.karaokeMode.checked;

            this.updateProgress(10, 'Iniciando procesamiento...');

            // Clonar el buffer original
            this.audioBuffer = this.cloneAudioBuffer(this.originalAudioBuffer);

            if (pitchShift !== 0) {
                this.updateProgress(30, 'Aplicando cambio de tonalidad...');
                this.audioBuffer = await this.applyPitchShift(this.audioBuffer, pitchShift);
            }

            if (removeVocals) {
                this.updateProgress(60, 'Eliminando voces...');
                this.audioBuffer = await this.removeVocals(this.audioBuffer);
            }

            this.updateProgress(90, 'Finalizando procesamiento...');

            // Crear archivo de audio procesado
            const processedBlob = await this.audioBufferToBlob(this.audioBuffer);
            const processedUrl = URL.createObjectURL(processedBlob);
            
            this.processedAudio.src = processedUrl;
            this.processedAudioBlob = processedBlob;

            this.updateProgress(100, '¡Procesamiento completado!');
            
            setTimeout(() => {
                this.hideProgress();
                this.showResults();
            }, 1000);

        } catch (error) {
            console.error('Error durante el procesamiento:', error);
            this.showError('Error durante el procesamiento del audio. Intenta con un archivo diferente.');
        } finally {
            this.isProcessing = false;
            this.processBtn.disabled = false;
        }
    }

    cloneAudioBuffer(buffer) {
        const newBuffer = Tone.context.createBuffer(
            buffer.numberOfChannels,
            buffer.length,
            buffer.sampleRate
        );

        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const channelData = buffer.getChannelData(channel);
            const newChannelData = newBuffer.getChannelData(channel);
            newChannelData.set(channelData);
        }

        return newBuffer;
    }

    async applyPitchShift(buffer, semitones) {
        if (semitones === 0) return buffer; // No hay cambios

        this.updateProgress(40, 'Aplicando cambio de tonalidad (alta calidad)...');

        try {
            const shiftedBuffer = await Tone.Offline(async () => {
                const pitchShift = new Tone.PitchShift({
                    pitch: semitones
                }).toDestination();

                const player = new Tone.Player(buffer).connect(pitchShift);
                player.start(0);

            }, buffer.duration);

            this.updateProgress(50, 'Tonalidad ajustada.');
            return shiftedBuffer;

        } catch (error) {
            console.error('Error aplicando pitch shift con Tone.js:', error);
            this.showError('Hubo un error al cambiar la tonalidad. Intenta de nuevo.');
            return buffer; // Devolver buffer original en caso de error
        }
    }

    async removeVocals(buffer) {
        return new Promise((resolve) => {
            const newBuffer = Tone.context.createBuffer(
                buffer.numberOfChannels,
                buffer.length,
                buffer.sampleRate
            );

            // Solo funciona para audio estéreo
            if (buffer.numberOfChannels >= 2) {
                const leftChannel = buffer.getChannelData(0);
                const rightChannel = buffer.getChannelData(1);
                const newLeftChannel = newBuffer.getChannelData(0);
                const newRightChannel = newBuffer.getChannelData(1);

                // Técnica simple de cancelación de fase para voces
                const vocalReduction = 0.7; // Reducción moderada
                
                for (let i = 0; i < buffer.length; i++) {
                    // Calcular canales mid y side
                    const mid = (leftChannel[i] + rightChannel[i]) / 2;
                    const side = (leftChannel[i] - rightChannel[i]) / 2;
                    
                    // Reducir solo el canal medio (donde están las voces)
                    const processedMid = mid * (1 - vocalReduction);
                    
                    // Reconstruir canales estéreo
                    newLeftChannel[i] = processedMid + side;
                    newRightChannel[i] = processedMid - side;
                }
            } else {
                // Para audio mono, reducir volumen general
                const channelData = buffer.getChannelData(0);
                const newChannelData = newBuffer.getChannelData(0);
                
                for (let i = 0; i < buffer.length; i++) {
                    // Reducción moderada para mono
                    newChannelData[i] = channelData[i] * 0.6;
                }
            }

            resolve(newBuffer);
        });
    }

    async audioBufferToBlob(buffer) {
        // Usa un codificador WAV para crear un Blob de audio/wav
        return new Promise((resolve) => {
            const blob = this.bufferToWave(buffer, buffer.length);
            resolve(blob);
        });
    }

    bufferToWave(abuffer, len) {
        let numOfChan = abuffer.numberOfChannels,
            length = len * numOfChan * 2 + 44,
            buffer = new ArrayBuffer(length),
            view = new DataView(buffer),
            channels = [],
            i,
            sample,
            offset = 0,
            pos = 0;

        // Escribir cabecera WAVE
        this.setUint32(view, pos, 0x46464952); pos += 4; // "RIFF"
        this.setUint32(view, pos, length - 8); pos += 4; // file length - 8
        this.setUint32(view, pos, 0x45564157); pos += 4; // "WAVE"

        this.setUint32(view, pos, 0x20746d66); pos += 4; // "fmt " chunk
        this.setUint32(view, pos, 16); pos += 4; // length = 16
        this.setUint16(view, pos, 1); pos += 2; // PCM (uncompressed)
        this.setUint16(view, pos, numOfChan); pos += 2;
        this.setUint32(view, pos, abuffer.sampleRate); pos += 4;
        this.setUint32(view, pos, abuffer.sampleRate * 2 * numOfChan); pos += 4; // avg. bytes/sec
        this.setUint16(view, pos, numOfChan * 2); pos += 2; // block-align
        this.setUint16(view, pos, 16); pos += 2; // 16-bit
        this.setUint32(view, pos, 0x61746164); pos += 4; // "data" - chunk
        this.setUint32(view, pos, length - pos - 4); pos += 4; // chunk length

        // Escribir datos de audio intercalados
        for (i = 0; i < abuffer.numberOfChannels; i++)
            channels.push(abuffer.getChannelData(i));

        while (pos < length) {
            for (i = 0; i < numOfChan; i++) {
                // Intercalar canales
                sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
                sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
                view.setInt16(pos, sample, true); // Escribir muestra de 16 bits
                pos += 2;
            }
            offset++;
        }

        return new Blob([view], { type: "audio/wav" });
    }
    
    setUint16(view, offset, value) {
        view.setUint16(offset, value, true);
    }
    
    setUint32(view, offset, value) {
        view.setUint32(offset, value, true);
    }

    showProgress() {
        this.progressCard.style.display = 'block';
        this.progressCard.classList.add('slide-up');
    }

    updateProgress(percentage, text) {
        this.progressBar.style.width = `${percentage}%`;
        this.progressText.textContent = text;
    }

    hideProgress() {
        this.progressCard.style.display = 'none';
    }

    showResults() {
        this.resultsCard.style.display = 'block';
        this.resultsCard.classList.add('slide-up');
        
        // Scroll suave hacia los resultados
        this.resultsCard.scrollIntoView({ behavior: 'smooth' });
    }

    downloadProcessedAudio() {
        if (!this.processedAudioBlob) {
            this.showError('No hay audio procesado para descargar.');
            return;
        }

        const url = URL.createObjectURL(this.processedAudioBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `billang_studio_processed_${Date.now()}.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    resetApplication() {
        // Limpiar archivos
        if (this.audioPlayer.src) {
            URL.revokeObjectURL(this.audioPlayer.src);
        }
        if (this.processedAudio.src) {
            URL.revokeObjectURL(this.processedAudio.src);
        }

        // Resetear variables
        this.audioBuffer = null;
        this.originalAudioBuffer = null;
        this.processedAudioBlob = null;

        // Ocultar elementos
        this.fileInfo.style.display = 'none';
        this.audioPlayerCard.style.display = 'none';
        this.processingCard.style.display = 'none';
        this.progressCard.style.display = 'none';
        this.resultsCard.style.display = 'none';

        // Resetear controles
        this.pitchSlider.value = 0;
        this.pitchValue.textContent = '0';
        this.karaokeMode.checked = false;
        this.audioFileInput.value = '';

        // Limpiar reproductores
        this.audioPlayer.src = '';
        this.processedAudio.src = '';
    }

    showError(message) {
        // Crear alerta de error
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger alert-dismissible fade show';
        alertDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        // Insertar después del header
        const header = document.querySelector('.text-center.mb-5');
        header.parentNode.insertBefore(alertDiv, header.nextSibling);

        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new BillangStudio();
});

// Mostrar mensaje de bienvenida
window.addEventListener('load', () => {
    console.log('🎵 Billang Studio - Procesador de Audio Profesional 🎵');
    console.log('Funcionalidades disponibles:');
    console.log('- Cambio de tonalidad (pitch)');
    console.log('- Eliminación de voces (karaoke)');
    console.log('- Procesamiento en tiempo real');
    console.log('- Descarga de archivos procesados');
}); 