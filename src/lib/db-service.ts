
import { db } from "./firebase";
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  getDoc
} from "firebase/firestore";
import { Section } from "./practice-data";

const SECTIONS_COLLECTION = "sections";

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

export const addSectionToDb = async (section: any) => {
  // Ensure we don't save firebaseId as a field inside the document
  const { firebaseId, ...data } = section;
  return await addDoc(collection(db, SECTIONS_COLLECTION), data);
};

export const updateSectionInDb = async (firebaseId: string, section: Partial<Section>) => {
  const { firebaseId: _, ...data } = section;
  const sectionRef = doc(db, SECTIONS_COLLECTION, firebaseId);
  return await updateDoc(sectionRef, data);
};

export const deleteSectionFromDb = async (firebaseId: string) => {
  const sectionRef = doc(db, SECTIONS_COLLECTION, firebaseId);
  return await deleteDoc(sectionRef);
};
