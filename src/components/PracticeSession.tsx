'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Section, Question } from '@/lib/practice-data';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ChevronLeft, 
  Timer, 
  Star, 
  Trophy, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  PartyPopper,
  Flame,
  AlertTriangle,
  BookOpen,
  Moon,
  Clock,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { PracticeMode } from '@/app/page';
import { saveAttemptToDb } from '@/lib/db-service';

interface PracticeSessionProps {
  section: Section;
  onExit: () => void;
  mode: PracticeMode;
}

export default function PracticeSession({ section, onExit, mode }: PracticeSessionProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [isFinished, setIsFinished] = useState(false);
  const [showIntro, setShowIntro] = useState(mode === 'exam-night');
  
  // منطق التايمر حسب الوضع:
  // Full Mode (exam-night): 180s total
  // Pressure Mode (pressure): 60s per question
  // Free Mode (normal): No timer
  const getInitialTime = useCallback(() => {
    if (mode === 'exam-night') return 180;
    if (mode === 'pressure') return 60;
    return 0;
  }, [mode]);

  const [timeLeft, setTimeLeft] = useState(getInitialTime()); 
  const [startTime, setStartTime] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const { toast } = useToast();
  
  const isPressureMode = mode === 'pressure';
  const isExamNight = mode === 'exam-night';
  const isFreeMode = mode === 'normal';

  useEffect(() => {
    setStartTime(Date.now());
    const savedFavs = localStorage.getItem('easy-favorites');
    if (savedFavs) setFavorites(JSON.parse(savedFavs));
  }, []);

  useEffect(() => {
    if (showIntro) {
      const timer = setTimeout(() => setShowIntro(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [showIntro]);

  const currentGroup = useMemo(() => {
    if (!section.questions[currentQuestionIndex]) return [];
    const q = section.questions[currentQuestionIndex];
    if (q.type !== 'reading' || !q.passageTitle) return [q];
    return section.questions.filter(item => item.passageTitle === q.passageTitle);
  }, [section.questions, currentQuestionIndex]);

  const progress = ((currentQuestionIndex + 1) / section.questions.length) * 100;
  
  const isTimeLow = timeLeft < 20;

  const finishSession = useCallback(async () => {
    if (isFinished || !startTime) return;
    setIsFinished(true);
    
    let correct = 0;
    section.questions.forEach((q) => {
      if (userAnswers[q.id] === q.correct) correct++;
    });

    const score = Math.round((correct / section.questions.length) * 100);
    const durationInSeconds = Math.floor((Date.now() - startTime) / 1000);
    
    // حفظ في Firestore
    await saveAttemptToDb({
      sectionId: section.id,
      mode,
      score,
      correctCount: correct,
      totalQuestions: section.questions.length,
      durationSeconds: durationInSeconds,
      answers: userAnswers
    });

    // حفظ محلي للطوارئ
    const historyItem = {
      sectionId: section.id,
      date: new Date().toISOString(),
      score,
      mode,
      durationMinutes: Math.floor(durationInSeconds / 60),
      total: section.questions.length,
      correct: correct
    };
    const savedHistory = JSON.parse(localStorage.getItem('easy-history') || '[]');
    localStorage.setItem('easy-history', JSON.stringify([historyItem, ...savedHistory]));

  }, [isFinished, section, userAnswers, mode, startTime]);

  const handleNext = useCallback(() => {
    if (currentGroup.length === 0) return;
    const lastIndexInGroup = section.questions.findIndex(q => q.id === currentGroup[currentGroup.length - 1].id);
    if (lastIndexInGroup < section.questions.length - 1) {
      setCurrentQuestionIndex(lastIndexInGroup + 1);
      // ريست التايمر في وضع الضغط فقط لكل سؤال
      if (isPressureMode) {
        setTimeLeft(60);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      finishSession();
    }
  }, [section.questions, currentGroup, isPressureMode, finishSession]);

  useEffect(() => {
    if (isFreeMode || isFinished || showIntro) return;

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
  }, [isFreeMode, isFinished, showIntro]);

  // منطق انتهاء الوقت
  useEffect(() => {
    if (!isFreeMode && timeLeft === 0 && !isFinished && !showIntro) {
      if (isPressureMode) {
        // في وضع الضغط، ننتقل للسؤال التالي تلقائياً
        handleNext();
        toast({ title: "انتهى وقت السؤال! ⏱️", description: "تم الانتقال للسؤال التالي." });
      } else if (isExamNight) {
        // في وضع ليلة الاختبار، ينتهي الاختبار كاملاً
        finishSession();
        toast({ title: "انتهى وقت الاختبار! 🛑", variant: "destructive" });
      }
    }
  }, [timeLeft, isPressureMode, isExamNight, isFreeMode, isFinished, showIntro, handleNext, finishSession, toast]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswer = (option: string, questionId: string) => {
    if (isFinished) return;
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

  const isGroupAnswered = currentGroup.every(q => !!userAnswers[q.id]);

  if (isFinished && startTime) {
    let correct = 0;
    section.questions.forEach((q) => {
      if (userAnswers[q.id] === q.correct) correct++;
    });
    const percentage = Math.round((correct / section.questions.length) * 100);
    const durationSeconds = Math.floor((Date.now() - startTime) / 1000);

    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in duration-700 pb-20 text-right" dir="rtl">
        <div className="text-center space-y-6">
          <div className="inline-block p-6 rounded-full bg-goldenrod/10 border-2 border-goldenrod/30 shadow-[0_0_50px_rgba(230,172,0,0.3)] mb-4">
            {percentage >= 90 ? <PartyPopper className="w-20 h-20 text-goldenrod" /> : <Trophy className="w-20 h-20 text-goldenrod" />}
          </div>
          <h1 className="text-7xl font-headline font-black text-white drop-shadow-2xl">
            {percentage >= 90 ? "أداء أسطوري! 🔥" : "عمل رائع! 👍"}
          </h1>
          <div className="flex flex-wrap justify-center gap-4">
            <Badge className="bg-goldenrod/20 text-goldenrod border-goldenrod/40 text-xl px-8 py-2 rounded-full">
              الوضع: {isPressureMode ? "ضغط (60ث/س)" : isExamNight ? "ليلة الاختبار (3د)" : "تدريب حر"}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <Card className="p-10 text-center glass border-goldenrod/30 gold-glow">
            <p className="text-muted-foreground mb-2 font-bold">النسبة</p>
            <p className="text-5xl font-black text-goldenrod">{percentage}%</p>
          </Card>
          <Card className="p-10 text-center glass border-green-500/30">
            <p className="text-muted-foreground mb-2 font-bold">صح</p>
            <p className="text-5xl font-black text-green-500">{correct}</p>
          </Card>
          <Card className="p-10 text-center glass border-vermillion/30">
            <p className="text-muted-foreground mb-2 font-bold">خطأ</p>
            <p className="text-5xl font-black text-vermillion">{section.questions.length - correct}</p>
          </Card>
          <Card className="p-10 text-center glass border-blue-500/30">
            <p className="text-muted-foreground mb-2 font-bold">الوقت المستغرق</p>
            <p className="text-4xl font-black text-blue-400">{formatTime(durationSeconds)}</p>
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
      "max-w-5xl mx-auto space-y-8 animate-in slide-in-from-bottom-8 duration-700 pb-20 transition-all text-right relative",
      isTimeLow && !isFreeMode && "animate-shake",
      isExamNight && "bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.08),transparent_50%)]"
    )} dir="rtl">
      
      {showIntro && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-midnight/90 backdrop-blur-xl animate-in fade-in duration-700">
          <div className="text-center space-y-6 px-4">
            <h2 className="text-5xl md:text-7xl font-headline font-black text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
              أهلاً بك في ليلة الاختبار ✨
            </h2>
            <p className="text-2xl md:text-4xl font-bold text-indigo-300">
              3 دقائق لإنهاء كل شيء.. ركز جيداً! 🔥
            </p>
          </div>
        </div>
      )}

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
