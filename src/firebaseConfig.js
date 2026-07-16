import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

export const firebaseConfig = {
  apiKey: "AIzaSyCn5clP7FKVrO2wB2VppRcOnJk7hCJ_13E",
  authDomain: "padaria-1ba20.firebaseapp.com",
  projectId: "padaria-1ba20",
  storageBucket: "padaria-1ba20.firebasestorage.app",
  messagingSenderId: "290222917782",
  appId: "1:290222917782:web:f9a790465b572f7782dab7",
  measurementId: "G-8VP6QLRY00"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;