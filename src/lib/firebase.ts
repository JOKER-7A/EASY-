import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA03wd1TNE1_h1ubA48fBIswPUV1KxH0Cc",
  authDomain: "easy-8e5ee.firebaseapp.com",
  projectId: "easy-8e5ee",
  storageBucket: "easy-8e5ee.firebasestorage.app",
  messagingSenderId: "698116507939",
  appId: "1:698116507939:web:389055c6223cbcd7cfa496"
};

// تهيئة التطبيق بشكل آمن يمنع التكرار ويضمن استقرار السيرفر والمتصفح
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const db: Firestore = getFirestore(app);
const auth: Auth = getAuth(app);

export { db, auth };
