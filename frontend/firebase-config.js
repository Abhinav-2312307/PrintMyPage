// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDPCifUMBLsvLEjhVq7dFVhzxZrkpU-kn8",
  authDomain: "printmypage-app.firebaseapp.com",
  projectId: "printmypage-app",
  storageBucket: "printmypage-app.firebasestorage.app",
  messagingSenderId: "1000645577686",
  appId: "1:1000645577686:web:2369296338ef2d77de7277"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth(); // Initialize Firebase Auth