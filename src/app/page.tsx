
'use client';

import React, { useState, useEffect } from 'react';
import { sections as staticSections, Section } from '@/lib/practice-data';
import { getSectionsFromDb, getUserProfile } from '@/lib/db-service';
import PracticeSession from '@/components/PracticeSession';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Flame, 
  LayoutDashboard,
  Loader2,
  PlayCircle,
  Zap,
  Search,
  Trophy,
  Star,
  History,
  User as UserIcon,
  LogOut
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
  const [displayName, setDisplayName] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const p = await getUserProfile(u.uid);
        setProfile(p);
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
      s.questions.some(question => question.question.toLowerCase().includes(q))
    );
    setFilteredSections(filtered);
  }, [searchQuery, allSections]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: "مرحباً بعودتك! 🚀" });
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName });
        toast({ title: "تم إنشاء حسابك بنجاح ✅" });
      }
    } catch (error: any) {
      toast({ title: "حدث خطأ", description: error.message, variant: "destructive" });
    }
  };

  if (!mounted || isAuthLoading) return (
    <div className="min-h-screen bg-midnight flex items-center justify-center">
      <Loader2 className="w-20 h-20 text-goldenrod animate-spin" />
    </div>
  );

  if (!user) {
    return (
      <main className="min-h-screen bg-midnight flex items-center justify-center p-6 relative overflow-hidden">
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(230,172,0,0.1),transparent_70%)]" />
        <Card className="w-full max-w-xl p-12 glass border-goldenrod/30 rounded-[60px] shadow-2xl relative z-10 animate-in fade-in zoom-in duration-500">
          <div className="text-center mb-12">
            <h1 className="text-7xl font-black text-white mb-4">EASY</h1>
            <p className="text-2xl text-goldenrod font-bold">بوابة العبور نحو التميز 🎯</p>
          </div>
          
          <form onSubmit={handleAuth} className="space-y-6">
            {authMode === 'register' && (
              <Input 
                placeholder="الاسم الكامل" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="h-16 rounded-3xl bg-white/5 border-white/10 text-white text-xl pr-6"
                required
              />
            )}
            <Input 
              type="email" 
              placeholder="البريد الإلكتروني" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              className="h-16 rounded-3xl bg-white/5 border-white/10 text-white text-xl pr-6"
              required
            />
            <Input 
              type="password" 
              placeholder="كلمة المرور" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className="h-16 rounded-3xl bg-white/5 border-white/10 text-white text-xl pr-6"
              required
            />
            <Button type="submit" className="w-full h-20 rounded-[30px] bg-goldenrod text-midnight font-black text-2xl gold-glow hover:scale-[1.02] transition-all border-b-8 border-goldenrod/50">
              {authMode === 'login' ? "دخول 🚀" : "إنشاء حساب جديد ✨"}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="text-white/60 hover:text-goldenrod font-bold text-lg transition-colors"
            >
              {authMode === 'login' ? "ليس لديك حساب؟ سجل الآن" : "لديك حساب بالفعل؟ سجل دخولك"}
            </button>
          </div>
        </Card>
      </main>
    );
  }

  const handleStartClick = (section: Section) => {
    setSelectedSection(section);
    setActiveView('practice');
  };

  if (activeView === 'practice' && selectedSection) {
    return (
      <main className="min-h-screen p-0 bg-midnight">
        <PracticeSession 
          section={selectedSection} 
          onExit={() => setActiveView('landing')} 
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden relative bg-midnight text-white flex flex-col">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(230,172,0,0.15),transparent_60%)] pointer-events-none" />
      
      {/* XP & Level Bar - Top Left */}
      <div className="fixed top-8 left-8 z-[100] animate-in slide-in-from-left-10 duration-700">
        <div className="glass p-4 pr-12 rounded-full border-goldenrod/30 flex items-center gap-6 gold-glow relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-goldenrod/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="w-16 h-16 rounded-full bg-goldenrod text-midnight flex items-center justify-center font-black text-2xl shadow-xl z-10">
            LV.{profile?.level || 1}
          </div>
          <div className="space-y-2 z-10">
            <p className="text-xs font-black text-goldenrod/80 uppercase tracking-widest">المستوى الحالي</p>
            <div className="w-48 h-2.5 bg-white/5 rounded-full border border-white/10 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-goldenrod via-vermillion to-goldenrod transition-all duration-1000 shadow-[0_0_15px_rgba(230,172,0,0.5)]"
                style={{ width: `${((profile?.xp || 0) / ((profile?.level || 1) * 1000)) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-white/40 font-bold">{profile?.xp || 0} / {(profile?.level || 1) * 1000} XP</p>
          </div>
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-6 py-10 max-w-7xl flex-1">
        <header className="text-center mb-24 space-y-8 pt-20">
          <div className="inline-flex items-center gap-3 px-8 py-3 rounded-full glass border-goldenrod/30 text-goldenrod font-black text-lg mb-4 shadow-[0_0_30px_rgba(230,172,0,0.2)]">
            <Zap className="w-5 h-5 fill-goldenrod animate-pulse" /> منصة إيزي التعليمية 2.0 🔥
          </div>
          <h1 className="text-8xl md:text-[10rem] font-headline font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-goldenrod to-vermillion leading-none mb-4">
            EASY
          </h1>
          <p className="text-2xl md:text-4xl font-black text-white/80 leading-tight max-w-4xl mx-auto">
            تعلّم بذكاء.. أهم شيء الفهم وليس الحفظ 💡
          </p>

          <div className="max-w-2xl mx-auto pt-10 relative group">
            <Search className="absolute right-6 top-1/2 -translate-y-1/2 w-8 h-8 text-goldenrod/50 group-focus-within:text-goldenrod transition-colors z-10" />
            <Input 
              placeholder="ابحث عن نموذج، عنوان، أو سؤال..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-20 w-full rounded-[30px] bg-white/5 border-2 border-white/10 pr-16 text-2xl font-bold focus:border-goldenrod/50 focus:bg-white/10 transition-all shadow-xl placeholder:text-white/20"
            />
          </div>

          <div className="flex flex-wrap justify-center gap-6 pt-10">
            <Button className="h-16 px-10 rounded-3xl glass border-goldenrod/40 text-goldenrod font-black text-xl gold-glow hover:scale-110 transition-all">
              <Star className="ml-2 w-6 h-6 fill-goldenrod" /> المفضلة
            </Button>
            <Button className="h-16 px-10 rounded-3xl glass border-vermillion/40 text-vermillion font-black text-xl vermillion-glow hover:scale-110 transition-all">
              <History className="ml-2 w-6 h-6" /> سجل الأخطاء
            </Button>
            <Button className="h-16 px-10 rounded-3xl glass border-white/10 text-white font-black text-xl hover:scale-110 transition-all">
              <Trophy className="ml-2 w-6 h-6" /> المتصدرين
            </Button>
          </div>
        </header>

        <section className="space-y-12 mb-32">
          <div className="flex items-center justify-between">
            <h2 className="text-5xl font-headline font-black text-goldenrod">النماذج التدريبية</h2>
            <Badge className="bg-goldenrod/10 text-goldenrod text-xl px-6 py-2 border-2 border-goldenrod/20 rounded-full">
              {loading ? <Loader2 className="animate-spin" /> : `${filteredSections.length} متاح`}
            </Badge>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-40 space-y-6">
              <Loader2 className="w-20 h-20 text-goldenrod animate-spin" />
              <p className="text-2xl font-black text-goldenrod/50">جاري جلب أحدث النماذج...</p>
            </div>
          ) : filteredSections.length === 0 ? (
            <div className="text-center py-40 glass rounded-[60px] border-dashed border-white/10">
              <p className="text-3xl font-black text-white/20">لا توجد نتائج بحث مطابقة 🔍</p>
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-10">
              {filteredSections.map((section, idx) => (
                <Card 
                  key={section.firebaseId || section.id} 
                  className={cn(
                    "group relative bg-white/5 border-2 border-white/5 rounded-[50px] p-10 shadow-2xl overflow-hidden transition-all hover:border-goldenrod/50 hover:bg-white/[0.08] hover:scale-[1.01] duration-500 animate-in fade-in slide-in-from-bottom-10",
                    `delay-[${idx * 100}ms]`
                  )}
                >
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-goldenrod via-vermillion to-goldenrod opacity-30 group-hover:opacity-100 transition-opacity" />
                  <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="space-y-3">
                      <div className="flex items-center gap-4">
                        <span className="bg-goldenrod text-midnight px-4 py-1 rounded-2xl font-black text-lg">جديد</span>
                        <h2 className="text-5xl font-black text-white group-hover:text-goldenrod transition-colors">
                           نموذج {section.id}
                        </h2>
                      </div>
                      <p className="text-xl text-muted-foreground font-bold line-clamp-1">{section.title}</p>
                    </div>
                    <Button 
                      onClick={() => handleStartClick(section)} 
                      className="h-24 px-12 rounded-[35px] text-3xl font-black bg-goldenrod text-midnight hover:scale-105 transition-all shadow-2xl gold-glow border-b-8 border-goldenrod/50 active:border-b-0 active:translate-y-2"
                    >
                      <PlayCircle className="ml-3 w-10 h-10" /> ابدأ 🚀
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        <footer className="text-center py-20 border-t border-white/5 space-y-8">
          <div className="flex justify-center gap-12 items-center">
            <Button 
              variant="ghost" 
              onClick={() => window.location.href = '/admin'} 
              className="text-muted-foreground/30 hover:text-white transition-colors font-bold text-lg"
            >
              <LayoutDashboard className="ml-2 w-6 h-6" /> لوحة المشرف
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => signOut(auth)}
              className="text-vermillion/30 hover:text-vermillion transition-colors font-bold text-lg"
            >
              <LogOut className="ml-2 w-6 h-6" /> تسجيل الخروج
            </Button>
          </div>
          <div className="pt-10">
            <p className="text-2xl font-headline font-black tracking-widest text-white/20">
              A/K SALAMAH ❤️
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}
