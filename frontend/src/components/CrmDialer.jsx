import { useState, useRef, useEffect } from "react";
import { Device } from "@twilio/voice-sdk";
import { Phone, PhoneOff, MicOff, Mic, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const WS_BASE = api.defaults.baseURL
  .replace(/\/api\/?$/, "")
  .replace(/^https/, "wss")
  .replace(/^http/, "ws");

const CHUNK_INTERVAL_MS = 500;

export default function CrmDialer() {
  const [device, setDevice] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [callState, setCallState] = useState("idle"); // idle | registering | dialing | active | ended
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [leadInfo, setLeadInfo] = useState(null);

  const twilioCallRef = useRef(null);
  const wsRef = useRef(null);
  const mediaRecRef = useRef(null);
  const localStreamRef = useRef(null);
  const durationIntervalRef = useRef(null);

  useEffect(() => {
    // 1. Fetch Twilio JWT Token and register device
    setCallState("registering");
    api.get("/voice-dialer/token")
      .then((res) => {
        if (!res.data || !res.data.token) {
          throw new Error("Invalid token payload");
        }
        try {
          const dev = new Device(res.data.token, {
            codecPreferences: ["opus", "pcmu"],
            fakeLocalDTMF: true,
            enableIceRestart: true,
          });

          dev.on("registered", () => {
            console.log("[CrmDialer] Twilio WebRTC registered");
            setCallState("idle");
          });

          dev.on("error", (err) => {
            console.error("[CrmDialer] Twilio Device error:", err);
            setCallState("idle");
          });

          dev.register();
          setDevice(dev);
        } catch (e) {
          console.error("[CrmDialer] Failed to initialize Twilio Device:", e);
          setCallState("idle");
        }
      })
      .catch((err) => {
        console.warn("[CrmDialer] Twilio Voice Token missing or config unavailable:", err.message);
        setCallState("idle");
      });

    return () => {
      cleanupCall();
    };
  }, []);

  // Listen for trigger events to initiate a call from anywhere in the CRM
  useEffect(() => {
    const handleTriggerCall = (e) => {
      const { leadId, phone, name } = e.detail;
      if (!phone) {
        toast.error("Lead has no phone number");
        return;
      }
      setLeadInfo({ leadId, phone, name });
      makeCall(phone, leadId);
    };

    window.addEventListener("trigger-crm-call", handleTriggerCall);
    return () => window.removeEventListener("trigger-crm-call", handleTriggerCall);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device]);

  async function makeCall(phone, leadId) {
    if (!device) {
      toast.error("Twilio Dialer not registered. Check API credentials.");
      return;
    }
    setCallState("dialing");
    toast.info(`Dialing ${phone}...`);
    window.activeCrmCall = { leadId, phone, name: leadInfo?.name, state: "dialing", voiceTranscript: [], suggestions: {} };

    try {
      // Get microphone access
      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 48000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      localStreamRef.current = localStream;

      // Place call via Twilio SDK
      const call = await device.connect({ params: { to: phone } });
      twilioCallRef.current = call;
      setActiveCall(call);

      // Handle call connection
      call.on("accept", () => {
        console.log("[CrmDialer] Call accepted");
        setCallState("active");
        if (window.activeCrmCall) {
          window.activeCrmCall.state = "active";
        }
        startDurationTimer();

        // Connect audio streaming to backend
        setupAudioStreaming(leadId, localStream, call);
      });

      call.on("disconnect", () => {
        console.log("[CrmDialer] Call disconnected");
        cleanupCall();
      });

      call.on("reject", () => {
        toast.error("Call rejected");
        cleanupCall();
      });

    } catch (err) {
      console.error("[CrmDialer] Make call failed:", err);
      toast.error(`Call failed: ${err.message}`);
      cleanupCall();
    }
  }

  function setupAudioStreaming(leadId, localStream, call) {
    const token = localStorage.getItem("facets_token");
    const wsUrl = `${WS_BASE}/api/voice-ai/ws/${leadId}?token=${encodeURIComponent(token)}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "transcript") {
          window.dispatchEvent(new CustomEvent("crm-call-transcript", { detail: { ...msg, leadId } }));
          if (window.activeCrmCall) {
            const lines = [...(window.activeCrmCall.voiceTranscript || [])];
            if (lines.length > 0 && !lines[lines.length - 1].isFinal) {
              lines[lines.length - 1] = { text: msg.raw_text || msg.text, isFinal: msg.is_final, speaker: msg.speaker };
            } else {
              lines.push({ text: msg.raw_text || msg.text, isFinal: msg.is_final, speaker: msg.speaker });
            }
            window.activeCrmCall.voiceTranscript = lines.slice(-60);
          }
        } else if (msg.type === "suggestion") {
          window.dispatchEvent(new CustomEvent("crm-call-suggestion", { detail: { data: msg.data, leadId } }));
          if (window.activeCrmCall) {
            window.activeCrmCall.suggestions = msg.data;
          }
        }
      } catch (e) {
        console.error("[CrmDialer] WS message parse error:", e);
      }
    };

    ws.onopen = () => {
      console.log("[CrmDialer] Audio streaming WS connected");
      // Listen for the incoming audio track from Twilio
      call.on("track", (remoteTrack) => {
        console.log("[CrmDialer] Remote audio track received");
        try {
          // Mix local microphone + remote customer track
          const mixedStream = new MediaStream([
            localStream.getAudioTracks()[0],
            remoteTrack
          ]);

          const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
            ? "audio/webm;codecs=opus"
            : "audio/webm";

          const recorder = new MediaRecorder(mixedStream, { mimeType, audioBitsPerSecond: 128000 });
          mediaRecRef.current = recorder;

          recorder.ondataavailable = (e) => {
            if (e.data?.size > 0 && ws.readyState === WebSocket.OPEN) {
              ws.send(e.data);
            }
          };

          recorder.start(CHUNK_INTERVAL_MS);
        } catch (err) {
          console.error("[CrmDialer] WebRTC mixing failed:", err);
        }
      });
    };
  }

  function startDurationTimer() {
    setDuration(0);
    durationIntervalRef.current = setInterval(() => {
      setDuration((d) => d + 1);
    }, 1000);
  }

  function cleanupCall() {
    clearInterval(durationIntervalRef.current);
    if (twilioCallRef.current) {
      twilioCallRef.current.disconnect();
      twilioCallRef.current = null;
    }
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "stop" }));
      }
      wsRef.current.close();
      wsRef.current = null;
    }
    if (mediaRecRef.current && mediaRecRef.current.state !== "inactive") {
      try { mediaRecRef.current.stop(); } catch (_) {}
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setActiveCall(null);
    setCallState("idle");
    setIsMuted(false);
    setLeadInfo(null);
    window.activeCrmCall = null;
  }

  function handleHangup() {
    cleanupCall();
    toast.success("Call ended");
  }

  function toggleMute() {
    if (twilioCallRef.current) {
      const mute = !isMuted;
      twilioCallRef.current.mute(mute);
      setIsMuted(mute);
    }
  }

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  if (callState === "idle" || callState === "registering") return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-4 bg-slate-900 border border-slate-800 text-white px-5 py-3 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
        {callState === "dialing" ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
        )}
      </div>
      <div>
        <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">
          {callState === "dialing" ? "Calling Customer..." : "Active Call"}
        </div>
        <div className="text-sm font-semibold truncate max-w-[150px]">
          {leadInfo?.name || leadInfo?.phone || "Unknown Customer"}
        </div>
        {callState === "active" && (
          <div className="text-xs font-mono text-slate-400 mt-0.5">{formatTime(duration)}</div>
        )}
      </div>

      <div className="flex gap-2 ml-4">
        {callState === "active" && (
          <button
            onClick={toggleMute}
            className={`p-2.5 rounded-full transition ${
              isMuted ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-slate-800 hover:bg-slate-700 text-slate-300"
            }`}
            title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
          >
            {isMuted ? <MicOff className="h-4.5 w-4.5" /> : <Mic className="h-4.5 w-4.5" />}
          </button>
        )}
        <button
          onClick={handleHangup}
          className="p-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white transition"
          title="Hang Up Call"
        >
          <PhoneOff className="h-4.5 w-4.5" />
        </button>
      </div>
    </div>
  );
}
