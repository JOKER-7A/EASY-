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
  increment,
  deleteDoc,
  addDoc,
  Timestamp,
  arrayUnion,
  arrayRemove
} from "firebase/firestore";
import { Section, Question, sections as staticSections } from "./practice-data";

// المالك الجذري للمنصة - أعلى سلطة تقنية وإدارية لا يمكن المساس بها
const ROOT_OWNER_EMAIL = 'joker7a10@gmail.com';

/**
 * ترتيب الرتب تصاعدياً من الأقل للأعلى
 */
const ROLE_HIERARCHY: Record<string, number> = {
  'user': 0,
  'helper': 1,
  'editor': 2,
  'admin': 3,
  'superAdmin': 4,
  'owner': 5,
  'rootOwner': 6
};

export const canManageRole = (currentUserRole: string | undefined, targetUserRole: string | undefined) => {
  const curRole = currentUserRole || 'user';
  const tarRole = targetUserRole || 'user';
  
  if (curRole === 'rootOwner') return true;
  const currentPower = ROLE_HIERARCHY[curRole] || 0;
  const targetPower = ROLE_HIERARCHY[tarRole] || 0;
  if (tarRole === 'rootOwner') return false;
  return currentPower > targetPower;
};

/**
 * جلب الأقسام من قاعدة البيانات مع دمجها مع الأقسام الثابتة
 */
export const getSectionsFromDb = async (): Promise<Section[]> => {
  try {
    const sectionsRef = collection(db, "sections");
    const querySnapshot = await getDocs(sectionsRef);
    
    let dbSections: Section[] = [];
    if (!querySnapshot.empty) {
      dbSections = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          firebaseId: doc.id,
          ...data,
          createdAt: data.createdAt || Timestamp.now()
        } as any;
      });
    }
    
    const archivedIds = [216, 217, 218, 219];
    
    const combined = [...dbSections];
    if (Array.isArray(staticSections)) {
      staticSections.forEach(s => {
        if (!combined.find(c => Number(c.id) === Number(s.id)) && !archivedIds.includes(Number(s.id))) {
          combined.push({
            ...s,
            createdAt: Timestamp.fromDate(new Date('2024-01-01'))
          });
        }
      });
    }
    
    return combined
      .filter(s => s && s.id && !archivedIds.includes(Number(s.id)))
      .sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
  } catch (error) {
    console.error("Error in getSectionsFromDb:", error);
    const archivedIds = [216, 217, 218, 219];
    return (staticSections || [])
      .filter(s => s && s.id && !archivedIds.includes(Number(s.id)))
      .map(s => ({ ...s, createdAt: Timestamp.fromDate(new Date('2024-01-01')) }))
      .sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
  }
};

export const updateSectionInDb = async (firebaseId: string, sectionData: any) => {
  if (!firebaseId) return false;
  try {
    const sectionRef = doc(db, "sections", firebaseId);
    await updateDoc(sectionRef, {
      ...sectionData,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (e) {
    throw e;
  }
};

export const getTemplatesFromDb = async () => {
  try {
    const templatesRef = collection(db, "sectionTemplates");
    const snapshot = await getDocs(query(templatesRef, orderBy("createdAt", "desc")));
    return snapshot.docs.map(doc => ({ firebaseId: doc.id, ...doc.data() }));
  } catch (e) {
    return [];
  }
};

export const saveTemplateToDb = async (template: any) => {
  try {
    const templatesRef = collection(db, "sectionTemplates");
    const data = { 
      ...template, 
      isTemplate: true, 
      createdAt: serverTimestamp() 
    };
    const docRef = await addDoc(templatesRef, data);
    return docRef.id;
  } catch (e) {
    throw e;
  }
};

export const updateTemplateInDb = async (firebaseId: string, templateData: any) => {
  if (!firebaseId) return false;
  try {
    const templateRef = doc(db, "sectionTemplates", firebaseId);
    await updateDoc(templateRef, {
      ...templateData,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (e) {
    throw e;
  }
};

export const deleteTemplateFromDb = async (templateId: string) => {
  if (!templateId) return;
  try {
    await deleteDoc(doc(db, "sectionTemplates", templateId));
  } catch (e) {}
};

export const updateUserXP = async (userId: string, isCorrect: boolean) => {
  if (!userId) return;
  try {
    const userRef = doc(db, "userProfiles", userId);
    const xpGain = isCorrect ? 10 : 5;
    
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const userData = userSnap.data();
      const currentXp = (userData.xp || 0) + xpGain;
      const newLevel = Math.floor(currentXp / 500) + 1;
      
      await updateDoc(userRef, {
        xp: currentXp,
        level: newLevel
      });
      return { xp: currentXp, level: newLevel };
    }
  } catch (e) {}
};

export const getUserProfile = async (userId: string, email?: string) => {
  if (!userId) return null;
  try {
    const userRef = doc(db, "userProfiles", userId);
    const userSnap = await getDoc(userRef);
    
    const lowerEmail = (email || '').toLowerCase().trim();
    const isRootOwner = lowerEmail === ROOT_OWNER_EMAIL.toLowerCase();

    if (userSnap.exists()) {
      const userData = userSnap.data();
      if (isRootOwner && userData.role !== 'rootOwner') {
        await updateDoc(userRef, { role: 'rootOwner', status: 'approved' });
        return { id: userSnap.id, ...userData, role: 'rootOwner', status: 'approved' };
      }
      return { id: userSnap.id, ...userData };
    } else {
      const initialProfile = {
        level: 1,
        xp: 0,
        displayName: '', 
        phoneNumber: '', 
        email: lowerEmail,
        createdAt: serverTimestamp(),
        status: isRootOwner ? 'approved' : 'onboarding', 
        role: isRootOwner ? 'rootOwner' : 'user',
        favorites: [],
        isBanned: false,
        theme: '262.1 83.3% 57.8%'
      };
      await setDoc(userRef, initialProfile);
      return { id: userId, ...initialProfile };
    }
  } catch (error) {
    console.error("Error in getUserProfile:", error);
    return { id: userId, level: 1, xp: 0, displayName: 'مستكشف EASY', role: 'user', status: 'approved' };
  }
};

export const updateOnboardingData = async (userId: string, name: string, phone: string) => {
  if (!userId) return false;
  try {
    const userRef = doc(db, "userProfiles", userId);
    await updateDoc(userRef, {
      displayName: name || 'مستكشف جديد',
      phoneNumber: phone || '',
      status: 'pending' 
    });
    return true;
  } catch (e) {
    return false;
  }
};

export const updateUserStatus = async (userId: string, status: 'approved' | 'rejected' | 'pending' | 'onboarding') => {
  if (!userId) return false;
  try {
    const userSnap = await getDoc(doc(db, "userProfiles", userId));
    if (userSnap.exists() && userSnap.data().role === 'rootOwner') return false;
    
    const userRef = doc(db, "userProfiles", userId);
    await updateDoc(userRef, { status });
    return true;
  } catch (e) {
    return false;
  }
};

export const updateUserRole = async (userId: string, role: string) => {
  if (!userId) return false;
  try {
    const userSnap = await getDoc(doc(db, "userProfiles", userId));
    if (userSnap.exists() && userSnap.data().role === 'rootOwner') return false;
    
    const userRef = doc(db, "userProfiles", userId);
    await updateDoc(userRef, { 
      role,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (e) {
    return false;
  }
};

export const getAdminsFromDb = async () => {
  try {
    const q = query(
      collection(db, "userProfiles"), 
      where("role", "in", ["rootOwner", "owner", "superAdmin", "admin", "editor", "helper"])
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    return [];
  }
};

export const saveAttemptToDb = async (userId: string | undefined, attempt: any) => {
  if (!userId) return;
  try {
    const data = { ...attempt, userId: userId || 'anonymous', createdAt: serverTimestamp() };
    await addDoc(collection(db, "attempts"), data);
  } catch (e) {}
};

export const saveErrorLogToDb = async (userId: string, question: Question, sectionTitle: string, userAnswer: string) => {
  if (!userId || !question?.id) return;
  try {
    const safeQId = String(question.id).replace(/[^a-zA-Z0-9_]/g, '_');
    const errorId = `err_${userId}_${safeQId}`;
    const errorRef = doc(db, "errorLogs", errorId);

    const errorData = {
      userId: String(userId),
      questionId: String(question.id),
      userAnswer: String(userAnswer || ''),
      questionData: { 
        id: String(question.id),
        question: String(question.question || ''),
        options: Array.isArray(question.options) ? question.options.map(String) : [],
        correct: String(question.correct || ''),
        type: String(question.type || 'analogy'),
        sectionTitle: String(sectionTitle || 'غير محدد')
      },
      lastOccurred: serverTimestamp(),
      count: increment(1)
    };

    await setDoc(errorRef, errorData, { merge: true });
  } catch (e) {
    console.error("Critical error saving error log:", e);
  }
};

export const getErrorLogs = async (userId: string) => {
  if (!userId) return [];
  try {
    const q = query(
      collection(db, "errorLogs"), 
      where("userId", "==", userId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a: any, b: any) => {
        const timeA = a.lastOccurred?.toMillis?.() || 0;
        const timeB = b.lastOccurred?.toMillis?.() || 0;
        return timeB - timeA;
      });
  } catch (e) { 
    return []; 
  }
};

export const deleteErrorLog = async (logId: string) => {
  if (!logId) return false;
  try {
    await deleteDoc(doc(db, "errorLogs", logId));
    return true;
  } catch (e) { return false; }
};

export const toggleFavoriteInDb = async (userId: string, question: Question, sectionTitle: string) => {
  if (!userId || !question?.id) return false;
  try {
    const userRef = doc(db, "userProfiles", userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return false;
    
    const currentFavorites = userSnap.data().favorites || [];
    const existingIndex = currentFavorites.findIndex((f: any) => String(f.id) === String(question.id));
    
    if (existingIndex !== -1) {
      const updatedFavorites = currentFavorites.filter((f: any) => String(f.id) !== String(question.id));
      await updateDoc(userRef, {
        favorites: updatedFavorites
      });
      return false;
    } else {
      const newFav = {
        id: String(question.id),
        question: String(question.question || ''),
        options: Array.isArray(question.options) ? question.options.map(String) : [],
        correct: String(question.correct || ''),
        type: String(question.type || 'analogy'),
        sectionTitle: String(sectionTitle || 'قسم تدريبي'),
        addedAt: new Date().toISOString()
      };
      
      const updatedFavorites = [...currentFavorites, newFav];
      await updateDoc(userRef, {
        favorites: updatedFavorites
      });
      return true;
    }
  } catch (e) { 
    console.error("Favorite sync error:", e);
    return false; 
  }
};

export const getLeaderboard = async () => {
  try {
    const q = query(collection(db, "userProfiles"), orderBy("xp", "desc"), limit(20));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) { return []; }
};

export const updateGlobalSetting = async (key: string, value: any) => {
  try {
    const settingsRef = doc(db, "appSettings", "global");
    await setDoc(settingsRef, { [key]: value }, { merge: true });
    return true;
  } catch (e) { return false; }
};

export const getGlobalSettings = async () => {
  try {
    const settingsRef = doc(db, "appSettings", "global");
    const snap = await getDoc(settingsRef);
    return snap.exists() ? snap.data() : {};
  } catch (e) { return {}; }
}
