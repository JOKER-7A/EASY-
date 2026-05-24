'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Section, sections as staticSections } from '@/lib/practice-data';
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
  Zap, Search, Trophy, History, X, ChevronRight, Loader2, Settings, ShieldCheck, 
  User as UserIcon, Crown, Palette, LogOut, ArrowRight, Heart, Trash2, Sparkles 
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { 
  onAuthStateChanged, User, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut 
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
    const safetyTimer = setTimeout(() => setIsLoading(false), 2000);
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userRef = doc(db, "userProfiles", u.uid);
        onSnapshot(userRef, (docSnap) => {
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
    getSectionsFromDb().then(setSections);
    return () => { clearTimeout(safetyTimer); unsubAuth(); };
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
    return sections.filter(s => s.title.toLowerCase().includes(q) || s.id.toString().includes(q));
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

  if (!hasMounted) return null;
  if (isLoading) return <div className="fixed inset-0 bg-background flex items-center justify-center z-[500]"><Loader2 className="w-12 h-12 text-primary animate-spin" /></div>;

  if (activeView === 'practice' && selectedSection) {
    return <PracticeSession section={selectedSection} onExit={() => setActiveView('landing')} />;
  }

  return (
    <main className="min-h-screen bg-background text-white flex flex-col relative overflow-x-hidden bg-mesh" dir="rtl">
      {!user && (
        <div className="fixed inset-0 z-[400] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-10 glass-card rounded-[40px] border-primary/20">
            <div className="text-center mb-10">
              <h1 className="text-7xl md:text-8xl text-easy-premium animate-float-soft">EASY</h1>
              <p className="text-sm text-primary font-black tracking-widest uppercase mt-4">نظام التدريب اللفظي الذكي</p>
            </div>
            <form onSubmit={handleAuth} className="space-y-4">
              <Input type="email" placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} className="h-14 rounded-2xl bg-white/5 border-white/10" />
              <Input type="password" placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} className="h-14 rounded-2xl bg-white/5 border-white/10" />
              <Button type="submit" disabled={isAuthLoading} className="w-full h-16 rounded-2xl bg-primary text-white font-black text-xl shadow-glow">
                {isAuthLoading ? <Loader2 className="animate-spin" /> : (authMode === 'login' ? "دخول 🚀" : "انضم الآن ✨")}
              </Button>
            </form>
            <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="mt-8 w-full text-white/30 hover:text-white transition-colors">
              {authMode === 'login' ? "سجل حساباً جديداً" : "لديك حساب؟ سجل دخولك"}
            </button>
          </Card>
        </div>
      )}

      {user && (
        <nav className="fixed top-0 left-0 w-full z-[100] px-4 md:px-8 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between p-3 glass-card rounded-[30px]">
            <div className="flex items-center gap-4">
              <Avatar className="w-12 h-12 border-2 border-primary/30">
                <AvatarImage src={user.photoURL || ''} />
                <AvatarFallback className="bg-primary/20 text-primary font-black">{user.email?.[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <p className="font-black text-white/90">{profile?.displayName || 'طالب EASY'}</p>
                <div className="flex items-center gap-2">
                   <Badge className="bg-primary text-white text-[10px] px-2 py-0">LVL {profile?.level || 1}</Badge>
                   <span className="text-[10px] text-white/30">{profile?.xp || 0} XP</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => openOverlay('themes')} variant="ghost" size="icon" className="w-10 h-10 rounded-xl text-primary"><Palette className="w-5 h-5" /></Button>
              <Button onClick={() => openOverlay('leaderboard')} variant="ghost" size="icon" className="w-10 h-10 rounded-xl text-amber-500"><Trophy className="w-5 h-5" /></Button>
              <Button onClick={() => openOverlay('favorites')} variant="ghost" size="icon" className="w-10 h-10 rounded-xl text-rose-500"><Heart className="w-5 h-5" /></Button>
              <Button onClick={() => openOverlay('errors')} variant="ghost" size="icon" className="w-10 h-10 rounded-xl text-blue-500"><History className="w-5 h-5" /></Button>
              {profile?.status === 'admin' && (
                <Button onClick={() => window.location.href = '/admin'} variant="ghost" size="icon" className="w-10 h-10 rounded-xl text-emerald-400 border border-emerald-500/20"><ShieldCheck className="w-5 h-5" /></Button>
              )}
              <Button onClick={() => signOut(auth)} variant="ghost" size="icon" className="w-10 h-10 rounded-xl text-destructive"><LogOut className="w-5 h-5" /></Button>
            </div>
          </div>
        </nav>
      )}

      <div className="container mx-auto px-4 pt-32 md:pt-48 pb-10 text-center space-y-6 relative z-10">
        <h1 className="text-7xl sm:text-9xl md:text-[12rem] text-easy-premium animate-in fade-in slide-in-from-top-10 duration-1000">
          EASY
        </h1>
        <p className="text-xl md:text-3xl font-black text-white/40 tracking-wide animate-pulse">تغلّب على نفسك <span className="text-white glow-text italic">كل يوم</span> 💎</p>
        <div className="max-w-2xl mx-auto pt-6 relative group">
          <Search className="absolute right-6 top-1/2 -translate-y-1/2 text-white/20 w-6 h-6" />
          <Input placeholder="ابحث عن نموذج تدريبي..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-16 w-full rounded-2xl bg-white/[0.02] border-white/10 pr-16 text-xl font-bold transition-all focus:border-primary/40" />
        </div>
      </div>

      <section className="container mx-auto px-4 md:px-8 pb-32 grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
        {filteredSections.map((section) => (
          <Card key={section.firebaseId || section.id} className="group glass-card rounded-[40px] p-8 md:p-10 relative overflow-hidden border-white/5">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-8 relative z-10">
              <div className="text-center sm:text-right space-y-4">
                <div className="flex items-center justify-center sm:justify-start gap-3">
                  <Badge className="bg-primary/20 text-primary border-none font-black">نموذج {section.id}</Badge>
                  {isNewSection(section) && <Badge className="bg-amber-500/20 text-amber-500 border-none animate-pulse">جديد ✨</Badge>}
                </div>
                <h2 className="text-2xl md:text-4xl font-black group-hover:text-primary transition-colors">{section.title}</h2>
                <div className="flex justify-center sm:justify-start items-center gap-6 text-white/20 text-sm font-bold">
                  <span className="flex items-center gap-2"><Zap className="w-4 h-4" /> {section.questions?.length || 0} سؤال</span>
                  <span className="flex items-center gap-2"><History className="w-4 h-4" /> {section.duration} دقيقة</span>
                </div>
              </div>
              <Button onClick={() => { setSelectedSection(section); setActiveView('practice'); }} className="w-full sm:w-auto h-20 px-10 rounded-3xl text-2xl font-black bg-primary text-white shadow-xl hover:scale-105 transition-all">
                ابدأ <ArrowRight className="mr-3 w-8 h-8" />
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
              <h2 className="text-3xl font-black">{activeOverlay === 'themes' ? "مركز الثيمات" : activeOverlay === 'leaderboard' ? "نخبة EASY" : activeOverlay === 'errors' ? "سجل الأخطاء" : "المفضلة"}</h2>
              <Button variant="ghost" size="icon" className="rounded-full w-12 h-12" onClick={() => setActiveOverlay(null)}><X className="w-8 h-8" /></Button>
            </div>
            <ScrollArea className="flex-1 p-8">
              {activeOverlay === 'themes' ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  {THEMES.map((t) => (
                    <button key={t.name} onClick={() => changeTheme(t.value)} className={cn("p-6 rounded-[30px] glass-card flex flex-col items-center gap-4 transition-all hover:scale-105", profile?.theme === t.value && "border-primary shadow-glow")}>
                      <div className="w-16 h-16 rounded-full" style={{ backgroundColor: t.color }} />
                      <span className="font-black text-sm">{t.name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {overlayData.map((item, idx) => (
                    <div key={idx} className="p-6 glass-card rounded-[30px] border-white/5 flex justify-between items-center">
                      <div className="flex items-center gap-6">
                         <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-black">{idx + 1}</div>
                         <div>
                            <p className="font-black text-lg">{item.displayName || item.questionData?.question || item.question}</p>
                            <p className="text-white/20 text-xs">{item.xp ? `${item.xp} XP` : item.questionData?.sectionTitle || "مراجعة"}</p>
                         </div>
                      </div>
                      {activeOverlay === 'errors' && <Button variant="ghost" size="icon" onClick={() => deleteErrorLog(item.id)} className="text-destructive"><Trash2 className="w-5 h-5" /></Button>}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </Card>
        </div>
      )}

      <footer className="text-center py-20 opacity-20 space-y-4">
        <p className="text-2xl tracking-[0.5em] font-black uppercase">DR.MAHMOUD ABD EL RAZEK</p>
        <p className="text-xs font-bold uppercase tracking-widest">Easy Prep Master &copy; 2024</p>
      </footer>
    </main>
  );
}
