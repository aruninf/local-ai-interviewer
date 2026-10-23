import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";

function mask(val?: string | null): string {
  if (!val || val.length < 8) return val ? "****" : "";
  return `${val.slice(0, 4)}...${val.slice(-4)}`;
}

function findEnvPath(): string | null {
  const defaultPath = path.join(/*turbopackIgnore: true*/ process.cwd(), ".env");
  if (fs.existsSync(defaultPath)) return defaultPath;

  const repoRoot = path.join(/*turbopackIgnore: true*/ process.cwd(), "..", "..", ".env");
  if (fs.existsSync(repoRoot)) return repoRoot;

  return defaultPath;
}

function updateEnvFile(updates: Record<string, string | undefined>) {
  const envPath = findEnvPath();
  if (!envPath) return;

  let content = "";
  try {
    content = fs.readFileSync(envPath, "utf-8");
  } catch {
    content = "";
  }

  const lines = content.split("\n");
  const processedKeys = new Set<string>();

  const newLines = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return line;
    const match = trimmed.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (!match) return line;

    const key = match[1];
    if (key && key in updates) {
      processedKeys.add(key);
      const val = updates[key] ?? "";
      return `${key}=${val}`;
    }
    return line;
  });

  // Append any keys that didn't exist in the file yet
  for (const [key, val] of Object.entries(updates)) {
    if (!processedKeys.has(key)) {
      newLines.push(`${key}=${val ?? ""}`);
    }
  }

  try {
    fs.writeFileSync(envPath, newLines.join("\n"), "utf-8");
  } catch (err) {
    console.warn("Failed to write .env file:", err);
  }
}

export async function GET() {
  const gemini = process.env.GEMINI_API_KEY || "";
  const openai = process.env.OPENAI_API_KEY || "";
  const deepgram = process.env.DEEPGRAM_API_KEY || "";
  const cartesia = process.env.CARTESIA_API_KEY || "";
  const elevenlabs = process.env.ELEVENLABS_API_KEY || "";

  const livekitUrl = process.env.LIVEKIT_URL || "";
  const livekitApiKey = process.env.LIVEKIT_API_KEY || "";
  const livekitApiSecret = process.env.LIVEKIT_API_SECRET || "";

  const llmProvider = process.env.LLM_PROVIDER || (gemini ? "gemini" : openai ? "openai" : "mock");
  const sttProvider = process.env.STT_PROVIDER || (deepgram ? "deepgram" : "mock");
  const ttsProvider = process.env.TTS_PROVIDER || (cartesia ? "cartesia" : elevenlabs ? "elevenlabs" : "mock");

  const isLiveReady = Boolean(
    (gemini || openai) &&
    deepgram &&
    (cartesia || elevenlabs) &&
    livekitUrl &&
    livekitApiKey &&
    livekitApiSecret
  );

  return NextResponse.json({
    llmProvider,
    sttProvider,
    ttsProvider,
    hasGeminiKey: Boolean(gemini),
    geminiKeyPreview: mask(gemini),
    hasOpenaiKey: Boolean(openai),
    openaiKeyPreview: mask(openai),
    hasDeepgramKey: Boolean(deepgram),
    deepgramKeyPreview: mask(deepgram),
    hasCartesiaKey: Boolean(cartesia),
    cartesiaKeyPreview: mask(cartesia),
    hasElevenlabsKey: Boolean(elevenlabs),
    elevenlabsKeyPreview: mask(elevenlabs),
    livekitUrl,
    livekitApiKey: livekitApiKey || "devkey",
    hasLivekitSecret: Boolean(livekitApiSecret),
    isLiveReady,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const updates: Record<string, string | undefined> = {};

    if (body.llmProvider) {
      process.env.LLM_PROVIDER = body.llmProvider;
      updates["LLM_PROVIDER"] = body.llmProvider;
    }
    if (body.geminiApiKey !== undefined) {
      if (body.geminiApiKey) {
        process.env.GEMINI_API_KEY = body.geminiApiKey;
        updates["GEMINI_API_KEY"] = body.geminiApiKey;
        if (!body.llmProvider || body.llmProvider === "mock") {
          process.env.LLM_PROVIDER = "gemini";
          updates["LLM_PROVIDER"] = "gemini";
        }
      } else if (body.geminiApiKey === "") {
        delete process.env.GEMINI_API_KEY;
        updates["GEMINI_API_KEY"] = "";
      }
    }
    if (body.openaiApiKey !== undefined) {
      if (body.openaiApiKey) {
        process.env.OPENAI_API_KEY = body.openaiApiKey;
        updates["OPENAI_API_KEY"] = body.openaiApiKey;
        if (body.llmProvider === "openai") {
          process.env.LLM_PROVIDER = "openai";
          updates["LLM_PROVIDER"] = "openai";
        }
      } else if (body.openaiApiKey === "") {
        delete process.env.OPENAI_API_KEY;
        updates["OPENAI_API_KEY"] = "";
      }
    }

    if (body.sttProvider) {
      process.env.STT_PROVIDER = body.sttProvider;
      updates["STT_PROVIDER"] = body.sttProvider;
    }
    if (body.deepgramApiKey !== undefined) {
      if (body.deepgramApiKey) {
        process.env.DEEPGRAM_API_KEY = body.deepgramApiKey;
        updates["DEEPGRAM_API_KEY"] = body.deepgramApiKey;
        if (!body.sttProvider || body.sttProvider === "mock") {
          process.env.STT_PROVIDER = "deepgram";
          updates["STT_PROVIDER"] = "deepgram";
        }
      } else if (body.deepgramApiKey === "") {
        delete process.env.DEEPGRAM_API_KEY;
        updates["DEEPGRAM_API_KEY"] = "";
      }
    }

    if (body.ttsProvider) {
      process.env.TTS_PROVIDER = body.ttsProvider;
      updates["TTS_PROVIDER"] = body.ttsProvider;
    }
    if (body.cartesiaApiKey !== undefined) {
      if (body.cartesiaApiKey) {
        process.env.CARTESIA_API_KEY = body.cartesiaApiKey;
        updates["CARTESIA_API_KEY"] = body.cartesiaApiKey;
        if (!body.ttsProvider || body.ttsProvider === "mock") {
          process.env.TTS_PROVIDER = "cartesia";
          updates["TTS_PROVIDER"] = "cartesia";
        }
      } else if (body.cartesiaApiKey === "") {
        delete process.env.CARTESIA_API_KEY;
        updates["CARTESIA_API_KEY"] = "";
      }
    }
    if (body.elevenlabsApiKey !== undefined) {
      if (body.elevenlabsApiKey) {
        process.env.ELEVENLABS_API_KEY = body.elevenlabsApiKey;
        updates["ELEVENLABS_API_KEY"] = body.elevenlabsApiKey;
      } else if (body.elevenlabsApiKey === "") {
        delete process.env.ELEVENLABS_API_KEY;
        updates["ELEVENLABS_API_KEY"] = "";
      }
    }

    if (body.livekitUrl !== undefined) {
      process.env.LIVEKIT_URL = body.livekitUrl;
      updates["LIVEKIT_URL"] = body.livekitUrl;
    }
    if (body.livekitApiKey !== undefined) {
      process.env.LIVEKIT_API_KEY = body.livekitApiKey;
      updates["LIVEKIT_API_KEY"] = body.livekitApiKey;
    }
    if (body.livekitApiSecret !== undefined) {
      process.env.LIVEKIT_API_SECRET = body.livekitApiSecret;
      updates["LIVEKIT_API_SECRET"] = body.livekitApiSecret;
    }

    // Write to disk
    updateEnvFile(updates);

    // Sync with agent-api if reachable
    try {
      const agentUrl = serverEnv.agentApiUrl || "http://agent-api:8000";
      await fetch(`${agentUrl}/api/keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        signal: AbortSignal.timeout(2000),
      }).catch(() => {});
    } catch {
      // agent sync is best-effort
    }

    const isLiveReady = Boolean(
      (process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY) &&
      process.env.DEEPGRAM_API_KEY &&
      (process.env.CARTESIA_API_KEY || process.env.ELEVENLABS_API_KEY) &&
      process.env.LIVEKIT_URL &&
      process.env.LIVEKIT_API_KEY &&
      process.env.LIVEKIT_API_SECRET
    );

    return NextResponse.json({
      ok: true,
      message: "Keys updated successfully",
      isLiveReady,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to update keys" },
      { status: 500 }
    );
  }
}
