"use client";

import { useState, useCallback } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useVoiceAssistant,
  BarVisualizer,
  DisconnectButton,
} from "@livekit/components-react";
import { Mic, PhoneOff, Loader } from "lucide-react";
import api from "@/lib/api";

interface VoiceChatProps {
  sessionId: string | null;
  onSessionId: (id: string) => void;
  onDisconnect: () => void;
}

function VoiceAssistantUI() {
  const { state, audioTrack } = useVoiceAssistant();

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="h-20 w-full max-w-xs">
        {audioTrack && (
          <BarVisualizer
            state={state}
            barCount={5}
            trackRef={audioTrack}
            className="h-full w-full"
          />
        )}
        {!audioTrack && (
          <div className="flex h-full items-center justify-center">
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-2 rounded-full bg-zinc-300 dark:bg-zinc-600"
                  style={{
                    height: `${20 + Math.random() * 40}%`,
                    animation: `pulse 1.5s ease-in-out ${i * 0.15}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400 capitalize">
        {state === "listening" && "Listening..."}
        {state === "thinking" && "Thinking..."}
        {state === "speaking" && "Speaking..."}
        {state === "idle" && "Ready"}
        {state === "connecting" && "Connecting..."}
      </p>
    </div>
  );
}

export default function VoiceChat({ sessionId, onSessionId, onDisconnect }: VoiceChatProps) {
  const [token, setToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);

    try {
      const res = await api.post("/livekit/token", {
        session_id: sessionId,
      });
      setToken(res.data.token);
      setLivekitUrl(res.data.url);
      onSessionId(res.data.session_id);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to connect to voice service";
      setError(message);
    } finally {
      setConnecting(false);
    }
  }, [sessionId, onSessionId]);

  const handleDisconnect = useCallback(() => {
    setToken(null);
    setLivekitUrl(null);
    onDisconnect();
  }, [onDisconnect]);

  // Not connected — show connect button
  if (!token || !livekitUrl) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-full bg-zinc-100 p-4 dark:bg-zinc-800">
            <Mic size={28} className="text-zinc-500" />
          </div>
          <div className="text-center">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Voice Assistant
            </h3>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Talk to Revio using your microphone
            </p>
          </div>

          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}

          <button
            onClick={connect}
            disabled={connecting}
            className="flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {connecting ? (
              <>
                <Loader size={16} className="animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Mic size={16} />
                Start Voice Chat
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Connected — show LiveKit room
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <LiveKitRoom
        serverUrl={livekitUrl}
        token={token}
        connect={true}
        audio={true}
        video={false}
        onDisconnected={handleDisconnect}
        className="flex flex-col items-center gap-4"
      >
        <RoomAudioRenderer />
        <VoiceAssistantUI />

        <div className="flex items-center gap-3">
          <DisconnectButton className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700">
            <PhoneOff size={14} />
            End Call
          </DisconnectButton>
        </div>
      </LiveKitRoom>
    </div>
  );
}
