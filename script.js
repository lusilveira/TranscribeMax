// Variáveis globais
let selectedFile = null;
let transcriptionResult = '';
let recognition = null;
let audioElement = null;
let isTranscribing = false;

// Inicialização quando o DOM carregar
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    checkSpeechRecognitionSupport();
});

// Verificar suporte para Speech Recognition
function checkSpeechRecognitionSupport() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        showError('Seu navegador não suporta reconhecimento de fala. Use Chrome, Edge ou Safari mais recente.');
        return false;
    }
    
    // Configurar reconhecimento de fala
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'pt-BR'; // Padrão português
    
    return true;
}

// Configurar todos os event listeners
function initializeEventListeners() {
    const uploadSection = document.getElementById('uploadSection');
    const fileInput = document.getElementById('fileInput');
    const languageSelect = document.getElementById('language');

    // Drag and drop events
    uploadSection.addEventListener('dragover', handleDragOver);
    uploadSection.addEventListener('dragleave', handleDragLeave);
    uploadSection.addEventListener('drop', handleDrop);

    // File input change
    fileInput.addEventListener('change', handleFileInputChange);

    // Language change
    languageSelect.addEventListener('change', updateRecognitionLanguage);
    
    // Remover seção da API key já que não precisamos mais
    const apiKeySection = document.querySelector('.api-key-section');
    if (apiKeySection) {
        apiKeySection.style.display = 'none';
    }
}

// Atualizar idioma do reconhecimento
function updateRecognitionLanguage() {
    const language = document.getElementById('language').value;
    const langMap = {
        'pt': 'pt-BR',
        'en': 'en-US',
        'es': 'es-ES',
        'fr': 'fr-FR',
        'de': 'de-DE',
        'it': 'it-IT',
        'auto': 'pt-BR' // Padrão para auto
    };
    
    if (recognition) {
        recognition.lang = langMap[language] || 'pt-BR';
    }
}

// Handlers para drag and drop
function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileSelection(files[0]);
    }
}

// Handler para input de arquivo
function handleFileInputChange(e) {
    if (e.target.files.length > 0) {
        handleFileSelection(e.target.files[0]);
    }
}

// Processar arquivo selecionado
function handleFileSelection(file) {
    // Verificar tipo de arquivo
    const allowedTypes = ['audio/', 'video/'];
    const isAllowed = allowedTypes.some(type => file.type.startsWith(type));
    
    if (!isAllowed) {
        showError('Tipo de arquivo não suportado! Use arquivos de áudio ou vídeo.');
        return;
    }

    selectedFile = file;
    
    // Mostrar informações do arquivo
    document.getElementById('fileName').textContent = file.name;
    
    // Formatação melhorada do tamanho do arquivo
    let sizeText = formatFileSize(file.size);
    document.getElementById('fileSize').textContent = `Tamanho: ${sizeText}`;
    document.getElementById('fileInfo').style.display = 'block';

    // Definir título padrão
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    document.getElementById('documentTitle').value = `Transcrição: ${baseName}`;

    hideError();
    
    // Ativar botão de transcrição
    const transcribeBtn = document.getElementById('transcribeBtn');
    transcribeBtn.style.opacity = '1';
    transcribeBtn.disabled = false;
}

// Formatar tamanho do arquivo
function formatFileSize(bytes) {
    if (bytes < 1024) {
        return `${bytes} bytes`;
    } else if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(2)} KB`;
    } else if (bytes < 1024 * 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    } else {
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
}

// Iniciar transcrição GRATUITA
async function startTranscription() {
    if (!selectedFile) {
        showError('Por favor, selecione um arquivo primeiro.');
        return;
    }

    if (!recognition) {
        showError('Reconhecimento de fala não suportado. Use Chrome, Edge ou Safari.');
        return;
    }

    const transcribeBtn = document.getElementById('transcribeBtn');
    const progressSection = document.getElementById('progressSection');
    
    // Desabilitar botão e mostrar progresso
    transcribeBtn.disabled = true;
    isTranscribing = true;
    progressSection.style.display = 'block';
    hideError();

    try {
        // Atualizar texto de progresso
        document.querySelector('.progress-section h4').textContent = '🎤 Reproduzindo áudio para capturar...';
        document.querySelector('.progress-text').textContent = 'Reproduza o áudio em volume audível para o microfone capturar e transcrever.';

        // Criar elemento de áudio
        audioElement = document.createElement('audio');
        audioElement.controls = true;
        audioElement.style.width = '100%';
        audioElement.style.marginBottom = '20px';
        
        // Criar URL do arquivo
        const audioUrl = URL.createObjectURL(selectedFile);
        audioElement.src = audioUrl;
        
        // Adicionar player de áudio à seção de progresso
        progressSection.appendChild(audioElement);
        
        // Configurar eventos do reconhecimento
        setupSpeechRecognition();
        
        // Iniciar reconhecimento
        recognition.start();
        
        showSuccessMessage('Reconhecimento iniciado! Reproduza o áudio para transcrever.');

    } catch (error) {
        console.error('Erro na transcrição:', error);
        showError(`Erro na transcrição: ${error.message}`);
        progressSection.style.display = 'none';
        transcribeBtn.disabled = false;
        isTranscribing = false;
    }
}

// Configurar eventos do reconhecimento de fala
function setupSpeechRecognition() {
    let finalTranscript = '';
    let interimTranscript = '';

    recognition.onresult = function(event) {
        interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            
            if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
            } else {
                interimTranscript += transcript;
            }
        }
        
        // Atualizar resultado em tempo real
        transcriptionResult = finalTranscript + interimTranscript;
        updateTranscriptionPreview(transcriptionResult);
    };

    recognition.onerror = function(event) {
        console.error('Erro no reconhecimento:', event.error);
        
        let errorMessage = 'Erro no reconhecimento de fala.';
        switch (event.error) {
            case 'no-speech':
                errorMessage = 'Nenhuma fala detectada. Verifique se o áudio está sendo reproduzido.';
                break;
            case 'audio-capture':
                errorMessage = 'Erro ao capturar áudio. Verifique as permissões do microfone.';
                break;
            case 'not-allowed':
                errorMessage = 'Permissão negada para usar o microfone.';
                break;
        }
        
        showError(errorMessage);
    };

    recognition.onend = function() {
        if (isTranscribing) {
            // Reiniciar automaticamente se ainda estiver transcrevendo
            try {
                recognition.start();
            } catch (e) {
                console.log('Reconhecimento finalizado');
            }
        }
    };
}

// Atualizar preview da transcrição em tempo real
function updateTranscriptionPreview(text) {
    let resultSection = document.getElementById('resultSection');
    
    if (resultSection.style.display === 'none') {
        resultSection.style.display = 'block';
    }
    
    document.getElementById('resultText').textContent = text || 'Aguardando fala...';
}

// Parar transcrição
function stopTranscription() {
    if (recognition) {
        recognition.stop();
    }
    
    isTranscribing = false;
    
    const transcribeBtn = document.getElementById('transcribeBtn');
    transcribeBtn.disabled = false;
    transcribeBtn.textContent = '🎯 Iniciar Transcrição';
    
    document.getElementById('progressSection').style.display = 'none';
    
    if (audioElement) {
        audioElement.pause();
    }
    
    showSuccessMessage('Transcrição finalizada!');
}

// Atualizar botão para permitir parar
function updateTranscriptionButton() {
    const transcribeBtn = document.getElementById('transcribeBtn');
    
    if (isTranscribing) {
        transcribeBtn.textContent = '⏹️ Parar Transcrição';
        transcribeBtn.onclick = stopTranscription;
    } else {
        transcribeBtn.textContent = '🎯 Iniciar Transcrição';
        transcribeBtn.onclick = startTranscription;
    }
}

// Download como TXT
function downloadText() {
    const title = document.getElementById('documentTitle').value || 'transcricao';
    const timestamp = new Date().toLocaleString('pt-BR');
    const content = `${title}\nGerado em: ${timestamp}\nMétodo: Reconhecimento de Fala (Gratuito)\n\n${transcriptionResult}`;
    
    downloadFile(content, `${sanitizeFilename(title)}.txt`, 'text/plain;charset=utf-8');
}

// Download como Word (RTF)
function downloadWord() {
    const title = document.getElementById('documentTitle').value || 'Transcrição';
    const timestamp = new Date().toLocaleString('pt-BR');
    
    const rtfContent = `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Calibri;}}
    {\\colortbl;\\red0\\green0\\blue128;}
    \\f0\\fs28\\cf1\\b ${title}\\b0\\par
    \\fs20 Gerado em: ${timestamp}\\par
    \\fs18 Método: Reconhecimento de Fala (Gratuito)\\par\\par
    \\fs22 ${transcriptionResult.replace(/\n/g, '\\par ')}
    }`;
    
    downloadFile(rtfContent, `${sanitizeFilename(title)}.rtf`, 'application/rtf');
}

// Função auxiliar para download
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// Sanitizar nome do arquivo
function sanitizeFilename(filename) {
    return filename.replace(/[^a-z0-9]/gi, '_');
}

// Copiar para clipboard
function copyToClipboard() {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(transcriptionResult).then(() => {
            showSuccessMessage('Texto copiado para a área de transferência!');
        }).catch(err => {
            console.error('Erro ao copiar:', err);
            fallbackCopyToClipboard();
        });
    } else {
        fallbackCopyToClipboard();
    }
}

// Fallback para copiar (navegadores antigos)
function fallbackCopyToClipboard() {
    const textArea = document.createElement('textarea');
    textArea.value = transcriptionResult;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showSuccessMessage('Texto copiado para a área de transferência!');
        } else {
            showError('Não foi possível copiar o texto.');
        }
    } catch (err) {
        console.error('Erro ao copiar:', err);
        showError('Não foi possível copiar o texto.');
    }
    
    document.body.removeChild(textArea);
}

// Mostrar mensagem de erro
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    // Auto-esconder após 8 segundos
    setTimeout(() => {
        hideError();
    }, 8000);
}

// Esconder mensagem de erro
function hideError() {
    document.getElementById('errorMessage').style.display = 'none';
}

// Mostrar mensagem de sucesso
function showSuccessMessage(message) {
    // Criar elemento temporário para sucesso
    const successDiv = document.createElement('div');
    successDiv.textContent = message;
    successDiv.style.cssText = `
        background: #d4edda;
        color: #155724;
        padding: 15px;
        border-radius: 8px;
        margin: 20px 0;
        border: 1px solid #c3e6cb;
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        max-width: 300px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;
    
    document.body.appendChild(successDiv);
    
    // Remover após 3 segundos
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.parentNode.removeChild(successDiv);
        }
    }, 3000);

    // Atualizar botão se necessário
    updateTranscriptionButton();
}