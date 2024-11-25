async function initializeFirebase() {
    try {
        const response = await fetch('https://engperini.ddns.net:5505/api/firebase-config');
        const config = await response.json();
        firebase.initializeApp(config);
        console.log("Firebase inicializado");

        // Verifica se o usuário está autenticado
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                console.log("Usuário autenticado");
                document.body.style.display = "block"; // Mostra o app
            } else {
                console.log("Usuário não autenticado. Redirecionando...");
                window.location.href = "https://engperini.github.io/webvisiongpt/index.html";
            }
        });
    } catch (error) {
        console.error("Erro ao inicializar o Firebase:", error);
        window.location.href = "https://engperini.github.io/webvisiongpt/index.html"; // Redireciona para login em caso de erro
    }
}

// Esconde o conteúdo do app até a inicialização
document.addEventListener('DOMContentLoaded', () => {
    document.body.style.display = "none";
    initializeFirebase();
});

function logout() {
    firebase.auth().signOut().then(() => {
        console.log("Usuário desconectado.");
        window.location.href = "https://engperini.github.io/webvisiongpt/index.html"; // Redireciona para login
    }).catch(error => {
        console.error("Erro ao desconectar:", error);
    });
}




const logoutButton = document.getElementById('logoutButton')
const talkButton = document.getElementById('talkButton');
const localVideo = document.getElementById('localVideo');
const sendButton = document.getElementById('sendButton');
const sendText = document.getElementById('sendText');
const status = document.getElementById('status');
const responseAudio = document.getElementById('responseAudio');
const responseImage = document.getElementById('responseImage');

// Attach the logout function to both click and touchstart events
logoutButton.addEventListener('click', logout);
//micButton.addEventListener('touchend', micFunction);

// Eventos para desktop
logoutButton.addEventListener('mousedown', logout);
//micButton.addEventListener('mouseup', micFunction);
//micButton.addEventListener('mouseleave', micFunction);

// Mute button - no tts
const muteButton = document.getElementById('muteButton');
// Declare unmute icon variable
const unmuteIcon = '<i class="fas fa-volume-up"></i>';
// Declare mute icon variable
const muteIcon = '<i class="fas fa-volume-mute"></i>';

let isMuted = false;
function muteFunction() {
    // Toggle the muted state and the playAudioResponse
    isMuted = !isMuted;
    responseAudio.muted = isMuted;
    playAudioResponse = !isMuted;

    // Update the mute button icon accordingly
    muteButton.innerHTML = isMuted ? muteIcon : unmuteIcon;
}

// Attach the mute function to both click and touchstart events
muteButton.addEventListener('click', muteFunction);
//muteButton.addEventListener('touchend', muteFunction);

// Eventos para desktop
muteButton.addEventListener('mousedown', muteFunction);
//muteButton.addEventListener('mouseup', muteFunction);
//muteButton.addEventListener('mouseleave', muteFunction);

// Mic button - no stt
const micButton = document.getElementById('micButton');
// Declare unmic icon variable
const unmicIcon = '<i class="fas fa-microphone"></i>';
// Declare mic icon variable
const micIcon = '<i class="fas fa-microphone-slash"></i>';

let isMic = false;
function micFunction() {
    // Toggle the mic state and the talkbutton
    isMic = !isMic;
    talkButton.hidden = isMic;

    // Update the mic button icon accordingly
    micButton.innerHTML = isMic ? micIcon : unmicIcon;
}

// Attach the mic function to both click and touchstart events
micButton.addEventListener('click', micFunction);
//micButton.addEventListener('touchend', micFunction);

// Eventos para desktop
micButton.addEventListener('mousedown', micFunction);
//micButton.addEventListener('mouseup', micFunction);
//micButton.addEventListener('mouseleave', micFunction);

let mediaStream = null;
let audioChunks = [];
let recorder = null;
let isRecording = false;
let playAudioResponse = true;

// video button - no camera
const vidButton = document.getElementById('vidButton');
// Declare vid icon variable
const unvidIcon = '<i class="fas fa-video"></i>';
// Declare vid icon variable
const vidIcon = '<i class="fas fa-video-slash"></i>';

let isVid = false;
function vidFunction() {
    // Toggle the vid state and the localVideo
    isVid = !isVid;
    localVideo.hidden = isVid;

    // Update the vid button icon accordingly
    vidButton.innerHTML = isVid ? vidIcon : unvidIcon;
}

// Attach the vid function to both click and touchstart events
vidButton.addEventListener('click', vidFunction);
//vidButton.addEventListener('touchend', vidFunction);

// Eventos para desktop
vidButton.addEventListener('mousedown', vidFunction);
//vidButton.addEventListener('mouseup', vidFunction);
//vidButton.addEventListener('mouseleave', vidFunction);

// Conexão com o servidor via WebSocket
const socket = new WebSocket('wss://engperini.ddns.net:5505/api/data/ws');

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

    // Exibe a transcricao do user no chat
    console.log(data.text_user);
    displayUserMessage(data.text_user);
    
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
//talkButton.addEventListener('mousedown', stopRecording);

talkButton.addEventListener('mouseup', stopRecording);
talkButton.addEventListener('mouseleave', stopRecording);

// Eventos para dispositivos móveis
talkButton.addEventListener('touchstart', startRecording);
//talkButton.addEventListener('touchstart', stopRecording);
talkButton.addEventListener('touchend', stopRecording);

//text msg
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
    if (!isVid && mediaStream && mediaStream.getVideoTracks().length > 0) {
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
    if (!message){
        return;
    }
    const template = document.getElementById('user-message-template');
    const messageElement = template.content.cloneNode(true);
    messageElement.querySelector('.message-text').textContent = message;
    messageElement.querySelector('.timestamp').textContent = new Date().toLocaleTimeString();
    document.getElementById('chat-container').appendChild(messageElement);
    scrollToBottom(); // Rolagem automática
}

function displayBotMessage(message) {
    if (!message){
        return;
    }
    const template = document.getElementById('bot-message-template');
    const messageElement = template.content.cloneNode(true);
    messageElement.querySelector('.message-text').textContent = message;
    messageElement.querySelector('.timestamp').textContent = new Date().toLocaleTimeString();
    document.getElementById('chat-container').appendChild(messageElement);
    scrollToBottom(); // Rolagem automática
}
