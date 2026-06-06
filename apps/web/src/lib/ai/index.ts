import { GeminiProvider } from "./gemini";
import { NoneProvider } from "./none";
import type { LLMProvider } from "./types";

export * from "./types";

let cached: LLMProvider | null = null;

/**
 * Väljer AI-motor via `AI_PROVIDER`:
 *   gemini (gratis, default) | none (av)
 * Groq/Ollama/Anthropic kan läggas till här senare (samma interface).
 */
export function getLLMProvider(): LLMProvider {
  if (cached) return cached;

  const provider = (process.env.AI_PROVIDER ?? "gemini").toLowerCase();

  switch (provider) {
    case "gemini":
      cached = new GeminiProvider(
        process.env.GEMINI_API_KEY ?? "",
        process.env.GEMINI_MODEL || "gemini-2.5-flash",
      );
      break;
    case "none":
      cached = new NoneProvider();
      break;
    // TODO: case "groq" / "ollama" / "anthropic" – implementera mot samma LLMProvider.
    default:
      cached = new NoneProvider();
  }
  return cached;
}
