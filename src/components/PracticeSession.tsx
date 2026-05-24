'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Section, Question } from '@/lib/practice-data';
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
      const timer = setTimeout(() => setPhase('mode-selection'), 1500);
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
      if (!isCorrect) saveErrorLogToDb(auth.currentUser.uid, q, section.title, opt);
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
    if (!auth.currentUser) return;
    const isAdded = await toggleFavoriteInDb(auth.currentUser.uid, question, section.title);
    setFavorites(prev => isAdded ? [...prev, question.id] : prev.filter(id => id !== question.id));
    toast({ title: isAdded ? "أضيف للمفضلة ⭐" : "حذف من المفضلة" });
  };

  const getMotivation = (score: number) => {
    if (score === 100) return { text: "أداء أسطوري 👑", color: "text-amber-500", icon: Crown };
    if (score >= 90) return { text: "أنت رائع ⭐", color: "text-primary", icon: StarIcon };
    if (score >= 70) return { text: "استمر 🔥", color: "text-emerald-500", icon: Flame };
    return { text: "شد حيلك 💪", color: "text-rose-500", icon: Zap };
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
      <h2 className="text-4xl md:text-7xl font-black animate-pulse">أهم شيء الفهم 💡</h2>
    </div>
  );

  if (phase === 'mode-selection') return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-4xl w-full space-y-12">
        <h1 className="text-4xl md:text-6xl font-black text-center">اختر التحدي</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { id: 'exam-night', title: 'ليلة الاختبار', icon: Moon, desc: '3 دقائق إجمالية' },
            { id: 'pressure', title: 'نظام الضغط', icon: Zap, desc: '60 ثانية للسؤال' },
            { id: 'normal', title: 'التمرين الحر', icon: Play, desc: 'بدون وقت' }
          ].map((m) => (
            <Card key={m.id} onClick={() => selectMode(m.id as PracticeMode)} className="p-8 glass-card cursor-pointer hover:border-primary/50 text-center space-y-4 rounded-3xl">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto"><m.icon className="w-8 h-8 text-primary" /></div>
              <h3 className="text-xl font-black">{m.title}</h3>
              <p className="text-xs font-bold opacity-50">{m.desc}</p>
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
        <div className="max-w-4xl mx-auto py-16 px-6 space-y-12">
          <div className="text-center space-y-6">
            <div className={cn("inline-block p-10 rounded-full bg-primary/5 border-2 border-primary/20", score === 100 && "border-amber-500/50 bg-amber-500/5 shadow-2xl")}>
               <motivation.icon className={cn("w-20 h-20", motivation.color)} />
            </div>
            <h1 className="text-5xl font-black">{motivation.text}</h1>
            <p className="text-3xl font-black opacity-50">{score}%</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'صحيحة', val: correctCount, color: 'text-emerald-500' },
              { label: 'خاطئة', val: section.questions.length - correctCount, color: 'text-rose-500' },
              { label: 'الإجمالي', val: section.questions.length, color: 'text-foreground' },
              { label: 'الزمن', val: Math.floor((Date.now() - (startTime || 0)) / 60000) + 'د', color: 'text-primary' }
            ].map((s, i) => (
              <Card key={i} className="p-6 text-center glass-card rounded-2xl">
                <p className="text-[10px] font-black opacity-30 uppercase mb-1">{s.label}</p>
                <p className={cn("text-2xl font-black", s.color)}>{s.val}</p>
              </Card>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pb-12">
            <Button onClick={() => window.location.reload()} className="flex-1 h-14 text-lg font-black rounded-2xl bg-primary">إعادة</Button>
            <Button onClick={onExit} variant="outline" className="flex-1 h-14 text-lg font-black rounded-2xl">الخروج</Button>
          </div>
        </div>
      </ScrollArea>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" dir="rtl">
      {/* Quiz Header */}
      <div className="p-4 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-50">
        <Button onClick={onExit} variant="ghost" size="sm" className="font-bold gap-2"><ArrowRight className="w-4 h-4" /> انسحاب</Button>
        <div className="flex items-center gap-4">
          {mode !== 'normal' && (
            <div className={cn("px-4 py-1 rounded-full border font-mono font-bold", timeLeft < 20 ? "border-rose-500 text-rose-500 animate-pulse" : "border-border")}>
              {Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2, '0')}
            </div>
          )}
          <span className="font-black text-primary">{currentQuestionIndex + 1} / {section.questions.length}</span>
        </div>
      </div>

      <Progress value={progress} className="h-1 rounded-none bg-border" />

      <main className="flex-1 container mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl">
        {/* Reading Section */}
        {currentPassage && (
          <Card className="hidden lg:flex flex-col p-6 glass-card rounded-2xl border-primary/10 h-[calc(100vh-200px)] sticky top-24">
            <h3 className="text-xl font-black mb-4 flex items-center gap-2"><BookText className="w-5 h-5 text-primary" /> {currentPassage.title}</h3>
            <ScrollArea className="flex-1 pr-4">
              <p className="text-lg leading-relaxed opacity-80 whitespace-pre-wrap">{currentPassage.text}</p>
            </ScrollArea>
          </Card>
        )}

        {/* Question Area */}
        <div className={cn("space-y-6", !currentPassage && "lg:col-span-2 max-w-3xl mx-auto w-full")}>
          <Card className="p-8 glass-card rounded-3xl space-y-8 relative overflow-hidden">
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-2">
                {q.type === 'reading' && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-none">استيعاب مقروء</Badge>
                )}
                <h2 className="text-2xl md:text-3xl font-black leading-tight">{q.question}</h2>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn("rounded-full h-12 w-12 border", favorites.includes(q.id) ? "text-rose-500 border-rose-500/20 bg-rose-500/5" : "opacity-20")}
                onClick={() => toggleFavorite(q)}
              >
                <Heart fill={favorites.includes(q.id) ? "currentColor" : "none"} />
              </Button>
            </div>

            {currentPassage && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="lg:hidden w-full rounded-xl gap-2"><Eye className="w-4 h-4" /> عرض النص</Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] sm:max-w-xl h-[80vh] flex flex-col p-6">
                  <DialogHeader><DialogTitle>{currentPassage.title}</DialogTitle></DialogHeader>
                  <ScrollArea className="flex-1 mt-4"><p className="text-lg leading-relaxed whitespace-pre-wrap">{currentPassage.text}</p></ScrollArea>
                </DialogContent>
              </Dialog>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {q.options.map((opt, i) => (
                <button 
                  key={i} 
                  onClick={() => handleAnswer(opt)}
                  className={cn(
                    "p-5 text-right font-bold rounded-2xl border-2 transition-all active:scale-[0.98]",
                    userAnswers[q.id] === opt ? "bg-primary border-primary text-white" : "bg-muted/30 border-transparent hover:border-primary/30"
                  )}
                >
                  <span className="opacity-30 ml-3">{['أ', 'ب', 'ج', 'د'][i]}.</span> {opt}
                </button>
              ))}
            </div>
          </Card>

          <div className="flex items-center justify-between pt-4">
            <Button onClick={handlePrevious} disabled={currentQuestionIndex === 0} variant="ghost" className="rounded-xl font-bold"><ArrowRight className="ml-2 w-4 h-4" /> السابق</Button>
            <Button onClick={handleNext} className="h-14 px-10 rounded-2xl font-black text-lg bg-primary gap-2">
              {currentQuestionIndex === section.questions.length - 1 ? "إنهاء" : "التالي"} <ArrowLeft className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
