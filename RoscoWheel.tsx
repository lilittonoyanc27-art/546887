import React from 'react';
import { QuestionItem, LetterStatus } from './types.ts';
import { Volume2 } from 'lucide-react';
import { soundManager } from './audio.ts';

interface RoscoWheelProps {
  questions: QuestionItem[];
  currentIndex: number;
  statuses: Record<number, LetterStatus>;
  onSelectLetter: (index: number) => void;
  correctCount: number;
  wrongCount: number;
  totalLetters: number;
  passedCount: number;
}

export const RoscoWheel: React.FC<RoscoWheelProps> = ({
  questions,
  currentIndex,
  statuses,
  onSelectLetter,
  correctCount,
  wrongCount,
  totalLetters,
  passedCount,
}) => {
  const currentQ = questions[currentIndex];

  return (
    <div className="relative w-full max-w-[420px] sm:max-w-[480px] md:max-w-[540px] aspect-square mx-auto flex items-center justify-center p-2 select-none">
      {/* Background radial studio ambient glow */}
      <div className="absolute inset-4 rounded-full bg-blue-600/10 blur-2xl pointer-events-none" />
      <div className="absolute inset-12 rounded-full border border-blue-500/20 pointer-events-none" />

      {/* Letters placed along circular circumference */}
      {questions.map((q, idx) => {
        const total = questions.length;
        // Start angle at top (-90 degrees or -PI/2) and rotate clockwise
        const angle = (idx / total) * 2 * Math.PI - Math.PI / 2;
        // Radius percentage from center (42% keeps bubbles comfortably within the 100% container)
        const radiusPercent = 42;
        const x = 50 + radiusPercent * Math.cos(angle);
        const y = 50 + radiusPercent * Math.sin(angle);

        const status = statuses[q.id] || 'pending';
        const isActive = idx === currentIndex;

        // Styling based on status
        let bubbleClass = 'bg-blue-600 text-white border-blue-400 hover:bg-blue-500 shadow-blue-900/50';
        let badgeIcon = null;

        if (status === 'correct') {
          bubbleClass = 'bg-emerald-600 text-white border-emerald-300 shadow-emerald-900/60 ring-2 ring-emerald-400/40';
          badgeIcon = (
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full flex items-center justify-center text-[8px] text-slate-950 font-black">
              ✓
            </span>
          );
        } else if (status === 'wrong') {
          bubbleClass = 'bg-rose-600 text-white border-rose-300 shadow-rose-900/60 ring-2 ring-rose-400/40';
          badgeIcon = (
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-rose-300 rounded-full flex items-center justify-center text-[8px] text-rose-950 font-black">
              ✕
            </span>
          );
        } else if (status === 'passed') {
          bubbleClass = 'bg-sky-500 text-white border-sky-300 shadow-sky-900/50 ring-1 ring-sky-300/40';
        }

        if (isActive) {
          bubbleClass = 'bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 border-white shadow-amber-500/60 ring-4 ring-amber-400/80 scale-125 z-20 font-black animate-pulse';
        }

        return (
          <button
            key={q.letter}
            type="button"
            onClick={() => onSelectLetter(idx)}
            title={`${q.letter}: ${status === 'correct' ? 'Ճիշտ (Correcto)' : status === 'wrong' ? 'Սխալ (Fallo)' : status === 'passed' ? 'Բաց թողնված (Pasado)' : 'Չպատասխանած (Pendiente)'}`}
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: 'translate(-50%, -50%)',
            }}
            className={`absolute flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-full border-2 text-xs sm:text-sm md:text-base font-extrabold tracking-tight transition-all duration-200 cursor-pointer shadow-lg active:scale-95 ${bubbleClass}`}
          >
            {q.letter}
            {badgeIcon}
          </button>
        );
      })}

      {/* Rosco Center Arena */}
      <div className="relative z-10 w-44 sm:w-56 md:w-64 h-44 sm:h-56 md:h-64 rounded-full bg-gradient-to-b from-slate-900/90 to-blue-950/95 border-2 border-blue-500/30 shadow-2xl backdrop-blur-md flex flex-col items-center justify-center p-3 text-center">
        {/* Active Letter Giant Badge */}
        <div className="relative flex items-center justify-center mb-1">
          <span className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(59,130,246,0.6)]">
            {currentQ.letter}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              soundManager.speakSpanish(currentQ.answerEs);
            }}
            title="Լսել իսպաներեն արտասանությունը (Escuchar pronunciación)"
            aria-label="Escuchar pronunciación"
            className="absolute -right-7 p-1 text-blue-300 hover:text-white transition-colors"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>

        {/* Letter Clue Prefix */}
        <p className="text-xs sm:text-sm font-semibold text-amber-400 tracking-wide uppercase">
          {currentQ.prefixLabelEs}
        </p>
        <p className="text-[11px] sm:text-xs text-blue-200/90 font-medium">
          {currentQ.prefixLabelHy}
        </p>

        {/* Center Live Scoreboard */}
        <div className="mt-2.5 flex items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm">
          {/* Aciertos */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-bold tabular-nums">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>{correctCount}</span>
            <span className="text-[10px] text-emerald-400/80 font-normal hidden sm:inline">ճիշտ</span>
          </div>

          {/* Fallos */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-950/80 border border-rose-500/40 text-rose-300 font-bold tabular-nums">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span>{wrongCount}</span>
            <span className="text-[10px] text-rose-400/80 font-normal hidden sm:inline">սխալ</span>
          </div>

          {/* Restantes */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-950/80 border border-blue-500/40 text-blue-300 font-bold tabular-nums">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span>{totalLetters - correctCount - wrongCount}</span>
            <span className="text-[10px] text-blue-400/80 font-normal hidden sm:inline">մնաց</span>
          </div>
        </div>

        {passedCount > 0 && (
          <div className="mt-1 text-[10px] text-sky-300">
            {passedCount} տառ բաց թողնված (pasapalabra)
          </div>
        )}
      </div>
    </div>
  );
};
