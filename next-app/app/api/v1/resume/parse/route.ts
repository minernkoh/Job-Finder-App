/**
 * POST /api/v1/resume/parse: parse resume text via AI and upsert user profile. Accepts JSON { text } or multipart file (PDF or DOCX, max 5MB). Requires auth.
 */

import { ParseResumeBodySchema } from "@schemas";
import { NextRequest, NextResponse } from "next/server";
import { toErrorResponse, validationErrorResponse } from "@/lib/api/errors";
import { withAiAccess } from "@/lib/api/with-auth";
import { consumeAiQuota } from "@/lib/services/ai-quota.service";
import { getEnv } from "@/lib/env";
import {
  DOCX_EXTRACT_ERROR_MESSAGE,
  extractTextFromDocx,
  extractTextFromPdf,
  MAX_FILE_BYTES,
  PDF_EXTRACT_ERROR_MESSAGE,
  parseResumeWithRetry,
  upsertProfileForUser,
} from "@/lib/services/resume.service";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function isPdfFile(file: { type: string; name: string }): boolean {
  return (
    file.type === "application/pdf" ||
    (!!file.name && file.name.toLowerCase().endsWith(".pdf"))
  );
}

function isDocxFile(file: { type: string; name: string }): boolean {
  return (
    file.type === DOCX_MIME ||
    (!!file.name && file.name.toLowerCase().endsWith(".docx"))
  );
}

function isResumeFile(file: { type: string; name: string }): boolean {
  return isPdfFile(file) || isDocxFile(file);
}

async function postParseHandler(
  request: NextRequest,
  payload: { sub: string }
): Promise<NextResponse> {
  const env = getEnv();
  if (!env.GEMINI_API_KEY?.trim()) {
    return NextResponse.json(
      { success: false, message: "Resume parsing is not configured" },
      { status: 503 }
    );
  }

  const contentType = request.headers.get("content-type") ?? "";

  let text: string;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json(
        { success: false, message: "No file provided. Use the 'file' field." },
        { status: 400 }
      );
    }
    if (!isResumeFile(file)) {
      return NextResponse.json(
        {
          success: false,
          message: "Only PDF or DOCX files up to 5MB are supported.",
        },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { success: false, message: "File must be 5MB or smaller." },
        { status: 400 }
      );
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    text = isPdfFile(file)
      ? await extractTextFromPdf(buffer)
      : await extractTextFromDocx(buffer);
  } else {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Request body must be JSON with a text field." },
        { status: 400 }
      );
    }
    const parsed = ParseResumeBodySchema.safeParse(body);
    if (!parsed.success)
      return validationErrorResponse(parsed.error, "Invalid body");
    text = parsed.data.text.trim();
    if (!text) {
      return NextResponse.json(
        { success: false, message: "Resume text is required." },
        { status: 400 }
      );
    }
  }

  try {
    await consumeAiQuota(payload.sub, "general");
    const result = await parseResumeWithRetry(text);
    const flatSkills =
      result.skillGroups?.flatMap((g) => g.skills) ?? result.skills ?? [];
    await upsertProfileForUser(payload.sub, {
      jobTitles: result.jobTitles,
      resumeSummary: result.resumeSummary,
      ...(result.yearsOfExperience != null ? { yearsOfExperience: result.yearsOfExperience } : {}),
      name: result.name,
      headline: result.headline,
      contacts: result.contacts,
      experience: result.experience,
      projects: result.projects,
      education: result.education,
      honours: result.honours,
      skillGroups: result.skillGroups,
      ...(flatSkills.length > 0 ? { skills: flatSkills } : {}),
    });
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to parse resume";
    if (message === "Resume parsing is not configured") {
      return NextResponse.json({ success: false, message }, { status: 503 });
    }
    if (message === "Invalid user") {
      return NextResponse.json({ success: false, message }, { status: 401 });
    }
    if (
      message === "File must be 5MB or smaller" ||
      message === PDF_EXTRACT_ERROR_MESSAGE ||
      message === DOCX_EXTRACT_ERROR_MESSAGE ||
      message === "Only PDF or DOCX files up to 5MB are supported."
    ) {
      return NextResponse.json({ success: false, message }, { status: 400 });
    }
    return toErrorResponse(err, "Failed to parse resume");
  }
}

export const POST = withAiAccess(postParseHandler, "Failed to parse resume");
