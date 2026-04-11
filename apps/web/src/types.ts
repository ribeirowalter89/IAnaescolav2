export type Guardian = {
  id: string;
  fullName: string;
  email: string;
};

export type Subject = {
  id: string;
  name: string;
  folderPath: string;
};

export type Child = {
  id: string;
  name: string;
  age: number;
  gradeLevel: string;
  hobbies: string[];
  subjects: Array<{ subject: Subject }>;
  guardian?: Guardian;
};

export type ProcessedContent = {
  id: string;
  summaryForKid: string;
  detailedGuide: string;
  mermaidFlowchart: string;
  generatedImageUrl?: string | null;
  complexityLevel: "BASICO" | "MEDIO" | "AVANCADO";
  referencesJson?: string[];
  quizQuestions: Array<{
    id: string;
    question: string;
    options: string[];
    correctOption: number;
    explanation: string;
  }>;
  recommendations: Array<{
    id: string;
    type: string;
    title: string;
    url: string;
    thumbnailUrl?: string | null;
    duration?: string | null;
    relevanceScore: number;
    source: string;
  }>;
  subject: Subject;
  createdAt: string;
};