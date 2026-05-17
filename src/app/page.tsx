
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
        </header>

        <section className="space-y-12 mb-24">
          <div className="flex items-center justify-between">
            <h2 className="text-5xl font-headline font-black text-goldenrod underline decoration-vermillion/50 decoration-8 underline-offset-8">الأقسام التدريبية</h2>
            <Badge className="bg-goldenrod/10 text-goldenrod text-lg px-6 py-2 border border-goldenrod/20 rounded-full">{allSections.length} نموذج</Badge>
          </div>
          <div className="grid lg:grid-cols-2 gap-10">
            {allSections.map((section) => (
              <Card key={section.firebaseId || section.id} className="group relative bg-gradient-to-br from-white/10 to-transparent border-2 border-white/5 backdrop-blur-2xl rounded-[50px] p-10 shadow-2xl overflow-hidden transition-all hover:border-goldenrod/40">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-goldenrod via-vermillion to-pink-500" />
                <div className="flex justify-between items-start mb-10">
                  <div className="space-y-2">
                    <Badge variant="outline" className="px-4 py-1 text-sm font-black rounded-full border-goldenrod text-goldenrod">بالتوفيق 🔥</Badge>
                    <h2 className="text-5xl font-black text-white group-hover:text-goldenrod">🔥 نموذج {section.id}</h2>
                    <p className="text-xl text-muted-foreground font-bold">{section.title}</p>
                  </div>
                </div>
                <Button 
                  onClick={() => startPractice(section, currentMode)} 
                  className="w-full h-20 rounded-[30px] text-3xl font-black bg-goldenrod text-midnight shadow-goldenrod/20 hover:scale-[1.02] transition-all"
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
        </footer>
      </div>
    </main>
  );
}
