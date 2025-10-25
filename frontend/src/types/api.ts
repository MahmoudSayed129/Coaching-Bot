export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  source?: string;
  score?: number;
}

export interface CoachingAnswer {
  question: string;
  answer: string;
  source: string;
  bm25_score: number;
}

export interface ApiResponse {
  answers: CoachingAnswer[];
}

export interface ApiRequest {
  question: string;
}