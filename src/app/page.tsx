'use client';

import React, { useState, useEffect } from 'react';
import { sections as staticSections, Section } from '@/lib/practice-data';
import { getSectionsFromDb } from '@/lib/db-service';
import PracticeSession from '@/components/PracticeSession';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  Flame, 
  LayoutDashboard,
  Loader2,
  PlayCircle,
  Zap
} from 'lucide-react';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [activeView, setActiveView] = useState<'landing' | 'practice'>('landing');
  const [allSections, setAllSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    const fetchAllData = async () => {
      try {
        const dbSections = await getSectionsFromDb();
        const combined = [...dbSections];
        // دمج البيانات الثابتة مع قاعدة البيانات وتجنب التكرار
        staticSections.forEach(s => {
          if (!combined.find(c => Number(c.id) === Number(s.id))) {
            combined.push(s);
          }
        });
        combined.sort((a, b) => Number(b.id) - Number(a.id));
        setAllSections(combined);
      } catch (e) {
        setAllSections(staticSections);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);

  if (!mounted) return <div className="min-h-screen bg-midnight" />;

  const handleStartClick = (section: Section) => {
    setSelectedSection(section);
    setActiveView('practice');
  };

  if (activeView === 'practice' && selectedSection) {
    return (
      <main className="min-h-screen p-0 bg-midnight">
        <PracticeSession 
          section={selectedSection} 
          onExit={() => setActiveView('landing')} 
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden relative bg-midnight text-white">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(230,172,0,0.15),transparent_60%)] pointer-events-none" />
      
      <div className="relative z-10 container mx-auto px-6 py-16 md:py-28 max-w-7xl">
        <header className="text-center mb-32 space-y-10 animate-in fade-in slide-in-from-top-10 duration-1000">
          <div className="inline-flex items-center gap-3 px-8 py-3 rounded-full glass border-goldenrod/30 text-goldenrod font-black text-lg mb-6 shadow-[0_0_30px_rgba(230,172,0,0.2)]">
            <Zap className="w-5 h-5 fill-goldenrod animate-pulse" /> منصة EASY التدريبية 2.0 🔥
          </div>
          <h1 className="text-9xl md:text-[12rem] font-headline font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-goldenrod to-vermillion leading-none">
            EASY
          </h1>
          <p className="text-3xl md:text-5xl font-black text-white/80 leading-tight max-w-5xl mx-auto">
            تعلّم بذكاء.. أهم شيء الفهم وليس الحفظ 💡
          </p>
        </header>

        <section className="space-y-16 mb-32">
          <div className="flex items-center justify-between">
            <h2 className="text-6xl font-headline font-black text-goldenrod">النماذج التدريبية</h2>
            <Badge className="bg-goldenrod/10 text-goldenrod text-2xl px-8 py-3 border-2 border-goldenrod/20 rounded-full">
              {loading ? <Loader2 className="animate-spin" /> : `${allSections.length} نموذج`}
            </Badge>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-40 space-y-6">
              <Loader2 className="w-20 h-20 text-goldenrod animate-spin" />
              <p className="text-2xl font-black text-goldenrod/50">جاري جلب أحدث النماذج...</p>
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-12">
              {allSections.map((section) => (
                <Card 
                  key={section.firebaseId || section.id} 
                  className="group relative bg-white/5 border-2 border-white/5 rounded-[60px] p-12 shadow-2xl overflow-hidden transition-all hover:border-goldenrod/50 hover:bg-white/[0.08]"
                >
                  <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-goldenrod via-vermillion to-goldenrod" />
                  <div className="flex flex-col md:flex-row justify-between items-center gap-10">
                    <div className="space-y-4">
                      <h2 className="text-6xl font-black text-white group-hover:text-goldenrod transition-colors">
                        🔥 نموذج {section.id}
                      </h2>
                      <p className="text-2xl text-muted-foreground font-bold">{section.title}</p>
                    </div>
                    <Button 
                      onClick={() => handleStartClick(section)} 
                      className="h-28 px-16 rounded-[40px] text-4xl font-black bg-goldenrod text-midnight hover:scale-105 transition-all shadow-2xl gold-glow"
                    >
                      <PlayCircle className="ml-4 w-12 h-12" /> ابدأ 🚀
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        <footer className="text-center py-20 border-t border-white/5">
          <Button 
            variant="ghost" 
            onClick={() => window.location.href = '/admin'} 
            className="text-muted-foreground/20 hover:text-white transition-colors"
          >
            <LayoutDashboard className="ml-2 w-5 h-5" /> لوحة التحكم الإدارية
          </Button>
        </footer>
      </div>
    </main>
  );
}
