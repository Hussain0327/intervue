"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo } from "react";
import { LANGUAGE_OPTIONS, SupportedLanguage } from "@/lib/types/coding";
import { LanguageSelector } from "./LanguageSelector";

// Dynamically import Monaco to avoid SSR issues
const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface CodeEditorProps {
  code: string;
  language: SupportedLanguage;
  onChange: (code: string) => void;
  onLanguageChange: (language: SupportedLanguage) => void;
  onSubmit: () => void;
  disabled?: boolean;
  isSubmitting?: boolean;
}

export function CodeEditor({
  code,
  language,
  onChange,
  onLanguageChange,
  onSubmit,
  disabled = false,
  isSubmitting = false,
}: CodeEditorProps) {
  const monacoLanguage = useMemo(() => {
    const option = LANGUAGE_OPTIONS.find((opt) => opt.value === language);
    return option?.monacoId || "python";
  }, [language]);

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      onChange(value || "");
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Ctrl/Cmd + Enter to submit
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (!disabled && !isSubmitting) {
          onSubmit();
        }
      }
    },
    [disabled, isSubmitting, onSubmit]
  );

  return (
    <div className="h-full flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
        <LanguageSelector
          value={language}
          onChange={onLanguageChange}
          disabled={disabled || isSubmitting}
        />
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"} + Enter to submit
          </span>
          <button
            onClick={onSubmit}
            disabled={disabled || isSubmitting || !code.trim()}
            className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Evaluating...
              </>
            ) : (
              <>
                <PlayIcon className="w-4 h-4" />
                Submit Solution
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0" onKeyDown={handleKeyDown}>
        <Editor
          height="100%"
          language={monacoLanguage}
          value={code}
          onChange={handleEditorChange}
          theme="vs-light"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            insertSpaces: true,
            wordWrap: "on",
            padding: { top: 16, bottom: 16 },
            readOnly: disabled || isSubmitting,
            renderLineHighlight: "line",
            cursorBlinking: "smooth",
            smoothScrolling: true,
            fontFamily: "'Fira Code', 'SF Mono', Monaco, 'Inconsolata', monospace",
            fontLigatures: true,
          }}
          loading={
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-500">Loading editor...</p>
              </div>
            </div>
          }
        />
      </div>
    </div>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
      />
    </svg>
  );
}
