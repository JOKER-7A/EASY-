
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
  PlusCircle,
  Loader2,
  ChevronRight
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
    pdfUrl: ''
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
    const data = await getSectionsFromDb();
    setSections(data);
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
        description: "تأكد من تفعيل Email/Password في Firebase وإضافة حسابك.",
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
      setNewSection({ id: 0, title: '', questions: [], readingPassages: [], duration: 13, pdfUrl: '' });
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
      await deleteSectionFromDb(firebaseId);
      await fetchSections();
      toast({ title: "تم الحذف بنجاح" });
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
      <Loader2 className="w-12 h-12 text-goldenrod animate-spin" />
    </div>
  );

  if (!user) {
    return (
      <main className="min-h-screen bg-midnight flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 glass border-goldenrod/20 rounded-[40px] animate-in fade-in zoom-in">
          <h1 className="text-4xl font-black text-white text-center mb-8">دخول المشرف 🔐</h1>
          <form onSubmit={handleLogin} className="space-y-6">
            <Input 
              type="email" 
              placeholder="البريد الإلكتروني" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              className="h-14 rounded-2xl bg-white/5 border-white/10 text-white"
              required
            />
            <Input 
              type="password" 
              placeholder="كلمة المرور" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className="h-14 rounded-2xl bg-white/5 border-white/10 text-white"
              required
            />
            <Button disabled={isSubmitting} type="submit" className="w-full h-14 rounded-2xl bg-goldenrod text-midnight font-black text-xl hover:scale-[1.02] transition-all">
              {isSubmitting ? <Loader2 className="animate-spin" /> : "دخول 🚀"}
            </Button>
            <div className="text-center pt-4">
               <Button variant="link" onClick={() => window.location.href = '/'} className="text-muted-foreground">العودة للرئيسية</Button>
            </div>
          </form>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-midnight p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-wrap justify-between items-center gap-4 mb-12">
          <div className="flex items-center gap-4">
            <div className="bg-goldenrod p-3 rounded-2xl gold-glow">
              <Settings className="text-midnight w-8 h-8" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white">لوحة التحكم</h1>
              <p className="text-muted-foreground font-bold">إدارة المحتوى الديناميكي</p>
            </div>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => window.location.href = '/'} className="rounded-2xl font-black border-white/10 text-white hover:bg-white/10">
              عرض الموقع
            </Button>
            <Button variant="outline" onClick={handleLogout} className="rounded-2xl font-black border-vermillion/30 text-vermillion hover:bg-vermillion hover:text-white">
              <LogOut className="ml-2 w-5 h-5" /> خروج
            </Button>
          </div>
        </header>

        <div className="grid gap-12">
          <Card className="p-10 glass border-white/10 rounded-[50px] space-y-8">
            <div className="flex justify-between items-center border-b border-white/10 pb-6">
              <h2 className="text-3xl font-black text-white flex items-center gap-2">
                <Plus className="text-goldenrod w-8 h-8" /> إضافة نموذج جديد
              </h2>
              <Button 
                onClick={handleSaveSection} 
                disabled={isSubmitting}
                className="h-14 px-10 bg-goldenrod text-midnight font-black rounded-2xl text-xl hover:scale-105 transition-all"
              >
                {isSubmitting ? <Loader2 className="animate-spin" /> : "نشر النموذج 🚀"}
              </Button>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-white font-bold text-sm">رقم النموذج</label>
                <Input 
                  type="number"
                  placeholder="مثلاً: 215" 
                  value={newSection.id || ''}
                  onChange={(e) => setNewSection(prev => ({ ...prev, id: parseInt(e.target.value) }))}
                  className="bg-white/5 border-white/10 text-white h-14 rounded-xl font-black"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-white font-bold text-sm">عنوان النموذج</label>
                <Input 
                  placeholder="اسم النموذج" 
                  value={newSection.title || ''}
                  onChange={(e) => setNewSection(prev => ({ ...prev, title: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white h-14 rounded-xl font-black"
                />
              </div>
              <div className="space-y-2">
                <label className="text-white font-bold text-sm">رابط PDF</label>
                <Input 
                  placeholder="https://..." 
                  value={newSection.pdfUrl || ''}
                  onChange={(e) => setNewSection(prev => ({ ...prev, pdfUrl: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white h-14 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-6 pt-6">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-goldenrod flex items-center gap-2">
                  <FileText className="w-6 h-6" /> قطع القراءة
                </h3>
                <Button onClick={addPassageField} variant="secondary" className="rounded-xl font-bold">
                  إضافة قطعة
                </Button>
              </div>
              {newSection.readingPassages?.map((p, idx) => (
                <Card key={idx} className="p-6 bg-white/5 border-white/10 rounded-3xl space-y-4">
                  <Input 
                    placeholder="عنوان القطعة" 
                    value={p.title}
                    onChange={(e) => {
                      const updated = [...(newSection.readingPassages || [])];
                      updated[idx].title = e.target.value;
                      setNewSection(prev => ({ ...prev, readingPassages: updated }));
                    }}
                    className="bg-midnight border-white/10 text-white font-bold"
                  />
                  <Textarea 
                    placeholder="نص القطعة الكامل" 
                    value={p.text}
                    onChange={(e) => {
                      const updated = [...(newSection.readingPassages || [])];
                      updated[idx].text = e.target.value;
                      setNewSection(prev => ({ ...prev, readingPassages: updated }));
                    }}
                    className="bg-midnight border-white/10 text-white h-48 leading-relaxed"
                  />
                </Card>
              ))}
            </div>

            <div className="space-y-6 pt-6">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-vermillion flex items-center gap-2">
                  <HelpCircle className="w-6 h-6" /> الأسئلة
                </h3>
                <Button onClick={addQuestionField} variant="secondary" className="rounded-xl font-bold">
                  إضافة سؤال
                </Button>
              </div>
              {newSection.questions?.map((q, idx) => (
                <Card key={idx} className="p-8 bg-white/5 border-white/10 rounded-[35px] space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <Input 
                      placeholder="نص السؤال" 
                      value={q.question}
                      onChange={(e) => {
                        const updated = [...(newSection.questions || [])];
                        updated[idx].question = e.target.value;
                        setNewSection(prev => ({ ...prev, questions: updated }));
                      }}
                      className="bg-midnight border-white/10 text-white font-bold md:col-span-2 h-14"
                    />
                    <select 
                      value={q.type}
                      onChange={(e) => {
                        const updated = [...(newSection.questions || [])];
                        updated[idx].type = e.target.value as any;
                        setNewSection(prev => ({ ...prev, questions: updated }));
                      }}
                      className="bg-midnight border-white/10 text-white rounded-xl h-12 px-3"
                    >
                      <option value="analogy">تناظر لفظي</option>
                      <option value="error">خطأ سياقي</option>
                      <option value="context">إكمال جمل</option>
                      <option value="reading">استيعاب مقروء</option>
                    </select>
                    {q.type === 'reading' && (
                      <Input 
                        placeholder="عنوان القطعة المرتبطة" 
                        value={q.passageTitle || ''}
                        onChange={(e) => {
                          const updated = [...(newSection.questions || [])];
                          updated[idx].passageTitle = e.target.value;
                          setNewSection(prev => ({ ...prev, questions: updated }));
                        }}
                        className="bg-midnight border-white/10 text-white"
                      />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
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
                        className="bg-midnight border-white/10 text-white"
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
                    className="bg-midnight border-goldenrod/30 text-goldenrod font-black"
                  />
                </Card>
              ))}
            </div>
          </Card>

          <div className="space-y-6 pt-12">
            <h2 className="text-4xl font-black text-white flex items-center gap-4">
              <LayoutDashboard className="text-goldenrod w-10 h-10" /> النماذج المنشورة
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
              {sections.map((section) => (
                <Card key={section.firebaseId} className="p-8 glass border-white/5 rounded-[40px] flex justify-between items-center group hover:border-goldenrod/20 transition-all">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center font-black text-3xl text-goldenrod border border-white/10 group-hover:bg-goldenrod group-hover:text-midnight">
                      {section.id}
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white line-clamp-1">{section.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{section.questions.length} سؤال</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    onClick={() => handleDelete(section.firebaseId)}
                    className="text-vermillion hover:bg-vermillion/10 rounded-2xl w-12 h-12"
                  >
                    <Trash2 className="w-6 h-6" />
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
