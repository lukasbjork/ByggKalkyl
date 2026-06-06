import { z } from "zod";

/**
 * Utbytbar AI-motor för mängdning. Standard = gratis Google Gemini.
 * Allt AI-resultat är ENBART förslag som användaren måste granska.
 */

/** Enheter som AI får föreslå (material/mängd – ej arbetstid). */
export const SUGGESTION_UNITS = ["st", "m", "m2", "m3", "kg"] as const;

export const suggestedItemSchema = z.object({
  benamning: z.string().min(1),
  kod: z.string().nullish(),
  mangd: z.number().nonnegative(),
  enhet: z.enum(SUGGESTION_UNITS),
  lage: z.string().nullish(),
  konfidens: z.number().min(0).max(1),
  antagande: z.string().nullish(),
});

export const takeoffSuggestionSchema = z.object({
  items: z.array(suggestedItemSchema),
  osakerheter: z.array(z.string()).default([]),
});

export type SuggestedItem = z.infer<typeof suggestedItemSchema>;
export type TakeoffSuggestion = z.infer<typeof takeoffSuggestionSchema>;

export interface ImageInput {
  base64: string;
  mimeType: string;
}

export interface LLMProvider {
  readonly name: string;
  /** True om providern är konfigurerad (t.ex. nyckel finns). */
  available(): boolean;
  /** Tolka rasterade ritningssidor (vision) → förslag. */
  takeoffFromImages(images: ImageInput[], context?: string): Promise<TakeoffSuggestion>;
  /** Tolka fritext (stökig rumslista/AMA) → förslag. */
  takeoffFromText(text: string): Promise<TakeoffSuggestion>;
}

/** Kastas när AI inte är konfigurerad – UI faller tillbaka på manuell inmatning. */
export class AINotConfiguredError extends Error {
  constructor(message = "AI ej konfigurerad") {
    super(message);
    this.name = "AINotConfiguredError";
  }
}
