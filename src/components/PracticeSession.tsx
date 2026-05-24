'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Section, Question, ReadingPassage } from '@/lib/practice-data';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ChevronLeft, ChevronRight, Timer, Star, Trophy, RotateCcw, PartyPopper, BookOpen, Clock, Zap, 
  Play, XCircle, Moon, Sparkles, Flower, CheckCircle2, Crown, StarIcon, Flame, Heart, BookText, Eye, ArrowLeft, ArrowRight
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
  const [showPassageMobile, setShowPassageMobile] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (phase === 'intro') {
      const timer = setTimeout(() => setPhase('mode-selection'), 2000);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  useEffect(() => {
    const fetchFavs = async () => {
      if (auth.currentUser) {
        const profile = await getUserProfile(auth.currentUser.uid);
        if (profile?.favorites) setFavorites(profile.favorites.map((f: any) => f.id));
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
      const isCorrect = userAnswers[q.id] === q.correct;
      if (isCorrect) correct++;
      // No need to save errors here as we save them in handleAnswer immediately
    });

    if (auth.currentUser) {
      await saveAttemptToDb(auth.currentUser.uid, {
        sectionId: section.id,
        mode,
        score: Math.round((correct / section.questions.length) * 100),
        correctCount: correct,
        totalQuestions: section.questions.length,
        durationSeconds: Math.floor((Date.now() - startTime) / 1000),
        answers: userAnswers
      });
    }
  }, [phase, section, userAnswers, mode, startTime]);

  const handleNext = useCallback(() => {
    if (currentQuestionIndex < section.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      if (mode === 'pressure') setTimeLeft(60);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else finishSession();
  }, [section.questions, currentQuestionIndex, mode, finishSession]);

  const handlePrevious = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentQuestionIndex]);

  const handleAnswer = async (opt: string) => {
    const q = section.questions[currentQuestionIndex];
    setUserAnswers(p => ({ ...p, [q.id]: opt }));
    
    if (auth.currentUser) {
      const isCorrect = opt === q.correct;
      updateUserXP(auth.currentUser.uid, isCorrect);
      
      // Real-time error logging - SAVE IMMEDIATELY
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
      if (mode === 'pressure') { handleNext(); toast({ title: "انتهى وقت السؤال! ⏱️" }); }
      else finishSession();
    }
  }, [timeLeft, mode, phase, handleNext, finishSession, toast]);

  const toggleFavorite = async (question: Question) => {
    if (!auth.currentUser) return toast({ title: "سجل دخولك أولاً" });
    const isAdded = await toggleFavoriteInDb(auth.currentUser.uid, question, section.title);
    setFavorites(prev => isAdded ? [...prev, question.id] : prev.filter(id => id !== question.id));
    toast({ title: isAdded ? "تمت الإضافة للمفضلة ⭐" : "تمت الإزالة من المفضلة" });
  };

  const getMotivation = (score: number) => {
    if (score === 100) return { text: "ممتاز جداً! أداء أسطوري 👑", color: "text-amber-400", icon: Crown };
    if (score >= 90) return { text: "أحسنت! أنت رائع ⭐", color: "text-primary", icon: StarIcon };
    if (score >= 70) return { text: "أداء جيد، استمر 🔥", color: "text-emerald-400", icon: Flame };
    return { text: "شد حيلك شوية 💪", color: "text-rose-400", icon: Zap };
  };

  const currentQuestion = section.questions[currentQuestionIndex];
  const currentPassage = useMemo(() => {
    if (currentQuestion?.type === 'reading' && currentQuestion.passageTitle) {
      return section.readingPassages?.find(p => p.title === currentQuestion.passageTitle);
    }
    return null;
  }, [currentQuestion, section.readingPassages]);

  if (phase === 'intro') return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-3xl">
      <h2 className="text-5xl md:text-9xl font-black text-white text-glow animate-pulse">أهم شيء الفهم 💡</h2>
    </div>
  );

  if (phase === 'mode-selection') return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-black" dir="rtl">
      <div className="max-w-6xl w-full space-y-20">
        <h1 className="text-7xl md:text-9xl font-black text-white text-center text-glow">اختر التحدي 🎮</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {[
            { id: 'exam-night', title: 'ليلة الاختبار', icon: Moon, color: 'border-indigo-500', desc: '3 دقائق إجمالية' },
            { id: 'pressure', title: 'نظام الضغط', icon: Zap, color: 'border-rose-500', desc: '60 ثانية للسؤال' },
            { id: 'normal', title: 'التمرين الحر', icon: Play, color: 'border-primary', desc: 'بدون وقت' }
          ].map((m) => (
            <Card key={m.id} onClick={() => selectMode(m.id as PracticeMode)} className={cn("p-12 glass-card cursor-pointer transition-all hover:scale-105 active:scale-95 text-center space-y-6 border-2 rounded-[50px]", m.color + "/30 hover:" + m.color)}>
              <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mx-auto shadow-2xl"><m.icon className="w-12 h-12" /></div>
              <h3 className="text-4xl font-black text-white">{m.title}</h3>
              <p className="text-lg text-white/40 font-bold">{m.desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );

  if (phase === 'finished') {
    let correctCount = 0;
    const errors: Question[] = [];
    section.questions.forEach(q => { if (userAnswers[q.id] === q.correct) correctCount++; else errors.push(q); });
    const score = Math.round((correctCount / section.questions.length) * 100);
    const motivation = getMotivation(score);

    return (
      <ScrollArea className="h-screen bg-black" dir="rtl">
        <div className="max-w-6xl mx-auto py-20 px-6 space-y-16">
          <div className="text-center space-y-10 relative">
            <div className={cn(
              "inline-block p-14 rounded-full bg-primary/10 border-4 border-primary/30 animate-bounce", 
              score === 100 && "celebration-glow border-amber-500/50 bg-amber-500/10"
            )}>
               <motivation.icon className={cn("w-32 h-32", motivation.color, score === 100 && "animate-pulse")} />
            </div>
            <div className="space-y-4">
               <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-glow">{motivation.text}</h1>
               {score === 100 && <p className="text-amber-500 font-black animate-pulse text-2xl">لقد حصلت على الدرجة الكاملة! 🎊</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'النسبة', val: score + '%', color: motivation.color },
              { label: 'صحيحة', val: correctCount, color: 'text-green-500' },
              { label: 'خاطئة', val: errors.length, color: 'text-rose-500' },
              { label: 'الأسئلة', val: section.questions.length, color: 'text-white' }
            ].map((s, i) => (
              <Card key={i} className="p-10 text-center glass-card rounded-[40px] border-white/5">
                <p className="text-white/40 font-black mb-2 uppercase tracking-widest text-xs">{s.label}</p>
                <p className={cn("text-5xl font-black", s.color)}>{s.val}</p>
              </Card>
            ))}
          </div>

          {errors.length > 0 && (
            <div className="space-y-10">
              <h2 className="text-4xl font-black text-rose-500 flex items-center gap-4"><XCircle className="w-10 h-10" /> مراجعة الأخطاء</h2>
              <div className="grid gap-8">
                {errors.map((q, idx) => (
                  <Card key={idx} className="p-10 glass-card border-rose-500/20 rounded-[50px] space-y-8">
                    <h3 className="text-3xl font-black leading-tight text-white">{q.question}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-8 bg-rose-500/10 border border-rose-500/20 rounded-[30px]">
                        <p className="text-xs text-rose-500 font-bold mb-3 uppercase tracking-widest">إجابتك:</p>
                        <p className="text-2xl font-black text-white">{userAnswers[q.id] || 'بدون إجابة'}</p>
                      </div>
                      <div className="p-8 bg-green-500/10 border border-green-500/20 rounded-[30px]">
                        <p className="text-xs text-green-500 font-bold mb-3 uppercase tracking-widest">الصحيح:</p>
                        <p className="text-2xl font-black text-white">{q.correct}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-6 pb-20">
            <Button onClick={() => window.location.reload()} className="flex-1 h-24 text-3xl font-black bg-primary rounded-[35px] shadow-2xl active:scale-95"><RotateCcw className="ml-3 w-8 h-8" /> إعادة المحاولة</Button>
            <Button onClick={onExit} variant="outline" className="flex-1 h-24 text-3xl font-black border-white/10 rounded-[35px] active:scale-95">الخروج</Button>
          </div>
        </div>
      </ScrollArea>
    );
  }

  const q = section.questions[currentQuestionIndex];
  return (
    <div className="min-h-screen bg-black text-right pb-40 relative" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-10 space-y-8 md:space-y-12">
        {/* Header Navigation */}
        <div className="flex justify-between items-center glass-card p-4 md:p-6 rounded-[25px] md:rounded-[35px] sticky top-4 md:top-6 z-50 border-white/10 backdrop-blur-3xl shadow-2xl">
          <Button onClick={onExit} variant="ghost" className="text-sm md:text-xl font-black text-white/40 px-2 md:px-4"><ArrowRight className="ml-2 w-4 h-4 md:w-6 md:h-6" /> انسحاب</Button>
          
          <div className="flex items-center gap-2 md:gap-4">
            {mode !== 'normal' && (
              <div className={cn("px-4 md:px-8 py-1.5 md:py-3 rounded-full border-2 font-mono text-xl md:text-4xl font-black shadow-inner transition-all", timeLeft < 20 ? "border-rose-500 text-rose-500 animate-pulse" : "border-white/10 text-white")}>
                {Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2, '0')}
              </div>
            )}
            <div className="text-base md:text-2xl font-black text-primary drop-shadow-glow">{currentQuestionIndex + 1} / {section.questions.length}</div>
          </div>
        </div>

        <Progress value={progress} className="h-2 md:h-4 rounded-full bg-white/5 border border-white/5" />

        <div className={cn("grid gap-8", currentPassage ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1")}>
          {/* Passage Area - Only shows if reading question */}
          {currentPassage && (
            <Card className="hidden lg:flex flex-col p-8 md:p-10 glass-card rounded-[40px] border-primary/20 max-h-[70vh] sticky top-32">
              <div className="flex items-center gap-4 mb-6 border-b border-white/5 pb-4">
                <div className="bg-primary/20 p-3 rounded-2xl">
                  <BookText className="text-primary w-6 h-6" />
                </div>
                <h3 className="text-2xl font-black text-white">{currentPassage.title}</h3>
              </div>
              <ScrollArea className="flex-1 pr-4">
                <p className="text-lg md:text-xl leading-relaxed text-white/80 whitespace-pre-wrap font-medium">
                  {currentPassage.text}
                </p>
              </ScrollArea>
            </Card>
          )}

          {/* Question Card */}
          <div className="space-y-8">
            <Card className="p-8 md:p-12 glass-card rounded-[40px] md:rounded-[60px] border-white/10 space-y-10 relative overflow-hidden shadow-2xl">
              <div className="flex justify-between items-start gap-4 md:gap-8">
                <div className="space-y-4 flex-1">
                  {q.type === 'reading' && (
                    <Badge className="bg-primary/20 text-primary border-none font-black text-xs px-3 mb-2 flex items-center gap-2 w-fit">
                      <BookOpen className="w-3 h-3" /> استيعاب مقروء
                    </Badge>
                  )}
                  <h2 className={cn("font-black leading-tight text-white", q.question.length > 50 ? "text-2xl md:text-4xl" : "text-3xl md:text-6xl")}>
                    {q.question}
                  </h2>
                </div>
                <Button variant="ghost" size="icon" className={cn("w-14 h-14 md:w-20 md:h-20 rounded-full border-2 transition-all active:scale-90 shrink-0", favorites.includes(q.id) ? "bg-rose-500/20 text-rose-500 border-rose-500 shadow-glow" : "border-white/5 text-white/20")} onClick={() => toggleFavorite(q)}>
                  <Heart fill={favorites.includes(q.id) ? "currentColor" : "none"} className="w-6 h-6 md:w-10 md:h-10" />
                </Button>
              </div>

              {/* Mobile View Passage Button */}
              {currentPassage && (
                <Dialog open={showPassageMobile} onOpenChange={setShowPassageMobile}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="lg:hidden w-full h-14 rounded-2xl border-primary/40 text-primary font-black gap-2">
                      <Eye className="w-5 h-5" /> عرض نص القطعة
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[90vw] rounded-[30px] glass-card border-primary/30 p-6 md:p-10 outline-none overflow-hidden h-[80vh] flex flex-col">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-black text-right flex items-center gap-3">
                         <BookText className="text-primary" /> {currentPassage.title}
                      </DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="flex-1 mt-6 pr-4">
                      <p className="text-lg leading-relaxed text-white/80 whitespace-pre-wrap font-medium text-right">
                        {currentPassage.text}
                      </p>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {q.options.map((opt, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleAnswer(opt)} 
                    className={cn(
                      "p-6 md:p-8 rounded-[25px] md:rounded-[40px] text-right font-black transition-all border-2 relative overflow-hidden group",
                      opt.length > 20 ? "text-lg md:text-2xl" : "text-xl md:text-3xl",
                      userAnswers[q.id] === opt ? "bg-primary text-white border-white scale-[1.02] shadow-2xl" : "bg-white/5 text-white border-white/5 hover:border-primary/40 active:scale-95"
                    )}
                  >
                    <span className="opacity-30 ml-4 md:ml-6 font-bold">{['أ', 'ب', 'ج', 'د'][i]}.</span> {opt}
                    {userAnswers[q.id] === opt && <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none" />}
                  </button>
                ))}
              </div>
            </Card>

            {/* Navigation Buttons */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
               <Button 
                onClick={handlePrevious} 
                disabled={currentQuestionIndex === 0}
                variant="ghost"
                className="w-full md:w-auto px-12 h-20 text-2xl font-black text-white/20 hover:text-white/60 hover:bg-white/5 rounded-[30px] disabled:opacity-0 transition-all"
               >
                 <ArrowRight className="ml-3" /> السابق
               </Button>
               
               <Button 
                onClick={handleNext} 
                className="w-full md:w-auto px-16 md:px-24 h-24 md:h-28 text-3xl md:text-5xl font-black bg-primary rounded-[35px] md:rounded-[40px] shadow-2xl active:scale-95 transition-all shadow-primary/20"
               >
                 {currentQuestionIndex === section.questions.length - 1 ? "إنهاء 🏁" : "التالي"} <ArrowLeft className="mr-3 w-6 h-6 md:w-8 md:h-8" />
               </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}