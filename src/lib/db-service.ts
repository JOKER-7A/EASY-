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

export const getSectionsFromDb = async (): Promise<Section[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, "sections"));
    if (querySnapshot.empty) return [...staticSections];
    
    const dbSections = querySnapshot.docs.map(doc => ({
      firebaseId: doc.id,
      ...doc.data()
    } as any));
    
    const combined = [...dbSections];
    staticSections.forEach(s => {
      if (!combined.find(c => Number(c.id) === Number(s.id))) {
        combined.push(s);
      }
    });
    
    return combined.sort((a, b) => Number(b.id) - Number(a.id));
  } catch (error) {
    console.error("Database Error (Sections):", error);
    return [...staticSections];
  }
};

export const getUserProfile = async (userId: string, email?: string, displayName?: string) => {
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
        totalCorrect: 0,
        displayName: displayName || email?.split('@')[0] || 'مستكشف EASY',
        email: email || '',
        createdAt: serverTimestamp(),
        lastActive: serverTimestamp(),
        status: 'student'
      };
      await setDoc(userRef, initialProfile);
      return { id: userId, ...initialProfile };
    }
  } catch (error) {
    console.error("Database Error (Profile):", error);
    return { 
      id: userId, 
      level: 1, 
      xp: 0, 
      displayName: displayName || 'مستكشف', 
      status: 'student',
      isFallback: true 
    };
  }
};

export const saveAttemptToDb = async (userId: string | undefined, attempt: any) => {
  try {
    const data = { ...attempt, userId: userId || 'anonymous', createdAt: serverTimestamp() };
    await setDoc(doc(collection(db, "attempts")), data);
    if (userId) {
      const userRef = doc(db, "userProfiles", userId);
      await updateDoc(userRef, {
        xp: increment(attempt.correctCount * 10),
        totalCorrect: increment(attempt.correctCount),
        lastActive: serverTimestamp()
      });
    }
  } catch (error) {
    console.error("Database Error (Attempt):", error);
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
    await setDoc(doc(db, "errorLogs", errorId), {
      userId,
      questionId: question.id,
      questionData: { ...question, sectionTitle },
      lastOccurred: serverTimestamp(),
      count: increment(1)
    }, { merge: true });
  } catch (error) {
    console.error("Database Error (ErrorLog):", error);
  }
};