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

export const getSectionsFromDb = async (): Promise<Section[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, SECTIONS_COLLECTION));
    const dbSections = querySnapshot.docs.map(doc => ({
      firebaseId: doc.id,
      ...(doc.data() as any)
    } as unknown as Section));
    
    const combined = [...dbSections];
    staticSections.forEach(s => {
      if (!combined.find(c => Number(c.id) === Number(s.id))) {
        combined.push(s);
      }
    });
    
    return combined.sort((a, b) => Number(b.id) - Number(a.id));
  } catch (error) {
    console.error("Error fetching sections:", error);
    return [...staticSections].sort((a, b) => Number(b.id) - Number(a.id));
  }
};

export const getUserProfile = async (userId: string, email?: string, displayName?: string) => {
  if (!userId) return null;
  try {
    const userRef = doc(db, USER_PROFILES, userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return { id: userSnap.id, ...userSnap.data() };
    } else {
      const initialProfile = {
        level: 1,
        xp: 0,
        totalCorrect: 0,
        favorites: [],
        displayName: displayName || 'مستكشف EASY',
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

export const saveAttemptToDb = async (userId: string | undefined, attempt: any) => {
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
  } catch (error) {}
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
  } catch (error) {}
};

export const getLeaderboard = async () => {
  try {
    const snapshot = await getDocs(collection(db, USER_PROFILES));
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })).sort((a: any, b: any) => (b.xp || 0) - (a.xp || 0)).slice(0, 5);
  } catch (error) {
    return [];
  }
};

export const saveErrorLogToDb = async (userId: string, question: Question, sectionTitle: string) => {
  try {
    const errorId = `${userId}_${question.id}`;
    const errorRef = doc(db, ERROR_LOGS, errorId);
    await setDoc(errorRef, {
      userId,
      questionId: question.id,
      questionData: { ...question, sectionTitle },
      lastOccurred: serverTimestamp(),
      count: increment(1)
    }, { merge: true });
  } catch (error) {}
};

export const getErrorLogs = async (userId: string) => {
  try {
    const q = query(collection(db, ERROR_LOGS), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    return [];
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
      await updateDoc(userRef, { favorites: arrayRemove(exists) });
      return false;
    } else {
      await updateDoc(userRef, { favorites: arrayUnion(question) });
      return true;
    }
  } catch (error) {
    return false;
  }
};

export const updateUserTheme = async (userId: string, theme: string) => {
  try {
    const userRef = doc(db, USER_PROFILES, userId);
    await updateDoc(userRef, { theme });
  } catch (error) {}
};

export const updateUserProfileName = async (userId: string, newName: string) => {
  try {
    const userRef = doc(db, USER_PROFILES, userId);
    await updateDoc(userRef, { displayName: newName });
  } catch (error) {}
};

export const isDisplayNameTaken = async (name: string, currentUserId: string): Promise<boolean> => {
  try {
    const q = query(collection(db, USER_PROFILES), where("displayName", "==", name));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.some(doc => doc.id !== currentUserId);
  } catch (error) {
    return false;
  }
};