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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Zap,
  Search,
  Trophy,
  History,
  X,
  ChevronRight,
  Loader2,
  Settings,
  ShieldCheck,
  User as UserIcon,
  Crown,
  Star,
  LayoutDashboard,
  Palette,
  LogOut,
  ArrowRight
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { 
  onAuthStateChanged, 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const THEMES = [
  { name: 'Purple', value: '270 95% 60%', color: '#9333ea' },
  { name: 'Blue', value: '220 95% 60%', color: '#2563eb' },
  { name: 'Emerald', value: '160 84% 39%', color: '#059669' },
  { name: 'Rose', value: '350 89% 60%', color: '#e11d48' },
  { name: 'Orange', value: '25 95% 50%', color: '#f97316' },
  { name: 'Cyan', value: '190 95% 50%', color: '#06b6d4' },
  { name: 'Red', value: '0 95% 60%', color: '#dc2626' },
];

export default function Home() {
  const [hasMounted, setHasMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<'landing' | 'practice'>('landing');
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  
  const [activeOverlay, setActiveOverlay] = useState<'leaderboard' | 'errors' | 'themes' | null>(null);
  const [overlayData, setOverlayData] = useState<any[]>([]);
  
  const { toast } = useToast();

  useEffect(() => {
    setHasMounted(true);
    const safetyTimer = setTimeout(() => setIsLoading(false), 2000);

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const p = await getUserProfile(u.uid, u.email || '');
        setProfile(p);
        if (p?.theme) {
          document.documentElement.style.setProperty('--primary', p.theme);
          document.documentElement.style.setProperty('--ring', p.theme);
        }
      }
      setIsLoading(false);
    });

    getSectionsFromDb().then(data => {
      setSections(data.length > 0 ? data : staticSections);
    }).catch(() => setSections(staticSections));

    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, []);

  const changeTheme = async (themeValue: string) => {
    document.documentElement.style.setProperty('--primary', themeValue);
    document.documentElement.style.setProperty('--ring', themeValue);
    if (user) {
      const userRef = doc(db, "userProfiles", user.uid);
      await updateDoc(userRef, { theme: themeValue });
      setProfile((prev: any) => ({ ...prev, theme: themeValue }));
    }
  };

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
    setIsAuthLoading(true);
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: "أهلاً بك مجدداً في EASY! 🚀" });
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        toast({ title: "تم إنشاء حسابك بنجاح ✅" });
      }
    } catch (error: any) {
      toast({ title: "خطأ في الدخول", description: error.message, variant: "destructive" });
    } finally {
      setIsAuthLoading(false);
    }
  };

  const openOverlay = async (type: 'leaderboard' | 'errors' | 'themes') => {
    setActiveOverlay(type);
    setOverlayData([]);
    if (type === 'themes') return;
    try {
      if (type === 'leaderboard') {
        const data = await getLeaderboard();
        setOverlayData(data || []);
      } else if (type === 'errors' && user) {
        const data = await getErrorLogs(user.uid);
        setOverlayData(data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!hasMounted) return null;

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-[500] bg-mesh">
        <div className="relative mb-10">
          <div className="absolute inset-0 bg-primary/20 blur-[60px] animate-pulse rounded-full" />
          <Loader2 className="w-16 h-16 text-primary animate-spin relative z-10" />
        </div>
        <h2 className="text-4xl font-black text-white tracking-[0.5em] animate-pulse">EASY PREP</h2>
      </div>
    );
  }

  if (activeView === 'practice' && selectedSection) {
    return <PracticeSession section={selectedSection} onExit={() => setActiveView('landing')} />;
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col relative overflow-x-hidden bg-mesh">
      
      {!user && (
        <div className="fixed inset-0 z-[400] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4">
          <Card className="w-full max-w-xl p-12 glass-card rounded-[60px] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-primary to-transparent" />
            <div className="text-center mb-12 space-y-4">
              <h1 className="text-9xl md:text-[14rem] text-easy-premium leading-none shimmer-overlay">EASY</h1>
              <p className="text-xl text-primary font-black tracking-[0.4em] uppercase opacity-70">Elite Prep Master</p>
            </div>
            <form onSubmit={handleAuth} className="space-y-6">
              <Input 
                type="email" 
                placeholder="البريد الإلكتروني" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="h-18 rounded-[30px] bg-white/5 border-white/10 text-xl px-8 focus:border-primary/50 transition-all" 
              />
              <Input 
                type="password" 
                placeholder="كلمة المرور" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="h-18 rounded-[30px] bg-white/5 border-white/10 text-xl px-8 focus:border-primary/50 transition-all" 
              />
              <Button 
                type="submit" 
                disabled={isAuthLoading}
                className="w-full h-20 rounded-[35px] bg-primary text-white font-black text-3xl hover:scale-105 transition-all shadow-[0_10px_40px_rgba(var(--primary),0.3)]"
              >
                {isAuthLoading ? <Loader2 className="animate-spin" /> : (authMode === 'login' ? "دخول 🚀" : "انضم الآن ✨")}
              </Button>
            </form>
            <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="mt-10 w-full text-white/30 font-bold hover:text-white transition-colors text-lg">
              {authMode === 'login' ? "لا تملك حساباً؟ سجل هنا" : "لديك حساب؟ سجل دخولك"}
            </button>
          </Card>
        </div>
      )}

      {/* Header */}
      {user && (
        <nav className="fixed top-0 left-0 w-full z-[100] px-4 md:px-10 py-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between p-4 glass-card rounded-[35px]">
            <div className="flex items-center gap-6">
              <Avatar className="w-16 h-16 border-2 border-primary/30 ring-4 ring-primary/10">
                <AvatarImage src={user.photoURL || ''} />
                <AvatarFallback className="bg-primary/20 text-primary font-black text-2xl">
                  {user.email?.[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <p className="font-black text-2xl flex items-center gap-2">
                  {profile?.displayName || 'مستكشف EASY'}
                  {profile?.status === 'admin' && <Crown className="w-5 h-5 text-yellow-500 fill-yellow-500" />}
                </p>
                <div className="flex gap-4 mt-1">
                  <Badge className="bg-primary/10 text-primary border-none text-sm font-bold">LVL {profile?.level || 1}</Badge>
                  <Badge className="bg-white/5 text-white/40 border-none text-sm font-bold">{profile?.xp || 0} XP</Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <Button onClick={() => openOverlay('themes')} variant="ghost" size="icon" className="w-14 h-14 rounded-2xl hover:bg-primary/10 text-primary">
                <Palette className="w-7 h-7" />
              </Button>
              <Button onClick={() => openOverlay('leaderboard')} variant="ghost" size="icon" className="w-14 h-14 rounded-2xl hover:bg-primary/10 text-primary">
                <Trophy className="w-7 h-7" />
              </Button>
              <Button onClick={() => openOverlay('errors')} variant="ghost" size="icon" className="w-14 h-14 rounded-2xl hover:bg-primary/10 text-primary">
                <History className="w-7 h-7" />
              </Button>
              {profile?.status === 'admin' && (
                <Button onClick={() => window.location.href = '/admin'} variant="ghost" size="icon" className="w-14 h-14 rounded-2xl hover:bg-primary/10 text-primary">
                  <LayoutDashboard className="w-7 h-7" />
                </Button>
              )}
              <Button onClick={() => signOut(auth)} variant="ghost" size="icon" className="w-14 h-14 rounded-2xl hover:bg-destructive/10 text-destructive">
                <LogOut className="w-7 h-7" />
              </Button>
            </div>
          </div>
        </nav>
      )}

      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-48 pb-32 max-w-7xl relative z-10 text-center space-y-16">
        <div className="inline-flex items-center gap-3 px-12 py-5 rounded-full glass-card border-primary/30 text-primary font-black text-xl animate-float">
          <Zap className="w-6 h-6 fill-primary" /> EASY PREP ELITE
        </div>
        
        <div className="space-y-6">
          <h1 className="text-[10rem] md:text-[20rem] text-easy-premium leading-none shimmer-overlay group transition-all duration-700 hover:scale-110 cursor-default">
            EASY
          </h1>
          <p className="text-3xl md:text-5xl font-black text-white/40 max-w-4xl mx-auto tracking-wide animate-pulse">
            تغلّب على نفسك <span className="text-white text-glow">كل يوم</span> 💎
          </p>
        </div>

        <div className="max-w-4xl mx-auto pt-20">
          <div className="relative group">
            <Search className="absolute right-10 top-1/2 -translate-y-1/2 w-10 h-10 text-white/10 group-focus-within:text-primary transition-all duration-300" />
            <Input 
              placeholder="ابحث عن نموذج بالاسم أو الرقم..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-28 w-full rounded-[50px] bg-white/[0.03] border-2 border-white/5 pr-24 text-4xl font-black transition-all focus:border-primary/30 shadow-2xl focus:scale-[1.02] backdrop-blur-xl"
            />
          </div>
        </div>
      </div>

      {/* Sections Grid */}
      <section className="container mx-auto px-4 md:px-10 pb-40 grid grid-cols-1 lg:grid-cols-2 gap-12">
        {filteredSections.map((section) => (
          <Card key={section.firebaseId || section.id} className="group glass-card rounded-[60px] p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Zap className="w-40 h-40 text-primary" />
            </div>
            
            <div className="flex flex-col sm:flex-row justify-between items-center gap-12 relative z-10">
              <div className="space-y-6 text-right flex-1">
                <div className="flex items-center gap-4">
                  <Badge className="bg-primary/20 text-primary px-8 py-3 rounded-2xl font-black text-2xl border-none">قسم {section.id}</Badge>
                  {section.id > 218 && <Badge className="bg-amber-500/20 text-amber-500 px-6 py-3 rounded-2xl font-black border-none animate-pulse">جديد ✨</Badge>}
                </div>
                <h2 className="text-5xl font-black text-white group-hover:text-primary transition-colors duration-500">{section.title}</h2>
                <div className="flex items-center gap-10 text-white/30 font-black text-xl">
                  <span className="flex items-center gap-3"><Zap className="w-6 h-6" /> {section.questions?.length || 0} سؤال</span>
                  <span className="flex items-center gap-3"><History className="w-6 h-6" /> {section.duration} دقيقة</span>
                </div>
              </div>
              <Button 
                onClick={() => { setSelectedSection(section); setActiveView('practice'); }} 
                className="w-full sm:w-auto h-32 px-16 rounded-[45px] text-4xl font-black bg-primary text-white hover:scale-110 transition-all shadow-[0_20px_60px_rgba(var(--primary),0.4)] active:scale-95 group/btn"
              >
                ابدأ <ArrowRight className="mr-3 w-12 h-12 transition-transform group-hover/btn:translate-x-2" />
              </Button>
            </div>
          </Card>
        ))}
        {filteredSections.length === 0 && (
          <div className="col-span-full text-center py-40 glass-card rounded-[60px] border-dashed">
            <Search className="w-24 h-24 text-white/10 mx-auto mb-8" />
            <p className="text-4xl font-black text-white/20">لم نجد أي نموذج بهذا الاسم أو الرقم</p>
          </div>
        )}
      </section>

      {/* Overlays */}
      {activeOverlay && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 animate-in fade-in duration-500">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setActiveOverlay(null)} />
          <Card className="w-full max-w-5xl max-h-[90vh] overflow-hidden glass-card rounded-[70px] relative z-10 flex flex-col border-primary/20">
            <div className="p-12 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-6xl font-black text-white flex items-center gap-6">
                {activeOverlay === 'leaderboard' && <Trophy className="w-16 h-16 text-primary" />}
                {activeOverlay === 'errors' && <History className="w-16 h-16 text-primary" />}
                {activeOverlay === 'themes' && <Palette className="w-16 h-16 text-primary" />}
                {activeOverlay === 'leaderboard' ? "نخبة EASY" : activeOverlay === 'errors' ? "سجل الأخطاء" : "مركز الثيمات"}
              </h2>
              <Button variant="ghost" size="icon" className="rounded-full w-20 h-20 hover:bg-white/10" onClick={() => setActiveOverlay(null)}>
                <X className="w-12 h-12" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
              {activeOverlay === 'themes' ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                  {THEMES.map((t) => (
                    <button
                      key={t.name}
                      onClick={() => changeTheme(t.value)}
                      className="group p-10 rounded-[45px] glass-card flex flex-col items-center gap-6 transition-all hover:scale-105"
                      style={{ borderColor: t.value === profile?.theme ? t.color : 'transparent' }}
                    >
                      <div className="w-24 h-24 rounded-full shadow-2xl" style={{ backgroundColor: t.color }} />
                      <span className="text-2xl font-black group-hover:text-primary transition-colors">{t.name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {overlayData.length === 0 ? (
                    <div className="text-center py-40 opacity-20 text-4xl font-black animate-pulse">جاري جلب البيانات...</div>
                  ) : (
                    overlayData.map((item, idx) => (
                      <div key={idx} className="p-8 rounded-[40px] glass-card flex justify-between items-center group">
                        <div className="flex items-center gap-10">
                          {activeOverlay === 'leaderboard' && (
                            <div className={cn(
                              "w-16 h-16 rounded-2xl flex items-center justify-center font-black text-4xl",
                              idx === 0 ? "bg-amber-500 text-black shadow-2xl" : "bg-white/5"
                            )}>{idx + 1}</div>
                          )}
                          <div>
                            <p className="font-black text-3xl text-white group-hover:text-primary transition-all">
                              {activeOverlay === 'leaderboard' ? item.displayName : (item.questionData?.question || 'سؤال')}
                            </p>
                            <p className="text-white/30 font-bold text-xl mt-1">
                              {activeOverlay === 'leaderboard' ? `@${item.email?.split('@')[0]}` : item.questionData?.sectionTitle}
                            </p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="text-4xl font-black text-primary">
                            {activeOverlay === 'leaderboard' ? `${item.xp || 0} XP` : `${item.count || 1} أخطاء`}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Footer Signature */}
      <footer className="text-center py-32 border-t border-white/5 mt-40 space-y-8 bg-black/50 backdrop-blur-3xl">
        <p className="text-5xl tracking-[0.6em] uppercase font-black opacity-10 hover:opacity-100 transition-all duration-1000 cursor-default">
          DR.MAHMOUD ABD EL RAZEK
        </p>
        <p className="text-primary font-black text-xl opacity-40">Elite Training System &copy; 2024</p>
      </footer>
    </main>
  );
}