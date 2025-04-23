import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDyOCSQVq9SEE0DpDoxHF_jhMAVf8ajptQ",
  authDomain: "hadaai.firebaseapp.com",
  projectId: "hadaai",
  storageBucket: "hadaai.firebasestorage.app",
  messagingSenderId: "577202508235",
  appId: "1:577202508235:web:167570ebaace7db11c664e",
  measurementId: "G-2D0QV18GT1",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider(); // ✅ Google provider
export const db = getFirestore(app);

export default app;
