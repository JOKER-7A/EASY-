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
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { PracticeMode } from '@/app/page';

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
  const [timeLeft, setTimeLeft] = useState(mode === 'pressure' ? 13 * 60 : 180); 
  const [startTime, setStartTime] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const { toast } = useToast();
  
  const isPressureMode = mode === 'pressure';
  const isExamNight = mode === 'exam-night';

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
  
  const isTimeLow = (isPressureMode && timeLeft < 120) || (isExamNight && timeLeft < 30);
  const isCriticalTime = (isPressureMode && timeLeft < 60) || (isExamNight && timeLeft < 10);

  const finishSession = useCallback(() => {
    if (isFinished || !startTime) return;
    setIsFinished(true);
    
    const mistakes: Question[] = [];
    section.questions.forEach((q) => {
      if (userAnswers[q.id] !== q.correct) {
        mistakes.push(q);
      }
    });

    const score = Math.round(((section.questions.length - mistakes.length) / section.questions.length) * 100);
    const durationInMs = Date.now() - startTime;
    
    const historyItem = {
      sectionId: section.id,
      date: new Date().toISOString(),
      score,
      mode,
      durationMinutes: Math.floor(durationInMs / 60000),
      total: section.questions.length,
      correct: section.questions.length - mistakes.length
    };
    
    const savedHistory = JSON.parse(localStorage.getItem('easy-history') || '[]');
    localStorage.setItem('easy-history', JSON.stringify([historyItem, ...savedHistory]));

    if (mistakes.length > 0) {
      const storedMistakes = JSON.parse(localStorage.getItem('easy-mistakes') || '[]');
      const newMistakes = [...storedMistakes];
      mistakes.forEach(m => {
        if (!newMistakes.find(prev => prev.id === m.id)) {
          newMistakes.push(m);
        }
      });
      localStorage.setItem('easy-mistakes', JSON.stringify(newMistakes));
    }

    if (isPressureMode && timeLeft <= 0) {
      toast({
        title: "انتهى الوقت!",
        description: "تم تسليم الإجابات تلقائياً.",
        variant: "destructive"
      });
    }
  }, [isFinished, section, userAnswers, mode, timeLeft, toast, startTime, isPressureMode]);

  const handleNext = useCallback(() => {
    if (currentGroup.length === 0) return;
    const lastIndexInGroup = section.questions.findIndex(q => q.id === currentGroup[currentGroup.length - 1].id);
    if (lastIndexInGroup < section.questions.length - 1) {
      setCurrentQuestionIndex(lastIndexInGroup + 1);
      if (isExamNight) {
        setTimeLeft(180); 
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      finishSession();
    }
  }, [section.questions, currentGroup, isExamNight, finishSession]);

  useEffect(() => {
    if (mode === 'normal' || isFinished || showIntro) return;

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
  }, [mode, isFinished, showIntro]);

  useEffect(() => {
    if (mode !== 'normal' && timeLeft === 0 && !isFinished && !showIntro) {
      if (isExamNight) {
        handleNext();
      } else {
        finishSession();
      }
    }
  }, [timeLeft, mode, isFinished, finishSession, handleNext, isExamNight, showIntro]);

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
    toast({
      title: newFavs.includes(id) ? "تمت الإضافة للمفضلة" : "تمت الإزالة من المفضلة",
    });
  };

  const isGroupAnswered = currentGroup.every(q => !!userAnswers[q.id]);

  if (isFinished && startTime) {
    let correct = 0;
    section.questions.forEach((q) => {
      if (userAnswers[q.id] === q.correct) correct++;
    });
    const percentage = Math.round((correct / section.questions.length) * 100);
    const durationMinutes = Math.floor((Date.now() - startTime) / 60000);
    const durationSeconds = Math.floor(((Date.now() - startTime) % 60000) / 1000);

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
            {isPressureMode && (
              <Badge className="bg-vermillion/20 text-vermillion border-vermillion/40 text-xl px-8 py-2 rounded-full">
                تم الإنجاز في نظام الضغط 🔥
              </Badge>
            )}
            {isExamNight && (
              <Badge className="bg-indigo-600/20 text-indigo-400 border-indigo-400/40 text-xl px-8 py-2 rounded-full">
                تم الإنجاز في ليلة الاختبار 🌙
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <Card className="p-10 text-center glass border-goldenrod/30 gold-glow">
            <p className="text-muted-foreground mb-2 font-bold">النسبة المئوية</p>
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
            <p className="text-muted-foreground mb-2 font-bold">الوقت</p>
            <p className="text-4xl font-black text-blue-400">{durationMinutes}:{durationSeconds.toString().padStart(2, '0')}</p>
          </Card>
        </div>

        <div className="space-y-6 bg-white/5 p-8 rounded-[40px] border border-white/10">
          <h3 className="text-3xl font-headline font-black text-center text-white mb-8">مراجعة الأسئلة</h3>
          <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar p-2">
            {section.questions.map((q, idx) => {
              const isCorrect = userAnswers[q.id] === q.correct;
              return (
                <div key={q.id} className={`p-8 rounded-[35px] border-2 ${isCorrect ? 'border-green-500/20 bg-green-500/5' : 'border-vermillion/20 bg-vermillion/5'}`}>
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <p className="text-2xl font-black text-white">{idx + 1}. {q.question}</p>
                    {isCorrect ? <CheckCircle2 className="text-green-500 w-8 h-8" /> : <XCircle className="text-vermillion w-8 h-8" />}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-midnight/40 border border-white/5">
                      <p className="text-xs text-muted-foreground font-bold mb-1">إجابتك</p>
                      <p className={`text-xl font-black ${isCorrect ? 'text-green-500' : 'text-vermillion'}`}>{userAnswers[q.id] || 'لم تحل'}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-midnight/40 border border-white/5">
                      <p className="text-xs text-muted-foreground font-bold mb-1">الصحيحة</p>
                      <p className="text-xl font-black text-goldenrod">{q.correct}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-6">
          <button onClick={() => window.location.reload()} className="flex-1 h-24 text-3xl font-black bg-goldenrod text-midnight rounded-[35px] hover:scale-[1.05] transition-all flex items-center justify-center">
            <RotateCcw className="ml-3" /> إعادة المحاولة
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
      isCriticalTime && "animate-shake",
      isExamNight && "bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.08),transparent_50%)]"
    )} dir="rtl">
      
      {showIntro && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-midnight/90 backdrop-blur-xl animate-in fade-in duration-700">
          <div className="text-center space-y-6 animate-in zoom-in-95 duration-700 px-4">
            <h2 className="text-5xl md:text-7xl font-headline font-black text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
              أهم حاجة الفهم وليس الحفظ ✨
            </h2>
            <p className="text-2xl md:text-4xl font-bold text-indigo-300 opacity-90 drop-shadow-[0_0_10px_rgba(129,140,248,0.4)]">
              ركز... وفكر بهدوء، أنت قدها 🔥
            </p>
          </div>
        </div>
      )}

      {isExamNight && (
        <div className="text-center py-2 animate-pulse">
          <Badge className="bg-indigo-600/30 text-indigo-300 text-lg px-8 py-2 border-indigo-500/40 rounded-full font-black">
            أنت في مرحلة الحسم 🔥
          </Badge>
        </div>
      )}

      <div className={cn(
        "flex justify-between items-center bg-midnight/70 p-6 rounded-[40px] border-2 border-white/5 backdrop-blur-2xl sticky top-4 z-50 shadow-2xl transition-all",
        isPressureMode && "border-vermillion/30 bg-vermillion/5",
        isExamNight && "border-indigo-500/30 bg-indigo-900/10",
        isTimeLow && "border-vermillion bg-vermillion/20 scale-[1.02]"
      )}>
        <Button onClick={onExit} variant="ghost" className="text-muted-foreground hover:text-white rounded-full font-bold">
          <ChevronLeft className="ml-2" /> خروج
        </Button>

        {mode !== 'normal' ? (
          <div className={cn(
            "flex items-center gap-4 px-8 py-3 rounded-full border-2 transition-all",
            isPressureMode ? (
               isTimeLow ? "bg-vermillion border-white text-white gold-glow animate-pulse" : "bg-vermillion/20 border-vermillion/40 text-vermillion"
            ) : (
               isTimeLow ? "bg-indigo-600 border-white text-white animate-pulse" : "bg-indigo-600/20 border-indigo-400/40 text-indigo-400"
            )
          )}>
            {isExamNight ? <Moon className="w-7 h-7" /> : (isTimeLow ? <AlertTriangle className="w-7 h-7 animate-bounce" /> : <Flame className="w-7 h-7" />)}
            <span className="text-3xl font-black font-mono tracking-widest">{formatTime(timeLeft)}</span>
          </div>
        ) : (
          <div className="bg-white/5 px-8 py-3 rounded-full border border-white/10 text-muted-foreground">
            <span className="font-bold text-xl">وضع التدريب الحر 🧘‍♂️</span>
          </div>
        )}

        <div className="text-left font-black">
          <span className="text-muted-foreground ml-2">السؤال</span>
          <span className={cn(
            "text-4xl", 
            isPressureMode ? "text-vermillion" : isExamNight ? "text-indigo-400" : "text-goldenrod"
          )}>
            {section.questions.findIndex(q => q.id === currentGroup[currentGroup.length - 1]?.id) + 1}
          </span>
          <span className="text-muted-foreground"> / {section.questions.length}</span>
        </div>
      </div>

      <div className="px-4">
        <Progress 
          value={progress} 
          className={cn(
            "h-4 rounded-full border",
            isPressureMode ? "bg-vermillion/10 border-vermillion/20" : 
            isExamNight ? "bg-indigo-900/40 border-indigo-500/30" :
            "bg-white/5 border-white/10"
          )} 
        />
      </div>

      <div className="space-y-8">
        {associatedPassage ? (
          <Card className={cn(
            "p-12 glass rounded-[60px] border-2 border-goldenrod/30 relative shadow-[0_40px_80px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-right-4 transition-all h-auto overflow-visible",
            isPressureMode && "border-vermillion/20",
            isExamNight && "border-indigo-500/20"
          )}>
            <div className="flex items-center gap-4 mb-10">
              <BookOpen className="w-10 h-10 text-goldenrod" />
              <h2 className={cn(
                "text-5xl font-headline font-black underline decoration-wavy underline-offset-8 decoration-goldenrod/40",
                isPressureMode && "text-vermillion decoration-vermillion/40",
                isExamNight && "text-indigo-400 decoration-indigo-400/40"
              )}>
                {associatedPassage.title}
              </h2>
            </div>
            <div className="text-3xl leading-[2.3] text-white/95 font-medium whitespace-pre-wrap selection:bg-goldenrod selection:text-midnight mb-20">
              {associatedPassage.text}
            </div>

            <Separator className="bg-white/10 mb-20" />

            <div className="space-y-20">
              {currentGroup.map((q) => (
                <div key={q.id} className="space-y-12">
                  <div className="flex justify-between items-start gap-8">
                    <h2 className="text-4xl md:text-5xl font-headline font-black leading-tight text-white flex-1">
                      <span className="text-goldenrod ml-4 text-2xl font-mono">#{section.questions.findIndex(item => item.id === q.id) + 1}</span>
                      {q.question}
                    </h2>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={cn(
                        "rounded-full w-16 h-16 transition-all duration-500 shrink-0",
                        favorites.includes(q.id) 
                          ? (isPressureMode ? 'bg-vermillion text-white' : isExamNight ? 'bg-indigo-600 text-white' : 'bg-goldenrod text-midnight')
                          : 'bg-white/5 text-white hover:bg-white/10'
                      )}
                      onClick={() => toggleFavorite(q.id)}
                    >
                      <Star fill={favorites.includes(q.id) ? 'currentColor' : 'none'} className="w-8 h-8" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {q.options.map((option, i) => {
                      const isSelected = userAnswers[q.id] === option;
                      const activeColor = isPressureMode ? 'bg-vermillion text-white border-vermillion' : 
                                         isExamNight ? 'bg-indigo-600 text-white border-indigo-500' :
                                         'bg-goldenrod text-midnight border-goldenrod';
                      return (
                        <button
                          key={i}
                          onClick={() => handleAnswer(option, q.id)}
                          className={cn(
                            "group relative p-8 rounded-[35px] text-right text-2xl font-black transition-all duration-500 border-2",
                            isSelected ? `${activeColor} scale-[1.03] ${isPressureMode ? 'vermillion-glow' : isExamNight ? 'shadow-[0_0_20px_rgba(79,70,229,0.4)]' : 'gold-glow'}` : 'bg-white/5 text-white border-white/5 hover:border-goldenrod/40'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span>{option}</span>
                            <Badge className={cn(
                              "rounded-2xl w-10 h-10 flex items-center justify-center font-black text-lg",
                              isSelected ? 'bg-midnight text-white' : 'bg-white/10'
                            )}>
                              {String.fromCharCode(65 + i)}
                            </Badge>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          currentGroup.map((q) => (
            <Card key={q.id} className={cn(
              "p-12 glass rounded-[60px] border-2 border-white/5 relative overflow-hidden group shadow-[0_40px_80px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-bottom-4 transition-all",
              isPressureMode && "pressure-glow border-vermillion/20",
              isExamNight && "border-indigo-500/20 shadow-indigo-900/20"
            )}>
              <div className="flex justify-between items-start mb-12 gap-8">
                <h2 className="text-5xl md:text-6xl font-headline font-black leading-tight text-white flex-1">
                  <span className="text-goldenrod ml-4 text-3xl font-mono">#{section.questions.findIndex(item => item.id === q.id) + 1}</span>
                  {q.question}
                </h2>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn(
                    "rounded-full w-20 h-20 transition-all duration-500 shrink-0",
                    favorites.includes(q.id) 
                      ? (isPressureMode ? 'bg-vermillion text-white' : isExamNight ? 'bg-indigo-600 text-white' : 'bg-goldenrod text-midnight') 
                      : 'bg-white/5 text-white hover:bg-white/10'
                  )}
                  onClick={() => toggleFavorite(q.id)}
                >
                  <Star fill={favorites.includes(q.id) ? 'currentColor' : 'none'} className="w-10 h-10" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {q.options.map((option, i) => {
                  const isSelected = userAnswers[q.id] === option;
                  const activeColor = isPressureMode ? 'bg-vermillion text-white border-vermillion' : 
                                     isExamNight ? 'bg-indigo-600 text-white border-indigo-500' :
                                     'bg-goldenrod text-midnight border-goldenrod';
                  return (
                    <button
                      key={i}
                      onClick={() => handleAnswer(option, q.id)}
                      className={cn(
                        "group relative p-10 rounded-[40px] text-right text-3xl font-black transition-all duration-500 border-2",
                        isSelected ? `${activeColor} scale-[1.03] ${isPressureMode ? 'vermillion-glow' : isExamNight ? 'shadow-[0_0_20px_rgba(79,70,229,0.4)]' : 'gold-glow'}` : 'bg-white/5 text-white border-white/5 hover:border-goldenrod/40'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span>{option}</span>
                        <Badge className={cn(
                          "rounded-2xl w-12 h-12 flex items-center justify-center font-black text-xl",
                          isSelected ? 'bg-midnight text-white' : 'bg-white/10'
                        )}>
                          {String.fromCharCode(65 + i)}
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          ))
        )}
      </div>

      <div className="flex justify-end pt-12">
        <button 
          onClick={handleNext} 
          disabled={!isGroupAnswered && !isExamNight}
          className={cn(
            "px-20 py-12 rounded-[50px] text-5xl font-black text-midnight hover:scale-[1.08] active:scale-95 transition-all disabled:opacity-20",
            isPressureMode ? "bg-vermillion text-white shadow-[0_20px_50px_rgba(255,77,51,0.3)]" : 
            isExamNight ? "bg-indigo-600 text-white shadow-[0_20px_50px_rgba(79,70,229,0.3)]" :
            "bg-goldenrod text-midnight shadow-[0_20px_50px_rgba(230,172,0,0.3)]"
          )}
        >
          {section.questions.findIndex(q => q.id === currentGroup[currentGroup.length - 1]?.id) === section.questions.length - 1 
            ? 'إنهاء 🏁' 
            : 'التالي 🚀'}
        </button>
      </div>
    </div>
  );
}
