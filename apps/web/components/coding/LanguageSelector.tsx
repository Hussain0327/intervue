"use client";

import { LANGUAGE_OPTIONS, SupportedLanguage } from "@/lib/types/coding";

interface LanguageSelectorProps {
  value: SupportedLanguage;
  onChange: (language: SupportedLanguage) => void;
  disabled?: boolean;
}

export function LanguageSelector({ value, onChange, disabled }: LanguageSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="language-select" className="text-sm font-medium text-gray-600">
        Language:
      </label>
      <select
        id="language-select"
        value={value}
        onChange={(e) => onChange(e.target.value as SupportedLanguage)}
        disabled={disabled}
        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {LANGUAGE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
