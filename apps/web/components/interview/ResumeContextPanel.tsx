"use client";

import { ParsedResumeContext } from "@/lib/types/interview";

interface ResumeContextPanelProps {
  resumeContext: ParsedResumeContext | null;
}

export function ResumeContextPanel({ resumeContext }: ResumeContextPanelProps) {
  if (!resumeContext) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <DocumentIcon className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-sm font-medium text-gray-600 mb-1">
          No Resume Uploaded
        </h3>
        <p className="text-xs text-gray-400">
          Upload a resume before starting to personalize the interview
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
      {/* Header with contact info */}
      {resumeContext.contact && (
        <div className="px-4 py-4 border-b border-teal-100 bg-teal-50/30">
          {resumeContext.contact.name && (
            <h3 className="font-medium text-teal-900 mb-1">
              {resumeContext.contact.name}
            </h3>
          )}
          <div className="flex flex-wrap gap-2 text-xs text-teal-600">
            {resumeContext.contact.email && (
              <span className="flex items-center gap-1">
                <EmailIcon className="w-3 h-3" />
                {resumeContext.contact.email}
              </span>
            )}
            {resumeContext.contact.location && (
              <span className="flex items-center gap-1">
                <LocationIcon className="w-3 h-3" />
                {resumeContext.contact.location}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 p-4 space-y-4">
        {/* Summary */}
        {resumeContext.summary && (
          <Section title="Summary">
            <p className="text-sm text-teal-700 leading-relaxed">
              {resumeContext.summary}
            </p>
          </Section>
        )}

        {/* Skills */}
        {resumeContext.skills && resumeContext.skills.length > 0 && (
          <Section title="Skills">
            <div className="flex flex-wrap gap-1.5">
              {resumeContext.skills.map((skill, index) => (
                <span
                  key={index}
                  className="px-2 py-1 text-xs bg-teal-100 text-teal-700 rounded-md"
                >
                  {skill}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Experience */}
        {resumeContext.experiences && resumeContext.experiences.length > 0 && (
          <Section title="Experience">
            <div className="space-y-3">
              {resumeContext.experiences.slice(0, 3).map((exp, index) => (
                <div key={index} className="border-l-2 border-teal-200 pl-3">
                  <p className="text-sm font-medium text-teal-800">
                    {exp.title}
                  </p>
                  <p className="text-xs text-teal-600">{exp.company}</p>
                  {exp.start_date && (
                    <p className="text-xs text-teal-400 mt-0.5">
                      {exp.start_date} - {exp.end_date || "Present"}
                    </p>
                  )}
                </div>
              ))}
              {resumeContext.experiences.length > 3 && (
                <p className="text-xs text-teal-400 italic">
                  +{resumeContext.experiences.length - 3} more positions
                </p>
              )}
            </div>
          </Section>
        )}

        {/* Education */}
        {resumeContext.education && resumeContext.education.length > 0 && (
          <Section title="Education">
            <div className="space-y-2">
              {resumeContext.education.map((edu, index) => (
                <div key={index}>
                  <p className="text-sm font-medium text-teal-800">
                    {edu.institution}
                  </p>
                  {edu.degree && (
                    <p className="text-xs text-teal-600">
                      {edu.degree}{edu.field ? ` in ${edu.field}` : ""}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Certifications */}
        {resumeContext.certifications && resumeContext.certifications.length > 0 && (
          <Section title="Certifications">
            <ul className="space-y-1">
              {resumeContext.certifications.map((cert, index) => (
                <li key={index} className="text-sm text-teal-700 flex items-start gap-2">
                  <span className="text-teal-400 mt-1">•</span>
                  {cert}
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="text-xs font-medium text-teal-500 uppercase tracking-wide mb-2">
        {title}
      </h4>
      {children}
    </div>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
}

function EmailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
      />
    </svg>
  );
}

function LocationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
      />
    </svg>
  );
}
