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
  CheckCircle2,
  Link
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
    <div className="min-h-screen bg-midnight flex items-center justify-center">
      <Loader2 className="w-12 h-12 text-goldenrod animate-spin" />
    </div>
  );

  if (!user) {
    return (
      <main className="min-h-screen bg-midnight flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 glass border-goldenrod/30 rounded-3xl shadow-2xl">
          <h1 className="text-3xl font-black text-white text-center mb-8">دخول المشرف 🔐</h1>
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
            <Button disabled={isSubmitting} type="submit" className="w-full h-14 bg-goldenrod text-midnight font-black text-xl rounded-2xl gold-glow hover:scale-[1.02] transition-all">
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
    <main className="min-h-screen bg-midnight p-4 md:p-10 text-white">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
          <div className="flex items-center gap-6">
            <div className="bg-goldenrod p-4 rounded-[20px] shadow-xl">
              <Settings className="text-midnight w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black">لوحة التحكم</h1>
              <p className="text-goldenrod font-bold">إدارة محتوى ومستخدمي EASY</p>
            </div>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => window.location.href = '/'} className="h-12 border-white/10 hover:bg-white/5">
              عرض الموقع
            </Button>
            <Button variant="outline" onClick={handleLogout} className="h-12 border-vermillion/30 text-vermillion hover:bg-vermillion/10">
              تسجيل خروج
            </Button>
          </div>
        </header>

        <Tabs defaultValue="content" className="space-y-8">
          <TabsList className="bg-white/5 border border-white/10 p-1 h-14 rounded-2xl">
            <TabsTrigger value="content" className="px-6 font-black data-[state=active]:bg-goldenrod data-[state=active]:text-midnight">
              <LayoutDashboard className="ml-2 w-4 h-4" /> المحتوى
            </TabsTrigger>
            <TabsTrigger value="users" className="px-6 font-black data-[state=active]:bg-goldenrod data-[state=active]:text-midnight">
              <Users className="ml-2 w-4 h-4" /> المستخدمين
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-10">
            <Card className="p-6 md:p-10 glass border-white/10 rounded-[40px] space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/10 pb-6">
                <h2 className="text-2xl md:text-3xl font-black flex items-center gap-3">
                  <Plus className="text-goldenrod" /> إضافة نموذج جديد
                </h2>
                <Button 
                  onClick={handleSaveSection} 
                  disabled={isSubmitting}
                  className="h-14 px-10 bg-goldenrod text-midnight font-black rounded-xl text-lg gold-glow"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" /> : <><Save className="ml-2 w-5 h-5" /> نشر النموذج 🚀</>}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-white/60 font-bold pr-1">رقم النموذج</label>
                  <Input 
                    type="number"
                    placeholder="مثلاً: 101" 
                    value={newSection.id || ''}
                    onChange={(e) => setNewSection(prev => ({ ...prev, id: parseInt(e.target.value) }))}
                    className="bg-midnight border-white/10 h-14 text-lg"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-white/60 font-bold pr-1">عنوان النموذج</label>
                  <Input 
                    placeholder="اسم النموذج التدريبي" 
                    value={newSection.title || ''}
                    onChange={(e) => setNewSection(prev => ({ ...prev, title: e.target.value }))}
                    className="bg-midnight border-white/10 h-14 text-lg"
                  />
                </div>
                <div className="space-y-2 md:col-span-3">
                  <label className="text-white/60 font-bold pr-1">رابط ملف PDF (اختياري)</label>
                  <Input 
                    placeholder="https://example.com/file.pdf" 
                    value={newSection.pdfLink || ''}
                    onChange={(e) => setNewSection(prev => ({ ...prev, pdfLink: e.target.value }))}
                    className="bg-midnight border-white/10 h-14"
                  />
                </div>
              </div>

              {/* Reading Passages Section */}
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl">
                  <h3 className="text-xl font-black text-goldenrod flex items-center gap-2">
                    <BookOpen className="w-5 h-5" /> قطع استيعاب المقروء
                  </h3>
                  <Button onClick={addPassageField} variant="secondary" size="sm" className="font-black bg-goldenrod/20 text-goldenrod hover:bg-goldenrod/30">
                    <Plus className="ml-1 w-4 h-4" /> إضافة قطعة
                  </Button>
                </div>
                <div className="space-y-4">
                  {newSection.readingPassages?.map((passage, pIndex) => (
                    <Card key={pIndex} className="p-6 bg-white/5 border-white/10 rounded-2xl relative">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removePassage(pIndex)} 
                        className="absolute left-4 top-4 text-vermillion hover:bg-vermillion/10"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                      <div className="grid gap-4 mt-4">
                        <Input 
                          placeholder="عنوان القطعة" 
                          value={passage.title}
                          onChange={(e) => updatePassage(pIndex, 'title', e.target.value)}
                          className="bg-midnight border-white/10 h-12 font-bold"
                        />
                        <Textarea 
                          placeholder="نص القطعة بالكامل..." 
                          value={passage.text}
                          onChange={(e) => updatePassage(pIndex, 'text', e.target.value)}
                          className="bg-midnight border-white/10 min-h-[150px] leading-relaxed"
                        />
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Questions Section */}
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl">
                  <h3 className="text-xl font-black text-goldenrod flex items-center gap-2">
                    <HelpCircle className="w-5 h-5" /> أسئلة النموذج
                  </h3>
                  <Button onClick={addQuestionField} variant="secondary" size="sm" className="font-black bg-goldenrod/20 text-goldenrod hover:bg-goldenrod/30">
                    <Plus className="ml-1 w-4 h-4" /> إضافة سؤال
                  </Button>
                </div>
                <div className="space-y-6">
                  {newSection.questions?.map((q, qIndex) => (
                    <Card key={qIndex} className="p-6 bg-white/5 border-white/20 rounded-2xl space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
                        <div className="flex items-center gap-4">
                          <span className="bg-goldenrod text-midnight px-3 py-1 rounded-lg font-black">سؤال {qIndex + 1}</span>
                          <Select 
                            value={q.type} 
                            onValueChange={(val) => updateQuestion(qIndex, 'type', val)}
                          >
                            <SelectTrigger className="w-40 bg-midnight border-white/10">
                              <SelectValue placeholder="النمط" />
                            </SelectTrigger>
                            <SelectContent className="bg-midnight border-white/10">
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
                              <SelectTrigger className="w-48 bg-midnight border-white/10">
                                <SelectValue placeholder="اربط بقطعة" />
                              </SelectTrigger>
                              <SelectContent className="bg-midnight border-white/10">
                                {newSection.readingPassages?.map((p, i) => (
                                  <SelectItem key={i} value={p.title}>{p.title}</SelectItem>
                                ))}
                                {(!newSection.readingPassages || newSection.readingPassages.length === 0) && (
                                  <div className="p-2 text-xs text-white/40">لا توجد قطع مضافة</div>
                                )}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeQuestion(qIndex)} className="text-vermillion hover:bg-vermillion/10">
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>

                      <Input 
                        placeholder="نص السؤال (مثلاً: سيف : قاطع)" 
                        value={q.question}
                        onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                        className="bg-midnight border-white/10 h-14 text-lg font-black"
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {q.options.map((opt, oIndex) => (
                          <div key={oIndex} className="flex gap-2 items-center">
                            <span className="text-goldenrod font-black w-6">{['أ', 'ب', 'ج', 'د'][oIndex]}</span>
                            <Input 
                              placeholder={`الخيار ${['أ', 'ب', 'ج', 'د'][oIndex]}`} 
                              value={opt}
                              onChange={(e) => {
                                const opts = [...q.options];
                                opts[oIndex] = e.target.value;
                                updateQuestion(qIndex, 'options', opts);
                              }}
                              className="bg-midnight border-white/10 h-12"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="bg-green-500/5 p-4 rounded-xl border border-green-500/20">
                        <label className="text-green-500 text-xs font-black block mb-2 uppercase">الإجابة الصحيحة (يجب أن تطابق أحد الخيارات أعلاه بدقة)</label>
                        <Input 
                          placeholder="انسخ النص الصحيح هنا" 
                          value={q.correct}
                          onChange={(e) => updateQuestion(qIndex, 'correct', e.target.value)}
                          className="bg-midnight border-green-500/20 text-green-500 font-black h-12"
                        />
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </Card>

            <div className="space-y-6">
              <h2 className="text-2xl font-black flex items-center gap-2">
                <FileText className="text-goldenrod" /> النماذج الحالية ({sections.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sections.map((section) => (
                  <Card key={section.firebaseId} className="p-6 glass border-white/5 rounded-3xl flex justify-between items-center group hover:border-goldenrod/30 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-goldenrod text-midnight rounded-xl flex items-center justify-center font-black text-xl">
                        {section.id}
                      </div>
                      <div>
                        <h3 className="font-black line-clamp-1">{section.title}</h3>
                        <p className="text-xs text-white/40">{section.questions.length} سؤال</p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      onClick={() => handleDelete(section.firebaseId)}
                      className="text-vermillion hover:bg-vermillion/10 rounded-full"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-8">
            <Card className="p-8 glass border-white/10 rounded-[40px] space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/10 pb-6">
                <h2 className="text-2xl md:text-3xl font-black">إدارة المستخدمين</h2>
                <div className="relative w-full md:w-80">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 w-4 h-4" />
                  <Input 
                    placeholder="ابحث بالاسم أو الإيميل..." 
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="bg-white/5 border-white/10 h-12 pr-10"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="text-goldenrod border-b border-white/10">
                      <th className="py-4 px-2 font-black">الاسم المستعار</th>
                      <th className="py-4 px-2 font-black">البريد الإلكتروني</th>
                      <th className="py-4 px-2 font-black text-center">المستوى</th>
                      <th className="py-4 px-2 font-black text-center">XP</th>
                      <th className="py-4 px-2 font-black text-center">إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                        <td className="py-4 px-2 font-black">{u.displayName || 'بدون اسم'}</td>
                        <td className="py-4 px-2 text-white/40 text-sm">{u.email}</td>
                        <td className="py-4 px-2 text-center">
                          <span className="bg-goldenrod/10 text-goldenrod px-2 py-0.5 rounded text-sm font-black">{u.level}</span>
                        </td>
                        <td className="py-4 px-2 text-center font-mono">{Math.round(u.xp)}</td>
                        <td className="py-4 px-2 text-center">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleUpdateUserName(u.id, u.displayName)}
                            className="text-goldenrod hover:bg-goldenrod/20"
                          >
                            <Edit2 className="w-4 h-4" />
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
