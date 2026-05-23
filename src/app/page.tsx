
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { sections as staticSections, Section } from '@/lib/practice-data';
import { 
  getSectionsFromDb, 
  getUserProfile, 
  getLeaderboard, 
  getErrorLogs, 
  updateUserProfileName, 
  isDisplayNameTaken, 
  updateUserTheme 
} from '@/lib/db-service';
import PracticeSession from '@/components/PracticeSession';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { 
  LayoutDashboard,
  Loader2,
  Zap,
  Search,
  Trophy,
  Star,
  History,
  LogOut,
  X,
  User as UserIcon,
  Edit2,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  Palette
} from 'lucide-react';
import { auth } from '@/lib/firebase';
import { 
  onAuthStateChanged, 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type OverlayType = 'favorites' | 'errors' | 'leaderboard' | 'edit-name' | 'welcome-name' | 'themes' | null;

const THEMES = [
  { id: 'default', name: 'Original Purple', color: 'bg-[#9333ea]' },
  { id: 'blue', name: 'Neon Blue', color: 'bg-[#00d2ff]' },
  { id: 'red', name: 'Gaming Red', color: 'bg-[#ff0000]' },
  { id: 'purple', name: 'Vibrant OLED', color: 'bg-[#d946ef]' },
  { id: 'gold', name: 'Dark Premium', color: 'bg-[#E6AC00]' },
];

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [activeView, setActiveView] = useState<'landing' | 'practice'>('landing');
  const [allSections, setAllSections] = useState<Section[]>(staticSections);
  const [filteredSections, setFilteredSections] = useState<Section[]>(staticSections);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [activeOverlay, setActiveOverlay] = useState<OverlayType>(null);
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [errorLogsData, setErrorLogsData] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      try {
        setUser(u);
        if (u) {
          const p = await getUserProfile(u.uid, u.email || '', u.displayName || '');
          setProfile(p);
          setNewDisplayName(p?.displayName || '');
          if (p?.theme) {
            document.body.setAttribute('data-theme', p.theme);
          }
          if (!p?.displayName && mounted) {
            setActiveOverlay('welcome-name');
          }
        } else {
          setProfile(null);
          document.body.removeAttribute('data-theme');
        }
      } catch (err) {
        console.error("Auth process error:", err);
      } finally {
        setIsAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, [mounted]);

  useEffect(() => {
    const fetchSections = async () => {
      try {
        setLoading(true);
        const data = await getSectionsFromDb();
        setAllSections(data);
        setFilteredSections(data);
      } catch (e) {
        console.error("Data fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchSections();
  }, []);

  useEffect(() => {
    const q = searchQuery.toLowerCase();
    const filtered = allSections.filter(s => 
      s.id.toString().includes(q) || 
      s.title.toLowerCase().includes(q)
    );
    setFilteredSections(filtered);
  }, [searchQuery, allSections]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      try {
        const p = await getUserProfile(user.uid);
        setProfile(p);
      } catch (err) {
        console.error("Profile refresh error:", err);
      }
    }
  }, [user]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: "مرحباً بعودتك! 🚀" });
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await getUserProfile(cred.user.uid, email, '');
        toast({ title: "تم إنشاء حسابك بنجاح ✅" });
      }
    } catch (error: any) {
      toast({ title: "حدث خطأ", description: error.message, variant: "destructive" });
    }
  };

  const handleUpdateName = async () => {
    if (!user || !newDisplayName.trim()) return;
    setIsUpdatingName(true);
    try {
      const taken = await isDisplayNameTaken(newDisplayName, user.uid);
      if (taken) {
        toast({ title: "هذا الاسم مستخدم بالفعل", variant: "destructive" });
        return;
      }
      await updateUserProfileName(user.uid, newDisplayName);
      await updateProfile(user, { displayName: newDisplayName });
      await refreshProfile();
      setActiveOverlay(null);
      toast({ title: "تم تحديث الاسم بنجاح ✅" });
    } catch (error) {
      toast({ title: "فشل تحديث الاسم", variant: "destructive" });
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleThemeChange = async (themeId: string) => {
    if (!user) return;
    document.body.setAttribute('data-theme', themeId);
    await updateUserTheme(user.uid, themeId);
    setProfile((prev: any) => ({ ...prev, theme: themeId }));
    toast({ title: "تم تغيير المظهر ✨" });
  };

  const openOverlay = async (type: OverlayType) => {
    setActiveOverlay(type);
    try {
      if (type === 'leaderboard') {
        const data = await getLeaderboard();
        setLeaderboardData(data);
      } else if (type === 'errors' && user) {
        const data = await getErrorLogs(user.uid);
        setErrorLogsData(data);
      }
    } catch (err) {
      console.error("Overlay fetch error:", err);
    }
  };

  if (activeView === 'practice' && selectedSection) {
    return (
      <main className="min-h-screen p-0 bg-black">
        <PracticeSession section={selectedSection} onExit={() => { setActiveView('landing'); refreshProfile(); }} />
      </main>
    );
  }

  const currentLevelXp = (profile?.xp || 0) % 100;

  return (
    <main className="min-h-screen relative bg-black text-white flex flex-col theme-transition">
      {mounted && activeOverlay && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl" onClick={() => activeOverlay !== 'welcome-name' && setActiveOverlay(null)} />
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden glass border-white/5 rounded-[40px] relative z-10 flex flex-col">
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-4xl font-black text-white">
                {activeOverlay === 'leaderboard' ? "نخبة EASY" : 
                 activeOverlay === 'errors' ? "مختبر الأخطاء" : 
                 activeOverlay === 'edit-name' || activeOverlay === 'welcome-name' ? "تعديل الهوية" : "المظهر"}
              </h2>
              {activeOverlay !== 'welcome-name' && <Button variant="ghost" onClick={() => setActiveOverlay(null)}><X className="w-8 h-8" /></Button>}
            </div>
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {activeOverlay === 'leaderboard' && (
                <div className="space-y-4">
                  {leaderboardData.map((p, idx) => (
                    <div key={p.id} className="flex items-center justify-between p-6 bg-white/[0.03] rounded-3xl border border-white/5">
                      <div className="flex items-center gap-6">
                        <span className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-black", idx < 3 ? "bg-primary text-white" : "bg-white/10")}>{idx + 1}</span>
                        <span className="text-xl font-black">{p.displayName || 'مستكشف EASY'}</span>
                      </div>
                      <span className="text-2xl font-black text-primary">{Math.round(p.xp || 0)} XP</span>
                    </div>
                  ))}
                </div>
              )}
              {activeOverlay === 'errors' && (
                <div className="space-y-6">
                  {errorLogsData.length === 0 ? <p className="text-center py-20 opacity-30">سجلك نظيف تماماً 🚀</p> : 
                    errorLogsData.map((log, idx) => (
                      <Card key={idx} className="p-8 glass border-destructive/20 rounded-3xl space-y-4">
                        <Badge className="bg-destructive/10 text-destructive">{log.questionData?.sectionTitle}</Badge>
                        <h4 className="text-2xl font-black">{log.questionData?.question}</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-green-500/10 rounded-2xl border border-green-500/20">
                            <p className="text-green-500 font-black">التصحيح: {log.questionData?.correct}</p>
                          </div>
                          <div className="p-4 bg-red-500/10 rounded-2xl border border-red-500/20">
                            <p className="text-red-500 font-black">إجابتك: {log.questionData?.userAnswer || 'بدون إجابة'}</p>
                          </div>
                        </div>
                      </Card>
                    ))
                  }
                </div>
              )}
              {(activeOverlay === 'edit-name' || activeOverlay === 'welcome-name') && (
                <div className="space-y-8 py-6">
                  <Input 
                    placeholder="الاسم الجديد..." 
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    className="h-20 rounded-3xl bg-white/5 border-white/10 text-white text-3xl text-center"
                  />
                  <Button onClick={handleUpdateName} disabled={isUpdatingName} className="w-full h-16 rounded-2xl bg-primary text-white font-black text-xl">
                    {isUpdatingName ? <Loader2 className="animate-spin" /> : "تأكيد الهوية ✅"}
                  </Button>
                </div>
              )}
              {activeOverlay === 'themes' && (
                <div className="grid grid-cols-2 gap-4">
                  {THEMES.map((t) => (
                    <button key={t.id} onClick={() => handleThemeChange(t.id)} className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:border-primary transition-all flex items-center gap-4">
                      <div className={cn("w-8 h-8 rounded-full", t.color)} />
                      <span className="font-black">{t.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {!user && !isAuthLoading && (
        <div className="fixed inset-0 z-[300] bg-black flex items-center justify-center p-4">
          <Card className="w-full max-w-xl p-8 md:p-14 glass border-white/5 rounded-[40px] shadow-2xl animate-in fade-in duration-700">
            <div className="text-center mb-10">
              <h1 className="text-8xl md:text-[10rem] text-easy-premium mb-4">EASY</h1>
              <p className="text-lg text-primary font-bold tracking-widest opacity-80 uppercase">The Elite Training Portal</p>
            </div>
            <form onSubmit={handleAuth} className="space-y-6">
              <Input type="email" placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} className="h-16 rounded-2xl bg-white/5 border-white/10" required />
              <Input type="password" placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} className="h-16 rounded-2xl bg-white/5 border-white/10" required />
              <Button type="submit" className="w-full h-16 rounded-2xl bg-primary text-white font-black text-xl">
                {authMode === 'login' ? "دخول 🚀" : "بدء الرحلة ✨"}
              </Button>
            </form>
            <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="mt-8 w-full text-white/40 hover:text-primary transition-colors font-bold">
              {authMode === 'login' ? "لا تملك حساباً؟ انضم إلينا" : "لديك حساب؟ سجل دخولك"}
            </button>
          </Card>
        </div>
      )}

      {isAuthLoading ? (
        <div className="fixed inset-0 bg-black flex items-center justify-center z-[400]">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </div>
      ) : (
        <div className="relative z-10 container mx-auto px-4 md:px-8 py-20 max-w-7xl">
          {/* HUD UI */}
          <div className="fixed top-8 left-8 z-[100] hidden md:block">
            <div className="glass p-5 pr-14 rounded-[30px] border-primary/20 flex items-center gap-7 relative group">
              <div className="w-20 h-20 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-3xl shadow-lg">
                {profile?.level || 1}
              </div>
              <div className="space-y-2 flex flex-col min-w-[200px]">
                <div className="flex justify-between items-end">
                  <p className="text-xs font-black text-primary uppercase tracking-widest">PROGRESS</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold opacity-60">{profile?.displayName || 'مستكشف EASY'}</p>
                    <button onClick={() => openOverlay('edit-name')} className="text-white/20 hover:text-primary transition-colors"><Edit2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <Progress value={currentLevelXp} className="h-3 bg-white/5 rounded-full" />
              </div>
              <button onClick={() => openOverlay('themes')} className="absolute left-2 top-2 text-white/20 hover:text-primary"><Palette className="w-5 h-5" /></button>
            </div>
          </div>

          <header className="text-center mb-32 space-y-12 pt-20">
            <div className="inline-flex items-center gap-3 px-10 py-4 rounded-full glass border-primary/20 text-primary font-black animate-float">
              <Zap className="w-6 h-6 fill-primary" /> EASY PREP 3.0
            </div>
            <h1 className="text-[10rem] md:text-[15rem] text-easy-premium text-shine leading-none text-center">EASY</h1>
            <p className="text-3xl font-black text-white/60 max-w-4xl mx-auto">التحدي الحقيقي هو أن تتفوق على <span className="text-white">نفسك</span> كل يوم 💎</p>

            <div className="max-w-3xl mx-auto pt-20 px-4 relative group">
              <Search className="absolute right-12 top-1/2 -translate-y-1/2 w-10 h-10 text-white/20 group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="ابحث عن نموذج..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-24 w-full rounded-[45px] bg-white/5 border-2 border-white/5 pr-24 text-3xl font-bold"
              />
            </div>

            <div className="flex flex-wrap justify-center gap-8 pt-10">
              <Button onClick={() => openOverlay('errors')} className="h-20 px-14 rounded-[40px] glass border-destructive/30 text-destructive font-black text-2xl hover:scale-105 transition-all">
                <History className="ml-3 w-8 h-8" /> الأخطاء
              </Button>
              <Button onClick={() => openOverlay('leaderboard')} className="h-20 px-14 rounded-[40px] glass border-white/10 text-white font-black text-2xl hover:scale-105 transition-all">
                <Trophy className="ml-3 w-8 h-8" /> المتصدرين
              </Button>
            </div>
          </header>

          <section className="space-y-20 mb-48">
            <div className="flex items-center justify-between px-4">
              <h2 className="text-6xl font-black text-white tracking-tighter">النماذج المتاحة</h2>
              <Badge className="bg-primary/10 text-primary text-2xl px-10 py-4 border border-primary/20 rounded-full font-black">
                {loading ? <Loader2 className="animate-spin" /> : filteredSections.length}
              </Badge>
            </div>

            {loading && filteredSections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-40">
                <Loader2 className="w-24 h-24 text-primary animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-14">
                {filteredSections.map((section) => (
                  <Card 
                    key={section.firebaseId || section.id} 
                    className="group bg-white/[0.02] border border-white/5 rounded-[70px] p-14 shadow-2xl transition-all hover:border-primary/50 hover:bg-white/[0.04] duration-700"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-8">
                      <div className="space-y-3 text-right">
                        <span className="bg-primary/20 text-primary px-5 py-2 rounded-xl font-black text-2xl">🔥 القسم {section.id}</span>
                        <h2 className="text-4xl font-black text-white group-hover:text-primary transition-colors leading-tight line-clamp-1">
                          {section.title}
                        </h2>
                        <p className="text-white/30 font-bold">{section.questions?.length || 0} سؤال</p>
                      </div>
                      <Button 
                        onClick={() => { setSelectedSection(section); setActiveView('practice'); }} 
                        className="w-full sm:w-auto h-32 px-16 rounded-[50px] text-4xl font-black bg-primary text-white shadow-lg group-hover:scale-110 transition-all"
                      >
                        ابدأ <ChevronRight className="mr-2 w-12 h-12" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <footer className="text-center py-20 border-t border-white/5">
            <div className="flex flex-wrap justify-center gap-20 items-center mb-10">
              {profile?.role === 'admin' && (
                <Button onClick={() => window.location.href = '/admin'} variant="ghost" className="text-white/20 hover:text-white font-black text-2xl">
                  <LayoutDashboard className="ml-3 w-8 h-8" /> المشرف
                </Button>
              )}
              <Button onClick={() => signOut(auth)} variant="ghost" className="text-destructive/30 hover:text-destructive font-black text-2xl">
                <LogOut className="ml-3 w-8 h-8" /> خروج
              </Button>
            </div>
            <p className="text-4xl tracking-widest uppercase font-black opacity-50">DR.MAHMOUD ABD EL RAZEK</p>
          </footer>
        </div>
      )}
    </main>
  );
}
