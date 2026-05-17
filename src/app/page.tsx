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
  Moon,
  Zap,
  Play
} from 'lucide-react';

export type PracticeMode = 'normal' | 'pressure' | 'exam-night';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [activeView, setActiveView] = useState<'landing' | 'practice'>('landing');
  const [allSections, setAllSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [currentMode, setCurrentMode] = useState<PracticeMode>('normal');
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
    <main className="min-h-screen overflow-x-hidden relative bg-midnight text-white">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(230,172,0,0.1),transparent_50%)]" />
      <div className="relative z-10 container mx-auto px-4 py-12 md:py-20 max-w-7xl">
        <header className="text-center mb-24 space-y-6">
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full glass border-goldenrod/30 text-goldenrod font-black text-sm mb-4 animate-bounce">
            <Flame className="w-4 h-4 fill-goldenrod" /> منصة EASY التدريبية 🔥
          </div>
          <h1 className="text-8xl md:text-9xl font-headline font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-goldenrod to-vermillion">EASY</h1>
          <p className="text-2xl md:text-3xl font-bold opacity-80 leading-relaxed max-w-4xl mx-auto">تحدَّ نفسك في ليلة الاختبار أو وضع الضغط أو تدرب بهدوء</p>
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
                  <div className="mb-10">
                    <h2 className="text-5xl font-black text-white group-hover:text-goldenrod">🔥 نموذج {section.id}</h2>
                    <p className="text-xl text-muted-foreground font-bold mt-2">{section.title}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button 
                      onClick={() => startPractice(section, 'exam-night')} 
                      className="h-20 rounded-3xl text-xl font-black bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                      <Moon className="ml-2" /> ليلة الاختبار
                    </Button>
                    <Button 
                      onClick={() => startPractice(section, 'pressure')} 
                      className="h-20 rounded-3xl text-xl font-black bg-vermillion text-white hover:bg-red-600"
                    >
                      <Zap className="ml-2" /> وضع الضغط
                    </Button>
                    <Button 
                      onClick={() => startPractice(section, 'normal')} 
                      className="h-20 rounded-3xl text-xl font-black bg-goldenrod text-midnight hover:bg-yellow-500"
                    >
                      <Play className="ml-2" /> تدريب حر
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
