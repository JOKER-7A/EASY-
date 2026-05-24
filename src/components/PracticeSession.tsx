'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Section, Question } from '@/lib/practice-data';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ChevronLeft, Timer, Star, Trophy, RotateCcw, PartyPopper, BookOpen, Clock, Zap, 
  Play, XCircle, Moon, Sparkles, Flower, CheckCircle2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { saveAttemptToDb, toggleFavoriteInDb, saveErrorLogToDb, getUserProfile } from '@/lib/db-service';
import { auth } from '@/lib/firebase';

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
      else if (auth.currentUser) {
        saveErrorLogToDb(auth.currentUser.uid, q, section.title, userAnswers[q.id] || 'بدون إجابة');
      }
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
    toast({ title: isAdded ? "تمت الإضافة ⭐" : "تمت الإزالة" });
  };

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
            <Card key={m.id} onClick={() => selectMode(m.id as PracticeMode)} className={cn("p-12 glass cursor-pointer transition-all hover:scale-105 active:scale-95 text-center space-y-6 border-2 rounded-[50px]", m.color + "/30 hover:" + m.color)}>
              <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mx-auto"><m.icon className="w-12 h-12" /></div>
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

    return (
      <ScrollArea className="h-screen bg-black" dir="rtl">
        <div className="max-w-6xl mx-auto py-20 px-6 space-y-16">
          <div className="text-center space-y-10">
            <div className="inline-block p-14 rounded-full bg-primary/10 border-4 border-primary/30 animate-bounce"><Trophy className="w-32 h-32 text-primary" /></div>
            <h1 className="text-6xl md:text-[8rem] font-black tracking-tighter text-glow">{score === 100 ? "أنت أسطورة 🔥" : "أداء رائع ✨"}</h1>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'النسبة', val: score + '%', color: 'text-primary' },
              { label: 'صحيحة', val: correctCount, color: 'text-green-500' },
              { label: 'خاطئة', val: errors.length, color: 'text-rose-500' },
              { label: 'الأسئلة', val: section.questions.length, color: 'text-white' }
            ].map((s, i) => (
              <Card key={i} className="p-10 text-center glass rounded-[40px] border-white/5">
                <p className="text-white/40 font-black mb-2">{s.label}</p>
                <p className={cn("text-5xl font-black", s.color)}>{s.val}</p>
              </Card>
            ))}
          </div>

          {errors.length > 0 && (
            <div className="space-y-10">
              <h2 className="text-4xl font-black text-rose-500 flex items-center gap-4"><XCircle className="w-10 h-10" /> مراجعة الأخطاء</h2>
              <div className="grid gap-8">
                {errors.map((q, idx) => (
                  <Card key={idx} className="p-10 glass border-rose-500/20 rounded-[50px] space-y-8">
                    <h3 className="text-3xl font-black leading-tight text-white">{q.question}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-3xl">
                        <p className="text-xs text-rose-500 font-bold mb-2">إجابتك:</p>
                        <p className="text-2xl font-black text-white">{userAnswers[q.id] || 'بدون إجابة'}</p>
                      </div>
                      <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-3xl">
                        <p className="text-xs text-green-500 font-bold mb-2">الصحيح:</p>
                        <p className="text-2xl font-black text-white">{q.correct}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-6">
            <Button onClick={() => window.location.reload()} className="flex-1 h-24 text-3xl font-black bg-primary rounded-[30px] shadow-2xl"><RotateCcw className="ml-3" /> إعادة المحاولة</Button>
            <Button onClick={onExit} variant="outline" className="flex-1 h-24 text-3xl font-black border-white/10 rounded-[30px]">الخروج</Button>
          </div>
        </div>
      </ScrollArea>
    );
  }

  const q = section.questions[currentQuestionIndex];
  return (
    <div className="min-h-screen bg-black text-right pb-40" dir="rtl">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-12">
        <div className="flex justify-between items-center glass p-6 rounded-[35px] sticky top-6 z-50 border-white/5 backdrop-blur-3xl">
          <Button onClick={onExit} variant="ghost" className="text-xl font-black text-white/40"><ChevronLeft className="ml-2" /> انسحاب</Button>
          {mode !== 'normal' && (
            <div className={cn("px-8 py-3 rounded-full border-2 font-mono text-3xl font-black", timeLeft < 20 ? "border-rose-500 text-rose-500 animate-pulse" : "border-white/10 text-white")}>
              {Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2, '0')}
            </div>
          )}
          <div className="text-2xl font-black text-primary">{currentQuestionIndex + 1} / {section.questions.length}</div>
        </div>

        <Progress value={progress} className="h-3 rounded-full bg-white/5" />

        <Card className="p-12 glass rounded-[60px] border-white/5 space-y-12 relative overflow-hidden">
          <div className="flex justify-between items-start gap-6">
            <h2 className="text-4xl md:text-6xl font-black leading-tight text-white flex-1">{q.question}</h2>
            <Button variant="ghost" size="icon" className={cn("w-20 h-20 rounded-full border-2", favorites.includes(q.id) ? "bg-primary text-white border-white" : "border-white/5 text-white/20")} onClick={() => toggleFavorite(q)}>
              <Star fill={favorites.includes(q.id) ? "currentColor" : "none"} className="w-10 h-10" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {q.options.map((opt, i) => (
              <button key={i} onClick={() => setUserAnswers(p => ({ ...p, [q.id]: opt }))} className={cn("p-8 rounded-[35px] text-right text-2xl font-black transition-all border-2", userAnswers[q.id] === opt ? "bg-primary text-white border-white scale-[1.02]" : "bg-white/5 text-white border-white/5 hover:border-primary/40")}>
                <span className="opacity-30 ml-4">{['أ', 'ب', 'ج', 'د'][i]}.</span> {opt}
              </button>
            ))}
          </div>
        </Card>

        <div className="flex justify-center md:justify-end">
          <Button onClick={handleNext} className="w-full md:w-auto px-20 h-24 text-4xl font-black bg-primary rounded-[30px] shadow-2xl active:scale-95 transition-all">
            {currentQuestionIndex === section.questions.length - 1 ? "إنهاء 🏁" : "التالي 🚀"}
          </Button>
        </div>
      </div>
    </div>
  );
}
