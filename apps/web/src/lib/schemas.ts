import { z } from "zod";

/** Validering av indata på webben (zod). FastAPI validerar separat med pydantic. */

export const createProjectSchema = z.object({
  namn: z.string().trim().min(1, "Projektnamn krävs").max(200),
  kund: z.string().trim().max(200).optional(),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const unitEnum = z.enum(["st", "m", "m2", "m3", "kg", "h"]);

/** Manuell mängdpost. */
export const manualTakeoffSchema = z.object({
  benamning: z.string().trim().min(1, "Benämning krävs").max(300),
  kod: z.string().trim().max(100).nullish(),
  mangd: z.coerce.number().nonnegative(),
  enhet: unitEnum,
  lageskod: z.string().trim().max(200).nullish(),
});
export type ManualTakeoffInput = z.infer<typeof manualTakeoffSchema>;

/** Redigering av en mängdpost (inkl. markera granskad). */
export const patchTakeoffSchema = z.object({
  benamning: z.string().trim().min(1).max(300).optional(),
  kod: z.string().trim().max(100).nullish(),
  mangd: z.coerce.number().nonnegative().optional(),
  enhet: unitEnum.optional(),
  lageskod: z.string().trim().max(200).nullish(),
  granskad: z.boolean().optional(),
  kopplatResourceId: z.string().nullish(),
  kopplatTimeNormId: z.string().nullish(),
});
export type PatchTakeoffInput = z.infer<typeof patchTakeoffSchema>;

/** Tolka fritext (rumslista) med AI. */
export const takeoffTextSchema = z.object({
  text: z.string().trim().min(1, "Text krävs").max(20000),
});

/** Kalkylinställningar (påslag i procent). */
export const settingsSchema = z.object({
  omkostnadProcent: z.coerce.number().min(0).max(1000),
  materialPaslagProcent: z.coerce.number().min(0).max(1000),
  riskProcent: z.coerce.number().min(0).max(1000),
  arbetsdagTimmar: z.coerce.number().min(1).max(24),
});
export type SettingsInput = z.infer<typeof settingsSchema>;
