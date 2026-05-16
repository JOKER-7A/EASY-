
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// تهيئة الإعدادات مع قيم احتياطية لمنع الانهيار (Crash) في حالة غياب المفاتيح
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSy_Placeholder_Key", 
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

let app;
try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
} catch (e) {
  // في حالة وجود خطأ في المفاتيح، نقوم بالتهيئة بشكل لا يسبب توقف السيرفر
  app = getApps().length > 0 ? getApp() : initializeApp({
    apiKey: "AIzaSy_fallback",
    authDomain: "fallback.firebaseapp.com",
    projectId: "fallback-project",
    storageBucket: "fallback.appspot.com",
    messagingSenderId: "000",
    appId: "1:000:web:000"
  });
}

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { db, auth, storage };
