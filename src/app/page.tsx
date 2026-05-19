
'use client';

import React, { useState, useEffect } from 'react';
import { sections as staticSections, Section } from '@/lib/practice-data';
import { getSectionsFromDb, getUserProfile } from '@/lib/db-service';
import PracticeSession from '@/components/PracticeSession';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Flame, 
  LayoutDashboard,
  Loader2,
  PlayCircle,
  Zap,
  Search,
  Trophy,
  Star,
  History,
  User as UserIcon
} from 'lucide-react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { cn } from '@/lib/utils';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [activeView, setActiveView] = useState<'landing' | 'practice'>('landing');
  const [allSections, setAllSections] = useState<Section[]>([]);
  const [filteredSections, setFilteredSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const p = await getUserProfile(u.uid);
        setProfile(p);
      }
    });

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
        setFilteredSections(combined);
      } catch (e) {
        setAllSections(staticSections);
        setFilteredSections(staticSections);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = searchQuery.toLowerCase();
    const filtered = allSections.filter(s => 
      s.id.toString().includes(q) || 
      s.title.toLowerCase().includes(q) ||
      s.questions.some(question => question.question.toLowerCase().includes(q))
    );
    setFilteredSections(filtered);
  }, [searchQuery, allSections]);

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
    <main className="min-h-screen overflow-x-hidden relative bg-midnight text-white flex flex-col">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(230,172,0,0.15),transparent_60%)] pointer-events-none" />
      
      <div className="relative z-10 container mx-auto px-6 py-10 max-w-7xl flex-1">
        {/* User Stats Header */}
        {user && profile && (
          <div className="flex flex-wrap items-center justify-between gap-6 mb-12 p-6 glass rounded-[40px] border-goldenrod/20 animate-in fade-in slide-in-from-top-5 duration-700">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-goldenrod/20 flex items-center justify-center border-2 border-goldenrod/40 gold-glow">
                <span className="text-3xl font-black text-goldenrod">LV.{profile.level}</span>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black">{user.displayName || 'مبدع إيزي'}</h3>
                <div className="w-64 h-3 bg-white/5 rounded-full overflow-hidden border border-white/10">
                  <div 
                    className="h-full bg-gradient-to-r from-goldenrod to-vermillion transition-all duration-1000 shadow-[0_0_10px_rgba(230,172,0,0.5)]" 
                    style={{ width: `${(profile.xp / (profile.level * 1000)) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground font-bold">{profile.xp} / {profile.level * 1000} XP</p>
              </div>
            </div>
            <div className="flex gap-4">
              <Button variant="ghost" className="rounded-2xl h-14 px-6 border border-white/5 hover:bg-goldenrod/10 hover:text-goldenrod text-lg font-black transition-all">
                <Trophy className="ml-2 w-6 h-6" /> لوحة الصدارة
              </Button>
              <Button variant="ghost" className="rounded-2xl h-14 px-6 border border-white/5 hover:bg-vermillion/10 hover:text-vermillion text-lg font-black transition-all">
                <History className="ml-2 w-6 h-6" /> سجل الأخطاء
              </Button>
            </div>
          </div>
        )}

        <header className="text-center mb-24 space-y-8">
          <div className="inline-flex items-center gap-3 px-8 py-3 rounded-full glass border-goldenrod/30 text-goldenrod font-black text-lg mb-4 shadow-[0_0_30px_rgba(230,172,0,0.2)]">
            <Zap className="w-5 h-5 fill-goldenrod animate-pulse" /> منصة EASY التدريبية 2.0 🔥
          </div>
          <h1 className="text-8xl md:text-[10rem] font-headline font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-goldenrod to-vermillion leading-none mb-4">
            EASY
          </h1>
          <p className="text-2xl md:text-4xl font-black text-white/80 leading-tight max-w-4xl mx-auto">
            تعلّم بذكاء.. أهم شيء الفهم وليس الحفظ 💡
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto pt-10 relative group">
            <Search className="absolute right-6 top-1/2 -translate-y-1/2 w-8 h-8 text-goldenrod/50 group-focus-within:text-goldenrod transition-colors z-10" />
            <Input 
              placeholder="ابحث عن رقم النموذج أو عنوانه..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-20 w-full rounded-[30px] bg-white/5 border-2 border-white/10 pr-16 text-2xl font-bold focus:border-goldenrod/50 focus:bg-white/10 transition-all shadow-xl placeholder:text-white/20"
            />
          </div>
        </header>

        <section className="space-y-12 mb-32">
          <div className="flex items-center justify-between">
            <h2 className="text-5xl font-headline font-black text-goldenrod">النماذج التدريبية</h2>
            <Badge className="bg-goldenrod/10 text-goldenrod text-xl px-6 py-2 border-2 border-goldenrod/20 rounded-full">
              {loading ? <Loader2 className="animate-spin" /> : `${filteredSections.length} متاح`}
            </Badge>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-40 space-y-6">
              <Loader2 className="w-20 h-20 text-goldenrod animate-spin" />
              <p className="text-2xl font-black text-goldenrod/50">جاري جلب أحدث النماذج...</p>
            </div>
          ) : filteredSections.length === 0 ? (
            <div className="text-center py-40 glass rounded-[60px] border-dashed border-white/10">
              <p className="text-3xl font-black text-white/20">لا توجد نتائج بحث مطابقة 🔍</p>
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-10">
              {filteredSections.map((section, idx) => (
                <Card 
                  key={section.firebaseId || section.id} 
                  className={cn(
                    "group relative bg-white/5 border-2 border-white/5 rounded-[50px] p-10 shadow-2xl overflow-hidden transition-all hover:border-goldenrod/50 hover:bg-white/[0.08] hover:scale-[1.01] duration-500 animate-in fade-in slide-in-from-bottom-10",
                    `delay-[${idx * 100}ms]`
                  )}
                >
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-goldenrod via-vermillion to-goldenrod opacity-30 group-hover:opacity-100 transition-opacity" />
                  <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="space-y-3">
                      <div className="flex items-center gap-4">
                        <span className="bg-goldenrod text-midnight px-4 py-1 rounded-2xl font-black text-lg">جديد</span>
                        <h2 className="text-5xl font-black text-white group-hover:text-goldenrod transition-colors">
                           نموذج {section.id}
                        </h2>
                      </div>
                      <p className="text-xl text-muted-foreground font-bold line-clamp-1">{section.title}</p>
                    </div>
                    <Button 
                      onClick={() => handleStartClick(section)} 
                      className="h-24 px-12 rounded-[35px] text-3xl font-black bg-goldenrod text-midnight hover:scale-105 transition-all shadow-2xl gold-glow border-b-8 border-goldenrod/50 active:border-b-0 active:translate-y-2"
                    >
                      <PlayCircle className="ml-3 w-10 h-10" /> ابدأ 🚀
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        <footer className="text-center py-20 border-t border-white/5 space-y-8">
          <div className="flex justify-center gap-8">
            <Button 
              variant="ghost" 
              onClick={() => window.location.href = '/admin'} 
              className="text-muted-foreground/30 hover:text-white transition-colors font-bold text-lg"
            >
              <LayoutDashboard className="ml-2 w-6 h-6" /> لوحة التحكم
            </Button>
            <Button 
              variant="ghost" 
              className="text-muted-foreground/30 hover:text-goldenrod transition-colors font-bold text-lg"
            >
              <Star className="ml-2 w-6 h-6" /> الأسئلة المفضلة
            </Button>
          </div>
          <div className="pt-10">
            <p className="text-2xl font-headline font-black tracking-widest text-white/20">
              A/K SALAMAH ❤️
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}
