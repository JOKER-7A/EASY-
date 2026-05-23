import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA03wd1TNE1_h1ubA48fBIswPUV1KxH0Cc",
  authDomain: "easy-8e5ee.firebaseapp.com",
  projectId: "easy-8e5ee",
  storageBucket: "easy-8e5ee.firebasestorage.app",
  messagingSenderId: "698116507939",
  appId: "1:698116507939:web:389055c6223cbcd7cfa496"
};

// تهيئة التطبيق بشكل آمن يمنع التكرار
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };