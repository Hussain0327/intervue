"use client";

import { useCallback, useState } from "react";
import { parseResume, ParsedResume } from "@/lib/api";

interface ResumeUploadProps {
  onResumeExtracted: (resume: ParsedResume | null) => void;
}

export function ResumeUpload({ onResumeExtracted }: ResumeUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [parsedResume, setParsedResume] = useState<ParsedResume | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = async (file: File) => {
    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const resume = await parseResume(file);
      setParsedResume(resume);
      onResumeExtracted(resume);
    } catch (err) {
      console.error("Resume parsing error:", err);
      const message = err instanceof Error ? err.message : "Failed to parse resume";
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, []);

  const handleRemove = useCallback(() => {
    setParsedResume(null);
    setError(null);
    onResumeExtracted(null);
  }, [onResumeExtracted]);

  if (parsedResume) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="p-4 rounded-xl bg-teal-50 border border-teal-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
              <DocumentIcon className="w-5 h-5 text-teal-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-teal-900 truncate">
                {parsedResume.contact.name}
              </p>
              <p className="text-xs text-teal-600">Resume parsed successfully</p>
            </div>
            <button
              onClick={handleRemove}
              className="p-2 text-teal-500 hover:text-teal-700 hover:bg-teal-100 rounded-lg transition-colors"
              aria-label="Remove resume"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Skills preview */}
          {parsedResume.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {parsedResume.skills.slice(0, 5).map((skill, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 text-xs bg-teal-100 text-teal-700 rounded-full"
                >
                  {skill}
                </span>
              ))}
              {parsedResume.skills.length > 5 && (
                <span className="px-2 py-0.5 text-xs text-teal-500">
                  +{parsedResume.skills.length - 5} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <label
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative flex flex-col items-center justify-center
          p-6 rounded-xl border-2 border-dashed cursor-pointer
          transition-all duration-200
          ${isDragging
            ? "border-teal-500 bg-teal-50"
            : "border-teal-200 hover:border-teal-400 hover:bg-teal-50/50"
          }
          ${isProcessing ? "pointer-events-none opacity-60" : ""}
        `}
      >
        <input
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileSelect}
          className="sr-only"
          disabled={isProcessing}
        />

        {isProcessing ? (
          <>
            <Spinner className="w-8 h-8 text-teal-600 mb-3" />
            <p className="text-sm font-medium text-teal-700">Analyzing resume...</p>
            <p className="text-xs text-teal-600 mt-1">Extracting skills and experience</p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center mb-3">
              <UploadIcon className="w-6 h-6 text-teal-600" />
            </div>
            <p className="text-sm font-medium text-teal-800 mb-1">
              Upload your resume
            </p>
            <p className="text-xs text-teal-600">
              Drag and drop or click to select (PDF only)
            </p>
          </>
        )}
      </label>

      {error && (
        <p className="mt-2 text-sm text-red-600 text-center">{error}</p>
      )}

      <p className="mt-3 text-xs text-teal-500 text-center">
        Optional - helps the AI ask personalized questions
      </p>
    </div>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
