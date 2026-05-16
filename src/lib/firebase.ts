
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// إعدادات Firebase - سيتم استبدال القيم تلقائياً عند الربط الفعلي
// تم وضع قيم افتراضية لضمان عدم توقف السيرفر أثناء التشغيل الأولي
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSy_Placeholder",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "easy-prep.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "easy-prep",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "easy-prep.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "0000000000",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:0000000000:web:0000000000"
};

let app;
try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
} catch (e) {
  app = getApps().length > 0 ? getApp() : initializeApp({
    apiKey: "AIzaSy_fallback",
    authDomain: "fallback.firebaseapp.com",
    projectId: "fallback",
    appId: "1:000:web:000"
  });
}

const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
