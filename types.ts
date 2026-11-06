export type LetterStatus = 'pending' | 'active' | 'correct' | 'wrong' | 'passed';

export type PrefixType = 'starts' | 'contains';

export interface QuestionItem {
  id: number;
  letter: string;
  prefixType: PrefixType;
  prefixLabelEs: string;
  prefixLabelHy: string;
  questionEs: string;
  questionHy: string;
  answerEs: string;
  answerHy: string;
  acceptableAnswers: string[];
  hint?: string;
  exampleSentenceEs?: string;
  exampleSentenceHy?: string;
}

export type GameState = 'WELCOME' | 'PLAYING' | 'ROUND_SUMMARY';

export interface LetterResult {
  questionId: number;
  userAnswer?: string;
  isCorrect?: boolean;
  status: LetterStatus;
  attempts: number;
}
