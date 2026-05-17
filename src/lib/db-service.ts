
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
    // جلب البيانات بدون ترتيب معقد لتجنب أخطاء الفهرسة (Index errors) في البداية
    const querySnapshot = await getDocs(collection(db, SECTIONS_COLLECTION));
    const sections = querySnapshot.docs.map(doc => ({
      firebaseId: doc.id,
      ...doc.data()
    } as unknown as Section));
    
    // الترتيب برمجياً لضمان العمل دائماً
    return sections.sort((a, b) => b.id - a.id);
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

/**
 * حذف قسم من قاعدة البيانات
 */
export const deleteSectionFromDb = async (firebaseId: string) => {
  const sectionRef = doc(db, SECTIONS_COLLECTION, firebaseId);
  return await deleteDoc(sectionRef);
};
