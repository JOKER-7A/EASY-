
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
  XCircle,
  CheckCircle2,
  BrainCircuit,
  ShieldCheck
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { saveAttemptToDb, toggleFavoriteInDb, saveErrorLogToDb } from '@/lib/db-service';
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
      const timer = setTimeout(() => setPhase('mode-selection'), 2500);
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

  const currentGroup = useMemo(() => {
    if (phase !== 'practicing' || !section.questions[currentQuestionIndex]) return [];
    const q = section.questions[currentQuestionIndex];
    if (q.type !== 'reading' || !q.passageTitle) return [q];
    return section.questions.filter(item => item.passageTitle === q.passageTitle);
  }, [section.questions, currentQuestionIndex, phase]);

  const progress = ((currentQuestionIndex + 1) / section.questions.length) * 100;
  
  const finishSession = useCallback(async () => {
    if (phase === 'finished' || !startTime) return;
    setPhase('finished');
    
    let correct = 0;
    const errors: Question[] = [];

    section.questions.forEach((q) => {
      if (userAnswers[q.id] === q.correct) {
        correct++;
      } else {
        errors.push(q);
        if (auth.currentUser) {
          saveErrorLogToDb(auth.currentUser.uid, q);
        }
      }
    });

    const score = Math.round((correct / section.questions.length) * 100);
    const durationInSeconds = Math.floor((Date.now() - startTime) / 1000);
    
    await saveAttemptToDb(auth.currentUser?.uid, {
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
      if (mode === 'pressure') setTimeLeft(60); 
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      finishSession();
    }
  }, [section.questions, currentGroup, mode, finishSession]);

  useEffect(() => {
    if (mode === 'normal' || phase !== 'practicing') return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [mode, phase]);

  useEffect(() => {
    if (mode !== 'normal' && timeLeft === 0 && phase === 'practicing') {
      if (mode === 'pressure') {
        handleNext();
        toast({ title: "انتهى وقت السؤال! ⏱️" });
      } else if (mode === 'exam-night') {
        finishSession();
      }
    }
  }, [timeLeft, mode, phase, handleNext, finishSession, toast]);

  const toggleFavorite = async (question: Question) => {
    if (!auth.currentUser) {
      toast({ title: "يرجى تسجيل الدخول لحفظ المفضلة", variant: "destructive" });
      return;
    }
    const isAdded = await toggleFavoriteInDb(auth.currentUser.uid, question);
    if (isAdded) {
      setFavorites(prev => [...prev, question.id]);
      toast({ title: "تمت الإضافة للمفضلة ⭐" });
    } else {
      setFavorites(prev => prev.filter(id => id !== question.id));
      toast({ title: "تمت الإزالة من المفضلة" });
    }
  };

  if (phase === 'intro') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-midnight/98 backdrop-blur-3xl">
        <div className="text-center space-y-12 animate-in zoom-in duration-1000">
          <div className="relative">
            <div className="absolute -inset-10 bg-goldenrod/20 blur-[100px] rounded-full animate-pulse" />
            <h2 className="text-6xl md:text-9xl font-black text-white drop-shadow-[0_0_40px_rgba(230,172,0,0.6)] leading-tight">
              أهم شيء الفهم <br/> وليس الحفظ 💡
            </h2>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'mode-selection') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-midnight animate-in fade-in duration-1000">
        <div className="max-w-6xl w-full space-y-20">
          <div className="text-center space-y-6">
            <h1 className="text-7xl md:text-9xl font-black text-white text-glow">اختر التحدي 🎮</h1>
            <p className="text-2xl text-muted-foreground font-black opacity-60 tracking-widest">حدد مسارك نحو التميز</p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {[
              { id: 'exam-night', title: 'ليلة الاختبار', icon: Moon, color: 'border-indigo-500', bg: 'bg-indigo-500/10', desc: '3 دقائق إجمالية' },
              { id: 'pressure', title: 'نظام الضغط', icon: Zap, color: 'border-vermillion', bg: 'bg-vermillion/10', desc: '60 ثانية لكل سؤال' },
              { id: 'normal', title: 'التمرين الحر', icon: Play, color: 'border-goldenrod', bg: 'bg-goldenrod/10', desc: 'بدون وقت' }
            ].map((m) => (
              <Card 
                key={m.id}
                onClick={() => selectMode(m.id as PracticeMode)}
                className={cn(
                  "p-14 glass cursor-pointer transition-all hover:scale-[1.05] group rounded-[70px] text-center space-y-8 relative overflow-hidden border-2",
                  m.color + "/30 hover:" + m.color
                )}
              >
                <div className={cn("w-28 h-28 rounded-full flex items-center justify-center mx-auto transition-transform group-hover:rotate-12", m.bg)}>
                  <m.icon className="w-16 h-16" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-5xl font-black text-white">{m.title}</h3>
                  <p className="text-xl text-muted-foreground font-bold">{m.desc}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'finished') {
    let correct = 0;
    const errors: Question[] = [];
    section.questions.forEach((q) => {
      if (userAnswers[q.id] === q.correct) correct++;
      else errors.push(q);
    });
    const percentage = Math.round((correct / section.questions.length) * 100);

    return (
      <div className="max-w-6xl mx-auto space-y-16 py-20 px-6 text-right animate-in fade-in zoom-in duration-700" dir="rtl">
        <div className="text-center space-y-10">
          <div className="inline-block p-14 rounded-full bg-goldenrod/10 border-8 border-goldenrod/30 shadow-[0_0_100px_rgba(230,172,0,0.4)] mb-6">
            {percentage >= 90 ? <PartyPopper className="w-40 h-40 text-goldenrod" /> : <Trophy className="w-40 h-40 text-goldenrod" />}
          </div>
          <h1 className="text-8xl md:text-[10rem] font-black text-white drop-shadow-2xl">
            {percentage >= 90 ? "أداء أسطوري! 🔥" : "استمر، أنت تبدع! 🚀"}
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
            { label: 'النسبة', val: percentage + '%', color: 'border-goldenrod', text: 'text-goldenrod' },
            { label: 'صحيحة', val: correct, color: 'border-green-500', text: 'text-green-500' },
            { label: 'خاطئة', val: errors.length, color: 'border-vermillion', text: 'text-vermillion' },
            { label: 'الوقت', val: '04:12', color: 'border-white/10', text: 'text-white' }
          ].map((stat, i) => (
            <Card key={i} className={cn("p-10 text-center glass rounded-[50px] border-2", stat.color)}>
              <p className="text-muted-foreground mb-4 font-black text-2xl">{stat.label}</p>
              <p className={cn("text-7xl font-black", stat.text)}>{stat.val}</p>
            </Card>
          ))}
        </div>

        {errors.length > 0 && (
          <div className="space-y-10 pt-10">
            <h2 className="text-5xl font-black text-vermillion flex items-center gap-6">
              <XCircle className="w-12 h-12" /> مراجعة الأخطاء
            </h2>
            <div className="grid gap-8">
              {errors.map((q, idx) => (
                <Card key={idx} className="p-12 glass border-vermillion/30 rounded-[60px] space-y-8 animate-in slide-in-from-right-10">
                  <div className="flex justify-between gap-6">
                    <h3 className="text-4xl font-black leading-tight flex-1">{q.question}</h3>
                    <Badge className="bg-vermillion/20 text-vermillion h-12 px-6 rounded-2xl text-xl">سؤال {idx + 1}</Badge>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="p-8 bg-vermillion/10 rounded-[35px] border-2 border-vermillion/20">
                      <p className="text-muted-foreground font-bold mb-2">إجابتك:</p>
                      <p className="text-3xl font-black text-vermillion">{userAnswers[q.id] || 'لم يتم الحل'}</p>
                    </div>
                    <div className="p-8 bg-green-500/10 rounded-[35px] border-2 border-green-500/20">
                      <p className="text-muted-foreground font-bold mb-2">الإجابة الصحيحة:</p>
                      <p className="text-3xl font-black text-green-500">{q.correct}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-8 pt-16">
          <button onClick={() => window.location.reload()} className="flex-1 h-32 text-4xl font-black bg-goldenrod text-midnight rounded-[50px] hover:scale-[1.03] transition-all flex items-center justify-center shadow-2xl gold-glow">
            <RotateCcw className="ml-4 w-12 h-12" /> إعادة المحاولة
          </button>
          <button onClick={onExit} className="flex-1 h-32 text-4xl font-black border-4 border-white/10 text-white hover:bg-white/5 rounded-[50px] flex items-center justify-center transition-all">
            الخروج للرئيسية
          </button>
        </div>
      </div>
    );
  }

  const associatedPassage = section.readingPassages?.find(p => p.title === currentGroup[0]?.passageTitle);

  return (
    <div className={cn(
      "max-w-6xl mx-auto space-y-14 py-16 pb-40 px-6 transition-all text-right",
      timeLeft < 20 && mode !== 'normal' && "animate-shake",
    )} dir="rtl">
      
      <div className={cn(
        "flex justify-between items-center bg-midnight/90 p-10 rounded-[60px] border-2 border-white/5 backdrop-blur-3xl sticky top-8 z-50 shadow-2xl transition-all",
        timeLeft < 20 && mode !== 'normal' && "border-vermillion bg-vermillion/10"
      )}>
        <Button onClick={onExit} variant="ghost" className="text-2xl text-muted-foreground hover:text-white rounded-full font-black px-10 h-16">
          <ChevronLeft className="ml-2" /> انسحاب
        </Button>

        {mode !== 'normal' ? (
          <div className={cn(
            "flex items-center gap-8 px-12 py-5 rounded-full border-2 transition-all",
            timeLeft < 20 ? "bg-vermillion border-white text-white animate-pulse" : "bg-white/5 border-white/10 text-white"
          )}>
            {mode === 'pressure' ? <Zap className="w-10 h-10" /> : <Clock className="w-10 h-10" />}
            <span className="text-5xl font-black font-mono">{Math.floor(timeLeft/60)}:{ (timeLeft%60).toString().padStart(2, '0') }</span>
          </div>
        ) : (
          <Badge className="bg-white/5 px-10 py-5 rounded-full border border-white/10 text-goldenrod text-3xl font-black">تمرين حر 🧘</Badge>
        )}

        <div className="text-left font-black">
          <span className="text-6xl text-goldenrod">{currentQuestionIndex + 1}</span>
          <span className="text-3xl text-muted-foreground opacity-30"> / {section.questions.length}</span>
        </div>
      </div>

      <Progress value={progress} className="h-4 rounded-full bg-white/5 border border-white/10" />

      <div className="space-y-16">
        {associatedPassage && (
          <Card className="p-16 glass rounded-[80px] border-2 border-goldenrod/30 relative overflow-hidden animate-in slide-in-from-top-10">
            <div className="flex items-center gap-8 mb-10">
              <BookOpen className="w-12 h-12 text-goldenrod" />
              <h2 className="text-5xl font-black text-white">{associatedPassage.title}</h2>
            </div>
            <div className="text-3xl leading-[1.8] text-white/90 whitespace-pre-wrap font-bold">{associatedPassage.text}</div>
          </Card>
        )}

        {currentGroup.map((q) => (
          <Card key={q.id} className="p-16 glass rounded-[90px] border-2 border-white/5 relative overflow-hidden animate-in fade-in slide-in-from-bottom-10">
            <div className="flex justify-between items-start mb-16 gap-10">
              <h2 className="text-6xl font-black leading-tight text-white flex-1">{q.question}</h2>
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn(
                  "rounded-full w-24 h-24 transition-all shadow-xl border-2",
                  favorites.includes(q.id) ? 'bg-goldenrod text-midnight border-white' : 'bg-white/5 text-white border-white/10'
                )}
                onClick={() => toggleFavorite(q)}
              >
                <Star fill={favorites.includes(q.id) ? 'currentColor' : 'none'} className="w-12 h-12" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {q.options.map((option, i) => {
                const isSelected = userAnswers[q.id] === option;
                return (
                  <button
                    key={i}
                    onClick={() => setUserAnswers(prev => ({ ...prev, [q.id]: option }))}
                    className={cn(
                      "p-10 rounded-[45px] text-right text-3xl font-black transition-all border-4 shadow-xl",
                      isSelected 
                        ? 'bg-goldenrod text-midnight border-white scale-[1.02] gold-glow' 
                        : 'bg-white/5 text-white border-white/5 hover:border-goldenrod/40 hover:bg-white/10'
                    )}
                  >
                    <span className="opacity-30 ml-6 text-2xl">{['أ', 'ب', 'ج', 'د'][i]}.</span> {option}
                  </button>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      <div className="flex justify-center md:justify-end pt-10">
        <button 
          onClick={handleNext} 
          className="group relative px-24 py-12 rounded-[50px] text-5xl font-black bg-goldenrod text-midnight hover:scale-[1.05] transition-all shadow-2xl gold-glow overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
          <span className="relative z-10">{currentQuestionIndex + currentGroup.length >= section.questions.length ? 'إنهاء التحدي 🏁' : 'السؤال التالي 🚀'}</span>
        </button>
      </div>
    </div>
  );
}
