import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAQK4IQEsPfRQaCTpS56oIbuNGyMF1DZ38",
  authDomain: "vahan-ai.firebaseapp.com",
  projectId: "vahan-ai",
  storageBucket: "vahan-ai.firebasestorage.app",
  messagingSenderId: "187445037440",
  appId: "1:187445037440:web:810f41d7f5a48009259965",
  measurementId: "G-MGT3MNNHSN"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();