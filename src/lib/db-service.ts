
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
  Timestamp
} from "firebase/firestore";
import { Section, Question, sections as staticSections } from "./practice-data";

/**
 * جلب الأقسام مع دمج البيانات واستبعاد الأقسام المؤرشفة (216-219)
 */
export const getSectionsFromDb = async (): Promise<Section[]> => {
  try {
    const sectionsRef = collection(db, "sections");
    const querySnapshot = await getDocs(sectionsRef);
    
    let dbSections: Section[] = [];
    if (!querySnapshot.empty) {
      dbSections = querySnapshot.docs.map(doc => ({
        firebaseId: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt || Timestamp.now()
      } as any));
    }
    
    // IDs المطلوب أرشفتها وإخفاؤها من القائمة الأساسية
    const archivedIds = [216, 217, 218, 219];
    
    const combined = [...dbSections];
    staticSections.forEach(s => {
      // لا تضف القسم إذا كان موجوداً في DB أو إذا كان من ضمن الـ IDs المطلوب إخفاؤها
      if (!combined.find(c => Number(c.id) === Number(s.id)) && !archivedIds.includes(Number(s.id))) {
        combined.push({
          ...s,
          createdAt: Timestamp.fromDate(new Date('2024-01-01'))
        });
      }
    });
    
    // تصفية نهائية للأقسام الحية فقط
    return combined
      .filter(s => !archivedIds.includes(Number(s.id)))
      .sort((a, b) => Number(b.id) - Number(a.id));
  } catch (error) {
    console.warn("Firestore error, falling back to static data", error);
    const archivedIds = [216, 217, 218, 219];
    return staticSections
      .filter(s => !archivedIds.includes(Number(s.id)))
      .map(s => ({ ...s, createdAt: Timestamp.fromDate(new Date('2024-01-01')) }));
  }
};

/**
 * تحديث قسم نشط في قاعدة البيانات
 */
export const updateSectionInDb = async (firebaseId: string, sectionData: any) => {
  try {
    const sectionRef = doc(db, "sections", firebaseId);
    await updateDoc(sectionRef, {
      ...sectionData,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (e) {
    console.error("Error updating section:", e);
    throw e;
  }
};

/**
 * نظام الأقسام الجاهزة (Templates)
 */
export const getTemplatesFromDb = async () => {
  try {
    const templatesRef = collection(db, "sectionTemplates");
    const snapshot = await getDocs(query(templatesRef, orderBy("createdAt", "desc")));
    return snapshot.docs.map(doc => ({ firebaseId: doc.id, ...doc.data() }));
  } catch (e) {
    console.error("Error fetching templates:", e);
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
    console.error("Error saving template:", e);
    throw e;
  }
};

/**
 * تحديث قالب جاهز
 */
export const updateTemplateInDb = async (firebaseId: string, templateData: any) => {
  try {
    const templateRef = doc(db, "sectionTemplates", firebaseId);
    await updateDoc(templateRef, {
      ...templateData,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (e) {
    console.error("Error updating template:", e);
    throw e;
  }
};

export const deleteTemplateFromDb = async (templateId: string) => {
  try {
    await deleteDoc(doc(db, "sectionTemplates", templateId));
  } catch (e) {
    console.error("Error deleting template:", e);
  }
};

/**
 * تحديث XP المستخدم فوراً عند الإجابة
 */
export const updateUserXP = async (userId: string, isCorrect: boolean) => {
  try {
    const userRef = doc(db, "userProfiles", userId);
    const xpGain = isCorrect ? 10 : 5;
    
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const currentXp = (userSnap.data().xp || 0) + xpGain;
      const newLevel = Math.floor(currentXp / 500) + 1;
      
      await updateDoc(userRef, {
        xp: currentXp,
        level: newLevel
      });
      return { xp: currentXp, level: newLevel };
    }
  } catch (e) {
    console.error("Error updating XP:", e);
  }
};

/**
 * إدارة ملف المستخدم
 */
export const getUserProfile = async (userId: string, email?: string) => {
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
        displayName: '', 
        phoneNumber: '', 
        email: email || '',
        createdAt: serverTimestamp(),
        status: 'pending', 
        role: email === 'admin@easy.com' ? 'owner' : 'student',
        favorites: [],
        isBanned: false,
        theme: '270 95% 60%'
      };
      await setDoc(userRef, initialProfile);
      return { id: userId, ...initialProfile };
    }
  } catch (error) {
    return { id: userId, level: 1, xp: 0, displayName: 'مستكشف EASY' };
  }
};

/**
 * تحديث بيانات المستخدم (Onboarding)
 */
export const updateOnboardingData = async (userId: string, name: string, phone: string) => {
  try {
    const userRef = doc(db, "userProfiles", userId);
    await updateDoc(userRef, {
      displayName: name,
      phoneNumber: phone,
      status: 'pending' 
    });
    return true;
  } catch (e) {
    console.error("Error updating onboarding data:", e);
    return false;
  }
};

/**
 * تحديث حالة الموافقة للمستخدم
 */
export const updateUserStatus = async (userId: string, status: 'approved' | 'rejected' | 'pending') => {
  try {
    const userRef = doc(db, "userProfiles", userId);
    await updateDoc(userRef, { status });
    return true;
  } catch (e) {
    console.error("Error updating user status:", e);
    return false;
  }
};

/**
 * تحديث دور المستخدم (Role)
 */
export const updateUserRole = async (userId: string, role: string) => {
  try {
    const userRef = doc(db, "userProfiles", userId);
    await updateDoc(userRef, { 
      role,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (e) {
    console.error("Error updating user role:", e);
    return false;
  }
};

/**
 * جلب قائمة المشرفين
 */
export const getAdminsFromDb = async () => {
  try {
    const q = query(collection(db, "userProfiles"), where("role", "in", ["owner", "superAdmin", "admin"]));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    console.error("Error fetching admins:", e);
    return [];
  }
};

/**
 * تسجيل المحاولات
 */
export const saveAttemptToDb = async (userId: string | undefined, attempt: any) => {
  try {
    const data = { ...attempt, userId: userId || 'anonymous', createdAt: serverTimestamp() };
    await setDoc(doc(collection(db, "attempts")), data);
  } catch (e) {
    console.error("Error saving attempt:", e);
  }
};

/**
 * نظام سجل الأخطاء الدائم
 */
export const saveErrorLogToDb = async (userId: string, question: Question, sectionTitle: string, userAnswer: string) => {
  try {
    const errorId = `${userId}_${question.id}`;
    await setDoc(doc(db, "errorLogs", errorId), {
      userId,
      questionId: question.id,
      userAnswer,
      questionData: { 
        id: question.id,
        question: question.question,
        options: question.options,
        correct: question.correct,
        type: question.type,
        sectionTitle 
      },
      lastOccurred: serverTimestamp(),
      count: increment(1)
    }, { merge: true });
  } catch (e) {
    console.error("Error saving error log:", e);
  }
};

export const getErrorLogs = async (userId: string) => {
  try {
    const q = query(
      collection(db, "errorLogs"), 
      where("userId", "==", userId),
      orderBy("lastOccurred", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) { 
    console.error("Error fetching error logs:", e);
    return []; 
  }
};

export const deleteErrorLog = async (logId: string) => {
  try {
    await deleteDoc(doc(db, "errorLogs", logId));
    return true;
  } catch (e) { return false; }
};

/**
 * نظام المفضلة (Favorites)
 */
export const toggleFavoriteInDb = async (userId: string, question: Question, sectionTitle: string) => {
  try {
    const userRef = doc(db, "userProfiles", userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return false;
    
    const favorites = userSnap.data().favorites || [];
    const existsIndex = favorites.findIndex((f: any) => f.id === question.id);
    
    if (existsIndex > -1) {
      const updated = favorites.filter((f: any) => f.id !== question.id);
      await updateDoc(userRef, { favorites: updated });
      return false;
    } else {
      const newFav = {
        id: question.id,
        question: question.question,
        options: question.options,
        correct: question.correct,
        type: question.type,
        sectionTitle,
        addedAt: new Date().toISOString()
      };
      const updated = [...favorites, newFav];
      await updateDoc(userRef, { favorites: updated });
      return true;
    }
  } catch (e) { 
    console.error("Error toggling favorite:", e);
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
