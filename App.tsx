import React, { useState, useEffect, useRef } from 'react';
import { QUESTIONS_DATA, cleanString, isAnswerCorrect } from './questions.ts';
import { LetterStatus, LetterResult } from './types.ts';
import { RoscoWheel } from './RoscoWheel.tsx';
import { ConfettiCanvas } from './Confetti.tsx';
import { soundManager } from './audio.ts';
import {
  Volume2,
  VolumeX,
  Languages,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Eye,
  EyeOff,
  Trophy,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Info,
  KeyRound
} from 'lucide-react';

export default function App() {
  const [questions] = useState(QUESTIONS_DATA);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [statuses, setStatuses] = useState<Record<number, LetterStatus>>({});
  const [results, setResults] = useState<Record<number, LetterResult>>({});
  const [userInput, setUserInput] = useState<string>('');
  const [lap, setLap] = useState<number>(1);
  const [showArmenianTranslation, setShowArmenianTranslation] = useState<boolean>(false);
  const [alwaysShowArmenian, setAlwaysShowArmenian] = useState<boolean>(false);
  const [showAnswerCard, setShowAnswerCard] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [hintLevel, setHintLevel] = useState<number>(0);
  const [feedback, setFeedback] = useState<{
    show: boolean;
    isCorrect: boolean;
    messageEs: string;
    messageHy: string;
    correctAnswerEs: string;
    correctAnswerHy: string;
  } | null>(null);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [showStudyModal, setShowStudyModal] = useState<boolean>(false);
  const [viewFilter, setViewFilter] = useState<'all' | 'wrong' | 'correct'>('all');
  const [timerSeconds, setTimerSeconds] = useState<number>(180);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);
  const [isTimerEnabled, setIsTimerEnabled] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement | null>(null);

  // Initialize or reset game
  const resetGame = (onlyWrong: boolean = false) => {
    soundManager.playClick();
    if (onlyWrong) {
      const newStatuses: Record<number, LetterStatus> = {};
      const newResults: Record<number, LetterResult> = {};
      questions.forEach((q) => {
        if (statuses[q.id] === 'wrong') {
          newStatuses[q.id] = 'pending';
        } else {
          newStatuses[q.id] = statuses[q.id] || 'pending';
          if (results[q.id]) newResults[q.id] = results[q.id];
        }
      });
      setStatuses(newStatuses);
      setResults(newResults);
      // Find first wrong question
      const firstWrongIdx = questions.findIndex((q) => statuses[q.id] === 'wrong');
      setCurrentIndex(firstWrongIdx >= 0 ? firstWrongIdx : 0);
    } else {
      setStatuses({});
      setResults({});
      setCurrentIndex(0);
      setLap(1);
    }
    setUserInput('');
    setFeedback(null);
    setIsGameOver(false);
    setHintLevel(0);
    setShowArmenianTranslation(false);
    setShowAnswerCard(false);
    setTimerSeconds(180);
    setIsTimerRunning(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Sound mute toggle
  const toggleMute = () => {
    const newState = !isMuted;
    setIsMuted(newState);
    soundManager.isMuted = newState;
  };

  // Timer countdown if enabled
  useEffect(() => {
    if (!isTimerEnabled || !isTimerRunning || isGameOver) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          setIsGameOver(true);
          soundManager.playVictory();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerEnabled, isTimerRunning, isGameOver]);

  const currentQ = questions[currentIndex] || questions[0];

  // Calculate scores
  const correctCount = Object.values(statuses).filter((s) => s === 'correct').length;
  const wrongCount = Object.values(statuses).filter((s) => s === 'wrong').length;
  const passedCount = Object.values(statuses).filter((s) => s === 'passed').length;
  const totalLetters = questions.length;
  const answeredTotal = correctCount + wrongCount;

  // Focus input when question changes
  useEffect(() => {
    if (!feedback?.show && !isGameOver) {
      inputRef.current?.focus();
    }
    setHintLevel(0);
    setShowArmenianTranslation(alwaysShowArmenian);
    setShowAnswerCard(false);
  }, [currentIndex, feedback, isGameOver, alwaysShowArmenian]);

  // Check if round is complete
  useEffect(() => {
    if (answeredTotal === totalLetters && totalLetters > 0) {
      setIsGameOver(true);
      soundManager.playVictory();
    }
  }, [answeredTotal, totalLetters]);

  // Find next unanswered letter
  const findNextIndex = (fromIndex: number): number => {
    // 1. First look ahead for 'pending' or 'passed'
    for (let i = fromIndex + 1; i < questions.length; i++) {
      const s = statuses[questions[i].id];
      if (!s || s === 'pending' || s === 'passed') {
        return i;
      }
    }
    // 2. Wrap around from beginning
    for (let i = 0; i <= fromIndex; i++) {
      const s = statuses[questions[i].id];
      if (!s || s === 'pending' || s === 'passed') {
        return i;
      }
    }
    return fromIndex;
  };

  // Advance to next letter
  const advanceToNext = () => {
    setFeedback(null);
    setUserInput('');
    setShowAnswerCard(false);
    const nextIdx = findNextIndex(currentIndex);
    if (nextIdx === currentIndex && (statuses[currentQ.id] === 'correct' || statuses[currentQ.id] === 'wrong')) {
      // No more unanswered letters left
      setIsGameOver(true);
      soundManager.playVictory();
    } else {
      if (nextIdx < currentIndex) {
        setLap((prev) => prev + 1);
      }
      setCurrentIndex(nextIdx);
    }
  };

  // Submit Answer handler
  const handleAnswerSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userInput.trim()) return;

    const isCorrect = isAnswerCorrect(userInput, currentQ);
    const newStatus: LetterStatus = isCorrect ? 'correct' : 'wrong';

    setStatuses((prev) => ({
      ...prev,
      [currentQ.id]: newStatus,
    }));

    setResults((prev) => ({
      ...prev,
      [currentQ.id]: {
        questionId: currentQ.id,
        userAnswer: userInput.trim(),
        isCorrect,
        status: newStatus,
        attempts: (prev[currentQ.id]?.attempts || 0) + 1,
      },
    }));

    if (isCorrect) {
      soundManager.playCorrect();
      setFeedback({
        show: true,
        isCorrect: true,
        messageEs: '¡Correcto!',
        messageHy: 'Ճիշտ է։',
        correctAnswerEs: currentQ.answerEs,
        correctAnswerHy: currentQ.answerHy,
      });
      // Automatically advance after brief celebration
      setTimeout(() => {
        advanceToNext();
      }, 1200);
    } else {
      soundManager.playWrong();
      // Requirement: "если ответ неверный всё равно продолжить играть"
      // Show feedback card, then player continues without any game over penalty!
      setFeedback({
        show: true,
        isCorrect: false,
        messageEs: '¡Incorrecto!',
        messageHy: 'Ոչ ճիշտ, բայց խաղը շարունակվում է։',
        correctAnswerEs: currentQ.answerEs,
        correctAnswerHy: currentQ.answerHy,
      });
    }
  };

  // Pasapalabra (Pass turn)
  const handlePasapalabra = () => {
    soundManager.playPass();
    setStatuses((prev) => ({
      ...prev,
      [currentQ.id]: 'passed',
    }));
    advanceToNext();
  };

  // Insert Spanish special characters
  const insertChar = (char: string) => {
    setUserInput((prev) => prev + char);
    inputRef.current?.focus();
  };

  // Toggle Armenian translation popup / reveal
  const toggleArmenian = () => {
    soundManager.playClick();
    setShowArmenianTranslation((prev) => !prev);
  };

  // Toggle Answer card reveal
  const handleToggleAnswer = () => {
    soundManager.playClick();
    setShowAnswerCard((prev) => !prev);
  };

  // Keyboard navigation shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ' ' && userInput === '') {
      e.preventDefault();
      handlePasapalabra();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950">
      {/* Background ambient lighting reminiscent of the TV show studio */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-blue-600/15 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -left-32 w-80 h-80 bg-cyan-600/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-10 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px]" />
      </div>

      <ConfettiCanvas active={isGameOver && correctCount >= 18} />

      {/* Top Bar Navigation */}
      <header className="relative z-30 flex items-center justify-between gap-4 px-4 sm:px-8 py-3.5 border-b border-blue-900/40 bg-slate-950/80 backdrop-blur-md">
        {/* Brand Zone */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-black text-sm shadow-md shadow-amber-500/30">
            🇪🇸
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
              Pasapalabra
              <span className="text-xs font-normal text-amber-400 border border-amber-400/40 px-1.5 py-0.2 rounded">
                A2–B1
              </span>
            </h1>
            <p className="text-[11px] text-blue-300/80 hidden sm:block">
              Իսպաներեն և հայերեն բառապաշարի խաղ
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Always Show Armenian Toggle */}
          <button
            type="button"
            onClick={() => setAlwaysShowArmenian(!alwaysShowArmenian)}
            title="Միշտ ցուցադրել հայերեն թարգմանությունը (Siempre mostrar armenio)"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all ${
              alwaysShowArmenian
                ? 'bg-blue-600 border-blue-400 text-white shadow-sm'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <Languages className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Հայերեն թարգմանություն</span>
            <span className="text-[10px] opacity-75">
              {alwaysShowArmenian ? 'Միացված' : 'Սեղմելիս'}
            </span>
          </button>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={toggleMute}
            title={isMuted ? 'Միացնել ձայնը' : 'Անջատել ձայնը'}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Study / Dictionary View */}
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setShowStudyModal(true);
            }}
            title="Բառարան և հարցերի ամբողջական ցանկ"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all"
          >
            <Info className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">27 Բառեր</span>
          </button>

          {/* Restart */}
          <button
            type="button"
            onClick={() => resetGame(false)}
            title="Վերսկսել խաղը (Reiniciar)"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-sm transition-all active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Վերսկսել</span>
          </button>
        </div>
      </header>

      {/* Main Playing Arena */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto p-3 sm:p-6 flex flex-col justify-between">
        {/* Top HUD: Round stats, Lap info */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2 px-2 text-xs sm:text-sm">
          <div className="flex items-center gap-3">
            <span className="text-slate-400">
              Փուլ {lap} · <strong className="text-white">{totalLetters - answeredTotal}</strong> տառ մնացել է
            </span>
            {passedCount > 0 && (
              <span className="px-2 py-0.5 rounded bg-sky-950 border border-sky-800/80 text-sky-300 text-xs">
                {passedCount} pasapalabra
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-xs hidden sm:inline">
              Սեղմեք իսպաներեն տեքստի վրա՝ հայերեն թարգմանությունը տեսնելու համար:
            </span>
          </div>
        </div>

        {/* Center Split: Rosco Circle on Left/Center, Interactive Clue & Answer on Right/Center */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Column 1: The Iconic Pasapalabra Rosco (6 or 7 cols) */}
          <div className="lg:col-span-6 flex flex-col items-center justify-center">
            <RoscoWheel
              questions={questions}
              currentIndex={currentIndex}
              statuses={statuses}
              onSelectLetter={(idx) => {
                soundManager.playClick();
                setCurrentIndex(idx);
                setFeedback(null);
                setUserInput('');
              }}
              correctCount={correctCount}
              wrongCount={wrongCount}
              totalLetters={totalLetters}
              passedCount={passedCount}
            />
          </div>

          {/* Column 2: Clue Card, Spanish/Armenian Translation, & Input Form (6 cols) */}
          <div className="lg:col-span-6 flex flex-col justify-center">
            <div className="bg-slate-900/80 border border-blue-900/50 rounded-2xl p-5 sm:p-7 shadow-2xl backdrop-blur-xl relative overflow-hidden">
              {/* Subtle accent border */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-amber-400 to-indigo-500" />

              {/* Letter Title Banner */}
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-full bg-blue-600 text-white font-black text-sm flex items-center justify-center border border-blue-400 shadow-md">
                    {currentQ.letter}
                  </span>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      {currentQ.prefixLabelEs}
                    </h2>
                    <p className="text-xs text-amber-400/90 font-medium">
                      {currentQ.prefixLabelHy}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => soundManager.speakSpanish(currentQ.questionEs)}
                    title="Լսել հարցը իսպաներենով"
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors"
                  >
                    <Volume2 className="w-4 h-4 text-blue-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setHintLevel((h) => Math.min(h + 1, 3))}
                    title="Հուշում բառի երկարության կամ առաջին տառերի մասին"
                    className="p-1.5 rounded-lg bg-slate-800 text-amber-300 hover:bg-slate-700 transition-colors"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Spanish Clue Box (Click to reveal Armenian translation!) */}
              <div
                onClick={toggleArmenian}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') toggleArmenian();
                }}
                className="group relative cursor-pointer p-4 rounded-xl bg-blue-950/40 hover:bg-blue-950/70 border border-blue-800/40 hover:border-blue-500/60 transition-all duration-200 shadow-inner"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-400 flex items-center gap-1.5 mb-1">
                      🇪🇸 Իսպաներեն հարց (Սեղմեք թարգմանելու համար)
                    </span>
                    <p className="text-base sm:text-lg text-slate-100 font-semibold leading-relaxed group-hover:text-blue-100 transition-colors">
                      {currentQ.questionEs}
                    </p>
                  </div>
                  <div className="shrink-0 p-1.5 rounded-md bg-blue-900/60 text-blue-300 group-hover:text-white transition-colors mt-1">
                    {showArmenianTranslation ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </div>
                </div>

                <div className="mt-2 text-[11px] text-blue-400/80 flex items-center gap-1">
                  <span>💡 Սեղմեք տեքստի վրա՝ հայերեն թարգմանությունը {showArmenianTranslation ? 'փակելու' : 'բացելու'} համար</span>
                </div>
              </div>

              {/* Armenian Translation Section (Revealed when clicked or toggled) */}
              <div
                className={`transition-all duration-300 overflow-hidden ${
                  showArmenianTranslation
                    ? 'max-h-60 opacity-100 mt-3.5 p-4 rounded-xl bg-slate-950/90 border border-amber-500/40 shadow-lg'
                    : 'max-h-0 opacity-0 m-0 p-0 border-0'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wide mb-1">
                  🇦🇲 Հայերեն թարգմանություն
                </div>
                <p className="text-sm sm:text-base text-amber-100/95 font-medium leading-relaxed">
                  {currentQ.questionHy}
                </p>
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Բառի թարգմանությունը՝ <strong className="text-white">{currentQ.answerHy}</strong>
                  </span>
                  <span className="text-amber-400 font-mono">
                    {currentQ.answerEs.length} տառ
                  </span>
                </div>
              </div>

              {/* Hints when requested */}
              {hintLevel > 0 && (
                <div className="mt-3.5 p-3 rounded-lg bg-amber-950/40 border border-amber-600/30 text-xs text-amber-200 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-300">Հուշում {hintLevel}/3: </span>
                    {hintLevel === 1 && (
                      <span>
                        Բառը պարունակում է <strong>{currentQ.answerEs.length}</strong> տառ:
                      </span>
                    )}
                    {hintLevel === 2 && (
                      <span>
                        Սկսվում է <strong>{currentQ.answerEs.slice(0, 2).toUpperCase()}...</strong> տառերով:
                      </span>
                    )}
                    {hintLevel >= 3 && (
                      <span>
                        {currentQ.hint || `Նշանակություն՝ ${currentQ.answerHy}`}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Feedback Card (If user answered, show result and keep playing) */}
              {feedback?.show && (
                <div
                  className={`mt-4 p-4 rounded-xl border transition-all ${
                    feedback.isCorrect
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                      : 'bg-rose-950/90 border-rose-500 text-rose-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {feedback.isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                      )}
                      <div>
                        <h4 className="font-bold text-sm sm:text-base">
                          {feedback.messageEs} · {feedback.messageHy}
                        </h4>
                        <div className="text-xs sm:text-sm mt-1 text-slate-200">
                          Ճիշտ պատասխանն է՝{' '}
                          <button
                            type="button"
                            onClick={() => soundManager.speakSpanish(feedback.correctAnswerEs)}
                            className="font-black text-white underline decoration-amber-400 decoration-2 hover:text-amber-300 inline-flex items-center gap-1"
                          >
                            {feedback.correctAnswerEs}
                            <Volume2 className="w-3.5 h-3.5 inline text-amber-400" />
                          </button>{' '}
                          — <span className="font-medium text-amber-300">{feedback.correctAnswerHy}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={advanceToNext}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-950 hover:bg-slate-200 transition-colors shrink-0 flex items-center gap-1 shadow-md"
                    >
                      <span>Շարունակել</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Input Form */}
              <form onSubmit={handleAnswerSubmit} className="mt-5">
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={feedback?.show && feedback.isCorrect}
                    placeholder="Գրեք պատասխանը իսպաներենով..."
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                    className="w-full px-4 py-3 sm:py-3.5 bg-slate-950/90 border-2 border-blue-600/60 focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20 rounded-xl text-white text-base sm:text-lg font-medium placeholder-slate-500 outline-none transition-all pr-12 shadow-inner"
                  />
                  {userInput && (
                    <button
                      type="button"
                      onClick={() => setUserInput('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold px-1.5 py-1"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Spanish Special Character Helper Bar */}
                <div className="flex items-center gap-1 sm:gap-1.5 mt-2.5 overflow-x-auto pb-1 text-xs">
                  <span className="text-[11px] text-slate-400 font-medium mr-1 shrink-0">
                    Իսպաներեն տառեր՝
                  </span>
                  {['ñ', 'á', 'é', 'í', 'ó', 'ú', 'ü'].map((char) => (
                    <button
                      key={char}
                      type="button"
                      onClick={() => insertChar(char)}
                      className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white font-bold transition-all border border-slate-700 hover:border-blue-400 active:scale-95"
                    >
                      {char}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={toggleArmenian}
                    className="ml-auto text-amber-400 hover:text-amber-300 text-xs font-medium underline shrink-0"
                  >
                    {showArmenianTranslation ? 'Թաքցնել հայերենը' : '🇦🇲 Տեսնել հայերենը'}
                  </button>
                </div>

                {/* Answer Reveal Card (When user clicks 'Ответ / Տեսնել պատասխանը') */}
                {showAnswerCard && (
                  <div className="mt-3.5 p-4 rounded-xl bg-gradient-to-r from-amber-950/70 via-slate-900 to-blue-950/80 border border-amber-400/60 shadow-xl transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 mt-0.5 shadow-md">
                          <KeyRound className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                              Ճիշտ պատասխան (Respuesta)
                            </span>
                            <span className="text-[11px] text-slate-400">· {currentQ.letter} տառ</span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="text-xl sm:text-2xl font-black text-white tracking-wide">
                              {currentQ.answerEs}
                            </span>
                            <button
                              type="button"
                              onClick={() => soundManager.speakSpanish(currentQ.answerEs)}
                              className="p-1 rounded-md bg-amber-400/20 text-amber-300 hover:text-white hover:bg-amber-400/40 transition-colors"
                              title="Լսել իսպաներեն արտասանությունը"
                            >
                              <Volume2 className="w-4 h-4" />
                            </button>
                            <span className="text-base sm:text-lg text-amber-300 font-semibold">
                              — {currentQ.answerHy}
                            </span>
                          </div>
                          {currentQ.hint && (
                            <p className="text-xs text-slate-300 mt-1 italic">
                              💡 {currentQ.hint}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowAnswerCard(false)}
                        className="text-slate-400 hover:text-white p-1 rounded text-xs"
                        title="Փակել"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-amber-500/20 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setUserInput(currentQ.answerEs);
                          inputRef.current?.focus();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold transition-all flex items-center gap-1.5 shadow"
                      >
                        <span>Լրացնել պատասխանը դաշտում</span>
                      </button>

                      <span className="text-slate-400 text-[11px]">
                        Կարող եք նայել պատասխանը և շարունակել խաղալ:
                      </span>
                    </div>
                  </div>
                )}

                {/* Action Buttons: Pasapalabra, Ответ (See Answer), and Submit */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-4">
                  <button
                    type="button"
                    onClick={handlePasapalabra}
                    className="px-3 py-3 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg shadow-blue-900/40 border border-blue-400/30 transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Pasapalabra</span>
                    <span className="text-[11px] opacity-75 hidden md:inline">(Space)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleAnswer}
                    className={`px-3 py-3 rounded-xl font-bold text-xs sm:text-sm border transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-md ${
                      showAnswerCard
                        ? 'bg-amber-400 text-slate-950 border-amber-300 ring-2 ring-amber-400/40'
                        : 'bg-slate-800/90 hover:bg-slate-700 text-amber-300 border-amber-500/40 hover:border-amber-400'
                    }`}
                    title="Տեսնել ճիշտ պատասխանը (Ver respuesta)"
                  >
                    <KeyRound className="w-4 h-4 shrink-0" />
                    <span>{showAnswerCard ? 'Թաքցնել պատասխանը' : 'Պատասխան (Ответ)'}</span>
                  </button>

                  <button
                    type="submit"
                    disabled={!userInput.trim()}
                    className="px-3 py-3 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40 disabled:pointer-events-none text-slate-950 shadow-lg shadow-emerald-900/40 transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Պատասխանել</span>
                    <span className="text-[11px] opacity-85 hidden md:inline">(Enter)</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Bottom Game Status Strip */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 py-3 px-4 rounded-xl bg-slate-900/60 border border-blue-900/30 text-xs text-slate-300">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
              <span>{correctCount} Ճիշտ (Aciertos)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
              <span>{wrongCount} Սխալ (Fallos)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
              <span>{passedCount} Pasapalabra</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-400">
            <span>Կանոն՝ Սխալ պատասխանի դեպքում խաղը չի ավարտվում, այլ շարունակվում է։</span>
          </div>
        </div>
      </main>

      {/* Game Over / Summary Modal */}
      {isGameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-slate-900 border border-blue-800 rounded-2xl p-6 sm:p-8 shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-emerald-400 to-blue-500" />

            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center text-3xl shadow-lg mb-3">
                <Trophy className="w-8 h-8" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white">
                Խաղն ավարտվեց · Fin de la partida
              </h3>
              <p className="text-sm text-slate-300 mt-1">
                Դուք անցաք ամբողջ 27 տառանոց Rosco-ն:
              </p>
            </div>

            {/* Scorecard */}
            <div className="grid grid-cols-3 gap-3 mb-6 text-center">
              <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-500/50">
                <div className="text-2xl sm:text-3xl font-black text-emerald-400 tabular-nums">
                  {correctCount}
                </div>
                <div className="text-xs font-semibold text-emerald-200 mt-0.5">
                  Ճիշտ (Aciertos)
                </div>
              </div>

              <div className="p-4 rounded-xl bg-rose-950/70 border border-rose-500/50">
                <div className="text-2xl sm:text-3xl font-black text-rose-400 tabular-nums">
                  {wrongCount}
                </div>
                <div className="text-xs font-semibold text-rose-200 mt-0.5">
                  Սխալ (Fallos)
                </div>
              </div>

              <div className="p-4 rounded-xl bg-blue-950/70 border border-blue-500/50">
                <div className="text-2xl sm:text-3xl font-black text-amber-400 tabular-nums">
                  {Math.round((correctCount / totalLetters) * 100)}%
                </div>
                <div className="text-xs font-semibold text-blue-200 mt-0.5">
                  Ճշգրտություն
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {wrongCount > 0 && (
                <button
                  type="button"
                  onClick={() => resetGame(true)}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm bg-rose-600 hover:bg-rose-500 text-white shadow-lg transition-all"
                >
                  Կրկնել միայն սխալները ({wrongCount})
                </button>
              )}

              <button
                type="button"
                onClick={() => resetGame(false)}
                className="px-6 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg transition-all"
              >
                Խաղալ նորից (27 տառ)
              </button>

              <button
                type="button"
                onClick={() => setShowStudyModal(true)}
                className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all border border-slate-700"
              >
                Տեսնել բոլոր բառերը և թարգմանությունները
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 27 Words Study Dictionary Modal */}
      {showStudyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-4xl max-h-[85vh] bg-slate-900 border border-blue-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                  🇪🇸 27 Բառեր և հարցեր (Իսպաներեն և հայերեն)
                </h3>
                <p className="text-xs text-slate-400">
                  Սեղմեք ցանկացած իսպաներեն բառի կամ հարցի վրա՝ արտասանությունը լսելու և թարգմանությունը ստուգելու համար:
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowStudyModal(false)}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="px-5 py-2.5 bg-slate-950/60 border-b border-slate-800 flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">Ֆիլտրել՝</span>
              <button
                type="button"
                onClick={() => setViewFilter('all')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  viewFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Բոլոր 27-ը
              </button>
              <button
                type="button"
                onClick={() => setViewFilter('correct')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  viewFilter === 'correct'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Ճիշտ ({correctCount})
              </button>
              <button
                type="button"
                onClick={() => setViewFilter('wrong')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  viewFilter === 'wrong'
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Սխալ ({wrongCount})
              </button>
            </div>

            {/* Questions List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
              {questions
                .filter((q) => {
                  const s = statuses[q.id];
                  if (viewFilter === 'correct') return s === 'correct';
                  if (viewFilter === 'wrong') return s === 'wrong';
                  return true;
                })
                .map((q) => {
                  const status = statuses[q.id];
                  return (
                    <div
                      key={q.id}
                      className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-blue-700/60 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <span
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shrink-0 border ${
                            status === 'correct'
                              ? 'bg-emerald-600 border-emerald-400 text-white'
                              : status === 'wrong'
                              ? 'bg-rose-600 border-rose-400 text-white'
                              : 'bg-blue-600 border-blue-400 text-white'
                          }`}
                        >
                          {q.letter}
                        </span>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-amber-400 uppercase">
                              {q.prefixLabelEs}
                            </span>
                            <span className="text-xs text-slate-400">· {q.prefixLabelHy}</span>
                          </div>

                          <p className="text-sm text-slate-200">
                            <strong>ES:</strong> {q.questionEs}
                          </p>
                          <p className="text-xs text-amber-200/90 font-medium">
                            <strong>ARM:</strong> {q.questionHy}
                          </p>
                        </div>
                      </div>

                      {/* Answer details */}
                      <div className="shrink-0 sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800 w-full sm:w-auto flex sm:flex-col items-center sm:items-end justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => soundManager.speakSpanish(q.answerEs)}
                          className="font-black text-base text-amber-300 hover:text-amber-200 flex items-center gap-1.5"
                        >
                          {q.answerEs}
                          <Volume2 className="w-3.5 h-3.5 text-blue-400" />
                        </button>
                        <span className="text-xs text-slate-300 font-medium">
                          {q.answerHy}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowStudyModal(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
              >
                Փակել (Cerrar)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
