'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Section, sections as staticSections } from '@/lib/practice-data';
import { 
  getSectionsFromDb, 
  getUserProfile, 
  getLeaderboard, 
  getErrorLogs
} from '@/lib/db-service';
import PracticeSession from '@/components/PracticeSession';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { 
  Zap,
  Search,
  Trophy,
  History,
  LogOut,
  X,
  ChevronRight,
  Loader2,
  LayoutDashboard
} from 'lucide-react';
import { auth } from '@/lib/firebase';
import { 
  onAuthStateChanged, 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const [hasMounted, setHasMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<'landing' | 'practice'>('landing');
  const [sections, setSections] = useState<Section[]>(staticSections);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [activeOverlay, setActiveOverlay] = useState<'leaderboard' | 'errors' | null>(null);
  const [overlayData, setOverlayData] = useState<any[]>([]);
  
  const { toast } = useToast();

  useEffect(() => {
    setHasMounted(true);
    
    const safetyTimer = setTimeout(() => {
      setIsLoading(false);
    }, 2500);

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const p = await getUserProfile(u.uid, u.email || '');
          setProfile(p);
        } catch (e) {
          console.error("Profile error", e);
        }
      }
      setIsLoading(false);
    });

    getSectionsFromDb().then(data => {
      if (data && data.length > 0) setSections(data);
    }).catch(() => {
      setSections(staticSections);
    });

    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, []);

  const filteredSections = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return sections;
    return sections.filter(s => 
      s.title.toLowerCase().includes(q) || s.id.toString().includes(q)
    );
  }, [searchQuery, sections]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: "أهلاً بك مجدداً! 🚀" });
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        toast({ title: "تم إنشاء الحساب بنجاح ✅" });
      }
    } catch (error: any) {
      toast({ title: "خطأ في الدخول", variant: "destructive", description: "تأكد من البيانات وحاول مرة أخرى" });
    }
  };

  const openOverlay = async (type: 'leaderboard' | 'errors') => {
    setActiveOverlay(type);
    try {
      if (type === 'leaderboard') {
        const data = await getLeaderboard();
        setOverlayData(data);
      } else if (type === 'errors' && user) {
        const data = await getErrorLogs(user.uid);
        setOverlayData(data);
      }
    } catch (e) {
      setOverlayData([]);
    }
  };

  if (!hasMounted) return <div className="min-h-screen bg-black" />;

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-[500] backdrop-blur-xl">
        <Loader2 className="w-16 h-16 text-primary animate-spin mb-8" />
        <h2 className="text-4xl font-black text-white text-shine">EASY PREP MASTER</h2>
        <p className="text-white/20 font-bold mt-4 tracking-widest">أهم شيء الفهم وليس الحفظ...</p>
      </div>
    );
  }

  if (activeView === 'practice' && selectedSection) {
    return <PracticeSession section={selectedSection} onExit={() => setActiveView('landing')} />;
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col relative overflow-x-hidden pb-20">
      {!user && (
        <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4">
          <Card className="w-full max-w-xl p-10 glass border-white/5 rounded-[50px] shadow-2xl">
            <div className="text-center mb-10">
              <h1 className="text-8xl md:text-[10rem] text-easy-premium mb-4">EASY</h1>
              <p className="text-lg text-primary font-bold tracking-widest opacity-80 uppercase">Elite Training Master</p>
            </div>
            <form onSubmit={handleAuth} className="space-y-6">
              <Input type="email" placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} className="h-16 rounded-2xl bg-white/5 border-white/10 text-xl" />
              <Input type="password" placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} className="h-16 rounded-2xl bg-white/5 border-white/10 text-xl" />
              <Button type="submit" className="w-full h-18 rounded-2xl bg-primary text-white font-black text-2xl hover:scale-105 transition-transform">
                {authMode === 'login' ? "دخول 🚀" : "انضم الآن ✨"}
              </Button>
            </form>
            <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="mt-8 w-full text-white/40 font-bold hover:text-white">
              {authMode === 'login' ? "لا تملك حساباً؟ سجل هنا" : "لديك حساب؟ سجل دخولك"}
            </button>
          </Card>
        </div>
      )}

      <div className="container mx-auto px-4 md:px-8 py-20 max-w-7xl relative z-10">
        {user && profile && (
          <div className="fixed top-8 left-8 z-[100] hidden lg:block">
            <div className="glass p-5 pr-14 rounded-[30px] border-primary/20 flex items-center gap-7">
              <div className="w-16 h-16 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-3xl shadow-xl">
                {profile.level || 1}
              </div>
              <div className="space-y-2 flex flex-col min-w-[180px]">
                <div className="flex justify-between items-end">
                  <p className="text-xs font-black text-primary tracking-widest uppercase">LEVEL</p>
                  <p className="text-sm font-bold text-white/60 truncate max-w-[120px]">{profile.displayName || 'مستكشف'}</p>
                </div>
                <Progress value={profile.xp ? (profile.xp % 100) : 0} className="h-3 bg-white/5" />
                <p className="text-[10px] text-white/30 font-black">{profile.xp || 0} XP TOTAL</p>
              </div>
            </div>
          </div>
        )}

        <header className="text-center mb-32 space-y-12 pt-20">
          <div className="inline-flex items-center gap-3 px-10 py-4 rounded-full glass border-primary/30 text-primary font-black animate-float">
            <Zap className="w-6 h-6 fill-primary" /> EASY PREP V3.1
          </div>
          <h1 className="text-[10rem] md:text-[15rem] text-easy-premium text-shine leading-none">EASY</h1>
          <p className="text-3xl font-black text-white/50 max-w-4xl mx-auto">أهم شيء الفهم <span className="text-white">وليس الحفظ</span> 💎</p>

          <div className="max-w-3xl mx-auto pt-20 px-4">
            <div className="relative">
              <Search className="absolute right-8 top-1/2 -translate-y-1/2 w-8 h-8 text-white/20" />
              <Input 
                placeholder="ابحث عن نموذج..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-24 w-full rounded-[45px] bg-white/5 border-2 border-white/5 pr-20 text-3xl font-bold transition-all focus:border-primary/30"
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-8 pt-10">
            <Button onClick={() => openOverlay('errors')} className="h-20 px-14 rounded-[40px] glass border-destructive/30 text-destructive font-black text-2xl hover:bg-destructive/10">
              <History className="ml-3 w-8 h-8" /> سجل الأخطاء
            </Button>
            <Button onClick={() => openOverlay('leaderboard')} className="h-20 px-14 rounded-[40px] glass border-white/10 text-white font-black text-2xl hover:bg-white/5">
              <Trophy className="ml-3 w-8 h-8" /> لوحة الشرف
            </Button>
          </div>
        </header>

        <section className="space-y-16">
          <div className="flex items-center justify-between px-4">
            <h2 className="text-5xl font-black text-white">النماذج التدريبية</h2>
            <Badge className="bg-primary/20 text-primary text-2xl px-10 py-4 border border-primary/20 rounded-full font-black">
              {filteredSections.length} متاح
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {filteredSections.map((section) => (
              <Card 
                key={section.firebaseId || section.id} 
                className="group bg-white/[0.02] border border-white/5 rounded-[50px] p-10 shadow-2xl transition-all hover:border-primary/50"
              >
                <div className="flex flex-col sm:flex-row justify-between items-center gap-8">
                  <div className="space-y-4 text-right">
                    <span className="bg-primary/20 text-primary px-6 py-2 rounded-xl font-black text-xl">قسم {section.id}</span>
                    <h2 className="text-4xl font-black text-white group-hover:text-primary transition-colors">
                      {section.title}
                    </h2>
                    <p className="text-white/30 font-bold text-lg">{section.questions?.length || 0} سؤال • {section.duration} دقيقة</p>
                  </div>
                  <Button 
                    onClick={() => { setSelectedSection(section); setActiveView('practice'); }} 
                    className="w-full sm:w-auto h-28 px-14 rounded-[40px] text-3xl font-black bg-primary text-white hover:scale-105 transition-transform"
                  >
                    ابدأ <ChevronRight className="mr-2 w-10 h-10" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <footer className="text-center py-20 border-t border-white/5 mt-32 space-y-12">
          <div className="flex flex-wrap justify-center gap-16 items-center">
            {profile?.status === 'admin' && (
              <Button onClick={() => window.location.href = '/admin'} variant="ghost" className="text-white/20 hover:text-white font-black text-xl">
                <LayoutDashboard className="ml-3 w-7 h-7" /> لوحة التحكم
              </Button>
            )}
            {user && (
              <Button onClick={() => signOut(auth)} variant="ghost" className="text-destructive/30 hover:text-destructive font-black text-xl">
                <LogOut className="ml-3 w-7 h-7" /> تسجيل الخروج
              </Button>
            )}
          </div>
          <p className="text-4xl tracking-[0.4em] uppercase font-black opacity-30 text-shine">DR.MAHMOUD ABD EL RAZEK</p>
        </footer>
      </div>

      {activeOverlay && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-3xl" onClick={() => setActiveOverlay(null)} />
          <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden glass border-white/5 rounded-[40px] relative z-10 flex flex-col">
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-4xl font-black text-white">
                {activeOverlay === 'leaderboard' ? "نخبة EASY 🏆" : "سجل الأخطاء ⚠️"}
              </h2>
              <Button variant="ghost" onClick={() => setActiveOverlay(null)}><X className="w-8 h-8" /></Button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {overlayData.length === 0 ? (
                <div className="text-center py-20 opacity-30 text-2xl font-black">لا توجد بيانات حالياً 🚀</div>
              ) : (
                overlayData.map((item, idx) => (
                  <div key={idx} className="mb-4 p-6 bg-white/5 rounded-3xl border border-white/5 flex justify-between items-center">
                    <span className="text-2xl font-bold">
                      {activeOverlay === 'leaderboard' ? `${idx + 1}. ${item.displayName || 'مستخدم'}` : (item.questionData?.question || 'سؤال')}
                    </span>
                    <span className="text-primary font-black">
                      {activeOverlay === 'leaderboard' ? `${item.xp || 0} XP` : `تكرر ${item.count || 1} مرة`}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}
    </main>
  );
}