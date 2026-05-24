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
 * دالة جلب الأقسام: تضمن العودة بالبيانات الثابتة في حالة فشل الاتصال
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
    
    // دمج البيانات من Firestore مع البيانات الثابتة لضمان عدم وجود فراغ
    const combined = [...dbSections];
    staticSections.forEach(s => {
      if (!combined.find(c => Number(c.id) === Number(s.id))) {
        combined.push(s);
      }
    });
    
    return combined.sort((a, b) => Number(b.id) - Number(a.id));
  } catch (error) {
    console.warn("Firestore error, falling back to static data", error);
    return [...staticSections];
  }
};

/**
 * جلب أو إنشاء ملف المستخدم
 */
export const getUserProfile = async (userId: string, email?: string) => {
  if (!userId) return null;
  try {
    const userRef = doc(db, "userProfiles", userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return { id: userSnap.id, ...userSnap.data() };
    } else {
      const initialProfile = {
        level: 1,
        xp: 0,
        displayName: email?.split('@')[0] || 'مستكشف EASY',
        email: email || '',
        createdAt: serverTimestamp(),
        status: 'student',
        favorites: [],
        isBanned: false
      };
      await setDoc(userRef, initialProfile);
      return { id: userId, ...initialProfile };
    }
  } catch (error) {
    return { id: userId, level: 1, xp: 0, displayName: 'مستكشف EASY' };
  }
};

export const saveAttemptToDb = async (userId: string | undefined, attempt: any) => {
  try {
    const data = { ...attempt, userId: userId || 'anonymous', createdAt: serverTimestamp() };
    await setDoc(doc(collection(db, "attempts")), data);
    
    // Update XP and Level
    if (userId) {
      const userRef = doc(db, "userProfiles", userId);
      const xpGain = attempt.score > 80 ? 100 : 50;
      await updateDoc(userRef, {
        xp: increment(xpGain),
        level: increment(attempt.score === 100 ? 1 : 0)
      });
    }
  } catch (e) {}
};

export const getLeaderboard = async () => {
  try {
    const q = query(collection(db, "userProfiles"), orderBy("xp", "desc"), limit(20));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) { return []; }
};

export const getErrorLogs = async (userId: string) => {
  try {
    const q = query(collection(db, "errorLogs"), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
  } catch (e) { return []; }
};

export const saveErrorLogToDb = async (userId: string, question: Question, sectionTitle: string) => {
  try {
    const errorId = `${userId}_${question.id}`;
    await setDoc(doc(db, "errorLogs", errorId), {
      userId,
      questionId: question.id,
      questionData: { ...question, sectionTitle },
      lastOccurred: serverTimestamp(),
      count: increment(1)
    }, { merge: true });
  } catch (e) {}
};

export const toggleFavoriteInDb = async (userId: string, question: Question) => {
  try {
    const userRef = doc(db, "userProfiles", userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return false;
    
    const favorites = userSnap.data().favorites || [];
    const exists = favorites.find((f: any) => f.id === question.id);
    
    if (exists) {
      const updated = favorites.filter((f: any) => f.id !== question.id);
      await updateDoc(userRef, { favorites: updated });
      return false;
    } else {
      const updated = [...favorites, question];
      await updateDoc(userRef, { favorites: updated });
      return true;
    }
  } catch (e) { return false; }
};