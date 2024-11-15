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

// Conexão com o servidor via Socket.IO
const socket = io('https://engperini.ddns.net:5505/api/data', {
     secure: true,
     rejectUnauthorized: false
 });


socket.on('connect_ext', () => {
    console.log('Conectado ao servidor via Socket.IO via client remoto');
    status.textContent = 'Conectado ao servidor via client remoto.';
});

socket.on('disconnect_ext', () => {
    console.log('Desconectado do servidor via client remoto'); 
    status.textContent = 'Desconectado do servidor via client remoto.';
});

socket.on('response', (data) => {
    status.textContent = 'Resposta recebida do servidor via client remoto.';
    
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
});

socket.on('error', (error) => {
    console.error('Erro recebido do servidor:', error);
    status.textContent = 'Erro recebido do servidor.';
});

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

talkButton.onclick = async () => {
    if (!isRecording) {
        // Iniciar Gravação
        try {
          

            recorder = new MediaRecorder(mediaStream);
            recorder.ondataavailable = event => {
                audioChunks.push(event.data);
            };
            recorder.onstop = () => {
                console.log('Gravação de áudio finalizada.');
                sendData(true);
            };
            recorder.start();

            isRecording = true;
            talkButton.textContent = 'Send';
            status.textContent = 'Recording...';
        } catch (err) {
            console.error('Erro ao acessar dispositivos de mídia:', err);
            status.textContent = 'Erro ao acessar dispositivos de mídia.';
        }
    } else {
        // Parar Gravação
        recorder.stop();
        isRecording = false;
        talkButton.textContent = 'Talk';
        status.textContent = 'Recognizing ...';
    }
};

sendButton.onclick = () => {
    const text = sendText.value;
    if (text.trim() !== "") {
        displayUserMessage(text);
        sendData(false); // false para não enviar áudio 
        //sendText.value = ""; 
    }
};

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
        reader.onload = function() {
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
    socket.emit('handle_process_data_ext', data);
}

function displayUserMessage(message) {
    const template = document.getElementById('user-message-template');
    const messageElement = template.content.cloneNode(true);
    messageElement.querySelector('.message-text').textContent = message;
    messageElement.querySelector('.timestamp').textContent = new Date().toLocaleTimeString();
    document.getElementById('chat-container').appendChild(messageElement);
}

function displayBotMessage(message) {
    const template = document.getElementById('bot-message-template');
    const messageElement = template.content.cloneNode(true);
    messageElement.querySelector('.message-text').textContent = message;
    messageElement.querySelector('.timestamp').textContent = new Date().toLocaleTimeString();
    document.getElementById('chat-container').appendChild(messageElement);
}
