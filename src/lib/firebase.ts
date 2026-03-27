import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Replace with your Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyAUzJh5QcTiADjoh2sWSyyHz6n1fbsUveQ",
  authDomain: "projectslead-86c5a.firebaseapp.com",
  projectId: "projectslead-86c5a",
  storageBucket: "projectslead-86c5a.firebasestorage.app",
  messagingSenderId: "864897723080",
  appId: "1:864897723080:web:d00ac2e42ad90b260d93fd",
  measurementId: "G-49ERV8DS3B"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
