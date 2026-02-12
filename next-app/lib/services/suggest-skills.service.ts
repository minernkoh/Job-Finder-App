/**
 * Suggest-skills service: use Gemini to suggest skills for a given job role. Used by profile.
 */

import { generateObject } from "ai";
import {
  SuggestSkillsResponseSchema,
  type SuggestSkillsResponse,
} from "@schemas";
import {
  executeWithGemini,
  retryWithBackoff,
} from "@/lib/ai/gemini";

/** Suggests 8–12 skills for a job role using Gemini with retries. Returns array of skill strings. */
export async function suggestSkillsWithRetry(
  currentRole: string
): Promise<SuggestSkillsResponse> {
  const prompt = `Given the job role: "${currentRole}", suggest 8–12 skills that are relevant (technical, tools, soft skills). Return a JSON object with a single key "skills" whose value is an array of strings. Each skill should be a short phrase (e.g. "JavaScript", "Project management", "Agile").`;

  const { object } = await retryWithBackoff(
    () =>
      executeWithGemini((model) =>
        generateObject({ model, schema: SuggestSkillsResponseSchema, prompt }),
      ),
    { fallbackMessage: "Skill suggestion failed. Please try again." }
  );
  return object as SuggestSkillsResponse;
}
