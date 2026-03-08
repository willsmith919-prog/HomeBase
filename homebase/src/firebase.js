import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD6yimm9jgGTAfFje6S63eduIxFwKOuQ8g",
  authDomain: "smith-family-home-admin-app.firebaseapp.com",
  databaseURL: "https://smith-family-home-admin-app-default-rtdb.firebaseio.com",
  projectId: "smith-family-home-admin-app",
  storageBucket: "smith-family-home-admin-app.firebasestorage.app",
  messagingSenderId: "524059404018",
  appId: "1:524059404018:web:ba5223ac4dfccaf560926b"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app); //Old Code
export const database = getFirestore(app); //New Code
export const auth = getAuth(app);

