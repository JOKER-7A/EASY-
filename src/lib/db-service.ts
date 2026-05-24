
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
  increment,
  deleteDoc,
  Timestamp
} from "firebase/firestore";
import { Section, Question, sections as staticSections } from "./practice-data";

/**
 * جلب الأقسام مع دمج البيانات الثابتة والمرفوعة
 */
export const getSectionsFromDb = async (): Promise<Section[]> => {
  try {
    const sectionsRef = collection(db, "sections");
    const querySnapshot = await getDocs(sectionsRef);
    
    let dbSections: Section[] = [];
    if (!querySnapshot.empty) {
      dbSections = querySnapshot.docs.map(doc => ({
        firebaseId: doc.id,
        ...doc.data(),
        // تحويل تاريخ الإنشاء إذا كان موجوداً أو وضع تاريخ افتراضي قديم للبيانات الثابتة
        createdAt: doc.data().createdAt || Timestamp.now()
      } as any));
    }
    
    const combined = [...dbSections];
    staticSections.forEach(s => {
      if (!combined.find(c => Number(c.id) === Number(s.id))) {
        combined.push({
          ...s,
          createdAt: Timestamp.fromDate(new Date('2024-01-01')) // تاريخ قديم للأقسام الثابتة
        });
      }
    });
    
    return combined.sort((a, b) => Number(b.id) - Number(a.id));
  } catch (error) {
    console.warn("Firestore error, falling back to static data", error);
    return staticSections.map(s => ({ ...s, createdAt: Timestamp.fromDate(new Date('2024-01-01')) }));
  }
};

/**
 * تحديث XP المستخدم فوراً عند الإجابة
 * +10 للصواب، +5 للخطأ
 */
export const updateUserXP = async (userId: string, isCorrect: boolean) => {
  try {
    const userRef = doc(db, "userProfiles", userId);
    const xpGain = isCorrect ? 10 : 5;
    
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const currentXp = (userSnap.data().xp || 0) + xpGain;
      const newLevel = Math.floor(currentXp / 500) + 1; // كل 500 نقطة مستوى جديد
      
      await updateDoc(userRef, {
        xp: currentXp,
        level: newLevel
      });
      return { xp: currentXp, level: newLevel };
    }
  } catch (e) {
    console.error("Error updating XP:", e);
  }
};

/**
 * إدارة ملف المستخدم والسمات (Themes)
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
        isBanned: false,
        theme: '270 95% 60%'
      };
      await setDoc(userRef, initialProfile);
      return { id: userId, ...initialProfile };
    }
  } catch (error) {
    return { id: userId, level: 1, xp: 0, displayName: 'مستكشف EASY' };
  }
};

/**
 * تسجيل المحاولات
 */
export const saveAttemptToDb = async (userId: string | undefined, attempt: any) => {
  try {
    const data = { ...attempt, userId: userId || 'anonymous', createdAt: serverTimestamp() };
    await setDoc(doc(collection(db, "attempts")), data);
  } catch (e) {
    console.error("Error saving attempt:", e);
  }
};

/**
 * نظام سجل الأخطاء الدائم
 */
export const saveErrorLogToDb = async (userId: string, question: Question, sectionTitle: string, userAnswer: string) => {
  try {
    const errorId = `${userId}_${question.id}`;
    await setDoc(doc(db, "errorLogs", errorId), {
      userId,
      questionId: question.id,
      userAnswer,
      questionData: { 
        id: question.id,
        question: question.question,
        options: question.options,
        correct: question.correct,
        type: question.type,
        sectionTitle 
      },
      lastOccurred: serverTimestamp(),
      count: increment(1)
    }, { merge: true });
  } catch (e) {
    console.error("Error saving error log:", e);
  }
};

export const getErrorLogs = async (userId: string) => {
  try {
    const q = query(
      collection(db, "errorLogs"), 
      where("userId", "==", userId),
      orderBy("lastOccurred", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) { 
    console.error("Error fetching error logs:", e);
    return []; 
  }
};

export const deleteErrorLog = async (logId: string) => {
  try {
    await deleteDoc(doc(db, "errorLogs", logId));
    return true;
  } catch (e) { return false; }
};

/**
 * نظام المفضلة (Favorites)
 */
export const toggleFavoriteInDb = async (userId: string, question: Question, sectionTitle: string) => {
  try {
    const userRef = doc(db, "userProfiles", userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return false;
    
    const favorites = userSnap.data().favorites || [];
    const existsIndex = favorites.findIndex((f: any) => f.id === question.id);
    
    if (existsIndex > -1) {
      const updated = favorites.filter((f: any) => f.id !== question.id);
      await updateDoc(userRef, { favorites: updated });
      return false; // Removed
    } else {
      const newFav = {
        id: question.id,
        question: question.question,
        options: question.options,
        correct: question.correct,
        type: question.type,
        sectionTitle,
        addedAt: new Date().toISOString()
      };
      const updated = [...favorites, newFav];
      await updateDoc(userRef, { favorites: updated });
      return true; // Added
    }
  } catch (e) { 
    console.error("Error toggling favorite:", e);
    return false; 
  }
};

export const getLeaderboard = async () => {
  try {
    const q = query(collection(db, "userProfiles"), orderBy("xp", "desc"), limit(20));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) { return []; }
};
