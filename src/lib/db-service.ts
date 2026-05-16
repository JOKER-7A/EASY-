
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

export const getSectionsFromDb = async (): Promise<Section[]> => {
  const q = query(collection(db, SECTIONS_COLLECTION), orderBy("id", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    firebaseId: doc.id,
    ...doc.data()
  } as unknown as Section));
};

export const addSectionToDb = async (section: Omit<Section, "id"> & { id: number }) => {
  return await addDoc(collection(db, SECTIONS_COLLECTION), section);
};

export const updateSectionInDb = async (firebaseId: string, section: Partial<Section>) => {
  const sectionRef = doc(db, SECTIONS_COLLECTION, firebaseId);
  return await updateDoc(sectionRef, section);
};

export const deleteSectionFromDb = async (firebaseId: string) => {
  const sectionRef = doc(db, SECTIONS_COLLECTION, firebaseId);
  return await deleteDoc(sectionRef);
};
