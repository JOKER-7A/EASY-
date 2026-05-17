
'use client';

import React, { useState, useEffect } from 'react';
import { sections as staticSections, Section, Question } from '@/lib/practice-data';
import { getSectionsFromDb } from '@/lib/db-service';
import PracticeSession from '@/components/PracticeSession';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Flame, 
  History, 
  Star, 
  ChevronRight,
  Trash2,
  XCircle,
  CheckCircle2,
  LayoutDashboard
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export type PracticeMode = 'normal' | 'pressure' | 'exam-night';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [activeView, setActiveView] = useState<'landing' | 'practice' | 'mistakes' | 'favorites'>('landing');
  const [allSections, setAllSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [currentMode, setCurrentMode] = useState<PracticeMode>('normal');
  const [mistakes, setMistakes] = useState<Question[]>([]);
  const [favorites, setFavorites] = useState<Question[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
    
    const savedMistakes = JSON.parse(localStorage.getItem('easy-mistakes') || '[]');
    const savedFavIds = JSON.parse(localStorage.getItem('easy-favorites') || '[]');
    setMistakes(savedMistakes);

    const fetchAllData = async () => {
      try {
        const dbSections = await getSectionsFromDb();
        // دمج البيانات الثابتة مع بيانات Firestore
        const combined = [...dbSections];
        staticSections.forEach(s => {
          if (!combined.find(c => Number(c.id) === Number(s.id))) {
            combined.push(s);
          }
        });
        
        // ترتيب النماذج تنازلياً حسب المعرف
        combined.sort((a, b) => Number(b.id) - Number(a.id));
        setAllSections(combined);

        // جلب المفضلة
        const allQuestions: Question[] = combined.flatMap(s => s.questions);
        const savedFavs = allQuestions.filter(q => savedFavIds.includes(q.id));
        setFavorites(savedFavs);
      } catch (e) {
        console.error("Fetch failed", e);
        setAllSections(staticSections);
      }
    };

    fetchAllData();
  }, [activeView]);

  if (!mounted) return <div className="min-h-screen bg-midnight" />;

  const startPractice = (section: Section, mode: PracticeMode) => {
    setSelectedSection(section);
    setCurrentMode(mode);
    setActiveView('practice');
  };

  const clearMistakes = () => {
    localStorage.removeItem('easy-mistakes');
    setMistakes([]);
    toast({ title: "تم مسح سجل الأخطاء" });
  };

  const removeFavorite = (id: string) => {
    const fIds = JSON.parse(localStorage.getItem('easy-favorites') || '[]');
    const newFIds = fIds.filter((fid: string) => fid !== id);
    localStorage.setItem('easy-favorites', JSON.stringify(newFIds));
    setFavorites(favorites.filter(q => q.id !== id));
    toast({ title: "تمت الإزالة من المفضلة" });
  };

  if (activeView === 'practice' && selectedSection) {
    return (
      <main className="min-h-screen p-4 md:p-8 bg-midnight">
        <PracticeSession 
          section={selectedSection} 
          mode={currentMode}
          onExit={() => setActiveView('landing')} 
        />
      </main>
    );
  }

  if (activeView === 'mistakes') {
    return (
      <main className="min-h-screen p-4 md:p-8 bg-midnight">
        <div className="max-w-4xl mx-auto mb-10 flex justify-between items-center">
          <Button variant="ghost" onClick={() => setActiveView('landing')} className="text-muted-foreground hover:text-white rounded-full font-bold">
            <ChevronRight className="ml-2" /> العودة للرئيسية
          </Button>
          <Button variant="destructive" onClick={clearMistakes} className="rounded-2xl font-black">
            <Trash2 className="ml-2" /> مسح السجل
          </Button>
        </div>
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
          <h2 className="text-6xl font-headline font-black text-goldenrod text-center mb-12">📚 سجل الأخطاء</h2>
          {mistakes.length === 0 ? (
            <Card className="p-20 text-center glass border-white/5">
              <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-6" />
              <p className="text-3xl font-black opacity-60">لا يوجد أخطاء مسجلة، استمر يا بطل!</p>
            </Card>
          ) : (
            mistakes.map((q, i) => (
              <Card key={i} className="p-10 glass border-vermillion/20 rounded-[40px] animate-in slide-in-from-bottom-4">
                <div className="flex justify-between items-start gap-4 mb-6">
                  <h3 className="text-4xl font-black text-white">{q.question}</h3>
                  <XCircle className="text-vermillion w-10 h-10 shrink-0" />
                </div>
                <div className="p-6 bg-green-500/10 border border-green-500/30 rounded-3xl">
                  <p className="text-sm text-muted-foreground font-bold mb-1">الإجابة الصحيحة</p>
                  <p className="text-3xl font-black text-green-500">{q.correct}</p>
                </div>
              </Card>
            ))
          )}
        </div>
      </main>
    );
  }

  if (activeView === 'favorites') {
    return (
      <main className="min-h-screen p-4 md:p-8 bg-midnight">
        <div className="max-w-4xl mx-auto mb-10">
          <Button variant="ghost" onClick={() => setActiveView('landing')} className="text-muted-foreground hover:text-white rounded-full font-bold">
            <ChevronRight className="ml-2" /> العودة للرئيسية
          </Button>
        </div>
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
          <h2 className="text-6xl font-headline font-black text-goldenrod text-center mb-12">⭐ المفضلة</h2>
          {favorites.length === 0 ? (
            <Card className="p-20 text-center glass border-white/5">
              <Star className="w-20 h-20 text-goldenrod mx-auto mb-6 opacity-30" />
              <p className="text-3xl font-black opacity-60">لا يوجد أسئلة في المفضلة بعد</p>
            </Card>
          ) : (
            favorites.map((q, i) => (
              <Card key={i} className="p-10 glass border-goldenrod/20 rounded-[40px] relative group animate-in slide-in-from-bottom-4">
                <Button variant="ghost" onClick={() => removeFavorite(q.id)} className="absolute top-6 left-6 text-vermillion hover:bg-vermillion/10 rounded-full">
                  <Trash2 className="w-6 h-6" />
                </Button>
                <h3 className="text-4xl font-black text-white mb-8 pl-10">{q.question}</h3>
                <div className="grid grid-cols-2 gap-4">
                  {q.options.map((opt, idx) => (
                    <div key={idx} className={`p-4 rounded-2xl border ${opt === q.correct ? 'bg-green-500/20 border-green-500 text-green-500' : 'bg-white/5 border-white/5'}`}>
                      <p className="font-bold text-xl">{opt}</p>
                    </div>
                  ))}
                </div>
              </Card>
            ))
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden relative">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(230,172,0,0.1),transparent_50%)]" />
      <div className="relative z-10 container mx-auto px-4 py-12 md:py-20 max-w-7xl">
        <header className="text-center mb-24 space-y-6">
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full glass border-goldenrod/30 text-goldenrod font-black text-sm mb-4 animate-bounce">
            <Flame className="w-4 h-4 fill-goldenrod" /> منصة EASY التدريبية 🔥
          </div>
          <h1 className="text-8xl md:text-9xl font-headline font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-goldenrod to-vermillion drop-shadow-[0_0_30px_rgba(230,172,0,0.4)]">EASY</h1>
          <p className="text-2xl md:text-3xl font-bold opacity-80 leading-relaxed max-w-4xl mx-auto">منصة تدريب لفظي احترافية بتصحيح فوري، نظام تحديات، وسجل أخطاء ذكي</p>
          
          <div className="flex flex-wrap justify-center gap-6 pt-8">
            <Button size="lg" onClick={() => setActiveView('mistakes')} className="h-20 px-10 text-2xl font-black bg-white/5 border-2 border-vermillion/30 text-vermillion hover:bg-vermillion hover:text-white transition-all rounded-3xl">
              <History className="ml-3" /> سجل الأخطاء
            </Button>
            <Button size="lg" onClick={() => setActiveView('favorites')} className="h-20 px-10 text-2xl font-black bg-white/5 border-2 border-goldenrod/30 text-goldenrod hover:bg-goldenrod hover:text-midnight transition-all rounded-3xl">
              <Star className="ml-3" /> المفضلة
            </Button>
          </div>
        </header>

        <div className="max-w-2xl mx-auto mb-20 p-8 glass rounded-[40px] border-white/10 space-y-8">
          <div className="text-center">
            <h3 className="text-3xl font-black text-white mb-2">اختر نمط التدريب 🚀</h3>
          </div>
          
          <Tabs value={currentMode} onValueChange={(v) => setCurrentMode(v as PracticeMode)} className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-20 bg-midnight/50 p-2 rounded-3xl border border-white/10">
              <TabsTrigger value="normal" className="rounded-2xl font-black text-xl data-[state=active]:bg-goldenrod data-[state=active]:text-midnight">تدريب حر</TabsTrigger>
              <TabsTrigger value="pressure" className="rounded-2xl font-black text-xl data-[state=active]:bg-vermillion data-[state=active]:text-white">نظام الضغط 🔥</TabsTrigger>
              <TabsTrigger value="exam-night" className="rounded-2xl font-black text-xl data-[state=active]:bg-indigo-600 data-[state=active]:text-white">ليلة الاختبار 🌙</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="p-6 rounded-3xl bg-white/5 border border-white/5 text-center animate-in fade-in slide-in-from-top-2">
            {currentMode === 'normal' && <p className="text-xl font-bold text-muted-foreground">🧘‍♂️ وقت مفتوح للتدريب</p>}
            {currentMode === 'pressure' && <p className="text-xl font-bold text-vermillion">🔥 مؤقت 13 دقيقة لكامل النموذج</p>}
            {currentMode === 'exam-night' && <p className="text-xl font-bold text-indigo-400">🌙 3 دقائق لكل سؤال</p>}
          </div>
        </div>

        <section className="space-y-12 mb-24">
          <div className="flex items-center justify-between">
            <h2 className="text-5xl font-headline font-black text-goldenrod underline decoration-vermillion/50 decoration-8 underline-offset-8">الأقسام التدريبية</h2>
            <Badge className="bg-goldenrod/10 text-goldenrod text-lg px-6 py-2 border border-goldenrod/20 rounded-full">{allSections.length} نموذج</Badge>
          </div>
          <div className="grid lg:grid-cols-2 gap-10">
            {allSections.map((section) => (
              <Card key={section.firebaseId || section.id} className={cn(
                "group relative bg-gradient-to-br from-white/10 to-transparent border-2 border-white/5 backdrop-blur-2xl rounded-[50px] p-10 shadow-2xl overflow-hidden transition-all hover:border-goldenrod/40"
              )}>
                <div className={cn(
                  "absolute top-0 left-0 w-full h-2 bg-gradient-to-r",
                  currentMode === 'pressure' ? "from-vermillion via-orange-500 to-red-600" : 
                  currentMode === 'exam-night' ? "from-indigo-600 via-purple-500 to-indigo-800" :
                  "from-goldenrod via-vermillion to-pink-500"
                )} />
                <div className="flex justify-between items-start mb-10">
                  <div className="space-y-2">
                    <Badge variant="outline" className="px-4 py-1 text-sm font-black rounded-full border-goldenrod text-goldenrod">بالتوفيق 🔥</Badge>
                    <h2 className="text-5xl font-black text-white group-hover:text-goldenrod">🔥 نموذج {section.id}</h2>
                    <p className="text-xl text-muted-foreground font-bold">{section.title}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6 mb-10">
                  <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                    <p className="text-muted-foreground text-sm font-bold mb-1">الأسئلة</p>
                    <p className="text-3xl font-black text-white">{section.questions.length}</p>
                  </div>
                  <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                    <p className="text-muted-foreground text-sm font-bold mb-1">النمط</p>
                    <p className="text-3xl font-black text-goldenrod">لفظي</p>
                  </div>
                </div>
                <Button 
                  onClick={() => startPractice(section, currentMode)} 
                  className={cn(
                    "w-full h-20 rounded-[30px] text-3xl font-black shadow-2xl hover:scale-[1.02] transition-all",
                    currentMode === 'pressure' ? "bg-vermillion text-white shadow-vermillion/20" : 
                    currentMode === 'exam-night' ? "bg-indigo-600 text-white shadow-indigo-600/20" :
                    "bg-goldenrod text-midnight shadow-goldenrod/20"
                  )}
                >
                  بدء التدريب 🚀
                </Button>
              </Card>
            ))}
          </div>
        </section>

        <footer className="text-center py-20">
          <Button variant="ghost" onClick={() => window.location.href = '/admin'} className="mb-12 text-muted-foreground/30 hover:text-white">
            <LayoutDashboard className="ml-2 w-4 h-4" /> لوحة التحكم
          </Button>
          <div className="bg-midnight px-12 py-10 rounded-[47px]">
             <h2 className="text-5xl md:text-7xl font-headline font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-goldenrod">يا رب كلنا نجيب 100% 🔥</h2>
          </div>
          <p className="mt-12 text-muted-foreground font-bold">كل الحقوق محفوظة © EASY Prep Master 2024</p>
        </footer>
      </div>
    </main>
  );
}
