import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC15Nd0oGiT-THhddfPv9rBCDGUBWYZ6YI",
  authDomain: "tarifas-11d12.firebaseapp.com",
  projectId: "tarifas-11d12",
  storageBucket: "tarifas-11d12.firebasestorage.app",
  messagingSenderId: "126841745551",
  appId: "1:126841745551:web:67cdd0d2dab0b32c1980fa",
  measurementId: "G-9VHYV0QNC6"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
