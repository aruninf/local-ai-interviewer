"use client";

import * as React from "react";
import { KeyRound, Sparkles, Volume2, Mic, Radio, CheckCircle2, AlertCircle, ExternalLink, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

export interface ApiKeysModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

interface KeysState {
  llmProvider: "gemini" | "openai" | "mock";
  sttProvider: "deepgram" | "mock";
  ttsProvider: "cartesia" | "elevenlabs" | "mock";
  hasGeminiKey: boolean;
  geminiKeyPreview: string;
  hasOpenaiKey: boolean;
  openaiKeyPreview: string;
  hasDeepgramKey: boolean;
  deepgramKeyPreview: string;
  hasCartesiaKey: boolean;
  cartesiaKeyPreview: string;
  hasElevenlabsKey: boolean;
  elevenlabsKeyPreview: string;
  livekitUrl: string;
  livekitApiKey: string;
  hasLivekitSecret: boolean;
  isLiveReady: boolean;
}

export function ApiKeysModal({ open, onClose, onSaved }: ApiKeysModalProps) {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const [current, setCurrent] = React.useState<KeysState | null>(null);

  // Form fields
  const [llmChoice, setLlmChoice] = React.useState<"gemini" | "openai">("gemini");
  const [geminiKey, setGeminiKey] = React.useState("");
  const [openaiKey, setOpenaiKey] = React.useState("");

  const [deepgramKey, setDeepgramKey] = React.useState("");

  const [ttsChoice, setTtsChoice] = React.useState<"cartesia" | "elevenlabs">("cartesia");
  const [cartesiaKey, setCartesiaKey] = React.useState("");
  const [elevenlabsKey, setElevenlabsKey] = React.useState("");

  const [livekitMode, setLivekitMode] = React.useState<"local" | "cloud">("local");
  const [cloudLivekitUrl, setCloudLivekitUrl] = React.useState("");
  const [cloudLivekitKey, setCloudLivekitKey] = React.useState("");
  const [cloudLivekitSecret, setCloudLivekitSecret] = React.useState("");

  const fetchKeys = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/keys");
      if (!res.ok) throw new Error("Failed to load keys");
      const data: KeysState = await res.json();
      setCurrent(data);

      if (data.llmProvider === "openai") setLlmChoice("openai");
      else setLlmChoice("gemini");

      if (data.ttsProvider === "elevenlabs") setTtsChoice("elevenlabs");
      else setTtsChoice("cartesia");

      if (data.livekitUrl && !data.livekitUrl.includes("localhost") && !data.livekitUrl.includes("127.0.0.1")) {
        setLivekitMode("cloud");
        setCloudLivekitUrl(data.livekitUrl);
        setCloudLivekitKey(data.livekitApiKey);
      } else {
        setLivekitMode("local");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load API keys status");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (open) {
      fetchKeys();
      setSuccess(null);
    }
  }, [open, fetchKeys]);

  // Handle ESC
  React.useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: Record<string, string> = {
        llmProvider: llmChoice,
        sttProvider: "deepgram",
        ttsProvider: ttsChoice,
      };

      if (llmChoice === "gemini") {
        if (geminiKey) payload.geminiApiKey = geminiKey.trim();
      } else {
        if (openaiKey) payload.openaiApiKey = openaiKey.trim();
      }

      if (deepgramKey) payload.deepgramApiKey = deepgramKey.trim();

      if (ttsChoice === "cartesia") {
        if (cartesiaKey) payload.cartesiaApiKey = cartesiaKey.trim();
      } else {
        if (elevenlabsKey) payload.elevenlabsApiKey = elevenlabsKey.trim();
      }

      if (livekitMode === "local") {
        payload.livekitUrl = "ws://localhost:7880";
        payload.livekitApiKey = "devkey";
        payload.livekitApiSecret = "secret";
      } else {
        if (cloudLivekitUrl) payload.livekitUrl = cloudLivekitUrl.trim();
        if (cloudLivekitKey) payload.livekitApiKey = cloudLivekitKey.trim();
        if (cloudLivekitSecret) payload.livekitApiSecret = cloudLivekitSecret.trim();
      }

      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save keys");
      const data = await res.json();

      setSuccess("Keys saved successfully! Reloading session...");
      await fetchKeys();

      setTimeout(() => {
        if (onSaved) onSaved();
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Failed to save keys");
    } finally {
      setSaving(false);
    }
  }

  async function handleResetToMock() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          llmProvider: "mock",
          sttProvider: "mock",
          ttsProvider: "mock",
          livekitUrl: "",
        }),
      });
      if (!res.ok) throw new Error("Failed to reset to mock mode");
      setSuccess("Switched back to offline mock mode.");
      await fetchKeys();
      setTimeout(() => {
        if (onSaved) onSaved();
        window.location.reload();
      }, 800);
    } catch (err: any) {
      setError(err.message || "Failed to switch mode");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="api-keys-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-[18px] border border-line bg-paper shadow-2xl p-6 text-ink z-10">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h3 id="api-keys-modal-title" className="text-lg font-semibold tracking-tight text-ink">
                Configure API Keys
              </h3>
              <p className="text-xs text-muted">
                Add your own keys to test a real, live voice interview out loud.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-full p-1.5 text-muted hover:bg-panel hover:text-ink transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Current status pill */}
        {current && !loading && (
          <div className="my-4">
            {current.isLiveReady ? (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>
                  <strong>Live Voice Ready:</strong> All required provider keys (LLM, STT, TTS, LiveKit) are configured.
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-800 dark:text-amber-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>
                  <strong>Currently in Mock Mode:</strong> Add an LLM, STT (Deepgram), and TTS (Cartesia) key to go live.
                </span>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-700">
            {success}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          {/* Section 1: LLM (Intelligence) */}
          <div className="rounded-xl border border-line bg-panel/60 p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Sparkles className="h-4 w-4 text-accent" />
                1. AI Model (LLM)
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setLlmChoice("gemini")}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    llmChoice === "gemini"
                      ? "bg-ink text-white"
                      : "bg-paper text-muted hover:text-ink border border-line"
                  )}
                >
                  Google Gemini (Free)
                </button>
                <button
                  type="button"
                  onClick={() => setLlmChoice("openai")}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    llmChoice === "openai"
                      ? "bg-ink text-white"
                      : "bg-paper text-muted hover:text-ink border border-line"
                  )}
                >
                  OpenAI
                </button>
              </div>
            </div>

            {llmChoice === "gemini" ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>Gemini API Key</span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-accent hover:underline"
                  >
                    Get free Gemini key <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <Input
                  type="password"
                  placeholder={current?.hasGeminiKey ? `Current: ${current.geminiKeyPreview}` : "AIzaSy..."}
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  autoComplete="off"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>OpenAI API Key</span>
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-accent hover:underline"
                  >
                    Get OpenAI key <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <Input
                  type="password"
                  placeholder={current?.hasOpenaiKey ? `Current: ${current.openaiKeyPreview}` : "sk-..."}
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  autoComplete="off"
                />
              </div>
            )}
          </div>

          {/* Section 2: STT (Hearing Voice) */}
          <div className="rounded-xl border border-line bg-panel/60 p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Mic className="h-4 w-4 text-accent" />
                2. Speech-to-Text (STT)
              </label>
              <span className="rounded-md bg-paper border border-line px-2 py-0.5 text-[11px] font-mono text-muted">
                Deepgram Nova-3
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted">
                <span>Deepgram API Key</span>
                <a
                  href="https://console.deepgram.com"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-accent hover:underline"
                >
                  Get free $200 credit <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <Input
                type="password"
                placeholder={current?.hasDeepgramKey ? `Current: ${current.deepgramKeyPreview}` : "Token..."}
                value={deepgramKey}
                onChange={(e) => setDeepgramKey(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>

          {/* Section 3: TTS (Interviewer Voice) */}
          <div className="rounded-xl border border-line bg-panel/60 p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Volume2 className="h-4 w-4 text-accent" />
                3. Text-to-Speech (TTS Voice)
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTtsChoice("cartesia")}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    ttsChoice === "cartesia"
                      ? "bg-ink text-white"
                      : "bg-paper text-muted hover:text-ink border border-line"
                  )}
                >
                  Cartesia (Fastest)
                </button>
                <button
                  type="button"
                  onClick={() => setTtsChoice("elevenlabs")}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    ttsChoice === "elevenlabs"
                      ? "bg-ink text-white"
                      : "bg-paper text-muted hover:text-ink border border-line"
                  )}
                >
                  ElevenLabs
                </button>
              </div>
            </div>

            {ttsChoice === "cartesia" ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>Cartesia API Key</span>
                  <a
                    href="https://play.cartesia.ai"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-accent hover:underline"
                  >
                    Get Cartesia key <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <Input
                  type="password"
                  placeholder={current?.hasCartesiaKey ? `Current: ${current.cartesiaKeyPreview}` : "Cartesia key..."}
                  value={cartesiaKey}
                  onChange={(e) => setCartesiaKey(e.target.value)}
                  autoComplete="off"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>ElevenLabs API Key</span>
                  <a
                    href="https://elevenlabs.io"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-accent hover:underline"
                  >
                    Get ElevenLabs key <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <Input
                  type="password"
                  placeholder={current?.hasElevenlabsKey ? `Current: ${current.elevenlabsKeyPreview}` : "xi-..."}
                  value={elevenlabsKey}
                  onChange={(e) => setElevenlabsKey(e.target.value)}
                  autoComplete="off"
                />
              </div>
            )}
          </div>

          {/* Section 4: LiveKit Voice Transport */}
          <div className="rounded-xl border border-line bg-panel/60 p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Radio className="h-4 w-4 text-accent" />
                4. LiveKit Server
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setLivekitMode("local")}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    livekitMode === "local"
                      ? "bg-ink text-white"
                      : "bg-paper text-muted hover:text-ink border border-line"
                  )}
                >
                  Local Server (:7880)
                </button>
                <button
                  type="button"
                  onClick={() => setLivekitMode("cloud")}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    livekitMode === "cloud"
                      ? "bg-ink text-white"
                      : "bg-paper text-muted hover:text-ink border border-line"
                  )}
                >
                  LiveKit Cloud
                </button>
              </div>
            </div>

            {livekitMode === "local" ? (
              <p className="text-xs text-muted">
                Connecting to local LiveKit server at <code className="bg-paper px-1.5 py-0.5 rounded border border-line">ws://localhost:7880</code> (running on your machine).
              </p>
            ) : (
              <div className="space-y-2 mt-2">
                <Input
                  type="text"
                  placeholder="wss://your-project.livekit.cloud"
                  value={cloudLivekitUrl}
                  onChange={(e) => setCloudLivekitUrl(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="text"
                    placeholder="API Key"
                    value={cloudLivekitKey}
                    onChange={(e) => setCloudLivekitKey(e.target.value)}
                  />
                  <Input
                    type="password"
                    placeholder="API Secret"
                    value={cloudLivekitSecret}
                    onChange={(e) => setCloudLivekitSecret(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-3 border-t border-line">
            <button
              type="button"
              disabled={saving}
              onClick={handleResetToMock}
              className="text-xs text-muted hover:text-ink transition-colors underline"
            >
              Reset to Mock / Offline Mode
            </button>
            <div className="flex items-center gap-2.5">
              <Button type="button" variant="out" size="sm" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" variant="ink" size="sm" disabled={saving}>
                {saving ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save & Go Live"
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
