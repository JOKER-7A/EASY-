'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Section, Question } from '@/lib/practice-data';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  Timer, 
  Star, 
  Trophy, 
  RotateCcw, 
  PartyPopper,
  Flame,
  BookOpen,
  Moon,
  Clock,
  Zap,
  Play,
  ArrowRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { saveAttemptToDb } from '@/lib/db-service';

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

  // 🎯 Phase 1: Intro Logic (2.5 seconds)
  useEffect(() => {
    if (phase === 'intro') {
      const timer = setTimeout(() => {
        setPhase('mode-selection');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // 🎮 Phase 2: Mode Selection
  const selectMode = (selectedMode: PracticeMode) => {
    setMode(selectedMode);
    if (selectedMode === 'exam-night') setTimeLeft(180); // 3 minutes total
    else if (selectedMode === 'pressure') setTimeLeft(60); // 60 seconds per question
    else setTimeLeft(0);
    
    setStartTime(Date.now());
    setPhase('practicing');
  };

  useEffect(() => {
    const savedFavs = localStorage.getItem('easy-favorites');
    if (savedFavs) setFavorites(JSON.parse(savedFavs));
  }, []);

  // 📝 Phase 3: Practice Logic
  const currentGroup = useMemo(() => {
    if (phase !== 'practicing' || !section.questions[currentQuestionIndex]) return [];
    const q = section.questions[currentQuestionIndex];
    if (q.type !== 'reading' || !q.passageTitle) return [q];
    return section.questions.filter(item => item.passageTitle === q.passageTitle);
  }, [section.questions, currentQuestionIndex, phase]);

  const progress = ((currentQuestionIndex + 1) / section.questions.length) * 100;
  
  const isPressureMode = mode === 'pressure';
  const isExamNight = mode === 'exam-night';
  const isFreeMode = mode === 'normal';
  const isTimeLow = timeLeft < 20;

  const finishSession = useCallback(async () => {
    if (phase === 'finished' || !startTime) return;
    setPhase('finished');
    
    let correct = 0;
    section.questions.forEach((q) => {
      if (userAnswers[q.id] === q.correct) correct++;
    });

    const score = Math.round((correct / section.questions.length) * 100);
    const durationInSeconds = Math.floor((Date.now() - startTime) / 1000);
    
    await saveAttemptToDb({
      sectionId: section.id,
      mode,
      score,
      correctCount: correct,
      totalQuestions: section.questions.length,
      durationSeconds: durationInSeconds,
      answers: userAnswers
    });
  }, [phase, section, userAnswers, mode, startTime]);

  const handleNext = useCallback(() => {
    if (currentGroup.length === 0) return;
    const lastIndexInGroup = section.questions.findIndex(q => q.id === currentGroup[currentGroup.length - 1].id);
    if (lastIndexInGroup < section.questions.length - 1) {
      setCurrentQuestionIndex(lastIndexInGroup + 1);
      if (isPressureMode) setTimeLeft(60); 
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      finishSession();
    }
  }, [section.questions, currentGroup, isPressureMode, finishSession]);

  // Timer Countdown
  useEffect(() => {
    if (isFreeMode || phase !== 'practicing') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isFreeMode, phase]);

  // Time Out Handler
  useEffect(() => {
    if (!isFreeMode && timeLeft === 0 && phase === 'practicing') {
      if (isPressureMode) {
        handleNext();
        toast({ title: "انتهى وقت السؤال! ⏱️", description: "تم الانتقال للسؤال التالي تلقائياً." });
      } else if (isExamNight) {
        finishSession();
        toast({ title: "انتهى وقت الاختبار بالكامل! 🛑", variant: "destructive" });
      }
    }
  }, [timeLeft, isPressureMode, isExamNight, isFreeMode, phase, handleNext, finishSession, toast]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswer = (option: string, questionId: string) => {
    if (phase !== 'practicing') return;
    setUserAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  const toggleFavorite = (id: string) => {
    let newFavs = [...favorites];
    if (newFavs.includes(id)) {
      newFavs = newFavs.filter(f => f !== id);
    } else {
      newFavs.push(id);
    }
    setFavorites(newFavs);
    localStorage.setItem('easy-favorites', JSON.stringify(newFavs));
  };

  if (phase === 'intro') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-midnight/98 backdrop-blur-3xl animate-in fade-in duration-1000">
        <div className="text-center space-y-12 px-6">
          <div className="relative">
            <div className="absolute -inset-8 bg-goldenrod/10 blur-[80px] rounded-full animate-pulse" />
            <h2 className="text-5xl md:text-8xl font-black text-white drop-shadow-[0_0_30px_rgba(230,172,0,0.5)]">
              أهم شيء الفهم وليس الحفظ 💡
            </h2>
          </div>
          <p className="text-xl md:text-2xl font-bold text-goldenrod/60 tracking-widest animate-pulse">
            جاري تهيئة بيئة الاختبار الاحترافية...
          </p>
        </div>
      </div>
    );
  }

  if (phase === 'mode-selection') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-midnight animate-in fade-in slide-in-from-bottom-20 duration-1000">
        <div className="max-w-6xl w-full space-y-16">
          <div className="text-center space-y-6">
            <h1 className="text-6xl md:text-8xl font-black text-white">اختر وضع التحدي 🎮</h1>
            <p className="text-2xl text-muted-foreground font-bold opacity-60">"حدد الطريقة التي تناسب مستوى تركيزك الآن"</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card 
              onClick={() => selectMode('exam-night')}
              className="p-12 glass border-indigo-500/30 hover:border-indigo-500 hover:scale-[1.03] transition-all cursor-pointer group rounded-[60px] text-center space-y-8 relative overflow-hidden"
            >
              <div className="w-24 h-24 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                <Moon className="w-12 h-12 text-indigo-400" />
              </div>
              <div className="space-y-4">
                <h3 className="text-4xl font-black text-white">ليلة الاختبار 🕒</h3>
                <p className="text-lg text-muted-foreground font-medium">اختبار كامل بمؤقت إجمالي 3 دقائق. يحاكي ضغط ليلة الاختبار الحقيقية.</p>
              </div>
            </Card>

            <Card 
              onClick={() => selectMode('pressure')}
              className="p-12 glass border-vermillion/30 hover:border-vermillion hover:scale-[1.03] transition-all cursor-pointer group rounded-[60px] text-center space-y-8 relative overflow-hidden"
            >
              <div className="w-24 h-24 bg-vermillion/20 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                <Zap className="w-12 h-12 text-vermillion" />
              </div>
              <div className="space-y-4">
                <h3 className="text-4xl font-black text-white">نظام الضغط ⚡</h3>
                <p className="text-lg text-muted-foreground font-medium">60 ثانية لكل سؤال. تدرب على سرعة البديهة والتعامل مع ضيق الوقت.</p>
              </div>
            </Card>

            <Card 
              onClick={() => selectMode('normal')}
              className="p-12 glass border-goldenrod/30 hover:border-goldenrod hover:scale-[1.03] transition-all cursor-pointer group rounded-[60px] text-center space-y-8 relative overflow-hidden"
            >
              <div className="w-24 h-24 bg-goldenrod/20 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                <Play className="w-12 h-12 text-goldenrod" />
              </div>
              <div className="space-y-4">
                <h3 className="text-4xl font-black text-white">التمرين الحر 🧘</h3>
                <p className="text-lg text-muted-foreground font-medium">بدون أي مؤقت زمني. خذ كامل وقتك في تحليل السؤال وفهمه بعمق.</p>
              </div>
            </Card>
          </div>
          
          <div className="text-center">
            <Button variant="ghost" onClick={onExit} className="text-xl text-muted-foreground hover:text-white rounded-full px-12 h-16">
              <ChevronLeft className="ml-2" /> العودة للرئيسية
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'finished') {
    let correct = 0;
    section.questions.forEach((q) => {
      if (userAnswers[q.id] === q.correct) correct++;
    });
    const percentage = Math.round((correct / section.questions.length) * 100);

    return (
      <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in zoom-in duration-700 py-20 px-4 text-right" dir="rtl">
        <div className="text-center space-y-8">
          <div className="inline-block p-12 rounded-full bg-goldenrod/10 border-4 border-goldenrod/30 shadow-[0_0_80px_rgba(230,172,0,0.3)] mb-4">
            {percentage >= 90 ? <PartyPopper className="w-32 h-32 text-goldenrod" /> : <Trophy className="w-32 h-32 text-goldenrod" />}
          </div>
          <h1 className="text-7xl md:text-9xl font-black text-white drop-shadow-2xl">
            {percentage >= 90 ? "أداء أسطوري! 🔥" : "استمر، أنت تبدع! 🚀"}
          </h1>
          <Badge className="bg-goldenrod/20 text-goldenrod border-goldenrod/40 text-3xl px-12 py-4 rounded-full">
            الوضع: {isPressureMode ? "ضغط ⚡" : isExamNight ? "ليلة الاختبار 🕒" : "تدريب حر 🧘"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="p-12 text-center glass border-goldenrod/30 gold-glow rounded-[60px]">
            <p className="text-muted-foreground mb-4 font-black text-xl">النسبة</p>
            <p className="text-8xl font-black text-goldenrod">{percentage}%</p>
          </Card>
          <Card className="p-12 text-center glass border-green-500/30 rounded-[60px]">
            <p className="text-muted-foreground mb-4 font-black text-xl">صحيحة</p>
            <p className="text-8xl font-black text-green-500">{correct}</p>
          </Card>
          <Card className="p-12 text-center glass border-vermillion/30 rounded-[60px]">
            <p className="text-muted-foreground mb-4 font-black text-xl">خاطئة</p>
            <p className="text-8xl font-black text-vermillion">{section.questions.length - correct}</p>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-8 pt-12">
          <button onClick={() => window.location.reload()} className="flex-1 h-32 text-4xl font-black bg-goldenrod text-midnight rounded-[50px] hover:scale-[1.03] transition-all flex items-center justify-center shadow-2xl">
            <RotateCcw className="ml-4 w-12 h-12" /> إعادة المحاولة
          </button>
          <button onClick={onExit} className="flex-1 h-32 text-4xl font-black border-4 border-goldenrod text-goldenrod hover:bg-goldenrod/10 rounded-[50px] flex items-center justify-center transition-all">
            الخروج للرئيسية
          </button>
        </div>
      </div>
    );
  }

  const associatedPassage = section.readingPassages?.find(p => p.title === currentGroup[0]?.passageTitle);

  return (
    <div className={cn(
      "max-w-5xl mx-auto space-y-12 animate-in slide-in-from-bottom-20 duration-700 py-16 pb-40 px-4 transition-all text-right",
      isTimeLow && !isFreeMode && "animate-shake",
    )} dir="rtl">
      
      <div className={cn(
        "flex justify-between items-center bg-midnight/90 p-10 rounded-[60px] border-2 border-white/5 backdrop-blur-3xl sticky top-8 z-50 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] transition-all",
        !isFreeMode && isTimeLow && "border-vermillion bg-vermillion/20 scale-[1.02]"
      )}>
        <Button onClick={onExit} variant="ghost" className="text-2xl text-muted-foreground hover:text-white rounded-full font-black px-10 h-16">
          <ChevronLeft className="ml-2" /> انسحاب
        </Button>

        {!isFreeMode ? (
          <div className={cn(
            "flex items-center gap-8 px-12 py-5 rounded-full border-2 transition-all",
            isTimeLow ? "bg-vermillion border-white text-white animate-pulse shadow-[0_0_50px_rgba(255,77,51,0.6)]" : "bg-white/5 border-white/10 text-white"
          )}>
            {isPressureMode ? <Flame className="w-10 h-10" /> : <Clock className="w-10 h-10" />}
            <span className="text-5xl font-black font-mono tracking-tighter">{formatTime(timeLeft)}</span>
          </div>
        ) : (
          <Badge className="bg-white/5 px-12 py-5 rounded-full border border-white/10 text-muted-foreground text-3xl font-black">
            تمرين حر 🧘
          </Badge>
        )}

        <div className="text-left font-black">
          <span className="text-6xl text-goldenrod">{currentQuestionIndex + 1}</span>
          <span className="text-3xl text-muted-foreground opacity-40"> / {section.questions.length}</span>
        </div>
      </div>

      <Progress value={progress} className="h-6 rounded-full bg-white/5 border border-white/10 shadow-inner" />

      <div className="space-y-16">
        {associatedPassage && (
          <Card className="p-16 glass rounded-[80px] border-2 border-goldenrod/30 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-6 h-full bg-goldenrod/20" />
             <div className="flex items-center gap-8 mb-12">
              <div className="p-5 bg-goldenrod/10 rounded-[35px]">
                <BookOpen className="w-12 h-12 text-goldenrod" />
              </div>
              <h2 className="text-6xl font-black text-white">{associatedPassage.title}</h2>
            </div>
            <div className="text-4xl leading-[1.8] text-white/95 whitespace-pre-wrap font-bold">
              {associatedPassage.text}
            </div>
          </Card>
        )}

        {currentGroup.map((q) => (
          <Card key={q.id} className={cn(
            "p-20 glass rounded-[100px] border-2 border-white/5 relative overflow-hidden shadow-[0_50px_150px_rgba(0,0,0,0.6)]",
            isPressureMode && "border-vermillion/30",
            isExamNight && "border-indigo-500/30"
          )}>
            <div className="flex justify-between items-start mb-16 gap-12">
              <h2 className="text-7xl font-black leading-tight text-white flex-1">
                {q.question}
              </h2>
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn(
                  "rounded-full w-24 h-24 transition-all shadow-2xl",
                  favorites.includes(q.id) ? 'bg-goldenrod text-midnight scale-110' : 'bg-white/5 text-white'
                )}
                onClick={() => toggleFavorite(q.id)}
              >
                <Star fill={favorites.includes(q.id) ? 'currentColor' : 'none'} className="w-12 h-12" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {q.options.map((option, i) => {
                const isSelected = userAnswers[q.id] === option;
                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(option, q.id)}
                    className={cn(
                      "p-12 rounded-[55px] text-right text-4xl font-black transition-all border-4 shadow-xl",
                      isSelected 
                        ? 'bg-goldenrod text-midnight border-white scale-[1.02] shadow-[0_30px_60px_rgba(230,172,0,0.4)]' 
                        : 'bg-white/5 text-white border-white/5 hover:border-goldenrod/40 hover:bg-white/10'
                    )}
                  >
                    <span className="opacity-40 ml-6">{['أ', 'ب', 'ج', 'د'][i]}.</span> {option}
                  </button>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      <div className="flex justify-center md:justify-end pt-20">
        <button 
          onClick={handleNext} 
          className="group relative px-28 py-14 rounded-[60px] text-6xl font-black bg-goldenrod text-midnight hover:scale-[1.05] transition-all shadow-[0_40px_80px_-15px_rgba(230,172,0,0.5)] overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-700" />
          <span className="relative z-10 flex items-center gap-6">
            {currentQuestionIndex + currentGroup.length >= section.questions.length ? 'إنهاء التحدي 🏁' : 'السؤال التالي 🚀'}
          </span>
        </button>
      </div>
    </div>
  );
}
