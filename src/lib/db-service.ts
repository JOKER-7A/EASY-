import { db } from "./firebase";
import { 
  collection, 
  getDocs, 
  addDoc, 
  doc, 
  deleteDoc,
  serverTimestamp
} from "firebase/firestore";
import { Section } from "./practice-data";

const SECTIONS_COLLECTION = "sections";
const ATTEMPTS_COLLECTION = "attempts";

export const getSectionsFromDb = async (): Promise<Section[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, SECTIONS_COLLECTION));
    const sections = querySnapshot.docs.map(doc => ({
      firebaseId: doc.id,
      ...doc.data()
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

/**
 * حفظ محاولة اختبار جديدة في Firestore
 */
export const saveAttemptToDb = async (attempt: {
  sectionId: number | string;
  mode: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  durationSeconds: number;
  answers: Record<string, string>;
}) => {
  try {
    return await addDoc(collection(db, ATTEMPTS_COLLECTION), {
      ...attempt,
      startedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error saving attempt:", error);
  }
};
