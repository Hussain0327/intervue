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
}

export type PlaybackState = "idle" | "playing" | "paused";

export function Player({
  audioBase64,
  format = "mp3",
  autoPlay = true,
  onPlaybackStart,
  onPlaybackEnd,
  onError,
}: PlayerProps) {
  const [playbackState, setPlaybackState] = useState<PlaybackState>("idle");
  const [progress, setProgress] = useState(0);
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
      return;
    }

    // Clean up previous
    cleanupUrl();

    // Create new audio URL
    const url = createAudioUrl(audioBase64, format);
    urlRef.current = url;

    // Create and configure audio element
    const audio = new Audio(url);
    audioRef.current = audio;

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
      onPlaybackEnd?.();
    };

    audio.onerror = () => {
      setPlaybackState("idle");
      onError?.("Failed to play audio");
    };

    audio.ontimeupdate = () => {
      if (audio.duration > 0) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    // Auto-play if enabled
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

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg">
      <button
        type="button"
        onClick={handlePlayPause}
        className="w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center transition-colors"
      >
        {playbackState === "playing" ? (
          <PauseIcon className="w-5 h-5 text-white" />
        ) : (
          <PlayIcon className="w-5 h-5 text-white ml-0.5" />
        )}
      </button>

      <div className="flex-1">
        <div className="h-2 bg-gray-300 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {playbackState === "playing" && (
        <SpeakerIcon className="w-5 h-5 text-blue-500 animate-pulse" />
      )}
    </div>
  );
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
