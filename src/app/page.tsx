'use client';

import React, { useState, useEffect } from 'react';
import { sections, Section, Question } from '@/lib/practice-data';
import PracticeSession from '@/components/PracticeSession';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Flame, 
  History, 
  Star, 
  Zap, 
  Target, 
  Award,
  ChevronRight,
  Trash2,
  XCircle,
  CheckCircle2,
  Moon,
  Clock,
  Timer as TimerIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export type PracticeMode = 'normal' | 'pressure' | 'exam-night';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [activeView, setActiveView] = useState<'landing' | 'practice' | 'mistakes' | 'favorites'>('landing');
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [currentMode, setCurrentMode] = useState<PracticeMode>('normal');
  const [mistakes, setMistakes] = useState<Question[]>([]);
  const [favorites, setFavorites] = useState<Question[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
    const savedMistakes = JSON.parse(localStorage.getItem('easy-mistakes') || '[]');
    const savedFavIds = JSON.parse(localStorage.getItem('easy-favorites') || '[]');
    const allQuestions: Question[] = sections.flatMap(s => s.questions);
    const savedFavs = allQuestions.filter(q => savedFavIds.includes(q.id));
    setMistakes(savedMistakes);
    setFavorites(savedFavs);
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
            <p className="text-muted-foreground font-bold text-lg">حدد التحدي الذي يناسبك اليوم</p>
          </div>
          
          <Tabs value={currentMode} onValueChange={(v) => setCurrentMode(v as PracticeMode)} className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-20 bg-midnight/50 p-2 rounded-3xl border border-white/10">
              <TabsTrigger value="normal" className="rounded-2xl font-black text-xl data-[state=active]:bg-goldenrod data-[state=active]:text-midnight">تدريب حر</TabsTrigger>
              <TabsTrigger value="pressure" className="rounded-2xl font-black text-xl data-[state=active]:bg-vermillion data-[state=active]:text-white">نظام الضغط 🔥</TabsTrigger>
              <TabsTrigger value="exam-night" className="rounded-2xl font-black text-xl data-[state=active]:bg-indigo-600 data-[state=active]:text-white">ليلة الاختبار 🌙</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="p-6 rounded-3xl bg-white/5 border border-white/5 text-center animate-in fade-in slide-in-from-top-2">
            {currentMode === 'normal' && (
              <p className="text-xl font-bold text-muted-foreground">🧘‍♂️ وقت مفتوح للتدريب والتعلم بتركيز عالٍ</p>
            )}
            {currentMode === 'pressure' && (
              <p className="text-xl font-bold text-vermillion">🔥 مؤقت 13 دقيقة لكامل النموذج - تحدي حقيقي!</p>
            )}
            {currentMode === 'exam-night' && (
              <p className="text-xl font-bold text-indigo-400">🌙 3 دقائق لكل سؤال - مراجعة سريعة وحاسمة!</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-24">
          {[
            { icon: <Target className="text-green-400" />, label: 'تصحيح فوري', desc: 'إجابات مباشرة' },
            { icon: <Award className="text-goldenrod" />, label: 'نتيجة كاملة', desc: 'تحليل دقيق' },
            { icon: <History className="text-blue-400" />, label: 'سجل الأخطاء', desc: 'تتبع تلقائي' },
            { icon: <Zap className="text-vermillion" />, label: 'أنماط متعددة', desc: 'حسب اختيارك' },
          ].map((stat, i) => (
            <Card key={i} className="p-8 glass rounded-[35px] text-center space-y-3 group hover:border-goldenrod/30 transition-all">
              <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 group-hover:scale-110 transition">{stat.icon}</div>
              <h3 className="font-black text-xl">{stat.label}</h3>
              <p className="text-sm opacity-60 font-medium">{stat.desc}</p>
            </Card>
          ))}
        </div>

        <section className="space-y-12 mb-24">
          <div className="flex items-center justify-between">
            <h2 className="text-5xl font-headline font-black text-goldenrod underline decoration-vermillion/50 decoration-8 underline-offset-8">الأقسام التدريبية</h2>
            <Badge className="bg-goldenrod/10 text-goldenrod text-lg px-6 py-2 border border-goldenrod/20 rounded-full">{sections.length + 1} نماذج حقيقية</Badge>
          </div>
          <div className="grid lg:grid-cols-2 gap-10">
            {/* بطاقة القسم 215 قريباً */}
            <Card className="group relative bg-gradient-to-br from-white/5 to-transparent border-2 border-white/5 backdrop-blur-2xl rounded-[50px] p-10 shadow-2xl overflow-hidden opacity-80 grayscale hover:grayscale-0 transition-all cursor-not-allowed">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-gray-500 to-gray-700" />
              <div className="flex justify-between items-start mb-10">
                <div className="space-y-2">
                  <Badge variant="outline" className="px-4 py-1 text-sm font-black rounded-full border-gray-500 text-gray-500">قريباً 🔥</Badge>
                  <h2 className="text-5xl font-black text-white/50 transition-colors">🔥 نموذج 215</h2>
                  <p className="text-xl text-muted-foreground font-bold italic">جاري تحضير المحتوى...</p>
                </div>
                <div className="bg-white/5 border border-white/10 text-white/40 px-6 py-3 rounded-2xl font-black text-xl backdrop-blur-md">
                  <Clock className="inline-block ml-2 w-5 h-5" /> قريباً
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6 mb-10">
                <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                  <p className="text-muted-foreground text-sm font-bold mb-1">الأسئلة</p>
                  <p className="text-3xl font-black text-white/30">--</p>
                </div>
                <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                  <p className="text-muted-foreground text-sm font-bold mb-1">النمط</p>
                  <p className="text-3xl font-black text-gray-600">لفظي</p>
                </div>
              </div>
              <Button disabled className="w-full h-20 rounded-[30px] text-3xl font-black bg-gray-800 text-gray-500 cursor-not-allowed">
                انتظرونا ⏳
              </Button>
            </Card>

            {sections.map((section) => (
              <Card key={section.id} className={cn(
                "group relative bg-gradient-to-br from-white/10 to-transparent border-2 border-white/5 backdrop-blur-2xl rounded-[50px] p-10 shadow-2xl overflow-hidden transition-all",
                currentMode === 'pressure' && "hover:border-vermillion/40",
                currentMode === 'exam-night' && "hover:border-indigo-400/40",
                currentMode === 'normal' && "hover:border-goldenrod/40"
              )}>
                <div className={cn(
                  "absolute top-0 left-0 w-full h-2 bg-gradient-to-r",
                  currentMode === 'pressure' ? "from-vermillion via-orange-500 to-red-600" : 
                  currentMode === 'exam-night' ? "from-indigo-600 via-purple-500 to-indigo-800" :
                  "from-goldenrod via-vermillion to-pink-500"
                )} />
                <div className="flex justify-between items-start mb-10">
                  <div className="space-y-2">
                    <Badge variant="outline" className={cn(
                      "px-4 py-1 text-sm font-black rounded-full",
                      currentMode === 'pressure' ? "border-vermillion text-vermillion" : 
                      currentMode === 'exam-night' ? "border-indigo-400 text-indigo-400" :
                      "border-goldenrod text-goldenrod"
                    )}>بالتوفيق 🔥</Badge>
                    <h2 className={cn(
                      "text-5xl font-black text-white transition-colors",
                      currentMode === 'pressure' ? "group-hover:text-vermillion" : 
                      currentMode === 'exam-night' ? "group-hover:text-indigo-400" :
                      "group-hover:text-goldenrod"
                    )}>🔥 نموذج {section.id}</h2>
                    <p className="text-xl text-muted-foreground font-bold">{section.title}</p>
                  </div>
                  <div className={cn(
                    "border text-white px-6 py-3 rounded-2xl font-black text-xl backdrop-blur-md",
                    currentMode === 'pressure' ? "bg-vermillion/20 border-vermillion/40" : 
                    currentMode === 'exam-night' ? "bg-indigo-600/20 border-indigo-400/40" :
                    "bg-white/5 border-white/10"
                  )}>
                    {currentMode === 'pressure' ? "🔥 13:00" : 
                     currentMode === 'exam-night' ? "🌙 3د / س" :
                     "🧘‍♂️ تدريب حر"}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6 mb-10">
                  <div className="bg-white/5 p-6 rounded-3xl border border-white/5 group-hover:bg-white/10 transition">
                    <p className="text-muted-foreground text-sm font-bold mb-1">الأسئلة</p>
                    <p className="text-3xl font-black text-white">{section.questions.length}</p>
                  </div>
                  <div className="bg-white/5 p-6 rounded-3xl border border-white/5 group-hover:bg-white/10 transition">
                    <p className="text-muted-foreground text-sm font-bold mb-1">النمط</p>
                    <p className="text-3xl font-black text-goldenrod">لفظي</p>
                  </div>
                </div>
                <Button 
                  onClick={() => startPractice(section, currentMode)} 
                  className={cn(
                    "w-full h-20 rounded-[30px] text-3xl font-black shadow-2xl hover:scale-[1.02] transition-all",
                    currentMode === 'pressure' ? "bg-vermillion text-white shadow-vermillion/20 hover:bg-vermillion/90" : 
                    currentMode === 'exam-night' ? "bg-indigo-600 text-white shadow-indigo-600/20 hover:bg-indigo-700" :
                    "bg-goldenrod text-midnight shadow-goldenrod/20"
                  )}
                >
                  {currentMode === 'pressure' ? "دخول التحدي 🔥" : 
                   currentMode === 'exam-night' ? "بدء ليلة الاختبار 🌙" :
                   "ابدأ التدريب 🚀"}
                </Button>
              </Card>
            ))}
          </div>
        </section>

        <footer className="text-center py-20">
          <div className="inline-block bg-gradient-to-r from-goldenrod via-vermillion to-pink-600 p-[3px] rounded-[50px] animate-pulse">
            <div className="bg-midnight px-12 py-10 rounded-[47px]">
              <h2 className="text-5xl md:text-7xl font-headline font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-goldenrod">يا رب كلنا نجيب 100% 🔥</h2>
            </div>
          </div>
          <p className="mt-12 text-muted-foreground font-bold">كل الحقوق محفوظة © EASY Prep Master 2024</p>
        </footer>
      </div>
    </main>
  );
}
