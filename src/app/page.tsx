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
import { Avatar, AvatarFallback, AvatarImage } from "@/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Zap, Search, Trophy, History, X, Loader2, Palette, LogOut, ArrowRight, Heart, Trash2, ShieldCheck, Settings, Star, Ban, Clock, UserCheck, Phone, User, MessageCircle, Crown, Info, Moon, Sun, Monitor
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
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20" title="Root Owner">
        <Crown className="text-amber-500 w-3 h-3" />
        <span className="text-[10px] text-amber-500 font-black">ROOT</span>
      </span>
    ),
    'owner': (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20" title="Owner">
        <Crown className="text-amber-500 w-3 h-3" />
      </span>
    ),
    'superAdmin': (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20" title="Super Admin">
        <ShieldCheck className="text-blue-500 w-3 h-3" />
        <span className="text-[10px] text-blue-500 font-black">SUPER</span>
      </span>
    ),
    'admin': (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20" title="Admin">
        <ShieldCheck className="text-blue-500 w-3 h-3" />
      </span>
    ),
  };
  return badges[role] ? <span className="mr-1 inline-block select-none">{badges[role]}</span> : null;
};

export default function Home() {
  const [hasMounted, setHasMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('auto');
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
    const initialTheme = (localStorage.getItem('theme') as 'light' | 'dark' | 'auto') || 'auto';
    setTheme(initialTheme);
    applyTheme(initialTheme);

    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userRef = doc(db, "userProfiles", u.uid);
        const unsubProfile = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setProfile({ id: docSnap.id, ...docSnap.data() });
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

  const applyTheme = (t: 'light' | 'dark' | 'auto') => {
    const root = document.documentElement;
    if (t === 'auto') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      isDark ? root.classList.add('dark') : root.classList.remove('dark');
    } else if (t === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  const handleThemeChange = (t: 'light' | 'dark' | 'auto') => {
    setTheme(t);
    localStorage.setItem('theme', t);
    applyTheme(t);
  };

  const filteredSections = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return sections;
    return sections.filter(s => 
      s.title.toLowerCase().includes(q) || 
      s.id.toString().includes(q)
    );
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
      if (authMode === 'login') await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
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
      else if (type === 'favorites' && user) setOverlayData(profile?.favorites || []);
    } catch (e) { console.error(e); }
  };

  const isAdmin = useMemo(() => {
    if (!profile) return false;
    return ['rootOwner', 'owner', 'superAdmin', 'admin'].includes(profile.role);
  }, [profile]);

  if (!hasMounted) return null;

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-black text-primary animate-pulse">EASY</h1>
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 glass-card border-primary/20 space-y-8">
          <div className="text-center">
            <h1 className="text-6xl text-easy-premium">EASY</h1>
            <p className="text-sm font-bold opacity-50 uppercase tracking-widest mt-4">Prep Master</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            <Input type="email" placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 text-center rounded-xl" />
            <Input type="password" placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 text-center rounded-xl" />
            <Button type="submit" disabled={isAuthLoading} className="w-full h-12 rounded-xl bg-primary font-bold">
              {isAuthLoading ? <Loader2 className="animate-spin" /> : (authMode === 'login' ? "دخول" : "تسجيل جديد")}
            </Button>
          </form>
          <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="w-full text-xs font-bold opacity-50 hover:opacity-100 transition-opacity">
            {authMode === 'login' ? "إنشاء حساب جديد" : "لديك حساب بالفعل؟"}
          </button>
        </Card>
      </main>
    );
  }

  if (activeView === 'practice' && selectedSection) {
    return <PracticeSession section={selectedSection} onExit={() => setActiveView('landing')} />;
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col" dir="rtl">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="hidden sm:block">
              <p className="font-black text-sm md:text-base flex items-center gap-2">
                {profile?.displayName || 'مستكشف EASY'} <RoleBadgeUI role={profile?.role || 'user'} />
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <Progress value={levelProgress} className="w-20 h-1" />
                <span className="text-[10px] font-bold opacity-50">LVL {profile?.level || 1}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <Button onClick={() => openOverlay('leaderboard')} variant="ghost" size="icon" className="text-amber-500"><Trophy className="w-5 h-5" /></Button>
            <Button onClick={() => openOverlay('favorites')} variant="ghost" size="icon" className="text-rose-500"><Heart className="w-5 h-5" /></Button>
            <Button onClick={() => openOverlay('errors')} variant="ghost" size="icon" className="text-blue-500"><History className="w-5 h-5" /></Button>
            
            <div className="h-6 w-[1px] bg-border mx-1" />
            
            <Button onClick={() => handleThemeChange(theme === 'dark' ? 'light' : 'dark')} variant="ghost" size="icon">
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>

            {isAdmin && (
              <Button onClick={() => window.location.href = '/admin'} variant="ghost" size="icon" className="text-primary"><ShieldCheck className="w-5 h-5" /></Button>
            )}
            <Button onClick={() => signOut(auth)} variant="ghost" size="icon" className="text-destructive"><LogOut className="w-5 h-5" /></Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="container mx-auto px-4 pt-16 md:pt-24 pb-12 text-center space-y-6">
        <h1 className="text-6xl md:text-9xl text-easy-premium animate-in fade-in slide-in-from-top-4 duration-1000">EASY</h1>
        <p className="text-lg md:text-xl font-bold opacity-60">نظام التدريب اللفظي الأذكى للمحترفين</p>
        
        <div className="max-w-xl mx-auto pt-8 relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 w-5 h-5" />
          <Input 
            placeholder="ابحث عن نموذج..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="h-14 pr-12 rounded-2xl bg-muted/50 border-none shadow-inner" 
          />
        </div>
      </div>

      {/* Sections Grid */}
      <section className="container mx-auto px-4 pb-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSections.map((section) => (
          <Card key={section.firebaseId || section.id} className="group glass-card rounded-3xl p-6 border-transparent hover:border-primary/20">
            <div className="flex justify-between items-start mb-4">
              <Badge variant="secondary" className="font-black px-3 rounded-lg">#{section.id}</Badge>
              <div className="flex items-center gap-3 text-xs font-bold opacity-40">
                <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {section.questions?.length || 0}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {section.duration}د</span>
              </div>
            </div>
            <h3 className="text-xl md:text-2xl font-black mb-6 group-hover:text-primary transition-colors">{section.title}</h3>
            <Button 
              onClick={() => { setSelectedSection(section); setActiveView('landing'); setTimeout(() => setActiveView('practice'), 50); }}
              className="w-full h-12 rounded-xl font-black bg-primary/10 text-primary hover:bg-primary hover:text-white"
            >
              بدء التدريب
            </Button>
          </Card>
        ))}
      </section>

      {/* Overlay */}
      {activeOverlay && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setActiveOverlay(null)} />
          <Card className="w-full max-w-2xl max-h-[80vh] glass-card rounded-[2rem] relative z-10 flex flex-col overflow-hidden">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-2xl font-black">
                {activeOverlay === 'leaderboard' ? "نخبة EASY" : activeOverlay === 'errors' ? "سجل الأخطاء" : "المفضلة"}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setActiveOverlay(null)}><X className="w-5 h-5" /></Button>
            </div>
            <ScrollArea className="flex-1 p-6">
              {overlayData.length === 0 ? (
                <div className="text-center py-20 opacity-20 font-black">لا يوجد بيانات</div>
              ) : (
                <div className="space-y-4">
                  {overlayData.map((item, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-muted/30 border border-border/50">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-black text-primary">#{idx + 1}</span>
                        <span className="text-xs font-bold opacity-50">{item.displayName || "سؤال"}</span>
                      </div>
                      <p className="font-bold">{item.questionData?.question || item.question || item.displayName}</p>
                      {item.xp !== undefined && <p className="text-xs font-black mt-1 text-primary">{item.xp} XP</p>}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </Card>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center py-12 border-t border-border mt-auto">
        <p className="text-dr-mahmoud">DR. MAHMOUD ABD EL RAZEK</p>
        <p className="text-[10px] font-bold opacity-30 mt-2 tracking-widest">EASY PREP MASTER © 2024</p>
      </footer>
    </main>
  );
}
