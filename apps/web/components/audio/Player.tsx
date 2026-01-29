"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createAudioUrl, revokeAudioUrl } from "@/lib/audio/encode";

export interface PlayerProps {
  audioBase64: string | null;
  format?: string;
  autoPlay?: boolean;
  onPlaybackStart?: () => void;
  onPlaybackEnd?: () => void;
  onError?: (error: string) => void;
  variant?: "default" | "compact";
}

export type PlaybackState = "idle" | "playing" | "paused";

export function Player({
  audioBase64,
  format = "mp3",
  autoPlay = true,
  onPlaybackStart,
  onPlaybackEnd,
  onError,
  variant = "default",
}: PlayerProps) {
  const [playbackState, setPlaybackState] = useState<PlaybackState>("idle");
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  // Clean up previous audio URL
  const cleanupUrl = useCallback(() => {
    if (urlRef.current) {
      revokeAudioUrl(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  // Handle new audio data
  useEffect(() => {
    if (!audioBase64) {
      cleanupUrl();
      setPlaybackState("idle");
      setProgress(0);
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    cleanupUrl();

    const url = createAudioUrl(audioBase64, format);
    urlRef.current = url;

    const audio = new Audio(url);
    audioRef.current = audio;

    audio.onloadedmetadata = () => {
      setDuration(audio.duration);
    };

    audio.onplay = () => {
      setPlaybackState("playing");
      onPlaybackStart?.();
    };

    audio.onpause = () => {
      setPlaybackState("paused");
    };

    audio.onended = () => {
      setPlaybackState("idle");
      setProgress(0);
      setCurrentTime(0);
      onPlaybackEnd?.();
    };

    audio.onerror = () => {
      setPlaybackState("idle");
      onError?.("Failed to play audio");
    };

    audio.ontimeupdate = () => {
      if (audio.duration > 0) {
        setProgress((audio.currentTime / audio.duration) * 100);
        setCurrentTime(audio.currentTime);
      }
    };

    if (autoPlay) {
      audio.play().catch((err) => {
        console.error("Auto-play failed:", err);
        onError?.("Auto-play blocked. Click to play.");
      });
    }

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [audioBase64, format, autoPlay, cleanupUrl, onPlaybackStart, onPlaybackEnd, onError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupUrl();
    };
  }, [cleanupUrl]);

  const handlePlayPause = useCallback(() => {
    if (!audioRef.current) return;

    if (playbackState === "playing") {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  }, [playbackState]);

  if (!audioBase64) {
    return null;
  }

  // Compact variant for coding challenge layout
  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-teal-50 rounded-lg border border-teal-200">
        <button
          type="button"
          onClick={handlePlayPause}
          aria-label={playbackState === "playing" ? "Pause audio playback" : "Play audio"}
          className="w-8 h-8 rounded-full bg-teal-600 hover:bg-teal-700 flex items-center justify-center transition-colors"
        >
          {playbackState === "playing" ? (
            <PauseIcon className="w-3 h-3 text-white" />
          ) : (
            <PlayIcon className="w-3 h-3 text-white ml-0.5" />
          )}
        </button>
        <div className="flex items-center gap-1">
          {playbackState === "playing" && (
            <SpeakerIcon className="w-4 h-4 text-teal-500 animate-pulse" />
          )}
          <span className="text-xs font-mono text-teal-600">
            {formatTime(currentTime)}/{formatTime(duration)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-full px-4 py-3 flex items-center gap-4 shadow-sm border border-teal-200/50">
      {/* Play/Pause button */}
      <button
        type="button"
        onClick={handlePlayPause}
        aria-label={playbackState === "playing" ? "Pause audio playback" : "Play audio"}
        className="w-10 h-10 rounded-full bg-teal-700 hover:bg-teal-600 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-md"
      >
        {playbackState === "playing" ? (
          <PauseIcon className="w-4 h-4 text-white" />
        ) : (
          <PlayIcon className="w-4 h-4 text-white ml-0.5" />
        )}
      </button>

      {/* Waveform visualization */}
      <div className="flex-1 flex items-center gap-0.5 h-8 px-2">
        {Array.from({ length: 30 }).map((_, i) => {
          const barProgress = (i / 30) * 100;
          const isActive = barProgress <= progress;
          const heights = [40, 70, 55, 85, 45, 75, 50, 90, 60, 80, 45, 70, 55, 85, 65, 75, 50, 80, 60, 70, 45, 85, 55, 75, 65, 80, 50, 70, 60, 45];

          return (
            <div
              key={i}
              className={`
                w-1 rounded-full transition-all duration-150
                ${isActive ? "bg-teal-600" : "bg-teal-200"}
                ${playbackState === "playing" && isActive ? "animate-waveform-bar" : ""}
              `}
              style={{
                height: `${heights[i % heights.length]}%`,
                animationDelay: playbackState === "playing" ? `${i * 0.05}s` : "0s",
              }}
            />
          );
        })}
      </div>

      {/* Time display */}
      <div className="flex items-center gap-2 font-mono text-xs text-teal-600">
        <span>{formatTime(currentTime)}</span>
        <span className="text-teal-300">/</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Speaker indicator */}
      {playbackState === "playing" && (
        <div className="flex items-center">
          <SpeakerIcon className="w-5 h-5 text-cyan-500 animate-pulse" />
        </div>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
    </svg>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z" />
    </svg>
  );
}

function SpeakerIcon({ className }: { className?: string }) {
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
        d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
      />
    </svg>
  );
}
