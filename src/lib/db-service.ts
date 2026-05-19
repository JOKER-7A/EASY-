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
import { Section, Question } from "./practice-data";

const SECTIONS_COLLECTION = "sections";
const ATTEMPTS_COLLECTION = "attempts";
const USER_PROFILES = "userProfiles";
const ERROR_LOGS = "errorLogs";

export const getSectionsFromDb = async (): Promise<Section[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, SECTIONS_COLLECTION));
    const sections = querySnapshot.docs.map(doc => ({
      firebaseId: doc.id,
      ...(doc.data() as any)
    } as unknown as Section));
    return sections.sort((a, b) => Number(b.id) - Number(a.id));
  } catch (error) {
    console.error("Error fetching sections:", error);
    return [];
  }
};

export const addSectionToDb = async (section: any) => {
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
};

export const deleteSectionFromDb = async (firebaseId: string) => {
  const sectionRef = doc(db, SECTIONS_COLLECTION, firebaseId);
  return await deleteDoc(sectionRef);
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
    const docRef = await addDoc(collection(db, ATTEMPTS_COLLECTION), data);
    
    if (userId) {
      await updateUserXP(userId, attempt.correctCount, attempt.totalQuestions);
    }
    
    return docRef;
  } catch (error) {
    console.error("Error saving attempt:", error);
  }
};

// --- Level System (LV) ---
export const getUserProfile = async (userId: string, email?: string, displayName?: string) => {
  const userRef = doc(db, USER_PROFILES, userId);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    const data = userSnap.data();
    // Update email or display name if missing but provided
    if (email && !data.email) await updateDoc(userRef, { email });
    if (displayName && !data.displayName) await updateDoc(userRef, { displayName });
    return data;
  } else {
    const initialProfile = {
      level: 1,
      xp: 0,
      totalSolved: 0,
      totalCorrect: 0,
      favorites: [],
      displayName: displayName || 'مستكشف جديد',
      email: email || '',
      lastActive: serverTimestamp()
    };
    await setDoc(userRef, initialProfile);
    return initialProfile;
  }
};

export const updateUserXP = async (userId: string, correct: number, total: number) => {
  const userRef = doc(db, USER_PROFILES, userId);
  const xpEarned = (correct * 25) + (total * 5); 
  
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return;
  
  const data = userSnap.data();
  let newXp = (data.xp || 0) + xpEarned;
  let newLevel = data.level || 1;
  
  let xpRequired = newLevel * 500;
  while (newXp >= xpRequired) {
    newXp -= xpRequired;
    newLevel += 1;
    xpRequired = newLevel * 500;
  }
  
  await updateDoc(userRef, {
    xp: newXp,
    level: newLevel,
    totalSolved: increment(total),
    totalCorrect: increment(correct),
    lastActive: serverTimestamp()
  });
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
  const userRef = doc(db, USER_PROFILES, userId);
  return await updateDoc(userRef, { displayName: newName });
};

// --- Favorites ---
export const toggleFavoriteInDb = async (userId: string, question: any) => {
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
};

// --- Error Logs ---
export const saveErrorLogToDb = async (userId: string, question: Question) => {
  const errorId = `${userId}_${question.id}`;
  const errorRef = doc(db, ERROR_LOGS, errorId);
  
  const snap = await getDoc(errorRef);
  if (!snap.exists()) {
    await setDoc(errorRef, {
      userId,
      questionId: question.id,
      questionData: question,
      count: 1,
      lastOccurred: serverTimestamp()
    });
  } else {
    await updateDoc(errorRef, {
      count: increment(1),
      lastOccurred: serverTimestamp()
    });
  }
};

export const getErrorLogs = async (userId: string) => {
  try {
    const q = query(
      collection(db, ERROR_LOGS), 
      where("userId", "==", userId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data()).sort((a, b) => (b.count || 0) - (a.count || 0));
  } catch (error) {
    console.error("Error fetching logs:", error);
    return [];
  }
};

// --- Leaderboard ---
export const getLeaderboard = async () => {
  try {
    const q = query(
      collection(db, USER_PROFILES), 
      orderBy("level", "desc"), 
      limit(20)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    const snapshot = await getDocs(collection(db, USER_PROFILES));
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })).sort((a: any, b: any) => (b.level || 0) - (a.level || 0)).slice(0, 20);
  }
};