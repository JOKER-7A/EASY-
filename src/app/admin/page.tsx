
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
import { Section, Question } from '@/lib/practice-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Trash2, 
  LogOut, 
  Settings, 
  LayoutDashboard,
  FileText,
  HelpCircle
} from 'lucide-react';

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sections, setSections] = useState<Section[]>([]);
  const { toast } = useToast();

  // Form states for new section
  const [newTitle, setNewTitle] = useState('');
  const [newId, setNewId] = useState('');
  const [isAdding, setIsAdding] = useState(false);

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
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "تم تسجيل الدخول بنجاح" });
    } catch (error) {
      toast({ title: "خطأ في تسجيل الدخول", variant: "destructive" });
    }
  };

  const handleLogout = () => signOut(auth);

  const handleAddSection = async () => {
    if (!newTitle || !newId) return;
    setIsAdding(true);
    try {
      await addSectionToDb({
        id: parseInt(newId),
        title: newTitle,
        duration: 13,
        questions: [],
        readingPassages: []
      });
      setNewTitle('');
      setNewId('');
      fetchSections();
      toast({ title: "تمت إضافة القسم بنجاح" });
    } catch (error) {
      toast({ title: "خطأ في الإضافة", variant: "destructive" });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (firebaseId: string | undefined) => {
    if (!firebaseId) return;
    if (confirm('هل أنت متأكد من حذف هذا القسم؟')) {
      await deleteSectionFromDb(firebaseId);
      fetchSections();
      toast({ title: "تم حذف القسم" });
    }
  };

  if (loading) return <div className="min-h-screen bg-midnight flex items-center justify-center text-white">جاري التحميل...</div>;

  if (!user) {
    return (
      <main className="min-h-screen bg-midnight flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 glass border-goldenrod/20 rounded-[40px]">
          <h1 className="text-4xl font-black text-white text-center mb-8">لوحة تحكم الأدمن 🔐</h1>
          <form onSubmit={handleLogin} className="space-y-6">
            <Input 
              type="email" 
              placeholder="البريد الإلكتروني" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              className="h-14 rounded-2xl bg-white/5 border-white/10 text-white"
            />
            <Input 
              type="password" 
              placeholder="كلمة المرور" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className="h-14 rounded-2xl bg-white/5 border-white/10 text-white"
            />
            <Button type="submit" className="w-full h-14 rounded-2xl bg-goldenrod text-midnight font-black text-xl hover:bg-goldenrod/90">
              دخول
            </Button>
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
            <div className="bg-goldenrod p-3 rounded-2xl">
              <Settings className="text-midnight w-8 h-8" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white">إدارة المنصة</h1>
              <p className="text-muted-foreground font-bold">مرحباً بك في لوحة التحكم الديناميكية</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} className="rounded-2xl font-black border-vermillion/30 text-vermillion hover:bg-vermillion/10">
            <LogOut className="ml-2 w-5 h-5" /> تسجيل خروج
          </Button>
        </header>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Add Section Form */}
          <Card className="p-8 glass border-white/10 rounded-[40px] h-fit">
            <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-2">
              <Plus className="text-goldenrod" /> إضافة قسم جديد
            </h2>
            <div className="space-y-4">
              <Input 
                placeholder="رقم النموذج (مثلاً 220)" 
                value={newId}
                onChange={(e) => setNewId(e.target.value)}
                className="bg-white/5 border-white/10 text-white h-12 rounded-xl"
              />
              <Input 
                placeholder="عنوان القسم" 
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="bg-white/5 border-white/10 text-white h-12 rounded-xl"
              />
              <Button 
                onClick={handleAddSection} 
                disabled={isAdding}
                className="w-full h-12 bg-goldenrod text-midnight font-black rounded-xl"
              >
                {isAdding ? "جاري الإضافة..." : "حفظ القسم"}
              </Button>
            </div>
          </Card>

          {/* Sections List */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-2">
              <LayoutDashboard className="text-goldenrod" /> الأقسام الحالية
            </h2>
            {sections.map((section) => (
              <Card key={section.firebaseId} className="p-6 glass border-white/5 rounded-3xl flex justify-between items-center group hover:border-goldenrod/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center font-black text-goldenrod border border-white/10">
                    {section.id}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white">{section.title}</h3>
                    <div className="flex gap-4 mt-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <HelpCircle className="w-3 h-3" /> {section.questions.length} سؤال
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <FileText className="w-3 h-3" /> {section.readingPassages?.length || 0} قطع
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" className="text-muted-foreground hover:text-white rounded-xl">تعديل</Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => handleDelete(section.firebaseId)}
                    className="text-vermillion hover:bg-vermillion/10 rounded-xl"
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              </Card>
            ))}
            {sections.length === 0 && (
              <div className="text-center py-20 opacity-30 font-black text-2xl">لا يوجد أقسام مضافة بعد</div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
