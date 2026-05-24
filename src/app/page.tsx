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
  ArrowRight,
  Heart
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
  
  const [activeOverlay, setActiveOverlay] = useState<'leaderboard' | 'errors' | 'themes' | 'favorites' | null>(null);
  const [overlayData, setOverlayData] = useState<any[]>([]);
  
  const { toast } = useToast();

  useEffect(() => {
    setHasMounted(true);
    // صمام أمان لضمان انتهاء شاشة التحميل
    const safetyTimer = setTimeout(() => setIsLoading(false), 2500);

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

  const openOverlay = async (type: 'leaderboard' | 'errors' | 'themes' | 'favorites') => {
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
      } else if (type === 'favorites' && profile?.favorites) {
        setOverlayData(profile.favorites);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!hasMounted) return null;

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-[500] bg-mesh">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-primary/20 blur-[40px] animate-pulse rounded-full" />
          <Loader2 className="w-12 h-12 text-primary animate-spin relative z-10" />
        </div>
        <h2 className="text-2xl font-black text-white tracking-[0.4em] animate-pulse">EASY PREP</h2>
      </div>
    );
  }

  if (activeView === 'practice' && selectedSection) {
    return <PracticeSession section={selectedSection} onExit={() => setActiveView('landing')} />;
  }

  return (
    <main className="min-h-screen bg-background text-white flex flex-col relative overflow-x-hidden bg-mesh">
      
      {/* Auth Screen Overlay */}
      {!user && (
        <div className="fixed inset-0 z-[400] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-10 glass-card rounded-[40px] relative overflow-hidden border-primary/20">
            <div className="text-center mb-10 space-y-2">
              <h1 className="text-7xl md:text-8xl text-easy-premium animate-float-soft">EASY</h1>
              <p className="text-sm text-primary font-black tracking-[0.3em] uppercase opacity-70">Elite Prep Master</p>
            </div>
            <form onSubmit={handleAuth} className="space-y-4">
              <Input 
                type="email" 
                placeholder="البريد الإلكتروني" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="h-14 rounded-2xl bg-white/5 border-white/10 text-lg px-6 focus:border-primary/50" 
              />
              <Input 
                type="password" 
                placeholder="كلمة المرور" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="h-14 rounded-2xl bg-white/5 border-white/10 text-lg px-6 focus:border-primary/50" 
              />
              <Button 
                type="submit" 
                disabled={isAuthLoading}
                className="w-full h-16 rounded-2xl bg-primary text-white font-black text-xl hover:scale-105 transition-all shadow-[0_10px_30px_rgba(var(--primary),0.2)]"
              >
                {isAuthLoading ? <Loader2 className="animate-spin" /> : (authMode === 'login' ? "دخول 🚀" : "انضم الآن ✨")}
              </Button>
            </form>
            <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="mt-8 w-full text-white/30 font-bold hover:text-white transition-colors text-sm">
              {authMode === 'login' ? "لا تملك حساباً؟ سجل هنا" : "لديك حساب؟ سجل دخولك"}
            </button>
          </Card>
        </div>
      )}

      {/* Main Navigation Header */}
      {user && (
        <nav className="fixed top-0 left-0 w-full z-[100] px-4 md:px-8 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between p-3 glass-card rounded-full">
            <div className="flex items-center gap-4">
              <Avatar className="w-12 h-12 border-2 border-primary/30">
                <AvatarImage src={user.photoURL || ''} />
                <AvatarFallback className="bg-primary/20 text-primary font-black">
                  {user.email?.[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <p className="font-bold text-sm flex items-center gap-1">
                  {profile?.displayName || 'مستكشف EASY'}
                  {profile?.status === 'admin' && <Crown className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                </p>
                <div className="flex gap-2">
                  <Badge className="bg-primary/10 text-primary border-none text-[10px] h-4 py-0 font-black">LVL {profile?.level || 1}</Badge>
                  <Badge className="bg-white/5 text-white/40 border-none text-[10px] h-4 py-0 font-black">{profile?.xp || 0} XP</Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 md:gap-2">
              {[
                { type: 'themes', icon: Palette, color: 'text-primary' },
                { type: 'leaderboard', icon: Trophy, color: 'text-amber-500' },
                { type: 'favorites', icon: Heart, color: 'text-rose-500' },
                { type: 'errors', icon: History, color: 'text-blue-500' },
              ].map((btn) => (
                <Button 
                  key={btn.type}
                  onClick={() => openOverlay(btn.type as any)} 
                  variant="ghost" 
                  size="icon" 
                  className={cn("w-10 h-10 md:w-12 md:h-12 rounded-xl hover:bg-white/5", btn.color)}
                >
                  <btn.icon className="w-5 h-5 md:w-6 md:h-6" />
                </Button>
              ))}
              
              {profile?.status === 'admin' && (
                <Button onClick={() => window.location.href = '/admin'} variant="ghost" size="icon" className="w-10 h-10 md:w-12 md:h-12 rounded-xl hover:bg-white/5 text-emerald-500">
                  <LayoutDashboard className="w-5 h-5 md:w-6 md:h-6" />
                </Button>
              )}
              
              <Button onClick={() => signOut(auth)} variant="ghost" size="icon" className="w-10 h-10 md:w-12 md:h-12 rounded-xl hover:bg-destructive/10 text-destructive">
                <LogOut className="w-5 h-5 md:w-6 md:h-6" />
              </Button>
            </div>
          </div>
        </nav>
      )}

      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-32 md:pt-48 pb-20 max-w-7xl relative z-10 text-center space-y-8 md:space-y-12">
        <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full glass-card border-primary/20 text-primary font-black text-sm md:text-base animate-float-soft">
          <Zap className="w-4 h-4 fill-primary" /> EASY PREP ELITE
        </div>
        
        <div className="space-y-4">
          <h1 className="text-7xl sm:text-8xl md:text-[12rem] lg:text-[16rem] text-easy-premium animate-in fade-in zoom-in duration-1000">
            EASY
          </h1>
          <p className="text-xl md:text-3xl font-black text-white/40 max-w-2xl mx-auto tracking-wide">
            تغلّب على نفسك <span className="text-white glow-text">كل يوم</span> 💎
          </p>
        </div>

        <div className="max-w-2xl mx-auto pt-8">
          <div className="relative group">
            <Search className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-white/10 group-focus-within:text-primary transition-all" />
            <Input 
              placeholder="ابحث عن نموذج بالاسم أو الرقم..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-16 md:h-20 w-full rounded-full bg-white/[0.02] border-white/10 pr-16 text-xl md:text-2xl font-bold transition-all focus:border-primary/40 focus:scale-[1.01] backdrop-blur-xl"
            />
          </div>
        </div>
      </div>

      {/* Sections Grid Responsive */}
      <section className="container mx-auto px-4 md:px-8 pb-32 grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10">
        {filteredSections.map((section) => (
          <Card key={section.firebaseId || section.id} className="group glass-card rounded-[40px] p-8 md:p-10 relative overflow-hidden border-white/5 hover:border-primary/30">
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
              <Zap className="w-32 h-32 text-primary" />
            </div>
            
            <div className="flex flex-col sm:flex-row justify-between items-center gap-8 relative z-10">
              <div className="text-center sm:text-right flex-1 space-y-4">
                <div className="flex flex-wrap justify-center sm:justify-start items-center gap-3">
                  <Badge className="bg-primary/20 text-primary px-4 py-1 rounded-lg font-black text-sm border-none">قسم {section.id}</Badge>
                  {section.id > 218 && <Badge className="bg-amber-500/20 text-amber-500 px-3 py-1 rounded-lg font-black border-none animate-pulse">جديد ✨</Badge>}
                </div>
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-white group-hover:text-primary transition-colors">{section.title}</h2>
                <div className="flex justify-center sm:justify-start items-center gap-6 text-white/30 font-bold text-sm md:text-base">
                  <span className="flex items-center gap-2"><Zap className="w-4 h-4" /> {section.questions?.length || 0} سؤال</span>
                  <span className="flex items-center gap-2"><History className="w-4 h-4" /> {section.duration} دقيقة</span>
                </div>
              </div>
              <Button 
                onClick={() => { setSelectedSection(section); setActiveView('practice'); }} 
                className="w-full sm:w-auto h-20 px-10 rounded-[25px] text-2xl font-black bg-primary text-white hover:scale-105 transition-all shadow-[0_15px_40px_rgba(var(--primary),0.3)] active:scale-95 group/btn"
              >
                ابدأ <ArrowRight className="mr-2 w-8 h-8 transition-transform group-hover/btn:translate-x-1" />
              </Button>
            </div>
          </Card>
        ))}
        {filteredSections.length === 0 && (
          <div className="col-span-full text-center py-20 glass-card rounded-[40px] border-dashed">
            <Search className="w-16 h-16 text-white/10 mx-auto mb-4" />
            <p className="text-2xl font-black text-white/20">لم نجد أي نموذج مطابق للبحث</p>
          </div>
        )}
      </section>

      {/* Dynamic Overlays System */}
      {activeOverlay && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setActiveOverlay(null)} />
          <Card className="w-full max-w-4xl max-h-[85vh] overflow-hidden glass-card rounded-[40px] relative z-10 flex flex-col border-primary/20">
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-3xl md:text-4xl font-black text-white flex items-center gap-4">
                {activeOverlay === 'leaderboard' && <Trophy className="w-8 h-8 text-amber-500" />}
                {activeOverlay === 'errors' && <History className="w-8 h-8 text-blue-500" />}
                {activeOverlay === 'themes' && <Palette className="w-8 h-8 text-primary" />}
                {activeOverlay === 'favorites' && <Heart className="w-8 h-8 text-rose-500" />}
                {activeOverlay === 'leaderboard' ? "نخبة EASY" : 
                 activeOverlay === 'errors' ? "سجل الأخطاء" : 
                 activeOverlay === 'themes' ? "مركز الثيمات" : "المفضلة"}
              </h2>
              <Button variant="ghost" size="icon" className="rounded-full w-12 h-12 hover:bg-white/10" onClick={() => setActiveOverlay(null)}>
                <X className="w-8 h-8" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
              {activeOverlay === 'themes' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                  {THEMES.map((t) => (
                    <button
                      key={t.name}
                      onClick={() => changeTheme(t.value)}
                      className="group p-6 rounded-3xl glass-card flex flex-col items-center gap-4 transition-all hover:scale-105 border-transparent"
                      style={{ borderColor: t.value === profile?.theme ? t.color : 'transparent' }}
                    >
                      <div className="w-16 h-16 rounded-full shadow-2xl" style={{ backgroundColor: t.color }} />
                      <span className="text-lg font-black group-hover:text-primary">{t.name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {overlayData.length === 0 ? (
                    <div className="text-center py-20 opacity-20 text-2xl font-black">لا توجد بيانات متاحة حالياً</div>
                  ) : (
                    overlayData.map((item, idx) => (
                      <div key={idx} className="p-6 rounded-3xl glass-card flex justify-between items-center group border-white/5">
                        <div className="flex items-center gap-6">
                          {activeOverlay === 'leaderboard' && (
                            <div className={cn(
                              "w-12 h-12 rounded-xl flex items-center justify-center font-black text-2xl",
                              idx === 0 ? "bg-amber-500 text-black" : "bg-white/5"
                            )}>{idx + 1}</div>
                          )}
                          <div>
                            <p className="font-black text-xl text-white group-hover:text-primary transition-colors">
                              {activeOverlay === 'leaderboard' ? item.displayName : (item.questionData?.question || item.question || 'سؤال')}
                            </p>
                            <p className="text-white/30 font-bold text-sm mt-1">
                              {activeOverlay === 'leaderboard' ? `@${item.email?.split('@')[0]}` : (item.questionData?.sectionTitle || 'سؤال محفوظ')}
                            </p>
                          </div>
                        </div>
                        <div className="text-left shrink-0">
                          <p className="text-xl md:text-2xl font-black text-primary">
                            {activeOverlay === 'leaderboard' ? `${item.xp || 0} XP` : 
                             activeOverlay === 'errors' ? `${item.count || 1} أخطاء` : "★"}
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

      {/* Footer Signature Clean */}
      <footer className="text-center py-20 border-t border-white/5 mt-20 space-y-4 bg-black/40 backdrop-blur-3xl">
        <p className="text-3xl md:text-4xl tracking-[0.4em] uppercase font-black opacity-10 hover:opacity-100 transition-all duration-700 cursor-default">
          DR.MAHMOUD ABD EL RAZEK
        </p>
        <p className="text-primary font-black text-sm opacity-40">Elite Training System &copy; 2024</p>
      </footer>
    </main>
  );
}
