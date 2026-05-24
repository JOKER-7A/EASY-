
'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  Crown
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
import { cn } from '@/lib/utils';

export default function Home() {
  const [hasMounted, setHasMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<'landing' | 'practice'>('landing');
  const [sections, setSections] = useState<Section[]>(staticSections);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  
  const [activeOverlay, setActiveOverlay] = useState<'leaderboard' | 'errors' | null>(null);
  const [overlayData, setOverlayData] = useState<any[]>([]);
  
  const { toast } = useToast();

  // منع مشاكل الـ Hydration وضمان استقرار العرض
  useEffect(() => {
    setHasMounted(true);
    
    // صمام أمان لإخفاء شاشة التحميل مهما حدث بعد 2.5 ثانية
    const safetyTimer = setTimeout(() => {
      setIsLoading(false);
    }, 2500);

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const p = await getUserProfile(u.uid, u.email || '');
          setProfile(p);
        } catch (e) {
          console.error("Profile fetch failed", e);
        }
      }
      setIsLoading(false);
    });

    // جلب الأقسام من Firestore مع العودة للثوابت عند الخطأ
    getSectionsFromDb().then(data => {
      if (data && data.length > 0) setSections(data);
    }).catch(() => setSections(staticSections));

    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, []);

  const filteredSections = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return sections;
    return sections.filter(s => 
      s.title.toLowerCase().includes(q) || s.id.toString().includes(q)
    );
  }, [searchQuery, sections]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsAuthLoading(true);
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: "أهلاً بك مجدداً! 🚀" });
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        toast({ title: "تم إنشاء الحساب بنجاح ✅" });
      }
    } catch (error: any) {
      toast({ title: "خطأ في الدخول", description: error.message, variant: "destructive" });
    } finally {
      setIsAuthLoading(false);
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
    } catch (e) {
      console.error("Overlay fetch error", e);
    }
  };

  if (!hasMounted) return <div className="min-h-screen bg-black" />;

  // شاشة التحميل الاحترافية
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-[500] bg-mesh">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-primary/20 blur-[50px] animate-pulse rounded-full" />
          <Loader2 className="w-16 h-16 text-primary animate-spin relative z-10" />
        </div>
        <h2 className="text-4xl font-black text-white tracking-widest animate-pulse">EASY PREP</h2>
      </div>
    );
  }

  // واجهة التدريب
  if (activeView === 'practice' && selectedSection) {
    return <PracticeSession section={selectedSection} onExit={() => setActiveView('landing')} />;
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col relative overflow-x-hidden pb-20 bg-mesh">
      
      {/* واجهة تسجيل الدخول - تظهر فقط لو المستخدم مش داخل */}
      {!user && (
        <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4">
          <Card className="w-full max-w-xl p-10 glass border-white/5 rounded-[50px] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
            
            <div className="text-center mb-10 space-y-4">
              <h1 className="text-8xl md:text-[10rem] text-easy-premium text-easy-shimmer leading-none">EASY</h1>
              <p className="text-lg text-primary font-black tracking-[0.3em] uppercase opacity-80">Elite Prep Master</p>
            </div>

            <form onSubmit={handleAuth} className="space-y-6">
              <div className="space-y-4">
                <Input 
                  type="email" 
                  placeholder="البريد الإلكتروني" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="h-16 rounded-2xl bg-white/5 border-white/10 text-xl focus:border-primary/50 transition-all" 
                />
                <Input 
                  type="password" 
                  placeholder="كلمة المرور" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="h-16 rounded-2xl bg-white/5 border-white/10 text-xl focus:border-primary/50 transition-all" 
                />
              </div>
              <Button 
                type="submit" 
                disabled={isAuthLoading}
                className="w-full h-18 rounded-2xl bg-primary text-white font-black text-2xl hover:scale-105 transition-transform active:scale-95"
              >
                {isAuthLoading ? <Loader2 className="animate-spin" /> : (authMode === 'login' ? "دخول 🚀" : "انضم الآن ✨")}
              </Button>
            </form>

            <button 
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} 
              className="mt-8 w-full text-white/40 font-bold hover:text-white transition-colors"
            >
              {authMode === 'login' ? "لا تملك حساباً؟ سجل هنا" : "لديك حساب؟ سجل دخولك"}
            </button>
          </Card>
        </div>
      )}

      {/* المحتوى الرئيسي للمنصة */}
      <div className="container mx-auto px-4 md:px-8 py-20 max-w-7xl relative z-10">
        <header className="text-center mb-32 space-y-12 pt-20">
          <div className="inline-flex items-center gap-3 px-10 py-4 rounded-full glass border-primary/30 text-primary font-black animate-float">
            <Zap className="w-6 h-6 fill-primary" /> EASY PREP V3.5
          </div>
          
          <div className="relative group">
            <h1 className="text-[10rem] md:text-[16rem] text-easy-premium text-easy-shimmer leading-none transition-all duration-700 group-hover:scale-105">
              EASY
            </h1>
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-32 h-1 bg-primary blur-sm rounded-full opacity-50" />
          </div>

          <p className="text-2xl md:text-3xl font-black text-white/50 max-w-4xl mx-auto">
            أهم شيء الفهم <span className="text-white text-glow">وليس الحفظ</span> 💎
          </p>

          <div className="max-w-3xl mx-auto pt-20 px-4">
            <div className="relative group">
              <Search className="absolute right-8 top-1/2 -translate-y-1/2 w-8 h-8 text-white/20 group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="ابحث عن نموذج بالاسم أو الرقم..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-24 w-full rounded-[45px] bg-white/5 border-2 border-white/5 pr-20 text-3xl font-bold transition-all focus:border-primary/30 shadow-2xl focus:scale-[1.02]"
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-8 pt-10">
            <Button onClick={() => openOverlay('errors')} className="h-20 px-14 rounded-[40px] glass border-destructive/30 text-destructive font-black text-2xl hover:bg-destructive/10 transition-all">
              <History className="ml-3 w-8 h-8" /> سجل الأخطاء
            </Button>
            <Button onClick={() => openOverlay('leaderboard')} className="h-20 px-14 rounded-[40px] glass border-white/10 text-white font-black text-2xl hover:bg-white/5 transition-all">
              <Trophy className="ml-3 w-8 h-8" /> لوحة الشرف
            </Button>
          </div>
        </header>

        {/* شبكة الأقسام */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {filteredSections.map((section) => (
            <Card key={section.firebaseId || section.id} className="group bg-white/[0.02] border border-white/5 rounded-[50px] p-10 shadow-2xl hover:border-primary/20 transition-all hover:translate-y-[-5px]">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-8">
                <div className="space-y-4 text-right flex-1">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-primary/20 text-primary px-6 py-2 rounded-xl font-black text-xl border-none">قسم {section.id}</Badge>
                    {section.id > 218 && <Badge className="bg-accent/20 text-accent px-4 py-2 rounded-xl font-black border-none">جديد ✨</Badge>}
                  </div>
                  <h2 className="text-4xl font-black text-white group-hover:text-primary transition-colors duration-300">{section.title}</h2>
                  <div className="flex items-center gap-6 text-white/30 font-bold text-lg">
                    <span className="flex items-center gap-2"><Zap className="w-5 h-5" /> {section.questions?.length || 0} سؤال</span>
                    <span className="flex items-center gap-2"><History className="w-5 h-5" /> {section.duration} دقيقة</span>
                  </div>
                </div>
                <Button 
                  onClick={() => { setSelectedSection(section); setActiveView('practice'); }} 
                  className="w-full sm:w-auto h-28 px-14 rounded-[40px] text-3xl font-black bg-primary text-white hover:scale-110 transition-all shadow-[0_0_30px_rgba(var(--primary),0.3)]"
                >
                  ابدأ <ChevronRight className="mr-2 w-10 h-10" />
                </Button>
              </div>
            </Card>
          ))}
          {filteredSections.length === 0 && (
            <div className="col-span-full text-center py-20 glass rounded-[50px] border-dashed">
              <Search className="w-20 h-20 text-white/10 mx-auto mb-6" />
              <p className="text-3xl font-black text-white/20">لم نجد أي نموذج بهذا الاسم أو الرقم</p>
            </div>
          )}
        </section>

        {/* التوقيع والفوتر */}
        <footer className="text-center py-20 border-t border-white/5 mt-32 space-y-12">
          <div className="flex flex-wrap justify-center gap-16 items-center">
            {profile?.status === 'admin' && (
              <Button onClick={() => window.location.href = '/admin'} variant="ghost" className="text-white/20 hover:text-primary font-black flex items-center gap-2 transition-colors">
                <ShieldCheck className="w-6 h-6" /> لوحة التحكم
              </Button>
            )}
            {user && (
              <Button onClick={() => signOut(auth)} variant="ghost" className="text-destructive/30 hover:text-destructive font-black flex items-center gap-2 transition-colors">
                <X className="w-6 h-6" /> تسجيل الخروج
              </Button>
            )}
          </div>
          <div className="space-y-4">
            <p className="text-4xl tracking-[0.4em] uppercase font-black opacity-30 hover:opacity-100 transition-opacity cursor-default">
              DR.MAHMOUD ABD EL RAZEK
            </p>
            <p className="text-primary font-bold opacity-40">Elite Training System &copy; 2024</p>
          </div>
        </footer>
      </div>

      {/* الأوفرلاي (اللوحة ولوحة الشرف) */}
      {activeOverlay && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setActiveOverlay(null)} />
          <Card className="w-full max-w-4xl max-h-[85vh] overflow-hidden glass rounded-[40px] relative z-10 flex flex-col border-primary/20 shadow-[0_0_100px_rgba(0,0,0,1)]">
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-4">
                {activeOverlay === 'leaderboard' ? <Trophy className="w-10 h-10 text-goldenrod" /> : <History className="w-10 h-10 text-destructive" />}
                <h2 className="text-4xl font-black text-white">
                  {activeOverlay === 'leaderboard' ? "نخبة EASY 🏆" : "سجل الأخطاء ⚠️"}
                </h2>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full w-14 h-14 hover:bg-white/10" onClick={() => setActiveOverlay(null)}>
                <X className="w-8 h-8" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {overlayData.length === 0 ? (
                <div className="text-center py-20 opacity-30 text-2xl font-black animate-pulse">
                  {activeOverlay === 'leaderboard' ? "جاري جلب النخبة..." : "جاري تحميل السجل..."}
                </div>
              ) : (
                <div className="grid gap-4">
                  {overlayData.map((item, idx) => (
                    <div key={idx} className={cn(
                      "group p-6 rounded-3xl border transition-all flex justify-between items-center",
                      activeOverlay === 'leaderboard' ? "bg-white/5 border-white/5 hover:border-primary/20" : "bg-destructive/5 border-destructive/10 hover:border-destructive/30"
                    )}>
                      <div className="flex items-center gap-6">
                        {activeOverlay === 'leaderboard' && (
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center font-black text-2xl",
                            idx === 0 ? "bg-goldenrod text-black shadow-[0_0_20px_rgba(230,172,0,0.5)]" : 
                            idx === 1 ? "bg-white/20 text-white" : 
                            idx === 2 ? "bg-orange-800/40 text-orange-400" : "bg-white/5 text-white/40"
                          )}>
                            {idx + 1}
                          </div>
                        )}
                        <div>
                          <p className="font-black text-2xl text-white">
                            {activeOverlay === 'leaderboard' ? (item.displayName || 'مستكشف EASY') : (item.questionData?.question || 'سؤال')}
                          </p>
                          {activeOverlay === 'leaderboard' ? (
                            <p className="text-white/40 font-bold">{item.email?.split('@')[0]}</p>
                          ) : (
                            <p className="text-destructive/50 font-bold">{item.questionData?.sectionTitle || 'قسم غير معروف'}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "text-3xl font-black",
                          activeOverlay === 'leaderboard' ? "text-primary" : "text-destructive"
                        )}>
                          {activeOverlay === 'leaderboard' ? `${item.xp || 0} XP` : `تكرر ${item.count || 1} مرة`}
                        </p>
                        {activeOverlay === 'leaderboard' && <Badge className="bg-primary/10 text-primary border-none">Level {item.level || 1}</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </main>
  );
}
