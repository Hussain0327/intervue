"use client";

import { useCallback, useEffect, useState } from "react";
import { ParsedResume } from "./api";

// Round configuration matching backend ROUND_CONFIG
export const INTERVIEW_ROUNDS = [
  { round: 1, type: "behavioral", title: "Behavioral Interview", difficulty: "medium", passScore: 70 },
  { round: 2, type: "coding", title: "Coding Challenge", difficulty: "medium", passScore: 70 },
  { round: 3, type: "system_design", title: "System Design + Coding", difficulty: "hard", passScore: 70 },
] as const;

// Interview mode configurations
export const INTERVIEW_MODES: {
  [key: string]: {
    id: string;
    title: string;
    description: string;
    rounds: readonly (1 | 2 | 3)[];
  };
} = {
  full: {
    id: "full",
    title: "Full Interview",
    description: "Complete 3-round interview experience",
    rounds: [1, 2, 3],
  },
  behavioral: {
    id: "behavioral",
    title: "Behavioral Only",
    description: "Focus on soft skills and past experiences",
    rounds: [1],
  },
  coding: {
    id: "coding",
    title: "Coding Challenge",
    description: "LeetCode-style problem discussion",
    rounds: [2],
  },
  system_design: {
    id: "system_design",
    title: "System Design",
    description: "Architecture and design discussion",
    rounds: [3],
  },
};

export type InterviewModeId = "full" | "behavioral" | "coding" | "system_design";

export type RoundStatus = "locked" | "in_progress" | "passed" | "failed";

export interface RoundProgress {
  status: RoundStatus;
  score?: number;
  feedback?: string;
  completedAt?: string;
}

export interface InterviewProgress {
  sessionId: string;
  targetRole: string;
  resume?: ParsedResume;
  interviewMode: InterviewModeId;
  currentRound: 1 | 2 | 3;
  rounds: {
    [round: number]: RoundProgress;
  };
  createdAt: string;
}

const STORAGE_KEY = "intervue_progress";

function getInitialProgress(): InterviewProgress {
  return {
    sessionId: "",
    targetRole: "",
    interviewMode: "full",
    currentRound: 1,
    rounds: {
      1: { status: "locked" },
      2: { status: "locked" },
      3: { status: "locked" },
    },
    createdAt: new Date().toISOString(),
  };
}

function loadProgress(): InterviewProgress | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as InterviewProgress;
    return parsed;
  } catch (e) {
    console.error("Failed to load interview progress:", e);
    return null;
  }
}

function saveProgress(progress: InterviewProgress): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error("Failed to save interview progress:", e);
  }
}

export function useInterviewProgress() {
  const [progress, setProgress] = useState<InterviewProgress | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load progress on mount
  useEffect(() => {
    const stored = loadProgress();
    setProgress(stored);
    setIsLoaded(true);
  }, []);

  // Get current progress
  const getProgress = useCallback((): InterviewProgress | null => {
    return progress;
  }, [progress]);

  // Initialize progress for a new interview session
  const initProgress = useCallback(
    (sessionId: string, targetRole: string, resume?: ParsedResume, mode: InterviewModeId = "full"): InterviewProgress => {
      const modeConfig = INTERVIEW_MODES[mode];
      const firstRound = modeConfig.rounds[0];

      // Initialize rounds based on mode
      const rounds: { [round: number]: RoundProgress } = {};
      for (const roundNum of [1, 2, 3]) {
        if (modeConfig.rounds.includes(roundNum as 1 | 2 | 3)) {
          // This round is part of the mode
          rounds[roundNum] = { status: roundNum === firstRound ? "in_progress" : "locked" };
        } else {
          // This round is not part of the mode - mark as not applicable
          rounds[roundNum] = { status: "locked" };
        }
      }

      const newProgress: InterviewProgress = {
        sessionId,
        targetRole,
        resume,
        interviewMode: mode,
        currentRound: firstRound as 1 | 2 | 3,
        rounds,
        createdAt: new Date().toISOString(),
      };

      setProgress(newProgress);
      saveProgress(newProgress);
      return newProgress;
    },
    []
  );

  // Start a specific round
  const startRound = useCallback(
    (round: 1 | 2 | 3, sessionId: string): InterviewProgress | null => {
      if (!progress) return null;

      const roundProgress = progress.rounds[round];
      if (roundProgress.status === "locked") {
        console.error("Cannot start a locked round");
        return null;
      }

      const updatedProgress: InterviewProgress = {
        ...progress,
        sessionId,
        currentRound: round,
        rounds: {
          ...progress.rounds,
          [round]: { ...roundProgress, status: "in_progress" },
        },
      };

      setProgress(updatedProgress);
      saveProgress(updatedProgress);
      return updatedProgress;
    },
    [progress]
  );

  // Update a round's result
  const updateRound = useCallback(
    (
      round: number,
      result: { score: number; passed: boolean; feedback: string }
    ): InterviewProgress | null => {
      if (!progress) return null;

      const modeConfig = INTERVIEW_MODES[progress.interviewMode || "full"];
      const modeRounds = modeConfig.rounds;
      const roundIndex = modeRounds.indexOf(round as 1 | 2 | 3);

      const newStatus: RoundStatus = result.passed ? "passed" : "failed";
      const updatedRounds = {
        ...progress.rounds,
        [round]: {
          status: newStatus,
          score: result.score,
          feedback: result.feedback,
          completedAt: new Date().toISOString(),
        },
      };

      // If passed and there's a next round in the mode, unlock it
      let nextRoundInMode: number | null = null;
      if (result.passed && roundIndex >= 0 && roundIndex < modeRounds.length - 1) {
        nextRoundInMode = modeRounds[roundIndex + 1];
        updatedRounds[nextRoundInMode] = { status: "in_progress" };
      }

      const updatedProgress: InterviewProgress = {
        ...progress,
        currentRound: nextRoundInMode ? (nextRoundInMode as 1 | 2 | 3) : progress.currentRound,
        rounds: updatedRounds,
      };

      setProgress(updatedProgress);
      saveProgress(updatedProgress);
      return updatedProgress;
    },
    [progress]
  );

  // Check if candidate passed all rounds for their interview mode
  const hasCompletedAllRounds = useCallback((): boolean => {
    if (!progress) return false;

    const modeConfig = INTERVIEW_MODES[progress.interviewMode || "full"];
    // Check if all rounds in this mode are passed
    return modeConfig.rounds.every(
      (roundNum) => progress.rounds[roundNum]?.status === "passed"
    );
  }, [progress]);

  // Get the next available round (first non-completed round) for the current mode
  const getNextAvailableRound = useCallback((): 1 | 2 | 3 | null => {
    if (!progress) return 1;

    const modeConfig = INTERVIEW_MODES[progress.interviewMode || "full"];
    const modeRounds = modeConfig.rounds;

    for (const round of modeRounds) {
      const status = progress.rounds[round]?.status;
      if (status === "in_progress" || status === "locked") {
        // Only return if not locked OR if it's the first round in the mode
        if (status === "in_progress" || round === modeRounds[0]) {
          return round;
        }
        // Check if previous round (in mode sequence) passed
        const roundIndex = modeRounds.indexOf(round);
        if (roundIndex > 0) {
          const prevRound = modeRounds[roundIndex - 1];
          if (progress.rounds[prevRound]?.status === "passed") {
            return round;
          }
        }
      }
      if (status === "failed") {
        return round; // Can retry failed rounds
      }
    }

    return null; // All passed
  }, [progress]);

  // Check if a specific round is available to start
  const isRoundAvailable = useCallback(
    (round: 1 | 2 | 3): boolean => {
      if (!progress) return round === 1;

      const modeConfig = INTERVIEW_MODES[progress.interviewMode || "full"];
      const modeRounds = modeConfig.rounds;

      // If round is not part of the mode, it's not available
      if (!modeRounds.includes(round)) {
        return false;
      }

      const status = progress.rounds[round]?.status;
      const roundIndex = modeRounds.indexOf(round);

      // First round in mode is always available to start or retry
      if (roundIndex === 0) {
        return status !== "passed";
      }

      // For subsequent rounds, check if previous round in mode sequence passed
      const prevRoundInMode = modeRounds[roundIndex - 1];
      const prevRoundStatus = progress.rounds[prevRoundInMode]?.status;
      if (prevRoundStatus !== "passed") {
        return false;
      }

      // Available if not yet passed
      return status !== "passed";
    },
    [progress]
  );

  // Reset all progress
  const resetProgress = useCallback((): void => {
    const newProgress = getInitialProgress();
    setProgress(newProgress);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Check if there's existing progress
  const hasExistingProgress = useCallback((): boolean => {
    return progress !== null && progress.rounds[1]?.status !== "locked";
  }, [progress]);

  return {
    progress,
    isLoaded,
    getProgress,
    initProgress,
    startRound,
    updateRound,
    hasCompletedAllRounds,
    getNextAvailableRound,
    isRoundAvailable,
    resetProgress,
    hasExistingProgress,
  };
}
