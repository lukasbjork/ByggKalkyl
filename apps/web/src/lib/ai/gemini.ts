import {
  AINotConfiguredError,
  ImageInput,
  LLMProvider,
  TakeoffSuggestion,
  takeoffSuggestionSchema,
} from "./types";
import { SYSTEM_PROMPT, imagesUserPrompt, textUserPrompt } from "./prompt";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

/**
 * Gratis Google Gemini via REST (ingen SDK – använder inbyggd fetch).
 * Nyckel: https://aistudio.google.com/apikey (inget kreditkort).
 */
export class GeminiProvider implements LLMProvider {
  readonly name = "gemini";

  constructor(
    private readonly apiKey: string,
    private readonly model: string = "gemini-2.5-flash",
  ) {}

  available(): boolean {
    return this.apiKey.trim().length > 0;
  }

  private async generate(parts: unknown[]): Promise<TakeoffSuggestion> {
    if (!this.available()) {
      throw new AINotConfiguredError(
        "Gemini-nyckel saknas. Lägg till GEMINI_API_KEY (gratis: aistudio.google.com/apikey).",
      );
    }

    const res = await fetch(
      `${API_BASE}/models/${this.model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts }],
          generationConfig: { responseMimeType: "application/json", temperature: 0 },
        }),
      },
    );

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 429) {
        throw new Error(
          "Gemini gratis nivå: för många anrop just nu (rate limit). Vänta en stund och försök igen.",
        );
      }
      throw new Error(`Gemini-fel ${res.status}: ${body.slice(0, 300)}`);
    }

    const data = await res.json();
    const text: string =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text ?? "")
        .join("") ?? "";

    return parseSuggestion(text);
  }

  async takeoffFromImages(
    images: ImageInput[],
    context?: string,
  ): Promise<TakeoffSuggestion> {
    const parts: unknown[] = [
      { text: imagesUserPrompt(context) },
      ...images.map((img) => ({
        inlineData: { mimeType: img.mimeType, data: img.base64 },
      })),
    ];
    return this.generate(parts);
  }

  async takeoffFromText(text: string): Promise<TakeoffSuggestion> {
    return this.generate([{ text: textUserPrompt(text) }]);
  }
}

/**
 * Tolka modellsvar säkert till TakeoffSuggestion: strippa ev. kodstaket,
 * extrahera JSON-objektet, parsa och validera med zod. Kastar vid fel.
 */
export function parseSuggestion(raw: string): TakeoffSuggestion {
  let s = (raw ?? "").trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  }
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first >= 0 && last > first) s = s.slice(first, last + 1);

  let json: unknown;
  try {
    json = JSON.parse(s);
  } catch {
    throw new Error("Kunde inte tolka AI-svaret som JSON. Mata in poster manuellt.");
  }

  const parsed = takeoffSuggestionSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(
      "AI-svaret matchade inte förväntat format. Mata in poster manuellt.",
    );
  }
  return parsed.data;
}
