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
    await addDoc(collection(db, ATTEMPTS_COLLECTION), data);
    
    if (userId) {
      await updateUserXP(userId, attempt.correctCount);
    }
  } catch (error) {
    console.error("Error saving attempt:", error);
  }
};

export const getUserProfile = async (userId: string, email?: string, displayName?: string) => {
  const userRef = doc(db, USER_PROFILES, userId);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    const data = userSnap.data();
    // Update email if it's missing or changed (for admin reference)
    if (email && data.email !== email) {
      await updateDoc(userRef, { email });
    }
    return { id: userSnap.id, ...data, email: email || data.email };
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
      lastActive: serverTimestamp()
    };
    await setDoc(userRef, initialProfile);
    return { id: userId, ...initialProfile };
  }
};

export const isDisplayNameTaken = async (name: string, currentUserId: string): Promise<boolean> => {
  const q = query(collection(db, USER_PROFILES), where("displayName", "==", name));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.some(doc => doc.id !== currentUserId);
};

export const updateUserXP = async (userId: string, correct: number) => {
  const userRef = doc(db, USER_PROFILES, userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return;
  
  const data = userSnap.data();
  const currentTotalXp = (data.xp || 0) + correct;
  const newLevel = Math.floor(currentTotalXp / 100) + 1;
  
  await updateDoc(userRef, {
    xp: currentTotalXp,
    level: newLevel,
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

export const updateUserTheme = async (userId: string, theme: string) => {
  const userRef = doc(db, USER_PROFILES, userId);
  return await updateDoc(userRef, { theme });
};

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

export const saveErrorLogToDb = async (userId: string, question: Question, sectionTitle: string) => {
  const errorId = `${userId}_${question.id}`;
  const errorRef = doc(db, ERROR_LOGS, errorId);
  
  const snap = await getDoc(errorRef);
  if (!snap.exists()) {
    await setDoc(errorRef, {
      userId,
      questionId: question.id,
      questionData: {
        ...question,
        sectionTitle
      },
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
    return querySnapshot.docs.map(doc => doc.data()).sort((a, b) => (b.lastOccurred?.seconds || 0) - (a.lastOccurred?.seconds || 0));
  } catch (error) {
    console.error("Error fetching logs:", error);
    return [];
  }
};

export const getLeaderboard = async () => {
  try {
    const q = query(
      collection(db, USER_PROFILES), 
      orderBy("level", "desc"), 
      orderBy("xp", "desc"),
      limit(50)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching leaderboard with index:", error);
    // Fallback in case of missing index
    const snapshot = await getDocs(collection(db, USER_PROFILES));
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })).sort((a: any, b: any) => {
      if ((b.level || 0) !== (a.level || 0)) return (b.level || 0) - (a.level || 0);
      return (b.xp || 0) - (a.xp || 0);
    }).slice(0, 50);
  }
};