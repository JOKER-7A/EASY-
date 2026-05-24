
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Section } from '@/lib/practice-data';
import { 
  getSectionsFromDb, 
  getLeaderboard, 
  getErrorLogs,
  deleteErrorLog,
  getUserProfile,
  updateOnboardingData
} from '@/lib/db-service';
import PracticeSession from '@/components/PracticeSession';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Zap, Search, Trophy, History, X, Loader2, Palette, LogOut, ArrowRight, Heart, Trash2, ShieldCheck, Settings, Star, Ban, Clock, UserCheck, Phone, User
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { 
  onAuthStateChanged, User as FirebaseUser, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut 
} from 'firebase/auth';
import { doc, updateDoc, onSnapshot, getDoc } from 'firebase/firestore';
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
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [activeOverlay, setActiveOverlay] = useState<'leaderboard' | 'errors' | 'themes' | 'favorites' | null>(null);
  const [overlayData, setOverlayData] = useState<any[]>([]);
  
  // Onboarding State
  const [onboardingName, setOnboardingName] = useState('');
  const [onboardingPhone, setOnboardingPhone] = useState('');
  const [isOnboardingSubmitting, setIsOnboardingSubmitting] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    setHasMounted(true);
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userRef = doc(db, "userProfiles", u.uid);
        // التحقق من وجود الملف أو إنشاؤه
        await getUserProfile(u.uid, u.email || '');
        
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

  const isNewSection = (section: Section) => {
    if (!section.createdAt) return false;
    const createdAt = section.createdAt.toDate ? section.createdAt.toDate() : new Date(section.createdAt);
    return (new Date().getTime() - createdAt.getTime()) / (1000 * 3600) < 72;
  };

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
    if (user?.email === 'admin@easy.com') return true;
    if (!profile) return false;
    return (
      profile.role === 'admin' || 
      profile.role === 'superAdmin' || 
      profile.status === 'admin' || 
      profile.isAdmin === true
    );
  }, [profile, user]);

  const isBanned = useMemo(() => {
    if (!profile?.isBanned) return false;
    if (!profile.banExpiresAt) return true;
    const expiresAt = profile.banExpiresAt.toDate ? profile.banExpiresAt.toDate() : new Date(profile.banExpiresAt);
    return expiresAt > new Date();
  }, [profile]);

  if (!hasMounted) return null;

  // 1. شاشة التحميل
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

  // 2. شاشة الحظر
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

  // 3. شاشة تسجيل الدخول
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

  // 4. شاشة Onboarding (إكمال البيانات)
  if (user && (!profile?.displayName || !profile?.phoneNumber)) {
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

  // 5. شاشة انتظار الموافقة (Pending)
  if (user && profile?.status === 'pending' && !isAdmin) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center p-4 text-center">
        <Card className="max-w-lg w-full p-12 glass-card rounded-[50px] space-y-8 animate-in fade-in zoom-in border-primary/10">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto ring-4 ring-primary/20">
            <Clock className="w-12 h-12 text-primary animate-pulse" />
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-black text-white">طلبك قيد المراجعة ⏳</h1>
            <p className="text-xl text-white/60 leading-relaxed">أهلاً بك يا {profile.displayName}، لقد استلمنا طلبك وجاري مراجعته من قبل الدكتور محمود. سيتم تفعيل حسابك قريباً.</p>
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

  // 6. شاشة الرفض (Rejected)
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

  // 7. الواجهة الرئيسية (Approved / Admin)
  if (activeView === 'practice' && selectedSection) {
    return <PracticeSession section={selectedSection} onExit={() => setActiveView('landing')} />;
  }

  return (
    <main className="min-h-screen bg-background text-white flex flex-col relative overflow-x-hidden bg-mesh" dir="rtl">
      <nav className="fixed top-0 left-0 w-full z-[100] px-4 md:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between p-3 glass-card rounded-[30px]">
          <div className="flex items-center gap-4">
            <Avatar className="w-12 h-12 border-2 border-primary/30">
              <AvatarImage src={user.photoURL || ''} />
              <AvatarFallback className="bg-primary/20 text-primary font-black">{profile?.displayName?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <div className="hidden sm:block">
              <p className="font-black text-white/90 text-sm">{profile?.displayName || 'طالب EASY'}</p>
              <div className="flex items-center gap-2">
                 <Badge className="bg-primary text-white text-[9px] px-1.5 py-0">LVL {profile?.level || 1}</Badge>
                 <span className="text-[9px] text-white/30">{profile?.xp || 0} XP</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button onClick={() => openOverlay('themes')} variant="ghost" size="icon" className="w-9 h-9 rounded-xl text-primary"><Palette className="w-4 h-4" /></Button>
            <Button onClick={() => openOverlay('leaderboard')} variant="ghost" size="icon" className="w-9 h-9 rounded-xl text-amber-500"><Trophy className="w-4 h-4" /></Button>
            <Button onClick={() => openOverlay('favorites')} variant="ghost" size="icon" className="w-9 h-9 rounded-xl text-rose-500"><Heart className="w-4 h-4" /></Button>
            <Button onClick={() => openOverlay('errors')} variant="ghost" size="icon" className="w-9 h-9 rounded-xl text-blue-500"><History className="w-4 h-4" /></Button>
            {isAdmin && (
              <Button onClick={() => window.location.href = '/admin'} variant="ghost" size="icon" className="w-9 h-9 rounded-xl text-emerald-400 border border-emerald-500/20"><ShieldCheck className="w-4 h-4" /></Button>
            )}
            <Button onClick={() => signOut(auth)} variant="ghost" size="icon" className="w-9 h-9 rounded-xl text-destructive"><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 pt-32 md:pt-48 pb-10 text-center space-y-6 relative z-10">
        <h1 className="text-6xl sm:text-8xl md:text-[10rem] text-easy-premium animate-in fade-in slide-in-from-top-10 duration-1000">
          EASY
        </h1>
        <p className="text-lg md:text-2xl font-black text-white/40 tracking-wide animate-pulse">تغلّب على نفسك <span className="text-white glow-text italic">كل يوم</span> 💎</p>
        <div className="max-w-2xl mx-auto pt-6 relative group px-4">
          <Search className="absolute right-10 top-1/2 -translate-y-1/2 text-white/20 w-5 h-5" />
          <Input placeholder="ابحث عن نموذج تدريبي..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-14 w-full rounded-2xl bg-white/[0.02] border-white/10 pr-14 text-lg font-bold transition-all focus:border-primary/40" />
        </div>
      </div>

      <section className="container mx-auto px-4 md:px-8 pb-20 grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        {filteredSections.map((section) => (
          <Card key={section.firebaseId || section.id} className="group glass-card rounded-[35px] p-6 md:p-8 relative overflow-hidden border-white/5">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-6 relative z-10">
              <div className="text-center sm:text-right space-y-3">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <Badge className="bg-primary/20 text-primary border-none font-black text-[10px]">نموذج {section.id}</Badge>
                  {isNewSection(section) && <Badge className="bg-amber-500/20 text-amber-500 border-none animate-pulse text-[10px]">جديد ✨</Badge>}
                </div>
                <div className="flex flex-col">
                  <h2 className="text-xl md:text-3xl font-black group-hover:text-primary transition-colors">{section.title}</h2>
                  {section.description && <p className="text-white/40 text-xs font-bold mt-1 line-clamp-1">{section.description}</p>}
                </div>
                <div className="flex justify-center sm:justify-start items-center gap-4 text-white/20 text-xs font-bold">
                  <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> {section.questions?.length || 0} سؤال</span>
                  <span className="flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> {section.duration} دقيقة</span>
                </div>
              </div>
              <Button onClick={() => { setSelectedSection(section); setActiveView('landing'); setTimeout(() => setActiveView('practice'), 50); }} className="w-full sm:w-auto h-16 px-8 rounded-2xl text-xl font-black bg-primary text-white shadow-xl hover:scale-105 transition-all">
                ابدأ <ArrowRight className="mr-2 w-6 h-6" />
              </Button>
            </div>
          </Card>
        ))}
      </section>

      {activeOverlay && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setActiveOverlay(null)} />
          <Card className="w-full max-w-4xl max-h-[85vh] glass-card rounded-[40px] relative z-10 flex flex-col border-primary/20">
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-2xl font-black">{activeOverlay === 'themes' ? "مركز الثيمات" : activeOverlay === 'leaderboard' ? "نخبة EASY" : activeOverlay === 'errors' ? "سجل الأخطاء" : "المفضلة"}</h2>
              <Button variant="ghost" size="icon" className="rounded-full w-10 h-10" onClick={() => setActiveOverlay(null)}><X className="w-6 h-6" /></Button>
            </div>
            <ScrollArea className="flex-1 p-8">
              {activeOverlay === 'themes' ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {THEMES.map((t) => (
                    <button key={t.name} onClick={() => changeTheme(t.value)} className={cn("p-4 rounded-[25px] glass-card flex flex-col items-center gap-3 transition-all hover:scale-105", profile?.theme === t.value && "border-primary shadow-glow")}>
                      <div className="w-12 h-12 rounded-full" style={{ backgroundColor: t.color }} />
                      <span className="font-black text-xs">{t.name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {overlayData.length === 0 ? (
                    <div className="text-center py-20 text-white/20 font-black">لا يوجد بيانات حالياً</div>
                  ) : (
                    overlayData.map((item, idx) => (
                      <Card key={idx} className="p-6 glass-card rounded-[30px] border-white/5 space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="flex gap-4">
                             <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-black text-xs">{idx + 1}</div>
                             <div>
                                <p className="font-black text-lg leading-tight">
                                  {item.displayName || item.questionData?.question || item.question}
                                </p>
                                <p className="text-white/20 text-[10px] mt-1">{item.xp ? `${item.xp} XP` : item.questionData?.sectionTitle || "مراجعة"}</p>
                             </div>
                          </div>
                          {activeOverlay === 'errors' && <Button variant="ghost" size="icon" onClick={() => deleteErrorLog(item.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>}
                          {activeOverlay === 'favorites' && <Badge className="bg-primary/20 text-primary border-none">⭐</Badge>}
                        </div>
                        {(activeOverlay === 'errors' || activeOverlay === 'favorites') && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                            {(item.questionData?.options || item.options)?.map((opt: string, i: number) => (
                              <div key={i} className={cn(
                                "p-3 rounded-xl text-xs font-bold border",
                                opt === (item.questionData?.correct || item.correct) ? "bg-green-500/10 border-green-500/30 text-green-500" : "bg-white/5 border-white/5 text-white/40"
                              )}>
                                {['أ', 'ب', 'ج', 'د'][i]}. {opt}
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

      <footer className="text-center py-24 opacity-60 space-y-6">
        <div className="flex flex-col items-center gap-2">
          <p className="text-dr-mahmoud">DR. MAHMOUD ABD EL RAZEK</p>
          <div className="h-0.5 w-20 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
          
          <button 
            onClick={() => window.location.href = '/admin'}
            className="mt-4 p-2 rounded-full hover:bg-white/5 transition-all group focus:outline-none"
            title="Admin Panel"
          >
            <ShieldCheck className="w-5 h-5 text-primary/40 group-hover:text-primary transition-colors filter drop-shadow(0 0 8px hsla(var(--primary), 0.3))" />
          </button>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-white/30">Easy Prep Master &copy; 2024</p>
      </footer>
    </main>
  );
}
