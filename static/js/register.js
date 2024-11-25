

let auth;

async function loadFirebaseConfig() {
try {
    const response = await fetch('https://engperini.ddns.net:5505/api/firebase-config');
    const config = await response.json();
    firebase.initializeApp(config);
    console.log("Firebase loaded");

    // Inicialize auth após carregar o Firebase
    auth = firebase.auth();
} catch (error) {
    console.error("Failed to load Firebase config:", error);
}
}

loadFirebaseConfig();

function login() {
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    const loginError = document.getElementById("login-error");

    auth.signInWithEmailAndPassword(email, password)
    .then(userCredential => {
        // Signed in 
        const user = userCredential.user;
        // Redirect to app or display welcome message
        
        window.location.href = "https://engperini.ddns.net:5505/app"; 
    })
    .catch(error => {
        loginError.textContent = error.message;
    });
}

function register() {
    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;
    const registerError = document.getElementById("register-error");

    auth.createUserWithEmailAndPassword(email, password)
    .then(userCredential => {
        // Signed in 
        const user = userCredential.user;
        // Redirect to app or display welcome message
        
        window.location.href = "https://engperini.ddns.net:5505/app";
    })
    .catch(error => {
        registerError.textContent = error.message;
    });
}

function toggleForm(form) {
    if (form === 'register') {
    document.getElementById("login-form").style.display = "none";
    document.getElementById("register-form").style.display = "block";
    } else {
    document.getElementById("login-form").style.display = "block";
    document.getElementById("register-form").style.display = "none";
    }
}


