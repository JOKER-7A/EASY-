'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Section } from '@/lib/practice-data';
import { 
  getSectionsFromDb, 
  getLeaderboard, 
  getErrorLogs,
  deleteErrorLog,
  getUserProfile,
  updateOnboardingData,
  getGlobalSettings
} from '@/lib/db-service';
import PracticeSession from '@/components/PracticeSession';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Zap, Search, Trophy, History, X, Loader2, Palette, LogOut, Heart, Trash2, ShieldCheck, Ban, Clock, UserCheck, Moon, Sun, Monitor, Check, CheckCircle2, XCircle
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { 
  onAuthStateChanged, User as FirebaseUser, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut 
} from 'firebase/auth';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const RoleBadgeUI = ({ role }: { role: string }) => {
  const badges: Record<string, React.ReactNode> = {
    'rootOwner': (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]" title="Root Owner">
        <span className="text-amber-500 drop-shadow-sm text-sm">👑</span>
        <span className="text-[10px] text-amber-500/60 font-black tracking-tighter">⚔️⚔️</span>
      </span>
    ),
    'owner': (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-amber-500/5 border border-amber-500/10" title="Owner">
        <span className="text-amber-500 text-sm">👑</span>
      </span>
    ),
    'superAdmin': (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20" title="Super Admin">
        <span className="text-blue-500 text-sm">🛡️</span>
        <span className="text-[10px] text-blue-500/60 font-black">⚔️</span>
      </span>
    ),
    'admin': (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-blue-500/5 border border-blue-500/10" title="Admin">
        <span className="text-blue-500 text-sm">🛡️</span>
      </span>
    ),
    'editor': (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-emerald-500/5 border border-emerald-500/10" title="Editor">
        <span className="text-emerald-500 text-sm">✏️</span>
      </span>
    ),
    'helper': (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-purple-500/5 border border-purple-500/10" title="Helper">
        <span className="text-purple-500 text-sm">🧩</span>
      </span>
    ),
  };
  return badges[role] ? <span className="mr-1 inline-block select-none">{badges[role]}</span> : null;
};

const THEME_COLORS = [
  { name: 'Default', value: '262.1 83.3% 57.8%' },
  { name: 'Emerald', value: '142.1 76.2% 36.3%' },
  { name: 'Rose', value: '346.8 77.2% 49.8%' },
  { name: 'Amber', value: '37.9 92.1% 50.2%' },
  { name: 'Sky', value: '199.1 88.7% 48.4%' },
  { name: 'Indigo', value: '226.2 70% 55.5%' },
];

export default function Home() {
  const [hasMounted, setHasMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('auto');
  const [primaryColor, setPrimaryColor] = useState('262.1 83.3% 57.8%');
  const [activeView, setActiveView] = useState<'landing' | 'practice'>('landing');
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [activeOverlay, setActiveOverlay] = useState<'leaderboard' | 'errors' | 'themes' | 'favorites' | null>(null);
  const [overlayData, setOverlayData] = useState<any[]>([]);
  
  const [onboardingName, setOnboardingName] = useState('');
  const [onboardingPhone, setOnboardingPhone] = useState('');
  const [isOnboardingSubmitting, setIsOnboardingSubmitting] = useState(false);

  const { toast } = useToast();

  const applyTheme = useCallback((t: 'light' | 'dark' | 'auto', color: string) => {
    const root = document.documentElement;
    root.style.setProperty('--primary', color);
    
    if (t === 'auto') {
      const isDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
      isDark ? root.classList.add('dark') : root.classList.remove('dark');
    } else if (t === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    setHasMounted(true);
    const savedTheme = (localStorage.getItem('theme') as 'light' | 'dark' | 'auto') || 'auto';
    const savedColor = localStorage.getItem('primaryColor') || '262.1 83.3% 57.8%';
    setTheme(savedTheme);
    setPrimaryColor(savedColor);
    applyTheme(savedTheme, savedColor);

    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userRef = doc(db, "userProfiles", u.uid);
        const unsubProfile = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const updatedProfile = { id: docSnap.id, ...data };
            setProfile(updatedProfile);
            
            if (activeOverlay === 'favorites') {
              setOverlayData(data.favorites || []);
            }
            
            if (data.theme && data.theme !== primaryColor) {
               setPrimaryColor(data.theme);
               applyTheme(theme, data.theme);
            }
          }
        });
        
        setIsLoading(false);
        return () => unsubProfile();
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    });
    
    getSectionsFromDb().then((data) => {
      setSections(data);
    });
    
    return () => unsubAuth();
  }, [applyTheme, primaryColor, theme]);

  const handleThemeChange = (t: 'light' | 'dark' | 'auto') => {
    setTheme(t);
    localStorage.setItem('theme', t);
    applyTheme(t, primaryColor);
  };

  const handleColorChange = async (color: string) => {
    setPrimaryColor(color);
    localStorage.setItem('primaryColor', color);
    applyTheme(theme, color);
    if (user) {
      const userRef = doc(db, "userProfiles", user.uid);
      updateDoc(userRef, { theme: color });
    }
    toast({ title: "تم تحديث اللون بنجاح ✨" });
  };

  const filteredSections = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return sections;
    return sections.filter(s => {
      const title = s.title || '';
      const id = s.id ? s.id.toString() : '';
      return title.toLowerCase().includes(q) || id.includes(q);
    });
  }, [searchQuery, sections]);

  const levelProgress = useMemo(() => {
    if (!profile) return 0;
    const currentXp = profile.xp || 0;
    return ((currentXp % 500) / 500) * 100;
  }, [profile]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsAuthLoading(true);
    try {
      if (authMode === 'login') await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      else await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    } catch (error: any) {
      toast({ title: "فشل العملية", description: error.message, variant: "destructive" });
    } finally { setIsAuthLoading(false); }
  };

  const handleOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardingName.trim() || !onboardingPhone.trim() || !user) return;
    setIsOnboardingSubmitting(true);
    try {
      const success = await updateOnboardingData(user.uid, onboardingName, onboardingPhone);
      if (success) toast({ title: "تم إرسال الطلب بنجاح ✅" });
    } catch (e) { toast({ title: "فشلت العملية", variant: "destructive" }); }
    finally { setIsOnboardingSubmitting(false); }
  };

  const openOverlay = async (type: 'leaderboard' | 'errors' | 'themes' | 'favorites') => {
    setActiveOverlay(type);
    setOverlayData([]);
    if (type === 'themes') return;
    try {
      if (type === 'leaderboard') setOverlayData(await getLeaderboard());
      else if (type === 'errors' && user) setOverlayData(await getErrorLogs(user.uid));
      else if (type === 'favorites' && profile) setOverlayData(profile.favorites || []);
    } catch (e) { console.error("Overlay fetch error:", e); }
  };

  const isAdmin = useMemo(() => {
    if (!profile) return false;
    return ['rootOwner', 'owner', 'superAdmin', 'admin', 'editor', 'helper'].includes(profile.role);
  }, [profile]);

  if (!hasMounted) return null;

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="text-7xl font-black text-primary animate-pulse tracking-tighter">EASY</div>
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
          <p className="text-[10px] font-black uppercase tracking-widest opacity-20">يتم تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-mesh opacity-10" />
        <Card className="w-full max-w-md p-10 glass-card rounded-[40px] border-primary/20 space-y-8 relative z-10">
          <div className="text-center">
            <h1 className="text-7xl text-easy-premium">EASY</h1>
            <p className="text-xs font-black opacity-30 uppercase tracking-[0.3em] mt-4">Prep Master System</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            <Input type="email" placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} className="h-14 text-center rounded-2xl bg-muted/50 border-none" />
            <Input type="password" placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} className="h-14 text-center rounded-2xl bg-muted/50 border-none" />
            <Button type="submit" disabled={isAuthLoading} className="w-full h-14 rounded-2xl bg-primary font-black text-lg shadow-xl shadow-primary/20 transition-all active:scale-95">
              {isAuthLoading ? <Loader2 className="animate-spin" /> : (authMode === 'login' ? "دخول للمنصة" : "إنشاء حساب جديد")}
            </Button>
          </form>
          <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="w-full text-xs font-black opacity-40 hover:opacity-100 transition-opacity uppercase tracking-widest">
            {authMode === 'login' ? "ليس لديك حساب؟ اشترك الآن" : "لديك حساب؟ سجل الدخول"}
          </button>
        </Card>
      </main>
    );
  }

  if (profile?.status === 'onboarding') {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-mesh opacity-10" />
        <Card className="w-full max-w-md p-10 glass-card rounded-[40px] border-primary/20 space-y-10 relative z-10">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-primary/10 rounded-[30px] flex items-center justify-center mx-auto ring-4 ring-primary/10">
              <UserCheck className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-3xl font-black">أهلاً بك في EASY</h2>
            <p className="text-sm font-bold opacity-50">نحتاج لبعض البيانات الأساسية لخدمتك بشكل أفضل</p>
          </div>
          <form onSubmit={handleOnboarding} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-primary uppercase mr-2">الاسم الكامل</label>
              <Input placeholder="الاسم كما في الهوية" value={onboardingName} onChange={(e) => setOnboardingName(e.target.value)} className="h-14 rounded-2xl bg-muted/50 border-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-primary uppercase mr-2">رقام الواتساب</label>
              <Input placeholder="05xxxxxxxx" value={onboardingPhone} onChange={(e) => setOnboardingPhone(e.target.value)} className="h-14 rounded-2xl bg-muted/50 border-none" />
            </div>
            <Button type="submit" disabled={isOnboardingSubmitting} className="w-full h-14 rounded-2xl bg-primary font-black text-lg shadow-xl shadow-primary/20">
              {isOnboardingSubmitting ? <Loader2 className="animate-spin" /> : "إكمال التسجيل ✨"}
            </Button>
          </form>
          <Button onClick={() => signOut(auth)} variant="ghost" className="w-full text-rose-500 font-black text-xs">خروج</Button>
        </Card>
      </main>
    );
  }

  if (profile?.status === 'pending') {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-12 glass-card rounded-[45px] text-center space-y-10">
          <div className="w-24 h-24 bg-amber-500/10 rounded-[40px] flex items-center justify-center mx-auto animate-float-soft ring-4 ring-amber-500/10">
            <Clock className="w-12 h-12 text-amber-500" />
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl font-black italic">طلبك قيد المراجعة...</h2>
            <p className="text-white/40 font-bold leading-relaxed">
              يا {profile.displayName}، طلبك وصل للدكتور محمود وسيتم تفعيل حسابك قريباً جداً.
            </p>
          </div>
          <div className="pt-6">
             <Button onClick={() => signOut(auth)} variant="outline" className="w-full h-14 rounded-2xl font-black border-white/10 hover:bg-white/5">تسجيل الخروج</Button>
          </div>
        </Card>
      </main>
    );
  }

  if (profile?.status === 'rejected') {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-12 glass-card rounded-[45px] text-center border-rose-500/20 space-y-10">
          <div className="w-24 h-24 bg-rose-500/10 rounded-[40px] flex items-center justify-center mx-auto">
            <Ban className="w-12 h-12 text-rose-500" />
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl font-black">عذراً، تم رفض الطلب ⛔</h2>
            <p className="text-white/40 font-bold">يمكنك التواصل مع الإدارة للاستفسار أو إعادة المحاولة لاحقاً.</p>
          </div>
          <div className="flex flex-col gap-3">
             <Button onClick={() => updateDoc(doc(db, "userProfiles", user.uid), { status: 'onboarding' })} className="h-14 rounded-2xl bg-rose-500 font-black">إعادة التقديم</Button>
             <Button onClick={() => signOut(auth)} variant="ghost" className="h-14 font-black opacity-50">تسجيل الخروج</Button>
          </div>
        </Card>
      </main>
    );
  }

  if (activeView === 'practice' && selectedSection) {
    return <PracticeSession section={selectedSection} onExit={() => setActiveView('landing')} />;
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col" dir="rtl">
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="hidden sm:flex flex-col items-start">
                <div className="flex items-center gap-2">
                   <p className="font-black text-sm md:text-base">{profile?.displayName || 'مستكشف EASY'}</p>
                   <RoleBadgeUI role={profile?.role || 'user'} />
                </div>
                <div className="flex items-center gap-3 w-full mt-1">
                   <div className="flex-1 bg-muted/50 h-2 rounded-full overflow-hidden w-24">
                      <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${levelProgress}%` }} />
                   </div>
                   <span className="text-[10px] font-black text-primary uppercase">LVL {profile?.level || 1}</span>
                </div>
             </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <Button onClick={() => openOverlay('leaderboard')} variant="ghost" size="icon" className="text-amber-500 hover:bg-amber-500/10 rounded-xl" title="لوحة الصدارة"><Trophy className="w-5 h-5" /></Button>
            <Button onClick={() => openOverlay('favorites')} variant="ghost" size="icon" className="text-rose-500 hover:bg-rose-500/10 rounded-xl" title="المفضلة"><Heart className="w-5 h-5" /></Button>
            <Button onClick={() => openOverlay('errors')} variant="ghost" size="icon" className="text-blue-500 hover:bg-blue-500/10 rounded-xl" title="سجل الأخطاء"><History className="w-5 h-5" /></Button>
            <Button onClick={() => openOverlay('themes')} variant="ghost" size="icon" className="text-purple-500 hover:bg-purple-500/10 rounded-xl" title="تخصيص الألوان"><Palette className="w-5 h-5" /></Button>
            
            <div className="h-6 w-[1px] bg-border mx-2" />
            
            <Button onClick={() => handleThemeChange(theme === 'dark' ? 'light' : 'dark')} variant="ghost" size="icon" className="rounded-xl">
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>

            {isAdmin && (
              <Button onClick={() => window.location.href = '/admin'} variant="ghost" size="icon" className="text-primary hover:bg-primary/10 rounded-xl"><ShieldCheck className="w-5 h-5" /></Button>
            )}
            <Button onClick={() => signOut(auth)} variant="ghost" size="icon" className="text-rose-500 hover:bg-rose-500/10 rounded-xl"><LogOut className="w-5 h-5" /></Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 pt-20 pb-16 text-center space-y-10 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="space-y-4 animate-in fade-in slide-in-from-top-10 duration-1000">
           <h1 className="text-7xl md:text-9xl text-easy-premium tracking-tighter">EASY</h1>
           <p className="text-lg md:text-2xl font-black text-foreground/40 italic">أهم شيء الفهم 💡</p>
        </div>
        
        <div className="max-w-xl mx-auto pt-10 relative group">
          <Search className="absolute right-6 top-1/2 -translate-y-1/2 text-primary w-5 h-5 group-focus-within:scale-110 transition-transform" />
          <Input 
            placeholder="ابحث عن نموذج تدريب..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="h-16 pr-14 rounded-[25px] bg-muted/30 border-none shadow-2xl shadow-primary/5 font-bold text-lg focus:bg-muted/50 transition-all" 
          />
        </div>
      </div>

      <section className="container mx-auto px-4 pb-32 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredSections.map((section) => (
          <Card key={section.firebaseId || section.id} className="group glass-card rounded-[40px] p-8 border-transparent hover:border-primary/30 transition-all duration-500 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex justify-between items-start mb-8">
              <Badge variant="secondary" className="bg-primary/10 text-primary font-black px-4 py-1.5 rounded-2xl border-none">#{section.id}</Badge>
              <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest opacity-30">
                <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> {section.questions?.length || 0}</span>
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {section.duration} MIN</span>
              </div>
            </div>
            <h3 className="text-2xl md:text-3xl font-black mb-8 leading-tight group-hover:text-primary transition-colors">{section.title}</h3>
            <Button 
              onClick={() => { setSelectedSection(section); setActiveView('landing'); setTimeout(() => setActiveView('practice'), 100); }}
              className="w-full h-14 rounded-2xl font-black text-lg bg-primary/5 text-primary hover:bg-primary hover:text-white shadow-none transition-all"
            >
              دخول الاختبار
            </Button>
          </Card>
        ))}
      </section>

      {activeOverlay && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/90 backdrop-blur-xl" onClick={() => setActiveOverlay(null)} />
          <Card className="w-full max-w-2xl max-h-[85vh] glass-card rounded-[50px] relative z-10 flex flex-col overflow-hidden border-white/10 shadow-[0_0_100px_rgba(var(--primary),0.1)]">
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    {activeOverlay === 'leaderboard' ? <Trophy className="text-amber-500" /> : activeOverlay === 'errors' ? <History className="text-blue-500" /> : activeOverlay === 'favorites' ? <Heart className="text-rose-500" /> : <Palette className="text-purple-500" />}
                 </div>
                 <h2 className="text-2xl md:text-3xl font-black italic">
                   {activeOverlay === 'leaderboard' ? "نخبة EASY" : activeOverlay === 'errors' ? "مراجعة الأخطاء" : activeOverlay === 'favorites' ? "المكتبة المفضلة" : "تخصيص المظهر"}
                 </h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setActiveOverlay(null)} className="rounded-2xl hover:bg-white/5"><X className="w-6 h-6" /></Button>
            </div>
            
            <ScrollArea className="flex-1 p-8">
              {activeOverlay === 'themes' ? (
                <div className="space-y-10">
                   <div className="space-y-4">
                      <h3 className="text-sm font-black text-primary uppercase tracking-widest px-2">الوضع العام</h3>
                      <div className="grid grid-cols-3 gap-3">
                         {[
                           { id: 'light', label: 'فاتح', icon: Sun },
                           { id: 'dark', label: 'داكن', icon: Moon },
                           { id: 'auto', label: 'تلقائي', icon: Monitor },
                         ].map((t) => (
                           <Button 
                             key={t.id}
                             variant={theme === t.id ? 'default' : 'outline'}
                             onClick={() => handleThemeChange(t.id as any)}
                             className="h-14 rounded-2xl gap-2 font-black border-white/5"
                           >
                             <t.icon className="w-4 h-4" /> {t.label}
                           </Button>
                         ))}
                      </div>
                   </div>
                   
                   <div className="space-y-4">
                      <h3 className="text-sm font-black text-primary uppercase tracking-widest px-2">لون المنصة الأساسي</h3>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                         {THEME_COLORS.map((c) => (
                           <button 
                             key={c.name}
                             onClick={() => handleColorChange(c.value)}
                             className={cn(
                               "w-full aspect-square rounded-[20px] transition-all flex items-center justify-center ring-offset-4 ring-offset-background",
                               primaryColor === c.value ? "ring-2 ring-primary scale-110" : "hover:scale-105"
                             )}
                             style={{ backgroundColor: `hsl(${c.value})` }}
                           >
                             {primaryColor === c.value && <Check className="text-white w-6 h-6" />}
                           </button>
                         ))}
                      </div>
                   </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {overlayData.length === 0 ? (
                    <div className="text-center py-32 opacity-10 font-black italic text-4xl">فارغ...</div>
                  ) : (
                    overlayData.map((item, idx) => {
                      const displayTitle = typeof item.question === 'string' 
                        ? item.question 
                        : (item.questionData?.question || item.displayName || 'بدون عنوان');
                      
                      const typeLabel = (item.questionData?.type || item.type || 'ITEM').toString().toUpperCase();

                      return (
                        <div key={item.id || idx} className="p-6 rounded-[30px] bg-white/[0.02] border border-white/5 group hover:border-primary/20 transition-all">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                               <Badge className="bg-primary/20 text-primary border-none rounded-xl font-black">#{idx + 1}</Badge>
                               <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">
                                  {typeLabel}
                               </span>
                            </div>
                            {activeOverlay === 'errors' && (
                              <Button size="icon" variant="ghost" onClick={() => deleteErrorLog(item.id).then(() => openOverlay('errors'))} className="text-rose-500/30 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl"><Trash2 className="w-4 h-4" /></Button>
                            )}
                          </div>
                          <h4 className="text-lg md:text-xl font-black mb-3 leading-relaxed">
                            {displayTitle}
                          </h4>
                          {(item.questionData || item.correct) && (
                            <div className="space-y-3 pt-3 border-t border-white/5">
                               <p className="text-sm font-bold text-emerald-500 flex items-center gap-2">
                                 <CheckCircle2 className="w-4 h-4" /> الإجابة: {String(item.questionData?.correct || item.correct || 'غير محددة')}
                               </p>
                               {item.userAnswer && (
                                 <p className="text-xs font-bold text-rose-500/60 flex items-center gap-2">
                                   <XCircle className="w-3.5 h-3.5" /> إجابتك: {String(item.userAnswer)}
                                 </p>
                               )}
                               {item.questionData?.sectionTitle && (
                                  <p className="text-[10px] font-bold text-white/20">القسم: {item.questionData.sectionTitle}</p>
                               )}
                            </div>
                          )}
                          {typeof item.xp === 'number' && <p className="text-lg font-black text-amber-500">{item.xp} <span className="text-xs opacity-40 uppercase">XP</span></p>}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </ScrollArea>
          </Card>
        </div>
      )}

      <footer className="text-center py-20 border-t border-white/5 mt-auto relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5 blur-[80px] -bottom-40 pointer-events-none" />
        <p className="text-dr-mahmoud text-2xl md:text-4xl">DR. MAHMOUD ABD EL RAZEK</p>
        <p className="text-[10px] font-black opacity-20 mt-4 tracking-[0.5em] uppercase">EASY PREP MASTER © 2024</p>
      </footer>
    </main>
  );
}
