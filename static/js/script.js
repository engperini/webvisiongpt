//via client remoto
const talkButton = document.getElementById('talkButton');
const localVideo = document.getElementById('localVideo');
const sendButton = document.getElementById('sendButton');
const sendText = document.getElementById('sendText');
const status = document.getElementById('status');
const responseAudio = document.getElementById('responseAudio');
const responseImage = document.getElementById('responseImage');

let mediaStream = null;
let audioChunks = [];
let recorder = null;
let isRecording = false;
let playAudioResponse = true;

// Conexão com o servidor via WebSocket
const socket = new WebSocket('wss://engperini.ddns.net:5505/ws');

socket.onopen = () => {
    console.log('Conectado ao servidor via WebSocket');
    status.textContent = 'Conectado ao servidor.';
};

socket.onclose = () => {
    console.log('Desconectado do servidor');
    status.textContent = 'Desconectado do servidor.';
};

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    status.textContent = 'Resposta recebida do servidor.';

    // Exibe a resposta do bot no chat
    console.log(data.text);
    displayBotMessage(data.text);

    // Reproduz o áudio de resposta
    if (playAudioResponse && data.audio) {
        const audioBytes = atob(data.audio);
        const audioBuffer = new Uint8Array(audioBytes.length);
        for (let i = 0; i < audioBytes.length; i++) {
            audioBuffer[i] = audioBytes.charCodeAt(i);
        }
        const blob = new Blob([audioBuffer], { type: 'audio/mp3' });
        const url = URL.createObjectURL(blob);
        responseAudio.src = url;
        responseAudio.play();
    }

    // Exibe a imagem de resposta, se houver
    if (data.image) {
        responseImage.src = `data:image/jpeg;base64,${data.image}`;
        responseImage.style.display = 'block';
    } else {
        responseImage.style.display = 'none';
    }
};

socket.onerror = (error) => {
    console.error('Erro recebido do servidor:', error);
    status.textContent = 'Erro recebido do servidor.';
};

// Solicita permissão para câmera e microfone ao carregar a página
window.addEventListener('load', async () => {
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = mediaStream;
    } catch (err) {
        console.error('Erro ao acessar dispositivos de mídia:', err);
        status.textContent = 'Erro ao acessar dispositivos de mídia.';
    }
});

// Iniciar gravação ao pressionar o botão (mousedown ou touchstart)
const startRecording = async () => {
    if (!isRecording) {
        try {
            recorder = new MediaRecorder(mediaStream);
            recorder.ondataavailable = event => {
                audioChunks.push(event.data);
            };
            recorder.start();
            isRecording = true;
            status.textContent = 'Recording...';
            talkButton.textContent = 'Rec'; // Muda o texto do botão durante a gravação
        } catch (err) {
            console.error('Erro ao acessar dispositivos de mídia:', err);
            status.textContent = 'Erro ao acessar dispositivos de mídia.';
        }
    }
};

// Parar gravação ao soltar o botão (mouseup ou touchend)
const stopRecording = () => {
    if (isRecording) {
        recorder.stop();
        recorder.onstop = () => {
            console.log('Gravação de áudio finalizada.');
            sendData(true); // Envia os dados após parar a gravação
        };
        isRecording = false;
        status.textContent = 'Recognizing...';
        talkButton.textContent = 'Talk'; // Restaura o texto do botão após parar a gravação
    }
};

// Eventos para desktop
talkButton.addEventListener('mousedown', startRecording);
talkButton.addEventListener('mouseup', stopRecording);
talkButton.addEventListener('mouseleave', stopRecording);

// Eventos para dispositivos móveis
talkButton.addEventListener('touchstart', startRecording);
talkButton.addEventListener('touchend', stopRecording);

sendButton.onclick = () => {
    const text = sendText.value;
    if (text.trim() !== "") {
        displayUserMessage(text);
        sendData(false); // false para não enviar áudio 
    }
};

// Adiciona evento de teclado para envio ao pressionar "Enter"
sendText.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault(); // Previne o comportamento padrão (quebra de linha)
        const text = sendText.value.trim();
        if (text !== "") {
            displayUserMessage(text);
            sendData(false); // false para não enviar áudio
        }
    }
});

const sendData = async (sendAudio) => {
    // Cria um blob do áudio gravado
    let audioBlob = null;
    if (sendAudio) {
        audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        audioChunks = [];
    }

    // Captura um frame do vídeo
    let videoDataUrl = null;
    if (mediaStream && mediaStream.getVideoTracks().length > 0) {
        const videoTrack = mediaStream.getVideoTracks()[0];
        const imageCapture = new ImageCapture(videoTrack);
        try {
            const bitmap = await imageCapture.grabFrame();
            // Converte o frame para DataURL
            const canvas = document.createElement('canvas');
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(bitmap, 0, 0);
            videoDataUrl = canvas.toDataURL('image/jpeg');
        } catch (err) {
            console.error('Erro ao capturar frame de vídeo:', err);
        }
    }

    // Prepara os dados para envio
    let data = {};

    if (sendAudio) {
        // Converte o áudio em base64
        const reader = new FileReader();
        reader.onload = function () {
            const base64Audio = reader.result; // Data URL do áudio
            data.audio = base64Audio;
            if (videoDataUrl) {
                data.video = videoDataUrl;
            }
            sendDataToServer(data);
        };
        reader.readAsDataURL(audioBlob);
    } else {
        data.text = sendText.value;
        sendText.value = "";
        if (videoDataUrl) {
            data.video = videoDataUrl;
        }
        sendDataToServer(data);
    }
};

function sendDataToServer(data) {
    socket.send(JSON.stringify(data));
}

function scrollToBottom() {
    const chatContainer = document.getElementById('chat-container');
    chatContainer.scrollTop = chatContainer.scrollHeight; // Move o scroll para o final
}

function displayUserMessage(message) {
    const template = document.getElementById('user-message-template');
    const messageElement = template.content.cloneNode(true);
    messageElement.querySelector('.message-text').textContent = message;
    messageElement.querySelector('.timestamp').textContent = new Date().toLocaleTimeString();
    document.getElementById('chat-container').appendChild(messageElement);
    scrollToBottom(); // Rolagem automática
}

function displayBotMessage(message) {
    const template = document.getElementById('bot-message-template');
    const messageElement = template.content.cloneNode(true);
    messageElement.querySelector('.message-text').textContent = message;
    messageElement.querySelector('.timestamp').textContent = new Date().toLocaleTimeString();
    document.getElementById('chat-container').appendChild(messageElement);
    scrollToBottom(); // Rolagem automática
}

