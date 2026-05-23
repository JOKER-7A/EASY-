import { db } from "./firebase";
import { 
  collection, 
  getDocs, 
  doc, 
  serverTimestamp,
  query,
  where,
  setDoc,
  getDoc,
  orderBy,
  limit,
  updateDoc,
  increment
} from "firebase/firestore";
import { Section, Question, sections as staticSections } from "./practice-data";

/**
 * جلب النماذج مع نظام حماية "Anti-Crash"
 * يضمن دائماً عودة بيانات سليمة حتى لو فشل Firestore
 */
export const getSectionsFromDb = async (): Promise<Section[]> => {
  try {
    const sectionsRef = collection(db, "sections");
    const querySnapshot = await getDocs(sectionsRef);
    
    let dbSections: Section[] = [];
    if (!querySnapshot.empty) {
      dbSections = querySnapshot.docs.map(doc => ({
        firebaseId: doc.id,
        ...doc.data()
      } as any));
    }
    
    // دمج النماذج الثابتة مع نماذج قاعدة البيانات لضمان عدم وجود صفحة فارغة
    const combined = [...dbSections];
    staticSections.forEach(s => {
      if (!combined.find(c => Number(c.id) === Number(s.id))) {
        combined.push(s);
      }
    });
    
    return combined.sort((a, b) => Number(b.id) - Number(a.id));
  } catch (error) {
    console.warn("Using fail-safe static sections", error);
    return [...staticSections];
  }
};

/**
 * جلب الملف الشخصي بأسلوب "Zero-Error"
 */
export const getUserProfile = async (userId: string, email?: string) => {
  if (!userId) return null;
  try {
    const userRef = doc(db, "userProfiles", userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const data = userSnap.data();
      return { 
        id: userSnap.id, 
        ...data,
        displayName: data.displayName || email?.split('@')[0] || 'مستكشف EASY',
        level: data.level || 1,
        xp: data.xp || 0
      };
    } else {
      const initialProfile = {
        level: 1,
        xp: 0,
        totalCorrect: 0,
        displayName: email?.split('@')[0] || 'مستكشف EASY',
        email: email || '',
        createdAt: serverTimestamp(),
        lastActive: serverTimestamp(),
        status: 'student'
      };
      await setDoc(userRef, initialProfile);
      return { id: userId, ...initialProfile };
    }
  } catch (error) {
    return { 
      id: userId, 
      level: 1, 
      xp: 0, 
      displayName: 'مستكشف EASY', 
      status: 'student' 
    };
  }
};

export const saveAttemptToDb = async (userId: string | undefined, attempt: any) => {
  try {
    const data = { ...attempt, userId: userId || 'anonymous', createdAt: serverTimestamp() };
    await setDoc(doc(collection(db, "attempts")), data);
    if (userId) {
      const userRef = doc(db, "userProfiles", userId);
      updateDoc(userRef, {
        xp: increment(attempt.correctCount * 10),
        totalCorrect: increment(attempt.correctCount),
        lastActive: serverTimestamp()
      }).catch(() => {});
    }
  } catch (error) {
    console.error("Save attempt failed silently");
  }
};

export const getLeaderboard = async () => {
  try {
    const q = query(collection(db, "userProfiles"), orderBy("xp", "desc"), limit(5));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) { 
    return []; 
  }
};

export const getErrorLogs = async (userId: string) => {
  try {
    const q = query(collection(db, "errorLogs"), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
  } catch (error) { 
    return []; 
  }
};

export const saveErrorLogToDb = async (userId: string, question: Question, sectionTitle: string) => {
  try {
    const errorId = `${userId}_${question.id}`;
    setDoc(doc(db, "errorLogs", errorId), {
      userId,
      questionId: question.id,
      questionData: { ...question, sectionTitle },
      lastOccurred: serverTimestamp(),
      count: increment(1)
    }, { merge: true }).catch(() => {});
  } catch (error) {
    // فشل صامت
  }
};

export const toggleFavoriteInDb = async (userId: string, question: Question) => {
  try {
    const userRef = doc(db, "userProfiles", userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return false;
    
    const data = userSnap.data();
    const favorites = data.favorites || [];
    const exists = favorites.find((f: any) => f.id === question.id);
    
    if (exists) {
      const newFavs = favorites.filter((f: any) => f.id !== question.id);
      await updateDoc(userRef, { favorites: newFavs });
      return false;
    } else {
      const newFavs = [...favorites, question];
      await updateDoc(userRef, { favorites: newFavs });
      return true;
    }
  } catch (error) { 
    return false; 
  }
};