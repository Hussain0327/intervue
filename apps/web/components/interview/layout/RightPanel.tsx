"use client";

import { ReactNode } from "react";
import { TabContainer } from "../TabContainer";
import { Transcript, TranscriptEntry } from "../Transcript";
import { NotesPanel } from "../NotesPanel";
import { RubricPanel } from "../RubricPanel";
import { ResumeContextPanel } from "../ResumeContextPanel";
import { InterviewTab, ParsedResumeContext } from "@/lib/types/interview";

interface RightPanelProps {
  activeTab: InterviewTab;
  onTabChange: (tab: InterviewTab) => void;
  transcriptEntries: TranscriptEntry[];
  isProcessing: boolean;
  notes: string;
  onNotesChange: (notes: string) => void;
  onAddHighlight: (text: string) => void;
  roundType: "behavioral" | "coding" | "system_design";
  resumeContext: ParsedResumeContext | null;
  evaluationScore?: number | null;
}

export function RightPanel({
  activeTab,
  onTabChange,
  transcriptEntries,
  isProcessing,
  notes,
  onNotesChange,
  onAddHighlight,
  roundType,
  resumeContext,
  evaluationScore,
}: RightPanelProps) {
  const renderTabContent = () => {
    switch (activeTab) {
      case "transcript":
        return (
          <Transcript entries={transcriptEntries} isProcessing={isProcessing} />
        );
      case "notes":
        return (
          <NotesPanel
            notes={notes}
            onNotesChange={onNotesChange}
            onAddHighlight={onAddHighlight}
          />
        );
      case "rubric":
        return (
          <RubricPanel roundType={roundType} score={evaluationScore} />
        );
      case "resume":
        return <ResumeContextPanel resumeContext={resumeContext} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <TabContainer activeTab={activeTab} onTabChange={onTabChange} />
      <div className="flex-1 overflow-hidden">{renderTabContent()}</div>
    </div>
  );
}
