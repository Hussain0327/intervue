// Coding challenge type definitions

export interface Example {
  input: string;
  output: string;
  explanation?: string;
}

export interface CodingProblem {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  description: string;
  examples: Example[];
  constraints: string[];
  starterCode: Record<string, string>;
  tags: string[];
}

export interface CodeSubmission {
  problemId: string;
  code: string;
  language: string;
}

export interface CodeEvaluationResult {
  correct: boolean;
  score: number;
  feedback: string;
  analysis?: {
    correctness: number;
    edgeCaseHandling: number;
    codeQuality: number;
    complexity: number;
  };
}

export type SupportedLanguage = "python" | "javascript" | "typescript" | "java" | "cpp" | "go";

export const LANGUAGE_OPTIONS: { value: SupportedLanguage; label: string; monacoId: string }[] = [
  { value: "python", label: "Python", monacoId: "python" },
  { value: "javascript", label: "JavaScript", monacoId: "javascript" },
  { value: "typescript", label: "TypeScript", monacoId: "typescript" },
  { value: "java", label: "Java", monacoId: "java" },
  { value: "cpp", label: "C++", monacoId: "cpp" },
  { value: "go", label: "Go", monacoId: "go" },
];

export const DEFAULT_LANGUAGE: SupportedLanguage = "python";
