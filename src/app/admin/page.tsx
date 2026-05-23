'use client';

import React, { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut,
  User 
} from 'firebase/auth';
import { 
  getSectionsFromDb, 
} from '@/lib/db-service';
import { 
  collection, 
  getDocs, 
  addDoc, 
  doc, 
  deleteDoc, 
  updateDoc 
} from 'firebase/firestore';
import { Section, Question, ReadingPassage } from '@/lib/practice-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Trash2, 
  LogOut, 
  Settings, 
  LayoutDashboard,
  FileText,
  HelpCircle,
  Loader2,
  Save,
  Users,
  Search,
  Edit2,
  BookOpen,
  CheckCircle2,
  ShieldCheck,
  Mail,
  User as UserIcon
} from 'lucide-react';

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sections, setSections] = useState<Section[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const { toast } = useToast();

  const [newSection, setNewSection] = useState<Partial<Section>>({
    id: 0,
    title: '',
    questions: [],
    readingPassages: [],
    duration: 13
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        fetchSections();
        fetchUsers();
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchSections = async () => {
    try {
      const data = await getSectionsFromDb();
      setSections(data);
    } catch (error) {
      console.error("Failed to fetch sections", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const snapshot = await getDocs(collection(db, "userProfiles"));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsersList(data);
    } catch (error) {
      console.error("Failed to fetch users", error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "تم تسجيل الدخول بنجاح ✅" });
    } catch (error: any) {
      toast({ title: "خطأ في تسجيل الدخول", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => signOut(auth);

  const handleSaveSection = async () => {
    if (!newSection.title || !newSection.id) {
      toast({ title: "يرجى إكمال البيانات الأساسية", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "sections"), newSection);
      setNewSection({ id: 0, title: '', questions: [], readingPassages: [], duration: 13 });
      await fetchSections();
      toast({ title: "تم نشر النموذج بنجاح! 🚀" });
    } catch (error) {
      toast({ title: "حدث خطأ أثناء الحفظ", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (firebaseId: string | undefined) => {
    if (!firebaseId) return;
    if (confirm('هل أنت متأكد من الحذف؟')) {
      try {
        await deleteDoc(doc(db, "sections", firebaseId));
        await fetchSections();
        toast({ title: "تم الحذف بنجاح" });
      } catch (error) {
        toast({ title: "فشل الحذف", variant: "destructive" });
      }
    }
  };

  const addQuestionField = () => {
    const q: Question = {
      id: `q-${Date.now()}`,
      question: '',
      options: ['', '', '', ''],
      correct: '',
      type: 'analogy'
    };
    setNewSection(prev => ({ ...prev, questions: [...(prev.questions || []), q] }));
  };

  const addPassageField = () => {
    const p: ReadingPassage = { title: '', text: '' };
    setNewSection(prev => ({ ...prev, readingPassages: [...(prev.readingPassages || []), p] }));
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    setNewSection(prev => {
      const qs = [...(prev.questions || [])];
      qs[index] = { ...qs[index], [field]: value };
      return { ...prev, questions: qs };
    });
  };

  const updatePassage = (index: number, field: keyof ReadingPassage, value: string) => {
    setNewSection(prev => {
      const ps = [...(prev.readingPassages || [])];
      ps[index] = { ...ps[index], [field]: value };
      return { ...prev, readingPassages: ps };
    });
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  if (!user) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 glass border-primary/20 rounded-3xl shadow-2xl">
          <div className="text-center mb-8">
            <ShieldCheck className="w-16 h-16 text-primary mx-auto mb-4" />
            <h1 className="text-3xl font-black text-white">دخول المشرف 🔐</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <Input type="email" placeholder="admin@easy.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <Button disabled={isSubmitting} type="submit" className="w-full h-14 bg-primary text-white font-black text-xl">
              {isSubmitting ? <Loader2 className="animate-spin" /> : "دخول 🚀"}
            </Button>
          </form>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black p-4 md:p-10 text-white">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
          <div className="flex items-center gap-6">
            <div className="bg-primary p-4 rounded-[20px]">
              <Settings className="text-white w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black">لوحة التحكم</h1>
              <p className="text-primary font-bold">إدارة المحتوى والمستخدمين</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} className="border-destructive/30 text-destructive">تسجيل خروج</Button>
        </header>

        <Tabs defaultValue="content" className="space-y-8">
          <TabsList className="bg-white/5 border border-white/5 p-1 h-16 rounded-2xl">
            <TabsTrigger value="content" className="px-8 font-black rounded-xl h-full">المحتوى</TabsTrigger>
            <TabsTrigger value="users" className="px-8 font-black rounded-xl h-full">المستخدمين</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-10">
            <Card className="p-6 md:p-12 glass border-white/5 rounded-[40px] space-y-10">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/5 pb-8">
                <h2 className="text-3xl font-black">إضافة نموذج جديد</h2>
                <Button onClick={handleSaveSection} disabled={isSubmitting} className="h-16 px-12 bg-primary text-white font-black rounded-2xl">
                  {isSubmitting ? <Loader2 className="animate-spin" /> : "نشر النموذج 🚀"}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Input type="number" placeholder="رقم النموذج" value={newSection.id || ''} onChange={(e) => setNewSection(prev => ({ ...prev, id: parseInt(e.target.value) }))} className="bg-black border-white/10 h-16 text-xl rounded-2xl" />
                <Input placeholder="عنوان النموذج" value={newSection.title || ''} onChange={(e) => setNewSection(prev => ({ ...prev, title: e.target.value }))} className="md:col-span-2 bg-black border-white/10 h-16 text-xl rounded-2xl" />
              </div>

              <div className="space-y-8">
                <Button onClick={addPassageField} variant="secondary" className="font-black bg-primary/20 text-primary">إضافة قطعة قراءة</Button>
                {newSection.readingPassages?.map((passage, pIndex) => (
                  <Card key={pIndex} className="p-8 bg-black/50 border-white/5 rounded-[30px] space-y-6">
                    <Input placeholder="عنوان القطعة" value={passage.title} onChange={(e) => updatePassage(pIndex, 'title', e.target.value)} />
                    <Textarea placeholder="نص القطعة..." value={passage.text} onChange={(e) => updatePassage(pIndex, 'text', e.target.value)} className="min-h-[150px]" />
                  </Card>
                ))}
              </div>

              <div className="space-y-8">
                <Button onClick={addQuestionField} variant="secondary" className="font-black bg-primary/20 text-primary">إضافة سؤال</Button>
                {newSection.questions?.map((q, qIndex) => (
                  <Card key={qIndex} className="p-8 bg-black/50 border-white/5 rounded-[40px] space-y-6">
                    <div className="flex justify-between">
                      <Badge className="bg-primary text-white">سؤال {qIndex + 1}</Badge>
                      <Select value={q.type} onValueChange={(val) => updateQuestion(qIndex, 'type', val)}>
                        <SelectTrigger className="w-48 bg-black border-white/10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="analogy">تناظر لفظي</SelectItem>
                          <SelectItem value="error">خطأ سياقي</SelectItem>
                          <SelectItem value="context">إكمال جمل</SelectItem>
                          <SelectItem value="reading">استيعاب مقروء</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Input placeholder="نص السؤال" value={q.question} onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)} className="text-2xl font-black" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {q.options.map((opt, oIndex) => (
                        <Input key={oIndex} placeholder={`الخيار ${['أ', 'ب', 'ج', 'د'][oIndex]}`} value={opt} onChange={(e) => {
                          const opts = [...q.options];
                          opts[oIndex] = e.target.value;
                          updateQuestion(qIndex, 'options', opts);
                        }} />
                      ))}
                    </div>
                    <Select value={q.correct || "placeholder"} onValueChange={(val) => updateQuestion(qIndex, 'correct', val)}>
                      <SelectTrigger className="border-green-500/20 text-green-500"><SelectValue placeholder="اختر الإجابة الصحيحة" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="placeholder" disabled>اختر الإجابة</SelectItem>
                        {q.options.map((opt, idx) => opt && <SelectItem key={idx} value={opt}>{opt}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Card>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-10">
            <Card className="p-10 glass border-white/5 rounded-[50px] space-y-10">
              <h2 className="text-3xl font-black">إدارة الحسابات</h2>
              <div className="space-y-4">
                {usersList.map((u) => (
                  <div key={u.id} className="flex justify-between items-center p-6 bg-white/5 rounded-2xl">
                    <div className="flex items-center gap-4">
                      <UserIcon className="text-primary" />
                      <div>
                        <p className="font-black text-xl">{u.displayName || 'بدون اسم'}</p>
                        <p className="text-white/40">{u.email}</p>
                      </div>
                    </div>
                    <Badge className="bg-primary/20 text-primary">{u.level || 1} LVL</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}