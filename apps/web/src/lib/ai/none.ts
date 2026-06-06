import { AINotConfiguredError, LLMProvider, TakeoffSuggestion } from "./types";

/** AI avstängd (AI_PROVIDER=none). Allt mängdas manuellt / via IFC / Excel. */
export class NoneProvider implements LLMProvider {
  readonly name = "none";

  available(): boolean {
    return false;
  }

  async takeoffFromImages(): Promise<TakeoffSuggestion> {
    throw new AINotConfiguredError(
      "AI är avstängd (AI_PROVIDER=none). Mata in poster manuellt eller använd IFC/Excel.",
    );
  }

  async takeoffFromText(): Promise<TakeoffSuggestion> {
    throw new AINotConfiguredError(
      "AI är avstängd (AI_PROVIDER=none). Mata in poster manuellt eller använd IFC/Excel.",
    );
  }
}
