'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Section, Question } from '@/lib/practice-data';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Timer, Zap, Play, XCircle, Moon, CheckCircle2, Crown, StarIcon, Flame, Heart, BookText, Eye, ArrowLeft, ArrowRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { saveAttemptToDb, toggleFavoriteInDb, saveErrorLogToDb, getUserProfile, updateUserXP } from '@/lib/db-service';
import { auth } from '@/lib/firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

type Phase = 'intro' | 'mode-selection' | 'practicing' | 'finished';
type PracticeMode = 'normal' | 'pressure' | 'exam-night';

interface PracticeSessionProps {
  section: Section;
  onExit: () => void;
}

export default function PracticeSession({ section, onExit }: PracticeSessionProps) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [mode, setMode] = useState<PracticeMode>('normal');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0); 
  const [startTime, setStartTime] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (phase === 'intro') {
      const timer = setTimeout(() => setPhase('mode-selection'), 1500);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  useEffect(() => {
    const fetchFavs = async () => {
      if (auth.currentUser) {
        const profile = await getUserProfile(auth.currentUser.uid);
        if (profile?.favorites) {
          setFavorites(profile.favorites.map((f: any) => f.id));
        }
      }
    };
    fetchFavs();
  }, []);

  const selectMode = (selectedMode: PracticeMode) => {
    setMode(selectedMode);
    setTimeLeft(selectedMode === 'exam-night' ? 180 : selectedMode === 'pressure' ? 60 : 0);
    setStartTime(Date.now());
    setPhase('practicing');
  };

  const progress = ((currentQuestionIndex + 1) / section.questions.length) * 100;
  
  const finishSession = useCallback(async () => {
    if (phase === 'finished' || !startTime) return;
    setPhase('finished');
    
    let correct = 0;
    section.questions.forEach((q) => {
      if (userAnswers[q.id] === q.correct) correct++;
    });

    if (auth.currentUser) {
      await saveAttemptToDb(auth.currentUser.uid, {
        sectionId: section.id,
        mode,
        score: Math.round((correct / section.questions.length) * 100),
        correctCount: correct,
        totalQuestions: section.questions.length,
        durationSeconds: Math.floor((Date.now() - startTime) / 1000)
      });
    }
  }, [phase, section, userAnswers, mode, startTime]);

  const handleNext = useCallback(() => {
    if (currentQuestionIndex < section.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      if (mode === 'pressure') setTimeLeft(60);
    } else finishSession();
  }, [section.questions, currentQuestionIndex, mode, finishSession]);

  const handlePrevious = useCallback(() => {
    if (currentQuestionIndex > 0) setCurrentQuestionIndex(prev => prev - 1);
  }, [currentQuestionIndex]);

  const handleAnswer = async (opt: string) => {
    const q = section.questions[currentQuestionIndex];
    setUserAnswers(p => ({ ...p, [q.id]: opt }));
    
    if (auth.currentUser) {
      const isCorrect = opt === q.correct;
      updateUserXP(auth.currentUser.uid, isCorrect);
      
      if (!isCorrect) {
        saveErrorLogToDb(auth.currentUser.uid, q, section.title, opt);
      }
    }
  };

  useEffect(() => {
    if (mode === 'normal' || phase !== 'practicing') return;
    const timer = setInterval(() => setTimeLeft(p => (p <= 1 ? 0 : p - 1)), 1000);
    return () => clearInterval(timer);
  }, [mode, phase]);

  useEffect(() => {
    if (mode !== 'normal' && timeLeft === 0 && phase === 'practicing') {
      if (mode === 'pressure') handleNext();
      else finishSession();
    }
  }, [timeLeft, mode, phase, handleNext, finishSession]);

  const toggleFavorite = async (question: Question) => {
    if (!auth.currentUser) {
      toast({ title: "يجب تسجيل الدخول أولاً", variant: "destructive" });
      return;
    }
    
    const isAdded = await toggleFavoriteInDb(auth.currentUser.uid, question, section.title);
    setFavorites(prev => isAdded ? [...prev, question.id] : prev.filter(id => id !== question.id));
    toast({ 
      title: isAdded ? "تمت الإضافة للمفضلة ⭐" : "تم الحذف من المفضلة",
      description: isAdded ? "ستجد هذا السؤال في مكتبتك دائماً." : "تمت إزالة السؤال من مكتبتك."
    });
  };

  const getMotivation = (score: number) => {
    if (score === 100) return { text: "أداء أسطوري 👑", color: "text-amber-500", icon: Crown, glow: "shadow-[0_0_50px_rgba(245,158,11,0.3)]" };
    if (score >= 90) return { text: "أحسنت! أنت رائع ⭐", color: "text-primary", icon: StarIcon, glow: "" };
    if (score >= 70) return { text: "أداء جيد، استمر 🔥", color: "text-emerald-500", icon: Flame, glow: "" };
    return { text: "شد حيلك شوية 💪", color: "text-rose-500", icon: Zap, glow: "" };
  };

  const q = section.questions[currentQuestionIndex];
  const currentPassage = useMemo(() => {
    if (q?.type === 'reading' && q.passageTitle) {
      return section.readingPassages?.find(p => p.title === q.passageTitle);
    }
    return null;
  }, [q, section.readingPassages]);

  if (phase === 'intro') return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
      <h2 className="text-4xl md:text-8xl font-black animate-pulse tracking-tighter italic">أهم شيء الفهم 💡</h2>
    </div>
  );

  if (phase === 'mode-selection') return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-mesh opacity-10" />
      <div className="max-w-4xl w-full space-y-12 relative z-10">
        <h1 className="text-5xl md:text-7xl font-black text-center italic tracking-tighter">اختر مستوى التحدي</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { id: 'exam-night', title: 'ليلة الاختبار', icon: Moon, desc: '3 دقائق إجمالية' },
            { id: 'pressure', title: 'نظام الضغط', icon: Zap, desc: '60 ثانية للسؤال' },
            { id: 'normal', title: 'التمرين الحر', icon: Play, desc: 'بدون قيود زمنية' }
          ].map((m) => (
            <Card key={m.id} onClick={() => selectMode(m.id as PracticeMode)} className="p-10 glass-card cursor-pointer hover:border-primary/50 text-center space-y-6 rounded-[40px] transition-all hover:-translate-y-2 group">
              <div className="w-20 h-20 rounded-[30px] bg-primary/10 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform"><m.icon className="w-10 h-10 text-primary" /></div>
              <h3 className="text-2xl font-black italic">{m.title}</h3>
              <p className="text-xs font-black opacity-30 uppercase tracking-widest">{m.desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );

  if (phase === 'finished') {
    let correctCount = 0;
    section.questions.forEach(q => { if (userAnswers[q.id] === q.correct) correctCount++; });
    const score = Math.round((correctCount / section.questions.length) * 100);
    const motivation = getMotivation(score);

    return (
      <ScrollArea className="h-screen bg-background" dir="rtl">
        <div className="max-w-4xl mx-auto py-24 px-6 space-y-16">
          <div className="text-center space-y-8">
            <div className={cn("inline-block p-14 rounded-[60px] bg-white/[0.02] border border-white/10 relative", motivation.glow)}>
               {score === 100 && <div className="absolute -inset-4 bg-primary/20 blur-[60px] rounded-full animate-pulse" />}
               <motivation.icon className={cn("w-24 h-24 relative z-10", motivation.color)} />
            </div>
            <div className="space-y-2">
              <h1 className="text-6xl font-black italic">{motivation.text}</h1>
              <p className="text-8xl font-black text-primary tracking-tighter">{score}%</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'إجابات صحيحة', val: correctCount, color: 'text-emerald-500' },
              { label: 'إجابات خاطئة', val: section.questions.length - correctCount, color: 'text-rose-500' },
              { label: 'إجمالي الأسئلة', val: section.questions.length, color: 'text-foreground' },
              { label: 'زمن الحل', val: Math.floor((Date.now() - (startTime || 0)) / 60000) + 'د', color: 'text-primary' }
            ].map((s, i) => (
              <Card key={i} className="p-8 text-center glass-card rounded-[35px] border-white/5">
                <p className="text-[10px] font-black opacity-30 uppercase tracking-widest mb-2">{s.label}</p>
                <p className={cn("text-3xl font-black", s.color)}>{s.val}</p>
              </Card>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pb-20">
            <Button onClick={() => window.location.reload()} className="flex-2 h-16 text-xl font-black rounded-3xl bg-primary shadow-2xl shadow-primary/20">إعادة المحاولة 🔄</Button>
            <Button onClick={onExit} variant="outline" className="flex-1 h-16 text-xl font-black rounded-3xl border-white/10 hover:bg-white/5">الخروج</Button>
          </div>
        </div>
      </ScrollArea>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" dir="rtl">
      <div className="p-5 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-50">
        <Button onClick={onExit} variant="ghost" size="sm" className="font-black gap-2 text-rose-500 hover:bg-rose-500/10 rounded-xl"><ArrowRight className="w-5 h-5" /> انسحاب</Button>
        <div className="flex items-center gap-6">
          {mode !== 'normal' && (
            <div className={cn("px-6 py-2 rounded-2xl border font-black text-lg shadow-sm transition-all", timeLeft < 20 ? "border-rose-500 text-rose-500 animate-pulse scale-110" : "border-white/10 text-primary")}>
              {Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2, '0')}
            </div>
          )}
          <div className="bg-primary/10 px-4 py-1.5 rounded-xl border border-primary/20">
            <span className="font-black text-primary text-sm tracking-widest">{currentQuestionIndex + 1} / {section.questions.length}</span>
          </div>
        </div>
      </div>

      <Progress value={progress} className="h-1.5 rounded-none bg-border" />

      <main className="flex-1 container mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-2 gap-10 max-w-7xl">
        {currentPassage && (
          <Card className="hidden lg:flex flex-col p-8 glass-card rounded-[40px] border-primary/10 h-[calc(100vh-220px)] sticky top-28 shadow-2xl shadow-primary/5">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black flex items-center gap-3 italic"><BookText className="w-6 h-6 text-primary" /> {currentPassage.title}</h3>
              <Badge className="bg-primary/10 text-primary border-none">نص قرائي</Badge>
            </div>
            <ScrollArea className="flex-1 pr-6">
              <p className="text-xl leading-loose opacity-80 whitespace-pre-wrap font-medium">{currentPassage.text}</p>
            </ScrollArea>
          </Card>
        )}

        <div className={cn("space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500", !currentPassage && "lg:col-span-2 max-w-3xl mx-auto w-full")}>
          <Card className="p-10 glass-card rounded-[50px] space-y-10 relative overflow-hidden border-white/5 shadow-2xl">
            <div className="flex justify-between items-start gap-6">
              <div className="space-y-3">
                <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-black px-3 rounded-lg uppercase text-[10px] tracking-widest">
                  {q.type === 'reading' ? 'استيعاب مقروء' : q.type.toUpperCase()}
                </Badge>
                <h2 className="text-3xl md:text-4xl font-black leading-[1.4] tracking-tight">{q.question}</h2>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn("rounded-[20px] h-14 w-14 border transition-all active:scale-90", favorites.includes(q.id) ? "text-rose-500 border-rose-500/20 bg-rose-500/5 shadow-[0_0_20px_rgba(244,63,94,0.1)]" : "opacity-20 hover:opacity-100 hover:bg-muted")}
                onClick={() => toggleFavorite(q)}
              >
                <Heart className="w-6 h-6" fill={favorites.includes(q.id) ? "currentColor" : "none"} />
              </Button>
            </div>

            {currentPassage && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="lg:hidden w-full h-14 rounded-2xl gap-3 font-black border-primary/20 text-primary hover:bg-primary/5">
                    <Eye className="w-5 h-5" /> عرض النص القرائي
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] sm:max-w-2xl h-[85vh] flex flex-col p-8 rounded-[50px] glass-card border-white/10">
                  <DialogHeader className="mb-6">
                    <DialogTitle className="text-3xl font-black italic">{currentPassage.title}</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="flex-1 mt-4">
                    <p className="text-xl leading-loose opacity-80 whitespace-pre-wrap font-medium">{currentPassage.text}</p>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {q.options.map((opt, i) => (
                <button 
                  key={i} 
                  onClick={() => handleAnswer(opt)}
                  className={cn(
                    "p-6 text-right font-black text-lg rounded-[25px] border-2 transition-all active:scale-[0.97] flex items-center justify-between group",
                    userAnswers[q.id] === opt 
                      ? "bg-primary border-primary text-white shadow-xl shadow-primary/30" 
                      : "bg-muted/30 border-transparent hover:border-primary/40 hover:bg-muted/50"
                  )}
                >
                  <span className="flex items-center gap-4">
                    <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ring-1 ring-inset transition-all", 
                      userAnswers[q.id] === opt ? "bg-white/20 ring-white/20" : "bg-primary/5 ring-primary/20 group-hover:bg-primary/20"
                    )}>
                      {['أ', 'ب', 'ج', 'د'][i]}
                    </span>
                    {opt}
                  </span>
                  {userAnswers[q.id] === opt && <CheckCircle2 className="w-6 h-6 text-white" />}
                </button>
              ))}
            </div>
          </Card>

          <div className="flex items-center justify-between pt-6">
            <Button onClick={handlePrevious} disabled={currentQuestionIndex === 0} variant="ghost" className="h-14 px-8 rounded-2xl font-black gap-2 hover:bg-white/5"><ArrowRight className="w-5 h-5" /> السابق</Button>
            <Button onClick={handleNext} className="h-16 px-12 rounded-[25px] font-black text-xl bg-primary gap-3 shadow-2xl shadow-primary/20 transition-all active:scale-95">
              {currentQuestionIndex === section.questions.length - 1 ? "إنهاء المراجعة" : "السؤال التالي"} <ArrowLeft className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
