/**
 * Suggest-skills service: use Gemini to suggest skills for a given job role. Used by onboarding and profile.
 */

import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import {
  SuggestSkillsResponseSchema,
  type SuggestSkillsResponse,
} from "@schemas";
import { getEnv } from "@/lib/env";

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

function getGeminiModel() {
  const env = getEnv();
  if (!env.GEMINI_API_KEY?.trim()) {
    throw new Error("AI skill suggestions are not configured");
  }
  const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY });
  return google("gemini-2.5-flash");
}

/** Suggests 8–12 skills for a job role using Gemini with retries. Returns array of skill strings. */
export async function suggestSkillsWithRetry(
  currentRole: string
): Promise<SuggestSkillsResponse> {
  const model = getGeminiModel();
  const prompt = `Given the job role: "${currentRole}", suggest 8–12 skills that are relevant (technical, tools, soft skills). Return a JSON object with a single key "skills" whose value is an array of strings. Each skill should be a short phrase (e.g. "JavaScript", "Project management", "Agile").`;

  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const { object } = await generateObject({
        model,
        schema: SuggestSkillsResponseSchema,
        prompt,
      });
      return object as SuggestSkillsResponse;
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES - 1) {
        const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Skill suggestion failed. Please try again.");
}
