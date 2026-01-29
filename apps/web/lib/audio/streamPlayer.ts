/**
 * Streaming Audio Player for gapless chunk playback
 *
 * Handles real-time audio streaming from the server by queuing
 * and playing audio chunks in sequence without gaps.
 */

import { base64ToBlob } from "./encode";

const MAX_QUEUE_SIZE = 100;

export interface StreamingAudioPlayerOptions {
  /** Called when playback starts */
  onPlaybackStart?: () => void;
  /** Called when all chunks have finished playing */
  onPlaybackEnd?: () => void;
  /** Called on playback error */
  onError?: (error: Error) => void;
  /** Called when a chunk starts playing */
  onChunkStart?: (sequence: number) => void;
  /** Called when a chunk finishes playing */
  onChunkEnd?: (sequence: number) => void;
}

interface QueuedChunk {
  audioBuffer: AudioBuffer;
  sequence: number;
  isFinal: boolean;
}

export class StreamingAudioPlayer {
  private audioContext: AudioContext | null = null;
  private chunkQueue: QueuedChunk[] = [];
  private isPlaying = false;
  private currentSource: AudioBufferSourceNode | null = null;
  private nextPlayTime = 0;
  private options: StreamingAudioPlayerOptions;
  private isStopped = false;
  private hasReceivedFinal = false;
  private playbackStarted = false;

  constructor(options: StreamingAudioPlayerOptions = {}) {
    this.options = options;
  }

  /**
   * Initialize the audio context (must be called after user interaction)
   */
  private ensureAudioContext(): AudioContext {
    if (!this.audioContext || this.audioContext.state === "closed") {
      this.audioContext = new AudioContext();
    }

    // Resume if suspended (happens after page becomes visible again)
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }

    return this.audioContext;
  }

  /**
   * Add an audio chunk to the playback queue
   *
   * @param base64Audio - Base64 encoded audio data
   * @param isFinal - Whether this is the final chunk
   * @param sequence - Sequence number for ordering
   * @param format - Audio format (default: mp3)
   */
  async addChunk(
    base64Audio: string,
    isFinal: boolean,
    sequence: number = 0,
    format: string = "mp3"
  ): Promise<void> {
    if (this.isStopped) {
      return;
    }

    // Handle final marker with empty data
    if (isFinal && !base64Audio) {
      this.hasReceivedFinal = true;
      this.checkPlaybackComplete();
      return;
    }

    try {
      const context = this.ensureAudioContext();

      // Decode audio data
      const mimeType = format === "mp3" ? "audio/mpeg" : `audio/${format}`;
      const blob = base64ToBlob(base64Audio, mimeType);
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await context.decodeAudioData(arrayBuffer);

      // Add to queue in sequence order
      const chunk: QueuedChunk = {
        audioBuffer,
        sequence,
        isFinal,
      };

      // Insert in sorted order by sequence
      let inserted = false;
      for (let i = 0; i < this.chunkQueue.length; i++) {
        if (this.chunkQueue[i].sequence > sequence) {
          this.chunkQueue.splice(i, 0, chunk);
          inserted = true;
          break;
        }
      }
      if (!inserted) {
        this.chunkQueue.push(chunk);
      }

      if (isFinal) {
        this.hasReceivedFinal = true;
      }

      // Cap queue size to prevent unbounded memory growth
      if (this.chunkQueue.length > MAX_QUEUE_SIZE) {
        console.warn(
          `StreamingAudioPlayer: queue exceeded ${MAX_QUEUE_SIZE} chunks, trimming to latest ${MAX_QUEUE_SIZE}`
        );
        this.chunkQueue = this.chunkQueue.slice(-MAX_QUEUE_SIZE);
      }

      // Start playback if not already playing
      if (!this.isPlaying) {
        this.startPlayback();
      }
    } catch (error) {
      console.error("Failed to decode audio chunk:", error);
      this.options.onError?.(error as Error);
    }
  }

  /**
   * Start playing queued chunks
   */
  private startPlayback(): void {
    if (this.isPlaying || this.isStopped || this.chunkQueue.length === 0) {
      return;
    }

    this.isPlaying = true;

    if (!this.playbackStarted) {
      this.playbackStarted = true;
      this.options.onPlaybackStart?.();
    }

    const context = this.ensureAudioContext();
    this.nextPlayTime = context.currentTime;

    this.scheduleNextChunk();
  }

  /**
   * Schedule the next chunk for playback
   */
  private scheduleNextChunk(): void {
    if (this.isStopped || this.chunkQueue.length === 0) {
      this.isPlaying = false;
      this.checkPlaybackComplete();
      return;
    }

    const chunk = this.chunkQueue.shift()!;
    const context = this.ensureAudioContext();

    const source = context.createBufferSource();
    source.buffer = chunk.audioBuffer;
    source.connect(context.destination);

    // Schedule to play at the next available time
    const startTime = Math.max(this.nextPlayTime, context.currentTime);
    source.start(startTime);

    this.currentSource = source;
    this.options.onChunkStart?.(chunk.sequence);

    // Update next play time for seamless playback
    this.nextPlayTime = startTime + chunk.audioBuffer.duration;

    // Schedule next chunk when this one ends
    source.onended = () => {
      this.options.onChunkEnd?.(chunk.sequence);
      this.currentSource = null;

      if (!this.isStopped) {
        this.scheduleNextChunk();
      }
    };
  }

  /**
   * Check if playback is complete and fire callback
   */
  private checkPlaybackComplete(): void {
    if (
      !this.isPlaying &&
      this.chunkQueue.length === 0 &&
      this.hasReceivedFinal &&
      this.playbackStarted
    ) {
      this.options.onPlaybackEnd?.();
      this.reset();
    }
  }

  /**
   * Stop playback and clear the queue
   */
  stop(): void {
    this.isStopped = true;

    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch {
        // Ignore errors from stopping already stopped source
      }
      this.currentSource = null;
    }

    this.chunkQueue = [];
    this.isPlaying = false;

    // Don't close the context, just reset state
    this.reset();
  }

  /**
   * Reset the player state for a new streaming session
   */
  reset(): void {
    this.isStopped = false;
    this.hasReceivedFinal = false;
    this.playbackStarted = false;
    this.chunkQueue = [];
    this.isPlaying = false;
    this.nextPlayTime = 0;
  }

  /**
   * Get current playback state
   */
  get state(): "idle" | "playing" | "stopped" {
    if (this.isStopped) return "stopped";
    if (this.isPlaying) return "playing";
    return "idle";
  }

  /**
   * Get number of chunks in queue
   */
  get queueLength(): number {
    return this.chunkQueue.length;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stop();
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

/**
 * Create a new streaming audio player instance
 */
export function createStreamingAudioPlayer(
  options: StreamingAudioPlayerOptions = {}
): StreamingAudioPlayer {
  return new StreamingAudioPlayer(options);
}
