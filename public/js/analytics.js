// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDhEaENJWvdxqLj9KAZ8az2WZnEVVqpceQ",
  authDomain: "ads2025-e4539.firebaseapp.com",
  projectId: "ads2025-e4539",
  storageBucket: "ads2025-e4539.firebasestorage.app",
  messagingSenderId: "551048582280",
  appId: "1:551048582280:web:bc7664e5958ce9b2643b3d",
  measurementId: "G-1MBLLDC205"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

console.log("Firebase Analytics initialized");
