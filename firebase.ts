import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// coloque aqui os dados do seu projeto no Firebase
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_://firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_://appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

export const db = getFirestore(initializeApp(firebaseConfig));