import { db } from "./firebase";
import { 
  collection, 
  getDocs, 
  addDoc, 
  doc, 
  deleteDoc,
  serverTimestamp,
  query,
  where,
  setDoc,
  getDoc,
  orderBy,
  limit,
  updateDoc,
  increment,
  arrayUnion,
  arrayRemove
} from "firebase/firestore";
import { Section, Question, sections as staticSections } from "./practice-data";

const SECTIONS_COLLECTION = "sections";
const ATTEMPTS_COLLECTION = "attempts";
const USER_PROFILES = "userProfiles";
const ERROR_LOGS = "errorLogs";

/**
 * جلب الأقسام من قاعدة البيانات مع معالجة الأخطاء والترتيب التلقائي
 */
export const getSectionsFromDb = async (): Promise<Section[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, SECTIONS_COLLECTION));
    const dbSections = querySnapshot.docs.map(doc => ({
      firebaseId: doc.id,
      ...(doc.data() as any)
    } as unknown as Section));
    
    // دمج البيانات مع البيانات الثابتة لضمان وجود محتوى دائماً
    const combined = [...dbSections];
    staticSections.forEach(s => {
      if (!combined.find(c => Number(c.id) === Number(s.id))) {
        combined.push(s);
      }
    });
    
    // ترتيب الأقسام تنازلياً حسب المعرف (الأحدث أولاً)
    return combined.sort((a, b) => Number(b.id) - Number(a.id));
  } catch (error) {
    console.error("Error fetching sections from Firestore:", error);
    return staticSections.sort((a, b) => Number(b.id) - Number(a.id));
  }
};

export const addSectionToDb = async (section: any) => {
  try {
    const { firebaseId, ...data } = section;
    const cleanData = {
      ...data,
      id: Number(data.id),
      questions: (data.questions || []).map((q: any) => ({
        ...q,
        options: (q.options || []).filter((o: string) => o && o.trim() !== '')
      })),
      readingPassages: (data.readingPassages || []).map((p: any) => ({
        ...p,
        title: p.title || '',
        text: p.text || ''
      }))
    };
    return await addDoc(collection(db, SECTIONS_COLLECTION), cleanData);
  } catch (error) {
    console.error("Error adding section:", error);
    throw error;
  }
};

export const deleteSectionFromDb = async (firebaseId: string) => {
  try {
    const sectionRef = doc(db, SECTIONS_COLLECTION, firebaseId);
    return await deleteDoc(sectionRef);
  } catch (error) {
    console.error("Error deleting section:", error);
    throw error;
  }
};

export const saveAttemptToDb = async (userId: string | undefined, attempt: {
  sectionId: number | string;
  mode: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  durationSeconds: number;
  answers: Record<string, string>;
}) => {
  try {
    const data = {
      ...attempt,
      userId: userId || 'anonymous',
      createdAt: serverTimestamp(),
    };
    await addDoc(collection(db, ATTEMPTS_COLLECTION), data);
    
    if (userId) {
      await updateUserXP(userId, attempt.correctCount);
    }
  } catch (error) {
    console.error("Error saving attempt:", error);
  }
};

/**
 * جلب الملف الشخصي مع ضمان عدم التعليق (Safe Return)
 */
export const getUserProfile = async (userId: string, email?: string, displayName?: string) => {
  try {
    const userRef = doc(db, USER_PROFILES, userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const data = userSnap.data();
      return { id: userSnap.id, ...data };
    } else {
      const initialProfile = {
        level: 1,
        xp: 0,
        totalCorrect: 0,
        favorites: [],
        displayName: displayName || '',
        email: email || '',
        theme: 'default',
        createdAt: serverTimestamp(),
        lastActive: serverTimestamp(),
        status: 'approved'
      };
      await setDoc(userRef, initialProfile);
      return { id: userId, ...initialProfile };
    }
  } catch (error) {
    console.error("Error in getUserProfile:", error);
    return { 
      id: userId, 
      level: 1, 
      xp: 0, 
      displayName: displayName || 'مستكشف EASY',
      status: 'approved',
      favorites: [],
      theme: 'default'
    };
  }
};

export const isDisplayNameTaken = async (name: string, currentUserId: string): Promise<boolean> => {
  try {
    const q = query(collection(db, USER_PROFILES), where("displayName", "==", name));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.some(doc => doc.id !== currentUserId);
  } catch (error) {
    console.error("Error checking display name:", error);
    return false;
  }
};

export const updateUserXP = async (userId: string, correct: number) => {
  try {
    const userRef = doc(db, USER_PROFILES, userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;
    
    const data = userSnap.data();
    const currentTotalXp = (data.xp || 0) + (correct * 10);
    const newLevel = Math.floor(currentTotalXp / 100) + 1;
    
    await updateDoc(userRef, {
      xp: currentTotalXp,
      level: newLevel,
      totalCorrect: increment(correct),
      lastActive: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating XP:", error);
  }
};

export const getAllUserProfiles = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, USER_PROFILES));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching all profiles:", error);
    return [];
  }
};

export const updateUserProfileName = async (userId: string, newName: string) => {
  try {
    const userRef = doc(db, USER_PROFILES, userId);
    return await updateDoc(userRef, { displayName: newName });
  } catch (error) {
    console.error("Error updating name:", error);
    throw error;
  }
};

export const updateUserTheme = async (userId: string, theme: string) => {
  try {
    const userRef = doc(db, USER_PROFILES, userId);
    return await updateDoc(userRef, { theme });
  } catch (error) {
    console.error("Error updating theme:", error);
  }
};

export const toggleFavoriteInDb = async (userId: string, question: any) => {
  try {
    const userRef = doc(db, USER_PROFILES, userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return false;
    
    const favorites = userSnap.data().favorites || [];
    const exists = favorites.find((f: any) => f.id === question.id);
    
    if (exists) {
      await updateDoc(userRef, {
        favorites: arrayRemove(exists)
      });
      return false;
    } else {
      await updateDoc(userRef, {
        favorites: arrayUnion(question)
      });
      return true;
    }
  } catch (error) {
    console.error("Error toggling favorite:", error);
    return false;
  }
};

export const saveErrorLogToDb = async (userId: string, question: Question, sectionTitle: string) => {
  try {
    const errorId = `${userId}_${question.id}`;
    const errorRef = doc(db, ERROR_LOGS, errorId);
    
    await setDoc(errorRef, {
      userId,
      questionId: question.id,
      questionData: {
        ...question,
        sectionTitle
      },
      lastOccurred: serverTimestamp(),
      count: increment(1)
    }, { merge: true });
  } catch (error) {
    console.error("Error saving error log:", error);
  }
};

export const getErrorLogs = async (userId: string) => {
  try {
    const q = query(
      collection(db, ERROR_LOGS), 
      where("userId", "==", userId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs
      .map(doc => doc.data())
      .sort((a: any, b: any) => {
        const timeA = a.lastOccurred?.seconds || 0;
        const timeB = b.lastOccurred?.seconds || 0;
        return timeB - timeA;
      });
  } catch (error) {
    console.error("Error fetching logs:", error);
    return [];
  }
};

export const getLeaderboard = async () => {
  try {
    const snapshot = await getDocs(collection(db, USER_PROFILES));
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })).sort((a: any, b: any) => {
      if ((b.level || 0) !== (a.level || 0)) return (b.level || 0) - (a.level || 0);
      return (b.xp || 0) - (a.xp || 0);
    }).slice(0, 50);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return [];
  }
};
