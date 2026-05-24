
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Section, Question, sections as staticSections } from '@/lib/practice-data';
import { 
  getSectionsFromDb, 
  getUserProfile, 
  getLeaderboard, 
  getErrorLogs,
  deleteErrorLog
} from '@/lib/db-service';
import PracticeSession from '@/components/PracticeSession';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
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
  Heart,
  Trash2,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { 
  onAuthStateChanged, 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
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
    const safetyTimer = setTimeout(() => setIsLoading(false), 2500);

    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // الاستماع للتغييرات اللحظية في البروفايل (XP و Level)
        const userRef = doc(db, "userProfiles", u.uid);
        const unsubProfile = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const p = docSnap.data();
            setProfile({ id: docSnap.id, ...p });
            if (p.theme) {
              document.documentElement.style.setProperty('--primary', p.theme);
              document.documentElement.style.setProperty('--ring', p.theme);
            }
          }
        });
      }
      setIsLoading(false);
    });

    getSectionsFromDb().then(data => {
      setSections(data);
    });

    return () => {
      clearTimeout(safetyTimer);
      unsubscribeAuth();
    };
  }, []);

  const changeTheme = async (themeValue: string) => {
    document.documentElement.style.setProperty('--primary', themeValue);
    document.documentElement.style.setProperty('--ring', themeValue);
    if (user) {
      const userRef = doc(db, "userProfiles", user.uid);
      await updateDoc(userRef, { theme: themeValue });
    }
  };

  const filteredSections = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return sections;
    return sections.filter(s => 
      s.title.toLowerCase().includes(q) || s.id.toString().includes(q)
    );
  }, [searchQuery, sections]);

  // منطق علامة "جديد" - تظهر إذا كان القسم مضافاً قبل أقل من 72 ساعة
  const isNewSection = (section: Section) => {
    if (!section.createdAt) return false;
    const createdAt = section.createdAt.toDate ? section.createdAt.toDate() : new Date(section.createdAt);
    const diffInHours = (new Date().getTime() - createdAt.getTime()) / (1000 * 3600);
    return diffInHours < 72;
  };

  const xpProgress = useMemo(() => {
    if (!profile?.xp) return 0;
    return (profile.xp % 500) / 5; // التقدم للمستوى التالي (كل 500 نقطة)
  }, [profile?.xp]);

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
      } else if (type === 'favorites' && user) {
        setOverlayData(profile?.favorites || []);
      }
    } catch (e) { console.error(e); }
  };

  if (!hasMounted) return null;

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-[500] bg-mesh">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <h2 className="text-xl font-black text-white tracking-widest animate-pulse uppercase">Easy Prep Master</h2>
      </div>
    );
  }

  if (activeView === 'practice' && selectedSection) {
    return <PracticeSession section={selectedSection} onExit={() => setActiveView('landing')} />;
  }

  return (
    <main className="min-h-screen bg-background text-white flex flex-col relative overflow-x-hidden bg-mesh" dir="rtl">
      
      {/* Auth Screen */}
      {!user && (
        <div className="fixed inset-0 z-[400] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-10 glass-card rounded-[40px] border-primary/20">
            <div className="text-center mb-10 space-y-2">
              <h1 className="text-7xl md:text-8xl text-easy-premium animate-float-soft">EASY</h1>
              <p className="text-sm text-primary font-black tracking-[0.3em] uppercase opacity-60">Elite Training System</p>
            </div>
            <form onSubmit={handleAuth} className="space-y-4">
              <Input type="email" placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} className="h-14 rounded-2xl bg-white/5 border-white/10 text-lg px-6" />
              <Input type="password" placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} className="h-14 rounded-2xl bg-white/5 border-white/10 text-lg px-6" />
              <Button type="submit" disabled={isAuthLoading} className="w-full h-16 rounded-2xl bg-primary text-white font-black text-xl hover:scale-105 transition-all">
                {isAuthLoading ? <Loader2 className="animate-spin" /> : (authMode === 'login' ? "دخول 🚀" : "انضم الآن ✨")}
              </Button>
            </form>
            <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="mt-8 w-full text-white/30 font-bold hover:text-white transition-colors text-sm">
              {authMode === 'login' ? "لا تملك حساباً؟ سجل هنا" : "لديك حساب؟ سجل دخولك"}
            </button>
          </Card>
        </div>
      )}

      {/* Header Navigation */}
      {user && (
        <nav className="fixed top-0 left-0 w-full z-[100] px-4 md:px-8 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between p-3 glass-card rounded-[30px] border-white/10">
            <div className="flex items-center gap-4 flex-1">
              <Avatar className="w-14 h-14 border-2 border-primary/30 shadow-xl shadow-primary/10">
                <AvatarImage src={user.photoURL || ''} />
                <AvatarFallback className="bg-primary/20 text-primary font-black text-xl">{user.email?.[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="space-y-2 w-full max-w-xs">
                <div className="flex items-center justify-between">
                  <p className="font-black text-lg flex items-center gap-2 text-white/90">
                    {profile?.displayName || 'مستكشف EASY'}
                    {profile?.status === 'admin' && <Crown className="w-5 h-5 text-yellow-500 drop-shadow-glow" />}
                  </p>
                  <Badge className="bg-primary text-white font-black text-xs px-3 py-0.5 rounded-lg border-none shadow-glow">LVL {profile?.level || 1}</Badge>
                </div>
                {/* XP Progress Bar Improved */}
                <div className="relative pt-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">{profile?.xp || 0} XP</span>
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{Math.round(xpProgress)}%</span>
                  </div>
                  <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-[1px]">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(var(--primary),0.5)]"
                      style={{ width: `${xpProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3 mr-4">
              {[
                { type: 'themes', icon: Palette, color: 'text-primary' },
                { type: 'leaderboard', icon: Trophy, color: 'text-amber-500' },
                { type: 'favorites', icon: Heart, color: 'text-rose-500' },
                { type: 'errors', icon: History, color: 'text-blue-500' },
              ].map((btn) => (
                <Button key={btn.type} onClick={() => openOverlay(btn.type as any)} variant="ghost" size="icon" className={cn("w-11 h-11 md:w-12 md:h-12 rounded-2xl hover:bg-white/5", btn.color)}>
                  <btn.icon className="w-6 h-6" />
                </Button>
              ))}
              {profile?.status === 'admin' && (
                <Button onClick={() => window.location.href = '/admin'} variant="ghost" size="icon" className="w-11 h-11 md:w-12 md:h-12 rounded-2xl hover:bg-white/5 text-emerald-500">
                  <LayoutDashboard className="w-6 h-6" />
                </Button>
              )}
              <Button onClick={() => signOut(auth)} variant="ghost" size="icon" className="w-11 h-11 md:w-12 md:h-12 rounded-2xl hover:bg-destructive/10 text-destructive">
                <LogOut className="w-6 h-6" />
              </Button>
            </div>
          </div>
        </nav>
      )}

      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-32 md:pt-48 pb-10 max-w-7xl relative z-10 text-center space-y-10">
        <div className="inline-flex items-center gap-3 px-8 py-3 rounded-full glass-card border-primary/20 text-primary font-black text-sm animate-float-soft shadow-xl shadow-primary/5">
          <Zap className="w-5 h-5 fill-primary" /> EASY PREP ELITE V2
        </div>
        <div className="space-y-4">
          <h1 className="text-8xl sm:text-9xl md:text-[15rem] text-easy-premium animate-in fade-in zoom-in duration-1000">EASY</h1>
          <p className="text-2xl md:text-4xl font-black text-white/40 max-w-3xl mx-auto tracking-wide leading-relaxed">تغلّب على نفسك <span className="text-white glow-text italic">كل يوم</span> 💎</p>
        </div>
        <div className="max-w-2xl mx-auto pt-6 relative group">
          <Search className="absolute right-8 top-1/2 -translate-y-1/2 w-7 h-7 text-white/10 group-focus-within:text-primary transition-all" />
          <Input placeholder="ابحث عن نموذج..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-20 md:h-24 w-full rounded-full bg-white/[0.02] border-white/10 pr-20 text-2xl font-black transition-all focus:border-primary/40 focus:scale-[1.01] shadow-2xl" />
        </div>
      </div>

      {/* Sections Grid */}
      <section className="container mx-auto px-4 md:px-8 pb-32 grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {filteredSections.map((section) => (
          <Card key={section.firebaseId || section.id} className="group glass-card rounded-[50px] p-10 md:p-12 relative overflow-hidden border-white/5 hover:border-primary/30 shadow-2xl">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-10 relative z-10">
              <div className="text-center sm:text-right flex-1 space-y-6">
                <div className="flex flex-wrap justify-center sm:justify-start items-center gap-4">
                  <Badge className="bg-primary/20 text-primary px-5 py-1.5 rounded-xl font-black text-sm border-none shadow-sm">قسم {section.id}</Badge>
                  {isNewSection(section) && (
                    <Badge className="bg-amber-500/20 text-amber-500 px-5 py-1.5 rounded-xl font-black border-none animate-pulse shadow-amber-500/10 shadow-lg flex items-center gap-2">
                      <Sparkles className="w-4 h-4" /> جديد ✨
                    </Badge>
                  )}
                </div>
                <h2 className="text-3xl md:text-5xl font-black text-white group-hover:text-primary transition-colors duration-500">{section.title}</h2>
                <div className="flex justify-center sm:justify-start items-center gap-8 text-white/30 font-bold text-lg">
                  <span className="flex items-center gap-3"><Zap className="w-5 h-5 text-primary/40" /> {section.questions?.length || 0} سؤال</span>
                  <span className="flex items-center gap-3"><History className="w-5 h-5 text-blue-500/40" /> {section.duration} دقيقة</span>
                </div>
              </div>
              <Button onClick={() => { setSelectedSection(section); setActiveView('practice'); }} className="w-full sm:w-auto h-24 px-12 rounded-[30px] text-3xl font-black bg-primary text-white hover:scale-105 transition-all shadow-2xl group/btn active:scale-95">
                ابدأ <ArrowRight className="mr-3 w-10 h-10 transition-transform group-hover/btn:translate-x-2" />
              </Button>
            </div>
          </Card>
        ))}
      </section>

      {/* Overlays */}
      {activeOverlay && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setActiveOverlay(null)} />
          <Card className="w-full max-w-4xl max-h-[85vh] overflow-hidden glass-card rounded-[50px] relative z-10 flex flex-col border-primary/20 shadow-primary/10">
            <div className="p-10 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-4xl font-black text-white flex items-center gap-5">
                {activeOverlay === 'leaderboard' && <Trophy className="w-10 h-10 text-amber-500 shadow-glow" />}
                {activeOverlay === 'errors' && <History className="w-10 h-10 text-blue-500 shadow-glow" />}
                {activeOverlay === 'themes' && <Palette className="w-10 h-10 text-primary shadow-glow" />}
                {activeOverlay === 'favorites' && <Heart className="w-10 h-10 text-rose-500 shadow-glow" />}
                {activeOverlay === 'leaderboard' ? "نخبة EASY" : activeOverlay === 'errors' ? "سجل الأخطاء" : activeOverlay === 'themes' ? "مركز الثيمات" : "المفضلة"}
              </h2>
              <Button variant="ghost" size="icon" className="rounded-full w-14 h-14 hover:bg-white/10" onClick={() => setActiveOverlay(null)}><X className="w-10 h-10" /></Button>
            </div>
            
            <ScrollArea className="flex-1 p-10">
              {activeOverlay === 'themes' ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
                  {THEMES.map((t) => (
                    <button key={t.name} onClick={() => changeTheme(t.value)} className={cn("group p-8 rounded-[35px] glass-card flex flex-col items-center gap-6 transition-all hover:scale-105 border-transparent", profile?.theme === t.value && "border-primary shadow-glow")}>
                      <div className="w-20 h-20 rounded-full shadow-2xl border-4 border-white/10" style={{ backgroundColor: t.color }} />
                      <span className="text-xl font-black group-hover:text-primary">{t.name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-8">
                  {overlayData.length === 0 ? (
                    <div className="text-center py-20 opacity-20 text-3xl font-black">لا توجد بيانات متاحة</div>
                  ) : (
                    overlayData.map((item, idx) => (
                      <div key={idx}>
                        {activeOverlay === 'leaderboard' ? (
                          <div className="p-8 rounded-[35px] glass-card flex justify-between items-center group border-white/5 hover:border-primary/20 transition-all">
                            <div className="flex items-center gap-8">
                              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center font-black text-3xl", idx === 0 ? "bg-amber-500 text-black shadow-glow" : idx === 1 ? "bg-slate-400 text-black" : idx === 2 ? "bg-amber-700 text-white" : "bg-white/5")}>{idx + 1}</div>
                              <div>
                                <p className="font-black text-2xl text-white group-hover:text-primary transition-colors">{item.displayName}</p>
                                <p className="text-white/30 font-bold text-base uppercase tracking-widest">LVL {item.level || 1}</p>
                              </div>
                            </div>
                            <p className="text-3xl font-black text-primary">{item.xp || 0} XP</p>
                          </div>
                        ) : (
                          <Card className="p-10 glass-card border-white/5 rounded-[40px] space-y-8">
                             <div className="flex justify-between items-start gap-6">
                               <div className="space-y-3">
                                  <Badge className="bg-primary/10 text-primary border-none text-xs px-4 py-1 rounded-lg uppercase font-black">{item.questionData?.sectionTitle || "مراجعة"}</Badge>
                                  <h3 className="text-2xl md:text-3xl font-black leading-tight text-white">{item.questionData?.question || item.question}</h3>
                               </div>
                               {activeOverlay === 'errors' && (
                                 <Button variant="ghost" size="icon" onClick={() => deleteErrorLog(item.id)} className="text-destructive hover:bg-destructive/10 w-12 h-12"><Trash2 className="w-6 h-6" /></Button>
                               )}
                             </div>
                             
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {item.questionData?.options?.map((opt: string, oi: number) => {
                                  const isCorrect = opt === item.questionData.correct;
                                  const isUserAns = opt === item.userAnswer;
                                  return (
                                    <div key={oi} className={cn(
                                      "p-6 rounded-[25px] border-2 font-black text-lg transition-all",
                                      isCorrect ? "bg-green-500/10 border-green-500/30 text-green-500" :
                                      isUserAns ? "bg-red-500/10 border-red-500/30 text-red-500" :
                                      "bg-white/5 border-white/5 text-white/30"
                                    )}>
                                      <span className="opacity-30 ml-4">{['أ', 'ب', 'ج', 'د'][oi]}.</span> {opt}
                                    </div>
                                  );
                                })}
                             </div>
                          </Card>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </ScrollArea>
          </Card>
        </div>
      )}

      <footer className="text-center py-24 border-t border-white/5 mt-20 space-y-6 bg-black/40 backdrop-blur-3xl">
        <p className="text-4xl tracking-[0.6em] uppercase font-black opacity-10">DR.MAHMOUD ABD EL RAZEK</p>
        <div className="flex justify-center gap-8 text-white/20 font-black text-sm uppercase tracking-widest">
          <span>Reliable Training</span>
          <span>•</span>
          <span>Elite Performance</span>
          <span>•</span>
          <span>Smart Solutions</span>
        </div>
        <p className="text-primary font-black text-sm opacity-40 uppercase tracking-[0.3em]">Easy Prep System &copy; 2024</p>
      </footer>
    </main>
  );
}
