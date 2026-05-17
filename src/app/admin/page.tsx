'use client';

import React, { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut,
  User 
} from 'firebase/auth';
import { getSectionsFromDb, addSectionToDb, deleteSectionFromDb } from '@/lib/db-service';
import { Section, Question, ReadingPassage } from '@/lib/practice-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Trash2, 
  LogOut, 
  Settings, 
  LayoutDashboard,
  FileText,
  HelpCircle,
  Loader2,
  Save
} from 'lucide-react';

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sections, setSections] = useState<Section[]>([]);
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
      if (u) fetchSections();
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "تم تسجيل الدخول بنجاح ✅" });
    } catch (error: any) {
      toast({ 
        title: "خطأ في تسجيل الدخول", 
        description: "يرجى التحقق من بياناتك وتفعيل Auth في Firebase.",
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => signOut(auth);

  const handleSaveSection = async () => {
    if (!newSection.title || !newSection.id) {
      toast({ title: "يرجى إدخال عنوان ورقم النموذج", variant: "destructive" });
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

  if (loading) return (
    <div className="min-h-screen bg-midnight flex items-center justify-center">
      <Loader2 className="w-20 h-20 text-goldenrod animate-spin" />
    </div>
  );

  if (!user) {
    return (
      <main className="min-h-screen bg-midnight flex items-center justify-center p-6">
        <Card className="w-full max-w-xl p-12 glass border-goldenrod/30 rounded-[60px] shadow-2xl">
          <h1 className="text-6xl font-black text-white text-center mb-12">دخول المشرف 🔐</h1>
          <form onSubmit={handleLogin} className="space-y-8">
            <Input 
              type="email" 
              placeholder="البريد الإلكتروني" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              className="h-16 rounded-3xl bg-white/5 border-white/10 text-white text-xl"
              required
            />
            <Input 
              type="password" 
              placeholder="كلمة المرور" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className="h-16 rounded-3xl bg-white/5 border-white/10 text-white text-xl"
              required
            />
            <Button disabled={isSubmitting} type="submit" className="w-full h-20 rounded-3xl bg-goldenrod text-midnight font-black text-2xl gold-glow hover:scale-[1.02] transition-all">
              {isSubmitting ? <Loader2 className="animate-spin" /> : "دخول 🚀"}
            </Button>
          </form>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-midnight p-8 md:p-16">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-wrap justify-between items-center gap-8 mb-16">
          <div className="flex items-center gap-6">
            <div className="bg-goldenrod p-5 rounded-[35px] shadow-xl">
              <Settings className="text-midnight w-12 h-12" />
            </div>
            <div>
              <h1 className="text-6xl font-black text-white">لوحة التحكم</h1>
              <p className="text-2xl text-muted-foreground font-bold">إدارة المحتوى الديناميكي</p>
            </div>
          </div>
          <div className="flex gap-6">
            <Button variant="outline" onClick={() => window.location.href = '/'} className="h-16 px-10 rounded-3xl font-black border-white/10 text-white hover:bg-white/10 text-xl">
              عرض الموقع
            </Button>
            <Button variant="outline" onClick={handleLogout} className="h-16 px-10 rounded-3xl font-black border-vermillion/30 text-vermillion hover:bg-vermillion hover:text-white text-xl">
              <LogOut className="ml-2 w-6 h-6" /> خروج
            </Button>
          </div>
        </header>

        <div className="grid gap-16">
          <Card className="p-16 glass border-white/10 rounded-[80px] space-y-12">
            <div className="flex justify-between items-center border-b border-white/10 pb-10">
              <h2 className="text-5xl font-black text-white flex items-center gap-4">
                <Plus className="text-goldenrod w-12 h-12" /> إضافة نموذج جديد
              </h2>
              <Button 
                onClick={handleSaveSection} 
                disabled={isSubmitting}
                className="h-20 px-16 bg-goldenrod text-midnight font-black rounded-3xl text-2xl gold-glow"
              >
                {isSubmitting ? <Loader2 className="animate-spin" /> : <><Save className="ml-3" /> نشر الآن 🚀</>}
              </Button>
            </div>

            <div className="grid md:grid-cols-3 gap-10">
              <div className="space-y-4">
                <label className="text-white font-black text-xl">رقم النموذج</label>
                <Input 
                  type="number"
                  placeholder="مثلاً: 215" 
                  value={newSection.id || ''}
                  onChange={(e) => setNewSection(prev => ({ ...prev, id: parseInt(e.target.value) }))}
                  className="bg-white/5 border-white/10 text-white h-16 rounded-3xl text-xl"
                />
              </div>
              <div className="space-y-4 md:col-span-2">
                <label className="text-white font-black text-xl">عنوان النموذج</label>
                <Input 
                  placeholder="اسم النموذج" 
                  value={newSection.title || ''}
                  onChange={(e) => setNewSection(prev => ({ ...prev, title: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white h-16 rounded-3xl text-xl"
                />
              </div>
            </div>

            {/* Reading Passages Section */}
            <div className="space-y-10 pt-10">
              <div className="flex justify-between items-center">
                <h3 className="text-4xl font-black text-goldenrod flex items-center gap-4">
                  <FileText className="w-10 h-10" /> قطع القراءة (نصوص كاملة)
                </h3>
                <Button onClick={addPassageField} variant="secondary" className="h-14 px-8 rounded-2xl font-black text-lg">
                  إضافة قطعة نصية
                </Button>
              </div>
              {newSection.readingPassages?.map((p, idx) => (
                <Card key={idx} className="p-10 bg-white/5 border-white/10 rounded-[50px] space-y-6 relative">
                  <Input 
                    placeholder="عنوان القطعة" 
                    value={p.title}
                    onChange={(e) => {
                      const updated = [...(newSection.readingPassages || [])];
                      updated[idx].title = e.target.value;
                      setNewSection(prev => ({ ...prev, readingPassages: updated }));
                    }}
                    className="bg-midnight border-white/10 text-white font-black h-16 rounded-2xl"
                  />
                  <Textarea 
                    placeholder="نص القطعة الكامل..." 
                    value={p.text}
                    onChange={(e) => {
                      const updated = [...(newSection.readingPassages || [])];
                      updated[idx].text = e.target.value;
                      setNewSection(prev => ({ ...prev, readingPassages: updated }));
                    }}
                    className="bg-midnight border-white/10 text-white h-64 leading-relaxed rounded-2xl p-6 text-xl"
                  />
                </Card>
              ))}
            </div>

            {/* Questions Section */}
            <div className="space-y-10 pt-10">
              <div className="flex justify-between items-center">
                <h3 className="text-4xl font-black text-vermillion flex items-center gap-4">
                  <HelpCircle className="w-10 h-10" /> بنك الأسئلة
                </h3>
                <Button onClick={addQuestionField} variant="secondary" className="h-14 px-8 rounded-2xl font-black text-lg">
                  إضافة سؤال جديد
                </Button>
              </div>
              {newSection.questions?.map((q, idx) => (
                <Card key={idx} className="p-12 bg-white/5 border-white/10 rounded-[60px] space-y-8 relative">
                  <div className="grid md:grid-cols-2 gap-6">
                    <Input 
                      placeholder="نص السؤال" 
                      value={q.question}
                      onChange={(e) => {
                        const updated = [...(newSection.questions || [])];
                        updated[idx].question = e.target.value;
                        setNewSection(prev => ({ ...prev, questions: updated }));
                      }}
                      className="bg-midnight border-white/10 text-white font-black md:col-span-2 h-16 rounded-2xl text-xl"
                    />
                    <select 
                      value={q.type}
                      onChange={(e) => {
                        const updated = [...(newSection.questions || [])];
                        updated[idx].type = e.target.value as any;
                        setNewSection(prev => ({ ...prev, questions: updated }));
                      }}
                      className="bg-midnight border-white/10 text-white rounded-2xl h-16 px-6 text-xl font-bold"
                    >
                      <option value="analogy">تناظر لفظي</option>
                      <option value="error">خطأ سياقي</option>
                      <option value="context">إكمال جمل</option>
                      <option value="reading">استيعاب مقروء</option>
                    </select>
                    {q.type === 'reading' && (
                      <Input 
                        placeholder="عنوان القطعة المرتبطة بهذا السؤال" 
                        value={q.passageTitle || ''}
                        onChange={(e) => {
                          const updated = [...(newSection.questions || [])];
                          updated[idx].passageTitle = e.target.value;
                          setNewSection(prev => ({ ...prev, questions: updated }));
                        }}
                        className="bg-midnight border-white/10 text-white rounded-2xl h-16 text-xl"
                      />
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {q.options.map((opt, oIdx) => (
                      <Input 
                        key={oIdx}
                        placeholder={`خيار ${oIdx + 1}`} 
                        value={opt}
                        onChange={(e) => {
                          const updated = [...(newSection.questions || [])];
                          updated[idx].options[oIdx] = e.target.value;
                          setNewSection(prev => ({ ...prev, questions: updated }));
                        }}
                        className="bg-midnight border-white/10 text-white rounded-2xl h-14 text-lg"
                      />
                    ))}
                  </div>
                  <Input 
                    placeholder="الإجابة الصحيحة" 
                    value={q.correct}
                    onChange={(e) => {
                      const updated = [...(newSection.questions || [])];
                      updated[idx].correct = e.target.value;
                      setNewSection(prev => ({ ...prev, questions: updated }));
                    }}
                    className="bg-midnight border-goldenrod/50 text-goldenrod font-black h-16 rounded-2xl text-xl"
                  />
                </Card>
              ))}
            </div>
          </Card>

          {/* Published Sections List */}
          <div className="space-y-10 pt-16">
            <h2 className="text-6xl font-black text-white flex items-center gap-6">
              <LayoutDashboard className="text-goldenrod w-14 h-14" /> النماذج المنشورة
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 pb-32">
              {sections.map((section) => (
                <Card key={section.firebaseId} className="p-10 glass border-white/5 rounded-[60px] flex justify-between items-center group hover:border-goldenrod/30 transition-all">
                  <div className="flex items-center gap-8">
                    <div className="w-20 h-20 bg-white/5 rounded-[30px] flex items-center justify-center font-black text-4xl text-goldenrod border border-white/10 group-hover:bg-goldenrod group-hover:text-midnight transition-colors">
                      {section.id}
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white line-clamp-1">{section.title}</h3>
                      <p className="text-lg text-muted-foreground mt-1 font-bold">{section.questions.length} سؤال مفعّل</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    onClick={() => handleDelete(section.firebaseId)}
                    className="text-vermillion hover:bg-vermillion/10 rounded-full w-14 h-14"
                  >
                    <Trash2 className="w-8 h-8" />
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
