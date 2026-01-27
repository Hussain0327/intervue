// Rubric configuration by round type

import { RubricConfig } from "./types/interview";

export const RUBRIC_CONFIGS: Record<string, RubricConfig> = {
  behavioral: {
    roundType: "behavioral",
    dimensions: [
      {
        id: "star-method",
        name: "STAR Method",
        description: "Uses Situation, Task, Action, Result structure effectively",
        weight: 25,
      },
      {
        id: "communication",
        name: "Communication",
        description: "Clear, concise, and well-structured responses",
        weight: 25,
      },
      {
        id: "self-awareness",
        name: "Self-Awareness",
        description: "Demonstrates reflection and growth mindset",
        weight: 25,
      },
      {
        id: "culture-fit",
        name: "Culture Fit",
        description: "Aligns with team values and collaboration style",
        weight: 25,
      },
    ],
  },
  coding: {
    roundType: "coding",
    dimensions: [
      {
        id: "problem-understanding",
        name: "Problem Understanding",
        description: "Clarifies requirements and identifies edge cases",
        weight: 15,
      },
      {
        id: "approach",
        name: "Approach",
        description: "Explains strategy before coding",
        weight: 20,
      },
      {
        id: "code-correctness",
        name: "Code Correctness",
        description: "Solution works correctly and handles edge cases",
        weight: 25,
      },
      {
        id: "complexity",
        name: "Complexity Analysis",
        description: "Identifies time and space complexity accurately",
        weight: 20,
      },
      {
        id: "communication",
        name: "Communication",
        description: "Explains thought process while coding",
        weight: 20,
      },
    ],
  },
  system_design: {
    roundType: "system_design",
    dimensions: [
      {
        id: "system-design",
        name: "System Design",
        description: "Creates scalable and maintainable architecture",
        weight: 40,
      },
      {
        id: "technical-depth",
        name: "Technical Depth",
        description: "Demonstrates deep understanding of components",
        weight: 30,
      },
      {
        id: "communication",
        name: "Communication",
        description: "Articulates design decisions and trade-offs",
        weight: 30,
      },
    ],
  },
};

export function getRubricForRound(roundType: "behavioral" | "coding" | "system_design"): RubricConfig {
  return RUBRIC_CONFIGS[roundType];
}
