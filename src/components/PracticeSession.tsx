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
  BookOpen,
  Clock,
  Zap,
  Play,
  XCircle,
  Moon,
  Sparkles,
  Flower
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
      const timer = setTimeout(() => setPhase('mode-selection'), 2500);
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
          saveErrorLogToDb(auth.currentUser.uid, q, section.title);
        }
      }
    });

    const score = Math.round((correct / section.questions.length) * 100);
    const durationInSeconds = Math.floor((Date.now() - startTime) / 1000);
    
    if (auth.currentUser) {
      await saveAttemptToDb(auth.currentUser.uid, {
        sectionId: section.id,
        mode,
        score,
        correctCount: correct,
        totalQuestions: section.questions.length,
        durationSeconds: durationInSeconds,
        answers: userAnswers
      });
    }
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
      toast({ title: "يرجى تسجيل الدخول", variant: "destructive" });
      return;
    }
    const isAdded = await toggleFavoriteInDb(auth.currentUser.uid, question);
    if (isAdded) {
      setFavorites(prev => [...prev, question.id]);
      toast({ title: "تمت الإضافة ⭐" });
    } else {
      setFavorites(prev => prev.filter(id => id !== question.id));
      toast({ title: "تمت الإزالة" });
    }
  };

  const getCelebrationContent = (percentage: number) => {
    if (percentage === 100) return {
      title: "أنت أسطورة EASY 🔥",
      phrase: "أداء أسطوري! لقد اكتسحت الاختبار 🌹",
      icon: <div className="relative">
              <PartyPopper className="w-24 h-24 md:w-40 md:h-40 text-goldenrod" />
              <div className="absolute -top-4 -right-4 animate-bounce bg-white p-2 rounded-full border-2 border-goldenrod">
                <Flower className="w-8 h-8 text-goldenrod" />
              </div>
            </div>,
      color: "text-goldenrod"
    };
    if (percentage >= 80) {
      const phrases = ["أداء ممتاز 🔥", "مستواك يتطور بسرعة 🚀", "استمر يا بطل 💪"];
      return {
        title: phrases[Math.floor(Math.random() * phrases.length)],
        phrase: "مستوى رائع جداً، استمر في التقدم",
        icon: <Trophy className="w-24 h-24 md:w-40 md:h-40 text-goldenrod" />,
        color: "text-white"
      };
    }
    return {
      title: "شد حيلك شوية 💙",
      phrase: "لا بأس، التدريب المستمر يوصلك للقمة",
      icon: <RotateCcw className="w-24 h-24 md:w-40 md:h-40 text-white/50" />,
      color: "text-white/80"
    };
  };

  if (phase === 'intro') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-midnight/98 backdrop-blur-3xl p-6">
        <div className="text-center space-y-8 md:space-y-12 animate-in zoom-in duration-1000">
          <div className="relative">
            <div className="absolute -inset-10 bg-goldenrod/20 blur-[60px] md:blur-[100px] rounded-full animate-pulse" />
            <h2 className="text-4xl md:text-9xl font-black text-white leading-tight tracking-tighter">
              أهم شيء الفهم <br className="hidden md:block" /> وليس الحفظ 💡
            </h2>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'mode-selection') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 md:p-6 bg-midnight animate-in fade-in duration-1000">
        <div className="max-w-6xl w-full space-y-10 md:space-y-20">
          <div className="text-center space-y-4 md:space-y-6">
            <h1 className="text-5xl md:text-9xl font-black text-white text-glow tracking-tighter">اختر التحدي 🎮</h1>
            <p className="text-lg md:text-2xl text-muted-foreground font-black opacity-60 tracking-widest">حدد مسارك نحو التميز</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
            {[
              { id: 'exam-night', title: 'ليلة الاختبار', icon: Moon, color: 'border-indigo-500', bg: 'bg-indigo-500/10', desc: '3 دقائق إجمالية' },
              { id: 'pressure', title: 'نظام الضغط', icon: Zap, color: 'border-vermillion', bg: 'bg-vermillion/10', desc: '60 ثانية لكل سؤال' },
              { id: 'normal', title: 'التمرين الحر', icon: Play, color: 'border-goldenrod', bg: 'bg-goldenrod/10', desc: 'بدون وقت' }
            ].map((m) => (
              <Card 
                key={m.id}
                onClick={() => selectMode(m.id as PracticeMode)}
                className={cn(
                  "p-8 md:p-14 glass cursor-pointer transition-all hover:scale-[1.03] active:scale-95 group rounded-3xl md:rounded-[70px] text-center space-y-6 md:space-y-8 border-2",
                  m.color + "/30 hover:" + m.color
                )}
              >
                <div className={cn("w-20 h-20 md:w-28 md:h-28 rounded-full flex items-center justify-center mx-auto transition-transform group-hover:rotate-12", m.bg)}>
                  {React.createElement(m.icon, { className: "w-10 h-10 md:w-16 md:h-16" })}
                </div>
                <div className="space-y-2 md:space-y-4">
                  <h3 className="text-3xl md:text-5xl font-black text-white">{m.title}</h3>
                  <p className="text-lg md:text-xl text-muted-foreground font-bold">{m.desc}</p>
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
    const durationInSeconds = Math.floor((Date.now() - (startTime || 0)) / 1000);
    const mins = Math.floor(durationInSeconds / 60);
    const secs = durationInSeconds % 60;
    const celebration = getCelebrationContent(percentage);

    return (
      <div className="max-w-6xl mx-auto space-y-10 md:space-y-16 py-10 md:py-20 px-4 md:px-6 text-right animate-in fade-in duration-700" dir="rtl">
        <div className="text-center space-y-6 md:space-y-10">
          <div className="inline-block p-8 md:p-14 rounded-full bg-goldenrod/10 border-4 md:border-8 border-goldenrod/30 shadow-[0_0_100px_rgba(230,172,0,0.3)] mb-4 animate-bounce">
            {celebration.icon}
          </div>
          <h1 className={cn("text-5xl md:text-[8rem] font-black tracking-tighter leading-tight", celebration.color)}>
            {celebration.title}
          </h1>
          <p className="text-xl md:text-3xl font-bold text-white/60">{celebration.phrase}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {[
            { label: 'النسبة', val: percentage + '%', color: 'border-goldenrod', text: 'text-goldenrod' },
            { label: 'صحيحة', val: correct, color: 'border-green-500', text: 'text-green-500' },
            { label: 'خاطئة', val: errors.length, color: 'border-vermillion', text: 'text-vermillion' },
            { label: 'الوقت', val: `${mins}:${secs.toString().padStart(2, '0')}`, color: 'border-white/10', text: 'text-white' }
          ].map((stat, i) => (
            <Card key={i} className={cn("p-6 md:p-10 text-center glass rounded-3xl md:rounded-[50px] border-2", stat.color)}>
              <p className="text-muted-foreground mb-2 md:mb-4 font-black text-lg md:text-2xl">{stat.label}</p>
              <p className={cn("text-3xl md:text-7xl font-black", stat.text)}>{stat.val}</p>
            </Card>
          ))}
        </div>

        {errors.length > 0 && (
          <div className="space-y-8 md:space-y-10 pt-10">
            <h2 className="text-3xl md:text-5xl font-black text-vermillion flex items-center gap-4 md:gap-6">
              <XCircle className="w-10 h-10 md:w-12 md:h-12" /> مراجعة الأخطاء
            </h2>
            <div className="grid gap-6 md:gap-8">
              {errors.map((q, idx) => (
                <Card key={idx} className="p-8 md:p-12 glass border-vermillion/30 rounded-3xl md:rounded-[60px] space-y-6 md:space-y-8">
                  <div className="flex justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <Badge className="bg-white/5 text-white/40 mb-2">سؤال {idx + 1}</Badge>
                      <h3 className="text-2xl md:text-4xl font-black leading-tight">{q.question}</h3>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="p-6 bg-green-500/10 rounded-2xl md:rounded-[35px] border border-green-500/20">
                      <p className="text-xs text-muted-foreground font-bold mb-1">الصحيح:</p>
                      <p className="text-xl md:text-3xl font-black text-green-500">{q.correct}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 md:gap-8 pt-10">
          <button onClick={() => window.location.reload()} className="flex-1 h-20 md:h-32 text-2xl md:text-4xl font-black bg-goldenrod text-midnight rounded-2xl md:rounded-[50px] hover:scale-[1.03] transition-all flex items-center justify-center shadow-2xl gold-glow">
            <RotateCcw className="ml-3 w-8 h-8 md:w-12 md:h-12" /> إعادة
          </button>
          <button onClick={onExit} className="flex-1 h-20 md:h-32 text-2xl md:text-4xl font-black border-2 md:border-4 border-white/10 text-white hover:bg-white/5 rounded-2xl md:rounded-[50px] flex items-center justify-center transition-all">
            الخروج
          </button>
        </div>
        
        <footer className="text-center py-10 opacity-30">
          <p className="signature-text text-xl">DR.MAHMOUD ABD EL RAZEK ❤️</p>
        </footer>
      </div>
    );
  }

  const associatedPassage = section.readingPassages?.find(p => p.title === currentGroup[0]?.passageTitle);

  return (
    <div className={cn(
      "max-w-6xl mx-auto space-y-8 md:space-y-14 py-8 md:py-16 pb-32 md:pb-40 px-4 md:px-6 transition-all text-right",
      timeLeft < 20 && mode !== 'normal' && "animate-shake",
    )} dir="rtl">
      
      <div className={cn(
        "flex justify-between items-center bg-midnight/90 p-4 md:p-10 rounded-2xl md:rounded-[60px] border border-white/5 backdrop-blur-3xl sticky top-4 md:top-8 z-50 shadow-2xl transition-all",
        timeLeft < 20 && mode !== 'normal' && "border-vermillion bg-vermillion/10"
      )}>
        <Button onClick={onExit} variant="ghost" className="text-lg md:text-2xl text-muted-foreground hover:text-white rounded-full font-black px-4 md:px-10 h-12 md:h-16">
          <ChevronLeft className="ml-1" /> انسحاب
        </Button>

        {mode !== 'normal' ? (
          <div className={cn(
            "flex items-center gap-3 md:gap-8 px-4 md:px-12 py-2 md:py-5 rounded-full border-2 transition-all",
            timeLeft < 20 ? "bg-vermillion border-white text-white animate-pulse" : "bg-white/5 border-white/10 text-white"
          )}>
            {mode === 'pressure' ? <Zap className="w-5 h-5 md:w-10 md:h-10" /> : <Clock className="w-5 h-5 md:w-10 md:h-10" />}
            <span className="text-2xl md:text-5xl font-black font-mono">{Math.floor(timeLeft/60)}:{ (timeLeft%60).toString().padStart(2, '0') }</span>
          </div>
        ) : (
          <Badge className="bg-white/5 px-4 md:px-10 py-2 md:py-5 rounded-full border border-white/10 text-goldenrod text-lg md:text-3xl font-black">حر 🧘</Badge>
        )}

        <div className="text-left font-black">
          <span className="text-3xl md:text-6xl text-goldenrod">{currentQuestionIndex + 1}</span>
          <span className="text-lg md:text-3xl text-muted-foreground opacity-30"> / {section.questions.length}</span>
        </div>
      </div>

      <Progress value={progress} className="h-2 md:h-4 rounded-full bg-white/5 border border-white/10" />

      <div className="space-y-10 md:space-y-16">
        {associatedPassage && (
          <Card className="p-8 md:p-16 glass rounded-3xl md:rounded-[80px] border-2 border-goldenrod/30 relative overflow-hidden animate-in slide-in-from-top-10">
            <div className="flex items-center gap-4 md:gap-8 mb-6 md:mb-10">
              <BookOpen className="w-8 h-8 md:w-12 md:h-12 text-goldenrod" />
              <h2 className="text-3xl md:text-5xl font-black text-white">{associatedPassage.title}</h2>
            </div>
            <div className="text-xl md:text-3xl leading-[1.6] md:leading-[1.8] text-white/90 whitespace-pre-wrap font-bold">{associatedPassage.text}</div>
          </Card>
        )}

        {currentGroup.map((q) => (
          <Card key={q.id} className="p-8 md:p-16 glass rounded-3xl md:rounded-[90px] border border-white/5 relative overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start mb-10 md:mb-16 gap-6 md:gap-10">
              <h2 className="text-3xl md:text-6xl font-black leading-tight text-white flex-1">{q.question}</h2>
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn(
                  "rounded-full w-16 h-16 md:w-24 md:h-24 transition-all shadow-xl border-2 self-end md:self-start",
                  favorites.includes(q.id) ? 'bg-goldenrod text-midnight border-white gold-glow' : 'bg-white/5 text-white border-white/10'
                )}
                onClick={() => toggleFavorite(q)}
              >
                <Star fill={favorites.includes(q.id) ? 'currentColor' : 'none'} className="w-8 h-8 md:w-12 md:h-12" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
              {q.options.map((option, i) => {
                const isSelected = userAnswers[q.id] === option;
                return (
                  <button
                    key={i}
                    onClick={() => setUserAnswers(prev => ({ ...prev, [q.id]: option }))}
                    className={cn(
                      "p-6 md:p-10 rounded-2xl md:rounded-[45px] text-right text-xl md:text-3xl font-black transition-all border-2 md:border-4 shadow-xl",
                      isSelected 
                        ? 'bg-goldenrod text-midnight border-white scale-[1.02] gold-glow' 
                        : 'bg-white/5 text-white border-white/5 hover:border-goldenrod/40 hover:bg-white/10'
                    )}
                  >
                    <span className="opacity-30 ml-3 md:ml-6 text-lg md:text-2xl">{['أ', 'ب', 'ج', 'د'][i]}.</span> {option}
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
          className="w-full sm:w-auto px-12 md:px-24 py-8 md:py-12 rounded-2xl md:rounded-[50px] text-3xl md:text-5xl font-black bg-goldenrod text-midnight hover:scale-[1.05] transition-all shadow-2xl gold-glow"
        >
          {currentQuestionIndex + currentGroup.length >= section.questions.length ? 'إنهاء 🏁' : 'التالي 🚀'}
        </button>
      </div>
    </div>
  );
}
