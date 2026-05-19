'use client';

import React, { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut,
  User 
} from 'firebase/auth';
import { 
  getSectionsFromDb, 
  addSectionToDb, 
  deleteSectionFromDb,
  getAllUserProfiles,
  updateUserProfileName 
} from '@/lib/db-service';
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
  Link,
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
    duration: 13,
    pdfLink: ''
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
      const data = await getAllUserProfiles();
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
      toast({ 
        title: "خطأ في تسجيل الدخول", 
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => signOut(auth);

  const handleSaveSection = async () => {
    if (!newSection.title || !newSection.id) {
      toast({ title: "يرجى إكمال البيانات الأساسية (الرقم والعنوان)", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await addSectionToDb(newSection);
      setNewSection({ 
        id: 0, 
        title: '', 
        questions: [], 
        readingPassages: [], 
        duration: 13,
        pdfLink: ''
      });
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
    if (confirm('هل أنت متأكد من حذف هذا النموذج نهائياً؟')) {
      try {
        await deleteSectionFromDb(firebaseId);
        await fetchSections();
        toast({ title: "تم الحذف بنجاح" });
      } catch (error) {
        toast({ title: "فشل الحذف", variant: "destructive" });
      }
    }
  };

  const handleUpdateUserName = async (userId: string, oldName: string) => {
    const newName = prompt('أدخل الاسم الجديد:', oldName);
    if (newName && newName !== oldName) {
      try {
        await updateUserProfileName(userId, newName);
        fetchUsers();
        toast({ title: "تم تحديث الاسم بنجاح" });
      } catch (error) {
        toast({ title: "فشل تحديث الاسم", variant: "destructive" });
      }
    }
  };

  const addQuestionField = () => {
    const q: Question = {
      id: `q-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
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

  const removeQuestion = (index: number) => {
    setNewSection(prev => ({
      ...prev,
      questions: prev.questions?.filter((_, i) => i !== index)
    }));
  };

  const removePassage = (index: number) => {
    setNewSection(prev => ({
      ...prev,
      readingPassages: prev.readingPassages?.filter((_, i) => i !== index)
    }));
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

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Loader2 className="w-12 h-12 text-primary animate-spin" />
    </div>
  );

  if (!user) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 glass border-primary/20 rounded-3xl shadow-2xl">
          <div className="text-center mb-8">
            <ShieldCheck className="w-16 h-16 text-primary mx-auto mb-4" />
            <h1 className="text-3xl font-black text-white">دخول المشرف 🔐</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-white/60 text-sm font-bold pr-2">البريد الإلكتروني</label>
              <Input 
                type="email" 
                placeholder="admin@easy.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/20"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-white/60 text-sm font-bold pr-2">كلمة المرور</label>
              <Input 
                type="password" 
                placeholder="••••••••" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/20"
                required
              />
            </div>
            <Button disabled={isSubmitting} type="submit" className="w-full h-14 bg-primary text-white font-black text-xl rounded-2xl shadow-primary/20 hover:scale-[1.02] transition-all">
              {isSubmitting ? <Loader2 className="animate-spin" /> : "دخول 🚀"}
            </Button>
          </form>
        </Card>
      </main>
    );
  }

  const filteredUsers = usersList.filter(u => 
    u.displayName?.toLowerCase().includes(userSearch.toLowerCase()) || 
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-black p-4 md:p-10 text-white">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
          <div className="flex items-center gap-6">
            <div className="bg-primary p-4 rounded-[20px] shadow-primary/20">
              <Settings className="text-white w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black">لوحة التحكم</h1>
              <p className="text-primary font-bold">إدارة المحتوى والمستخدمين</p>
            </div>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => window.location.href = '/'} className="h-12 border-white/10 hover:bg-white/5 rounded-xl">
              عرض الموقع
            </Button>
            <Button variant="outline" onClick={handleLogout} className="h-12 border-destructive/30 text-destructive hover:bg-destructive/10 rounded-xl">
              تسجيل خروج
            </Button>
          </div>
        </header>

        <Tabs defaultValue="content" className="space-y-8">
          <TabsList className="bg-white/5 border border-white/5 p-1 h-16 rounded-2xl">
            <TabsTrigger value="content" className="px-8 font-black data-[state=active]:bg-primary data-[state=active]:text-white rounded-xl h-full transition-all">
              <LayoutDashboard className="ml-2 w-5 h-5" /> المحتوى
            </TabsTrigger>
            <TabsTrigger value="users" className="px-8 font-black data-[state=active]:bg-primary data-[state=active]:text-white rounded-xl h-full transition-all">
              <Users className="ml-2 w-5 h-5" /> المستخدمين
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-10">
            <Card className="p-6 md:p-12 glass border-white/5 rounded-[40px] space-y-10">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/5 pb-8">
                <h2 className="text-3xl font-black flex items-center gap-3">
                  <Plus className="text-primary" /> إضافة نموذج جديد
                </h2>
                <Button 
                  onClick={handleSaveSection} 
                  disabled={isSubmitting}
                  className="h-16 px-12 bg-primary text-white font-black rounded-2xl text-xl shadow-primary/30"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" /> : <><Save className="ml-2 w-6 h-6" /> نشر النموذج 🚀</>}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-3">
                  <label className="text-white/40 font-bold pr-1 text-sm">رقم النموذج</label>
                  <Input 
                    type="number"
                    placeholder="مثلاً: 101" 
                    value={newSection.id || ''}
                    onChange={(e) => setNewSection(prev => ({ ...prev, id: parseInt(e.target.value) }))}
                    className="bg-black border-white/10 h-16 text-xl rounded-2xl"
                  />
                </div>
                <div className="space-y-3 md:col-span-2">
                  <label className="text-white/40 font-bold pr-1 text-sm">عنوان النموذج</label>
                  <Input 
                    placeholder="اسم النموذج التدريبي" 
                    value={newSection.title || ''}
                    onChange={(e) => setNewSection(prev => ({ ...prev, title: e.target.value }))}
                    className="bg-black border-white/10 h-16 text-xl rounded-2xl"
                  />
                </div>
                <div className="space-y-3 md:col-span-3">
                  <label className="text-white/40 font-bold pr-1 text-sm">رابط ملف PDF (اختياري)</label>
                  <Input 
                    placeholder="https://example.com/file.pdf" 
                    value={newSection.pdfLink || ''}
                    onChange={(e) => setNewSection(prev => ({ ...prev, pdfLink: e.target.value }))}
                    className="bg-black border-white/10 h-16 rounded-2xl"
                  />
                </div>
              </div>

              {/* Reading Passages */}
              <div className="space-y-8">
                <div className="flex justify-between items-center bg-white/5 p-6 rounded-3xl border border-white/5">
                  <h3 className="text-2xl font-black text-primary flex items-center gap-3">
                    <BookOpen className="w-6 h-6" /> قطع استيعاب المقروء
                  </h3>
                  <Button onClick={addPassageField} variant="secondary" className="font-black bg-primary/20 text-primary hover:bg-primary/30 rounded-xl px-6">
                    <Plus className="ml-1 w-5 h-5" /> إضافة قطعة
                  </Button>
                </div>
                <div className="space-y-6">
                  {newSection.readingPassages?.map((passage, pIndex) => (
                    <Card key={pIndex} className="p-8 bg-black/50 border-white/5 rounded-[30px] relative overflow-hidden">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removePassage(pIndex)} 
                        className="absolute left-6 top-6 text-destructive hover:bg-destructive/10 rounded-full"
                      >
                        <Trash2 className="w-6 h-6" />
                      </Button>
                      <div className="grid gap-6 mt-6">
                        <Input 
                          placeholder="عنوان القطعة" 
                          value={passage.title}
                          onChange={(e) => updatePassage(pIndex, 'title', e.target.value)}
                          className="bg-black border-white/10 h-14 font-bold rounded-xl"
                        />
                        <Textarea 
                          placeholder="نص القطعة بالكامل..." 
                          value={passage.text}
                          onChange={(e) => updatePassage(pIndex, 'text', e.target.value)}
                          className="bg-black border-white/10 min-h-[200px] leading-relaxed rounded-xl text-lg"
                        />
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Questions Section */}
              <div className="space-y-8">
                <div className="flex justify-between items-center bg-white/5 p-6 rounded-3xl border border-white/5">
                  <h3 className="text-2xl font-black text-primary flex items-center gap-3">
                    <HelpCircle className="w-6 h-6" /> أسئلة النموذج
                  </h3>
                  <Button onClick={addQuestionField} variant="secondary" className="font-black bg-primary/20 text-primary hover:bg-primary/30 rounded-xl px-6">
                    <Plus className="ml-1 w-5 h-5" /> إضافة سؤال
                  </Button>
                </div>
                <div className="space-y-8">
                  {newSection.questions?.map((q, qIndex) => (
                    <Card key={qIndex} className="p-8 bg-black/50 border-white/5 rounded-[40px] space-y-6">
                      <div className="flex flex-wrap items-center justify-between gap-6 border-b border-white/5 pb-6">
                        <div className="flex items-center gap-6">
                          <span className="bg-primary text-white px-5 py-2 rounded-xl font-black text-lg">سؤال {qIndex + 1}</span>
                          <Select 
                            value={q.type} 
                            onValueChange={(val) => updateQuestion(qIndex, 'type', val)}
                          >
                            <SelectTrigger className="w-48 bg-black border-white/10 h-12 rounded-xl">
                              <SelectValue placeholder="النمط" />
                            </SelectTrigger>
                            <SelectContent className="bg-black border-white/10">
                              <SelectItem value="analogy">تناظر لفظي</SelectItem>
                              <SelectItem value="error">خطأ سياقي</SelectItem>
                              <SelectItem value="context">إكمال جمل</SelectItem>
                              <SelectItem value="reading">استيعاب مقروء</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeQuestion(qIndex)} className="text-destructive hover:bg-destructive/10 rounded-full">
                          <Trash2 className="w-6 h-6" />
                        </Button>
                      </div>

                      <Input 
                        placeholder="نص السؤال" 
                        value={q.question}
                        onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                        className="bg-black border-white/10 h-16 text-2xl font-black rounded-2xl"
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {q.options.map((opt, oIndex) => (
                          <div key={oIndex} className="flex gap-4 items-center">
                            <span className="text-primary font-black w-10 text-2xl">{['أ', 'ب', 'ج', 'د'][oIndex]}</span>
                            <Input 
                              placeholder={`الخيار ${['أ', 'ب', 'ج', 'د'][oIndex]}`} 
                              value={opt}
                              onChange={(e) => {
                                const opts = [...q.options];
                                opts[oIndex] = e.target.value;
                                updateQuestion(qIndex, 'options', opts);
                              }}
                              className="bg-black border-white/10 h-14 rounded-xl"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="bg-green-500/5 p-6 rounded-2xl border border-green-500/20">
                        <label className="text-green-500 text-xs font-black block mb-3 uppercase tracking-widest">الإجابة الصحيحة</label>
                        <Input 
                          placeholder="النص الصحيح" 
                          value={q.correct}
                          onChange={(e) => updateQuestion(qIndex, 'correct', e.target.value)}
                          className="bg-black border-green-500/20 text-green-500 font-black h-14 rounded-xl text-lg"
                        />
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </Card>

            <div className="space-y-8">
              <h2 className="text-3xl font-black flex items-center gap-4">
                <FileText className="text-primary" /> النماذج المنشورة ({sections.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {sections.map((section) => (
                  <Card key={section.firebaseId} className="p-8 glass border-white/5 rounded-[40px] flex justify-between items-center group hover:border-primary/50 transition-all shadow-xl">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-primary text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg">
                        {section.id}
                      </div>
                      <div>
                        <h3 className="text-xl font-black line-clamp-1">{section.title}</h3>
                        <p className="text-sm text-white/30">{section.questions.length} سؤال</p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      onClick={() => handleDelete(section.firebaseId)}
                      className="text-destructive hover:bg-destructive/10 rounded-full w-12 h-12"
                    >
                      <Trash2 className="w-6 h-6" />
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-10">
            <Card className="p-10 glass border-white/5 rounded-[50px] space-y-10">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border-b border-white/5 pb-8">
                <div>
                  <h2 className="text-3xl md:text-4xl font-black">إدارة الحسابات</h2>
                  <p className="text-white/40 font-bold mt-2">بيانات المستخدمين الحقيقية والأسماء المختارة</p>
                </div>
                <div className="relative w-full md:w-96">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 w-6 h-6" />
                  <Input 
                    placeholder="ابحث بالاسم أو الإيميل..." 
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="bg-white/5 border-white/10 h-16 pr-12 rounded-2xl text-lg"
                  />
                </div>
              </div>

              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="text-primary border-b border-white/10">
                      <th className="py-6 px-4 font-black text-xl">المستخدم</th>
                      <th className="py-6 px-4 font-black text-xl">البريد الإلكتروني</th>
                      <th className="py-6 px-4 font-black text-center text-xl">المستوى</th>
                      <th className="py-6 px-4 font-black text-center text-xl">النقاط (XP)</th>
                      <th className="py-6 px-4 font-black text-center text-xl">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="py-6 px-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary">
                              <UserIcon className="w-6 h-6" />
                            </div>
                            <span className="font-black text-xl">{u.displayName || 'بدون اسم'}</span>
                          </div>
                        </td>
                        <td className="py-6 px-4">
                          <div className="flex items-center gap-2 text-white/40">
                            <Mail className="w-4 h-4" />
                            <span className="text-lg font-mono">{u.email || 'غير متوفر'}</span>
                          </div>
                        </td>
                        <td className="py-6 px-4 text-center">
                          <Badge className="bg-primary/20 text-primary border-primary/30 px-4 py-1 rounded-lg text-lg font-black">
                            {u.level || 1}
                          </Badge>
                        </td>
                        <td className="py-6 px-4 text-center font-mono text-xl text-white/60">
                          {Math.round(u.xp || 0)}
                        </td>
                        <td className="py-6 px-4 text-center">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleUpdateUserName(u.id, u.displayName)}
                            className="text-primary hover:bg-primary/20 rounded-xl w-12 h-12"
                          >
                            <Edit2 className="w-5 h-5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}