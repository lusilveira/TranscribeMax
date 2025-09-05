// Variáveis globais
let selectedFile = null;
let transcriptionResult = '';

// Inicialização quando o DOM carregar
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
});

// Configurar todos os event listeners
function initializeEventListeners() {
    const uploadSection = document.getElementById('uploadSection');
    const fileInput = document.getElementById('fileInput');
    const apiKeyInput = document.getElementById('apiKey');

    // Drag and drop events
    uploadSection.addEventListener('dragover', handleDragOver);
    uploadSection.addEventListener('dragleave', handleDragLeave);
    uploadSection.addEventListener('drop', handleDrop);

    // File input change
    fileInput.addEventListener('change', handleFileInputChange);

    // API key validation
    apiKeyInput.addEventListener('input', validateApiKey);
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
    updateTranscribeButtonState();
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

// Validar chave da API
function validateApiKey() {
    updateTranscribeButtonState();
}

// Atualizar estado do botão de transcrição
function updateTranscribeButtonState() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const transcribeBtn = document.getElementById('transcribeBtn');
    
    if (apiKey && selectedFile) {
        transcribeBtn.style.opacity = '1';
    } else {
        transcribeBtn.style.opacity = '0.6';
    }
}

// Iniciar transcrição
async function startTranscription() {
    const apiKey = document.getElementById('apiKey').value.trim();
    
    if (!apiKey) {
        showError('Por favor, insira sua chave da API OpenAI.');
        return;
    }

    if (!selectedFile) {
        showError('Por favor, selecione um arquivo primeiro.');
        return;
    }

    const transcribeBtn = document.getElementById('transcribeBtn');
    const progressSection = document.getElementById('progressSection');
    
    // Desabilitar botão e mostrar progresso
    transcribeBtn.disabled = true;
    progressSection.style.display = 'block';
    hideError();

    try {
        // Simular progresso
        animateProgress();

        // Preparar dados para envio
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('model', 'whisper-1');
        
        const language = document.getElementById('language').value;
        if (language !== 'auto') {
            formData.append('language', language);
        }

        // Fazer requisição para API
        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `Erro na API: ${response.status}`);
        }

        const result = await response.json();
        transcriptionResult = result.text;

        // Mostrar resultado
        displayTranscriptionResult();

    } catch (error) {
        console.error('Erro na transcrição:', error);
        showError(`Erro na transcrição: ${error.message}`);
        progressSection.style.display = 'none';
    } finally {
        transcribeBtn.disabled = false;
    }
}

// Exibir resultado da transcrição
function displayTranscriptionResult() {
    document.getElementById('resultText').textContent = transcriptionResult;
    document.getElementById('resultSection').style.display = 'block';
    document.getElementById('progressSection').style.display = 'none';
}

// Animação de progresso
function animateProgress() {
    const progressFill = document.getElementById('progressFill');
    let progress = 0;
    
    const interval = setInterval(() => {
        progress += Math.random() * 10;
        if (progress > 90) {
            clearInterval(interval);
            progress = 90;
        }
        progressFill.style.width = progress + '%';
    }, 500);
}

// Download como TXT
function downloadText() {
    const title = document.getElementById('documentTitle').value || 'transcricao';
    const timestamp = new Date().toLocaleString('pt-BR');
    const content = `${title}\nGerado em: ${timestamp}\n\n${transcriptionResult}`;
    
    downloadFile(content, `${sanitizeFilename(title)}.txt`, 'text/plain;charset=utf-8');
}

// Download como Word (RTF)
function downloadWord() {
    const title = document.getElementById('documentTitle').value || 'Transcrição';
    const timestamp = new Date().toLocaleString('pt-BR');
    
    const rtfContent = `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Calibri;}}
    {\\colortbl;\\red0\\green0\\blue128;}
    \\f0\\fs28\\cf1\\b ${title}\\b0\\par
    \\fs20 Gerado em: ${timestamp}\\par\\par
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
    
    // Auto-esconder após 5 segundos
    setTimeout(() => {
        hideError();
    }, 5000);
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
}