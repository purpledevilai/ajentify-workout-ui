import { z } from "zod";

export const SubmitFeedbackInput = z.object({
  message: z.string().describe("The feedback message"),
  source: z
    .enum(["user", "agent"])
    .optional()
    .describe(
      "Who originated the feedback — 'user' if relaying user words, 'agent' if the agent is noting something"
    ),
});
