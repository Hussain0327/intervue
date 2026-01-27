"use client";

import { CodingProblem } from "@/lib/types/coding";

interface ProblemPanelProps {
  problem: CodingProblem | null;
  isLoading?: boolean;
}

export function ProblemPanel({ problem, isLoading }: ProblemPanelProps) {
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-white rounded-xl border border-gray-200 p-6">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Loading problem...</p>
        </div>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="h-full flex items-center justify-center bg-white rounded-xl border border-gray-200 p-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <CodeIcon className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-600">Waiting for problem...</p>
          <p className="text-sm text-gray-400 mt-1">
            The interviewer will provide you with a coding challenge.
          </p>
        </div>
      </div>
    );
  }

  const difficultyColors = {
    easy: "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-700",
    hard: "bg-red-100 text-red-700",
  };

  return (
    <div className="h-full overflow-y-auto bg-white rounded-xl border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-900">{problem.title}</h2>
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${
              difficultyColors[problem.difficulty]
            }`}
          >
            {problem.difficulty}
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {problem.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Description */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
          <div className="text-sm text-gray-600 whitespace-pre-wrap">
            {problem.description}
          </div>
        </div>

        {/* Examples */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Examples</h3>
          <div className="space-y-3">
            {problem.examples.map((example, index) => (
              <div
                key={index}
                className="bg-gray-50 rounded-lg p-3 text-sm font-mono"
              >
                <div className="mb-1">
                  <span className="text-gray-500">Input: </span>
                  <span className="text-gray-800">{example.input}</span>
                </div>
                <div className="mb-1">
                  <span className="text-gray-500">Output: </span>
                  <span className="text-gray-800">{example.output}</span>
                </div>
                {example.explanation && (
                  <div className="mt-2 text-gray-600 font-sans text-xs">
                    <strong>Explanation:</strong> {example.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Constraints */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Constraints</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            {problem.constraints.map((constraint, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-gray-400">•</span>
                <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                  {constraint}
                </code>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function CodeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
      />
    </svg>
  );
}
