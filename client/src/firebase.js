// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD4iLt6tF0P-vzV-HlZmmu8nBddviArAkc",
  authDomain: "createdbyher-c293b.firebaseapp.com",
  projectId: "createdbyher-c293b",
  storageBucket: "createdbyher-c293b.firebasestorage.app",
  messagingSenderId: "297748571901",
  appId: "1:297748571901:web:ea4ce77b3a40496dd60094"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);