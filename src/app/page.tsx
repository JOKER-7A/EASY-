'use client';

import React, { useState, useEffect } from 'react';
import { sections as staticSections, Section, Question } from '@/lib/practice-data';
import { getSectionsFromDb, getUserProfile, getLeaderboard, getErrorLogs, updateUserProfileName, isDisplayNameTaken } from '@/lib/db-service';
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
  Sparkles
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

type OverlayType = 'favorites' | 'errors' | 'leaderboard' | 'edit-name' | 'welcome-name' | null;

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
        if (!p.displayName) {
          setActiveOverlay('welcome-name');
        }
      } else {
        setProfile(null);
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
    <div className="min-h-screen bg-midnight flex items-center justify-center">
      <Loader2 className="w-12 h-12 text-goldenrod animate-spin" />
    </div>
  );

  if (!user) {
    return (
      <main className="min-h-screen bg-midnight flex items-center justify-center p-4 relative overflow-hidden">
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(230,172,0,0.1),transparent_70%)]" />
        <Card className="w-full max-w-xl p-6 md:p-12 glass border-goldenrod/30 rounded-[30px] md:rounded-[60px] shadow-2xl relative z-10 animate-in fade-in zoom-in duration-500">
          <div className="text-center mb-8 md:mb-12 group">
            <h1 className="text-7xl md:text-9xl font-headline font-black text-luxury text-glow-luxury text-shine tracking-tighter mb-4 transition-transform group-hover:scale-105 duration-500">
              EASY
            </h1>
            <p className="text-lg md:text-2xl text-goldenrod font-bold tracking-[0.2em] opacity-80">بوابة العبور نحو التميز 🎯</p>
          </div>
          
          <form onSubmit={handleAuth} className="space-y-4 md:space-y-6">
            <Input 
              type="email" 
              placeholder="البريد الإلكتروني" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 md:h-16 rounded-2xl md:rounded-3xl bg-white/5 border-white/10 text-white text-lg md:text-xl pr-6"
              required
            />
            <Input 
              type="password" 
              placeholder="كلمة المرور" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 md:h-16 rounded-2xl md:rounded-3xl bg-white/5 border-white/10 text-white text-lg md:text-xl pr-6"
              required
            />
            <Button type="submit" className="w-full h-14 md:h-20 rounded-2xl md:rounded-[30px] bg-goldenrod text-midnight font-black text-xl md:text-2xl gold-glow hover:scale-[1.02] transition-all border-b-4 md:border-b-8 border-goldenrod/50">
              {authMode === 'login' ? "دخول 🚀" : "إنشاء حساب ✨"}
            </Button>
          </form>

          <div className="mt-6 md:mt-8 text-center">
            <button 
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="text-white/60 hover:text-goldenrod font-bold text-base md:text-lg transition-colors"
            >
              {authMode === 'login' ? "ليس لديك حساب؟ سجل الآن" : "لديك حساب بالفعل؟ سجل دخولك"}
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
      title = "المتصدرون";
      icon = <Trophy className="w-8 h-8 md:w-10 md:h-10 text-goldenrod" />;
      content = (
        <div className="space-y-4 md:space-y-6">
          {leaderboardData.length === 0 ? (
            <div className="flex justify-center py-10"><Loader2 className="w-10 h-10 animate-spin text-goldenrod" /></div>
          ) : (
            leaderboardData.map((p, idx) => (
              <div key={p.id} className="flex items-center justify-between p-4 md:p-6 bg-white/5 rounded-2xl md:rounded-3xl border border-white/10 hover:border-goldenrod/30 transition-all group">
                <div className="flex items-center gap-3 md:gap-6">
                  <div className={cn(
                    "w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-black text-lg md:text-xl",
                    idx === 0 ? "bg-goldenrod text-midnight gold-glow" : 
                    idx === 1 ? "bg-slate-300 text-midnight shadow-lg" :
                    idx === 2 ? "bg-amber-600 text-white shadow-lg" : "bg-white/10 text-white"
                  )}>
                    {idx + 1}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                      <UserIcon className="w-6 h-6 text-white/40" />
                    </div>
                    <div>
                      <h4 className="text-lg md:text-xl font-black text-white line-clamp-1 group-hover:text-goldenrod transition-colors">{p.displayName || 'مستكشف'}</h4>
                      <p className="text-[10px] md:text-xs text-goldenrod font-bold uppercase tracking-widest">LEVEL {p.level}</p>
                    </div>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-xl md:text-2xl font-black text-white">{Math.round(p.xp)} XP</p>
                </div>
              </div>
            ))
          )}
        </div>
      );
    } else if (activeOverlay === 'errors') {
      title = "سجل الأخطاء الدائم";
      icon = <History className="w-8 h-8 md:w-10 md:h-10 text-vermillion" />;
      content = (
        <div className="space-y-6 md:space-y-8">
          {errorLogsData.length === 0 ? (
            <p className="text-center py-20 text-white/20 text-xl md:text-2xl font-black">لا توجد أخطاء حالياً 🚀</p>
          ) : (
            errorLogsData.map((log, idx) => (
              <Card key={idx} className="p-6 md:p-8 glass border-vermillion/20 rounded-2xl md:rounded-[40px] space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1 flex-1">
                    <Badge className="bg-white/5 text-white/40">{log.questionData.sectionTitle || 'نموذج عام'}</Badge>
                    <h4 className="text-lg md:text-2xl font-black leading-tight">{log.questionData.question}</h4>
                  </div>
                  <Badge className="bg-vermillion/10 text-vermillion border-vermillion/20 shrink-0">تكرر {log.count} مرات</Badge>
                </div>
                <div className="p-3 md:p-4 bg-green-500/10 rounded-xl md:rounded-2xl border border-green-500/20">
                  <p className="text-xs md:text-sm text-green-500 font-bold mb-1">الإجابة الصحيحة:</p>
                  <p className="text-lg md:text-xl font-black">{log.questionData.correct}</p>
                </div>
              </Card>
            ))
          )}
        </div>
      );
    } else if (activeOverlay === 'favorites') {
      title = "الأسئلة المميزة";
      icon = <Star className="w-8 h-8 md:w-10 md:h-10 text-goldenrod fill-goldenrod" />;
      content = (
        <div className="space-y-6 md:space-y-8">
          {(!profile?.favorites || profile.favorites.length === 0) ? (
            <p className="text-center py-20 text-white/20 text-xl md:text-2xl font-black">القائمة فارغة ⭐</p>
          ) : (
            profile.favorites.map((q: any, idx: number) => (
              <Card key={idx} className="p-6 md:p-8 glass border-goldenrod/20 rounded-2xl md:rounded-[40px] space-y-4">
                <h4 className="text-lg md:text-2xl font-black leading-tight">{q.question}</h4>
                <div className="p-3 md:p-4 bg-goldenrod/10 rounded-xl md:rounded-2xl border border-goldenrod/20">
                  <p className="text-xs md:text-sm text-goldenrod font-bold mb-1">الإجابة:</p>
                  <p className="text-lg md:text-xl font-black">{q.correct}</p>
                </div>
              </Card>
            ))
          )}
        </div>
      );
    } else if (activeOverlay === 'edit-name' || activeOverlay === 'welcome-name') {
      title = activeOverlay === 'welcome-name' ? "مرحباً بك في EASY 🚀" : "تعديل الاسم";
      icon = activeOverlay === 'welcome-name' ? <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-goldenrod" /> : <Edit2 className="w-8 h-8 md:w-10 md:h-10 text-goldenrod" />;
      content = (
        <div className="space-y-8 py-10">
          <div className="space-y-4">
            <label className="text-white font-black text-xl">{activeOverlay === 'welcome-name' ? 'اختر اسمك المستعار الذي سيظهر للجميع:' : 'الاسم الجديد'}</label>
            <Input 
              placeholder="أدخل اسمك هنا..." 
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.target.value)}
              className="h-16 rounded-2xl bg-white/5 border-white/10 text-white text-2xl pr-6 focus:border-goldenrod/50 transition-all"
            />
            <p className="text-white/40 font-bold text-sm">سيظهر هذا الاسم في لوحة المتصدرين.</p>
          </div>
          <Button 
            onClick={() => handleUpdateName(activeOverlay === 'welcome-name')} 
            disabled={isUpdatingName}
            className="w-full h-20 rounded-3xl bg-goldenrod text-midnight font-black text-2xl gold-glow hover:scale-105 transition-all"
          >
            {isUpdatingName ? <Loader2 className="animate-spin" /> : <><CheckCircle2 className="ml-2" /> حفظ واستمرار</>}
          </Button>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-300">
        <div className="absolute inset-0 bg-midnight/95 backdrop-blur-2xl" onClick={() => activeOverlay !== 'welcome-name' && setActiveOverlay(null)} />
        <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden glass border-white/10 rounded-[30px] md:rounded-[60px] shadow-2xl relative z-10 flex flex-col animate-in zoom-in-95 duration-300">
          <div className="p-6 md:p-10 border-b border-white/10 flex items-center justify-between sticky top-0 bg-midnight/50 backdrop-blur-xl z-20">
            <div className="flex items-center gap-4 md:gap-6">
              {icon}
              <h2 className="text-2xl md:text-5xl font-black text-white">{title}</h2>
            </div>
            {activeOverlay !== 'welcome-name' && (
              <Button variant="ghost" size="icon" className="w-12 h-12 md:w-16 md:h-16 rounded-full hover:bg-white/10" onClick={() => setActiveOverlay(null)}>
                <X className="w-8 h-8 md:w-10 md:h-10" />
              </Button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
            {content}
          </div>
        </Card>
      </div>
    );
  };

  if (activeView === 'practice' && selectedSection) {
    return (
      <main className="min-h-screen p-0 bg-midnight">
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
    <main className="min-h-screen overflow-x-hidden relative bg-midnight text-white flex flex-col">
      {renderOverlay()}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(230,172,0,0.15),transparent_60%)] pointer-events-none" />
      
      <div className="fixed top-4 left-4 md:top-8 md:left-8 z-[100] animate-in slide-in-from-left-10 duration-700">
        <div className="glass p-2 pr-4 md:p-4 md:pr-10 rounded-full border-goldenrod/30 flex items-center gap-3 md:gap-5 gold-glow relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-goldenrod/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-goldenrod text-midnight flex items-center justify-center font-black text-lg md:text-xl shadow-xl z-10 shrink-0 animate-pulse">
            {profile?.level || 1}
          </div>
          <div className="space-y-1 md:space-y-1.5 z-10 flex flex-col min-w-0">
            <div className="flex justify-between items-end gap-2">
              <p className="text-[10px] md:text-xs font-black text-goldenrod/80 uppercase tracking-widest shrink-0">LVL</p>
              <div className="flex items-center gap-2 overflow-hidden">
                <p className="text-[10px] md:text-xs font-bold text-white/80 truncate">{profile?.displayName || 'مستكشف'}</p>
                <button onClick={() => setActiveOverlay('edit-name')} className="text-white/30 hover:text-goldenrod transition-colors shrink-0">
                  <Edit2 className="w-3 h-3 md:w-4 md:h-4" />
                </button>
              </div>
            </div>
            <div className="w-24 md:w-40 h-1.5 md:h-2 bg-white/5 rounded-full border border-white/10 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-goldenrod via-vermillion to-goldenrod transition-all duration-1000 shadow-[0_0_10px_rgba(230,172,0,0.5)]"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
            <p className="text-[8px] md:text-[10px] text-white/30 font-bold text-right">{xpProgress}/100 XP</p>
          </div>
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-6 py-10 max-w-7xl flex-1">
        <header className="text-center mb-16 md:mb-24 space-y-6 md:space-y-8 pt-16 md:pt-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 md:px-8 md:py-3 rounded-full glass border-goldenrod/30 text-goldenrod font-black text-sm md:text-lg mb-4 shadow-[0_0_30px_rgba(230,172,0,0.2)]">
            <Zap className="w-4 h-4 md:w-5 md:h-5 fill-goldenrod animate-pulse" /> منصة إيزي التعليمية 2.0
          </div>
          <div className="relative group cursor-default">
            <h1 className="text-7xl md:text-[12rem] font-headline font-black text-luxury text-glow-luxury text-shine tracking-tighter leading-none mb-4 transition-transform group-hover:scale-105 duration-700">
              EASY
            </h1>
          </div>
          <p className="text-xl md:text-4xl font-black text-white/80 leading-tight max-w-4xl mx-auto px-4">
            تعلّم بذكاء.. أهم شيء الفهم وليس الحفظ 💡
          </p>

          <div className="max-w-2xl mx-auto pt-8 md:pt-10 px-2 relative group">
            <Search className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 md:w-8 md:h-8 text-goldenrod/50 group-focus-within:text-goldenrod transition-colors z-10" />
            <Input 
              placeholder="ابحث عن نموذج، عنوان، أو سؤال..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-16 md:h-20 w-full rounded-2xl md:rounded-[30px] bg-white/5 border-2 border-white/10 pr-14 md:pr-16 text-lg md:text-2xl font-bold focus:border-goldenrod/50 focus:bg-white/10 transition-all shadow-xl"
            />
          </div>

          <div className="flex flex-wrap justify-center gap-3 md:gap-6 pt-8">
            <Button onClick={openFavorites} className="h-12 md:h-16 px-6 md:px-10 rounded-xl md:rounded-3xl glass border-goldenrod/40 text-goldenrod font-black text-sm md:text-xl gold-glow hover:scale-105 transition-all">
              <Star className="ml-2 w-4 h-4 md:w-6 md:h-6 fill-goldenrod" /> المفضلة
            </Button>
            <Button onClick={openErrorLogs} className="h-12 md:h-16 px-6 md:px-10 rounded-xl md:rounded-3xl glass border-vermillion/40 text-vermillion font-black text-sm md:text-xl vermillion-glow hover:scale-105 transition-all">
              <History className="ml-2 w-4 h-4 md:w-6 md:h-6" /> سجل الأخطاء
            </Button>
            <Button onClick={openLeaderboard} className="h-12 md:h-16 px-6 md:px-10 rounded-xl md:rounded-3xl glass border-white/10 text-white font-black text-sm md:text-xl hover:scale-105 transition-all">
              <Trophy className="ml-2 w-4 h-4 md:w-6 md:h-6" /> المتصدرين
            </Button>
          </div>
        </header>

        <section className="space-y-8 md:space-y-12 mb-20 md:mb-32">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-3xl md:text-5xl font-headline font-black text-goldenrod">النماذج التدريبية</h2>
            <Badge className="bg-goldenrod/10 text-goldenrod text-sm md:text-xl px-4 md:px-6 py-1 md:py-2 border border-goldenrod/20 rounded-full">
              {loading ? <Loader2 className="animate-spin" /> : `${filteredSections.length}`}
            </Badge>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 md:py-40 space-y-6">
              <Loader2 className="w-12 h-12 md:w-20 md:h-20 text-goldenrod animate-spin" />
            </div>
          ) : filteredSections.length === 0 ? (
            <div className="text-center py-20 md:py-40 glass rounded-3xl md:rounded-[60px] border-dashed border-white/10">
              <p className="text-xl md:text-3xl font-black text-white/20">لا توجد نتائج 🔍</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10">
              {filteredSections.map((section) => (
                <Card 
                  key={section.firebaseId || section.id} 
                  className="group relative bg-white/5 border border-white/5 rounded-3xl md:rounded-[50px] p-6 md:p-10 shadow-2xl overflow-hidden transition-all hover:border-goldenrod/50 hover:bg-white/[0.08] duration-500 animate-in fade-in slide-in-from-bottom-5"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-goldenrod via-vermillion to-goldenrod opacity-30" />
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="bg-goldenrod text-midnight px-3 py-0.5 rounded-lg font-black text-xs md:text-sm">مفعل</span>
                        <h2 className="text-3xl md:text-5xl font-black text-white group-hover:text-goldenrod transition-colors">
                           نموذج {section.id}
                        </h2>
                      </div>
                      <p className="text-base md:text-xl text-muted-foreground font-bold line-clamp-1">{section.title}</p>
                    </div>
                    <Button 
                      onClick={() => {
                        setSelectedSection(section);
                        setActiveView('practice');
                      }} 
                      className="w-full sm:w-auto h-16 md:h-24 px-8 md:px-12 rounded-2xl md:rounded-[35px] text-xl md:text-3xl font-black bg-goldenrod text-midnight hover:scale-105 transition-all shadow-xl gold-glow"
                    >
                      <PlayCircle className="ml-2 w-6 h-6 md:w-10 md:h-10" /> ابدأ 🚀
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        <footer className="text-center py-12 md:py-20 border-t border-white/5 space-y-6 md:space-y-8">
          <div className="flex flex-wrap justify-center gap-6 md:gap-12 items-center">
            <Button 
              variant="ghost" 
              onClick={() => window.location.href = '/admin'} 
              className="text-muted-foreground/30 hover:text-white transition-colors font-bold text-base md:text-lg"
            >
              <LayoutDashboard className="ml-2 w-5 h-5" /> لوحة المشرف
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => signOut(auth)}
              className="text-vermillion/30 hover:text-vermillion transition-colors font-bold text-base md:text-lg"
            >
              <LogOut className="ml-2 w-5 h-5" /> خروج
            </Button>
          </div>
          <div className="pt-6 md:pt-10">
            <p className="signature-text text-xl md:text-2xl">
              DR.MAHMOUD ABD EL RAZEK ❤️
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}