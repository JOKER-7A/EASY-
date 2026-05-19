'use client';

import React, { useState, useEffect } from 'react';
import { sections as staticSections, Section, Question } from '@/lib/practice-data';
import { getSectionsFromDb, getUserProfile, getLeaderboard, getErrorLogs, updateUserProfileName, isDisplayNameTaken, updateUserTheme } from '@/lib/db-service';
import PracticeSession from '@/components/PracticeSession';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  LayoutDashboard,
  Loader2,
  PlayCircle,
  Zap,
  Search,
  Trophy,
  Star,
  History,
  LogOut,
  X,
  User as UserIcon,
  Edit2,
  Save,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  Palette,
  Settings as SettingsIcon
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
  const [allSections, setAllSections] = useState<Section[]>([]);
  const [filteredSections, setFilteredSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [loading, setLoading] = useState(true);
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
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const p = await getUserProfile(u.uid, u.email || '', u.displayName || '');
        setProfile(p);
        setNewDisplayName(p.displayName || '');
        if (p.theme) {
          document.body.setAttribute('data-theme', p.theme);
        }
        if (!p.displayName) {
          setActiveOverlay('welcome-name');
        }
      } else {
        setProfile(null);
        document.body.removeAttribute('data-theme');
      }
      setIsAuthLoading(false);
    });

    const fetchAllData = async () => {
      try {
        const dbSections = await getSectionsFromDb();
        const combined = [...dbSections];
        staticSections.forEach(s => {
          if (!combined.find(c => Number(c.id) === Number(s.id))) {
            combined.push(s);
          }
        });
        combined.sort((a, b) => Number(b.id) - Number(a.id));
        setAllSections(combined);
        setFilteredSections(combined);
      } catch (e) {
        setAllSections(staticSections);
        setFilteredSections(staticSections);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = searchQuery.toLowerCase();
    const filtered = allSections.filter(s => 
      s.id.toString().includes(q) || 
      s.title.toLowerCase().includes(q) ||
      s.questions.some(question => 
        question.question.toLowerCase().includes(q) || 
        question.correct.toLowerCase().includes(q)
      )
    );
    setFilteredSections(filtered);
  }, [searchQuery, allSections]);

  const refreshProfile = async () => {
    if (user) {
      const p = await getUserProfile(user.uid);
      setProfile(p);
    }
  };

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

  const handleUpdateName = async (isFirstTime = false) => {
    if (!user || !newDisplayName.trim()) return;
    if (newDisplayName.length < 3) {
      toast({ title: "الاسم قصير جداً (3 أحرف على الأقل)", variant: "destructive" });
      return;
    }

    setIsUpdatingName(true);
    try {
      const taken = await isDisplayNameTaken(newDisplayName, user.uid);
      if (taken) {
        toast({ title: "هذا الاسم مستخدم بالفعل، اختر اسماً آخر", variant: "destructive" });
        setIsUpdatingName(false);
        return;
      }
      await updateUserProfileName(user.uid, newDisplayName);
      await updateProfile(user, { displayName: newDisplayName });
      await refreshProfile();
      setActiveOverlay(null);
      toast({ title: "تم الحفظ بنجاح ✅" });
    } catch (error: any) {
      toast({ title: "فشل تحديث الاسم", variant: "destructive" });
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleThemeChange = async (themeId: string) => {
    if (!user) return;
    document.body.setAttribute('data-theme', themeId);
    await updateUserTheme(user.uid, themeId);
    setProfile(prev => ({ ...prev, theme: themeId }));
    toast({ title: "تم تحديث الثيم بنجاح ✨" });
  };

  const openLeaderboard = async () => {
    setLeaderboardData([]);
    setActiveOverlay('leaderboard');
    const data = await getLeaderboard();
    setLeaderboardData(data);
  };

  const openErrorLogs = async () => {
    if (!user) return;
    setErrorLogsData([]);
    setActiveOverlay('errors');
    const data = await getErrorLogs(user.uid);
    setErrorLogsData(data);
  };

  const openFavorites = async () => {
    if (!user) return;
    await refreshProfile();
    setActiveOverlay('favorites');
  };

  if (!mounted || isAuthLoading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Loader2 className="w-12 h-12 text-primary animate-spin" />
    </div>
  );

  if (!user) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.15),transparent_70%)]" />
        <Card className="w-full max-w-xl p-8 md:p-14 glass border-white/5 rounded-[40px] md:rounded-[60px] shadow-2xl relative z-10 animate-in fade-in zoom-in duration-700">
          <div className="text-center mb-10 md:mb-14 group">
            <h1 className="text-8xl md:text-[10rem] text-easy-premium text-shine mb-4 transition-transform group-hover:scale-105 duration-700">
              EASY
            </h1>
            <p className="text-lg md:text-xl text-primary font-bold tracking-[0.3em] opacity-80 uppercase">The Elite Training Portal</p>
          </div>
          
          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-4">
              <Input 
                type="email" 
                placeholder="البريد الإلكتروني" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="h-14 md:h-16 rounded-2xl bg-white/5 border-white/10 text-white text-lg placeholder:text-white/20 focus:border-primary/50 transition-all pr-6"
                required
              />
              <Input 
                type="password" 
                placeholder="كلمة المرور" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                className="h-14 md:h-16 rounded-2xl bg-white/5 border-white/10 text-white text-lg placeholder:text-white/20 focus:border-primary/50 transition-all pr-6"
                required
              />
            </div>
            <Button type="submit" className="w-full h-16 md:h-20 rounded-2xl md:rounded-[30px] bg-primary text-white font-black text-xl md:text-2xl shadow-[0_0_30px_rgba(168,85,247,0.4)] hover:scale-[1.02] active-press transition-all">
              {authMode === 'login' ? "دخول 🚀" : "بدء الرحلة ✨"}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="text-white/40 hover:text-primary font-bold text-base md:text-lg transition-colors underline-offset-8 hover:underline"
            >
              {authMode === 'login' ? "لا تملك حساباً؟ انضم إلينا" : "لديك حساب؟ سجل دخولك"}
            </button>
          </div>
        </Card>
      </main>
    );
  }

  const renderOverlay = () => {
    if (!activeOverlay) return null;

    let content = null;
    let title = "";
    let icon = null;

    if (activeOverlay === 'leaderboard') {
      title = "نخبة EASY";
      icon = <Trophy className="w-8 h-8 md:w-12 md:h-12 text-primary neon-text-purple" />;
      content = (
        <div className="space-y-4 md:space-y-6">
          {leaderboardData.length === 0 ? (
            <div className="flex justify-center py-20"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>
          ) : (
            leaderboardData.map((p, idx) => (
              <div key={p.id} className="flex items-center justify-between p-5 md:p-8 bg-white/[0.03] rounded-[30px] border border-white/5 hover:border-primary/30 transition-all group active-press">
                <div className="flex items-center gap-4 md:gap-8">
                  <div className={cn(
                    "w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center font-black text-xl md:text-2xl shadow-xl",
                    idx === 0 ? "bg-primary text-white shadow-primary/20" : 
                    idx === 1 ? "bg-white/20 text-white" :
                    idx === 2 ? "bg-white/10 text-white" : "bg-white/5 text-white/40"
                  )}>
                    {idx + 1}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                      <UserIcon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-xl md:text-2xl font-black text-white group-hover:text-primary transition-colors">{p.displayName || 'مستكشف'}</h4>
                      <span className="text-[10px] text-primary font-black tracking-tighter uppercase">Level {p.level}</span>
                    </div>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-2xl md:text-4xl font-black text-white">{Math.round(p.xp)} <span className="text-sm text-white/30">XP</span></p>
                </div>
              </div>
            ))
          )}
        </div>
      );
    } else if (activeOverlay === 'errors') {
      title = "مختبر الأخطاء";
      icon = <History className="w-8 h-8 md:w-12 md:h-12 text-destructive" />;
      content = (
        <div className="space-y-6 md:space-y-10">
          {errorLogsData.length === 0 ? (
            <div className="text-center py-32 space-y-4">
              <Sparkles className="w-20 h-20 text-white/5 mx-auto" />
              <p className="text-white/20 text-2xl font-black">سجلك نظيف تماماً 🚀</p>
            </div>
          ) : (
            errorLogsData.map((log, idx) => (
              <Card key={idx} className="p-8 md:p-12 glass border-destructive/20 rounded-[40px] space-y-6 hover:border-destructive/40 transition-all">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-2 flex-1">
                    <Badge className="bg-white/5 text-white/40 px-4 py-1">{log.questionData.sectionTitle || 'نموذج عام'}</Badge>
                    <h4 className="text-xl md:text-3xl font-black leading-tight text-white/90">{log.questionData.question}</h4>
                  </div>
                  <div className="bg-destructive/10 text-destructive border border-destructive/20 px-4 py-2 rounded-2xl font-black text-sm shrink-0">
                    تكرر {log.count}
                  </div>
                </div>
                <div className="p-5 bg-green-500/10 rounded-3xl border border-green-500/20">
                  <p className="text-xs text-green-500 font-bold mb-2 uppercase tracking-widest">التصحيح النموذجي</p>
                  <p className="text-xl md:text-2xl font-black text-white">{log.questionData.correct}</p>
                </div>
              </Card>
            ))
          )}
        </div>
      );
    } else if (activeOverlay === 'themes') {
      title = "تغيير مظهر المنصة";
      icon = <Palette className="w-8 h-8 md:w-12 md:h-12 text-primary" />;
      content = (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => handleThemeChange(t.id)}
              className={cn(
                "p-8 rounded-[30px] border-2 transition-all active-press flex items-center justify-between group",
                profile?.theme === t.id ? 'border-primary bg-primary/20' : 'border-white/5 bg-white/[0.02] hover:border-primary/40'
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn("w-10 h-10 rounded-full shadow-lg", t.color)} />
                <span className="text-xl font-black">{t.name}</span>
              </div>
              {profile?.theme === t.id && <CheckCircle2 className="w-6 h-6 text-primary" />}
            </button>
          ))}
        </div>
      );
    } else if (activeOverlay === 'edit-name' || activeOverlay === 'welcome-name') {
      title = activeOverlay === 'welcome-name' ? "مرحباً في عالم EASY" : "تعديل الهوية الرقمية";
      icon = <Sparkles className="w-8 h-8 md:w-12 md:h-12 text-primary neon-text-purple" />;
      content = (
        <div className="space-y-10 py-10">
          <div className="space-y-6">
            <label className="text-white/60 font-black text-xl md:text-2xl block text-center">
              {activeOverlay === 'welcome-name' ? 'أدخل الاسم الذي سيخلد في لوحة الصدارة:' : 'أدخل اسمك الجديد:'}
            </label>
            <Input 
              placeholder="الاسم المستعار..." 
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.target.value)}
              className="h-20 rounded-3xl bg-white/5 border-white/10 text-white text-3xl text-center focus:border-primary transition-all gold-glow"
            />
          </div>
          <Button 
            onClick={() => handleUpdateName(activeOverlay === 'welcome-name')} 
            disabled={isUpdatingName}
            className="w-full h-20 rounded-[40px] bg-primary text-white font-black text-2xl shadow-[0_0_40px_rgba(168,85,247,0.3)] hover:scale-105 active-press transition-all"
          >
            {isUpdatingName ? <Loader2 className="animate-spin" /> : <><CheckCircle2 className="ml-3 w-8 h-8" /> تأكيد الهوية</>}
          </Button>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-500">
        <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl" onClick={() => activeOverlay !== 'welcome-name' && setActiveOverlay(null)} />
        <Card className="w-full max-w-5xl max-h-[92vh] overflow-hidden glass border-white/5 rounded-[40px] md:rounded-[80px] shadow-[0_0_100px_rgba(0,0,0,1)] relative z-10 flex flex-col animate-in zoom-in-95 duration-500">
          <div className="p-8 md:p-14 border-b border-white/5 flex items-center justify-between sticky top-0 bg-black/40 backdrop-blur-3xl z-20">
            <div className="flex items-center gap-6">
              {icon}
              <h2 className="text-3xl md:text-6xl font-black text-white tracking-tighter">{title}</h2>
            </div>
            {activeOverlay !== 'welcome-name' && (
              <Button variant="ghost" size="icon" className="w-14 h-14 md:w-20 md:h-20 rounded-full hover:bg-white/10" onClick={() => setActiveOverlay(null)}>
                <X className="w-8 h-8 md:w-12 md:h-12 text-white/40" />
              </Button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-8 md:p-14 custom-scrollbar">
            {content}
          </div>
        </Card>
      </div>
    );
  };

  if (activeView === 'practice' && selectedSection) {
    return (
      <main className="min-h-screen p-0 bg-black theme-transition">
        <PracticeSession 
          section={selectedSection} 
          onExit={() => {
            setActiveView('landing');
            refreshProfile();
          }} 
        />
      </main>
    );
  }

  const xpProgress = (profile?.xp || 0) % 100;

  return (
    <main className="min-h-screen overflow-x-hidden relative bg-black text-white flex flex-col theme-transition">
      {renderOverlay()}
      
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,hsla(var(--primary),0.1),transparent_70%)] pointer-events-none" />

      {/* Premium Level HUD */}
      <div className="fixed top-6 left-6 md:top-12 md:left-12 z-[100] animate-in slide-in-from-left-10 duration-1000">
        <div className="glass p-3 pr-6 md:p-5 md:pr-14 rounded-[30px] border-primary/20 flex items-center gap-4 md:gap-7 shadow-[0_0_40px_rgba(0,0,0,0.5)] relative overflow-hidden group">
          <div className="w-12 h-12 md:w-20 md:h-20 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-xl md:text-3xl shadow-lg z-10 shrink-0">
            {profile?.level || 1}
          </div>
          <div className="space-y-1.5 md:space-y-2.5 z-10 flex flex-col min-w-0">
            <div className="flex justify-between items-end gap-3">
              <p className="text-[10px] md:text-xs font-black text-primary uppercase tracking-[0.2em] shrink-0">LV PROGRESS</p>
              <div className="flex items-center gap-3 overflow-hidden">
                <p className="text-xs md:text-sm font-bold text-white truncate">{profile?.displayName || 'مستكشف'}</p>
                <button onClick={() => setActiveOverlay('edit-name')} className="text-white/20 hover:text-primary transition-colors shrink-0 active-press">
                  <Edit2 className="w-3 h-3 md:w-5 md:h-5" />
                </button>
              </div>
            </div>
            <div className="w-28 md:w-56 h-2 md:h-3 bg-white/5 rounded-full border border-white/5 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-1000 gold-glow"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
            <p className="text-[9px] md:text-[11px] text-white/30 font-black text-right tracking-widest">{xpProgress} / 100 XP</p>
          </div>
          <button 
            onClick={() => setActiveOverlay('themes')}
            className="absolute right-2 top-2 text-white/10 hover:text-primary transition-all active-press"
          >
            <Palette className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-8 py-10 max-w-7xl flex-1">
        <header className="text-center mb-20 md:mb-32 space-y-10 pt-24 md:pt-40">
          <div className="inline-flex items-center gap-3 px-6 py-2 md:px-12 md:py-4 rounded-full glass border-primary/20 text-primary font-black text-xs md:text-lg mb-6 animate-float">
            <Zap className="w-4 h-4 md:w-6 md:h-6 fill-primary" /> EASY PREP 3.0 OLED
          </div>
          
          <h1 className="text-8xl md:text-[15rem] text-easy-premium text-shine leading-none mb-6">
            EASY
          </h1>
          
          <p className="text-xl md:text-4xl font-black text-white/60 leading-tight max-w-4xl mx-auto px-4">
            التحدي الحقيقي هو أن تتفوق على <span className="text-white">نفسك</span> كل يوم 💎
          </p>

          <div className="max-w-3xl mx-auto pt-14 md:pt-20 px-4 relative group">
            <Search className="absolute right-8 top-1/2 -translate-y-1/2 w-6 h-6 md:w-10 md:h-10 text-white/20 group-focus-within:text-primary transition-colors z-10" />
            <Input 
              placeholder="ابحث عن رقم القسم، عنوان، أو سؤال..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-16 md:h-24 w-full rounded-3xl md:rounded-[45px] bg-white/5 border-2 border-white/5 pr-16 md:pr-24 text-lg md:text-3xl font-bold focus:border-primary/40 focus:bg-white/[0.08] transition-all shadow-2xl"
            />
          </div>

          <div className="flex flex-wrap justify-center gap-4 md:gap-8 pt-10">
            <Button onClick={openFavorites} className="h-14 md:h-20 px-8 md:px-14 rounded-2xl md:rounded-[40px] glass border-accent/30 text-accent font-black text-sm md:text-2xl hover:scale-105 active-press transition-all">
              <Star className="ml-3 w-5 h-5 md:w-8 md:h-8 fill-accent" /> المفضلة
            </Button>
            <Button onClick={openErrorLogs} className="h-14 md:h-20 px-8 md:px-14 rounded-2xl md:rounded-[40px] glass border-destructive/30 text-destructive font-black text-sm md:text-2xl hover:scale-105 active-press transition-all">
              <History className="ml-3 w-5 h-5 md:w-8 md:h-8" /> الأخطاء
            </Button>
            <Button onClick={openLeaderboard} className="h-14 md:h-20 px-8 md:px-14 rounded-2xl md:rounded-[40px] glass border-white/10 text-white font-black text-sm md:text-2xl hover:scale-105 active-press transition-all">
              <Trophy className="ml-3 w-5 h-5 md:w-8 md:h-8" /> المتصدرين
            </Button>
          </div>
        </header>

        <section className="space-y-12 md:space-y-20 mb-32 md:mb-48">
          <div className="flex items-center justify-between px-4">
            <h2 className="text-3xl md:text-6xl font-black text-white tracking-tighter">النماذج المتاحة</h2>
            <Badge className="bg-primary/10 text-primary text-sm md:text-2xl px-6 md:px-10 py-2 md:py-4 border border-primary/20 rounded-full font-black">
              {loading ? <Loader2 className="animate-spin" /> : filteredSections.length}
            </Badge>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-40">
              <Loader2 className="w-16 h-16 md:w-24 md:h-24 text-primary animate-spin" />
            </div>
          ) : filteredSections.length === 0 ? (
            <div className="text-center py-40 glass rounded-[60px] border-dashed border-white/5">
              <p className="text-2xl md:text-4xl font-black text-white/10 uppercase tracking-widest">No results found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-14">
              {filteredSections.map((section) => (
                <Card 
                  key={section.firebaseId || section.id} 
                  className="group relative bg-white/[0.02] border border-white/5 rounded-[40px] md:rounded-[70px] p-8 md:p-14 shadow-2xl overflow-hidden transition-all hover:border-primary/50 hover:bg-white/[0.04] duration-700 active-press"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8">
                    <div className="space-y-3">
                      <div className="flex items-center gap-4">
                        <span className="bg-primary/20 text-primary px-5 py-2 rounded-xl font-black text-lg md:text-2xl tracking-widest uppercase">
                          🔥 القسم {section.id} 🔥
                        </span>
                      </div>
                      <h2 className="text-3xl md:text-5xl font-black text-white group-hover:text-primary transition-colors leading-tight line-clamp-2">
                        {section.title}
                      </h2>
                      <div className="flex items-center gap-4 text-white/30 font-bold">
                        <Zap className="w-4 h-4 text-accent" />
                        <span>{section.questions.length} Question</span>
                      </div>
                    </div>
                    <Button 
                      onClick={() => {
                        setSelectedSection(section);
                        setActiveView('practice');
                      }} 
                      className="w-full sm:w-auto h-20 md:h-32 px-10 md:px-16 rounded-[30px] md:rounded-[50px] text-2xl md:text-4xl font-black bg-primary text-white shadow-lg group-hover:scale-110 active-press transition-all"
                    >
                      ابدأ <ChevronRight className="mr-2 w-8 h-8 md:w-12 md:h-12" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        <footer className="text-center py-20 border-t border-white/5 space-y-10">
          <div className="flex flex-wrap justify-center gap-10 md:gap-20 items-center">
            <Button 
              variant="ghost" 
              onClick={() => window.location.href = '/admin'} 
              className="text-white/20 hover:text-white transition-colors font-black text-lg md:text-2xl"
            >
              <LayoutDashboard className="ml-3 w-6 h-6 md:w-8 md:h-8" /> المشرف
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => signOut(auth)}
              className="text-destructive/30 hover:text-destructive transition-colors font-black text-lg md:text-2xl"
            >
              <LogOut className="ml-3 w-6 h-6 md:w-8 md:h-8" /> خروج
            </Button>
          </div>
          <div className="pt-10">
            <p className="signature-text text-2xl md:text-4xl">
              DR.MAHMOUD ABD EL RAZEK
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}