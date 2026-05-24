'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { 
  getSectionsFromDb, 
  getTemplatesFromDb, 
  saveTemplateToDb, 
  deleteTemplateFromDb,
  updateUserStatus,
  updateSectionInDb,
  updateTemplateInDb,
  getAdminsFromDb,
  updateUserRole,
  getUserProfile,
  updateGlobalSetting,
  getGlobalSettings,
  canManageRole
} from '@/lib/db-service';
import { 
  collection, getDocs, addDoc, doc, deleteDoc, updateDoc, serverTimestamp, query, orderBy, limit, where, onSnapshot
} from 'firebase/firestore';
import { Section, Question, ReadingPassage } from '@/lib/practice-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from "@/components/ui/dialog";
import { 
  Trash2, ShieldCheck, Database, Ban, AlertCircle, TrendingUp,
  XCircle, Lock, Edit2, History, Copy, Layers, Loader2, Search, FileText, UserCheck, X as XIcon, CheckCircle, PlusCircle, Save, BookOpen, Crown, Users, MessageCircle, Home, FilePlus, HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

const RoleBadgeUI = ({ role }: { role: string }) => {
  const badges: Record<string, React.ReactNode> = {
    'rootOwner': (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]" title="Root Owner">
        <span className="text-amber-500 drop-shadow-sm text-sm">👑</span>
        <span className="text-[10px] text-amber-500/60 font-black tracking-tighter">⚔️⚔️</span>
      </span>
    ),
    'owner': (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-amber-500/5 border border-amber-500/10" title="Owner">
        <span className="text-amber-500 text-sm">👑</span>
      </span>
    ),
    'superAdmin': (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20" title="Super Admin">
        <span className="text-blue-500 text-sm">🛡️</span>
        <span className="text-[10px] text-blue-500/60 font-black">⚔️</span>
      </span>
    ),
    'admin': (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-blue-500/5 border border-blue-500/10" title="Admin">
        <span className="text-blue-500 text-sm">🛡️</span>
      </span>
    ),
    'editor': (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-emerald-500/5 border border-emerald-500/10" title="Editor">
        <span className="text-emerald-500 text-sm">✏️</span>
      </span>
    ),
    'helper': (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-purple-500/5 border border-purple-500/10" title="Helper">
        <span className="text-purple-500 text-sm">🧩</span>
      </span>
    ),
  };
  return badges[role] ? <span className="mr-1 inline-block select-none">{badges[role]}</span> : null;
};

export default function AdminPage() {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string>('user');
  
  const [sections, setSections] = useState<Section[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [adminsList, setAdminsList] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [adminSearchEmail, setAdminSearchEmail] = useState('');
  const [whatsappLink, setWhatsappLink] = useState('');
  
  const [stats, setStats] = useState({
    students: 0,
    sections: 0,
    questions: 0,
    errors: 0,
    banned: 0,
    active: 0,
    requests: 0
  });
  
  const { toast } = useToast();

  const [editorMode, setEditorMode] = useState<'create' | 'edit-section' | 'edit-template'>('create');
  const [activeFirebaseId, setActiveFirebaseId] = useState<string | null>(null);
  const [newSection, setNewSection] = useState<Partial<Section>>({
    id: 0,
    title: '',
    description: '',
    questions: [],
    readingPassages: [],
    duration: 13
  });

  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [banDuration, setBanDuration] = useState('1h');
  const [banReason, setBanReason] = useState('');
  
  const [editNameModalOpen, setEditNameModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [nameChangeReason, setNameChangeReason] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const sectionsData = await getSectionsFromDb();
      setSections(sectionsData);
      
      const templatesData = await getTemplatesFromDb();
      setTemplates(templatesData);
      
      const usersSnap = await getDocs(collection(db, "userProfiles"));
      const allUsers = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      setUsersList(allUsers.filter((u: any) => u.status === 'approved' && (u.role === 'user' || !u.role)));
      setPendingUsers(allUsers.filter((u: any) => u.status === 'pending'));

      const adminsData = await getAdminsFromDb();
      setAdminsList(adminsData);

      const errorsSnap = await getDocs(collection(db, "errorLogs"));
      const errorsData = errorsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const logsSnap = await getDocs(query(collection(db, "userActivityLogs"), orderBy("timestamp", "desc"), limit(50)));
      setActivityLogs(logsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      
      const settings = await getGlobalSettings();
      if (settings.whatsappLink) setWhatsappLink(settings.whatsappLink);

      setStats({
        students: allUsers.filter((u: any) => (u.role === 'user' || !u.role) && u.status === 'approved').length,
        sections: sectionsData.length,
        questions: sectionsData.reduce((acc, s) => acc + (s.questions?.length || 0), 0),
        errors: errorsData.length,
        banned: allUsers.filter((u: any) => u.isBanned).length,
        active: allUsers.filter((u: any) => u.xp > 0).length,
        requests: allUsers.filter((u: any) => u.status === 'pending').length
      });
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }, []);

  // Theme Sync Logic for Admin Panel
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        const userRef = doc(db, "userProfiles", user.uid);
        onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (data.theme) {
              document.documentElement.style.setProperty('--primary', data.theme);
            }
          }
        });

        const profile = await getUserProfile(user.uid, user.email || '');
        const role = profile?.role || 'user';
        setCurrentUserRole(role);
        
        const adminRoles = ['rootOwner', 'owner', 'superAdmin', 'admin', 'editor', 'helper'];
        setIsAuthorized(adminRoles.includes(role));
        
        if (adminRoles.includes(role)) {
          await fetchData();
        }
      } else {
        setIsAuthorized(false);
        setCurrentUserRole('user');
      }
      setLoading(false);
    });

    return () => unsub();
  }, [fetchData]);

  const handleAdminLogout = () => {
    signOut(auth);
    window.location.href = '/';
  };

  const handleUserApproval = async (userId: string, status: 'approved' | 'rejected') => {
    setIsSubmitting(true);
    try {
      await updateUserStatus(userId, status);
      await addDoc(collection(db, "userActivityLogs"), {
        userId,
        adminId: auth.currentUser?.uid,
        action: status === 'approved' ? 'APPROVAL' : 'REJECTION',
        timestamp: serverTimestamp()
      });
      toast({ title: status === 'approved' ? "تم قبول الطالب ✨" : "تم رفض الطلب" });
      fetchData();
    } catch (e) {
      toast({ title: "فشلت العملية", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    const userToChange = adminsList.find(a => a.id === userId) || usersList.find(u => u.id === userId);
    
    if (!canManageRole(currentUserRole, userToChange?.role || 'user')) {
      toast({ title: "لا تملك صلاحية تعديل رتبة هذا المستخدم", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      await updateUserRole(userId, newRole);
      await addDoc(collection(db, "userActivityLogs"), {
        userId,
        userName: userToChange?.displayName,
        adminId: auth.currentUser?.uid,
        action: 'ROLE_CHANGE',
        newRole,
        timestamp: serverTimestamp()
      });
      toast({ title: "تم تحديث الرتبة بنجاح ✅" });
      fetchData();
    } catch (e) {
      toast({ title: "فشلت العملية", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddAdminByEmail = async () => {
    if (!adminSearchEmail.trim()) return;
    setIsSubmitting(true);
    try {
      const q = query(collection(db, "userProfiles"), where("email", "==", adminSearchEmail.trim().toLowerCase()));
      const snap = await getDocs(q);
      if (snap.empty) {
        toast({ title: "المستخدم غير موجود", variant: "destructive" });
      } else {
        const targetUser = snap.docs[0].data();
        if (targetUser.role === 'rootOwner') {
          toast({ title: "لا يمكن تعديل المالك الجذري", variant: "destructive" });
          return;
        }
        const userId = snap.docs[0].id;
        await handleRoleChange(userId, 'admin');
        setAdminSearchEmail('');
      }
    } catch (e) {
      toast({ title: "خطأ في البحث", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveSection = async () => {
    if (!newSection.title || !newSection.id) {
      toast({ title: "يرجى إكمال البيانات الأساسية", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      if (editorMode === 'edit-section' && activeFirebaseId) {
        await updateSectionInDb(activeFirebaseId, newSection);
        toast({ title: "تم تحديث القسم بنجاح! ✏️" });
      } else if (editorMode === 'edit-template' && activeFirebaseId) {
        await updateTemplateInDb(activeFirebaseId, newSection);
        toast({ title: "تم تحديث القالب بنجاح! 💾" });
      } else {
        await addDoc(collection(db, "sections"), {
          ...newSection,
          createdAt: serverTimestamp()
        });
        toast({ title: "تم نشر القسم الجديد بنجاح! 🚀" });
      }
      resetEditor();
      fetchData();
    } catch (error) {
      toast({ title: "حدث خطأ أثناء الحفظ", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateWhatsapp = async () => {
    setIsSubmitting(true);
    const success = await updateGlobalSetting('whatsappLink', whatsappLink);
    if (success) {
      toast({ title: "تم تحديث رابط الواتساب بنجاح ✅" });
    } else {
      toast({ title: "فشل تحديث الرابط", variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const resetEditor = () => {
    setNewSection({ id: 0, title: '', description: '', questions: [], readingPassages: [], duration: 13 });
    setEditorMode('create');
    setActiveFirebaseId(null);
  };

  const editSection = (section: Section) => {
    setNewSection({
      id: section.id,
      title: section.title,
      description: section.description || '',
      questions: section.questions || [],
      readingPassages: section.readingPassages || [],
      duration: section.duration || 13
    });
    setEditorMode('edit-section');
    setActiveFirebaseId(section.firebaseId || null);
    toast({ title: "تم تحميل بيانات القسم للتعديل" });
  };

  const useTemplate = (template: any) => {
    setNewSection({
      id: sections.length > 0 ? Math.max(...sections.map(s => Number(s.id))) + 1 : 1,
      title: template.title,
      description: template.description || '',
      questions: template.questions || [],
      readingPassages: template.readingPassages || [],
      duration: template.duration || 13
    });
    setEditorMode('create');
    setActiveFirebaseId(null);
    toast({ title: "تم تحميل بيانات القالب بنجاح" });
  };

  const editTemplate = (template: any) => {
    setNewSection({
      id: template.id || 0,
      title: template.title,
      description: template.description || '',
      questions: template.questions || [],
      readingPassages: template.readingPassages || [],
      duration: template.duration || 13
    });
    setEditorMode('edit-template');
    setActiveFirebaseId(template.firebaseId);
    toast({ title: "محرر القوالب نشط الآن" });
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("هل تريد حذف هذا القالب؟")) return;
    await deleteTemplateFromDb(id);
    fetchData();
    toast({ title: "تم حذف القالب" });
  };

  const handleBanUser = async () => {
    if (!banReason.trim()) {
      toast({ title: "يرجى إدخل سبب الحظر", variant: "destructive" });
      return;
    }
    if (selectedUser.role === 'rootOwner') {
      toast({ title: "لا يمكن حظر المالك الجذري", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    let expiresAt: Date | null = null;
    const now = new Date();
    if (banDuration === '1h') expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
    else if (banDuration === '1d') expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    else if (banDuration === '7d') expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    try {
      await updateDoc(doc(db, "userProfiles", selectedUser.id), {
        isBanned: true,
        banReason,
        banDuration,
        bannedAt: serverTimestamp(),
        banExpiresAt: expiresAt
      });
      await addDoc(collection(db, "userActivityLogs"), {
        userId: selectedUser.id,
        userName: selectedUser.displayName,
        action: 'BAN',
        reason: banReason,
        timestamp: serverTimestamp()
      });
      toast({ title: `تم حظر الطالب بنجاح` });
      setBanModalOpen(false);
      setBanReason('');
      fetchData();
    } catch (e) { 
      toast({ title: "فشلت العملية", variant: "destructive" }); 
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditName = async () => {
    if (!newName.trim() || !nameChangeReason.trim()) {
      toast({ title: "يرجى إكمال الحقول الإجبارية", variant: "destructive" });
      return;
    }
    if (selectedUser.role === 'rootOwner' && currentUserRole !== 'rootOwner') {
       toast({ title: "لا تملك صلاحية تعديل بيانات المالك الجذري", variant: "destructive" });
       return;
    }
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "userProfiles", selectedUser.id), {
        displayName: newName,
        lastUpdated: serverTimestamp()
      });
      await addDoc(collection(db, "userActivityLogs"), {
        userId: selectedUser.id,
        userName: selectedUser.displayName,
        action: 'NAME_CHANGE',
        reason: nameChangeReason,
        oldName: selectedUser.displayName,
        newName: newName,
        timestamp: serverTimestamp()
      });
      toast({ title: "تم تغيير الاسم بنجاح" });
      setEditNameModalOpen(false);
      fetchData();
    } catch (e) {
      toast({ title: "حدث خطأ", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isOwnerOrSuper = useMemo(() => {
    return currentUserRole === 'rootOwner' || currentUserRole === 'owner' || currentUserRole === 'superAdmin';
  }, [currentUserRole]);

  // Editor Functions
  const addQuestion = () => {
    const newQ: Question = {
      id: `q-${Date.now()}`,
      question: '',
      options: ['', '', '', ''],
      correct: '',
      type: 'analogy'
    };
    setNewSection(prev => ({
      ...prev,
      questions: [...(prev.questions || []), newQ]
    }));
  };

  const removeQuestion = (index: number) => {
    setNewSection(prev => ({
      ...prev,
      questions: (prev.questions || []).filter((_, i) => i !== index)
    }));
  };

  const updateQuestion = (index: number, updates: Partial<Question>) => {
    setNewSection(prev => {
      const qs = [...(prev.questions || [])];
      qs[index] = { ...qs[index], ...updates };
      return { ...prev, questions: qs };
    });
  };

  const addPassage = () => {
    const newP: ReadingPassage = { title: '', text: '' };
    setNewSection(prev => ({
      ...prev,
      readingPassages: [...(prev.readingPassages || []), newP]
    }));
  };

  const removePassage = (index: number) => {
    setNewSection(prev => ({
      ...prev,
      readingPassages: (prev.readingPassages || []).filter((_, i) => i !== index)
    }));
  };

  const updatePassage = (index: number, updates: Partial<ReadingPassage>) => {
    setNewSection(prev => {
      const ps = [...(prev.readingPassages || [])];
      ps[index] = { ...ps[index], ...updates };
      return { ...prev, readingPassages: ps };
    });
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center space-y-6">
        <Loader2 className="animate-spin text-primary w-12 h-12 mx-auto" />
        <p className="text-white/40 font-black tracking-widest uppercase text-xs animate-pulse">يتم التأكد من الصلاحيات...</p>
      </div>
    </div>
  );

  if (isAuthorized === false) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center p-4 overflow-hidden relative" dir="rtl">
        <div className="absolute inset-0 bg-mesh opacity-20" />
        <Card className="w-full max-w-md p-10 glass-card rounded-[40px] border-primary/20 relative z-10 text-center space-y-6">
          <div className="w-20 h-20 bg-rose-500/10 rounded-3xl flex items-center justify-center mx-auto ring-2 ring-rose-500/20">
            <Lock className="w-10 h-10 text-rose-500" />
          </div>
          <h1 className="text-3xl font-black text-white">دخول غير مصرح ⛔</h1>
          <p className="text-white/40 font-bold leading-relaxed">عذراً، لا تمتلك الصلاحيات الكافية لدخول لوحة الإدارة.</p>
          <Button onClick={() => window.location.href = '/'} className="w-full h-14 bg-primary rounded-2xl font-black">العودة للرئيسية</Button>
          <Button onClick={handleAdminLogout} variant="ghost" className="text-rose-500 text-xs font-bold">تسجيل الخروج</Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black p-4 md:p-8 lg:p-12 text-white bg-mesh" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-12">
        <header className="flex flex-col md:flex-row justify-between items-center gap-8 glass-card p-6 md:p-8 rounded-[40px] border-primary/10">
          <div className="flex items-center gap-6">
            <div className="bg-primary/20 p-4 md:p-5 rounded-3xl ring-2 ring-primary/20">
              <ShieldCheck className="text-primary w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-4xl font-black tracking-tight">لوحة القيادة</h1>
                <RoleBadgeUI role={currentUserRole} />
              </div>
              <p className="text-primary font-bold uppercase tracking-widest text-[10px] md:text-xs opacity-60">
                {currentUserRole.toUpperCase()} PANEL
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button variant="outline" onClick={() => window.location.href = '/'} className="h-12 px-6 md:px-8 rounded-2xl border-white/10 font-bold text-sm">الموقع الرئيسي</Button>
            <Button variant="ghost" onClick={handleAdminLogout} className="h-12 px-6 md:px-8 rounded-2xl text-destructive hover:bg-destructive/10 font-bold text-sm">خروج</Button>
          </div>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 md:gap-6">
          {[
            { label: 'الطلاب', val: stats.students, icon: Users, color: 'text-blue-500' },
            { label: 'الطلبات', val: stats.requests, icon: UserCheck, color: 'text-amber-500' },
            { label: 'الأقسام', val: stats.sections, icon: Database, color: 'text-purple-500' },
            { label: 'الأسئلة', val: stats.questions, icon: FileText, color: 'text-emerald-500' },
            { label: 'الأخطاء', val: stats.errors, icon: AlertCircle, color: 'text-rose-500' },
            { label: 'محظورين', val: stats.banned, icon: Ban, color: 'text-orange-500' },
            { label: 'نشطين', val: stats.active, icon: TrendingUp, color: 'text-cyan-500' },
          ].map((s, i) => (
            <Card key={`stat-${i}`} className="p-4 md:p-8 glass-card rounded-[30px] md:rounded-[35px] text-center space-y-3 border-white/5">
              <s.icon className={cn("w-6 h-6 md:w-10 md:h-10 mx-auto", s.color)} />
              <p className="text-2xl md:text-4xl font-black">{s.val}</p>
              <p className="text-white/40 font-bold text-[10px] md:text-xs uppercase tracking-wider">{s.label}</p>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="welcome" className="space-y-10">
          <TabsList className="bg-white/5 border border-white/5 p-1.5 h-auto rounded-[25px] md:rounded-[30px] w-full flex flex-wrap justify-start md:justify-center">
            <TabsTrigger value="welcome" className="px-4 md:px-8 py-2 md:py-4 font-black rounded-[15px] md:rounded-[20px] text-sm md:text-lg flex gap-2"><Home className="w-4 h-4 md:w-5 md:h-5" /> ترحيب</TabsTrigger>
            <TabsTrigger value="requests" className="px-4 md:px-8 py-2 md:py-4 font-black rounded-[15px] md:rounded-[20px] text-sm md:text-lg flex gap-2">الطلبات {stats.requests > 0 && <Badge className="bg-amber-500 text-[10px]">{stats.requests}</Badge>}</TabsTrigger>
            <TabsTrigger value="users" className="px-4 md:px-8 py-2 md:py-4 font-black rounded-[15px] md:rounded-[20px] text-sm md:text-lg">الطلاب</TabsTrigger>
            <TabsTrigger value="content" className="px-4 md:px-8 py-2 md:py-4 font-black rounded-[15px] md:rounded-[20px] text-sm md:text-lg">إدارة المحتوى</TabsTrigger>
            {isOwnerOrSuper && (
              <TabsTrigger value="admins" className="px-4 md:px-8 py-2 md:py-4 font-black rounded-[15px] md:rounded-[20px] text-sm md:text-lg flex gap-2">
                Admins <ShieldCheck className="w-4 h-4" />
              </TabsTrigger>
            )}
            <TabsTrigger value="logs" className="px-4 md:px-8 py-2 md:py-4 font-black rounded-[15px] md:rounded-[20px] text-sm md:text-lg flex gap-2">النشاط <History className="w-4 h-4" /></TabsTrigger>
          </TabsList>

          <TabsContent value="welcome">
            <Card className="p-8 md:p-14 glass-card rounded-[40px] md:rounded-[60px] border-primary/20 text-center space-y-10 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0" />
               <div className="space-y-6">
                 <div className="w-24 h-24 md:w-32 md:h-32 bg-primary/10 rounded-[40px] flex items-center justify-center mx-auto ring-4 ring-primary/20">
                   <Crown className="w-12 h-12 md:w-16 md:h-16 text-primary" />
                 </div>
                 <h2 className="text-3xl md:text-6xl font-black text-white flex items-center justify-center gap-4">أهلاً بك يا دكتور محمود <RoleBadgeUI role="rootOwner" /></h2>
                 <p className="text-lg md:text-2xl text-white/40 max-w-3xl mx-auto font-bold leading-relaxed">
                   أنت الآن في قلب نظام EASY كـ {currentUserRole.toUpperCase()}.
                 </p>
               </div>
               
               <div className="pt-10 border-t border-white/5">
                 <div className="glass-card p-8 md:p-12 rounded-[40px] border-emerald-500/20 max-w-2xl mx-auto space-y-6 text-right">
                   <div className="w-16 h-16 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
                     <MessageCircle className="w-8 h-8 text-emerald-500" />
                   </div>
                   <h3 className="text-xl md:text-3xl font-black text-center mb-6">إعدادات التواصل 💬</h3>
                   
                   <div className="space-y-3">
                     <label className="text-xs font-black text-emerald-500 uppercase mr-2">رابط مجموعة الواتساب</label>
                     <div className="flex gap-3">
                       <Input 
                        placeholder="https://chat.whatsapp.com/..." 
                        value={whatsappLink}
                        onChange={(e) => setWhatsappLink(e.target.value)}
                        className="h-14 bg-black border-white/10 rounded-xl"
                       />
                       <Button onClick={handleUpdateWhatsapp} disabled={isSubmitting} className="h-14 bg-emerald-500 px-6 rounded-xl font-black">حفظ ✅</Button>
                     </div>
                   </div>
                 </div>
               </div>
            </Card>
          </TabsContent>

          <TabsContent value="requests">
            <Card className="p-6 md:p-10 glass-card rounded-[40px] md:rounded-[50px] space-y-10 border-white/5">
              <h2 className="text-2xl md:text-3xl font-black flex items-center gap-4">المستخدمين الجدد ⏳</h2>
              <div className="grid gap-6">
                {pendingUsers.length === 0 ? (
                  <div className="py-20 text-center text-white/20 font-black">لا يوجد طلبات معلقة</div>
                ) : (
                  pendingUsers.map((u) => (
                    <div key={u.id} className="flex flex-col md:flex-row justify-between items-center p-6 md:p-8 bg-white/[0.02] border border-white/5 rounded-3xl gap-6">
                      <div className="flex items-center gap-6 w-full">
                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center font-black text-xl md:text-2xl text-amber-500 shrink-0">{u.displayName?.[0] || '?' }</div>
                        <div className="overflow-hidden">
                          <p className="font-black text-lg md:text-xl truncate">{u.displayName || 'مستكشف جديد'}</p>
                          <p className="text-white/30 font-bold text-xs md:text-sm truncate">{u.email}</p>
                          <p className="text-amber-500/60 font-black text-[10px] md:text-xs mt-1">📞 {u.phoneNumber || 'لا يوجد رقم'}</p>
                        </div>
                      </div>
                      <div className="flex gap-4 w-full md:w-auto">
                        <Button onClick={() => handleUserApproval(u.id, 'approved')} className="flex-1 md:flex-none h-12 md:h-14 px-6 md:px-8 rounded-2xl bg-emerald-500 text-white font-black hover:bg-emerald-600 text-sm"><CheckCircle className="ml-2 w-4 h-4 md:w-5 md:h-5" /> قبول</Button>
                        <Button onClick={() => handleUserApproval(u.id, 'rejected')} variant="ghost" className="flex-1 md:flex-none h-12 md:h-14 px-6 md:px-8 rounded-2xl text-rose-500 hover:bg-rose-500/10 font-black text-sm"><XIcon className="ml-2 w-4 h-4 md:w-5 md:h-5" /> رفض</Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card className="p-6 md:p-10 glass-card rounded-[40px] md:rounded-[50px] space-y-10 border-white/5">
              <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <h2 className="text-2xl md:text-3xl font-black">قاعدة بيانات الطلاب</h2>
                <div className="relative w-full md:w-96">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 w-5 h-5" />
                  <Input placeholder="بحث عن طالب..." className="h-14 pr-12 rounded-2xl bg-black border-white/10" />
                </div>
              </div>
              <div className="grid gap-6">
                {usersList.map((u) => (
                  <div key={u.id} className="flex flex-col md:flex-row justify-between items-center p-6 md:p-8 bg-white/[0.02] border border-white/5 rounded-3xl gap-6">
                    <div className="flex items-center gap-6 w-full">
                      <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-primary/10 flex items-center justify-center font-black text-xl md:text-2xl text-primary shrink-0">{u.displayName?.[0] || 'U'}</div>
                      <div className="overflow-hidden">
                        <div className="font-black text-lg md:text-xl flex flex-wrap items-center gap-3">
                          <span className="truncate max-w-[150px] md:max-w-none">{u.displayName || 'بدون اسم'} <RoleBadgeUI role={u.role || 'user'} /></span>
                          {u.isBanned && <Badge className="bg-destructive text-white border-none text-[10px]">محظور</Badge>}
                        </div>
                        <p className="text-white/30 font-bold text-xs md:text-sm truncate">{u.email} | {u.phoneNumber}</p>
                      </div>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                       <Button onClick={() => { setSelectedUser(u); setNewName(u.displayName || ''); setEditNameModalOpen(true); }} variant="ghost" className="flex-1 md:flex-none h-12 px-4 md:px-6 rounded-xl font-black text-primary hover:bg-primary/10 text-xs md:text-sm"><Edit2 className="w-4 h-4 ml-2" /> تعديل</Button>
                       <Button onClick={() => { setSelectedUser(u); setBanModalOpen(true); }} variant="ghost" className="flex-1 md:flex-none h-12 px-4 md:px-6 rounded-xl font-black text-destructive hover:bg-destructive/10 text-xs md:text-sm"><Ban className="w-4 h-4 ml-2" /> حظر</Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {isOwnerOrSuper && (
            <TabsContent value="admins">
              <Card className="p-6 md:p-10 glass-card rounded-[40px] md:rounded-[50px] space-y-10 border-white/5">
                <div className="flex flex-col md:flex-row justify-between items-center border-b border-white/5 pb-8 gap-6">
                  <h2 className="text-2xl md:text-3xl font-black flex items-center gap-4"><Crown className="text-primary" /> إدارة المشرفين</h2>
                  <div className="flex gap-4 w-full md:w-auto">
                    <Input 
                      placeholder="إيميل المستخدم لإضافته..." 
                      value={adminSearchEmail} 
                      onChange={(e) => setAdminSearchEmail(e.target.value)}
                      className="h-14 rounded-2xl bg-black border-white/10 flex-1 md:w-64" 
                    />
                    <Button onClick={handleAddAdminByEmail} disabled={isSubmitting} className="h-14 px-8 bg-primary rounded-2xl font-black text-sm">ترقية مشرف 🚀</Button>
                  </div>
                </div>
                
                <div className="grid gap-6">
                  {adminsList.map((admin) => {
                    const canEditThisAdmin = canManageRole(currentUserRole, admin.role || 'user');
                    return (
                      <div key={admin.id} className="flex flex-col md:flex-row justify-between items-center p-6 md:p-8 bg-white/[0.02] border border-white/5 rounded-3xl gap-6">
                        <div className="flex items-center gap-6 w-full">
                          <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
                            {admin.role === 'rootOwner' ? <Crown className="text-amber-500 w-6 h-6 md:w-8 md:h-8" /> : <ShieldCheck className="text-primary w-6 h-6 md:w-8 md:h-8" />}
                          </div>
                          <div className="overflow-hidden">
                            <div className="flex items-center gap-2">
                               <p className="font-black text-lg md:text-xl truncate">{admin.displayName || 'مشرف'} <RoleBadgeUI role={admin.role} /></p>
                            </div>
                            <p className="text-white/30 font-bold text-xs md:text-sm truncate">{admin.email}</p>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                          <label className="text-[10px] font-bold text-white/40 uppercase">الصلاحية الحالية</label>
                          <Select 
                            disabled={!canEditThisAdmin || isSubmitting}
                            value={admin.role} 
                            onValueChange={(val) => handleRoleChange(admin.id, val)}
                          >
                            <SelectTrigger className="h-12 w-full md:w-48 bg-black border-white/10 text-white rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-black border-white/10 text-white">
                              {currentUserRole === 'rootOwner' && <SelectItem value="rootOwner">Root Owner (المؤسس)</SelectItem>}
                              <SelectItem value="owner">المالك (Owner)</SelectItem>
                              <SelectItem value="superAdmin">مشرف عام (Super Admin)</SelectItem>
                              <SelectItem value="admin">مشرف محتوى (Admin)</SelectItem>
                              <SelectItem value="editor">محرر (Editor)</SelectItem>
                              <SelectItem value="helper">مساعد (Helper)</SelectItem>
                              <SelectItem value="user" className="text-rose-500">إزالة الصلاحيات</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="content" className="space-y-10">
             <Tabs defaultValue="editor" className="space-y-6">
                <TabsList className="bg-white/5 p-1 rounded-2xl flex flex-wrap h-auto w-full justify-start overflow-hidden">
                   <TabsTrigger value="editor" className="px-4 md:px-8 py-2 md:py-3 rounded-xl font-bold text-xs md:text-sm">المحرر (Editor)</TabsTrigger>
                   <TabsTrigger value="templates" className="px-4 md:px-8 py-2 md:py-3 rounded-xl font-bold text-xs md:text-sm">الأقسام الجاهزة (Templates)</TabsTrigger>
                   <TabsTrigger value="all" className="px-4 md:px-8 py-2 md:py-3 rounded-xl font-bold text-xs md:text-sm">كل الأقسام الحالية</TabsTrigger>
                </TabsList>

                <TabsContent value="editor">
                   <Card className="p-6 md:p-10 glass-card rounded-[40px] md:rounded-[50px] space-y-10 border-white/5">
                      <div className="flex flex-col md:flex-row justify-between items-center border-b border-white/5 pb-8 gap-6">
                        <div className="space-y-1 text-center md:text-right">
                          <h2 className="text-2xl md:text-3xl font-black">
                            {editorMode === 'edit-section' ? 'تعديل قسم نشط' : editorMode === 'edit-template' ? 'تعديل قالب جاهز' : 'بناء قسم جديد'}
                          </h2>
                          {editorMode !== 'create' && <Button onClick={resetEditor} variant="link" className="text-[10px] md:text-xs text-primary p-0">إلغاء التعديل والبدء من جديد</Button>}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                          <Button variant="outline" onClick={handleSaveAsTemplate} disabled={isSubmitting} className="h-14 px-6 md:px-8 rounded-2xl font-bold border-white/10 text-xs md:text-sm">حفظ كقالب جاهز 💾</Button>
                          <Button onClick={handleSaveSection} disabled={isSubmitting} className="h-14 px-8 md:px-12 bg-primary text-white font-black rounded-2xl flex gap-2 justify-center text-xs md:text-sm">
                             {editorMode === 'create' ? <PlusCircle /> : <Save />}
                             {editorMode === 'create' ? 'نشر القسم 🚀' : 'تحديث البيانات ✅'}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                          <div className="space-y-3">
                            <label className="text-[10px] md:text-xs font-bold uppercase text-primary">رقم القسم</label>
                            <input type="number" value={newSection.id || ''} onChange={(e) => setNewSection(p => ({ ...p, id: parseInt(e.target.value) }))} className="h-14 bg-black border-white/10 rounded-xl px-4 outline-none w-full" />
                          </div>
                          <div className="md:col-span-2 space-y-3">
                            <label className="text-[10px] md:text-xs font-bold uppercase text-primary">عنوان القسم</label>
                            <input value={newSection.title || ''} onChange={(e) => setNewSection(p => ({ ...p, title: e.target.value }))} className="h-14 bg-black border-white/10 rounded-xl px-4 outline-none w-full" />
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black flex items-center gap-2"><BookOpen className="text-primary w-5 h-5" /> النصوص القرائية (Reading Passages)</h3>
                            <Button onClick={addPassage} variant="outline" size="sm" className="rounded-xl border-primary/20 text-primary"><FilePlus className="w-4 h-4 ml-2" /> إضافة نص جديد</Button>
                          </div>
                          <div className="grid gap-6">
                            {(newSection.readingPassages || []).map((p, idx) => (
                              <Card key={`p-${idx}`} className="p-6 bg-white/[0.02] border-white/5 rounded-3xl space-y-4">
                                <div className="flex justify-between items-center">
                                  <Badge className="bg-primary/20 text-primary">نص #{idx + 1}</Badge>
                                  <Button onClick={() => removePassage(idx)} variant="ghost" size="icon" className="text-rose-500"><Trash2 className="w-4 h-4" /></Button>
                                </div>
                                <Input placeholder="عنوان النص..." value={p.title} onChange={(e) => updatePassage(idx, { title: e.target.value })} className="h-12 bg-black/40 border-white/10" />
                                <Textarea placeholder="محتوى النص القرائي..." value={p.text} onChange={(e) => updatePassage(idx, { text: e.target.value })} className="min-h-[150px] bg-black/40 border-white/10" />
                              </Card>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black flex items-center gap-2"><HelpCircle className="text-primary w-5 h-5" /> بنك الأسئلة (Questions)</h3>
                            <Button onClick={addQuestion} variant="outline" size="sm" className="rounded-xl border-primary/20 text-primary"><PlusCircle className="w-4 h-4 ml-2" /> إضافة سؤال جديد</Button>
                          </div>
                          <div className="grid gap-6">
                            {(newSection.questions || []).map((q, idx) => (
                              <Card key={`q-${idx}`} className="p-6 bg-white/[0.02] border-white/5 rounded-3xl space-y-6">
                                <div className="flex justify-between items-center">
                                  <Badge className="bg-primary/10 text-primary">سؤال #{idx + 1}</Badge>
                                  <Button onClick={() => removeQuestion(idx)} variant="ghost" size="icon" className="text-rose-500"><Trash2 className="w-4 h-4" /></Button>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase opacity-40">نوع السؤال</label>
                                    <Select value={q.type} onValueChange={(val: any) => updateQuestion(idx, { type: val })}>
                                      <SelectTrigger className="h-12 bg-black border-white/10">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="bg-black border-white/10 text-white">
                                        <SelectItem value="analogy">تناظر لفظي</SelectItem>
                                        <SelectItem value="reading">استيعاب مقروء</SelectItem>
                                        <SelectItem value="error">خطأ سياقي</SelectItem>
                                        <SelectItem value="completion">إكمال جمل</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {q.type === 'reading' && (
                                    <div className="space-y-2">
                                      <label className="text-[10px] font-black uppercase opacity-40">النص المرتبط</label>
                                      <Select value={q.passageTitle || ''} onValueChange={(val) => updateQuestion(idx, { passageTitle: val })}>
                                        <SelectTrigger className="h-12 bg-black border-white/10">
                                          <SelectValue placeholder="اختر النص..." />
                                        </SelectTrigger>
                                        <SelectContent className="bg-black border-white/10 text-white">
                                          {(newSection.readingPassages || []).map((p, pIdx) => (
                                            <SelectItem key={pIdx} value={p.title}>{p.title || `نص بدون عنوان #${pIdx+1}`}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  )}
                                </div>

                                <Input placeholder="نص السؤال..." value={q.question} onChange={(e) => updateQuestion(idx, { question: e.target.value })} className="h-12 bg-black/40 border-white/10" />
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {q.options.map((opt, optIdx) => (
                                    <div key={optIdx} className="flex gap-2 items-center">
                                      <span className="text-xs font-black opacity-30">{['أ', 'ب', 'ج', 'د'][optIdx]}</span>
                                      <Input 
                                        placeholder={`خيار ${['أ', 'ب', 'ج', 'د'][optIdx]}`} 
                                        value={opt} 
                                        onChange={(e) => {
                                          const newOpts = [...q.options];
                                          newOpts[optIdx] = e.target.value;
                                          updateQuestion(idx, { options: newOpts });
                                        }} 
                                        className="h-11 bg-black/40 border-white/10" 
                                      />
                                    </div>
                                  ))}
                                </div>

                                <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase text-emerald-500">الإجابة الصحيحة</label>
                                  <Select value={q.correct} onValueChange={(val) => updateQuestion(idx, { correct: val })}>
                                    <SelectTrigger className="h-12 bg-black border-emerald-500/20 text-emerald-500">
                                      <SelectValue placeholder="اختر الإجابة الصحيحة..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-black border-white/10 text-white">
                                      {q.options.map((opt, optIdx) => (
                                        <SelectItem key={optIdx} value={opt || `خيار ${optIdx+1}`}>{opt || `خيار ${optIdx+1}`}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </Card>
                            ))}
                          </div>
                        </div>
                      </div>
                   </Card>
                </TabsContent>
                
                <TabsContent value="templates">
                   <Card className="p-6 md:p-10 glass-card rounded-[40px] md:rounded-[50px] space-y-10 border-white/5">
                      <h2 className="text-2xl md:text-3xl font-black flex items-center gap-4"><Layers className="text-primary" /> قوالب الأقسام الجاهزة</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {templates.map((t) => (
                          <Card key={t.firebaseId || `template-${t.title}`} className="p-6 bg-white/[0.02] border-white/5 rounded-3xl space-y-4 hover:border-primary/40 transition-all">
                             <div className="flex justify-between items-start">
                               <Badge className="bg-primary/20 text-primary border-none text-[10px]">Template</Badge>
                               <div className="flex gap-2">
                                  <Button onClick={() => useTemplate(t)} size="icon" variant="ghost" className="text-blue-500" title="نسخ لإنشاء قسم"><Copy className="w-4 h-4" /></Button>
                                  <Button onClick={() => editTemplate(t)} size="icon" variant="ghost" className="text-emerald-500" title="تعديل القالب"><Edit2 className="w-4 h-4" /></Button>
                                  <Button onClick={() => handleDeleteTemplate(t.firebaseId)} size="icon" variant="ghost" className="text-rose-500"><Trash2 className="w-4 h-4" /></Button>
                               </div>
                             </div>
                             <h3 className="text-lg md:text-xl font-black truncate">{t.title}</h3>
                             <div className="flex gap-3 opacity-40 text-[10px] font-bold">
                                <span>{t.questions?.length || 0} سؤال</span>
                                <span>{t.readingPassages?.length || 0} نصوص</span>
                             </div>
                          </Card>
                        ))}
                      </div>
                   </Card>
                </TabsContent>

                <TabsContent value="all">
                    <Card className="p-6 md:p-10 glass-card rounded-[40px] md:rounded-[50px] space-y-6 border-white/5">
                       <h2 className="text-2xl md:text-3xl font-black">الأقسام النشطة</h2>
                       <div className="grid gap-4">
                          {sections.map((s) => (
                            <div key={s.firebaseId || `section-${s.id}`} className="p-4 md:p-6 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col sm:flex-row justify-between items-center group gap-4">
                               <div className="flex items-center gap-4 w-full">
                                  <Badge className="bg-primary/20 text-primary shrink-0">{s.id}</Badge>
                                  <div className="overflow-hidden">
                                     <span className="font-black text-base md:text-lg truncate block">{s.title}</span>
                                     <div className="flex gap-3 opacity-40 text-[10px] font-bold mt-1">
                                        <span>{s.questions?.length || 0} سؤال</span>
                                        <span>{s.readingPassages?.length || 0} نصوص</span>
                                     </div>
                                  </div>
                               </div>
                               <div className="flex gap-2 w-full sm:w-auto md:opacity-0 md:group-hover:opacity-100 transition-opacity justify-end">
                                  <Button onClick={() => editSection(s)} variant="ghost" size="icon" className="text-emerald-400 hover:bg-emerald-400/10"><Edit2 className="w-4 h-4" /></Button>
                                  <Button variant="ghost" size="icon" onClick={() => deleteDoc(doc(db, "sections", s.firebaseId || '')).then(() => fetchData())} className="text-white/20 hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                               </div>
                            </div>
                          ))}
                       </div>
                    </Card>
                </TabsContent>
             </Tabs>
          </TabsContent>

          <TabsContent value="logs">
            <Card className="p-6 md:p-10 glass-card rounded-[40px] md:rounded-[50px] space-y-10 border-white/5">
              <h2 className="text-2xl md:text-3xl font-black flex items-center gap-4"><History className="text-primary" /> سجل النشاط</h2>
              <div className="space-y-4">
                {activityLogs.map((log) => (
                  <div key={log.id} className="p-4 md:p-6 bg-white/[0.02] border border-white/5 rounded-3xl flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3 w-full">
                      <Badge className={cn("text-white text-[10px]", 
                        log.action === 'BAN' ? "bg-rose-500" : 
                        log.action === 'ROLE_CHANGE' ? "bg-amber-500" : 
                        log.action === 'NAME_CHANGE' ? "bg-emerald-500" : "bg-blue-500")}>
                        {log.action}
                      </Badge>
                      <span className="font-black truncate flex items-center gap-2">
                        {log.userName || log.userId}
                        {log.userRole && <RoleBadgeUI role={log.userRole} />}
                      </span>
                    </div>
                    <p className="text-[10px] md:text-xs text-white/20 shrink-0 w-full sm:w-auto text-left sm:text-right">{log.timestamp?.toDate()?.toLocaleString('ar-SA')}</p>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={banModalOpen} onOpenChange={setBanModalOpen}>
        <DialogContent className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] glass-card border-rose-500/20 text-white rounded-[35px] max-w-lg w-[90vw] md:w-full p-6 md:p-10 outline-none z-[600]">
          <DialogHeader className="text-center space-y-4">
            <DialogTitle className="text-2xl md:text-3xl font-black">حظر طالب 🚫</DialogTitle>
            <DialogDescription className="text-white/40 font-bold">حظر: {selectedUser?.displayName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-6 md:py-8">
            <div className="space-y-2">
              <label className="text-xs font-bold text-primary mr-2">مدة الحظر</label>
              <Select value={banDuration} onValueChange={setBanDuration}>
                <SelectTrigger className="h-14 bg-black/40 border-white/10 rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent className="glass-card border-white/10 bg-black/90 text-white">
                  <SelectItem value="1h">1 ساعة</SelectItem>
                  <SelectItem value="1d">1 يوم</SelectItem>
                  <SelectItem value="7d">7 أيام</SelectItem>
                  <SelectItem value="perm">نهائي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <textarea 
              placeholder="سبب الحظر..." 
              value={banReason} 
              onChange={(e) => setBanReason(e.target.value)} 
              className="min-h-[120px] bg-black/40 border-white/10 rounded-2xl p-4 outline-none w-full" 
            />
          </div>
          <DialogFooter>
            <Button onClick={handleBanUser} disabled={isSubmitting} className="w-full h-14 bg-rose-500 text-white font-black rounded-2xl shadow-xl hover:bg-rose-600 transition-all">تأكيد الحظر</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editNameModalOpen} onOpenChange={setEditNameModalOpen}>
        <DialogContent className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] glass-card border-primary/20 text-white rounded-[35px] max-w-lg w-[90vw] md:w-full p-6 md:p-10 outline-none z-[600]">
          <DialogHeader className="text-center space-y-4">
            <DialogTitle className="text-2xl md:text-3xl font-black">تعديل اسم الطالب ✏️</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-6 md:py-8">
            <input 
              value={newName} 
              onChange={(e) => setNewName(e.target.value)} 
              className="h-14 bg-black/40 border-white/10 rounded-2xl px-4 outline-none w-full" 
            />
            <textarea 
              placeholder="لماذا يتم تغيير الاسم؟" 
              value={nameChangeReason} 
              onChange={(e) => setNameChangeReason(e.target.value)} 
              className="min-h-[100px] bg-black/40 border-white/10 rounded-2xl p-4 outline-none w-full" 
            />
          </div>
          <DialogFooter>
            <Button onClick={handleEditName} disabled={isSubmitting} className="w-full h-14 bg-primary text-white font-black rounded-2xl shadow-xl">حفظ التعديلات</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
