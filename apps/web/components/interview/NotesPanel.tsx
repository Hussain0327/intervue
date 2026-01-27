"use client";

import { useCallback, useRef, useState } from "react";

interface NotesPanelProps {
  notes: string;
  onNotesChange: (notes: string) => void;
  onAddHighlight: (text: string) => void;
}

export function NotesPanel({
  notes,
  onNotesChange,
  onAddHighlight,
}: NotesPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectedText, setSelectedText] = useState<string | null>(null);

  const handleTextSelect = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString().trim());
    } else {
      setSelectedText(null);
    }
  }, []);

  const handleSaveHighlight = useCallback(() => {
    if (selectedText) {
      onAddHighlight(selectedText);
      setSelectedText(null);
      window.getSelection()?.removeAllRanges();
    }
  }, [selectedText, onAddHighlight]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-teal-100 bg-teal-50/30">
        <span className="text-xs text-teal-600 font-medium">
          Your Notes
        </span>
        <span className="text-xs text-teal-400 ml-auto">
          Auto-saved locally
        </span>
      </div>

      {/* Highlight button (appears when text selected) */}
      {selectedText && (
        <div className="px-4 py-2 bg-cyan-50 border-b border-cyan-200 flex items-center gap-2 animate-fade-in-down">
          <span className="text-xs text-cyan-700 truncate flex-1">
            "{selectedText.slice(0, 50)}{selectedText.length > 50 ? '...' : ''}"
          </span>
          <button
            onClick={handleSaveHighlight}
            className="px-3 py-1 text-xs font-medium text-white bg-cyan-500 rounded-md hover:bg-cyan-600 transition-colors flex items-center gap-1"
          >
            <HighlightIcon className="w-3 h-3" />
            Save
          </button>
        </div>
      )}

      {/* Notes textarea */}
      <div className="flex-1 overflow-hidden">
        <textarea
          ref={textareaRef}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          onMouseUp={handleTextSelect}
          onKeyUp={handleTextSelect}
          placeholder="Take notes during the interview...

Tips:
- Jot down key points from questions
- Note your answers for review
- Highlight text to save important snippets"
          className="w-full h-full p-4 resize-none bg-transparent text-teal-800 placeholder-teal-400/60 text-sm leading-relaxed focus:outline-none custom-scrollbar"
        />
      </div>

      {/* Character count */}
      <div className="px-4 py-2 border-t border-teal-100 bg-teal-50/30">
        <span className="text-xs text-teal-400">
          {notes.length} characters
        </span>
      </div>
    </div>
  );
}

function HighlightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42"
      />
    </svg>
  );
}
