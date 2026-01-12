
export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD'
}

export interface BibleMarker {
  id: string;
  book: string;
  chapter: string;
  verse: number;
  color: 'yellow' | 'green' | 'red' | 'blue';
  note: string;
  textSnippet: string;
}

export interface BiblePassage {
  reference: string;
  fullText: string;
  summary: string;
  devotional: string;
  questions: QuizQuestion[];
  keyVerses: string[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface UserStats {
  points: number;
  xp: number;
  level: number;
  streak: number;
  completedChapters: string[];
  markers: BibleMarker[];
  activityDates: string[]; // ISO Strings das datas de conclusão
  lastActivityDate?: string;
}

export const getRankTitle = (level: number): string => {
  if (level < 3) return 'Aprendiz da Palavra';
  if (level < 7) return 'Estudante Fiel';
  if (level < 12) return 'Discípulo em Jornada';
  if (level < 20) return 'Evangelista';
  if (level < 35) return 'Mestre das Escrituras';
  return 'Guerreiro da Fé';
};

export const BIBLE_BOOKS = [
  "Gênesis", "Êxodo", "Levítico", "Números", "Deuteronômio", "Josué", "Juízes", "Rute", "1 Samuel", "2 Samuel", "1 Reis", "2 Reis", "1 Crônicas", "2 Crônicas", "Esdras", "Neemias", "Ester", "Jó", "Salmos", "Provérbios", "Eclesiastes", "Cantares", "Isaías", "Jeremias", "Lamentações", "Ezequiel", "Daniel", "Oséias", "Joel", "Amós", "Obadias", "Jonas", "Miquéias", "Naum", "Habacuque", "Sofonias", "Ageu", "Zacarias", "Malaquias",
  "Mateus", "Marcos", "Lucas", "João", "Atos", "Romanos", "1 Coríntios", "2 Coríntios", "Gálatas", "Efésios", "Filipenses", "Colossenses", "1 Tessalonicenses", "2 Tessalonicenses", "1 Timóteo", "2 Timóteo", "Tito", "Filemom", "Hebreus", "Tiago", "1 Pedro", "2 Pedro", "1 João", "2 João", "3 João", "Judas", "Apocalipse"
];
