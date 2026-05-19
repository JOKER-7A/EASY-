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
  CheckCircle2
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
      toast({ title: "يرجى إكمال البيانات الأساسية", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await addSectionToDb(newSection);
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
    <div className="min-h-screen bg-midnight flex items-center justify-center">
      <Loader2 className="w-12 h-12 text-goldenrod animate-spin" />
    </div>
  );

  if (!user) {
    return (
      <main className="min-h-screen bg-midnight flex items-center justify-center p-4">
        <Card className="w-full max-w-xl p-8 md:p-12 glass border-goldenrod/30 rounded-3xl md:rounded-[60px] shadow-2xl">
          <h1 className="text-4xl md:text-6xl font-black text-white text-center mb-10">دخول المشرف 🔐</h1>
          <form onSubmit={handleLogin} className="space-y-6">
            <Input 
              type="email" 
              placeholder="البريد الإلكتروني" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 md:h-16 rounded-2xl md:rounded-3xl bg-white/5 border-white/10 text-white"
              required
            />
            <Input 
              type="password" 
              placeholder="كلمة المرور" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 md:h-16 rounded-2xl md:rounded-3xl bg-white/5 border-white/10 text-white"
              required
            />
            <Button disabled={isSubmitting} type="submit" className="w-full h-14 md:h-20 rounded-2xl md:rounded-3xl bg-goldenrod text-midnight font-black text-xl md:text-2xl gold-glow transition-all">
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
    <main className="min-h-screen bg-midnight p-4 md:p-10">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
          <div className="flex items-center gap-6">
            <div className="bg-goldenrod p-4 rounded-[30px] shadow-xl">
              <Settings className="text-midnight w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-white">لوحة التحكم</h1>
              <p className="text-xl text-muted-foreground font-bold">إدارة المنصة والمستخدمين</p>
            </div>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => window.location.href = '/'} className="h-14 px-8 rounded-2xl font-black border-white/10 text-white">
              عرض الموقع
            </Button>
            <Button variant="outline" onClick={handleLogout} className="h-14 px-8 rounded-2xl font-black border-vermillion/30 text-vermillion">
              خروج
            </Button>
          </div>
        </header>

        <Tabs defaultValue="content" className="space-y-10">
          <TabsList className="bg-white/5 border border-white/10 p-1 h-16 rounded-2xl md:rounded-3xl flex w-fit">
            <TabsTrigger value="content" className="rounded-xl md:rounded-2xl px-8 font-black text-lg data-[state=active]:bg-goldenrod data-[state=active]:text-midnight transition-all">
              <LayoutDashboard className="ml-2 w-5 h-5" /> إدارة المحتوى
            </TabsTrigger>
            <TabsTrigger value="users" className="rounded-xl md:rounded-2xl px-8 font-black text-lg data-[state=active]:bg-goldenrod data-[state=active]:text-midnight transition-all">
              <Users className="ml-2 w-5 h-5" /> إدارة المستخدمين
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-10">
            <Card className="p-6 md:p-12 glass border-white/10 rounded-[40px] md:rounded-[60px] space-y-10">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/10 pb-10">
                <h2 className="text-3xl md:text-4xl font-black text-white flex items-center gap-4">
                  <Plus className="text-goldenrod w-10 h-10" /> إضافة نموذج جديد
                </h2>
                <Button 
                  onClick={handleSaveSection} 
                  disabled={isSubmitting}
                  className="h-16 px-12 bg-goldenrod text-midnight font-black rounded-2xl text-xl gold-glow w-full md:w-auto"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" /> : <><Save className="ml-2" /> نشر النموذج 🚀</>}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-3">
                  <label className="text-white font-black text-xl">رقم النموذج</label>
                  <Input 
                    type="number"
                    placeholder="مثلاً: 215" 
                    value={newSection.id || ''}
                    onChange={(e) => setNewSection(prev => ({ ...prev, id: parseInt(e.target.value) }))}
                    className="bg-white/5 border-white/10 text-white h-16 rounded-2xl text-xl"
                  />
                </div>
                <div className="space-y-3 md:col-span-2">
                  <label className="text-white font-black text-xl">عنوان النموذج</label>
                  <Input 
                    placeholder="اسم النموذج" 
                    value={newSection.title || ''}
                    onChange={(e) => setNewSection(prev => ({ ...prev, title: e.target.value }))}
                    className="bg-white/5 border-white/10 text-white h-16 rounded-2xl text-xl"
                  />
                </div>
              </div>

              <div className="space-y-10">
                {/* Reading Passages Section */}
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-black text-goldenrod flex items-center gap-2">
                      <BookOpen className="w-6 h-6" /> قطع القراءة
                    </h3>
                    <Button onClick={addPassageField} variant="secondary" className="font-black rounded-xl">
                      <Plus className="ml-1 w-4 h-4" /> إضافة قطعة
                    </Button>
                  </div>
                  <div className="grid gap-6">
                    {newSection.readingPassages?.map((passage, pIndex) => (
                      <Card key={pIndex} className="p-6 bg-white/5 border-white/10 rounded-3xl space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-white/40 font-black">قطعة {pIndex + 1}</span>
                          <Button variant="ghost" size="icon" onClick={() => removePassage(pIndex)} className="text-vermillion hover:bg-vermillion/10 rounded-full">
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </div>
                        <Input 
                          placeholder="عنوان القطعة" 
                          value={passage.title}
                          onChange={(e) => updatePassage(pIndex, 'title', e.target.value)}
                          className="bg-midnight/50 border-white/10 text-white h-12"
                        />
                        <Textarea 
                          placeholder="نص القطعة..." 
                          value={passage.text}
                          onChange={(e) => updatePassage(pIndex, 'text', e.target.value)}
                          className="bg-midnight/50 border-white/10 text-white min-h-[150px]"
                        />
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Questions Section */}
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-black text-goldenrod flex items-center gap-2">
                      <HelpCircle className="w-6 h-6" /> الأسئلة
                    </h3>
                    <Button onClick={addQuestionField} variant="secondary" className="font-black rounded-xl">
                      <Plus className="ml-1 w-4 h-4" /> إضافة سؤال
                    </Button>
                  </div>
                  <div className="grid gap-6">
                    {newSection.questions?.map((q, qIndex) => (
                      <Card key={qIndex} className="p-6 bg-white/5 border-white/10 rounded-3xl space-y-6">
                        <div className="flex justify-between items-center border-b border-white/5 pb-4">
                          <div className="flex items-center gap-4">
                            <span className="text-white font-black text-lg">سؤال {qIndex + 1}</span>
                            <Select 
                              value={q.type} 
                              onValueChange={(val) => updateQuestion(qIndex, 'type', val)}
                            >
                              <SelectTrigger className="w-40 bg-midnight/50 border-white/10 text-white">
                                <SelectValue placeholder="نوع السؤال" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="analogy">تناظر لفظي</SelectItem>
                                <SelectItem value="error">خطأ سياقي</SelectItem>
                                <SelectItem value="context">إكمال جمل</SelectItem>
                                <SelectItem value="reading">استيعاب مقروء</SelectItem>
                              </SelectContent>
                            </Select>
                            {q.type === 'reading' && (
                              <Select 
                                value={q.passageTitle} 
                                onValueChange={(val) => updateQuestion(qIndex, 'passageTitle', val)}
                              >
                                <SelectTrigger className="w-48 bg-midnight/50 border-white/10 text-white">
                                  <SelectValue placeholder="اختر القطعة" />
                                </SelectTrigger>
                                <SelectContent>
                                  {newSection.readingPassages?.map((p, i) => (
                                    <SelectItem key={i} value={p.title}>{p.title}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => removeQuestion(qIndex)} className="text-vermillion hover:bg-vermillion/10 rounded-full">
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </div>

                        <Input 
                          placeholder="نص السؤال (مثلاً: عصبة : ناس)" 
                          value={q.question}
                          onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                          className="bg-midnight/50 border-white/10 text-white h-14 text-lg font-bold"
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {q.options.map((opt, oIndex) => (
                            <div key={oIndex} className="flex gap-2 items-center">
                              <span className="text-white/40 font-black">{['أ', 'ب', 'ج', 'د'][oIndex]}</span>
                              <Input 
                                placeholder={`خيار ${oIndex + 1}`} 
                                value={opt}
                                onChange={(e) => {
                                  const opts = [...q.options];
                                  opts[oIndex] = e.target.value;
                                  updateQuestion(qIndex, 'options', opts);
                                }}
                                className="bg-midnight/50 border-white/10 text-white h-12"
                              />
                            </div>
                          ))}
                        </div>

                        <div className="pt-2">
                          <label className="text-green-500 font-black mb-2 block">الإجابة الصحيحة (يجب أن تطابق أحد الخيارات تماماً)</label>
                          <Input 
                            placeholder="انسخ الخيار الصحيح هنا" 
                            value={q.correct}
                            onChange={(e) => updateQuestion(qIndex, 'correct', e.target.value)}
                            className="bg-green-500/5 border-green-500/20 text-green-500 h-12 font-black"
                          />
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <div className="space-y-8">
              <h2 className="text-3xl font-black text-white">النماذج المنشورة حالياً</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sections.map((section) => (
                  <Card key={section.firebaseId} className="p-6 glass border-white/5 rounded-[40px] flex justify-between items-center group">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center font-black text-2xl text-goldenrod border border-white/10 group-hover:bg-goldenrod group-hover:text-midnight transition-colors">
                        {section.id}
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-white line-clamp-1">{section.title}</h3>
                        <p className="text-sm text-muted-foreground font-bold">{section.questions.length} سؤال</p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      onClick={() => handleDelete(section.firebaseId)}
                      className="text-vermillion hover:bg-vermillion/10 rounded-full w-12 h-12"
                    >
                      <Trash2 className="w-6 h-6" />
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-8">
            <Card className="p-8 md:p-12 glass border-white/10 rounded-[40px] md:rounded-[60px] space-y-10">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/10 pb-10">
                <h2 className="text-3xl md:text-4xl font-black text-white flex items-center gap-4">
                  <Users className="text-goldenrod w-10 h-10" /> إدارة حسابات المستخدمين
                </h2>
                <div className="relative w-full md:w-96">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-goldenrod/50 w-5 h-5" />
                  <Input 
                    placeholder="ابحث بالاسم أو الإيميل..." 
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="bg-white/5 border-white/10 text-white h-14 rounded-2xl pr-12 text-lg"
                  />
                </div>
              </div>

              <div className="overflow-x-auto custom-scrollbar pb-4">
                <table className="w-full text-right">
                  <thead>
                    <tr className="text-goldenrod border-b border-white/5">
                      <th className="py-6 px-4 font-black text-xl">المستخدم</th>
                      <th className="py-6 px-4 font-black text-xl">الإيميل</th>
                      <th className="py-6 px-4 font-black text-xl text-center">المستوى</th>
                      <th className="py-6 px-4 font-black text-xl text-center">XP</th>
                      <th className="py-6 px-4 font-black text-xl text-center">إدارة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="text-white hover:bg-white/5 transition-colors group">
                        <td className="py-6 px-4">
                          <div className="font-black text-lg md:text-xl">{u.displayName}</div>
                        </td>
                        <td className="py-6 px-4 text-white/50 font-bold">{u.email}</td>
                        <td className="py-6 px-4 text-center">
                          <span className="bg-goldenrod/10 text-goldenrod px-3 py-1 rounded-lg font-black">{u.level}</span>
                        </td>
                        <td className="py-6 px-4 text-center font-mono font-bold">{Math.round(u.xp)}</td>
                        <td className="py-6 px-4 text-center">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleUpdateUserName(u.id, u.displayName)}
                            className="text-goldenrod hover:bg-goldenrod/20 rounded-xl"
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
