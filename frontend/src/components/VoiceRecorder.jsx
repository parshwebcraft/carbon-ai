/**
 * VoiceRecorder — Real-time browser mic capture component
 *
 * Uses MediaRecorder API to stream audio to the backend Voice AI WebSocket.
 * Receives live transcript chunks and AI suggestions back.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Mic,
  Square,
  Loader2,
  Waves,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { API_BASE } from "@/lib/api";

// Derive WebSocket base from the HTTP API base
// API_BASE = "http://localhost:8000/api"  →  WS_BASE = "ws://localhost:8000"
const WS_BASE = API_BASE
  .replace(/\/api\/?$/, "")   // remove trailing /api
  .replace(/^https/, "wss")   // https → wss
  .replace(/^http/, "ws");    // http  → ws

const CHUNK_INTERVAL_MS = 500;
const TOKEN_KEY = "facets_token"; // must match what Login.jsx uses

export default function VoiceRecorder({
  leadId,
  onTranscript,
  onSuggestion,
  onSaved,
  disabled = false,
}) {
  const [state, setState] = useState("idle");
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState("");

  const wsRef = useRef(null);
  const mediaRecRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const durationRef = useRef(0);

  const stopAll = useCallback(() => {
    clearInterval(timerRef.current);

    if (
      mediaRecRef.current &&
      mediaRecRef.current.state !== "inactive"
    ) {
      try {
        mediaRecRef.current.stop();
      } catch (_) {}
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "stop" }));
        }
      } catch (_) {}

      setTimeout(() => {
        try {
          wsRef.current?.close();
        } catch (_) {}

        wsRef.current = null;
      }, 500);
    }

    setState("idle");
  }, []);

  useEffect(() => {
    return () => {
      stopAll();
    };
  }, [stopAll]);

  async function startRecording() {
    setError("");
    setState("requesting");

    const token = localStorage.getItem("facets_token");

    if (!token) {
      setError("Please log in again.");
      setState("error");
      return;
    }

    let stream;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 48000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
    } catch (e) {
      setError("Microphone access denied. Please allow microphone access.");
      setState("error");
      return;
    }

    streamRef.current = stream;

    const wsUrl =
      `${WS_BASE}/api/voice-ai/ws/${leadId}?token=${encodeURIComponent(token)}`;

    const ws = new WebSocket(wsUrl);

    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Voice WS connected:", wsUrl);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case "ready":
            startMediaRecorder(stream, ws);
            setState("recording");
            startTimer();
            break;

          case "transcript":
            if (msg.text && onTranscript) {
              onTranscript(msg.text, msg.is_final, msg.speaker);
            }
            break;

          case "suggestion":
            if (msg.data && onSuggestion) {
              onSuggestion(msg.data);
            }
            break;

          case "session_saved":
            clearInterval(timerRef.current);

            setState("idle");
            setDuration(0);
            durationRef.current = 0;

            if (onSaved && msg.call_id) {
              onSaved(msg.call_id);
            }

            toast.success(
              `Session saved — ${
                msg.transcript_lines || 0
              } utterances recorded`
            );

            break;

          case "error":
            setError(msg.message || "Unknown error");
            setState("error");
            break;

          default:
            break;
        }
      } catch (err) {
        console.error("Voice WS message error:", err);
      }
    };

    ws.onerror = (err) => {
      console.error("Voice WS error:", err);

      setError("WebSocket connection failed");
      setState("error");

      stopAll();
    };

    ws.onclose = () => {
      clearInterval(timerRef.current);

      if (state === "recording") {
        setState("idle");
      }
    };
  }

  function startMediaRecorder(stream, ws) {
    const mimeType = MediaRecorder.isTypeSupported(
      "audio/webm;codecs=opus"
    )
      ? "audio/webm;codecs=opus"
      : "audio/webm";

    const recorder = new MediaRecorder(stream, {
      mimeType,
      audioBitsPerSecond: 128000,
    });

    mediaRecRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (
        event.data &&
        event.data.size > 0 &&
        ws.readyState === WebSocket.OPEN
      ) {
        ws.send(event.data);
      }
    };

    recorder.onerror = (e) => {
      setError(`Recorder error: ${e.error?.name || "unknown"}`);
      setState("error");
    };

    recorder.start(CHUNK_INTERVAL_MS);
  }

  function startTimer() {
    durationRef.current = 0;

    timerRef.current = setInterval(() => {
      durationRef.current += 1;
      setDuration(durationRef.current);
    }, 1000);
  }

  function stopRecording() {
    setState("stopping");

    clearInterval(timerRef.current);

    if (
      mediaRecRef.current &&
      mediaRecRef.current.state !== "inactive"
    ) {
      mediaRecRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (
      wsRef.current &&
      wsRef.current.readyState === WebSocket.OPEN
    ) {
      wsRef.current.send(JSON.stringify({ type: "stop" }));
    } else {
      setState("idle");
    }
  }

  function formatDuration(secs) {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");

    const s = (secs % 60)
      .toString()
      .padStart(2, "0");

    return `${m}:${s}`;
  }

  return (
    <div className="flex items-center gap-3">
      {state === "idle" && (
        <Button
          size="sm"
          variant="outline"
          className="border-rose-300 text-rose-600 hover:bg-rose-50 gap-2"
          onClick={startRecording}
          disabled={disabled || !leadId}
          data-testid="voice-record-btn"
        >
          <Mic className="h-3.5 w-3.5" />
          Record
        </Button>
      )}

      {state === "requesting" && (
        <Button
          size="sm"
          variant="outline"
          disabled
          className="gap-2 text-slate-500"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Connecting…
        </Button>
      )}

      {state === "recording" && (
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            <div className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
            <div className="absolute h-4 w-4 rounded-full border-2 border-rose-400 animate-ping opacity-40" />
          </div>

          <Waves className="h-4 w-4 text-rose-500" />

          <span className="text-xs font-mono text-rose-600 font-bold">
            {formatDuration(duration)}
          </span>

          <Button
            size="sm"
            className="bg-rose-600 hover:bg-rose-700 gap-1.5 h-8 text-xs"
            onClick={stopRecording}
            data-testid="voice-stop-btn"
          >
            <Square className="h-3 w-3" />
            Stop & Analyse
          </Button>
        </div>
      )}

      {state === "stopping" && (
        <Button
          size="sm"
          variant="outline"
          disabled
          className="gap-2 text-slate-500"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Saving…
        </Button>
      )}

      {state === "error" && (
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />

          <span className="text-xs text-rose-600">
            {error}
          </span>

          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-slate-500"
            onClick={() => {
              setState("idle");
              setError("");
            }}
          >
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}