"use client";

import { useState, useEffect, useCallback } from "react";
import { InterviewNote } from "./types/interview";

const STORAGE_KEY = "intervue_notes";

interface UseInterviewNotesOptions {
  sessionId: string;
}

export function useInterviewNotes({ sessionId }: UseInterviewNotesOptions) {
  const [notes, setNotes] = useState<string>("");
  const [highlights, setHighlights] = useState<InterviewNote[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load notes from localStorage on mount
  useEffect(() => {
    const storageKey = `${STORAGE_KEY}_${sessionId}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setNotes(parsed.notes || "");
        setHighlights(
          (parsed.highlights || []).map((h: InterviewNote) => ({
            ...h,
            timestamp: new Date(h.timestamp),
          }))
        );
      } catch (e) {
        console.error("Failed to parse stored notes:", e);
      }
    }
    setIsLoaded(true);
  }, [sessionId]);

  // Save notes to localStorage whenever they change
  useEffect(() => {
    if (!isLoaded) return;

    const storageKey = `${STORAGE_KEY}_${sessionId}`;
    localStorage.setItem(
      storageKey,
      JSON.stringify({ notes, highlights })
    );
  }, [notes, highlights, sessionId, isLoaded]);

  const updateNotes = useCallback((newNotes: string) => {
    setNotes(newNotes);
  }, []);

  const addHighlight = useCallback((text: string) => {
    const newHighlight: InterviewNote = {
      id: crypto.randomUUID(),
      content: text,
      timestamp: new Date(),
      highlightedText: text,
    };
    setHighlights((prev) => [...prev, newHighlight]);
  }, []);

  const removeHighlight = useCallback((id: string) => {
    setHighlights((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const clearNotes = useCallback(() => {
    setNotes("");
    setHighlights([]);
  }, []);

  return {
    notes,
    highlights,
    updateNotes,
    addHighlight,
    removeHighlight,
    clearNotes,
    isLoaded,
  };
}
