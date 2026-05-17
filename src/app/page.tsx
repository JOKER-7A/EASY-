
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
  PlayCircle
} from 'lucide-react';

export type PracticeMode = 'normal' | 'pressure' | 'exam-night';

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
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(230,172,0,0.1),transparent_50%)]" />
      <div className="relative z-10 container mx-auto px-4 py-12 md:py-20 max-w-7xl">
        <header className="text-center mb-24 space-y-6">
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full glass border-goldenrod/30 text-goldenrod font-black text-sm mb-4 animate-bounce">
            <Flame className="w-4 h-4 fill-goldenrod" /> منصة EASY التدريبية 🔥
          </div>
          <h1 className="text-8xl md:text-9xl font-headline font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-goldenrod to-vermillion">EASY</h1>
          <p className="text-2xl md:text-3xl font-bold opacity-80 leading-relaxed max-w-4xl mx-auto">تعلّم بذكاء.. أهم شيء الفهم وليس الحفظ</p>
        </header>

        <section className="space-y-12 mb-24">
          <div className="flex items-center justify-between">
            <h2 className="text-5xl font-headline font-black text-goldenrod">النماذج التدريبية</h2>
            <Badge className="bg-goldenrod/10 text-goldenrod text-lg px-6 py-2 border border-goldenrod/20 rounded-full">
              {loading ? <Loader2 className="animate-spin" /> : `${allSections.length} نموذج`}
            </Badge>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-12 h-12 text-goldenrod animate-spin" />
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-10">
              {allSections.map((section) => (
                <Card key={section.firebaseId || section.id} className="group relative bg-white/5 border-2 border-white/5 rounded-[50px] p-10 shadow-2xl overflow-hidden transition-all hover:border-goldenrod/40">
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-goldenrod to-vermillion" />
                  <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                    <div>
                      <h2 className="text-5xl font-black text-white group-hover:text-goldenrod">🔥 نموذج {section.id}</h2>
                      <p className="text-xl text-muted-foreground font-bold mt-2">{section.title}</p>
                    </div>
                    <Button 
                      onClick={() => handleStartClick(section)} 
                      className="h-24 px-12 rounded-[35px] text-3xl font-black bg-goldenrod text-midnight hover:scale-105 transition-all shadow-xl"
                    >
                      <PlayCircle className="ml-3 w-10 h-10" /> ابدأ التدريب
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        <footer className="text-center py-20">
          <Button variant="ghost" onClick={() => window.location.href = '/admin'} className="mb-12 text-muted-foreground/30 hover:text-white">
            <LayoutDashboard className="ml-2 w-4 h-4" /> لوحة التحكم
          </Button>
        </footer>
      </div>
    </main>
  );
}
