/**
 * VoiceRecorder — Real-time browser mic capture component
 *
 * Uses MediaRecorder API to stream audio to the backend Voice AI WebSocket.
 * Receives live transcript chunks and AI suggestions back.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2, Waves, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { API_BASE } from "@/lib/api";

// Derive WebSocket base from the HTTP API base
// API_BASE = "http://localhost:8000/api"  →  WS_BASE = "ws://localhost:8000"
const WS_BASE = API_BASE
  .replace(/\/api\/?$/, "")   // remove trailing /api
  .replace(/^https/, "wss")   // https → wss
  .replace(/^http/, "ws");    // http  → ws

const CHUNK_INTERVAL_MS = 500;
const TOKEN_KEY = "facets_token";
const READY_TIMEOUT_MS = 12000; // 12 s — if "ready" never arrives, show error

export default function VoiceRecorder({
  leadId,
  onTranscript,
  onSuggestion,
  onSaved,
  disabled = false,
}) {
  const [state, setState] = useState("idle"); // idle | requesting | recording | stopping | error
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState("");

  const wsRef = useRef(null);
  const mediaRecRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const readyTimeoutRef = useRef(null);
  const durationRef = useRef(0);
  // Track state in a ref so onclose/onerror callbacks see latest value
  const stateRef = useRef("idle");

  function setStateBoth(s) {
    stateRef.current = s;
    setState(s);
  }

  const stopAll = useCallback((reason) => {
    clearInterval(timerRef.current);
    clearTimeout(readyTimeoutRef.current);

    if (mediaRecRef.current && mediaRecRef.current.state !== "inactive") {
      try { mediaRecRef.current.stop(); } catch (_) {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (wsRef.current) {
      const ws = wsRef.current;
      wsRef.current = null;
      // Remove handlers to prevent double-trigger
      ws.onclose = null;
      ws.onerror = null;
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "stop" }));
        }
        ws.close();
      } catch (_) {}
    }
  }, []);

  useEffect(() => {
    return () => stopAll("unmount");
  }, [stopAll]);

  async function startRecording() {
    setError("");
    setStateBoth("requesting");

    // Auth token check
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setError("Session expired — please log in again.");
      setStateBoth("error");
      return;
    }

    // Microphone permission check
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Microphone access requires a secure connection (HTTPS or localhost). Please check your browser's address bar.");
      setStateBoth("error");
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
      console.warn("[VoiceRecorder] High-quality mic constraints failed, trying basic audio fallback:", e);
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
      } catch (fallbackError) {
        setError(
          fallbackError.name === "NotAllowedError"
            ? "Microphone access denied. Click the 🔒 icon in the address bar to allow."
            : `Mic error: ${fallbackError.message}`
        );
        setStateBoth("error");
        return;
      }
    }
    streamRef.current = stream;

    // Build WebSocket URL
    const wsUrl = `${WS_BASE}/api/voice-ai/ws/${leadId}?token=${encodeURIComponent(token)}`;
    let ws;
    try {
      ws = new WebSocket(wsUrl);
    } catch (e) {
      setError(`Cannot connect: ${e.message}`);
      setStateBoth("error");
      stream.getTracks().forEach(t => t.stop());
      return;
    }
    wsRef.current = ws;

    // ── Timeout: if "ready" never arrives in 12 s ──────────────────────────
    readyTimeoutRef.current = setTimeout(() => {
      if (stateRef.current === "requesting") {
        setError("Backend did not respond. Check Render logs — JWT_SECRET or DB may be missing.");
        setStateBoth("error");
        stopAll("timeout");
      }
    }, READY_TIMEOUT_MS);

    // ── WebSocket event handlers ────────────────────────────────────────────
    ws.onopen = () => {
      console.log("[VoiceRecorder] WS open →", wsUrl.split("?")[0]);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case "ready":
            clearTimeout(readyTimeoutRef.current);
            startMediaRecorder(stream, ws);
            setStateBoth("recording");
            startTimer();
            // If Deepgram not configured, tell the user
            if (msg.deepgram === false) {
              toast("🎙️ Recording started — Deepgram not configured, add DEEPGRAM_API_KEY for live STT", {
                duration: 6000,
              });
            }
            break;

          case "transcript":
            if (msg.text && onTranscript) {
              onTranscript(msg.raw_text || msg.text, msg.is_final, msg.speaker);
            }
            break;

          case "suggestion":
            if (msg.data && onSuggestion) {
              onSuggestion(msg.data);
            }
            break;

          case "session_saved":
            clearInterval(timerRef.current);
            setStateBoth("idle");
            setDuration(0);
            durationRef.current = 0;
            if (onSaved && msg.call_id) {
              onSaved(msg.call_id);
            }
            toast.success(`Session saved — ${msg.transcript_lines || 0} utterances recorded`);
            break;

          case "error":
            clearTimeout(readyTimeoutRef.current);
            setError(msg.message || "Backend error");
            setStateBoth("error");
            stopAll("server error");
            break;

          case "pong":
            break;

          default:
            break;
        }
      } catch (err) {
        console.error("[VoiceRecorder] message parse error:", err);
      }
    };

    ws.onerror = () => {
      // onerror always followed by onclose — handle state in onclose
      console.error("[VoiceRecorder] WS error");
    };

    ws.onclose = (event) => {
      clearTimeout(readyTimeoutRef.current);
      clearInterval(timerRef.current);
      // Always reset state when socket closes unexpectedly
      if (stateRef.current === "requesting") {
        setError(
          event.code === 4001
            ? "Auth failed — please log in again"
            : event.code === 4004
            ? "Lead not found on server"
            : `Connection closed (code ${event.code})`
        );
        setStateBoth("error");
      } else if (stateRef.current === "recording" || stateRef.current === "stopping") {
        setStateBoth("idle");
      }
    };
  }

  function startMediaRecorder(stream, ws) {
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";

    const recorder = new MediaRecorder(stream, {
      mimeType,
      audioBitsPerSecond: 128000,
    });
    mediaRecRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data?.size > 0 && ws.readyState === WebSocket.OPEN) {
        ws.send(event.data);
      }
    };

    recorder.onerror = (e) => {
      setError(`Recorder error: ${e.error?.name || "unknown"}`);
      setStateBoth("error");
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

  async function stopRecording() {
    setStateBoth("stopping");
    clearInterval(timerRef.current);

    if (mediaRecRef.current && mediaRecRef.current.state !== "inactive") {
      mediaRecRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "stop" }));
    } else {
      setStateBoth("idle");
    }
  }

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

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
        <div className="flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" />
          <span className="text-xs text-slate-500">Connecting…</span>
          <button
            onClick={() => { stopAll("user cancel"); setStateBoth("idle"); }}
            className="text-xs text-slate-400 hover:text-rose-600 underline"
          >
            Cancel
          </button>
        </div>
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
        <div className="flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" />
          <span className="text-xs text-slate-500">Saving session…</span>
        </div>
      )}

      {state === "error" && (
        <div className="flex items-center gap-2 flex-wrap">
          <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
          <span className="text-xs text-rose-600 max-w-xs">{error}</span>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-slate-500 shrink-0"
            onClick={() => { setStateBoth("idle"); setError(""); }}
          >
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}