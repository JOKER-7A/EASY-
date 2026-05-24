
'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Zap, Search, Trophy, History, X, Loader2, Palette, LogOut, ArrowRight, Heart, Trash2, ShieldCheck, Settings, Star, Ban, Clock, UserCheck, Phone, User, MessageCircle
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { 
  onAuthStateChanged, User as FirebaseUser, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut 
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

// مكون الوسام البصري المطور (Visual Role Badge UI)
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

export default function Home() {
  const [hasMounted, setHasMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
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
  const [whatsappLink, setWhatsappLink] = useState('');
  
  const [onboardingName, setOnboardingName] = useState('');
  const [onboardingPhone, setOnboardingPhone] = useState('');
  const [isOnboardingSubmitting, setIsOnboardingSubmitting] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    setHasMounted(true);
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const profileData = await getUserProfile(u.uid, u.email || '');
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
        
        getGlobalSettings().then(settings => {
          if (settings.whatsappLink) setWhatsappLink(settings.whatsappLink);
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
      s.title.toLowerCase().includes(q) || 
      s.id.toString().includes(q) ||
      (s.description && s.description.toLowerCase().includes(q))
    );
  }, [searchQuery, sections]);

  const levelProgress = useMemo(() => {
    if (!profile) return 0;
    const currentXp = profile.xp || 0;
    const progressInLevel = currentXp % 500;
    return (progressInLevel / 500) * 100;
  }, [profile]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsAuthLoading(true);
    try {
      if (authMode === 'login') await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      toast({ title: "فشل الدخول", description: error.message, variant: "destructive" });
    } finally { setIsAuthLoading(false); }
  };

  const handleOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardingName.trim() || !onboardingPhone.trim() || !user) return;
    setIsOnboardingSubmitting(true);
    try {
      const success = await updateOnboardingData(user.uid, onboardingName, onboardingPhone);
      if (success) {
        toast({ title: "تم إرسال طلبك بنجاح ✅", description: "انتظر موافقة الأدمن للدخول" });
      }
    } catch (e) {
      toast({ title: "فشلت العملية", variant: "destructive" });
    } finally {
      setIsOnboardingSubmitting(false);
    }
  };

  const openOverlay = async (type: 'leaderboard' | 'errors' | 'themes' | 'favorites') => {
    setActiveOverlay(type);
    setOverlayData([]);
    if (type === 'themes') return;
    try {
      if (type === 'leaderboard') setOverlayData(await getLeaderboard());
      else if (type === 'errors' && user) setOverlayData(await getErrorLogs(user.uid));
      else if (type === 'favorites' && user) setOverlayData(profile?.favorites || []);
    } catch (e) { console.error(e); }
  };

  const isAdmin = useMemo(() => {
    if (!profile) return false;
    return ['rootOwner', 'owner', 'superAdmin', 'admin', 'editor', 'helper'].includes(profile.role);
  }, [profile]);

  const isApproved = useMemo(() => {
    return profile?.status === 'approved' || isAdmin;
  }, [profile, isAdmin]);

  const isBanned = useMemo(() => {
    if (!profile?.isBanned) return false;
    if (!profile.banExpiresAt) return true;
    const expiresAt = profile.banExpiresAt.toDate ? profile.banExpiresAt.toDate() : new Date(profile.banExpiresAt);
    return expiresAt > new Date();
  }, [profile]);

  if (!hasMounted) return null;

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[1000] bg-black flex items-center justify-center">
        <div className="text-center space-y-6">
          <h1 className="text-6xl text-easy-premium animate-pulse">EASY</h1>
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (isBanned) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center p-6 text-center" dir="rtl">
        <Card className="max-w-xl w-full p-12 glass-card border-rose-500/30 rounded-[50px] space-y-8 animate-in fade-in zoom-in">
          <div className="w-24 h-24 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto ring-4 ring-rose-500/20">
            <Ban className="w-12 h-12 text-rose-500" />
          </div>
          <h1 className="text-4xl font-black text-white">لقد تم حظرك 🚫</h1>
          <div className="space-y-4">
            <p className="text-xl text-white/60 leading-relaxed">{profile.banReason || "مخالفة شروط الاستخدام"}</p>
            {profile.banExpiresAt && (
              <div className="flex items-center justify-center gap-2 text-primary font-bold">
                <Clock className="w-5 h-5" />
                <span>ينتهي الحظر في: {profile.banExpiresAt.toDate ? profile.banExpiresAt.toDate().toLocaleString() : new Date(profile.banExpiresAt).toLocaleString()}</span>
              </div>
            )}
          </div>
          <div className="pt-6">
            <Button onClick={() => signOut(auth)} variant="outline" className="h-14 px-10 rounded-2xl border-white/10 text-white font-black">
              تسجيل الخروج
            </Button>
          </div>
        </Card>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center p-4 overflow-hidden relative">
        <div className="absolute inset-0 bg-mesh opacity-30" />
        <Card className="w-full max-w-lg p-10 glass-card rounded-[40px] border-primary/20 relative z-10">
          <div className="text-center mb-10">
            <h1 className="text-7xl md:text-8xl text-easy-premium animate-float-soft">EASY</h1>
            <p className="text-sm text-primary font-black tracking-widest uppercase mt-4">نظام التدريب اللفظي الذكي</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            <Input type="email" placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} className="h-14 rounded-2xl bg-white/5 border-white/10 text-center" />
            <Input type="password" placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} className="h-14 rounded-2xl bg-white/5 border-white/10 text-center" />
            <Button type="submit" disabled={isAuthLoading} className="w-full h-16 rounded-2xl bg-primary text-white font-black text-xl shadow-glow">
              {isAuthLoading ? <Loader2 className="animate-spin" /> : (authMode === 'login' ? "دخول 🚀" : "انضم الآن ✨")}
            </Button>
          </form>
          <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="mt-8 w-full text-white/30 hover:text-white transition-colors text-sm font-bold">
            {authMode === 'login' ? "ليس لديك حساب؟ سجل الآن" : "لديك حساب؟ سجل دخولك"}
          </button>
        </Card>
      </main>
    );
  }

  // شاشة الـ Onboarding الإجبارية
  if (user && (!profile?.displayName || !profile?.phoneNumber || profile?.status === 'onboarding')) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-mesh opacity-20" />
        <Card className="w-full max-w-lg p-12 glass-card rounded-[50px] border-primary/20 relative z-10 space-y-10">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto ring-2 ring-primary/20">
              <UserCheck className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-3xl font-black">أهلاً بك في عائلة EASY ✨</h1>
            <p className="text-white/40 font-bold text-sm">يرجى إكمال بياناتك للبدء في رحلة التدريب</p>
          </div>
          <form onSubmit={handleOnboarding} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-primary uppercase mr-2 flex items-center gap-2"><User className="w-3 h-3" /> الاسم الكامل</label>
              <Input placeholder="ادخل اسمك الثلاثي" value={onboardingName} onChange={(e) => setOnboardingName(e.target.value)} className="h-14 rounded-2xl bg-white/5 border-white/10" required />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-primary uppercase mr-2 flex items-center gap-2"><Phone className="w-3 h-3" /> رقم الواتساب</label>
              <Input placeholder="05xxxxxxxx" value={onboardingPhone} onChange={(e) => setOnboardingPhone(e.target.value)} className="h-14 rounded-2xl bg-white/5 border-white/10" required />
            </div>
            <Button type="submit" disabled={isOnboardingSubmitting} className="w-full h-16 rounded-2xl bg-primary text-white font-black text-xl shadow-glow">
              {isOnboardingSubmitting ? <Loader2 className="animate-spin" /> : "إرسال البيانات 🚀"}
            </Button>
          </form>
          <Button variant="ghost" onClick={() => signOut(auth)} className="w-full text-white/30 text-xs">خروج</Button>
        </Card>
      </main>
    );
  }

  if (user && profile?.status === 'pending' && !isAdmin) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center p-4 text-center">
        <Card className="max-w-lg w-full p-12 glass-card rounded-[50px] space-y-8 animate-in fade-in zoom-in border-primary/10">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto ring-4 ring-primary/20">
            <Clock className="w-12 h-12 text-primary animate-pulse" />
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-black text-white">طلبك قيد المراجعة ⏳</h1>
            <p className="text-xl text-white/60 leading-relaxed">أهلاً بك يا {profile?.displayName}، لقد استلمنا طلبك وجاري مراجعته من قبل الدكتور محمود. سيتم تفعيل حسابك قريباً.</p>
          </div>
          <div className="pt-6">
            <Button onClick={() => signOut(auth)} variant="outline" className="h-14 px-10 rounded-2xl border-white/10 text-white font-black">
              تسجيل الخروج
            </Button>
          </div>
        </Card>
      </main>
    );
  }

  if (user && profile?.status === 'rejected' && !isAdmin) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center p-4 text-center">
        <Card className="max-w-lg w-full p-12 glass-card rounded-[50px] space-y-8 border-rose-500/20">
          <div className="w-24 h-24 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto">
            <X className="w-12 h-12 text-rose-500" />
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-black text-white">نعتذر منك ❌</h1>
            <p className="text-xl text-white/60 leading-relaxed">تم رفض طلب انضمامك حالياً. يرجى التواصل مع الإدارة أو المحاولة مرة أخرى ببيانات صحيحة.</p>
          </div>
          <div className="flex flex-col gap-4">
            <Button onClick={() => updateOnboardingData(user.uid, '', '')} className="h-16 rounded-2xl bg-primary text-white font-black">إعادة إرسال الطلب ✨</Button>
            <Button onClick={() => signOut(auth)} variant="ghost" className="text-white/40">خروج</Button>
          </div>
        </Card>
      </main>
    );
  }

  if (activeView === 'practice' && selectedSection) {
    return <PracticeSession section={selectedSection} onExit={() => setActiveView('landing')} />;
  }

  return (
    <main className="min-h-screen bg-background text-white flex flex-col relative overflow-x-hidden bg-mesh" dir="rtl">
      <nav className="fixed top-0 left-0 w-full z-[100] px-4 md:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between p-3 glass-card rounded-[30px] border-primary/20">
          <div className="flex items-center gap-4">
            <Avatar className="w-14 h-14 border-2 border-primary/30 ring-2 ring-primary/10">
              <AvatarImage src={user.photoURL || ''} />
              <AvatarFallback className="bg-primary/20 text-primary font-black text-xl">{profile?.displayName?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-black text-white/90 text-sm md:text-lg flex items-center gap-2">
                  {profile?.displayName || 'طالب EASY'} <RoleBadgeUI role={profile?.role || 'user'} />
                </p>
              </div>
              <div className="flex flex-col gap-1 mt-1">
                <div className="flex items-center gap-3">
                   <Badge className="bg-primary text-white text-[10px] font-black px-2 h-5">LEVEL {profile?.level || 1}</Badge>
                   <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{profile?.xp || 0} / {(profile?.level || 1) * 500} XP</span>
                </div>
                <div className="w-32 md:w-48">
                  <Progress value={levelProgress} className="h-1.5 bg-white/5 border-none" />
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button onClick={() => openOverlay('themes')} variant="ghost" size="icon" className="w-10 h-10 rounded-xl text-primary hover:bg-primary/10"><Palette className="w-5 h-5" /></Button>
            <Button onClick={() => openOverlay('leaderboard')} variant="ghost" size="icon" className="w-10 h-10 rounded-xl text-amber-500 hover:bg-amber-500/10"><Trophy className="w-5 h-5" /></Button>
            <Button onClick={() => openOverlay('favorites')} variant="ghost" size="icon" className="w-10 h-10 rounded-xl text-rose-500 hover:bg-rose-500/10"><Heart className="w-5 h-5" /></Button>
            <Button onClick={() => openOverlay('errors')} variant="ghost" size="icon" className="w-10 h-10 rounded-xl text-blue-500 hover:bg-blue-500/10"><History className="w-5 h-5" /></Button>
            {isAdmin && (
              <Button onClick={() => window.location.href = '/admin'} variant="ghost" size="icon" className="w-10 h-10 rounded-xl text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10"><ShieldCheck className="w-5 h-5" /></Button>
            )}
            <Button onClick={() => signOut(auth)} variant="ghost" size="icon" className="w-10 h-10 rounded-xl text-destructive hover:bg-destructive/10"><LogOut className="w-5 h-5" /></Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 pt-40 md:pt-56 pb-10 text-center space-y-8 relative z-10">
        <div className="space-y-2">
          <h1 className="text-7xl sm:text-9xl md:text-[12rem] text-easy-premium animate-in fade-in slide-in-from-top-10 duration-1000 select-none">
            EASY
          </h1>
          <p className="text-xl md:text-3xl font-black text-white/40 tracking-tight animate-pulse">تغلّب على نفسك <span className="text-white glow-text italic">كل يوم</span> 💎</p>
        </div>
        
        {isApproved && whatsappLink && (
          <div className="pt-4 animate-in fade-in zoom-in duration-700">
            <Button 
              onClick={() => window.open(whatsappLink, '_blank')}
              className="h-18 px-10 rounded-3xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xl flex gap-4 mx-auto shadow-[0_0_40px_rgba(16,185,129,0.5)] transition-all hover:scale-105 active:scale-95"
            >
              <MessageCircle className="w-7 h-7" /> انضم لمجموعة الواتساب الرسمية
            </Button>
          </div>
        )}

        <div className="max-w-2xl mx-auto pt-6 relative group px-4">
          <Search className="absolute right-10 top-1/2 -translate-y-1/2 text-white/20 w-6 h-6" />
          <Input placeholder="ابحث عن نموذج تدريبي..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-16 w-full rounded-2xl bg-white/[0.03] border-white/10 pr-16 text-xl font-bold transition-all focus:border-primary/40 focus:bg-white/[0.05]" />
        </div>
      </div>

      <section className="container mx-auto px-4 md:px-8 pb-32 grid grid-cols-1 md:grid-cols-2 gap-8">
        {filteredSections.map((section) => (
          <Card key={section.firebaseId || section.id} className="group glass-card rounded-[40px] p-8 md:p-10 relative overflow-hidden border-white/5 hover:border-primary/30">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-8 relative z-10">
              <div className="text-center sm:text-right space-y-4">
                <div className="flex items-center justify-center sm:justify-start gap-3">
                  <Badge className="bg-primary/20 text-primary border-none font-black text-xs px-3">نموذج {section.id}</Badge>
                  {section.createdAt && (new Date().getTime() - (section.createdAt.toDate ? section.createdAt.toDate() : new Date(section.createdAt)).getTime()) / (1000 * 3600) < 72 && (
                    <Badge className="bg-amber-500/20 text-amber-500 border-none animate-pulse text-xs px-3 font-black">جديد ✨</Badge>
                  )}
                </div>
                <div className="space-y-1">
                  <h2 className="text-2xl md:text-4xl font-black group-hover:text-primary transition-colors leading-tight">{section.title}</h2>
                  {section.description && <p className="text-white/30 text-sm font-bold mt-1 line-clamp-1">{section.description}</p>}
                </div>
                <div className="flex justify-center sm:justify-start items-center gap-6 text-white/20 text-sm font-black uppercase tracking-wider">
                  <span className="flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500/50" /> {section.questions?.length || 0} سؤال</span>
                  <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-blue-500/50" /> {section.duration} دقيقة</span>
                </div>
              </div>
              <Button onClick={() => { setSelectedSection(section); setActiveView('landing'); setTimeout(() => setActiveView('practice'), 50); }} className="w-full sm:w-auto h-20 px-10 rounded-3xl text-2xl font-black bg-primary text-white shadow-2xl hover:scale-110 active:scale-95 transition-all shadow-primary/20">
                ابدأ <ArrowRight className="mr-3 w-8 h-8" />
              </Button>
            </div>
          </Card>
        ))}
      </section>

      {activeOverlay && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setActiveOverlay(null)} />
          <Card className="w-full max-w-4xl max-h-[85vh] glass-card rounded-[50px] relative z-10 flex flex-col border-primary/20">
            <div className="p-10 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-3xl font-black">{activeOverlay === 'themes' ? "مركز الثيمات" : activeOverlay === 'leaderboard' ? "نخبة EASY" : activeOverlay === 'errors' ? "سجل الأخطاء" : "المفضلة"}</h2>
              <Button variant="ghost" size="icon" className="rounded-full w-12 h-12 hover:bg-white/5" onClick={() => setActiveOverlay(null)}><X className="w-7 h-7" /></Button>
            </div>
            <ScrollArea className="flex-1 p-10">
              {activeOverlay === 'themes' ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  {THEMES.map((t) => (
                    <button key={t.name} onClick={() => changeTheme(t.value)} className={cn("p-6 rounded-[35px] glass-card flex flex-col items-center gap-4 transition-all hover:scale-105", profile?.theme === t.value && "border-primary shadow-[0_0_30px_rgba(147,51,234,0.3)]")}>
                      <div className="w-16 h-16 rounded-full ring-4 ring-white/10" style={{ backgroundColor: t.color }} />
                      <span className="font-black text-sm uppercase tracking-widest">{t.name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {overlayData.length === 0 ? (
                    <div className="text-center py-24 text-white/10 font-black text-2xl">لا يوجد بيانات حالياً</div>
                  ) : (
                    overlayData.map((item, idx) => (
                      <Card key={idx} className="p-8 glass-card rounded-[35px] border-white/5 space-y-6 hover:border-primary/20">
                        <div className="flex justify-between items-start">
                          <div className="flex gap-6">
                             <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-lg shadow-inner">{idx + 1}</div>
                             <div>
                                <p className="font-black text-xl leading-tight flex items-center gap-3">
                                  {item.displayName || item.questionData?.question || item.question}
                                  {item.role && <RoleBadgeUI role={item.role} />}
                                </p>
                                <p className="text-white/20 text-xs font-bold mt-2 tracking-widest uppercase">
                                  {item.xp !== undefined ? `${item.xp} XP | LEVEL ${item.level || 1}` : item.questionData?.sectionTitle || "مراجعة"}
                                </p>
                             </div>
                          </div>
                          {activeOverlay === 'errors' && <Button variant="ghost" size="icon" onClick={() => deleteErrorLog(item.id)} className="text-destructive hover:bg-destructive/10 rounded-xl"><Trash2 className="w-5 h-5" /></Button>}
                          {activeOverlay === 'favorites' && <Badge className="bg-primary/20 text-primary border-none text-lg">⭐</Badge>}
                        </div>
                        {(activeOverlay === 'errors' || activeOverlay === 'favorites') && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                            {(item.questionData?.options || item.options)?.map((opt: string, i: number) => (
                              <div key={i} className={cn(
                                "p-4 rounded-2xl text-sm font-black border-2 transition-all",
                                opt === (item.questionData?.correct || item.correct) ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-white/[0.02] border-white/5 text-white/30"
                              )}>
                                <span className="opacity-40 ml-3">{['أ', 'ب', 'ج', 'د'][i]}</span> {opt}
                              </div>
                            ))}
                          </div>
                        )}
                      </Card>
                    ))
                  )}
                </div>
              )}
            </ScrollArea>
          </Card>
        </div>
      )}

      <footer className="text-center py-32 opacity-60 space-y-8 bg-black/40 backdrop-blur-3xl mt-20 border-t border-white/5">
        <div className="flex flex-col items-center gap-3">
          <p className="text-dr-mahmoud text-3xl md:text-5xl">DR. MAHMOUD ABD EL RAZEK</p>
          <div className="h-0.5 w-32 bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
          
          <button 
            onClick={() => window.location.href = '/admin'}
            className="mt-6 p-3 rounded-2xl hover:bg-white/5 transition-all group focus:outline-none"
            title="Admin Panel"
          >
            <ShieldCheck className="w-6 h-6 text-primary/30 group-hover:text-primary transition-colors filter drop-shadow(0 0 10px hsla(var(--primary), 0.4))" />
          </button>
        </div>
        <p className="text-[11px] font-black uppercase tracking-[0.6em] text-white/20">Easy Prep Master &copy; 2024</p>
      </footer>
    </main>
  );
}
