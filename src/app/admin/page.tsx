
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { auth, db } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { getSectionsFromDb, getTemplatesFromDb, saveTemplateToDb, deleteTemplateFromDb } from '@/lib/db-service';
import { 
  collection, getDocs, addDoc, doc, deleteDoc, updateDoc, serverTimestamp, query, orderBy, limit 
} from 'firebase/firestore';
import { Section } from '@/lib/practice-data';
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
  Trash2, Settings, FileText, HelpCircle, Loader2, Users, 
  Search, ShieldCheck, Database, Ban, AlertCircle, TrendingUp,
  XCircle, Lock, Edit2, History, Copy, Layers, CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ADMIN_SECRET_CODE = "EASY77100";
const AUTH_KEY = "easy_admin_authorized";

export default function AdminPage() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminCodeInput, setAdminCodeInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [sections, setSections] = useState<Section[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [errorLogs, setErrorLogs] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [stats, setStats] = useState({
    students: 0,
    sections: 0,
    questions: 0,
    errors: 0,
    banned: 0,
    active: 0
  });
  
  const { toast } = useToast();

  // --- Modals State ---
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [banDuration, setBanDuration] = useState('1h');
  const [banReason, setBanReason] = useState('');
  
  const [editNameModalOpen, setEditNameModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [nameChangeReason, setNameChangeReason] = useState('');

  const [newSection, setNewSection] = useState<Partial<Section>>({
    id: 0,
    title: '',
    questions: [],
    readingPassages: [],
    duration: 13
  });

  const fetchData = useCallback(async () => {
    try {
      const sectionsData = await getSectionsFromDb();
      setSections(sectionsData);
      
      const templatesData = await getTemplatesFromDb();
      setTemplates(templatesData);
      
      const usersSnap = await getDocs(collection(db, "userProfiles"));
      const usersData = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsersList(usersData);

      const errorsSnap = await getDocs(collection(db, "errorLogs"));
      const errorsData = errorsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setErrorLogs(errorsData);

      const logsSnap = await getDocs(query(collection(db, "userActivityLogs"), orderBy("timestamp", "desc"), limit(50)));
      setActivityLogs(logsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      
      setStats({
        students: usersData.length,
        sections: sectionsData.length,
        questions: sectionsData.reduce((acc, s) => acc + (s.questions?.length || 0), 0),
        errors: errorsData.length,
        banned: usersData.filter((u: any) => u.isBanned).length,
        active: usersData.filter((u: any) => u.xp > 0).length
      });
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }, []);

  useEffect(() => {
    const authStatus = localStorage.getItem(AUTH_KEY);
    if (authStatus === 'true') {
      setIsAuthorized(true);
      fetchData();
    }
    setLoading(false);
  }, [fetchData]);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminCodeInput === ADMIN_SECRET_CODE) {
      setIsAuthorized(true);
      localStorage.setItem(AUTH_KEY, 'true');
      fetchData();
      toast({ title: "تم الدخول بنجاح ✅", description: "أهلاً بك يا دكتور محمود" });
    } else {
      toast({ 
        title: "كود خاطئ ❌", 
        description: "يرجى التأكد من الكود السري للأدمن", 
        variant: "destructive" 
      });
    }
  };

  const handleAdminLogout = () => {
    setIsAuthorized(false);
    localStorage.removeItem(AUTH_KEY);
    signOut(auth);
    toast({ title: "تم تسجيل الخروج" });
  };

  // --- Actions ---
  const handleSaveSection = async () => {
    if (!newSection.title || !newSection.id) {
      toast({ title: "يرجى إكمال البيانات", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "sections"), {
        ...newSection,
        createdAt: serverTimestamp()
      });
      setNewSection({ id: 0, title: '', questions: [], readingPassages: [], duration: 13 });
      fetchData();
      toast({ title: "تم النشر بنجاح! 🚀" });
    } catch (error) {
      toast({ title: "حدث خطأ", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!newSection.title) {
      toast({ title: "يرجى كتابة عنوان للقالب", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await saveTemplateToDb(newSection);
      fetchData();
      toast({ title: "تم حفظ القالب بنجاح! 💾" });
    } catch (error) {
      toast({ title: "حدث خطأ", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const useTemplate = (template: any) => {
    setNewSection({
      id: sections.length > 0 ? Math.max(...sections.map(s => Number(s.id))) + 1 : 1,
      title: template.title,
      questions: template.questions || [],
      readingPassages: template.readingPassages || [],
      duration: template.duration || 13
    });
    toast({ title: "تم تحميل بيانات القالب بنجاح" });
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("هل تريد حذف هذا القالب؟")) return;
    await deleteTemplateFromDb(id);
    fetchData();
    toast({ title: "تم حذف القالب" });
  };

  const handleBanUser = async () => {
    if (!banReason.trim()) {
      toast({ title: "يرجى إدخال سبب الحظر", variant: "destructive" });
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

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Loader2 className="animate-spin text-primary w-12 h-12" />
    </div>
  );

  if (!isAuthorized) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center p-4 bg-mesh overflow-hidden">
        <Card className="w-full max-w-md p-10 glass-card rounded-[40px] border-primary/20 animate-in fade-in zoom-in duration-500">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6 ring-2 ring-primary/20">
              <Lock className="w-10 h-10 text-primary text-glow" />
            </div>
            <h1 className="text-4xl font-black text-white">بوابة الإدارة 🔐</h1>
            <p className="text-primary/60 font-bold mt-2 uppercase tracking-widest text-[10px]">EASY Administrative Access</p>
          </div>
          <form onSubmit={handleAdminLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/40 uppercase mr-4">Admin Security Code</label>
              <Input 
                type="password" 
                placeholder="Enter Secret Code" 
                value={adminCodeInput} 
                onChange={(e) => setAdminCodeInput(e.target.value)} 
                className="h-16 rounded-2xl bg-white/5 border-white/10 text-center text-2xl tracking-[0.5em] focus:border-primary/50" 
                required 
              />
            </div>
            <Button disabled={isSubmitting} type="submit" className="w-full h-16 bg-primary text-white font-black text-xl rounded-2xl shadow-xl hover:scale-[1.02] transition-transform">
              تحقق 🚀
            </Button>
          </form>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black p-4 md:p-12 text-white bg-mesh" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-12">
        <header className="flex flex-col md:flex-row justify-between items-center gap-8 glass-card p-8 rounded-[40px] border-primary/10">
          <div className="flex items-center gap-6">
            <div className="bg-primary/20 p-5 rounded-3xl ring-2 ring-primary/20">
              <ShieldCheck className="text-primary w-8 h-8" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight">لوحة القيادة</h1>
              <p className="text-primary font-bold uppercase tracking-widest text-xs opacity-60">Elite Command Center</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => window.location.href = '/'} className="h-12 px-8 rounded-2xl border-white/10 font-bold">الموقع الرئيسي</Button>
            <Button variant="ghost" onClick={handleAdminLogout} className="h-12 px-8 rounded-2xl text-destructive hover:bg-destructive/10 font-bold">خروج</Button>
          </div>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          {[
            { label: 'الطلاب', val: stats.students, icon: Users, color: 'text-blue-500' },
            { label: 'الأقسام', val: stats.sections, icon: Database, color: 'text-purple-500' },
            { label: 'الأسئلة', val: stats.questions, icon: FileText, color: 'text-emerald-500' },
            { label: 'الأخطاء', val: stats.errors, icon: AlertCircle, color: 'text-rose-500' },
            { label: 'محظورين', val: stats.banned, icon: Ban, color: 'text-orange-500' },
            { label: 'نشطين', val: stats.active, icon: TrendingUp, color: 'text-cyan-500' },
          ].map((s, i) => (
            <Card key={i} className="p-8 glass-card rounded-[35px] text-center space-y-3 border-white/5">
              <s.icon className={cn("w-10 h-10 mx-auto", s.color)} />
              <p className="text-4xl font-black">{s.val}</p>
              <p className="text-white/40 font-bold text-xs uppercase tracking-wider">{s.label}</p>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="users" className="space-y-10">
          <TabsList className="bg-white/5 border border-white/5 p-2 h-20 rounded-[30px] w-full md:w-auto">
            <TabsTrigger value="users" className="px-12 font-black rounded-[20px] h-full text-lg">الطلاب</TabsTrigger>
            <TabsTrigger value="content" className="px-12 font-black rounded-[20px] h-full text-lg">إدارة المحتوى</TabsTrigger>
            <TabsTrigger value="logs" className="px-12 font-black rounded-[20px] h-full text-lg">النشاط</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card className="p-10 glass-card rounded-[50px] space-y-10 border-white/5">
              <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <h2 className="text-3xl font-black">قاعدة بيانات الطلاب</h2>
                <div className="relative w-full md:w-96">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 w-5 h-5" />
                  <Input placeholder="بحث عن طالب..." className="h-14 pr-12 rounded-2xl bg-black border-white/10" />
                </div>
              </div>
              <div className="grid gap-6">
                {usersList.map((u) => (
                  <div key={u.id} className="flex flex-col md:flex-row justify-between items-center p-8 bg-white/[0.02] border border-white/5 rounded-3xl">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center font-black text-2xl text-primary">{u.displayName?.[0] || 'U'}</div>
                      <div>
                        <p className="font-black text-xl flex items-center gap-3">
                          {u.displayName || 'بدون اسم'}
                          {u.isBanned && <Badge className="bg-destructive text-white border-none">محظور</Badge>}
                        </p>
                        <p className="text-white/30 font-bold text-sm">{u.email}</p>
                        <div className="flex gap-4 mt-2">
                           <span className="text-xs text-primary font-bold">LVL {u.level || 1}</span>
                           <span className="text-xs text-white/40">{u.xp || 0} XP</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                       <Button onClick={() => { setSelectedUser(u); setNewName(u.displayName || ''); setEditNameModalOpen(true); }} variant="ghost" className="h-12 px-6 rounded-xl font-black text-primary hover:bg-primary/10"><Edit2 className="w-4 h-4 ml-2" /> تعديل</Button>
                       <Button onClick={() => { setSelectedUser(u); setBanModalOpen(true); }} variant="ghost" className="h-12 px-6 rounded-xl font-black text-destructive hover:bg-destructive/10"><Ban className="w-4 h-4 ml-2" /> حظر</Button>
                       <Button variant="ghost" size="icon" onClick={() => { if(confirm("هل تريد حذف حساب الطالب نهائياً؟")) deleteDoc(doc(db, "userProfiles", u.id)).then(() => fetchData()) }} className="text-white/20 hover:text-destructive"><Trash2 className="w-5 h-5" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-10">
             <Tabs defaultValue="editor" className="space-y-6">
                <TabsList className="bg-white/5 p-1 rounded-2xl">
                   <TabsTrigger value="editor" className="px-8 rounded-xl font-bold">المحرر الأساسي</TabsTrigger>
                   <TabsTrigger value="templates" className="px-8 rounded-xl font-bold">الأقسام الجاهزة (Templates)</TabsTrigger>
                   <TabsTrigger value="all" className="px-8 rounded-xl font-bold">كل الأقسام الحالية</TabsTrigger>
                </TabsList>

                <TabsContent value="editor">
                   <Card className="p-10 glass-card rounded-[50px] space-y-10 border-white/5">
                      <div className="flex justify-between items-center border-b border-white/5 pb-8">
                        <h2 className="text-3xl font-black">بناء قسم جديد</h2>
                        <div className="flex gap-4">
                          <Button variant="outline" onClick={handleSaveAsTemplate} disabled={isSubmitting} className="h-14 px-8 rounded-2xl font-bold border-white/10">حفظ كقالب جاهز 💾</Button>
                          <Button onClick={handleSaveSection} disabled={isSubmitting} className="h-14 px-12 bg-primary text-white font-black rounded-2xl">نشر القسم 🚀</Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="space-y-3">
                          <label className="text-xs font-bold uppercase text-primary">رقم القسم</label>
                          <Input type="number" value={newSection.id || ''} onChange={(e) => setNewSection(p => ({ ...p, id: parseInt(e.target.value) }))} className="h-14 bg-black border-white/10" />
                        </div>
                        <div className="md:col-span-2 space-y-3">
                          <label className="text-xs font-bold uppercase text-primary">عنوان القسم</label>
                          <Input value={newSection.title || ''} onChange={(e) => setNewSection(p => ({ ...p, title: e.target.value }))} className="h-14 bg-black border-white/10" />
                        </div>
                      </div>
                      <div className="space-y-8">
                        <div className="flex justify-between items-center">
                          <h3 className="text-xl font-black flex items-center gap-3"><HelpCircle className="text-primary" /> الأسئلة</h3>
                          <Button onClick={() => setNewSection(prev => ({ ...prev, questions: [...(prev.questions || []), { id: `q-${Date.now()}`, question: '', options: ['', '', '', ''], correct: '', type: 'analogy' }] }))} variant="secondary" className="bg-primary/10 text-primary">إضافة سؤال</Button>
                        </div>
                        {newSection.questions?.map((q, i) => (
                          <Card key={i} className="p-8 bg-black/50 border-white/5 rounded-[30px] space-y-6">
                            <Input placeholder="نص السؤال" value={q.question} onChange={(e) => {
                               const qs = [...(newSection.questions || [])];
                               qs[i].question = e.target.value;
                               setNewSection(p => ({ ...p, questions: qs }));
                            }} className="text-xl font-black h-14 bg-black border-white/10" />
                          </Card>
                        ))}
                      </div>
                   </Card>
                </TabsContent>

                <TabsContent value="templates">
                   <Card className="p-10 glass-card rounded-[50px] space-y-10 border-white/5">
                      <h2 className="text-3xl font-black flex items-center gap-4"><Layers className="text-primary" /> قوالب الأقسام الجاهزة</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {templates.map((t) => (
                          <Card key={t.firebaseId} className="p-6 bg-white/[0.02] border-white/5 rounded-3xl space-y-4 hover:border-primary/40 transition-all">
                             <div className="flex justify-between items-start">
                               <Badge className="bg-primary/20 text-primary border-none">Template</Badge>
                               <div className="flex gap-2">
                                  <Button onClick={() => useTemplate(t)} size="icon" variant="ghost" className="text-blue-500"><Copy className="w-4 h-4" /></Button>
                                  <Button onClick={() => handleDeleteTemplate(t.firebaseId)} size="icon" variant="ghost" className="text-rose-500"><Trash2 className="w-4 h-4" /></Button>
                               </div>
                             </div>
                             <h3 className="text-xl font-black">{t.title}</h3>
                             <p className="text-sm text-white/40">{t.questions?.length || 0} سؤال جاهز</p>
                             <Button onClick={() => useTemplate(t)} className="w-full bg-primary/10 text-primary hover:bg-primary hover:text-white font-bold h-12 rounded-xl">استخدام القالب</Button>
                          </Card>
                        ))}
                        {templates.length === 0 && <div className="col-span-full py-20 text-center text-white/20 font-black">لا توجد قوالب جاهزة حالياً</div>}
                      </div>
                   </Card>
                </TabsContent>

                <TabsContent value="all">
                    <Card className="p-10 glass-card rounded-[50px] space-y-6 border-white/5">
                       <h2 className="text-3xl font-black">الأقسام النشطة</h2>
                       <div className="grid gap-4">
                          {sections.map((s) => (
                            <div key={s.id} className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl flex justify-between items-center">
                               <div className="flex items-center gap-4">
                                  <Badge className="bg-primary/20 text-primary">{s.id}</Badge>
                                  <span className="font-black text-lg">{s.title}</span>
                               </div>
                               <div className="flex gap-2">
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
            <Card className="p-10 glass-card rounded-[50px] space-y-10 border-white/5">
              <h2 className="text-3xl font-black flex items-center gap-4"><History className="text-primary" /> سجل النشاط</h2>
              <div className="space-y-4">
                {activityLogs.map((log, i) => (
                  <div key={i} className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <Badge className={cn("text-white", log.action === 'BAN' ? "bg-rose-500" : log.action === 'NAME_CHANGE' ? "bg-emerald-500" : "bg-blue-500")}>{log.action}</Badge>
                      <span className="font-black">{log.userName}</span>
                      <span className="text-white/40"> - {log.reason}</span>
                    </div>
                    <p className="text-xs text-white/20">{log.timestamp?.toDate()?.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* --- Ban Modal --- */}
      <Dialog open={banModalOpen} onOpenChange={setBanModalOpen}>
        <DialogContent className="glass-card border-rose-500/20 text-white rounded-[35px] max-w-lg p-10 outline-none">
          <DialogHeader className="text-center space-y-4">
            <DialogTitle className="text-3xl font-black">حظر طالب 🚫</DialogTitle>
            <DialogDescription className="text-white/40 font-bold">حظر: {selectedUser?.displayName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-8">
            <div className="space-y-2">
              <label className="text-xs font-bold text-primary mr-2">مدة الحظر</label>
              <Select value={banDuration} onValueChange={setBanDuration}>
                <SelectTrigger className="h-14 bg-black/40 border-white/10 rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">1 ساعة</SelectItem>
                  <SelectItem value="1d">1 يوم</SelectItem>
                  <SelectItem value="7d">7 أيام</SelectItem>
                  <SelectItem value="perm">نهائي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-primary mr-2">سبب الحظر (إجباري)</label>
              <Textarea 
                placeholder="سبب الحظر..." 
                value={banReason} 
                onChange={(e) => setBanReason(e.target.value)} 
                className="min-h-[120px] bg-black/40 border-white/10 rounded-2xl focus:border-primary/50" 
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleBanUser} disabled={isSubmitting} className="w-full h-14 bg-rose-500 text-white font-black rounded-2xl shadow-xl hover:bg-rose-600 transition-all">
              {isSubmitting ? <Loader2 className="animate-spin" /> : "تأكيد الحظر"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Edit Name Modal --- */}
      <Dialog open={editNameModalOpen} onOpenChange={setEditNameModalOpen}>
        <DialogContent className="glass-card border-primary/20 text-white rounded-[35px] max-w-lg p-10 outline-none">
          <DialogHeader className="text-center space-y-4">
            <DialogTitle className="text-3xl font-black">تعديل اسم الطالب ✏️</DialogTitle>
            <DialogDescription className="text-white/40 font-bold">تعديل: {selectedUser?.displayName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-8">
            <div className="space-y-2">
              <label className="text-xs font-bold text-primary mr-2">الاسم الجديد</label>
              <Input 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)} 
                className="h-14 bg-black/40 border-white/10 rounded-2xl focus:border-primary/50" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-primary mr-2">سبب التعديل (إجباري)</label>
              <Textarea 
                placeholder="لماذا يتم تغيير الاسم؟" 
                value={nameChangeReason} 
                onChange={(e) => setNameChangeReason(e.target.value)} 
                className="min-h-[100px] bg-black/40 border-white/10 rounded-2xl focus:border-primary/50" 
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleEditName} disabled={isSubmitting} className="w-full h-14 bg-primary text-white font-black rounded-2xl shadow-xl hover:scale-[1.02] transition-all">
              {isSubmitting ? <Loader2 className="animate-spin" /> : "حفظ التعديلات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
