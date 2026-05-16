
import { db } from "./firebase";
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy 
} from "firebase/firestore";
import { Section } from "./practice-data";

const SECTIONS_COLLECTION = "sections";

/**
 * جلب جميع الأقسام من قاعدة البيانات مرتبة حسب المعرف التنازلي
 */
export const getSectionsFromDb = async (): Promise<Section[]> => {
  try {
    const q = query(collection(db, SECTIONS_COLLECTION), orderBy("id", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      firebaseId: doc.id,
      ...doc.data()
    } as unknown as Section));
  } catch (error) {
    console.error("Error fetching sections:", error);
    return [];
  }
};

/**
 * إضافة قسم جديد لقاعدة البيانات
 */
export const addSectionToDb = async (section: any) => {
  const { firebaseId, ...data } = section;
  // التأكد من أن البيانات متوافقة مع Firestore
  const cleanData = {
    ...data,
    id: Number(data.id),
    questions: data.questions.map((q: any) => ({
      ...q,
      options: q.options.filter((o: string) => o.trim() !== '')
    }))
  };
  return await addDoc(collection(db, SECTIONS_COLLECTION), cleanData);
};

/**
 * حذف قسم من قاعدة البيانات
 */
export const deleteSectionFromDb = async (firebaseId: string) => {
  const sectionRef = doc(db, SECTIONS_COLLECTION, firebaseId);
  return await deleteDoc(sectionRef);
};
