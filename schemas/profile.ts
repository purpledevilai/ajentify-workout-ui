import { z } from "zod";

export const GetUserProfileInput = z.object({});

export const SaveUserProfileInput = z.object({
  age: z.int().nullable().optional().describe("User's age"),
  height: z.number().nullable().optional().describe("Height in user's preferred unit"),
  weight: z.number().nullable().optional().describe("Weight in user's preferred unit"),
  gender: z.string().nullable().optional().describe("User's gender"),
  units_preference: z
    .enum(["imperial", "metric"])
    .optional()
    .describe("Preferred measurement system"),
  goals: z
    .array(z.string())
    .optional()
    .describe("List of fitness goals"),
  environment: z
    .string()
    .nullable()
    .optional()
    .describe("Where the user works out and available equipment"),
  injuries: z
    .string()
    .nullable()
    .optional()
    .describe("Any injuries or physical limitations"),
  trainer_notes: z
    .string()
    .nullable()
    .optional()
    .describe("Trainer observations and notes for future reference"),
});
