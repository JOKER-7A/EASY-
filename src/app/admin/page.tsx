'use client';

import React, { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { getSectionsFromDb } from '@/lib/db-service';
import { 
  collection, getDocs, addDoc, doc, deleteDoc, updateDoc, query, orderBy, limit, where, getDoc 
} from 'firebase/firestore';
import { Section, Question } from '@/lib/practice-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, Trash2, LogOut, Settings, LayoutDashboard, FileText, HelpCircle, Loader2, Save, Users, 
  Search, Edit2, BookOpen, ShieldCheck, Database, Ban, AlertCircle, MessageSquare, TrendingUp,
  UserPlus, CheckCircle2, XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sections, setSections] = useState<Section[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [errorLogs, setErrorLogs] = useState<any[]>([]);
  const [stats, setStats] = useState({
    students: 0,
    sections: 0,
    questions: 0,
    errors: 0,
    banned: 0,
    active: 0
  });
  
  const { toast } = useToast();

  const [newSection, setNewSection] = useState<Partial<Section>>({
    id: 0,
    title: '',
    questions: [],
    readingPassages: [],
    duration: 13
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userRef = doc(db, "userProfiles", u.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().status === 'admin') {
          setIsAdmin(true);
          fetchData();
        } else {
          setIsAdmin(false);
          if (u) signOut(auth);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchData = async () => {
    try {
      const sectionsData = await getSectionsFromDb();
      setSections(sectionsData);
      
      const usersSnap = await getDocs(collection(db, "userProfiles"));
      const usersData = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsersList(usersData);

      const errorsSnap = await getDocs(collection(db, "errorLogs"));
      const errorsData = errorsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setErrorLogs(errorsData);
      
      setStats({
        students: usersData.length,
        sections: sectionsData.length,
        questions: sectionsData.reduce((acc, s) => acc + (s.questions?.length || 0), 0),
        errors: errorsData.length,
        banned: usersData.filter(u => u.isBanned).length,
        active: usersData.filter(u => u.xp > 0).length
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      toast({ title: "خطأ في الدخول", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleBan = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "userProfiles", userId), { isBanned: !currentStatus });
      toast({ title: currentStatus ? "تم فك الحظر ✅" : "تم الحظر 🚫" });
      fetchData();
    } catch (e) { toast({ title: "فشلت العملية", variant: "destructive" }); }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الطالب نهائياً؟")) return;
    try {
      await deleteDoc(doc(db, "userProfiles", userId));
      toast({ title: "تم حذف الطالب بنجاح" });
      fetchData();
    } catch (e) { toast({ title: "فشلت العملية", variant: "destructive" }); }
  };

  const handleSaveSection = async () => {
    if (!newSection.title || !newSection.id) {
      toast({ title: "يرجى إكمال البيانات", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "sections"), {
        ...newSection,
        createdAt: new Date()
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

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Loader2 className="animate-spin text-primary w-12 h-12" />
    </div>
  );

  if (!user || !isAdmin) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center p-4 bg-mesh">
        <Card className="w-full max-w-md p-10 glass-card rounded-[40px] border-primary/20">
          <div className="text-center mb-10">
            <ShieldCheck className="w-20 h-20 text-primary mx-auto mb-6 text-glow" />
            <h1 className="text-4xl font-black text-white">بوابة الإدارة 🔐</h1>
            <p className="text-primary/60 font-bold mt-2 uppercase tracking-widest text-xs">EASY Administrative Access</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <Input type="email" placeholder="admin@easy.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-16 rounded-2xl bg-white/5 border-white/10" required />
            <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="h-16 rounded-2xl bg-white/5 border-white/10" required />
            <Button disabled={isSubmitting} type="submit" className="w-full h-16 bg-primary text-white font-black text-2xl rounded-2xl shadow-xl">
              {isSubmitting ? <Loader2 className="animate-spin" /> : "تحقق 🚀"}
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
              <Settings className="text-primary w-8 h-8" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight">لوحة القيادة</h1>
              <p className="text-primary font-bold uppercase tracking-widest text-xs opacity-60">Elite Control Center</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => window.location.href = '/'} className="h-12 px-8 rounded-2xl border-white/10 font-bold">الموقع الرئيسي</Button>
            <Button variant="ghost" onClick={() => signOut(auth)} className="h-12 px-8 rounded-2xl text-destructive hover:bg-destructive/10 font-bold">خروج</Button>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          {[
            { label: 'الطلاب', val: stats.students, icon: Users, color: 'text-blue-500' },
            { label: 'الأقسام', val: stats.sections, icon: Database, color: 'text-purple-500' },
            { label: 'الأسئلة', val: stats.questions, icon: FileText, color: 'text-emerald-500' },
            { label: 'الأخطاء', val: stats.errors, icon: AlertCircle, color: 'text-rose-500' },
            { label: 'محظورين', val: stats.banned, icon: Ban, color: 'text-orange-500' },
            { label: 'نشطين', val: stats.active, icon: TrendingUp, color: 'text-cyan-500' },
          ].map((s, i) => (
            <Card key={i} className="p-8 glass-card rounded-[35px] text-center space-y-3 group hover:border-primary/40 transition-all border-white/5">
              <s.icon className={cn("w-10 h-10 mx-auto transition-transform group-hover:scale-110", s.color)} />
              <p className="text-4xl font-black">{s.val}</p>
              <p className="text-white/40 font-bold text-xs uppercase tracking-wider">{s.label}</p>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="users" className="space-y-10">
          <TabsList className="bg-white/5 border border-white/5 p-2 h-20 rounded-[30px] w-full md:w-auto">
            <TabsTrigger value="users" className="px-12 font-black rounded-[20px] h-full text-lg">الطلاب</TabsTrigger>
            <TabsTrigger value="content" className="px-12 font-black rounded-[20px] h-full text-lg">المحتوى</TabsTrigger>
            <TabsTrigger value="errors" className="px-12 font-black rounded-[20px] h-full text-lg">الأخطاء</TabsTrigger>
            <TabsTrigger value="settings" className="px-12 font-black rounded-[20px] h-full text-lg">الإعدادات</TabsTrigger>
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
                  <div key={u.id} className="flex flex-col md:flex-row justify-between items-center p-8 bg-white/[0.02] border border-white/5 rounded-3xl hover:border-primary/20 transition-all">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center font-black text-2xl text-primary">
                        {u.displayName?.[0] || 'U'}
                      </div>
                      <div>
                        <p className="font-black text-xl flex items-center gap-3">
                          {u.displayName || 'بدون اسم'}
                          {u.isBanned && <Badge className="bg-destructive text-white border-none">محظور</Badge>}
                        </p>
                        <p className="text-white/30 font-bold text-sm">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 mt-6 md:mt-0">
                      <div className="text-center">
                        <p className="text-xl font-black text-primary">LVL {u.level || 1}</p>
                        <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">المستوى</p>
                      </div>
                      <div className="w-px h-10 bg-white/5" />
                      <div className="text-center">
                        <p className="text-xl font-black text-white">{u.xp || 0}</p>
                        <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">XP</p>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => handleToggleBan(u.id, !!u.isBanned)} variant="ghost" className={cn("h-12 px-6 rounded-xl font-black", u.isBanned ? "text-green-500" : "text-destructive")}>
                          {u.isBanned ? "فك الحظر" : "حظر"}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(u.id)} className="text-white/20 hover:text-destructive"><Trash2 className="w-5 h-5" /></Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-10">
             <Card className="p-10 glass-card rounded-[50px] space-y-10 border-white/5">
                <div className="flex justify-between items-center border-b border-white/5 pb-8">
                  <h2 className="text-3xl font-black">إضافة نموذج جديد</h2>
                  <Button onClick={handleSaveSection} disabled={isSubmitting} className="h-16 px-12 bg-primary text-white font-black rounded-2xl">
                    {isSubmitting ? <Loader2 className="animate-spin" /> : "نشر النموذج 🚀"}
                  </Button>
                </div>
                {/* Section Creation Logic */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-3">
                    <label className="text-xs font-bold uppercase text-primary">رقم النموذج</label>
                    <Input type="number" value={newSection.id || ''} onChange={(e) => setNewSection(p => ({ ...p, id: parseInt(e.target.value) }))} className="h-14 bg-black border-white/10" />
                  </div>
                  <div className="md:col-span-2 space-y-3">
                    <label className="text-xs font-bold uppercase text-primary">عنوان النموذج</label>
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
                      <div className="grid grid-cols-2 gap-4">
                        {q.options.map((opt, oi) => (
                          <Input key={oi} placeholder={`الخيار ${['أ', 'ب', 'ج', 'د'][oi]}`} value={opt} onChange={(e) => {
                            const qs = [...(newSection.questions || [])];
                            qs[i].options[oi] = e.target.value;
                            setNewSection(p => ({ ...p, questions: qs }));
                          }} className="bg-black border-white/10" />
                        ))}
                      </div>
                      <Select value={q.correct} onValueChange={(val) => {
                        const qs = [...(newSection.questions || [])];
                        qs[i].correct = val;
                        setNewSection(p => ({ ...p, questions: qs }));
                      }}>
                        <SelectTrigger className="h-12 bg-black border-green-500/20 text-green-500"><SelectValue placeholder="اختر الإجابة الصحيحة" /></SelectTrigger>
                        <SelectContent>{q.options.map((o, idx) => o && <SelectItem key={idx} value={o}>{o}</SelectItem>)}</SelectContent>
                      </Select>
                    </Card>
                  ))}
                </div>
             </Card>
          </TabsContent>

          <TabsContent value="errors">
            <Card className="p-10 glass-card rounded-[50px] space-y-10 border-white/5">
               <h2 className="text-3xl font-black">مراجعة أخطاء الطلاب العامة</h2>
               <div className="space-y-6">
                 {errorLogs.map((log, i) => (
                   <Card key={i} className="p-6 bg-white/[0.02] border-white/5 rounded-3xl space-y-4">
                      <div className="flex justify-between">
                         <Badge className="bg-rose-500/10 text-rose-500 border-none">خطأ {log.count || 1}</Badge>
                         <p className="text-xs text-white/30">{log.lastOccurred?.toDate()?.toLocaleString()}</p>
                      </div>
                      <p className="text-xl font-black text-white">{log.questionData?.question}</p>
                      <div className="p-4 rounded-xl bg-green-500/10 text-green-500 text-sm font-bold">
                        الصحيح: {log.questionData?.correct}
                      </div>
                   </Card>
                 ))}
               </div>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="p-10 glass-card rounded-[50px] space-y-10 border-white/5">
              <h2 className="text-3xl font-black">إعدادات المنصة</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                 <div className="space-y-4">
                    <label className="text-xs font-bold uppercase text-primary">رابط الواتساب</label>
                    <Input placeholder="https://wa.me/..." className="h-14 bg-black border-white/10" />
                 </div>
                 <div className="space-y-4">
                    <label className="text-xs font-bold uppercase text-primary">رسالة الترحيب</label>
                    <Input placeholder="أهلاً بك في EASY..." className="h-14 bg-black border-white/10" />
                 </div>
              </div>
              <Button className="h-16 px-12 bg-primary font-black rounded-2xl">حفظ التغييرات</Button>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
