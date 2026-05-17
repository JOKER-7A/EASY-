
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
  Play
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

  // Intro Logic
  useEffect(() => {
    if (phase === 'intro') {
      const timer = setTimeout(() => {
        setPhase('mode-selection');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  const selectMode = (selectedMode: PracticeMode) => {
    setMode(selectedMode);
    if (selectedMode === 'exam-night') setTimeLeft(180);
    else if (selectedMode === 'pressure') setTimeLeft(60);
    else setTimeLeft(0);
    
    setStartTime(Date.now());
    setPhase('practicing');
  };

  useEffect(() => {
    const savedFavs = localStorage.getItem('easy-favorites');
    if (savedFavs) setFavorites(JSON.parse(savedFavs));
  }, []);

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

  useEffect(() => {
    if (!isFreeMode && timeLeft === 0 && phase === 'practicing') {
      if (isPressureMode) {
        handleNext();
        toast({ title: "انتهى وقت السؤال! ⏱️", description: "تم الانتقال للسؤال التالي." });
      } else if (isExamNight) {
        finishSession();
        toast({ title: "انتهى وقت الاختبار! 🛑", variant: "destructive" });
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
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-midnight/95 backdrop-blur-3xl animate-in fade-in duration-1000">
        <div className="text-center space-y-12 px-6">
          <div className="relative">
            <div className="absolute -inset-4 bg-goldenrod/20 blur-2xl rounded-full animate-pulse" />
            <h2 className="text-6xl md:text-8xl font-headline font-black text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
              أهم شيء الفهم وليس الحفظ 💡
            </h2>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-goldenrod/80 tracking-widest animate-pulse">
            جاري تهيئة بيئة التدريب...
          </p>
        </div>
      </div>
    );
  }

  if (phase === 'mode-selection') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-midnight animate-in fade-in slide-in-from-bottom-12 duration-700">
        <div className="max-w-6xl w-full space-y-16">
          <div className="text-center space-y-4">
            <h1 className="text-6xl font-black text-white">اختر وضع التحدي 🎮</h1>
            <p className="text-2xl text-muted-foreground font-bold">حدد الطريقة التي تناسب أسلوبك في المذاكرة</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card 
              onClick={() => selectMode('exam-night')}
              className="p-12 glass border-indigo-500/30 hover:border-indigo-500 hover:scale-105 transition-all cursor-pointer group rounded-[50px] text-center space-y-8"
            >
              <div className="w-24 h-24 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                <Moon className="w-12 h-12 text-indigo-400" />
              </div>
              <div className="space-y-4">
                <h3 className="text-4xl font-black text-white">ليلة الاختبار 🕒</h3>
                <p className="text-lg text-muted-foreground font-medium">اختبار شامل بمؤقت إجمالي 3 دقائق. يحاكي ضغط الاختبار النهائي.</p>
              </div>
            </Card>

            <Card 
              onClick={() => selectMode('pressure')}
              className="p-12 glass border-vermillion/30 hover:border-vermillion hover:scale-105 transition-all cursor-pointer group rounded-[50px] text-center space-y-8"
            >
              <div className="w-24 h-24 bg-vermillion/10 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                <Zap className="w-12 h-12 text-vermillion" />
              </div>
              <div className="space-y-4">
                <h3 className="text-4xl font-black text-white">نظام الضغط ⚡</h3>
                <p className="text-lg text-muted-foreground font-medium">60 ثانية لكل سؤال. تدرب على سرعة البديهة والتركيز العالي.</p>
              </div>
            </Card>

            <Card 
              onClick={() => selectMode('normal')}
              className="p-12 glass border-goldenrod/30 hover:border-goldenrod hover:scale-105 transition-all cursor-pointer group rounded-[50px] text-center space-y-8"
            >
              <div className="w-24 h-24 bg-goldenrod/10 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                <Play className="w-12 h-12 text-goldenrod" />
              </div>
              <div className="space-y-4">
                <h3 className="text-4xl font-black text-white">التمرين الحر 🧘</h3>
                <p className="text-lg text-muted-foreground font-medium">بدون أي مؤقت. خذ وقتك في الفهم والتحليل بعمق.</p>
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
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in duration-700 py-20 px-4 text-right" dir="rtl">
        <div className="text-center space-y-6">
          <div className="inline-block p-6 rounded-full bg-goldenrod/10 border-2 border-goldenrod/30 shadow-[0_0_50px_rgba(230,172,0,0.3)] mb-4">
            {percentage >= 90 ? <PartyPopper className="w-20 h-20 text-goldenrod" /> : <Trophy className="w-20 h-20 text-goldenrod" />}
          </div>
          <h1 className="text-7xl font-headline font-black text-white drop-shadow-2xl">
            {percentage >= 90 ? "أداء أسطوري! 🔥" : "عمل رائع! 👍"}
          </h1>
          <div className="flex flex-wrap justify-center gap-4">
            <Badge className="bg-goldenrod/20 text-goldenrod border-goldenrod/40 text-xl px-8 py-2 rounded-full">
              الوضع: {isPressureMode ? "ضغط ⚡" : isExamNight ? "ليلة الاختبار 🕒" : "تدريب حر 🧘"}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <Card className="p-10 text-center glass border-goldenrod/30 gold-glow">
            <p className="text-muted-foreground mb-2 font-bold">النسبة</p>
            <p className="text-5xl font-black text-goldenrod">{percentage}%</p>
          </Card>
          <Card className="p-10 text-center glass border-green-500/30">
            <p className="text-muted-foreground mb-2 font-bold">إجابات صحيحة</p>
            <p className="text-5xl font-black text-green-500">{correct}</p>
          </Card>
          <Card className="p-10 text-center glass border-vermillion/30">
            <p className="text-muted-foreground mb-2 font-bold">إجابات خاطئة</p>
            <p className="text-5xl font-black text-vermillion">{section.questions.length - correct}</p>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-6">
          <button onClick={() => window.location.reload()} className="flex-1 h-24 text-3xl font-black bg-goldenrod text-midnight rounded-[35px] hover:scale-[1.05] transition-all flex items-center justify-center">
            <RotateCcw className="ml-3" /> إعادة الاختبار
          </button>
          <button onClick={onExit} className="flex-1 h-24 text-3xl font-black border-4 border-goldenrod text-goldenrod hover:bg-goldenrod/10 rounded-[35px] flex items-center justify-center">
            خروج للرئيسية
          </button>
        </div>
      </div>
    );
  }

  const associatedPassage = section.readingPassages?.find(p => p.title === currentGroup[0]?.passageTitle);

  return (
    <div className={cn(
      "max-w-5xl mx-auto space-y-8 animate-in slide-in-from-bottom-8 duration-700 py-12 pb-20 px-4 transition-all text-right relative",
      isTimeLow && !isFreeMode && "animate-shake",
    )} dir="rtl">
      
      <div className={cn(
        "flex justify-between items-center bg-midnight/70 p-6 rounded-[40px] border-2 border-white/5 backdrop-blur-2xl sticky top-4 z-50 shadow-2xl transition-all",
        !isFreeMode && isTimeLow && "border-vermillion bg-vermillion/20 scale-[1.02]"
      )}>
        <Button onClick={onExit} variant="ghost" className="text-muted-foreground hover:text-white rounded-full font-bold">
          <ChevronLeft className="ml-2" /> انسحاب
        </Button>

        {!isFreeMode ? (
          <div className={cn(
            "flex items-center gap-4 px-8 py-3 rounded-full border-2 transition-all",
            isTimeLow ? "bg-vermillion border-white text-white animate-pulse" : "bg-white/5 border-white/10 text-white"
          )}>
            {isPressureMode ? <Flame className="w-7 h-7" /> : <Clock className="w-7 h-7" />}
            <span className="text-3xl font-black font-mono tracking-widest">{formatTime(timeLeft)}</span>
          </div>
        ) : (
          <Badge className="bg-white/5 px-8 py-3 rounded-full border border-white/10 text-muted-foreground text-xl">
            تدريب حر 🧘‍♂️
          </Badge>
        )}

        <div className="text-left font-black">
          <span className={cn("text-4xl text-goldenrod")}>
            {currentQuestionIndex + 1}
          </span>
          <span className="text-muted-foreground"> / {section.questions.length}</span>
        </div>
      </div>

      <div className="px-4">
        <Progress value={progress} className="h-4 rounded-full bg-white/5 border border-white/10" />
      </div>

      <div className="space-y-8">
        {associatedPassage && (
          <Card className="p-10 glass rounded-[50px] border-2 border-goldenrod/20 mb-8">
             <div className="flex items-center gap-4 mb-6">
              <BookOpen className="w-8 h-8 text-goldenrod" />
              <h2 className="text-4xl font-black text-white">{associatedPassage.title}</h2>
            </div>
            <div className="text-2xl leading-relaxed text-white/90 whitespace-pre-wrap">
              {associatedPassage.text}
            </div>
          </Card>
        )}

        {currentGroup.map((q) => (
          <Card key={q.id} className={cn(
            "p-12 glass rounded-[60px] border-2 border-white/5 relative overflow-hidden group shadow-2xl",
            isPressureMode && "border-vermillion/20",
            isExamNight && "border-indigo-500/20"
          )}>
            <div className="flex justify-between items-start mb-12 gap-8">
              <h2 className="text-5xl font-headline font-black leading-tight text-white flex-1">
                {q.question}
              </h2>
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn(
                  "rounded-full w-16 h-16 transition-all",
                  favorites.includes(q.id) ? 'bg-goldenrod text-midnight' : 'bg-white/5 text-white'
                )}
                onClick={() => toggleFavorite(q.id)}
              >
                <Star fill={favorites.includes(q.id) ? 'currentColor' : 'none'} className="w-8 h-8" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {q.options.map((option, i) => {
                const isSelected = userAnswers[q.id] === option;
                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(option, q.id)}
                    className={cn(
                      "p-8 rounded-[35px] text-right text-2xl font-black transition-all border-2",
                      isSelected ? 'bg-goldenrod text-midnight border-goldenrod scale-[1.02]' : 'bg-white/5 text-white border-white/5 hover:border-goldenrod/40'
                    )}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      <div className="flex justify-end pt-12">
        <button 
          onClick={handleNext} 
          className="px-20 py-10 rounded-[40px] text-4xl font-black bg-goldenrod text-midnight hover:scale-[1.05] transition-all"
        >
          {currentQuestionIndex + currentGroup.length >= section.questions.length ? 'إنهاء الاختبار 🏁' : 'السؤال التالي 🚀'}
        </button>
      </div>
    </div>
  );
}
