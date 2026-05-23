'use client';

import React, { useState, useEffect } from 'react';
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
import { Progress } from '@/components/ui/progress';
import { 
  Zap,
  Search,
  Trophy,
  History,
  LogOut,
  X,
  ChevronRight,
  Loader2,
  LayoutDashboard
} from 'lucide-react';
import { auth } from '@/lib/firebase';
import { 
  onAuthStateChanged, 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const [activeView, setActiveView] = useState<'landing' | 'practice'>('landing');
  const [sections, setSections] = useState<Section[]>(staticSections);
  const [filteredSections, setFilteredSections] = useState<Section[]>(staticSections);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [activeOverlay, setActiveOverlay] = useState<'leaderboard' | 'errors' | null>(null);
  const [overlayData, setOverlayData] = useState<any[]>([]);
  
  const { toast } = useToast();

  // نظام حماية ضد التعليق: ينهي حالة التحميل إجبارياً بعد 3 ثواني
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAuthLoading(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // إدارة جلسة المستخدم
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const p = await getUserProfile(u.uid, u.email || '');
          setProfile(p);
        } catch (e) {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // جلب المحتوى
  useEffect(() => {
    getSectionsFromDb().then(data => {
      setSections(data || staticSections);
    });
  }, []);

  // محرك البحث
  useEffect(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      setFilteredSections(sections);
      return;
    }
    setFilteredSections(sections.filter(s => 
      s.title.toLowerCase().includes(q) || s.id.toString().includes(q)
    ));
  }, [searchQuery, sections]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: "أهلاً بك مجدداً! 🚀" });
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await getUserProfile(cred.user.uid, email);
        toast({ title: "تم إنشاء الحساب بنجاح ✅" });
      }
    } catch (error: any) {
      toast({ title: "فشل الدخول", variant: "destructive", description: "تأكد من البيانات" });
    }
  };

  const openOverlay = async (type: 'leaderboard' | 'errors') => {
    setActiveOverlay(type);
    setOverlayData([]);
    try {
      if (type === 'leaderboard') {
        const data = await getLeaderboard();
        setOverlayData(data || []);
      } else if (type === 'errors' && user) {
        const data = await getErrorLogs(user.uid);
        setOverlayData(data || []);
      }
    } catch (error) {
      setOverlayData([]);
    }
  };

  if (activeView === 'practice' && selectedSection) {
    return <PracticeSession section={selectedSection} onExit={() => window.location.reload()} />;
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col relative overflow-x-hidden">
      
      {/* واجهة الدخول */}
      {!user && !isAuthLoading && (
        <div className="fixed inset-0 z-[300] bg-black flex items-center justify-center p-4">
          <Card className="w-full max-w-xl p-10 glass border-white/5 rounded-[50px] shadow-2xl">
            <div className="text-center mb-10">
              <h1 className="text-8xl md:text-[10rem] text-easy-premium mb-4">EASY</h1>
              <p className="text-lg text-primary font-bold tracking-widest opacity-80 uppercase">Elite Training Master</p>
            </div>
            <form onSubmit={handleAuth} className="space-y-6">
              <Input type="email" placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} className="h-16 rounded-2xl bg-white/5 border-white/10 text-xl" required />
              <Input type="password" placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} className="h-16 rounded-2xl bg-white/5 border-white/10 text-xl" required />
              <Button type="submit" className="w-full h-18 rounded-2xl bg-primary text-white font-black text-2xl">
                {authMode === 'login' ? "دخول 🚀" : "انضم الآن ✨"}
              </Button>
            </form>
            <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="mt-8 w-full text-white/40 font-bold hover:text-white transition-colors">
              {authMode === 'login' ? "لا تملك حساباً؟ سجل هنا" : "لديك حساب؟ سجل دخولك"}
            </button>
          </Card>
        </div>
      )}

      {/* الهيكل الأساسي */}
      <div className="container mx-auto px-4 md:px-8 py-20 max-w-7xl relative z-10">
        
        {user && profile && (
          <div className="fixed top-8 left-8 z-[100] hidden md:block">
            <div className="glass p-5 pr-14 rounded-[30px] border-primary/20 flex items-center gap-7">
              <div className="w-20 h-20 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-4xl shadow-xl">
                {profile.level || 1}
              </div>
              <div className="space-y-2 flex flex-col min-w-[200px]">
                <div className="flex justify-between items-end">
                  <p className="text-xs font-black text-primary tracking-widest uppercase">PROGRESS</p>
                  <p className="text-sm font-bold text-white/60 truncate max-w-[150px]">{profile.displayName || 'مستكشف'}</p>
                </div>
                <Progress value={profile.xp ? (profile.xp % 100) : 0} className="h-3 bg-white/5" />
                <p className="text-[10px] text-white/30 font-black">{profile.xp || 0} XP TOTAL</p>
              </div>
            </div>
          </div>
        )}

        <header className="text-center mb-32 space-y-12 pt-20">
          <div className="inline-flex items-center gap-3 px-10 py-4 rounded-full glass border-primary/30 text-primary font-black animate-float">
            <Zap className="w-6 h-6 fill-primary" /> EASY PREP V3.0
          </div>
          <h1 className="text-[10rem] md:text-[15rem] text-easy-premium text-shine leading-none">EASY</h1>
          <p className="text-3xl font-black text-white/50 max-w-4xl mx-auto">أهم شيء الفهم <span className="text-white">وليس الحفظ</span> 💎</p>

          <div className="max-w-3xl mx-auto pt-20 px-4">
            <div className="relative group">
              <Search className="absolute right-12 top-1/2 -translate-y-1/2 w-10 h-10 text-white/20" />
              <Input 
                placeholder="ابحث عن نموذج..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-24 w-full rounded-[45px] bg-white/5 border-2 border-white/5 pr-24 text-3xl font-bold transition-all focus:border-primary/30"
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-8 pt-10">
            <Button onClick={() => openOverlay('errors')} className="h-20 px-14 rounded-[40px] glass border-destructive/30 text-destructive font-black text-2xl hover:bg-destructive/10">
              <History className="ml-3 w-8 h-8" /> سجل الأخطاء
            </Button>
            <Button onClick={() => openOverlay('leaderboard')} className="h-20 px-14 rounded-[40px] glass border-white/10 text-white font-black text-2xl hover:bg-white/5">
              <Trophy className="ml-3 w-8 h-8" /> لوحة الشرف
            </Button>
          </div>
        </header>

        <section className="space-y-20 mb-48">
          <div className="flex items-center justify-between px-4">
            <h2 className="text-6xl font-black text-white tracking-tighter">النماذج التدريبية</h2>
            <Badge className="bg-primary/20 text-primary text-3xl px-12 py-5 border border-primary/20 rounded-full font-black">
              {filteredSections.length}
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {filteredSections.length > 0 ? filteredSections.map((section) => (
              <Card 
                key={section.firebaseId || section.id} 
                className="group bg-white/[0.02] border border-white/5 rounded-[60px] p-12 shadow-2xl transition-all hover:border-primary/50"
              >
                <div className="flex flex-col sm:flex-row justify-between items-center gap-10">
                  <div className="space-y-4 text-right">
                    <span className="bg-primary/20 text-primary px-6 py-2 rounded-xl font-black text-2xl">🔥 قسم {section.id}</span>
                    <h2 className="text-4xl font-black text-white group-hover:text-primary transition-colors">
                      {section.title}
                    </h2>
                    <p className="text-white/30 font-bold text-xl">{section.questions?.length || 0} سؤال • {section.duration} دقيقة</p>
                  </div>
                  <Button 
                    onClick={() => { setSelectedSection(section); setActiveView('practice'); }} 
                    className="w-full sm:w-auto h-32 px-16 rounded-[45px] text-4xl font-black bg-primary text-white hover:scale-105 transition-transform"
                  >
                    ابدأ <ChevronRight className="mr-2 w-12 h-12" />
                  </Button>
                </div>
              </Card>
            )) : (
              <div className="col-span-full text-center py-20 opacity-30 text-4xl font-black">لا توجد نماذج متوفرة حالياً 🚀</div>
            )}
          </div>
        </section>

        <footer className="text-center py-20 border-t border-white/5 space-y-12">
          <div className="flex flex-wrap justify-center gap-16 items-center">
            {profile?.status === 'admin' && (
              <Button onClick={() => window.location.href = '/admin'} variant="ghost" className="text-white/20 hover:text-white font-black text-2xl">
                <LayoutDashboard className="ml-3 w-8 h-8" /> لوحة التحكم
              </Button>
            )}
            {user && (
              <Button onClick={() => signOut(auth)} variant="ghost" className="text-destructive/30 hover:text-destructive font-black text-2xl">
                <LogOut className="ml-3 w-8 h-8" /> تسجيل الخروج
              </Button>
            )}
          </div>
          <p className="text-5xl tracking-[0.5em] uppercase font-black opacity-30 text-shine">DR.MAHMOUD ABD EL RAZEK</p>
        </footer>
      </div>

      {/* شاشة التحميل */}
      {isAuthLoading && (
        <div className="fixed inset-0 bg-black flex items-center justify-center z-[500] backdrop-blur-xl">
          <div className="text-center space-y-6">
            <Loader2 className="w-20 h-20 text-primary animate-spin mx-auto" />
            <h2 className="text-3xl font-black text-white animate-pulse">EASY PREP MASTER</h2>
            <p className="text-white/20 font-bold">جاري تأمين الاتصال...</p>
          </div>
        </div>
      )}

      {/* النوافذ المنبثقة */}
      {activeOverlay && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-3xl" onClick={() => setActiveOverlay(null)} />
          <Card className="w-full max-w-4xl max-h-[85vh] overflow-hidden glass border-white/5 rounded-[40px] relative z-10 flex flex-col">
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-4xl font-black text-white">
                {activeOverlay === 'leaderboard' ? "نخبة EASY 🏆" : "سجل الأخطاء ⚠️"}
              </h2>
              <Button variant="ghost" onClick={() => setActiveOverlay(null)}><X className="w-8 h-8" /></Button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {overlayData.length === 0 ? (
                <div className="text-center py-20 opacity-30 text-2xl font-black">لا توجد بيانات حالياً 🚀</div>
              ) : (
                overlayData.map((item, idx) => (
                  <div key={idx} className="mb-4 p-6 bg-white/5 rounded-3xl border border-white/5 flex justify-between items-center">
                    <span className="text-2xl font-bold truncate max-w-[60%]">
                      {activeOverlay === 'leaderboard' ? item.displayName : (item.questionData?.question || 'سؤال غير معروف')}
                    </span>
                    <span className="text-primary font-black">
                      {activeOverlay === 'leaderboard' ? `${item.xp || 0} XP` : `تكرر ${item.count || 1} مرة`}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}
    </main>
  );
}